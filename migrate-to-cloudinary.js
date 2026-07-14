const cloudinary = require('cloudinary').v2;
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION CLOUDINARY
// ==========================================
cloudinary.config({
    cloud_name: 'dfosclwrp',      // ← Remplace
    api_key: '693124517134246',              // ← Remplace
    api_secret: 'P9oNz6y10vkAYP5DW6yky5QC67M'           // ← Remplace
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
// FONCTIONS
// ==========================================

// Uploader un fichier vers Cloudinary
async function uploadFile(filePath, folder) {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: folder,
            resource_type: 'auto'
        });
        console.log(`  ✅ ${path.basename(filePath)} → Cloudinary`);
        return result.secure_url;
    } catch (err) {
        console.error(`  ❌ Erreur ${path.basename(filePath)} :`, err.message);
        return null;
    }
}

// Scanner un dossier et uploader tous les fichiers
async function uploadFolder(folderPath, cloudFolder) {
    if (!fs.existsSync(folderPath)) {
        console.log(`  ⚠️ Dossier introuvable : ${folderPath}`);
        return [];
    }

    const files = fs.readdirSync(folderPath);
    const results = [];

    for (const file of files) {
        const fullPath = path.join(folderPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isFile()) {
            const url = await uploadFile(fullPath, cloudFolder);
            if (url) {
                results.push({
                    fichier: file,
                    chemin_local: fullPath,
                    url_cloudinary: url
                });
            }
        } else if (stat.isDirectory()) {
            const subResults = await uploadFolder(fullPath, `${cloudFolder}/${file}`);
            results.push(...subResults);
        }
    }

    return results;
}

// Mettre à jour les URLs dans MySQL
async function updateMySQLPhotos(mapping) {
    console.log('\n🔄 Mise à jour des photos de profil dans MySQL...');
    let count = 0;

    for (const item of mapping) {
        if (item.chemin_local.includes('profiles')) {
            // Extraire le matricule du nom de fichier
            const filename = item.fichier;
            const matricule = filename.split('-')[0].split('.')[0];

            try {
                await pool.query(
                    'UPDATE users SET photo = ? WHERE matricule = ? AND photo LIKE ?',
                    [item.url_cloudinary, matricule, `%/uploads/profiles/${filename}%`]
                );
                console.log(`  ✅ Photo mise à jour pour ${matricule}`);
                count++;
            } catch (err) {
                console.error(`  ❌ Erreur MySQL pour ${matricule}:`, err.message);
            }
        }
    }
    console.log(`  📊 ${count} photos mises à jour`);
}

async function updateMySQLDocuments(mapping) {
    console.log('\n🔄 Mise à jour des documents dans MySQL...');
    let count = 0;

    for (const item of mapping) {
        if (item.chemin_local.includes('cours') || item.chemin_local.includes('uploads')) {
            try {
                await pool.query(
                    'UPDATE documentations SET file_path = ?, url = ? WHERE file_path LIKE ?',
                    [item.url_cloudinary, item.url_cloudinary, `%${item.fichier}%`]
                );
                console.log(`  ✅ Document mis à jour : ${item.fichier}`);
                count++;
            } catch (err) {
                console.error(`  ❌ Erreur MySQL pour ${item.fichier}:`, err.message);
            }
        }
    }
    console.log(`  📊 ${count} documents mis à jour`);
}

// ==========================================
// MIGRATION PRINCIPALE
// ==========================================
async function migrateAll() {
    console.log('═'.repeat(60));
    console.log('🔄 MIGRATION VERS CLOUDINARY');
    console.log('═'.repeat(60));

    const allResults = [];

    // 1. Photos de profil
    console.log('\n📷 1/3 - Migration des photos de profil...');
    const photosResults = await uploadFolder('public/uploads/profiles', 'orientation/photos');
    allResults.push(...photosResults);

    // 2. Documents des cours
    console.log('\n📄 2/3 - Migration des documents...');
    const coursResults = await uploadFolder('public/cours', 'orientation/cours');
    allResults.push(...coursResults);

    // 3. Autres uploads
    console.log('\n📁 3/3 - Migration des autres fichiers...');
    const uploadsResults = await uploadFolder('public/uploads', 'orientation/uploads');
    allResults.push(...uploadsResults);

    // 4. Mise à jour MySQL
    if (allResults.length > 0) {
        await updateMySQLPhotos(allResults);
        await updateMySQLDocuments(allResults);
    }

    // 5. Sauvegarder le mapping
    console.log('\n💾 Sauvegarde du mapping...');
    fs.writeFileSync(
        'migration-mapping.json',
        JSON.stringify(allResults, null, 2),
        'utf8'
    );

    // 6. Résumé
    console.log('\n' + '═'.repeat(60));
    console.log('✅ MIGRATION TERMINÉE !');
    console.log('═'.repeat(60));
    console.log(`📊 Total fichiers migrés : ${allResults.length}`);
    console.log('📄 Mapping sauvegardé : migration-mapping.json');
    console.log('🗄️  MySQL mis à jour');

    // Fermer la connexion MySQL
    await pool.end();
}

// Lancer la migration
migrateAll().catch(console.error);