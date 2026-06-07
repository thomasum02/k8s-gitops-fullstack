# ============================================================
# Stage 1 — builder
# Compile le frontend React en fichiers statiques
# ============================================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances en premier (cache Docker)
COPY package*.json ./

# Installer TOUTES les dépendances (y compris devDependencies pour le build)
RUN npm ci && npm cache clean --force

# Copier le code source et les fichiers publics
COPY public/ ./public/
COPY src/ ./src/

# Variable d'environnement pour pointer vers le backend
# Sera surchargée via ConfigMap Kubernetes en semaine 2
ARG REACT_APP_API_URL=http://localhost:3001
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Compiler l'application React (génère /app/build/)
RUN npm run build

# ============================================================
# Stage 2 — runner (image finale avec Nginx)
# Sert les fichiers statiques, Node.js absent de cette image
# ============================================================
FROM nginx:alpine AS runner

# Métadonnées
LABEL maintainer="equipe-devops"
LABEL version="1.0.0"
LABEL description="Todo App - Frontend React"

# Copier le build React depuis le stage builder
COPY --from=builder /app/build /usr/share/nginx/html

# Copier la configuration Nginx personnalisée (SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposer le port HTTP
EXPOSE 80

# Healthcheck Nginx
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

# Nginx démarre automatiquement avec l'image de base
CMD ["nginx", "-g", "daemon off;"]