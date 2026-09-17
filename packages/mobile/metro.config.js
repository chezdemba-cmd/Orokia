// Metro (SDK 52+) détecte et configure automatiquement les monorepos pnpm —
// ce fichier reste minimal, juste un point d'extension si besoin plus tard.
// Voir docs.expo.dev/guides/monorepos.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

module.exports = config;
