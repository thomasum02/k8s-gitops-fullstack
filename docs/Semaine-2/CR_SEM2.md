# Semaine 2 — Infrastructure Kubernetes & GitLab Registry

## Objectif

Déployer l'application Todo App sur le cluster K3s avec des manifests Kubernetes sécurisés, configurer la GitLab Container Registry et valider le déploiement complet.

---

## Livrables produits

| Livrable | Statut |
|---|---|
| Manifests Kubernetes (Deployment, Service, ConfigMap, Ingress) | ✅ Complet |
| GitLab Container Registry configurée | ✅ Complet |
| Images pushées sur registry.gitlab.com | ✅ Complet |
| 6 pods Running (3 backend + 3 frontend) | ✅ Complet |
| Ingress Traefik opérationnel | ✅ Complet |
| Score Polaris 92/100 | ✅ Complet |
| Pipeline GitLab CI/CD (test, build, deploy) | ✅ Complet |
| Scans de sécurité automatisés (SAST, Secret Detection, Polaris, Hadolint, Trivy, Dockle) | ✅ Complet |

---

## 1. Architecture Kubernetes

### Cluster K3s
```
cp1   Ready   control-plane,etcd   ✅
cp2   Ready   control-plane,etcd   ✅
wkr1  Ready   worker               ✅
wkr2  Ready   worker               ✅
wkr3  Ready   worker               ✅
```

### Namespace dédié
```bash
kubectl create namespace todo-app
```

### Structure des manifests
```
k8s/
├── backend/
│   ├── configmap.yaml    # Variables d'environnement
│   ├── deployment.yaml   # Déploiement backend
│   └── service.yaml      # Service ClusterIP
├── frontend/
│   ├── configmap.yaml    # Variables d'environnement
│   ├── deployment.yaml   # Déploiement frontend
│   └── service.yaml      # Service ClusterIP
└── ingress.yaml          # Point d'entrée Traefik
```

---

## 2. Manifests Kubernetes

### 2.1 ConfigMap Backend
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: todo-backend-config
  namespace: todo-app
data:
  PORT: "3001"
  NODE_ENV: "production"
  LOG_LEVEL: "info"
```

### 2.2 Deployment Backend

Points clés de sécurisation :

| Paramètre | Valeur | Justification |
|---|---|---|
| `replicas` | 3 | Haute disponibilité |
| `strategy` | RollingUpdate | Zéro downtime |
| `runAsNonRoot` | true | Pas d'exécution root |
| `runAsUser` | 1001 | UID fixe non-root |
| `readOnlyRootFilesystem` | true | Filesystem read-only |
| `allowPrivilegeEscalation` | false | Pas d'escalade |
| `capabilities.drop` | ALL | Surface d'attaque minimale |
| `seccompProfile` | RuntimeDefault | Linux hardening |
| `automountServiceAccountToken` | false | Sécurité K8s |
| `imagePullPolicy` | Always | Toujours la dernière image |
| `livenessProbe` | /health | Redémarre si mort |
| `readinessProbe` | /ready | Retire du trafic si pas prêt |
| `resources.limits` | 256Mi / 500m | Isolation ressources |

### 2.3 Service Backend
```yaml
type: ClusterIP   # Accessible uniquement dans le cluster
port: 3001
```

### 2.4 Ingress
```yaml
host: todo-app.local
paths:
  /      → todo-frontend-svc:80
  /api   → todo-backend-svc:3001
```

---

## 3. GitLab Container Registry

### Pourquoi une registry ?

```
Sans registry :
Docker local → images locales → K3s ne les voit pas ❌

Avec registry :
Docker → push → GitLab Registry → K3s pull ✅
```

K3s utilise `containerd` (pas Docker) — ils ne partagent pas le même stockage d'images.

### Configuration

```bash
# Login
docker login registry.gitlab.com -u Thomvs5.4 -p <TOKEN>

# Tag des images
docker tag todo-backend:v6 registry.gitlab.com/esgi3381238/pj_kubernetes/todo-backend:v6
docker tag todo-frontend:v6 registry.gitlab.com/esgi3381238/pj_kubernetes/todo-frontend:v6

# Push
docker push registry.gitlab.com/esgi3381238/pj_kubernetes/todo-backend:v6
docker push registry.gitlab.com/esgi3381238/pj_kubernetes/todo-frontend:v6
```

### Secret K8s pour l'authentification
```bash
kubectl create secret docker-registry gitlab-registry-secret \
  --docker-server=registry.gitlab.com \
  --docker-username=Thomvs5.4 \
  --docker-password=<TOKEN> \
  --namespace=todo-app
```

Référencé dans les deployments :
```yaml
spec:
  imagePullSecrets:
  - name: gitlab-registry-secret
```

---

## 4. Sécurisation des manifest - Audit Polaris — Score 92/100

Utilisation de l'outil Polaris qui analyse les manifests Kubernetes et vérifie les bonnes pratiques de sécurité.

```bash
polaris audit --audit-path k8s/ --format pretty
```

### Résultats

```
Polaris audited Path k8s/ at 2026-06-12
Final score: 92/100
```

### Points validés ✅
```
✅ deploymentMissingReplicas      — 3 replicas configurés
✅ metadataAndInstanceMismatched  — labels corrects
✅ automountServiceAccountToken   — désactivé
✅ runAsRootAllowed               — non-root enforced
✅ notReadOnlyRootFilesystem      — read-only filesystem
✅ privilegeEscalationAllowed     — désactivé
✅ linuxHardening                 — seccompProfile RuntimeDefault
✅ insecureCapabilities           — ALL capabilities droppées
✅ livenessProbeMissing           — probes configurées
✅ readinessProbeMissing          — probes configurées
✅ cpuLimitsMissing               — limits définies
✅ memoryLimitsMissing            — limits définies
✅ pullPolicyNotAlways            — Always configuré
✅ tagNotSpecified                — tag v6 spécifié
```

### Warnings restants 😬
```
😬 missingPodDisruptionBudget  — PDB (haute dispo avancée)
😬 missingNetworkPolicy        — isolation réseau
😬 topologySpreadConstraint    — répartition sur nœuds
😬 priorityClassNotSet         — priorité pods
😬 tlsSettingsMissing          — HTTPS sur l'ingress
```

Ces warnings concernent des fonctionnalités avancées non requises pour ce projet.

---

## 5. Déploiement et vérification

### Appliquer les manifests
```bash
kubectl apply -f k8s/backend/configmap.yaml
kubectl apply -f k8s/backend/deployment.yaml
kubectl apply -f k8s/backend/service.yaml
kubectl apply -f k8s/frontend/configmap.yaml
kubectl apply -f k8s/frontend/deployment.yaml
kubectl apply -f k8s/frontend/service.yaml
kubectl apply -f k8s/ingress.yaml
```

### Résultats
```
NAME                                 READY   STATUS    RESTARTS   AGE
pod/todo-backend-9fddbbf97-5rz27     1/1     Running   0          69s
pod/todo-backend-9fddbbf97-m8r86     1/1     Running   0          90s
pod/todo-backend-9fddbbf97-sh5bm     1/1     Running   0          48s
pod/todo-frontend-86946bf459-6phbt   1/1     Running   0          90s
pod/todo-frontend-86946bf459-gj9k8   1/1     Running   0          57s
pod/todo-frontend-86946bf459-zh4d9   1/1     Running   0          74s

NAME                        TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)
service/todo-backend-svc    ClusterIP   10.43.6.29      <none>        3001/TCP
service/todo-frontend-svc   ClusterIP   10.43.234.149   <none>        80/TCP

deployment.apps/todo-backend    3/3   READY ✅
deployment.apps/todo-frontend   3/3   READY ✅
```

### Test Healthcheck depuis le cluster
```bash
kubectl exec -n todo-app todo-backend-9fddbbf97-m8r86 -- \
  wget -qO- http://localhost:3001/health

# Résultat :
{"status":"healthy","timestamp":"2026-06-12T22:36:36.097Z"}
```

### Test Ingress
```bash
thomas@cp1:~/pj_kubernetes/k8s$ kubectl get ingress -n todo-app
NAME           CLASS     HOSTS            ADDRESS                                                       PORTS   AGE
todo-ingress   traefik   todo-app.local   10.160.2.90,10.160.2.91,10.160.2.92,10.160.2.93,10.160.2.94   80      30m

curl -H "Host: todo-app.local" http://10.160.2.90/api/todos
# {"count":3,"todos":[
#   {"id":1,"title":"Learn Kubernetes","completed":false},
#   {"id":2,"title":"Setup CI/CD pipeline","completed":true},
#   {"id":3,"title":"Deploy application","completed":false}
# ]}
```

---

## 6. Accès à l'application

Puis accéder via :
```
http://todo-app.local        → Frontend React ✅
http://todo-app.local/api/todos → API Backend ✅

thomas@cp1:~/pj_kubernetes/k8s$ curl -H "Host: todo-app.local" http://10.160.2.90/api/todos
{"count":3,"todos":[{"id":1,"title":"Learn Kubernetes","completed":false},{"id":2,"title":"Setup CI/CD pipeline","completed":true},{"id":3,"title":"Deploy application","completed":false}]}thomas@cp1:~/pj_kubernetes/k8s$
```

---

## 7. Pipeline GitLab CI/CD

### Stages du pipeline
```
test → secret-detection → build → security → deploy
```

### Jobs

| Job | Stage | Rôle |
|---|---|---|
| `test-backend` | test | Tests Jest du backend |
| `sast` | test | Analyse statique du code (template GitLab) |
| `secret_detection` | secret-detection | Recherche de secrets oubliés dans le code |
| `build-backend` / `build-frontend` | build | Build + push des images Docker vers la registry |
| `polaris` | security | Audit des manifests Kubernetes |
| `hadolint` | security | Lint des Dockerfiles |
| `trivy` | security | Scan de vulnérabilités CVE sur les images buildées |
| `dockle` | security | Audit CIS des images Docker |
| `deploy` | deploy | Déploiement sur le cluster K3s (`kubectl set image`) |

### Migration vers la registry self-hosted

Le projet a été migré de `registry.gitlab.com` (GitLab.com) vers `gitlab.indio.lan:5050` (GitLab self-hosted). Les images existantes (v1 à v6) ont été recopiées manuellement vers le nouveau registre avec `docker pull` / `docker tag` / `docker push`.

### Problèmes rencontrés et corrigés

| Problème | Cause | Correction |
|---|---|---|
| `Forbidden` sur `kubectl set image` | Le ServiceAccount `gitlab-ci` n'avait pas de droits sur le namespace `todo-app` | Ajout d'un `Role` + `RoleBinding` dans `todo-app` |
| `ImagePullBackOff` | Registry privée, pas de credentials sur le cluster | Création d'un `imagePullSecret` + référencement dans les deployments |
| `no such host: gitlab.indio.lan` | DNS interne non résolu sur certains nœuds | Entrée `/etc/hosts` ajoutée sur les 5 nœuds |
| `certificate signed by unknown authority` | Certificat interne (Vault PKI) non approuvé sur certains nœuds | Distribution du certificat CA (`gitlab-chain.crt`) + `update-ca-certificates` sur les 5 nœuds |
| Bouton "Add" du frontend ne fonctionnait pas | URL du backend codée en dur (`REACT_APP_API_URL`), inatteignable depuis le navigateur | Passage à une URL relative (`/api/todos`), routée par l'Ingress |
| CVE HIGH (`form-data`) détectée par Trivy sur l'image backend | Le Dockerfile installait aussi les devDependencies (jest, supertest...) dans l'image de prod | `npm ci --omit=dev` dans le Dockerfile backend |

### Résultat final

Pipeline complet et vert (#156) :
```
test → secret-detection → build → security → deploy
  ✅         ✅              ✅        ✅         ✅
```

---

## Conclusion Semaine 2

L'infrastructure Kubernetes est complète et opérationnelle :
- **6 pods Running** sur le cluster K3s (3 backend + 3 frontend)
- **GitLab Registry** configurée pour le stockage des images
- **Ingress Traefik** pour le routage HTTP
- **Score Polaris 92/100** — manifests sécurisés
- **RollingUpdate** — déploiements sans downtime
- **Pipeline GitLab CI/CD** complet (test, build, sécurité, déploiement)
- **Scans de sécurité automatisés** à chaque pipeline (SAST, Secret Detection, Polaris, Hadolint, Trivy, Dockle)

#La base est prête pour la Semaine 3 : GitOps (ArgoCD) + Monitoring LGTM.

