# Déploiement — Vercel + Supabase

## Ce qui a été préparé côté code

- `api/[...slug].ts` — adapte l'app Fastify existante (`packages/backend/src/app.ts`)
  en fonction serverless Vercel (une seule fonction catch-all sous `/api/*`).
- `vercel.json` — build (shared + web), routing SPA, et le job d'escalade des
  absences reconverti en Vercel Cron (`/internal/cron/escalations`) puisqu'un
  `setInterval` ne survit pas entre deux invocations serverless.
- `prisma/schema.prisma` — `binaryTargets` inclut `rhel-openssl-3.0.x` (runtime
  Linux de Vercel) en plus de `native` (ta machine Windows), et un `directUrl`
  séparé pour Prisma Migrate (nécessaire avec un pooler comme celui de Supabase).
- `CRON_SECRET` — protège l'endpoint de cron contre un appel public.

Ce que je ne peux pas faire à ta place : créer les comptes, cliquer dans les
tableaux de bord, ni renseigner les variables d'environnement (je n'ai pas
d'accès navigateur). Ce qui suit est à faire de ton côté.

## 1. Créer le projet Supabase

1. https://supabase.com → New Project. Choisis une région proche du Mali/Europe
   (ex. `eu-west` ou `eu-central`) pour la latence.
2. Une fois créé : **Project Settings → Database → Connection string**.
   Tu as besoin de deux URLs :
   - **Connection pooling** (mode "Transaction", port `6543`) → c'est ton `DATABASE_URL`.
   - **Direct connection** (port `5432`) → c'est ton `DIRECT_URL`.
   Les deux utilisent le même mot de passe (celui choisi à la création du projet).

## 2. Appliquer les migrations sur Supabase (depuis ta machine)

```bash
cd packages/backend
# Dans .env (temporairement, ou en variables d'env de la commande) :
#   DATABASE_URL = connexion directe Supabase (port 5432)
#   DIRECT_URL   = la même chose
npx prisma migrate deploy
```

Utilise la connexion **directe** (port 5432) pour cette étape — `prisma migrate
deploy` ne fonctionne pas à travers le pooler. Une fois les migrations
appliquées, tu peux lancer le seed si tu veux des données de démo :

```bash
npx prisma db seed
```

(ou repartir d'une base vide et créer ta première vraie école via le panneau
super-admin — dans ce cas il te faut un compte avec `isSuperAdmin = true`,
créable directement dans Supabase Table Editor sur la table `accounts`.)

## 3. Créer le projet Vercel

1. https://vercel.com → Add New → Project → importe le dépôt GitHub
   `chezdemba-cmd/Orokia`.
2. **Root Directory** : laisse la racine du repo (ne pas pointer vers
   `packages/web`) — `vercel.json` gère déjà le build du monorepo.
3. **Framework Preset** : "Other" (pas besoin d'un preset, `vercel.json` s'en charge).
4. **Environment Variables** — ajoute :

   | Nom | Valeur |
   |---|---|
   | `DATABASE_URL` | connexion **pooled** Supabase (port 6543, `?pgbouncer=true`) |
   | `DIRECT_URL` | connexion **directe** Supabase (port 5432) |
   | `JWT_ACCESS_SECRET` | chaîne aléatoire longue (ex. `openssl rand -hex 32`) |
   | `JWT_REFRESH_SECRET` | idem, différente de la précédente |
   | `OTP_HASH_SECRET` | idem, différente des deux précédentes |
   | `CRON_SECRET` | idem — Vercel Cron l'enverra automatiquement dans l'en-tête `Authorization` |
   | `NODE_ENV` | `production` |

5. Déploie.

## 4. Après le premier déploiement

- Vérifie `https://<ton-domaine>.vercel.app/api/health` → doit répondre `{"status":"ok"}`.
- Connecte-toi avec un compte réel (ou celui du seed si tu l'as lancé).
- **Le cron d'escalade** : sur le plan Vercel gratuit (Hobby), les cron jobs
  sont limités à une exécution par jour maximum — si tu restes sur ce plan,
  change `"schedule": "0 */6 * * *"` dans `vercel.json` en `"0 0 * * *"`
  (une fois par jour) avant de déployer, sinon Vercel refusera la config.

## À savoir avant le premier essai réel

Je n'ai pas pu tester un vrai déploiement Vercel moi-même (pas d'accès à ton
compte). Le code suit les patterns documentés (Fastify en serverless, Prisma
avec pooler Supabase), mais il est probable qu'il faille un ou deux
allers-retours si le build Vercel remonte une erreur — envoie-moi le message
d'erreur exact et je corrige.
