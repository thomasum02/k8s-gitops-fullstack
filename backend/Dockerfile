# stage-1-build
FROM node:20.19-alpine3.22 AS builder
WORKDIR /app
COPY package*.json ./
RUN apk update && apk upgrade --no-cache && \
    npm ci --omit=dev && npm cache clean --force && rm -rf /root/.npm
COPY src/ ./src/

# stage-2-prod
FROM node:20.19-alpine3.22
WORKDIR /app
RUN apk update && apk upgrade --no-cache && \
    rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm \
           /usr/local/bin/npx \
           /usr/local/bin/corepack \
           /opt/yarn* && \
    rm -rf /tmp/* /var/cache/apk/*
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src/
COPY --from=builder /app/package.json ./
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["node", "src/index.js"]
LABEL maintainer="thomas"
LABEL version="2.1.0"
LABEL description="Todo App - Backend API"