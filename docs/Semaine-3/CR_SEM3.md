# Semaine 3 — GitOps (ArgoCD)

## Objectif

Mettre en place une chaîne GitOps complète avec ArgoCD : le déploiement sur le cluster K3s doit être piloté uniquement par l'état du repo Git, sans action manuelle ni `kubectl` imperatif depuis le pipeline CI/CD.

---

## Accès

| Service | URL | Identifiants |
|---|---|---|
| Application Todo | http://todo-app.local | - |
| ArgoCD | http://argocd-todo.local | admin / (voir secret `argocd-initial-admin-secret`) |
| Polaris (dashboard) | http://polaris-todo.local | - |

---

## Livrables produits

| Livrable | Statut |
|---|---|
| Tag d'image synchronisé automatiquement dans les manifests Git | ✅ Complet |
| ArgoCD installé dans un namespace dédié (`argocd-todo`) | ✅ Complet |
| Application ArgoCD (`todo-app`) synchronisée automatiquement | ✅ Complet |
| Pipeline CI/CD sans déploiement imperatif (`kubectl set image` retiré) | ✅ Complet |
| Accès web permanent à ArgoCD et au dashboard Polaris (via Ingress) | ✅ Complet |

---

## 1. Pourquoi une installation ArgoCD dédiée

Le cluster K3s est partagé avec deux autres projets qui utilisent déjà une instance ArgoCD (namespace `argocd`). Plutôt que de réutiliser cette instance partagée :

- **Isolation** : éviter qu'une erreur de configuration sur ce projet n'affecte les autres
- **Livrable individuel** : le critère noté "GitOps (ArgoCD/FluxCD)" doit refléter une installation propre à ce projet
- **Permissions** : pas d'accès admin garanti sur l'instance partagée

→ Installation d'une seconde instance ArgoCD dans le namespace **`argocd-todo`**, isolée de l'existant.

---

## 2. Installation d'ArgoCD

```bash
kubectl create namespace argocd-todo
kubectl apply -n argocd-todo -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Dex (SSO) a été désactivé (`replicas: 0`) — pas besoin d'authentification externe pour ce projet, juste le login admin intégré.

### Application ArgoCD

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: todo-app
  namespace: argocd-todo
spec:
  project: default
  source:
    repoURL: https://gitlab.indio.lan/indio/pj_kubernetes.git
    targetRevision: thomas
    path: k8s
    directory:
      recurse: true
  destination:
    server: https://kubernetes.default.svc
    namespace: todo-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

`selfHeal: true` : si quelqu'un modifie le cluster manuellement (ex: un `kubectl edit`), ArgoCD annule le changement et revient à l'état défini dans Git.

---

## 3. Vérification de bout en bout

```bash
kubectl get application -n argocd-todo
# NAME       SYNC STATUS   HEALTH STATUS
# todo-app   Synced        Healthy

kubectl get pods -n todo-app -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'
# todo-backend-...   gitlab.indio.lan:5050/indio/pj_kubernetes/todo-backend:365c9ffa
# todo-frontend-...  gitlab.indio.lan:5050/indio/pj_kubernetes/todo-frontend:365c9ffa
```

Le tag déployé correspond exactement au dernier commit du pipeline — confirmé sans qu'aucun `kubectl` n'ait été exécuté depuis le CI.

---

## 4. Accès web (Ingress, sans port-forward)

### ArgoCD
Le serveur a été passé en mode `insecure` (TLS géré par Traefik plutôt que le certificat auto-signé d'ArgoCD) :
```bash
kubectl patch configmap argocd-cmd-params-cm -n argocd-todo --type merge -p '{"data":{"server.insecure":"true"}}'
```
Puis un Ingress dédié :
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-ingress
  namespace: argocd-todo
spec:
  ingressClassName: traefik
  rules:
  - host: argocd-todo.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: argocd-server
            port:
              number: 80
```
Accessible via `http://argocd-todo.local` (entrée `/etc/hosts` locale requise, comme pour `todo-app.local`).

### Polaris (dashboard partagé)
Un dashboard Polaris tournait déjà sur le cluster (namespace `polaris`, partagé avec les autres projets) — outil passif en lecture seule, sans risque à réutiliser contrairement à ArgoCD. Un Ingress a été ajouté pour y accéder sans toucher à l'installation existante :
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: polaris-todo-ingress
  namespace: polaris
spec:
  ingressClassName: traefik
  rules:
  - host: polaris-todo.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: polaris-dashboard
            port:
              number: 80
```
Accessible via `http://polaris-todo.local`.

---

## Conclusion Semaine 3

La chaîne GitOps est opérationnelle de bout en bout :
- **Git = source unique de vérité** — le tag d'image déployé est toujours celui commité, plus de dérive possible
- **ArgoCD dédié** (`argocd-todo`), isolé des autres projets du cluster partagé, avec `selfHeal` actif
- **Pipeline CI/CD simplifié** — build + mise à jour du manifeste, plus de déploiement imperatif
- **Accès web permanent** à ArgoCD et Polaris via Ingress, sans port-forward

La base est prête pour la Semaine 4 : monitoring LGTM + Alloy.
