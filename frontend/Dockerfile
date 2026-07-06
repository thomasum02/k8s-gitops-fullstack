#stage1 build React
FROM node:20.19-alpine3.22 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force && rm -rf /root/.npm
COPY . .
# Empty by default: baked into the CRA build, so keep it relative unless the CI passes a real backend host.
ARG REACT_APP_API_URL=""
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

#stage2 nginx
FROM nginx:alpine
LABEL maintainer="thomas"
LABEL version="2.1.0"
LABEL description="Todo App - Frontend React"
COPY --from=builder --chown=nginx:nginx /app/build/ /usr/share/nginx/html/
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf
RUN touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid && \
    chown -R nginx:nginx /var/cache/nginx
USER nginx
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80 || exit 1
CMD ["nginx", "-g", "daemon off;"]
