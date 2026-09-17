# OROKIA

Système de gestion scolaire pour le Groupe Scolaire Awa Danté (Bamako, Mali).
Monorepo pnpm : `packages/backend` (API Fastify + Prisma/PostgreSQL),
`packages/web` (app web staff React/Vite), `packages/shared` (contrats zod
partagés), `packages/mobile` (placeholder, phase future).

Voir `docs/design-references.md` pour les maquettes visuelles et le plan
d'implémentation complet.

## Prérequis

- Node.js 20+
- pnpm (`npm install -g pnpm` ou `corepack enable`)
- Docker (pour PostgreSQL local)

## Démarrage

```bash
pnpm install
cp .env.example packages/backend/.env
cp .env.example packages/web/.env   # ne garder que VITE_API_URL
pnpm db:up          # démarre Postgres via Docker Compose
pnpm db:migrate      # applique le schéma Prisma
pnpm db:seed         # génère des données de démonstration réalistes
pnpm dev             # backend sur :4000, web sur :5173
```

Les identifiants de connexion générés par le seed sont affichés dans la
console (mot de passe unique de développement, jamais utilisé en production).

## Commandes utiles

| Commande | Effet |
|---|---|
| `pnpm dev` | Démarre backend + web en parallèle |
| `pnpm test` | Tests unitaires backend/shared (Vitest, rapides, sans base) |
| `pnpm test:integration` | Tests d'intégration backend sur base Postgres réelle dédiée |
| `pnpm db:reset` | Réinitialise la base et relance le seed |
| `pnpm build` | Build de production de tous les packages |

## Tests d'intégration

`pnpm test:integration` exécute les scénarios critiques via Fastify `inject()`
sur une base Postgres réelle et isolée (`orokia_test`, même conteneur Docker) :
authentification multi-profil/2FA, verrouillage de trimestre + correction
avec audit, idempotence de l'appel, application des rôles. Base vidée entre
chaque test (`test/helpers/db.ts`).

Mise en place une seule fois :

```bash
docker exec orokia-postgres psql -U orokia -d orokia -c "CREATE DATABASE orokia_test;"
DATABASE_URL="postgresql://orokia:orokia_dev_password@localhost:5432/orokia_test?schema=public" \
  pnpm --filter @orokia/backend exec prisma migrate deploy
```
