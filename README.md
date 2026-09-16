# Un date ?

Expérience Next.js responsive pilotée par scénarios privés.

## Lancer le projet

```bash
npm install
npm run dev
```

- Accueil neutre : `http://localhost:3000`
- Premier scénario : `http://localhost:3000/s/26090e3101b20461625aee51`

## Ajouter un scénario

Ajouter une entrée dans `lib/scenarios.ts`. L’ordre du tableau `flow` définit l’ordre des scènes et peut être modifié sans changer le routeur.

## Telegram

1. Ouvrir `@BotFather` dans Telegram, envoyer `/newbot` et suivre les étapes.
2. Copier le token fourni par BotFather.
3. Ouvrir le nouveau bot et lui envoyer `/start` ou un premier message.
4. Ouvrir `https://api.telegram.org/bot<VOTRE_TOKEN>/getUpdates` puis récupérer la valeur `message.chat.id`.
5. Copier `.env.example` vers `.env.local`, puis renseigner :

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Redémarrer ensuite le serveur local. Sur Vercel, ajouter les mêmes valeurs dans **Project Settings > Environment Variables**, ainsi que `NEXT_PUBLIC_SITE_URL`, puis redéployer le projet. Ne jamais publier le token ni l’ajouter au dépôt Git.
