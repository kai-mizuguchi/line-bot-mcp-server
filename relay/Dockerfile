# Render deploys this via Docker. Root Directory = relay
FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod .
COPY main.go .
# Resolve deps at build time (avoids shipping go.sum).
RUN go get github.com/coder/websocket@latest && go mod tidy \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /relay .

FROM gcr.io/distroless/static-debian12
COPY --from=build /relay /relay
ENV PORT=10000
EXPOSE 10000
ENTRYPOINT ["/relay"]
