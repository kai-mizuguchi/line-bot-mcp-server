// butaningen-relay: public WebSocket reverse-tunnel front for the Wii bot.
//
// The Wii is behind CGN (WiMAX) and its tailscale-rs cannot relay via DERP, so
// no inbound path exists. Instead the Wii dials OUT to this relay and keeps a
// WebSocket open (/_tunnel). Every public HTTP request (LINE webhook, health,
// setlist image GET) is framed and sent over that socket to the Wii, which
// forwards it to its local bot and returns the response. The bot replies to
// LINE directly outbound.
//
// Env:
//   TUNNEL_SECRET  shared secret; the Wii must present it to open /_tunnel. Required.
//   PORT           public listen port (Render sets this).
package main

import (
	"context"
	"encoding/base64"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"sync/atomic"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

type frame struct {
	Type    string              `json:"type"` // "req" | "resp"
	ID      uint64              `json:"id"`
	Method  string              `json:"method,omitempty"`
	Path    string              `json:"path,omitempty"`
	Status  int                 `json:"status,omitempty"`
	Headers map[string][]string `json:"headers,omitempty"`
	Body    string              `json:"body,omitempty"` // base64
}

type tunnel struct {
	out     chan frame
	pending map[uint64]chan frame
	mu      sync.Mutex
	closed  bool
}

var (
	cur    atomic.Pointer[tunnel]
	nextID atomic.Uint64
)

func (t *tunnel) reply(f frame) {
	t.mu.Lock()
	ch := t.pending[f.ID]
	delete(t.pending, f.ID)
	t.mu.Unlock()
	if ch != nil {
		ch <- f
	}
}

func (t *tunnel) closeAll() {
	t.mu.Lock()
	if t.closed {
		t.mu.Unlock()
		return
	}
	t.closed = true
	for id, ch := range t.pending {
		close(ch)
		delete(t.pending, id)
	}
	t.mu.Unlock()
}

func main() {
	secret := os.Getenv("TUNNEL_SECRET")
	if secret == "" {
		log.Fatal("TUNNEL_SECRET is required")
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "10000"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/_tunnel", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Tunnel-Secret") != secret {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		serveTunnel(w, r)
	})
	mux.HandleFunc("/", proxyToTunnel)

	log.Printf("listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

func serveTunnel(w http.ResponseWriter, r *http.Request) {
	c, err := websocket.Accept(w, r, nil)
	if err != nil {
		return
	}
	c.SetReadLimit(32 << 20) // 32 MiB frames (images)
	t := &tunnel{out: make(chan frame, 64), pending: map[uint64]chan frame{}}
	cur.Store(t)
	log.Print("tunnel connected")
	defer func() {
		cur.CompareAndSwap(t, nil)
		t.closeAll()
		c.Close(websocket.StatusNormalClosure, "")
		log.Print("tunnel disconnected")
	}()

	ctx := r.Context()
	// Writer: drain out -> ws.
	go func() {
		for f := range t.out {
			wc, cancel := context.WithTimeout(ctx, 70*time.Second)
			err := wsjson.Write(wc, c, f)
			cancel()
			if err != nil {
				return
			}
		}
	}()
	// Reader: resp frames -> pending waiters; also keep-alive pings.
	for {
		var f frame
		if err := wsjson.Read(ctx, c, &f); err != nil {
			return
		}
		if f.Type == "resp" {
			t.reply(f)
		}
	}
}

func proxyToTunnel(w http.ResponseWriter, r *http.Request) {
	t := cur.Load()
	if t == nil {
		http.Error(w, "tunnel offline", http.StatusServiceUnavailable)
		return
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, 32<<20))
	if err != nil {
		http.Error(w, "bad body", http.StatusBadRequest)
		return
	}
	id := nextID.Add(1)
	ch := make(chan frame, 1)
	t.mu.Lock()
	if t.closed {
		t.mu.Unlock()
		http.Error(w, "tunnel offline", http.StatusServiceUnavailable)
		return
	}
	t.pending[id] = ch
	t.mu.Unlock()

	req := frame{
		Type:    "req",
		ID:      id,
		Method:  r.Method,
		Path:    r.URL.RequestURI(),
		Headers: r.Header,
		Body:    base64.StdEncoding.EncodeToString(body),
	}
	select {
	case t.out <- req:
	case <-time.After(5 * time.Second):
		http.Error(w, "tunnel busy", http.StatusGatewayTimeout)
		return
	}

	select {
	case resp, ok := <-ch:
		if !ok {
			http.Error(w, "tunnel closed", http.StatusBadGateway)
			return
		}
		writeResp(w, resp)
	case <-time.After(60 * time.Second):
		t.mu.Lock()
		delete(t.pending, id)
		t.mu.Unlock()
		http.Error(w, "upstream timeout", http.StatusGatewayTimeout)
	}
}

func writeResp(w http.ResponseWriter, resp frame) {
	h := w.Header()
	for k, vs := range resp.Headers {
		for _, v := range vs {
			h.Add(k, v)
		}
	}
	status := resp.Status
	if status == 0 {
		status = http.StatusBadGateway
	}
	body, _ := base64.StdEncoding.DecodeString(resp.Body)
	w.WriteHeader(status)
	w.Write(body)
}
