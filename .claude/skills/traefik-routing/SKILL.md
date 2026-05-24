# Skill — Traefik Routing

> À compléter au fur et à mesure que des patterns de routing et de middleware Traefik sont établis dans ce projet.

## Fichiers clés

| Fichier                        | Rôle                                      |
|-------------------------------|-------------------------------------------|
| `docker-compose.yml`          | Service Traefik + réseau `webproxy`       |
| `traefik/traefik.yml`         | Config statique (entrypoints, dashboard)  |
| `traefik/dynamic_conf.yml`    | Config dynamique (middlewares, routes)    |

## Ajouter une route

Les routes sont définies via des **labels Docker** sur le service cible :

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.<name>.rule=Host(`<name>.localhost`)"
  - "traefik.http.services.<name>.loadbalancer.server.port=<port>"
  - "traefik.docker.network=webproxy"
```

## Ajouter un middleware

Les middlewares globaux se définissent dans `traefik/dynamic_conf.yml`.
Pour appliquer un middleware à un router spécifique, utiliser le label :

```yaml
- "traefik.http.routers.<name>.middlewares=<middleware-name>"
```
