## 🏰 Chasse aux Sorcières — Bot Discord

Bot Discord officiel du jeu **Chasse aux Sorcières**, chargé de gérer les parties, les interactions des joueurs et la logique de jeu directement sur Discord.

---

### 🚀 Technologies

* **Langage :** Node.js / TypeScript
* **Librairie :** Discord.js
* **Framework :** Sapphire

---

### ⚙️ Configuration

Le bot nécessite les variables d’environnement suivantes :

* `BOT_TOKEN` : token du bot Discord
* `API_URL` : URL de l’API Symfony

Ces variables sont injectées via des fichiers `.env`.

---

### 📦 Docker

* Le bot est exécuté dans son **conteneur Docker dédié**
* Il communique avec l’API via le réseau interne Docker :

  ```
  chasse_network
  ```
* Aucun port n’est exposé publiquement
