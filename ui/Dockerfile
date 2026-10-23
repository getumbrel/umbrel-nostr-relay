# Build Stage
FROM node:24.22.1-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS umbrel-nostr-relay-builder

# Create app directory
WORKDIR /app

# Copy dependencies first so source changes can reuse the install layer.
COPY package.json package-lock.json ./

# Install dependencies (npm ci makes sure the exact versions in the lockfile gets installed)
RUN npm ci --no-audit --no-fund

# Copy project files and folders to the current working directory (i.e. '/app')
COPY . .

RUN npm run build

# Rebuild Caddy with the patched Go toolchain; the prebuilt binary still uses Go 1.26.8.
FROM caddy:2.11.7-builder@sha256:c2fc374fd352439d76e1777b28d97d9f6d9c1dd86116db9227460374d46097d5 AS caddy-builder
RUN xcaddy build v2.11.7 --output /usr/bin/caddy

# Final image
FROM caddy:2.11.7-alpine@sha256:eb4d35b7452d1ab6171fbdbe8d9275b2301dad6dad92115d91e19fb9b24d510f AS umbrel-nostr-relay

COPY --from=caddy-builder /usr/bin/caddy /usr/bin/caddy

# Change directory to '/app' 
WORKDIR /app

# Copy Caddy config. file
COPY Caddyfile /etc/caddy/Caddyfile

# Only the compiled frontend is needed at runtime.
COPY --from=umbrel-nostr-relay-builder /app/build /app/build
