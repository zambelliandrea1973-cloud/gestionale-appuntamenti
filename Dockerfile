# Multi-stage build for production deployment
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Copy theme.json explicitly (required for vite build)
COPY theme.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application (vite build + esbuild server)
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy other necessary files
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/shared ./shared

# Expose port 5000 (required by the application)
EXPOSE 5000

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
