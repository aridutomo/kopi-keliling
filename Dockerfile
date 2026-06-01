# ─── Stage 1: Build Frontend (Vite + React) ───────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ ./
# Override outDir agar output ke /dist di dalam container
RUN npx vite build --outDir /dist --emptyOutDir

# ─── Stage 2: Build Backend (Go) ──────────────────────────────────────────────
FROM golang:1.25-alpine AS backend-builder
WORKDIR /app
RUN apk add --no-cache git
COPY backend/go.mod ./
RUN go mod download
COPY backend/ ./
RUN go mod tidy
# Placeholder agar build tidak error (static files diisi dari stage 3)
RUN mkdir -p ./static/dist
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o kopi-keliling .

# ─── Stage 3: Final Runtime Image ─────────────────────────────────────────────
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Jakarta
WORKDIR /app
COPY --from=backend-builder /app/kopi-keliling .
# Frontend build (dari stage 1) → static/dist yang dibaca Go
COPY --from=frontend-builder /dist ./static/dist
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=25s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/menu || exit 1
CMD ["./kopi-keliling"]
