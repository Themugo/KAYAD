# ======================================================
#  KAYAD Frontend — Production Docker Image
#  Multi-stage: build with Node, serve with Nginx
# ======================================================

# ─── Build stage ────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production && npm ci

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL:-http://localhost:5000}

RUN npm run build

# ─── Production stage ───────────────────────────────
FROM nginx:stable-alpine

RUN addgroup -S kayad && adduser -S kayad -G kayad

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

USER kayad

CMD ["nginx", "-g", "daemon off;"]
