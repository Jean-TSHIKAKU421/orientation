const express = require('express');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const app = express();
const PORT = process.env.PORT || 3500;

// ==========================================
// CONFIGURATION CLOUDINARY
// ==========================================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dfosclwrp',
    api_key: process.env.CLOUDINARY_API_KEY || '693124517134246',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'P9oNz6y10vkAYP5DW6yky5QC67M'
});

// ==========================================
// CONFIGURATION MYSQL
// ==========================================
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'guide_orientation',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// CONFIGURATION MULTER (stockage temporaire)
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'video/mp4', 'video/mpeg',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Type de fichier non autorisé.'));
        }
    }
});

// ==========================================
// TEST CONNEXION MYSQL
// ==========================================
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connecté à MySQL');
        connection.release();
    } catch (err) {
        console.error('❌ Erreur connexion MySQL:', err.message);
    }
}
testConnection();

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

        const [existing] = await pool.query('SELECT id FROM users WHERE matricule = ?', [matricule]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Ce matricule existe déjà.' });
        }

        if (email) {
            const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
            if (existingEmail.length > 0) {
                return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé.' });
            }
        }

        await pool.query(
            'INSERT INTO users (nom, matricule, email, password) VALUES (?, ?, ?, ?)',
            [nom, matricule, email || '', password]
        );

        console.log('✅ Utilisateur créé :', matricule);
        res.status(201).json({ success: true, message: 'Inscription réussie.' });
    } catch (err) {
        console.error('Erreur inscription:', err);
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

        const [rows] = await pool.query(
            'SELECT * FROM users WHERE matricule = ? AND password = ?',
            [matricule, password]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });
        }

        const user = rows[0];
        const { password: _, ...safeUser } = user;

        console.log('🔑 Connexion :', matricule);
        res.json({ success: true, user: safeUser });
    } catch (err) {
        console.error('Erreur connexion:', err);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
});

// ==========================================
// API SAUVEGARDE THÈME
// ==========================================
app.post('/api/save-theme', async (req, res) => {
    try {
        const { matricule, theme } = req.body;
        await pool.query('UPDATE users SET theme = ? WHERE matricule = ?', [theme, matricule]);
        console.log('🎨 Thème sauvegardé pour', matricule);
        res.json({ success: true });
    } catch (err) {
        console.error('Erreur thème:', err);
        res.status(500).json({ success: false });
    }
});

// ==========================================
// API UPLOAD PHOTO PROFIL (CLOUDINARY)
// ==========================================
app.post('/api/upload-photo/:matricule', upload.single('photo'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Aucun fichier envoyé.' });
    }

    try {
        // Upload vers Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'orientation/photos',
            width: 300,
            height: 300,
            crop: 'fill',
            gravity: 'face'
        });

        // Supprimer le fichier temporaire
        fs.unlinkSync(req.file.path);

        const photoUrl = result.secure_url;
        const matricule = req.params.matricule;

        // Supprimer l'ancienne photo si elle existe sur Cloudinary
        const [user] = await pool.query('SELECT photo FROM users WHERE matricule = ?', [matricule]);
        if (user[0]?.photo && user[0].photo.includes('cloudinary')) {
            const oldPublicId = user[0].photo.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`orientation/photos/${oldPublicId}`);
        }

        // Sauvegarder dans MySQL
        await pool.query('UPDATE users SET photo = ? WHERE matricule = ?', [photoUrl, matricule]);
        console.log('📷 Photo mise à jour pour', matricule);
        res.json({ success: true, photoUrl });
    } catch (err) {
        console.error('Erreur upload photo:', err);
        // Supprimer le fichier temporaire en cas d'erreur
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: 'Erreur lors de l\'upload.' });
    }
});

// ==========================================
// API UPLOAD DOCUMENT (CLOUDINARY)
// ==========================================
app.post('/api/upload-document', upload.single('document'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Aucun fichier envoyé.' });
    }

    try {
        const { titre, course_id } = req.body;

        // Upload vers Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'orientation/documents',
            resource_type: 'auto',
            public_id: `${Date.now()}-${path.parse(req.file.originalname).name}`
        });

        // Supprimer le fichier temporaire
        fs.unlinkSync(req.file.path);

        const fileUrl = result.secure_url;

        // Sauvegarder dans MySQL
        if (course_id) {
            await pool.query(
                'INSERT INTO documentations (course_id, type, titre, fichier, url) VALUES (?, ?, ?, ?, ?)',
                [course_id, 'pdf', titre || req.file.originalname, fileUrl, fileUrl]
            );
        }

        console.log('📄 Document uploadé :', titre || req.file.originalname);
        res.json({
            success: true,
            url: fileUrl,
            public_id: result.public_id,
            titre: titre || req.file.originalname
        });
    } catch (err) {
        console.error('Erreur upload document:', err);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: 'Erreur lors de l\'upload.' });
    }
});

// ==========================================
// API UPLOAD VIDÉO (CLOUDINARY)
// ==========================================
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Aucun fichier envoyé.' });
    }

    try {
        const { titre, course_id } = req.body;

        // Upload vers Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'orientation/videos',
            resource_type: 'video'
        });

        // Supprimer le fichier temporaire
        fs.unlinkSync(req.file.path);

        const videoUrl = result.secure_url;

        // Sauvegarder dans MySQL
        if (course_id) {
            await pool.query(
                'INSERT INTO documentations (course_id, type, titre, url) VALUES (?, ?, ?, ?)',
                [course_id, 'video', titre || req.file.originalname, videoUrl]
            );
        }

        console.log('🎥 Vidéo uploadée :', titre || req.file.originalname);
        res.json({
            success: true,
            url: videoUrl,
            public_id: result.public_id,
            duree: result.duration
        });
    } catch (err) {
        console.error('Erreur upload vidéo:', err);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: 'Erreur lors de l\'upload.' });
    }
});

// ==========================================
// API SUPPRIMER FICHIER CLOUDINARY
// ==========================================
app.delete('/api/delete-file', async (req, res) => {
    try {
        const { public_id, resource_type } = req.body;

        const result = await cloudinary.uploader.destroy(public_id, {
            resource_type: resource_type || 'image'
        });

        if (result.result === 'ok') {
            res.json({ success: true, message: 'Fichier supprimé.' });
        } else {
            res.status(400).json({ success: false, message: 'Erreur lors de la suppression.' });
        }
    } catch (err) {
        console.error('Erreur suppression:', err);
        res.status(500).json({ success: false });
    }
});

// ==========================================
// API RÉCUPÉRATION PHOTO
// ==========================================
app.get('/api/get-photo/:matricule', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT photo FROM users WHERE matricule = ?', [req.params.matricule]);
        if (rows.length > 0 && rows[0].photo) {
            res.json({ success: true, photoUrl: rows[0].photo });
        } else {
            res.json({ success: true, photoUrl: null });
        }
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ==========================================
// API SAUVEGARDE ÉVALUATION
// ==========================================
app.post('/api/save-evaluation', async (req, res) => {
    try {
        const { matricule, evaluation } = req.body;

        const [userCheck] = await pool.query('SELECT id FROM users WHERE matricule = ?', [matricule]);
        if (userCheck.length === 0) {
            return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
        }

        await pool.query(
            `INSERT INTO evaluations (user_matricule, notes, passions, quiz_points, prerequis, liked_filiere, resultats, tous_les_scores)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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

        const derniereEval = {
            date: new Date().toISOString(),
            ...evaluation
        };

        await pool.query(
            'UPDATE users SET derniere_evaluation = ? WHERE matricule = ?',
            [JSON.stringify(derniereEval), matricule]
        );

        console.log('💾 Évaluation sauvegardée pour', matricule);
        res.json({ success: true });
    } catch (err) {
        console.error('Erreur sauvegarde évaluation:', err);
        res.status(500).json({ success: false });
    }
});

// ==========================================
// API RÉCUPÉRATION HISTORIQUE
// ==========================================
app.get('/api/get-evaluations/:matricule', async (req, res) => {
    try {
        const [evaluations] = await pool.query(
            'SELECT * FROM evaluations WHERE user_matricule = ? ORDER BY date_evaluation DESC',
            [req.params.matricule]
        );

        const [user] = await pool.query(
            'SELECT derniere_evaluation FROM users WHERE matricule = ?',
            [req.params.matricule]
        );

        res.json({
            success: true,
            historique: evaluations,
            derniereEvaluation: user[0]?.derniere_evaluation || null
        });
    } catch (err) {
        console.error('Erreur récupération:', err);
        res.status(500).json({ success: false });
    }
});

// ==========================================
// API DONNÉES (SPÉCIALISATIONS, QUESTIONS, ETC.)
// ==========================================
app.get('/api/specialisations', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM specialisations');
        const data = rows.map(row => ({
            ...row,
            debouchés: typeof row.debouchés === 'string' ? JSON.parse(row.debouchés) : row.debouchés,
            coefficients_notes: typeof row.coefficients_notes === 'string' ? JSON.parse(row.coefficients_notes) : row.coefficients_notes,
            passion_keywords: typeof row.passion_keywords === 'string' ? JSON.parse(row.passion_keywords) : row.passion_keywords,
            details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
        }));
        res.json(data);
    } catch (err) {
        console.error('Erreur spécialisations:', err);
        res.status(500).json([]);
    }
});

app.get('/api/questions', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM questions');
        const data = rows.map(row => ({
            ...row,
            options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options
        }));
        res.json(data);
    } catch (err) {
        console.error('Erreur questions:', err);
        res.status(500).json([]);
    }
});

app.get('/api/prerequis', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM prerequis');
        const data = rows.map(row => ({
            ...row,
            filières: typeof row.filières === 'string' ? JSON.parse(row.filières) : row.filières
        }));
        res.json(data);
    } catch (err) {
        console.error('Erreur prérequis:', err);
        res.status(500).json([]);
    }
});

app.get('/api/temoignages', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM temoignages');
        const data = rows.map(row => ({
            ...row,
            parcours: typeof row.parcours === 'string' ? JSON.parse(row.parcours) : row.parcours,
            carriere: typeof row.carriere === 'string' ? JSON.parse(row.carriere) : row.carriere
        }));
        res.json(data);
    } catch (err) {
        console.error('Erreur témoignages:', err);
        res.status(500).json([]);
    }
});

// ==========================================
// API RESSOURCES PAR FILIÈRE
// ==========================================
app.get('/api/ressources/:filiere', async (req, res) => {
    const filiere = req.params.filiere;

    const ressources = {
        gl: {
            nom: "Génie Logiciel",
            sites: [
                { nom: "MDN Web Docs", url: "https://developer.mozilla.org/fr/", description: "Documentation web complète (HTML, CSS, JS)" },
                { nom: "Grafikart", url: "https://grafikart.fr/", description: "Tutoriels vidéo de développement web" },
                { nom: "OpenClassrooms", url: "https://openclassrooms.com/fr/courses?categories=informatique", description: "Cours en ligne gratuits" },
                { nom: "GitHub", url: "https://github.com/", description: "Plateforme de code source et collaboration" }
            ],
            livres: [
                { nom: "Clean Code", auteur: "Robert C. Martin" },
                { nom: "Design Patterns", auteur: "Gang of Four" }
            ]
        },
        dm: {
            nom: "Design & Multimédia",
            sites: [
                { nom: "MDN Web Docs", url: "https://developer.mozilla.org/fr/", description: "Documentation CSS complète" },
                { nom: "Dribbble", url: "https://dribbble.com/", description: "Inspiration design et portfolios" },
                { nom: "Behance", url: "https://www.behance.net/", description: "Galerie de projets créatifs" },
                { nom: "Figma Learn", url: "https://help.figma.com/", description: "Apprendre Figma, outil de design UI/UX" }
            ],
            livres: [
                { nom: "Don't Make Me Think", auteur: "Steve Krug" },
                { nom: "The Design of Everyday Things", auteur: "Don Norman" }
            ]
        },
        reseau: {
            nom: "Réseau & Télécommunication",
            sites: [
                { nom: "Cisco Networking Academy", url: "https://www.netacad.com/", description: "Formation réseau certifiante" },
                { nom: "MDN Web Docs", url: "https://developer.mozilla.org/fr/docs/Web/HTTP", description: "Documentation protocole HTTP" },
                { nom: "FrameIP", url: "https://www.frameip.com/", description: "Cours et tutoriels réseaux en français" },
                { nom: "Wireshark", url: "https://www.wireshark.org/docs/", description: "Analyseur de paquets réseau" }
            ],
            livres: [
                { nom: "Computer Networking", auteur: "Kurose & Ross" },
                { nom: "TCP/IP Illustrated", auteur: "W. Richard Stevens" }
            ]
        },
        msi: {
            nom: "Management des Systèmes d'Information",
            sites: [
                { nom: "MDN Web Docs", url: "https://developer.mozilla.org/fr/", description: "Documentation technique" },
                { nom: "SQL.sh", url: "https://sql.sh/", description: "Cours et exercices SQL en français" },
                { nom: "Power BI Documentation", url: "https://learn.microsoft.com/fr-fr/power-bi/", description: "Documentation officielle Power BI" },
                { nom: "DB-Engines", url: "https://db-engines.com/", description: "Comparatif des systèmes de bases de données" }
            ],
            livres: [
                { nom: "Data Science from Scratch", auteur: "Joel Grus" },
                { nom: "SQL pour les Nuls", auteur: "Allen G. Taylor" }
            ]
        },
        asr: {
            nom: "Administration Système & Réseau",
            sites: [
                { nom: "MDN Web Docs", url: "https://developer.mozilla.org/fr/", description: "Documentation technique web" },
                { nom: "Linux Foundation", url: "https://www.linuxfoundation.org/", description: "Formations et certifications Linux" },
                { nom: "Docker Docs", url: "https://docs.docker.com/", description: "Documentation officielle Docker" },
                { nom: "AWS Documentation", url: "https://docs.aws.amazon.com/", description: "Documentation cloud Amazon Web Services" }
            ],
            livres: [
                { nom: "The Linux Command Line", auteur: "William Shotts" },
                { nom: "Site Reliability Engineering", auteur: "Google" }
            ]
        }
    };

    if (!ressources[filiere]) {
        return res.status(404).json({ success: false, message: 'Filière non trouvée.' });
    }

    res.json({ success: true, ressources: ressources[filiere] });
});

// ==========================================
// API SAUVEGARDE PROGRESSION
// ==========================================
app.post('/api/save-progression', async (req, res) => {
    try {
        const { matricule, progression } = req.body;

        if (!matricule || !progression) {
            return res.status(400).json({ success: false, message: 'Données manquantes.' });
        }

        await pool.query(
            `UPDATE users SET 
                notes = ?,
                passions = ?,
                quiz_points = ?,
                prerequis = ?,
                liked_filiere = ?
            WHERE matricule = ?`,
            [
                JSON.stringify(progression.notes || {}),
                JSON.stringify(progression.passions || []),
                JSON.stringify(progression.quizPoints || {}),
                JSON.stringify(progression.prerequis || []),
                JSON.stringify(progression.likedFiliere || {}),
                matricule
            ]
        );

        console.log('💾 Progression sauvegardée pour', matricule);
        res.json({ success: true, message: 'Progression sauvegardée.' });
    } catch (err) {
        console.error('Erreur sauvegarde progression:', err);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
});

// ==========================================
// DÉMARRAGE
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 Serveur prêt sur http://localhost:${PORT}`);
    console.log('🗄️  Base de données MySQL connectée');
    console.log('☁️  Cloudinary configuré');
});