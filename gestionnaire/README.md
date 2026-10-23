# React + Vite

## Démarrage local

L'interface de gestionnaire utilise PostgreSQL et le service `conseillers` sur le port `8081`. Configurez `DATABASE_URL` dans `backend/.env`, installez les dépendances Python depuis le dossier `conseillers`, puis démarrez ces deux processus dans des terminaux séparés :

```powershell
cd .\conseillers
py -3 -m pip install -r requirements.txt
py -3 app.py
```

```powershell
cd .\gestionnaire
npm run dev
```

Ouvrez ensuite `http://localhost:5174`. Connectez-vous avec l'identifiant du compte gestionnaire (pas son adresse e-mail). Au démarrage, les comptes et sessions de l'ancienne base SQLite sont importés dans PostgreSQL s'ils n'y figurent pas déjà. Si aucun compte n'existe, lancez `py -3 auth.py` depuis `conseillers` pour en créer un. Le backend doit également être démarré sur le port `3000` pour accéder aux dossiers, rendez-vous et avis.

Pour lancer l'ensemble des services avec Docker, suivez les instructions de la section « Environnement Docker local » dans le [README backend](../backend/README.md).

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
