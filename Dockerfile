# Build Stage
FROM node:18-buster-slim AS umbrel-nostr-relay-builder

# Create app directory
WORKDIR /app

# Copy app files
COPY . .

# Install dependencies (npm ci makes sure the exact versions in the lockfile gets installed)
RUN npm ci

# Copy project files and folders to the current working directory (i.e. '/app')
COPY . .

RUN npm run build

# Final image
FROM caddy:2.6.2 AS umbrel-nostr-relay

# Change directory to '/app' 
WORKDIR /app

# Copy Caddy config. file
COPY Caddyfile /etc/caddy/Caddyfile

# Copy built code from build stage to '/app' directory
COPY --from=umbrel-nostr-relay-builder /app /app