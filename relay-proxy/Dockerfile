# Build Stage
FROM node:24.22.1-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205

# Create app directory
WORKDIR /app

# Copy 'package-lock.json' and 'package.json'
COPY package-lock.json package.json ./

# Install dependencies (npm ci makes sure the exact versions in the lockfile gets installed)
RUN npm ci --omit=dev --no-audit --no-fund

# Copy project files and folders to the current working directory (i.e. '/app')
COPY . .

EXPOSE 80

# Run with node instead of npm to avoid signal handling issues
CMD [ "node", "server.js" ]
