# Multi-stage build for production deployment
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies for build
RUN npm ci

# Copy source code
COPY . .

# Build frontend (vite build)
RUN npx vite build

# Build backend with esbuild, bundling everything including @shared
RUN npx esbuild server/index.ts \
  --platform=node \
  --bundle \
  --format=esm \
  --outdir=dist \
  --external:express \
  --external:drizzle-orm \
  --external:postgres \
  --external:@neondatabase/serverless

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/dist ./dist

# Copy other necessary files
COPY --from=builder /app/drizzle.config.ts ./

# Expose port 5000
EXPOSE 5000

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/index.js"]
