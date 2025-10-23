# Single-stage build - use tsx like Replit does
# Cache bust: 2025-10-23-10:51 - Force rebuild for manifest detection logs
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (tsx needed for production)
RUN npm ci

# Copy ALL source code
COPY . .

# Build frontend only
RUN npx vite build

# Copy built files to location expected by server/vite.ts
RUN cp -r dist/public server/public

# Expose port 5000
EXPOSE 5000

# Set production environment
ENV NODE_ENV=production

# Run TypeScript directly with tsx (now using relative paths, no aliases)
CMD ["npx", "tsx", "server/index.ts"]
