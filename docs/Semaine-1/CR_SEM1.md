# Semaine 1 — Code source & Dockerfiles

## Objectif

Développer et containeriser l'application **Todo App** (Frontend + Backend) avec des Dockerfiles optimisés et sécurisés, conformément aux exigences du projet DevOps & GitOps.

---

## Livrables produits

| Livrable | Statut |
|---|---|
| Code source Backend (Node.js/Express) | ✅ Complet |
| Code source Frontend (React 18) | ✅ Complet |
| Dockerfile Backend optimisé | ✅ Complet |
| Dockerfile Frontend optimisé | ✅ Complet |
| Images Docker fonctionnelles | ✅ Complet |

---

## 1. Code source

### 1.1 Backend — Node.js / Express

#### Structure
```
backend/
├── src/
│   ├── index.js          # API REST + métriques Prometheus
│   └── routes/
│       └── todos.js      # Routes CRUD
├── tests/
│   └── todos.test.js     # Tests Jest
├── package.json
├── package-lock.json
├── Dockerfile
└── .dockerignore
```

#### API REST — Endpoints disponibles

| Méthode | Route | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check |
| GET | `/metrics` | Métriques Prometheus |
| GET | `/api/todos` | Lister tous les todos |
| GET | `/api/todos/:id` | Récupérer un todo |
| POST | `/api/todos` | Créer un todo |
| PUT | `/api/todos/:id` | Modifier un todo |
| DELETE | `/api/todos/:id` | Supprimer un todo |

#### Dépendances
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "morgan": "^1.10.0",
    "prom-client": "^15.0.0",
    "dotenv": "^16.3.1"
  }
}
```
#### Métriques Prometheus exposées
- `http_requests_total` — compteur de requêtes HTTP
- `http_request_duration_seconds` — durée des requêtes
- `todo_operations_total` — compteur d'opérations CRUD

### 1.2 Frontend — React 18

#### Structure
```
frontend/
├── src/
│   ├── App.jsx               # Composant principal
│   ├── App.css               # Styles globaux
│   ├── index.jsx             # Point d'entrée
│   ├── components/
│   │   ├── TodoForm.jsx      # Formulaire d'ajout
│   │   ├── TodoList.jsx      # Liste des todos
│   │   └── TodoItem.jsx      # Item individuel
│   └── services/
│       └── api.js            # Appels API backend
├── public/
│   └── index.html
├── package.json
├── Dockerfile
└── .dockerignore
```

#### Fonctionnalités
- Affichage de la liste des todos
- Ajout d'un nouveau todo
- Suppression d'un todo
- Marquer un todo comme complété
- Filtrage : Tous / En cours / Complétés
- Statistiques : Total / Complétés / En attente

---

## 2. Tests

### Résultats Jest

```
PASS  tests/todos.test.js
  Todo API
    ✓ should GET all todos     (44ms)
    ✓ should POST a new todo   (13ms)
    ✓ should GET health        (3ms)

Tests:  3 passed, 3 total
Time:   0.44s
```

### Couverture de code
```
File      | % Stmts | % Branch | % Funcs | % Lines
----------|---------|----------|---------|--------
index.js  |   61.64 |    35.00 |   50.00 |   66.17
```

### Lancer les tests
```bash
cd backend
npm test
```

---

## 3. Dockerfiles

### 3.1 Dockerfile Backend

#### Stratégie : Multi-stage build

```
# stage-1-build
FROM node:20.19-alpine3.22 AS builder
WORKDIR /app
COPY package*.json ./
RUN apk update && apk upgrade --no-cache && \
    npm ci && npm cache clean --force && rm -rf /root/.npm
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

```

#### Explication des optimisations apportées

- **Multi-stage build** : sépare la construction et l'exécution de l'application.
- **Image Alpine** : image légère
- **WORKDIR /app** : centralise tous les fichiers de l'application.
- **COPY package*.json avant le code** : améliore l'utilisation du cache Docker.
- **npm ci** : installation rapide et reproductible des dépendances.
- **Nettoyage du cache npm** : réduit la taille de l'image.
- **Suppression de npm, npx et corepack** : retire les outils inutiles en production.
- **Suppression des fichiers temporaires** : évite de stocker des données inutiles.
- **Copie depuis le stage builder** : conserve uniquement les fichiers nécessaires.
- **Utilisateur non-root (nodejs)** : améliore la sécurité du conteneur (rootless)
- **HEALTHCHECK** : vérifie que l'API répond correctement.

### 3.2 Dockerfile Frontend

#### Stratégie : Multi-stage build Node.js + Nginx

```
# stage-1-build React
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install && npm cache clean --force
COPY . .
RUN npm run build

#stage-2-prod Nginx
FROM nginx:alpine
COPY --from=builder /app/build/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

#### Configuration Nginx (`nginx.conf`)

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json;
    gzip_min_length 1000;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Optimisations nginx :**
- Compression gzip sur CSS/JS/JSON
- Cache navigateur 1 an sur les assets statiques
- Support React Router (`try_files`)
- npm cache clean : réduit la taille de l’image build.
- COPY build vers Nginx : ne garde que les fichiers statiques.

### Commandes de build
```bash
# Backend
docker build -t todo-backend:v2 ./backend/

# Frontend
docker build -t todo-frontend:v2 ./frontend/
```
### Test local
```bash
# Lancer le backend
docker run -d -p 3001:3001 --name backend todo-backend:v2

# Lancer le frontend
docker run -d -p 8888:80 --name frontend todo-frontend:v2

# Vérifier le backend
curl http://localhost:3001/health
# {"status":"healthy","timestamp":"..."}

# Vérifier le frontend
curl http://localhost:8888
# <!doctype html>...
```

---

## 4. Fichiers .dockerignore

### .dockerignore Backend
```
node_modules/
npm-debug.log
.env
.env.*
tests/
*.md
.git/
```

### .dockerignore Frontend
```
node_modules/
npm-debug.log
.env
.env.*
build/
*.md
.git/
```

### 5. Hardening des images

Trois outils ont été utilisés pour analyser et valider la sécurité des Dockerfiles et des images.

#### Hadolint — Linter de Dockerfile

Hadolint analyse la syntaxe et les bonnes pratiques du Dockerfile avant le build.

```bash
# Scanner les deux Dockerfiles d'un coup
hadolint backend/Dockerfile frontend/Dockerfile
```

#### Dockle — Audit de l'image Docker

Dockle inspecte l'image construite et vérifie la conformité CIS Benchmark.

```bash
# Scanner le backend
dockle todo-backend:latest

# Scanner le frontend
dockle todo-frontend:latest

# Affichage détaillé
dockle --detail todo-backend:latest
```

#### Trivy — Scanner de vulnérabilités CVE

Trivy détecte les vulnérabilités connues dans les dépendances et le système de base.

```bash
# Scanner le backend (toutes sévérités)
trivy image todo-backend:

# Scanner le frontend
trivy image todo-frontend:

# Seulement les CRITICAL et HIGH
trivy image --severity CRITICAL,HIGH todo-backend:latest

CVE-2024-21538   cross-spawn   ReDoS (déni de service regex)
CVE-2025-64756   glob          Command injection
CVE-2026-26996   minimatch     Déni de service
CVE-2026-23745   tar           Arbitrary file overwrite
CVE-2026-45447   HIGH   libcrypto3 3.5.6-r0 → fix: 3.5.7-r0
Les vulnérabilités détectées par Trivy sont localisées dans le stage builder (Node.js 20 / npm) qui est supprimé après compilation. L'image finale nginx:1.27-alpine3.22 ne présente aucune vulnérabilité CRITICAL ou HIGH.


```
### Bonnes pratiques appliquées
- Images Alpine uniquement (surface d'attaque minimale)
- User non-root dans le container backend (RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001)
- Pas de secrets dans les images
- Healthcheck configuré pour Kubernetes
- `readOnlyRootFilesystem` préparé pour les manifests K8s

---

## 6. Variables d'environnement

### Backend (`.env.example`)
```env
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
```

### Frontend (`.env.example`)
```env
REACT_APP_API_URL=http://localhost:3001
```

---

## Conclusion Semaine 1

L'application Todo App est entièrement fonctionnelle, containerisée et sécurisée :
- images Docker stagées
- Dockerfile : Détection d'erreurs et conformité des images avec Dockle 
- Dockerfile : détection automatique des erreurs, des failles de sécurité et des mauvaises pratiques avec Hadolint
- Trivy : détection CVE
- **Sécurité** : user non-root, images Alpine, healthchecks
- **Application accessible** via navigateur et testée end-to-end

La base est prête pour la Semaine 2 : deploiement sur Kubernetes.




