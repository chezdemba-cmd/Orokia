# @orokia/mobile

App Expo (React Native, SDK 57) pour les rôles Parent et Élève — une seule
app, navigation branchée par rôle après connexion. Voir le plan
`docs/design-references.md` (racine du repo) pour le détail des jalons.

## Démarrage

```bash
pnpm install                     # depuis la racine du repo
pnpm --filter @orokia/mobile start
```

Scanner le QR code avec l'app **Expo Go** (iOS/Android). Le téléphone doit
être sur le **même réseau Wi-Fi** que cette machine — l'app appelle le
backend sur son adresse IP locale (voir `src/api/config.ts`), pas
`localhost`, qui ne désignerait que le téléphone lui-même.

Le backend (`pnpm --filter @orokia/backend dev`) et sa base doivent tourner
(voir README racine).

## Comptes de test (seed)

Identifiants imprimés par `prisma/seed.ts` (mot de passe unique de dev
`Orokia2026!`) : un compte Parent multi-enfants (`+22370100300`), 5 autres
comptes Parent, 3 comptes Élève (`+22370100320` à `...322`).
