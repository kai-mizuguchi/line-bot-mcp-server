FROM node:24.14-alpine AS builder

COPY . /app

WORKDIR /app

RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts

RUN npx tsc && chmod +x dist/*.js

# --- Release Stage ---
FROM node:24-alpine AS release

# Install necessary tools and base fonts
RUN apk add --no-cache \
    fontconfig \
    font-noto-cjk \
    ttf-freefont \
    curl \
    unzip \
    chromium \
    nss

# Download and install Japanese fonts (failures are non-fatal)
RUN mkdir -p /usr/share/fonts/truetype/google && \
    { curl -L "https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/Japanese/NotoSansJP-Regular.otf" \
        -o /usr/share/fonts/truetype/google/NotoSansJP-Regular.otf || true; } && \
    { curl -L "https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/Japanese/NotoSansJP-Bold.otf" \
        -o /usr/share/fonts/truetype/google/NotoSansJP-Bold.otf || true; } && \
    { curl -L "https://moji.or.jp/wp-content/ipafont/IPAexfont/IPAexfont00401.zip" -o ipaex.zip && \
      unzip ipaex.zip && \
      cp IPAexfont00401/*.ttf /usr/share/fonts/truetype/google/ && \
      rm -rf IPAexfont00401 ipaex.zip || true; }

# Update font cache
RUN fc-cache -f -v

# Set Puppeteer to use system Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set up a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy the built code and necessary package files from our builder stage
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json
COPY --from=builder /app/richmenu-template /app/richmenu-template

ENV NODE_ENV=production

WORKDIR /app

# Install only production dependencies first, then fix ownership
RUN npm ci --ignore-scripts --omit=dev

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Define how to start the application
ENTRYPOINT ["/app/docker-entrypoint.sh"]
