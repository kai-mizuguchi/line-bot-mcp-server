// butaningen-relay: a thin public reverse proxy that joins the tailnet
// in-process (tsnet) and forwards every request to the Wii bot over the
// tailnet. The Wii is behind CGN (WiMAX), so it cannot accept inbound
// connections directly; the tailnet is the transport. Reply traffic and
// LINE image fetches flow: LINE -> this relay -> Wii; the bot replies to
// LINE directly outbound.
//
// Env:
//   TS_AUTHKEY  tailscale auth key (reusable). Required.
//   WII_TARGET  http://100.121.243.30:10000  (Wii bot tailnet address)
//   PORT        public listen port (Render sets this)
//   TS_HOSTNAME tailnet node name (default "butaningen-relay")
package main

import (
	"context"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"time"

	"tailscale.com/tsnet"
)

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func main() {
	target := env("WII_TARGET", "http://100.121.243.30:10000")
	port := env("PORT", "10000")
	authKey := os.Getenv("TS_AUTHKEY")
	if authKey == "" {
		log.Fatal("TS_AUTHKEY is required")
	}

	u, err := url.Parse(target)
	if err != nil {
		log.Fatalf("bad WII_TARGET %q: %v", target, err)
	}

	srv := &tsnet.Server{
		Hostname: env("TS_HOSTNAME", "butaningen-relay"),
		AuthKey:  authKey,
		Dir:      "/tmp/tsnet", // ephemeral state dir (Render fs is ephemeral)
	}
	defer srv.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	if _, err := srv.Up(ctx); err != nil {
		log.Fatalf("tailnet up failed: %v", err)
	}
	log.Printf("joined tailnet, proxying -> %s", target)

	proxy := httputil.NewSingleHostReverseProxy(u)
	// Dial the upstream over the tailnet.
	proxy.Transport = &http.Transport{
		DialContext:           srv.Dial,
		ResponseHeaderTimeout: 60 * time.Second,
	}
	// LINE signature verification on the Wii uses the raw body, which the
	// reverse proxy forwards unchanged; no rewriting needed here.

	log.Printf("listening on :%s", port)
	if err := http.ListenAndServe(":"+port, proxy); err != nil {
		log.Fatal(err)
	}
}
