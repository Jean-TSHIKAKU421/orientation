const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dataDir = path.join(__dirname, 'server-data');
const usersPath = path.join(dataDir, 'users.json');

// Créer le dossier s'il n'existe pas
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialiser le fichier users.json s'il n'existe pas
if (!fs.existsSync(usersPath)) {
    fs.writeFileSync(usersPath, '[]', 'utf8');
}

function getUsers() {
    try {
        const raw = fs.readFileSync(usersPath, 'utf8');
        if (!raw.trim()) return [];
        return JSON.parse(raw);
    } catch (err) {
        console.error('Erreur lecture:', err.message);
        return [];
    }
}

function saveUsers(users) {
    try {
        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
    } catch (err) {
        console.error('Erreur écriture:', err.message);
    }
}

// Routes pages
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/', (req, res) => res.redirect('/login'));

// API Inscription
app.post('/api/register', (req, res) => {
    const { nom, matricule, email, password } = req.body;
    if (!nom || !matricule || !password) {
        return res.status(400).json({ success: false, message: 'Champs obligatoires.' });
    }
    const users = getUsers();
    if (users.find(u => u.matricule === matricule)) {
        return res.status(409).json({ success: false, message: 'Ce matricule existe déjà.' });
    }
    const newUser = {
        id: Date.now().toString(),
        nom, matricule,
        email: email || '',
        password,
        dateInscription: new Date().toISOString(),
        theme: 'light',
        progression: {},
        notes: {},
        passions: [],
        quizPoints: {},
        prerequis: [],
        likedFiliere: {},
        suggestion: [],
        historiqueEvaluations: [],
        derniereEvaluation: null
    };
    users.push(newUser);
    saveUsers(users);
    console.log('✅ Utilisateur créé :', matricule);
    res.status(201).json({ success: true, message: 'Inscription réussie.' });
});

// API Connexion
app.post('/api/login', (req, res) => {
    const { matricule, password } = req.body;
    const users = getUsers();
    const user = users.find(u => u.matricule === matricule && u.password === password);
    if (!user) {
        return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });
    }
    const { password: _, ...safeUser } = user;
    console.log('🔑 Connexion :', matricule);
    res.json({ success: true, user: safeUser });
});

// API Thème
app.post('/api/save-theme', (req, res) => {
    const { matricule, theme } = req.body;
    const users = getUsers();
    const user = users.find(u => u.matricule === matricule);
    if (user) {
        user.theme = theme;
        saveUsers(users);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

// API Sauvegarde évaluation
app.post('/api/save-evaluation', (req, res) => {
    const { matricule, evaluation } = req.body;
    const users = getUsers();
    const user = users.find(u => u.matricule === matricule);
    if (!user) return res.status(404).json({ success: false });
    
    if (!user.historiqueEvaluations) user.historiqueEvaluations = [];
    
    const nouvelleEvaluation = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        notes: evaluation.notes || {},
        passions: evaluation.passions || [],
        quizPoints: evaluation.quizPoints || {},
        prerequis: evaluation.prerequis || [],
        likedFiliere: evaluation.likedFiliere || {},
        resultats: evaluation.resultats || [],
        tousLesScores: evaluation.tousLesScores || []
    };
    
    user.historiqueEvaluations.push(nouvelleEvaluation);
    user.derniereEvaluation = nouvelleEvaluation;
    saveUsers(users);
    console.log('💾 Évaluation sauvegardée pour', matricule);
    res.json({ success: true });
});

// API Récupération historique
app.get('/api/get-evaluations/:matricule', (req, res) => {
    const users = getUsers();
    const user = users.find(u => u.matricule === req.params.matricule);
    if (!user) return res.status(404).json({ success: false });
    res.json({
        success: true,
        historique: user.historiqueEvaluations || [],
        derniereEvaluation: user.derniereEvaluation || null
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur prêt sur le port ${PORT}`);
});