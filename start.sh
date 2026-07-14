#!/bin/bash

echo "🚀 Démarrage de la base des données MySQL..."

# Lancer XAMPP (MySQL)
echo "📦 Lancement de MySQL (XAMPP)..."
sudo /opt/lampp/lampp start

clear

# Attendre que MySQL soit prêt
sleep 1

# Mise au point du script de move des vidéos
#chmod +x move_video.py

clear
echo "Lancement dans le navigateur"

# Ouvrir le navigateur
firefox http://localhost/phpmyadmin

# Ouvrir l'application
firefox http://localhost:3000

# Lancer le serveur Node.js
echo "🌐 Lancement du serveur Node.js..."
node server.js