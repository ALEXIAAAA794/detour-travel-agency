# DÉTOUR – version React (Vite + React Router)

## Mise en route
1. `npm ci` puis `npm run dev` pour lancer l’interface React.
2. Pour utiliser le chat, lancer aussi `npm start` dans `support-ia`. Le proxy Vite relaie `/api` vers le backend local.
3. Pour la production, `npm run build` génère l’interface servie par le backend dans `site/dist`.

La clé Gemini reste dans `support-ia/.env` et n’est jamais envoyée au navigateur.
