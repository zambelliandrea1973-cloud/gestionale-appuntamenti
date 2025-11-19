# Dockerfile per Gestionale Sanitario

FROM node:18-alpine

# Installazione dipendenze sistema
RUN apk add --no-cache \
    postgresql-client \
    curl \
    bash

# Creazione directory applicazione
WORKDIR /app

# Copia package files
COPY package*.json ./

# Installazione dipendenze
RUN npm ci --only=production && npm cache clean --force

# Copia codice applicazione
COPY . .

# Build applicazione
RUN npm run build

# Creazione utente non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Creazione directory per uploads e logs
RUN mkdir -p /app/uploads /app/logs
RUN chown -R nodejs:nodejs /app

# Cambio utente
USER nodejs

# Variabile ambiente per ridurre logging in produzione
ENV LOG_SCHEDULER=false

# Esposizione porta
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Comando di avvio
CMD ["npm", "start"]