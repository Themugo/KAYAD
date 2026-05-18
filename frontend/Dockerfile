FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Note: nginx.conf is mounted via docker-compose volume (./nginx.conf:/etc/nginx/conf.d/default.conf)
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
