# Build Stage
FROM node:24.22.3-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54

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
