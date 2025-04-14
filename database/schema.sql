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
