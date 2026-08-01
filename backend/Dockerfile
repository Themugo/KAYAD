# backend/Dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy all backend files
COPY backend/package*.json ./
COPY backend/package-lock.json ./
COPY backend/server.js ./
COPY backend/ecosystem.config.cjs ./
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
COPY backend/identity ./identity
COPY backend/ai ./ai
COPY backend/cms ./cms
COPY backend/communications ./communications
COPY backend/countries ./countries
COPY backend/dataExchange ./dataExchange
COPY backend/digitalInspection ./digitalInspection
COPY backend/governance ./governance
COPY backend/inspection ./inspection
COPY backend/inspectionBusinessCenter ./inspectionBusinessCenter
COPY backend/mediaEventEngine ./mediaEventEngine
COPY backend/operations ./operations
COPY backend/ownership ./ownership
COPY backend/partnerPlatform ./partnerPlatform
COPY backend/platform ./platform
COPY backend/queues ./queues
COPY backend/realtime ./realtime
COPY backend/reliability ./reliability
COPY backend/revenue ./revenue
COPY backend/socket ./socket
COPY backend/testing ./testing
COPY backend/validation ./validation
COPY backend/vehicleIntelligence ./vehicleIntelligence
COPY backend/vehiclePassport ./vehiclePassport
COPY backend/workers ./workers
COPY backend/workflowOrchestration ./workflowOrchestration

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
