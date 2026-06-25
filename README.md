# Hackatweet — Backend

API d'un clone simplifié de Twitter. Inscription/connexion des utilisateurs, tweets, likes,
hashtags et trends.

**Stack :** Node.js · Express · MongoDB (Mongoose) · bcrypt · uid2

> 📐 Détails d'architecture, d'auth et de modélisation dans **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## Lancer le projet

```bash
yarn            # installe les dépendances
yarn dev        # mode développement (nodemon, port 3000)
yarn test       # tests (Jest)
```

Créer un `.env` à la racine :

```
MONGODB_URI=mongodb+srv://...
PORT=3000
```

## Authentification

Token opaque (pas de JWT). La connexion renvoie un `token` ; envoyez-le sur les routes protégées :

```
Authorization: Bearer <token>
```

## Routes

Base : `/api`

| Méthode | Route                    | Auth | Description                        |
|---------|--------------------------|:----:|------------------------------------|
| POST    | `/users/signup`          | —    | inscription                        |
| POST    | `/users/signin`          | —    | connexion (renvoie le token)       |
| GET     | `/tweets`                | ✅   | liste les tweets                   |
| POST    | `/tweets`                | ✅   | crée un tweet                      |
| DELETE  | `/tweets/:id`            | ✅   | supprime un tweet                  |
| PUT     | `/tweets/:id/like`       | ✅   | like / unlike                      |
| GET     | `/tweets/trends`         | ✅   | top 10 des hashtags                |
| GET     | `/tweets/hashtag/:tag`   | ✅   | tweets d'un hashtag                |

Réponses en JSON, toujours avec `result: true|false`.
