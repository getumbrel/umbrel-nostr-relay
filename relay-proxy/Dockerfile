# Build Stage
FROM node:18-bookworm

# Create app directory
WORKDIR /app

# Copy 'package-lock.json' and 'package.json'
COPY package-lock.json package.json ./

# Install dependencies (npm ci makes sure the exact versions in the lockfile gets installed)
RUN npm ci

# Copy project files and folders to the current working directory (i.e. '/app')
COPY . .

EXPOSE 80

# Run with node instead of npm to avoid signal handling issues
CMD [ "node", "server.js" ]