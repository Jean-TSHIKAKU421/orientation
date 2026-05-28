const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// CRÉATION DES TABLES AU DÉMARRAGE
// ==========================================
async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                nom VARCHAR(255) NOT NULL,
                matricule VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) DEFAULT '',
                password VARCHAR(255) NOT NULL,
                date_inscription TIMESTAMP DEFAULT NOW(),
                theme VARCHAR(10) DEFAULT 'light',
                progression JSONB DEFAULT '{}',
                notes JSONB DEFAULT '{}',
                passions JSONB DEFAULT '[]',
                quiz_points JSONB DEFAULT '{}',
                prerequis JSONB DEFAULT '[]',
                liked_filiere JSONB DEFAULT '{}',
                suggestion JSONB DEFAULT '[]',
                derniere_evaluation JSONB DEFAULT NULL
            );

            CREATE TABLE IF NOT EXISTS evaluations (
                id SERIAL PRIMARY KEY,
                user_matricule VARCHAR(50) REFERENCES users(matricule),
                date_evaluation TIMESTAMP DEFAULT NOW(),
                notes JSONB DEFAULT '{}',
                passions JSONB DEFAULT '[]',
                quiz_points JSONB DEFAULT '{}',
                prerequis JSONB DEFAULT '[]',
                liked_filiere JSONB DEFAULT '{}',
                resultats JSONB DEFAULT '[]',
                tous_les_scores JSONB DEFAULT '[]'
            );
        `);
        console.log('✅ Tables créées/vérifiées avec succès');
    } catch (err) {
        console.error('❌ Erreur création tables:', err.message);
    }
}

initDatabase();

// ==========================================
// ROUTES PAGES
// ==========================================
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/', (req, res) => res.redirect('/login'));

// ==========================================
// API INSCRIPTION
// ==========================================
app.post('/api/register', async (req, res) => {
    try {
        const { nom, matricule, email, password } = req.body;
        
        if (!nom || !matricule || !password) {
            return res.status(400).json({ success: false, message: 'Champs obligatoires manquants.' });
        }

        // Vérifier si le matricule existe déjà
        const existe = await pool.query('SELECT id FROM users WHERE matricule = $1', [matricule]);
        if (existe.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Ce matricule existe déjà.' });
        }

        await pool.query(
            'INSERT INTO users (nom, matricule, email, password) VALUES ($1, $2, $3, $4)',
            [nom, matricule, email || '', password]
        );

        console.log('✅ Utilisateur créé :', matricule);
        res.status(201).json({ success: true, message: 'Inscription réussie.' });
    } catch (err) {
        console.error('Erreur inscription:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
});

// ==========================================
// API CONNEXION
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        const { matricule, password } = req.body;
        
        if (!matricule || !password) {
            return res.status(400).json({ success: false, message: 'Matricule et mot de passe requis.' });
        }

        const result = await pool.query(
            'SELECT * FROM users WHERE matricule = $1 AND password = $2',
            [matricule, password]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });
        }

        const user = result.rows[0];
        const { password: _, ...safeUser } = user;
        
        console.log('🔑 Connexion réussie :', matricule);
        res.json({ success: true, message: 'Connexion réussie.', user: safeUser });
    } catch (err) {
        console.error('Erreur connexion:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
});

// ==========================================
// API SAUVEGARDE THÈME
// ==========================================
app.post('/api/save-theme', async (req, res) => {
    try {
        const { matricule, theme } = req.body;
        await pool.query('UPDATE users SET theme = $1 WHERE matricule = $2', [theme, matricule]);
        console.log('🎨 Thème sauvegardé pour', matricule);
        res.json({ success: true });
    } catch (err) {
        console.error('Erreur thème:', err.message);
        res.status(500).json({ success: false });
    }
});

// ==========================================
// API SAUVEGARDE ÉVALUATION
// ==========================================
app.post('/api/save-evaluation', async (req, res) => {
    try {
        const { matricule, evaluation } = req.body;
        
        // Vérifier que l'utilisateur existe
        const userCheck = await pool.query('SELECT id FROM users WHERE matricule = $1', [matricule]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
        }

        // Insérer l'évaluation
        await pool.query(
            `INSERT INTO evaluations (user_matricule, notes, passions, quiz_points, prerequis, liked_filiere, resultats, tous_les_scores)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                matricule,
                JSON.stringify(evaluation.notes || {}),
                JSON.stringify(evaluation.passions || []),
                JSON.stringify(evaluation.quizPoints || {}),
                JSON.stringify(evaluation.prerequis || []),
                JSON.stringify(evaluation.likedFiliere || {}),
                JSON.stringify(evaluation.resultats || []),
                JSON.stringify(evaluation.tousLesScores || [])
            ]
        );

        // Mettre à jour la dernière évaluation dans users
        const derniereEval = {
            date: new Date().toISOString(),
            notes: evaluation.notes,
            passions: evaluation.passions,
            quizPoints: evaluation.quizPoints,
            prerequis: evaluation.prerequis,
            likedFiliere: evaluation.likedFiliere,
            resultats: evaluation.resultats,
            tousLesScores: evaluation.tousLesScores
        };

        await pool.query(
            'UPDATE users SET derniere_evaluation = $1 WHERE matricule = $2',
            [JSON.stringify(derniereEval), matricule]
        );

        console.log('💾 Évaluation sauvegardée pour', matricule);
        res.json({ success: true, message: 'Évaluation sauvegardée.' });
    } catch (err) {
        console.error('Erreur sauvegarde évaluation:', err.message);
        res.status(500).json({ success: false });
    }
});

// ==========================================
// API RÉCUPÉRATION HISTORIQUE
// ==========================================
app.get('/api/get-evaluations/:matricule', async (req, res) => {
    try {
        const { matricule } = req.params;

        // Récupérer l'historique
        const evaluations = await pool.query(
            'SELECT * FROM evaluations WHERE user_matricule = $1 ORDER BY date_evaluation DESC',
            [matricule]
        );

        // Récupérer la dernière évaluation
        const user = await pool.query(
            'SELECT derniere_evaluation FROM users WHERE matricule = $1',
            [matricule]
        );

        res.json({
            success: true,
            historique: evaluations.rows,
            derniereEvaluation: user.rows[0]?.derniere_evaluation || null
        });
    } catch (err) {
        console.error('Erreur récupération:', err.message);
        res.status(500).json({ success: false });
    }
});

// ==========================================
// DÉMARRAGE
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 Serveur prêt sur le port ${PORT}`);
    console.log('🗄️ Base de données PostgreSQL connectée');
});