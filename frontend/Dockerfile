# ======================================================
#  KAYAD Frontend — Production Docker Image
#  Multi-stage: build with Node, serve with Nginx
# ======================================================

# ─── Build stage ────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL:-http://localhost:5000}

RUN npm run build

# ─── Production stage ───────────────────────────────
FROM nginx:stable-alpine

RUN addgroup -S kayad && adduser -S kayad -G kayad

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
