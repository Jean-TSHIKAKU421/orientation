function calculerScores(notes, passions, quizPoints, prerequisValides, bonusFiliere) {
    const scores = {};

    // Initialiser les scores à 0 pour chaque filière
    DATA.specialisations.forEach(spe => {
        scores[spe.id] = 0;
    });

    // ==========================================
    // 1. NOTES PONDÉRÉES (poids : 35%)
    // ==========================================
    for (let spe of DATA.specialisations) {
        let sommePonderee = 0;
        let sommeCoefficients = 0;

        for (let matiere in spe.coefficients_notes) {
            if (notes[matiere] !== undefined && notes[matiere] !== null && !isNaN(notes[matiere])) {
                sommePonderee += notes[matiere] * spe.coefficients_notes[matiere];
                sommeCoefficients += spe.coefficients_notes[matiere];
            }
        }

        // Normalisation : on divise par la somme des coefficients des matières renseignées
        if (sommeCoefficients > 0) {
            const moyennePonderee = sommePonderee / sommeCoefficients;
            scores[spe.id] += moyennePonderee * 3.5; // max théorique ~70 points (20 * 3.5)
        }
    }

    // ==========================================
    // 2. PASSIONS – sélection directe de filières (poids : 25%)
    // ==========================================
    
    // 2. PASSIONS – sélection directe de filières (poids : 25%)
    if (passions && passions.length > 0) {
        // Vérifier si l'utilisateur a choisi "Aucune idée"
        if (passions.includes('aucune_idee')) {
            // Ne donner aucun point de passion → le score dépendra des autres critères
            // On rééquilibre en donnant un petit bonus uniforme
            for (let speId in scores) {
                scores[speId] += 5; // Petit bonus neutre pour ne pas pénaliser
            }
        } else {
            // Chaque filière sélectionnée reçoit 12.5 points
            passions.forEach(speId => {
                if (scores[speId] !== undefined) {
                    scores[speId] += 12.5;
                }
            });
        }
    } else {
        // Aucune sélection du tout → léger bonus uniforme
        for (let speId in scores) {
            scores[speId] += 3;
        }
    }

    // ==========================================
    // 3. QUIZ – culture générale informatique (poids : 20%)
    // ==========================================
    if (quizPoints && Object.keys(quizPoints).length > 0) {
        // Trouver le score maximum du quiz pour normalisation
        const allQuizScores = Object.values(quizPoints);
        const maxQuiz = Math.max(...allQuizScores, 1); // éviter division par 0

        for (let speId in quizPoints) {
            if (scores[speId] !== undefined) {
                // Normaliser par rapport au score max et multiplier par le poids
                scores[speId] += (quizPoints[speId] / maxQuiz) * 20;
            }
        }
    }

    // ==========================================
    // 4. PRÉREQUIS – auto-évaluation (poids : 10%)
    // ==========================================
    if (prerequisValides && prerequisValides.length > 0 && DATA.prerequis) {
        // Pour chaque filière, compter combien de prérequis cochés lui appartiennent
        for (let spe of DATA.specialisations) {
            let prerequisFiliere = 0;

            prerequisValides.forEach(preId => {
                const prereq = DATA.prerequis.find(p => p.id === preId);
                if (prereq && prereq.filières && prereq.filières.includes(spe.id)) {
                    prerequisFiliere++;
                }
            });

            // Proportion des prérequis de cette filière qui sont maîtrisés
            if (prerequisFiliere > 0) {
                scores[spe.id] += (prerequisFiliere / prerequisValides.length) * 10;
            }
        }
    }

    // ==========================================
    // 5. BONUS MANUEL – coup de cœur sur les filières (poids : 10%)
    // ==========================================
    if (bonusFiliere && Object.keys(bonusFiliere).length > 0) {
        const nbLiked = Object.keys(bonusFiliere).length;

        for (let speId in bonusFiliere) {
            if (scores[speId] !== undefined) {
                // Chaque like vaut 10 points répartis sur le nombre de likes
                scores[speId] += (bonusFiliere[speId] / nbLiked) * 10;
            }
        }
    }

    // ==========================================
    // TRI ET FORMATAGE DES RÉSULTATS
    // ==========================================
    // Convertir l'objet scores en tableau et trier par score décroissant
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

    // Retourner les 2 meilleures filières avec leurs détails
    return sorted.slice(0, 2).map(([id, score]) => {
        const spe = DATA.specialisations.find(s => s.id === id);
        return {
            id: spe.id,
            nom: spe.nom,
            description: spe.description,
            debouchés: spe.debouchés,
            score: Math.round(score * 10) / 10  // Arrondir à 1 décimale
        };
    });
}

// ==========================================
// FONCTION UTILITAIRE : DÉTAIL DU SCORE
// ==========================================
// Retourne un détail complet du score pour une filière donnée
// Utile pour afficher une justification détaillée dans les résultats
function getDetailScore(speId, notes, passions, quizPoints, prerequisValides, bonusFiliere) {
    const spe = DATA.specialisations.find(s => s.id === speId);
    if (!spe) return null;

    const detail = {
        nom: spe.nom,
        notes: 0,
        passions: 0,
        quiz: 0,
        prerequis: 0,
        bonus: 0,
        total: 0
    };

    // Notes
    let sommePonderee = 0;
    let sommeCoefficients = 0;
    for (let matiere in spe.coefficients_notes) {
        if (notes[matiere] !== undefined && notes[matiere] !== null && !isNaN(notes[matiere])) {
            sommePonderee += notes[matiere] * spe.coefficients_notes[matiere];
            sommeCoefficients += spe.coefficients_notes[matiere];
        }
    }
    if (sommeCoefficients > 0) {
        detail.notes = Math.round((sommePonderee / sommeCoefficients) * 3.5 * 10) / 10;
    }

    // Passions
    if (passions && passions.includes(speId)) {
        detail.passions = 12.5;
    }

    // Quiz
    if (quizPoints && quizPoints[speId] !== undefined) {
        const maxQuiz = Math.max(...Object.values(quizPoints), 1);
        detail.quiz = Math.round((quizPoints[speId] / maxQuiz) * 20 * 10) / 10;
    }

    // Prérequis
    if (prerequisValides && prerequisValides.length > 0 && DATA.prerequis) {
        let prerequisFiliere = 0;
        prerequisValides.forEach(preId => {
            const prereq = DATA.prerequis.find(p => p.id === preId);
            if (prereq && prereq.filières && prereq.filières.includes(speId)) {
                prerequisFiliere++;
            }
        });
        if (prerequisFiliere > 0) {
            detail.prerequis = Math.round((prerequisFiliere / prerequisValides.length) * 10 * 10) / 10;
        }
    }

    // Bonus
    if (bonusFiliere && bonusFiliere[speId]) {
        const nbLiked = Object.keys(bonusFiliere).length;
        detail.bonus = Math.round((bonusFiliere[speId] / nbLiked) * 10 * 10) / 10;
    }

    // Total
    detail.total = Math.round((detail.notes + detail.passions + detail.quiz + detail.prerequis + detail.bonus) * 10) / 10;

    return detail;
}

function getAllScores(notes, passions, quizPoints, prerequisValides, bonusFiliere) {
    const scores = {};

    // Initialiser les scores à 0 pour chaque filière
    DATA.specialisations.forEach(spe => {
        scores[spe.id] = 0;
    });

    // 1. NOTES PONDÉRÉES (poids : 35%)
    for (let spe of DATA.specialisations) {
        let sommePonderee = 0;
        let sommeCoefficients = 0;

        for (let matiere in spe.coefficients_notes) {
            if (notes[matiere] !== undefined && notes[matiere] !== null && !isNaN(notes[matiere])) {
                sommePonderee += notes[matiere] * spe.coefficients_notes[matiere];
                sommeCoefficients += spe.coefficients_notes[matiere];
            }
        }

        if (sommeCoefficients > 0) {
            const moyennePonderee = sommePonderee / sommeCoefficients;
            scores[spe.id] += moyennePonderee * 3.5;
        }
    }

    // 2. PASSIONS (poids : 25%)
    if (passions && passions.length > 0) {
        if (passions.includes('aucune_idee')) {
            for (let speId in scores) {
                scores[speId] += 5;
            }
        } else {
            passions.forEach(speId => {
                if (scores[speId] !== undefined) {
                    scores[speId] += 12.5;
                }
            });
        }
    } else {
        for (let speId in scores) {
            scores[speId] += 3;
        }
    }

    // 3. QUIZ (poids : 20%)
    if (quizPoints && Object.keys(quizPoints).length > 0) {
        const allQuizScores = Object.values(quizPoints);
        const maxQuiz = Math.max(...allQuizScores, 1);

        for (let speId in quizPoints) {
            if (scores[speId] !== undefined) {
                scores[speId] += (quizPoints[speId] / maxQuiz) * 20;
            }
        }
    }

    // 4. PRÉREQUIS (poids : 10%)
    if (prerequisValides && prerequisValides.length > 0 && DATA.prerequis) {
        for (let spe of DATA.specialisations) {
            let prerequisFiliere = 0;
            prerequisValides.forEach(preId => {
                const prereq = DATA.prerequis.find(p => p.id === preId);
                if (prereq && prereq.filières && prereq.filières.includes(spe.id)) {
                    prerequisFiliere++;
                }
            });
            if (prerequisFiliere > 0) {
                scores[spe.id] += (prerequisFiliere / prerequisValides.length) * 10;
            }
        }
    }

    // 5. BONUS MANUEL (poids : 10%)
    if (bonusFiliere && Object.keys(bonusFiliere).length > 0) {
        const nbLiked = Object.keys(bonusFiliere).length;
        for (let speId in bonusFiliere) {
            if (scores[speId] !== undefined) {
                scores[speId] += (bonusFiliere[speId] / nbLiked) * 10;
            }
        }
    }

    // Convertir en tableau trié par score décroissant
    const sorted = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .map(([id, score]) => {
            const spe = DATA.specialisations.find(s => s.id === id);
            return {
                id: spe.id,
                nom: spe.nom,
                score: Math.round(score * 10) / 10
            };
        });

    return sorted;
}