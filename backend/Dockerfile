# ============================================================
# Stage 1 — builder
# Installe uniquement les dépendances de production
# ============================================================
FROM node:18-alpine AS builder

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances en premier (optimise le cache Docker)
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --only=production && npm cache clean --force

# Copier le code source
COPY src/ ./src/

# ============================================================
# Stage 2 — runner (image finale, légère et sécurisée)
# ============================================================
FROM node:18-alpine AS runner

# Métadonnées de l'image
LABEL maintainer="equipe-devops"
LABEL version="1.0.0"
LABEL description="Todo App - Backend API"

# Créer le répertoire de travail
WORKDIR /app

# Sécurité : utiliser l'utilisateur 'node' non-root (déjà présent dans node:alpine)
USER node

# Copier les dépendances et le code depuis le stage builder
# --chown=node:node pour que l'utilisateur node possède les fichiers
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/src ./src
COPY --chown=node:node package*.json ./

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3001

# Exposer le port de l'API
EXPOSE 3001

# Healthcheck : vérifie que l'API répond correctement
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Lancer l'application
CMD ["node", "src/index.js"]