FROM node:20-alpine AS builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine
RUN apk add --no-cache tini
WORKDIR /app
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY .env ./

RUN chown -R node:node /app

EXPOSE 3000
USER node
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "backend/server.js"]
