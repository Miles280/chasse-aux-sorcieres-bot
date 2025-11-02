DROP DATABASE IF EXISTS `chasse-aux-sorcieres-bot`;
CREATE DATABASE `chasse-aux-sorcieres-bot`;
USE `chasse-aux-sorcieres-bot`;


-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discord_id VARCHAR(50) NOT NULL UNIQUE,
    gems INT DEFAULT 0,
    rubies INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions history table
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL, -- Discord ID of the main user
    type ENUM('add', 'remove', 'give', 'receive', 'buy', 'casino') NOT NULL,
    currency ENUM('gems', 'rubies') NOT NULL,
    amount INT NOT NULL,
    other_user_id VARCHAR(50), -- Discord ID of the other user (if applicable)
    description TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des rôles
CREATE TABLE role (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    camp ENUM('villageois','sorciere','independant') NOT NULL,
    goal TEXT NOT NULL,
    description TEXT NOT NULL,
    minPlayers INT NOT NULL CHECK (minPlayers >= 1)
);


-- Insertion des rôles villageois
INSERT INTO role (name, camp, goal, description, minPlayers) 
VALUES 
    ('Paysan', 'villageois', 'Sauver le village.', 'Un paisible habitant de Nistrium, qui n''a comme armes que sa capacité de déduction et son éloquence.', 6),
    ('Braconnier', 'villageois', 'Sauver le village.', 'Un villageois qui garde son fidèle fusil à portée de main jusqu’à son dernier souffle.', 6),
    ('Diseuse de bonnes aventures', 'villageois', 'Sauver le village.', 'Une vieille femme qui, bien que ses pouvoirs soient parfois capricieux, cherche à guider le village vers la vérité.', 6),
    ('Occultiste', 'villageois', 'Sauver le village.', 'Un adorateur des arts mystiques qui met son savoir au service du village pour le protéger.', 6),
    ('Baba la poule magique', 'villageois', 'Sauver le village.', 'Une poule antique dont nul ne connaît l''origine…', 8),
    ('Bouffon', 'villageois', 'Sauver le village.', 'Le Bouffon est l’élément perturbateur du village, semant la confusion avec son humour douteux…', 8),
    ('Bourreau miséricordieux', 'villageois', 'Sauver le village.', 'Un homme au grand cœur qui tente parfois de sauver les condamnés qu’il doit exécuter.', 8),
    ('Divinateur', 'villageois', 'Sauver le village.', 'Personne n''ose lui adresser la parole tant il est mystérieux.', 8),
    ('Guet', 'villageois', 'Sauver le village.', 'Un homme prudent ne croit que ce qu’il voit.', 8),
    ('Papy le fermier', 'villageois', 'Sauver le village.', 'Le plus vieux villageois de Nistrium… Tout le monde lui fait confiance !', 8),
    ('Vigile', 'villageois', 'Sauver le village.', 'Un tireur hors-pair qui consacre sa vie à la traque des ennemis du village.', 8),
    ('Alchimiste', 'villageois', 'Sauver le village.', 'Un chimiste de renom dans le village, à condition qu''il ait le temps de préparer ses concoctions !', 9),
    ('Influenceur', 'villageois', 'Sauver le village.', 'Un orateur hors pair capable de manipuler les pensées des autres par sa simple parole.', 9),
    ('Kaskouye le nain', 'villageois', 'Sauver le village.', 'Personne ne le supporte ! Il est tellement casse-pied qu''il fait perdre un temps fou à ses victimes.', 9),
    ('Marchand de sable', 'villageois', 'Sauver le village.', 'Nul ne sait comment il fait pour agir jusque dans nos rêves…', 9),
    ('Trappeur', 'villageois', 'Sauver le village.', 'Un chasseur expérimenté qui aide le village à attraper les personnes mal intentionnées.', 9),
    ('Baba junior', 'villageois', 'Sauver le village.', 'L’enfant de Baba la poule magique. Son origine reste tout aussi inconnue…', 10),
    ('Conspirateur', 'villageois', 'Sauver le village.', 'Un homme particulièrement discret, qui organise des réunions dans le dos du village.', 10),
    ('Garde', 'villageois', 'Sauver le village.', 'Un homme courageux et brave qui fera tout pour protéger le village.', 10),
    ('Intruse', 'villageois', 'Sauver le village.', 'Une villageoise fine et discrète, qui adore espionner le voisinage…', 10),
    ('Marchande de fruits', 'villageois', 'Sauver le village.', 'La plus grande, et surtout, la seule vendeuse de fruits de Nistrium.', 10),
    ('Mercenaire', 'villageois', 'Sauver le village.', 'Le Mercenaire est un combattant au service du village, prêt à tout pour défendre son client…', 10),
    ('Nain', 'villageois', 'Sauver le village.', 'Le plus (petit) grand ami de l’Ogre.', 10),
    ('Ogre', 'villageois', 'Sauver le village.', 'Le plus grand ami du Nain.', 10),
    ('Chef rebelle', 'villageois', 'Sauver le village.', 'Un fin politicien qui agit dans l’ombre pour sauver le village.', 11),
    ('Geôlier', 'villageois', 'Sauver le village.', 'Un respectable gardien de prison, toujours prêt à préserver la paix au sein de Nistrium.', 11),
    ('Exécuteur', 'villageois', 'Sauver le village.', 'Est-il réellement en quête de sauver le village, ou cherche-t-il simplement à assouvir sa soif de sang ? Nul ne le sait...', 12),
    ('Miroitier', 'villageois', 'Sauver le village', 'Une ancienne sorcière d’après les rumeurs… Ses miroirs pourraient néanmoins être très utiles au village.', 12),
    ('Prêtresse', 'villageois', 'Sauver le village', 'Une guide spirituelle qui montre le chemin vers la lumière aux défunts en échange de leur puissance.', 12);


-- Insertion des rôles sorcières
INSERT INTO role (name, camp, goal, description, minPlayers) 
VALUES 
    ('Sorcière', 'sorciere', 'Tuer tous le village', 'Un être maléfique qui a pour seul objectif l’anéantissement du village.\nMeurtre et rituel : Chaque nuit, les Sorcières se réunissent et choisissent une cible et une façon de l’éliminer.', 6),
    ('Reine des sorcières', 'sorciere', 'Tuer tous le village', 'La seule et unique Reine des sorcières.\nI am the Queen ! : La Reine des sorcières choisit quelle Sorcière se déplace pour commettre le meurtre/rituel.', 6),
    ('Chatte noire', 'sorciere', 'Tuer tous le village', 'Porteuse de malchance, en un seul regard elle sera capable de vous affaiblir.\nMauvais présage : La Chatte Noire cible un joueur et lui retire une charge de l’un de ses pouvoirs.', 8),
    ('Gardienne des secrets', 'sorciere', 'Tuer tous le village', 'Une vieille femme aux savoirs immenses, mais qui les utilise à mauvais escient.\nChantage : Chaque nuit, elle peut décider de faire chanter un joueur.', 8),
    ('Manipulatrice du destin', 'sorciere', 'Tuer tous le village', 'Une redoutable sorcière capable de changer la destinée par sa simple volonté.\nFil du destin : Elle peut prendre le contrôle d’un joueur chaque nuit et rediriger son action.', 8),
    ('Banshee', 'sorciere', 'Tuer tous le village', 'Une sorcière ? Un esprit démoniaque ? Nul ne connaît sa véritable nature, mais une chose est sûre : elle en veut au village.\nCri de la Banshee : Peut rendre sourd un joueur.', 9),
    ('Mage des âmes', 'sorciere', 'Tuer tous le village', 'Un être vicieux qui aime jouer avec l’âme de ses victimes.\nMélange d’âmes : Peut transformer un joueur en Paysan en devinant son rôle.', 9),
    ('Pleureuse', 'sorciere', 'Tuer tous le village', 'L’incarnation même du désespoir au service des Sorcières.\nEt même le ciel pleura : Peut réduire la durée du débat avant le vote.', 9),
    ('Astrologue', 'sorciere', 'Tuer tous le village', 'Une sorcière capable de manipuler les étoiles pour tirer parti de leurs pouvoirs.\nÉtreinte lunaire : Empêche un joueur de sortir.', 10),
    ('Joueur maléfique', 'sorciere', 'Tuer tous le village', 'Un joueur de cartes hors-pair, qui a décidé de rejoindre le camp des sorcières.\nCarte de confusion : Force un joueur à utiliser son pouvoir contre lui-même.', 11),
    ('Maîtresse des malédictions', 'sorciere', 'Tuer tous le village', 'Une sorcière qui a perfectionné une terrible malédiction.\nMalédiction ultime : Maudit un joueur chaque nuit, si tous les ennemis sont maudits, ils meurent.', 11),
    ('Sage de l’urne', 'sorciere', 'Tuer tous le village', 'Un prophète talentueux capable d’influencer les résultats du vote.\nProphétie : Pénalise les votes blancs.', 11),
    ('Nécromancien', 'sorciere', 'Tuer tous le village', 'Un terrible sorcier capable de contrôler les morts… mais seulement ses alliés.\nNécromancie : Peut utiliser les pouvoirs d’une Sorcière morte.', 12);


-- Insertion des rôles indépendants
INSERT INTO role (name, camp, goal, description, minPlayers)
VALUES
    ('Pendu', 'independant', 'Le Pendu remporte la partie si plus personne n\'est en vie à la fin de la partie.', 'La mort ne veut pas de lui… Alors il va la faire goûter à tout le monde !', 9),
    ('Ombre sans visage', 'independant', 'L’Ombre sans visage gagne si elle est le dernier joueur en vie.', 'La personnification des cauchemars du village de Nistrium.', 9),
    ('Fanatique', 'independant', 'Le Fanatique gagne s’il est le dernier joueur en vie.', 'Il vous l\'a juré, l\'Église du Bon du Bien guidera ce village vers la pureté... (ou sa perte).', 10),
    ('Voleur', 'independant', 'Le Voleur gagne s’il est le dernier joueur en vie.', 'Un homme sournois, pour qui il n’y a qu’un pas entre cambriolage et assassinat.', 11),
    ('Chasseur de primes', 'independant', 'Le Chasseur de primes remporte la partie s\'il est le dernier en vie.', 'Un honnête homme qui tuera quiconque ayant une mise sur sa tête. Une exécution c\'est de l\'or ! Mais est-il si honnête que ça..?', 12),
    ('Duelliste', 'independant', 'Le Duelliste remporte la partie si quatre joueurs meurent au cours d’un duel.', 'Un honorable combattant qui préfère gagner haut la main un duel qu’assassiner lâchement sa cible.', 12),
    ('Inquisiteur', 'independant', 'L’Inquisiteur remporte la partie s\'il est le dernier joueur en vie.', 'Convaincu d\'agir pour le bien, il traque et élimine sans hésitation ceux qu\'il considère comme des hérétiques...', 12),
    ('Lieur d’âme', 'independant', 'Le Lieur d’âme remporte la partie si les liés sont les seuls survivants (même si le Lieur d’âme est mort).', 'Un homme qui trouve son réconfort en soudant les âmes : pourquoi l’en priver ?', 12),
    ('Roi des mouches', 'independant', 'Le Roi des mouches gagne si tous les joueurs en vie à la fin de la partie appartiennent au camp des mouches.', 'Une mouche, c’est chiant. Alors un roi des mouches !', 12);