# Single-stage build - use tsx like Replit does
# Cache bust: 2026-02-26-12:00 - Add delete account button to PaymentAdmin Licenze tab
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Skip Chromium download for puppeteer (not needed for production)
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Install ALL dependencies (tsx needed for production)
RUN npm ci

# Force cache invalidation - change this date to rebuild
ARG CACHE_DATE=2026-04-06-01:00
RUN echo "Build timestamp: ${CACHE_DATE}"

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
