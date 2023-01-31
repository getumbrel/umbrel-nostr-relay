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
FROM node:18-buster-slim AS umbrel-nostr-relay

# Copy built code from build stage to '/app' directory
COPY --from=umbrel-nostr-relay-builder /app /app

# Change directory to '/app' 
WORKDIR /app

# Expose the port on which the app will be running (3000 is the default that `serve` uses)
EXPOSE 3000

# Start the app
CMD [ "npx", "serve", "build" ]