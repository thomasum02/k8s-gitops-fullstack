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

## 2. Synchroniser le tag d'image entre CI et Git

**Problème initial** : les manifests (`k8s/backend/deployment.yaml`, `k8s/frontend/deployment.yaml`) contenaient un tag figé (`v2`) depuis la semaine 1, alors que le déploiement réel se faisait via `kubectl set image` directement sur le cluster — sans jamais mettre à jour Git. Avec GitOps, Git est la seule source de vérité : ArgoCD aurait donc redéployé `v2` en permanence.

**Solution** — nouveau job CI `update-manifests` (stage `push`) :
```yaml
update-manifests:
  stage: push
  image:
    name: alpine/git:latest
    entrypoint: [""]
  script:
    - sed -i -E "s#^(\s*)image: .*#\1image: ${CI_REGISTRY_IMAGE}/todo-backend:${CI_COMMIT_SHORT_SHA}#" k8s/backend/deployment.yaml
    - sed -i -E "s#^(\s*)image: .*#\1image: ${CI_REGISTRY_IMAGE}/todo-frontend:${CI_COMMIT_SHORT_SHA}#" k8s/frontend/deployment.yaml
    - git commit -m "chore(k8s): bump image tags to ${CI_COMMIT_SHORT_SHA} [skip ci]"
    - git push origin HEAD:${CI_COMMIT_REF_NAME}
```
Après chaque build, le pipeline commite lui-même le vrai tag déployé dans les manifests (avec `[skip ci]` pour éviter une boucle de pipelines).

---

## 3. Installation d'ArgoCD

```bash
kubectl create namespace argocd-todo
kubectl apply -n argocd-todo -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Dex (SSO) a été désactivé (`replicas: 0`) — pas besoin d'authentification externe pour ce projet, juste le login admin intégré.

### Problèmes rencontrés

| Problème | Cause | Correction |
|---|---|---|
| `serviceaccounts is forbidden` (Sync: Unknown) | Le manifeste officiel code en dur `namespace: argocd` dans les `ClusterRoleBinding`, alors qu'on installe dans `argocd-todo` — les ClusterRoleBindings restaient rattachés à l'instance partagée existante | Création de `ClusterRoleBinding` dédiés (`argocd-todo-*`) pointant vers les ServiceAccounts du bon namespace |
| `no such host: gitlab.indio.lan` (dans les pods) | CoreDNS ne consulte pas le `/etc/hosts` des nœuds (fix déjà fait pour les nœuds eux-mêmes en semaine 2) | `hostAliases` ajouté directement sur le déploiement `argocd-repo-server`, isolé du reste du cluster |
| `HTTP Basic: Access denied` | Erreur de copier-coller du token dans le secret de credentials | Recréation du secret avec le bon token (scope `read_repository`) |
| `Problem with the SSL CA cert` | Certificat interne copié-collé via le chat avait probablement récupéré des caractères invisibles (retours chariot Windows) | Certificat recapturé directement sur le nœud via `openssl s_client`, sans repasser par un copier-coller externe |

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

## 4. Retrait du déploiement imperatif

Une fois ArgoCD opérationnel, le job `deploy` (`kubectl set image` + `rollout status`) a été retiré du pipeline — il ferait doublon avec ArgoCD et pourrait entrer en conflit avec le `selfHeal`.

**Pipeline final** :
```
test → secret-detection → build → security → push (update-manifests)
```
Le déploiement n'est plus une étape du pipeline : il est géré en continu par ArgoCD, indépendamment du CI.

---

## 5. Vérification de bout en bout

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

## 6. Accès web (Ingress, sans port-forward)

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
