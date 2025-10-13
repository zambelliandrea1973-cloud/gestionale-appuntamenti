# Single-stage build - use tsx like Replit does
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

# Expose port 5000
EXPOSE 5000

# Set production environment
ENV NODE_ENV=production

# Use tsx to run TypeScript directly (resolves aliases automatically)
CMD ["npx", "tsx", "server/index.ts"]
