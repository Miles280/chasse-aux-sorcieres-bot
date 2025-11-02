# 🔮 Bot Discord – Chasse aux Sorcières

Bienvenue sur le dépôt du **Bot Discord** officiel du jeu de rôle **Chasse aux Sorcières de Nistrium**, un jeu inspiré du Loup-Garou de Thiercelieux, dans un univers médiéval fantastique sombre.

Ce bot gère les monnaies, les joueurs, les transactions, et sera, dans le futur, au cœur de la gestion des parties.

## ✨ Fonctionnalités

- 🎮 Gestion des monnaies du jeu (💎 gemmes, 🔴 rubis)
- 📊 Suivi des joueurs et transactions
- 📘 Intégration future au site officiel
- 🔒 Permissions basées sur les rôles Discord
- ⚙️ Interactions avec boutons et embeds 100% personnalisés
- 🧠 À venir : gestion automatique des parties via le bot

## 🛠️ Technologies utilisées

- [Node.js](https://nodejs.org/)
- [Discord.js v14](https://discord.js.org/)
- [MySQL](https://www.mysql.com/)
- `dotenv` pour la gestion sécurisée des variables d'environnement

## 🚀 Installation et lancement

### 1. Cloner le dépôt

```bash
git clone https://github.com/Miles280/chasse-aux-sorcieres-bot.git
cd chasse-aux-sorcieres-bot
```

### 2. Installer les dépendances

```bash
npm install
```

> ⚠️ Il est nécessaire d'avoir installé [Node.js](https://nodejs.org/).

### 3. Créer le fichier `.env.local`

Crée un fichier `.env.local` à la racine du projet avec le contenu suivant (à adapter à ton environnement) :

```ini
DISCORD_TOKEN=ton_token_discord
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=mot_de_passe
DB_NAME=chasse-aux-sorcieres-discord
```

> ⚠️ Ce fichier est ignoré par Git (grâce au .gitignore) pour des raisons de sécurité.

### 4. Créer la base de données

Utilise le fichier `schema.sql` fourni dans le dossier `../database` pour générer la structure de la base :

```bash
mysql -u root -p < ./database/schema.sql
```
> ⬆️ Si tu utilises un terminal Git Bash
```powershell
Get-Content ./database/schema.sql | mysql -u root -p
```
> ⬆️ Si tu utilises un terminal Windows PowerShell
> 
### 5. Lancer le bot

```bash
node main.js
```

## ✅ À venir...

- Système économique plus poussé (boutique, casino, et bien plus encore...)

- Création et gestion automatique des parties

- Rôles cachés, votes, interactions de jeu

- Connexion avec le site web et affichage de statistiques

## 📞 Me contacter

Si tu as des questions, des suggestions ou simplement que tu comptes utiliser mon code, n'hésite pas à me contacter sur Discord : @miles28.
