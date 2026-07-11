# backend/Dockerfile
FROM node:22-alpine

WORKDIR /app/backend

# Copy backend files from root context
COPY backend/package*.json ./
COPY backend/server.js ./
COPY backend/package-lock.json ./
COPY backend/config ./config
COPY backend/controllers ./controllers
COPY backend/db ./db
COPY backend/infrastructure ./infrastructure
COPY backend/middleware ./middleware
COPY backend/models ./models
COPY backend/routes ./routes
COPY backend/services ./services
COPY backend/utils ./utils
COPY backend/scripts ./scripts
COPY backend/ecosystem.config.cjs ./

# Install dependencies
RUN npm ci --omit=dev

# Create uploads directory and set permissions
RUN mkdir -p uploads && chown -R nodeuser:nodejs /app

# 🔒 SECURITY: Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs && \
    chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 5000

CMD ["node", "server.js"]
