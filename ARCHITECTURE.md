# Hackatweet Backend — Architecture & Décisions

Document d'onboarding technique. Explique **comment le backend est organisé**, **comment fonctionne
l'authentification**, **comment la base de données est reliée** et **comment un tweet sait à quel
utilisateur il appartient**.

> Stack : **Node.js + Express 4 + Mongoose 9 + MongoDB**. Auth avec `bcrypt` (hachage du mot de passe) et `uid2` (token).

---

## 1. Vue d'ensemble & couches

L'API suit une architecture en couches classique d'Express :

```
HTTP request
   │
   ▼
[ app.js ]  ── CORS, parseur JSON, logger, connexion à la BDD à chaque requête
   │
   ▼
[ routes/ ]  ── définit les endpoints et applique les middlewares (ex : auth)
   │
   ▼
[ middleware/ ]  ── auth : valide le Bearer token et injecte req.user
   │
   ▼
[ controllers/ ]  ── logique métier : validations + accès aux models
   │
   ▼
[ models/ ]  ── schémas Mongoose (User, Tweet) + connexion
   │
   ▼
MongoDB
```

Règle mentale : **la route n'a pas de logique, le controller ne connaît pas le HTTP bas niveau, le model décrit seulement les données.**

---

## 2. Hiérarchie des fichiers

```
hackatweet-backend/
├── app.js                      # monte Express, les middlewares globaux et enregistre les routes
├── bin/www                     # point d'entrée : démarre le serveur HTTP et connecte à Mongo
├── .env                        # MONGODB_URI, PORT (non versionné)
│
├── routes/
│   ├── users.js                # /api/users  → signup, signin (PUBLIC)
│   ├── tweets.js               # /api/tweets → CRUD des tweets (PROTÉGÉ)
│   └── index.js                # héritage du scaffold express-generator (non utilisé)
│
├── controllers/
│   ├── userController.js       # signup, signin (bcrypt + token)
│   └── tweetController.js      # getTweets, createTweet, deleteTweet, toggleLike, getTrends, getTweetsByHashtag
│
├── middleware/
│   └── auth.js                 # valide "Authorization: Bearer <token>" et remplit req.user
│
├── models/
│   ├── User.js                 # schéma de l'utilisateur
│   ├── Tweet.js                # schéma du tweet (relié à User)
│   ├── connection.js           # connexion Mongoose avec cache (compatible serverless)
│   └── db-handler.js           # helper de base en mémoire pour les tests
│
├── utils/
│   └── hashtags.js             # extrait les #hashtags du contenu d'un tweet
│
└── __tests__/                  # Jest + supertest + mongodb-memory-server
    ├── auth.test.js
    ├── tweet.test.js
    └── setup.js
```

---

## 3. Cycle de vie d'une requête

1. `bin/www` charge le `.env`, ouvre la connexion à Mongo et démarre le serveur HTTP avec l'`app`.
2. `app.js` applique les middlewares globaux : `cors`, `morgan` (log), `express.json`, `cookieParser`.
3. Un middleware garantit qu'**il y a une connexion à la BDD avant chaque requête** (important en serverless,
   où `bin/www` peut ne jamais s'exécuter — voir section 8).
4. La requête arrive sur une route (`/api/users` ou `/api/tweets`).
5. Sur `/api/tweets`, **avant tout handler**, elle passe par l'`authMiddleware`.
6. Le controller exécute la logique et répond toujours en JSON.
7. Les erreurs non gérées tombent dans le error handler global d'`app.js`, qui renvoie `500`.

---

## 4. Authentification 🔑 (la partie qui a posé question)

**On n'utilise pas JWT.** On utilise un **token opaque aléatoire** stocké directement sur l'utilisateur en base.
C'est l'approche la plus simple et suffisante pour un hackathon.

### Flux complet

```
SIGNUP / SIGNIN                         REQUÊTES AUTHENTIFIÉES
─────────────                           ──────────────────────
POST /api/users/signin                  GET /api/tweets
  { email, password }                     Header : Authorization: Bearer <token>
        │                                        │
        ▼                                        ▼
bcrypt.compare(mdp, hash)                authMiddleware :
        │                                  token = header.split(' ')[1]
   génère token = uid2(32)                 user  = User.findOne({ token })
   user.token = token                            │
   user.save()                             si trouvé → req.user = user → next()
        │                                  sinon     → 401
        ▼
  répond { result:true, token }
```

### Points clés

- **Mot de passe** : jamais stocké en clair. `bcrypt.hash(password, 10)` au signup ; `bcrypt.compare` au signin.
- **Token** : `uid2(32)` génère une chaîne aléatoire. Elle est stockée dans `User.token` et **renvoyée dans le body**
  de la réponse. Le frontend conserve ce token (ex : Redux/localStorage) et l'envoie à chaque requête protégée.
- **Comment le backend identifie l'utilisateur** : l'`authMiddleware` fait `User.findOne({ token })`. S'il existe
  un utilisateur avec ce token, il devient `req.user`. À partir de là le controller sait **qui est connecté** via `req.user._id`.
- **Nouveau token à chaque signin** : à la reconnexion, le token est régénéré et écrasé — l'ancien devient invalide.

### Fichiers

- [middleware/auth.js](middleware/auth.js) — valide le header et remplit `req.user`.
- [controllers/userController.js](controllers/userController.js) — `signup` / `signin`.
- Routes protégées : `router.use(authMiddleware)` en haut de [routes/tweets.js](routes/tweets.js).

> **Note de design** : le token est une simple chaîne, sans expiration. Suffisant pour le périmètre du projet.
> En production, l'évolution naturelle serait JWT avec expiration ou des sessions avec TTL.

---

## 5. Modèle de données & relations

### User ([models/User.js](models/User.js))

| Champ      | Type   | Notes                                  |
|------------|--------|----------------------------------------|
| `username` | String | obligatoire, **unique**, 3–30 car.     |
| `email`    | String | obligatoire, **unique**, lowercase     |
| `password` | String | hash bcrypt (jamais le mdp en clair)   |
| `token`    | String | token de session actuel                |
| `createdAt`| Date   | défaut `Date.now`                      |

### Tweet ([models/Tweet.js](models/Tweet.js))

| Champ      | Type                    | Notes                                           |
|------------|-------------------------|-------------------------------------------------|
| `content`  | String                  | obligatoire, max. 280 car.                      |
| `author`   | **ObjectId → ref User** | **propriétaire du tweet** (la relation principale) |
| `hashtags` | [String]                | lowercase, indexé ; extrait du contenu          |
| `likes`    | [ObjectId → ref User]   | liste des utilisateurs qui ont liké             |
| `createdAt`| Date                    | défaut `Date.now`                               |

### ⭐ Comment le tweet « sait » qu'il appartient au User X

C'était la question centrale. Le lien est le champ **`author`**, qui stocke l'**`_id` de l'utilisateur**
(une référence), pas les données de l'utilisateur. Cela fonctionne en 3 temps :

1. **Dans le schéma** — on déclare la référence :
   ```js
   author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
   ```
   Cela dit à Mongoose : « ce champ pointe vers un document de la collection `User` ».

2. **À la création** — l'`author` vient de qui est connecté, via le `req.user` injecté par l'auth middleware :
   ```js
   // controllers/tweetController.js
   const tweet = new Tweet({
     content,
     author: req.user._id,        // ← le tweet reçoit l'_id de l'utilisateur authentifié
     hashtags: extractHashtags(content),
   });
   ```
   Autrement dit : **l'utilisateur n'envoie pas son propre id** ; il provient du token validé. Cela empêche de
   falsifier la paternité (l'auteur).

3. **À la lecture** — l'`_id` seul n'est pas utile pour le frontend, donc on utilise `.populate()` pour
   **remplacer l'ObjectId par les vraies données de l'utilisateur** (seulement les champs voulus) :
   ```js
   const tweets = await Tweet.find()
     .populate('author', 'username')   // author devient { _id, username }
     .sort({ createdAt: -1 });
   ```

Même principe pour les **likes** : `likes` est un tableau d'`_id` d'utilisateurs. Le `toggleLike` vérifie si
l'`_id` de l'utilisateur connecté est déjà dans le tableau — s'il y est, on le retire (unlike) ; sinon, on l'ajoute (like).

---

## 6. Routes — référence de l'API

URL de base : `/api`

### Publiques — `/api/users`

| Méthode | Path             | Body                          | Réponse (succès)                                    |
|---------|------------------|-------------------------------|-----------------------------------------------------|
| POST    | `/users/signup`  | `{ username, email, password}`| `201 { result:true, token, username }`              |
| POST    | `/users/signin`  | `{ email, password }`         | `200 { result:true, token, username }`              |

### Protégées — `/api/tweets` (exigent `Authorization: Bearer <token>`)

| Méthode | Path                     | Body          | Ce que ça fait                                       |
|---------|--------------------------|---------------|------------------------------------------------------|
| GET     | `/tweets`                | —             | liste tous les tweets (author peuplé), les plus récents en premier |
| POST    | `/tweets`                | `{ content }` | crée un tweet de l'utilisateur connecté ; extrait les hashtags |
| DELETE  | `/tweets/:id`            | —             | supprime le tweet par id                             |
| PUT     | `/tweets/:id/like`       | —             | like/unlike (toggle) ; retourne `likesCount`         |
| GET     | `/tweets/trends`         | —             | top 10 des hashtags par nombre (aggregation)         |
| GET     | `/tweets/hashtag/:tag`   | —             | tweets contenant le hashtag                          |

### Exemples `curl`

```bash
# Inscription
curl -X POST http://localhost:3000/api/users/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"ada","email":"ada@mail.com","password":"123456"}'

# Connexion (renvoie le token)
curl -X POST http://localhost:3000/api/users/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@mail.com","password":"123456"}'

# Créer un tweet (utilise le token de la connexion)
curl -X POST http://localhost:3000/api/tweets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI" \
  -d '{"content":"mon premier tweet #hackatweet"}'
```

---

## 7. Patterns & conventions

- **Réponse standardisée** : chaque réponse a un `result: boolean`.
  - Succès : `{ result: true, ...données }`
  - Erreur : `{ result: false, error: "message" }`
- **`asyncHandler`** : wrapper qui capture les erreurs des fonctions `async` et les transmet à `next()`,
  évitant les `try/catch` répétés. Défini dans les deux controllers.
- **Validations dans le controller** : champs obligatoires, format de l'email (regex), unicité du
  username/email, validité de l'ObjectId avant la requête.
- **Hashtags** ([utils/hashtags.js](utils/hashtags.js)) : regex `#(\w+)`, avec dédoublonnage (`Set`) et lowercase.
- **Trends** : aggregation pipeline `$unwind` → `$group` (count) → `$sort` → `$limit 10`.
- **Codes de statut** : `400` validation, `401` auth, `409` conflit (existe déjà), `201` créé, `500` erreur interne.

---

## 8. Configuration & comment lancer

### `.env`

```
MONGODB_URI=mongodb+srv://...     # chaîne de connexion Mongo (Atlas ou local)
PORT=3000                         # optionnel, défaut 3000
```

### Connexion à la base ([models/connection.js](models/connection.js))

La connexion est **mise en cache dans un objet global** (`global.mongooseConnection`). C'est important pour
le déploiement **serverless (Vercel)**, où le module est réutilisé entre les requêtes et où `bin/www` ne s'exécute
pas. C'est pourquoi `app.js` a un middleware qui appelle `connectToDatabase()` avant chaque requête — garantissant
une connexion sans en rouvrir une nouvelle à chaque fois.

### Commandes

```bash
yarn          # installe les dépendances
yarn dev      # nodemon (redémarre à la sauvegarde)
yarn start    # production (node bin/www)
yarn test     # Jest + supertest avec Mongo en mémoire
```

---

## 9. Notes & décisions ouvertes

Points à connaître pour le binôme (ce ne sont pas des bugs urgents, ce sont des choix / dettes conscientes) :

- **Token sans expiration**, stocké comme simple chaîne et envoyé dans le body. Pragmatique pour un hackathon ;
  évolution future = JWT/expiration.
- **`try/catch` interne** dans les handlers de tweet est redondant avec l'`asyncHandler` + le error handler global.
  Ça marche, mais `userController.js` (sans le try/catch interne) est le pattern le plus propre à suivre.
- **[routes/index.js](routes/index.js)** est un résidu d'`express-generator` (utilise `res.render` sans view
  engine configuré). Il n'est pas branché dans `app.js` et peut être supprimé.
- **Le DELETE d'un tweet ne vérifie pas la paternité** : aujourd'hui n'importe quel utilisateur authentifié peut
  supprimer n'importe quel tweet par id. Si on veut « seul l'auteur supprime », comparer `tweet.author` avec
  `req.user._id` dans `deleteTweet`.
```
