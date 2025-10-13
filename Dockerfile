# Production deployment with tsx for alias resolution
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (tsx needed for production)
RUN npm ci

# Copy source code and config files
COPY . .

# Build frontend only (vite build)
RUN npx vite build

# Expose port 5000 (required by the application)
EXPOSE 5000

# Set production environment
ENV NODE_ENV=production

# Use tsx to run server (resolves TypeScript aliases)
CMD ["npx", "tsx", "server/index.ts"]
