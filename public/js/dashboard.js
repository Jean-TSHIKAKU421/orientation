// ==========================================
// VÉRIFICATION DE LA CONNEXION
// ==========================================
const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = '/login';
}

// ==========================================
// VÉRIFICATION D'UNE ÉVALUATION PRÉCÉDENTE
// ==========================================
let evaluationPrecedente = null;
let historiqueEvaluations = [];

async function checkPreviousEvaluation() {
    try {
        const response = await fetch(`/api/get-evaluations/${currentUser.matricule}`);
        const data = await response.json();
        
        if (data.success && data.historique && data.historique.length > 0) {
            historiqueEvaluations = data.historique;
            evaluationPrecedente = data.derniereEvaluation;
            console.log('📂 Évaluations précédentes trouvées :', historiqueEvaluations.length);
            return true;
        }
        return false;
    } catch (err) {
        console.error('Erreur récupération historique:', err);
        return false;
    }
}

// ==========================================
// APPLICATION DU THÈME UTILISATEUR
// ==========================================
if (currentUser.theme) {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const userTheme = currentUser.theme;

    if (userTheme === 'dark' && currentTheme !== 'dark') {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else if (userTheme === 'light' && currentTheme === 'dark') {
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    }

    fetch('/api/save-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricule: currentUser.matricule, theme: currentUser.theme })
    }).catch(err => console.error('Synchro thème échouée', err));
}

// ==========================================
// ÉLÉMENTS DU DOM
// ==========================================
const content = document.getElementById('dashboard-content');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const progressFill = document.querySelector('.progress-fill');
const userDisplay = document.getElementById('user-display');
const logoutBtn = document.getElementById('logout-btn');

userDisplay.innerHTML = `<i class="fas fa-user-circle"></i> ${currentUser.nom}`;

// ==========================================
// ÉTAT DE L'ORIENTATION
// ==========================================
const TOTAL_STEPS = 8;
let currentStep = 1;

let completedSteps = new Set();
const savedCompleted = JSON.parse(sessionStorage.getItem('completedSteps'));
if (savedCompleted) {
    completedSteps = new Set(savedCompleted);
}

const state = {
    notes: {},
    passions: [],
    quizAnswers: {},
    quizPoints: { gl: 0, dm: 0, reseau: 0, msi: 0, asr: 0 },
    prerequis: [],
    likedFiliere: {}
};

const saved = JSON.parse(sessionStorage.getItem('orientationProgress'));
if (saved) {
    Object.assign(state, saved);
    currentStep = saved.currentStep || 1;
}

// ==========================================
// VARIABLES DU QUIZ
// ==========================================
let quizQuestions = [];
let currentQuizIndex = 0;
let quizTermine = false;

// ==========================================
// VALIDATION DES ÉTAPES
// ==========================================
function isStepValid(step) {
    switch (step) {
        case 1: return true;
        case 2:
            const allNotes = Object.values(state.notes);
            if (allNotes.length < 19) return false;
            return allNotes.every(v => v !== undefined && v !== null && !isNaN(v) && v >= 0);
        case 3: return true;
        case 4: return true;
        case 5:
            // Quiz : vérifier que les 10 questions ont été répondues
            if (quizQuestions.length === 0) return false;
            const nbReponses = quizQuestions.filter(q => 
                state.quizAnswers[q.id] !== undefined && 
                state.quizAnswers[q.id] !== null && 
                state.quizAnswers[q.id] !== -1
            ).length;
            console.log('🔍 Validation quiz :', nbReponses, '/', quizQuestions.length, 'réponses');
            console.log('quizTermine:', quizTermine);
            return nbReponses >= quizQuestions.length;
        case 6: return true;
        case 7: return true;
        case 8: return true;
        default: return true;
    }
}

function getValidationMessage(step) {
    switch (step) {
        case 2:
            const nbNotes = Object.values(state.notes).filter(v => v !== undefined && v !== null && !isNaN(v) && v >= 0).length;
            const reste = 19 - nbNotes;
            return `Veuillez remplir toutes les notes avant de continuer. Encore ${reste} note(s) manquante(s).`;
        case 5:
            return 'Veuillez répondre à toutes les questions du quiz avant de continuer.';
        default:
            return 'Veuillez compléter cette étape avant de continuer.';
    }
}

function showValidationError(message) {
    const existingToast = document.querySelector('.validation-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'validation-toast';
    toast.innerHTML = `
        <span class="toast-icon">⚠️</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function showMaxNoteWarning() {
    const existingToast = document.querySelector('.max-note-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'validation-toast max-note-toast';
    toast.innerHTML = `
        <span class="toast-icon">⚠️</span>
        <span class="toast-message">La note maximale autorisée est 20. La valeur a été ajustée automatiquement.</span>
        <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showPreviousEvaluationPrompt() {
    const dateDerniereEval = new Date(evaluationPrecedente.date);
    const dateFormatee = dateDerniereEval.toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    content.innerHTML = `
        <div class="previous-eval-container">
            <h2>📂 Évaluation précédente détectée</h2>
            <p>Vous avez déjà effectué une évaluation le <strong>${dateFormatee}</strong>.</p>
            
            <div class="previous-results">
                <h3>Résultats précédents :</h3>
                ${evaluationPrecedente.resultats.map((r, i) => `
                    <p>${i === 0 ? '🥇' : '🥈'} <strong>${r.nom}</strong> - Score : ${r.score} pts</p>
                `).join('')}
            </div>

            <p>Que souhaitez-vous faire ?</p>
            
            <div class="eval-choices">
                <button id="btn-reuse-notes" class="btn-primary btn-choice">
                    📝 Réutiliser mes anciennes notes<br>
                    <small>Vos notes précédentes seront rechargées, vous pourrez les modifier</small>
                </button>
                
                <button id="btn-new-eval" class="btn-secondary btn-choice">
                    🔄 Nouvelle évaluation complète<br>
                    <small>Tout recommencer depuis le début</small>
                </button>
            </div>
        </div>
    `;

    document.getElementById('btn-reuse-notes').addEventListener('click', () => {
        // Récupérer les anciennes notes
        state.notes = { ...evaluationPrecedente.notes };
        state.passions = [...(evaluationPrecedente.passions || [])];
        state.prerequis = [...(evaluationPrecedente.prerequis || [])];
        state.likedFiliere = { ...(evaluationPrecedente.likedFiliere || {}) };
        
        // Réinitialiser le quiz (sera refait)
        state.quizAnswers = {};
        state.quizPoints = { gl: 0, dm: 0, reseau: 0, msi: 0, asr: 0 };
        
        // Aller directement à l'étape des passions
        currentStep = 3;
        completedSteps.add(1);
        completedSteps.add(2);
        
        renderStep();
    });

    document.getElementById('btn-new-eval').addEventListener('click', () => {
        // Tout recommencer
        evaluationPrecedente = null;
        renderStep();
    });
}

function renderComparaison(nouveauxScores, evaluationPrecedente) {
    if (!evaluationPrecedente.tousLesScores) return '';

    const precedentScores = evaluationPrecedente.tousLesScores;
    
    // Trouver les filières qui ont le plus progressé
    const comparaisons = nouveauxScores.map(nouveau => {
        const precedent = precedentScores.find(p => p.id === nouveau.id);
        const difference = precedent ? Math.round((nouveau.score - precedent.score) * 10) / 10 : 0;
        return { ...nouveau, precedent: precedent?.score || 0, difference };
    });

    // Trier par différence (meilleure progression en premier)
    const meilleuresProgressions = [...comparaisons]
        .filter(c => c.difference > 0)
        .sort((a, b) => b.difference - a.difference);

    let html = '<div class="comparaison-container">';
    
    if (meilleuresProgressions.length > 0) {
        html += '<div class="comparaison-card progression">';
        html += '<h4>📈 Progression détectée</h4>';
        html += '<p>Vos nouvelles notes montrent une amélioration dans les filières suivantes :</p>';
        html += '<ul>';
        meilleuresProgressions.slice(0, 3).forEach(c => {
            html += `<li><strong>${c.nom}</strong> : +${c.difference} pts (passé de ${c.precedent} à ${c.score} pts)</li>`;
        });
        html += '</ul>';
        html += '</div>';
    }

    // Vérifier si la recommandation a changé
    const ancienTop1 = evaluationPrecedente.resultats?.[0];
    const nouveauTop1 = nouveauxScores[0];
    
    if (ancienTop1 && nouveauTop1 && ancienTop1.id !== nouveauTop1.id) {
        html += '<div class="comparaison-card changement">';
        html += '<h4>🔄 Changement de recommandation</h4>';
        html += `<p>Votre filière recommandée a changé :</p>`;
        html += `<p><strong>Avant :</strong> ${ancienTop1.nom} (${ancienTop1.score} pts)</p>`;
        html += `<p><strong>Maintenant :</strong> ${nouveauTop1.nom} (${nouveauTop1.score} pts)</p>`;
        html += '</div>';
    } else if (ancienTop1 && nouveauTop1) {
        html += '<div class="comparaison-card stabilite">';
        html += '<h4>✅ Confirmation</h4>';
        html += `<p>Votre filière recommandée reste <strong>${nouveauTop1.nom}</strong>.</p>`;
        if (nouveauTop1.score > ancienTop1.score) {
            html += `<p>Votre score a augmenté de <strong>+${Math.round((nouveauTop1.score - ancienTop1.score) * 10) / 10} pts</strong> !</p>`;
        }
        html += '</div>';
    }

    html += '</div>';
    return html;
}

// ==========================================
// MISE À JOUR DE L'INTERFACE
// ==========================================
function updateUI() {
    const percent = Math.round((currentStep / TOTAL_STEPS) * 100);
    if (progressFill) progressFill.style.width = percent + '%';

    const steps = document.querySelectorAll('.step');
    steps.forEach(step => {
        const s = parseInt(step.dataset.step);
        step.classList.remove('active', 'completed');
        if (completedSteps.has(s)) step.classList.add('completed');
        if (s === currentStep) step.classList.add('active');
    });

    prevBtn.style.display = currentStep === 1 ? 'none' : 'inline-block';

    if (currentStep === TOTAL_STEPS) {
        nextBtn.textContent = 'Voir les résultats';
        nextBtn.className = 'btn-primary';
    } else if (!isStepValid(currentStep)) {
        nextBtn.textContent = '🔒 Complétez cette étape';
        nextBtn.className = 'btn-primary btn-disabled';
    } else {
        nextBtn.textContent = 'Suivant →';
        nextBtn.className = 'btn-primary';
    }

    sessionStorage.setItem('orientationProgress', JSON.stringify({ ...state, currentStep }));
    sessionStorage.setItem('completedSteps', JSON.stringify([...completedSteps]));
}

// ==========================================
// RENDU DE L'ÉTAPE COURANTE AVEC TRANSITION
// ==========================================
function renderStep() {
    content.classList.add('fade-out');
    setTimeout(() => {
        content.innerHTML = '';
        switch (currentStep) {
            case 1: renderWelcome(); break;
            case 2: renderNotes(); break;
            case 3: renderPassions(); break;
            case 4: renderTemoignages(); break;
            case 5: renderQuiz(); break;
            case 6: renderPrerequis(); break;
            case 7: renderFilières(); break;
            case 8: renderResultats(); break;
        }
        content.classList.remove('fade-out');
        updateUI();
    }, 250);
}

// ==========================================
// ÉTAPE 1 : ACCUEIL
// ==========================================
function renderWelcome() {
    const alreadyCompleted = completedSteps.has(1);
    content.innerHTML = `
        <h2>Bienvenue ${currentUser.nom} !</h2>
        ${alreadyCompleted ? '<p style="color: #28a745; font-weight:500;">✅ Cette étape a déjà été validée.</p>' : ''}
        <p>Ce tableau de bord va vous guider en 7 étapes pour déterminer les deux filières informatiques qui vous correspondent le mieux.</p>
        <p>Préparez vos notes de L2 et répondez honnêtement aux questions.</p>
        <p><strong>Cliquez sur « Suivant » pour commencer.</strong></p>
    `;
}

// ==========================================
// ÉTAPE 2 : NOTES DE L2
// ==========================================
function renderNotes() {
    const alreadyCompleted = completedSteps.has(2);
    const cours = [
        { key: 'analyse_math', label: 'Analyse Mathématique' },
        { key: 'comptabilite', label: 'Comptabilité générale' },
        { key: 'statistique', label: 'Statistique inductive' },
        { key: 'reseaux', label: 'Réseaux informatiques' },
        { key: 'archi_ordi', label: 'Architecture des ordinateurs' },
        { key: 'vba', label: 'Traitement des données avec VBA' },
        { key: 'base_donnees', label: 'Base des données' },
        { key: 'prog_c', label: 'Programmation impérative (langage C)' },
        { key: 'algo_python', label: 'Algorithmique II (avec Python)' },
        { key: 'crea_pub', label: 'Technique de création publicitaire' },
        { key: 'dessin_ordi', label: 'Dessin assisté par ordinateur' },
        { key: 'electronique', label: 'Électronique générale' },
        { key: 'theorie_info', label: 'Théorie de l\'information' },
        { key: 'comm_visuelle', label: 'Communication visuelle' },
        { key: 'prog_web', label: 'Programmation web' },
        { key: 'hygiene_sante', label: 'Hygiène & santé' },
        { key: 'comm_expression', label: 'Communication & expression' },
        { key: 'anglais', label: 'Anglais technique' },
        { key: 'recherche_sci', label: 'Initiation à la recherche scientifique' }
    ];

    let html = '<h2>Vos notes de L2</h2>';
    if (alreadyCompleted) {
        html += '<p style="color: #28a745; font-weight:500;">✅ Cette étape a déjà été validée. Vous pouvez modifier vos notes si nécessaire.</p>';
    }
    html += '<p>Entrez vos moyennes (0-20) pour chaque cours :</p>';
    html += '<p style="font-size:0.9rem; opacity:0.7;">Vous devez remplir toutes les notes, même 0 si nécessaire.</p>';
    html += '<div class="notes-grid">';

    cours.forEach(c => {
        const val = state.notes[c.key] !== undefined ? state.notes[c.key] : '';
        html += `
            <div class="form-group">
                <label>${c.label}</label>
                <input type="number" min="0" max="20" step="0.1" data-matiere="${c.key}" value="${val}" placeholder="0-20">
            </div>`;
    });

    html += '</div>';

    const nbNotesSaisies = Object.values(state.notes).filter(v => v !== undefined && v !== null && !isNaN(v) && v >= 0).length;
    const toutesRemplies = nbNotesSaisies === 19;
    const reste = 19 - nbNotesSaisies;

    html += `<p style="margin-top:1rem; font-size:0.9rem; opacity:0.8;" id="notes-counter">
        📝 <strong>${nbNotesSaisies}</strong> note(s) saisie(s) sur 19 
        ${!toutesRemplies 
            ? `- <span style="color:#e67e22;">Encore <strong>${reste}</strong> note(s) à remplir</span>` 
            : '- <span style="color:#28a745;">✅ Toutes les notes sont remplies !</span>'}
    </p>`;
    html += `<div id="missing-notes-list" style="display:none;"></div>`;

    content.innerHTML = html;

    function updateNotesCounter() {
        const counter = document.getElementById('notes-counter');
        const missingList = document.getElementById('missing-notes-list');

        if (counter) {
            const nb = Object.values(state.notes).filter(v => v !== undefined && v !== null && !isNaN(v) && v >= 0).length;
            const toutesRempliesNow = nb === 19;
            const resteNow = 19 - nb;

            counter.innerHTML = `📝 <strong>${nb}</strong> note(s) saisie(s) sur 19 
                ${!toutesRempliesNow 
                    ? `- <span style="color:#e67e22;">Encore <strong>${resteNow}</strong> note(s) à remplir</span>` 
                    : '- <span style="color:#28a745;">✅ Toutes les notes sont remplies !</span>'}`;

            if (missingList) {
                if (resteNow > 0 && resteNow <= 5) {
                    const coursManquants = cours.filter(c => 
                        state.notes[c.key] === undefined || state.notes[c.key] === null || isNaN(state.notes[c.key])
                    );

                    missingList.innerHTML = `
                        <div class="missing-notes-container">
                            <p class="missing-notes-title">📋 Cours restants à remplir :</p>
                            <ul class="missing-notes-items">
                                ${coursManquants.map(c => `
                                    <li class="missing-note-item">
                                        <span class="missing-note-bullet">•</span>
                                        <span class="missing-note-label">${c.label}</span>
                                        <button class="missing-note-btn" data-matiere="${c.key}" title="Aller à ce champ">📝 Remplir</button>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    `;
                    missingList.style.display = 'block';

                    document.querySelectorAll('.missing-note-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const matiere = this.dataset.matiere;
                            const input = document.querySelector(`input[data-matiere="${matiere}"]`);
                            if (input) {
                                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                setTimeout(() => {
                                    input.focus();
                                    input.style.boxShadow = '0 0 0 4px var(--primary)';
                                    input.style.transition = 'box-shadow 0.3s ease';
                                    setTimeout(() => { input.style.boxShadow = ''; }, 1500);
                                }, 500);
                            }
                        });
                    });
                } else {
                    missingList.style.display = 'none';
                    missingList.innerHTML = '';
                }
            }
        }
        updateUI();
    }

    document.querySelectorAll('input[data-matiere]').forEach(input => {
        input.addEventListener('input', (e) => {
            const matiere = e.target.dataset.matiere;
            const valeur = parseFloat(e.target.value);
            const champ = e.target;

            if (!isNaN(valeur) && (valeur > 20 || valeur < 0)) {
                champ.classList.add('input-error');
                let errorMsg = champ.parentElement.querySelector('.error-message');
                if (!errorMsg) {
                    errorMsg = document.createElement('span');
                    errorMsg.className = 'error-message';
                    champ.parentElement.appendChild(errorMsg);
                }
                errorMsg.textContent = '⚠️ La note doit être entre 0 et 20';
                return;
            } else {
                champ.classList.remove('input-error');
                const errorMsg = champ.parentElement.querySelector('.error-message');
                if (errorMsg) errorMsg.remove();
            }

            if (e.target.value === '' || isNaN(valeur)) {
                state.notes[matiere] = undefined;
            } else {
                state.notes[matiere] = valeur;
            }
            updateNotesCounter();
        });

        input.addEventListener('change', (e) => {
            const matiere = e.target.dataset.matiere;
            let valeur = parseFloat(e.target.value);
            const champ = e.target;

            if (!isNaN(valeur) && (valeur > 20 || valeur < 0)) {
                champ.value = Math.max(0, Math.min(20, valeur));
                valeur = parseFloat(champ.value);
                state.notes[matiere] = valeur;
                showMaxNoteWarning();
            } else if (e.target.value === '' || isNaN(valeur)) {
                state.notes[matiere] = undefined;
            } else {
                state.notes[matiere] = valeur;
            }

            champ.classList.remove('input-error');
            const errorMsg = champ.parentElement.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
            updateNotesCounter();
        });
    });
}

// ==========================================
// ÉTAPE 3 : PASSIONS
// ==========================================
function renderPassions() {
    if (!DATA || !DATA.specialisations || DATA.specialisations.length === 0) {
        content.innerHTML = '<p style="color:red;">❌ Les données des filières ne sont pas encore chargées.</p>';
        return;
    }

    const alreadyCompleted = completedSteps.has(3);
    const hasNoIdea = state.passions.includes('aucune_idee');

    let html = '<h2>Quelles filières vous attirent ?</h2>';
    if (alreadyCompleted) {
        html += '<p style="color: #28a745; font-weight:500;">✅ Cette étape a déjà été validée. Vous pouvez modifier votre choix.</p>';
    }
    html += '<p>Sélectionnez une ou deux filières qui vous intéressent le plus, ou dites-nous que vous n\'avez pas encore d\'idée :</p>';
    html += '<div class="passions-grid">';

    const noIdeaSelected = state.passions.includes('aucune_idee') ? 'selected' : '';
    html += `
        <div class="passion-card no-idea-card ${noIdeaSelected}" data-spe-id="aucune_idee">
            <div class="passion-card-header">
                <span class="passion-check">${noIdeaSelected ? '✅' : '🤔'}</span>
                <h3>Je n'ai pas encore d'idée</h3>
            </div>
            <p>Laissez la plateforme vous guider en fonction de vos notes, du quiz et de vos compétences.</p>
        </div>`;

    DATA.specialisations.forEach(spe => {
        const isSelected = state.passions.includes(spe.id) ? 'selected' : '';
        const disabledClass = hasNoIdea ? 'disabled' : '';
        html += `
            <div class="passion-card ${isSelected} ${disabledClass}" data-spe-id="${spe.id}">
                <div class="passion-card-header">
                    <span class="passion-check">${isSelected ? '✅' : '○'}</span>
                    <h3>${spe.nom}</h3>
                </div>
                <p>${spe.description.substring(0, 100)}...</p>
            </div>`;
    });

    html += '</div>';

    if (hasNoIdea) {
        html += '<p style="margin-top:1rem; color: var(--primary); font-style:italic;">💡 Vous avez choisi de vous laisser guider. La plateforme se basera sur vos notes, le quiz et vos prérequis pour vous orienter au mieux.</p>';
    } else if (state.passions.length > 0) {
        html += '<p style="margin-top:1rem; color: var(--primary); font-style:italic;">💡 Vos passions nous aident à comprendre vos préférences, mais nous analyserons aussi vos notes, le quiz et vos compétences pour vous proposer le meilleur choix.</p>';
    }

    content.innerHTML = html;

    document.querySelectorAll('.passion-card').forEach(card => {
        card.addEventListener('click', function () {
            if (this.classList.contains('disabled')) return;
            const speId = this.dataset.speId;

            if (speId === 'aucune_idee') {
                if (state.passions.includes('aucune_idee')) {
                    state.passions = [];
                } else {
                    state.passions = ['aucune_idee'];
                }
                renderPassions();
                return;
            }

            if (state.passions.includes(speId)) {
                state.passions = state.passions.filter(id => id !== speId);
            } else {
                state.passions = state.passions.filter(id => id !== 'aucune_idee');
                if (state.passions.length >= 2) state.passions.shift();
                state.passions.push(speId);
            }
            renderPassions();
        });
    });
}

// ==========================================
// ÉTAPE 4 : TÉMOIGNAGES
// ==========================================
function renderTemoignages() {
    if (!DATA.temoignages || DATA.temoignages.length === 0) {
        content.innerHTML = '<p>Aucun témoignage disponible pour le moment.</p>';
        return;
    }

    const alreadyCompleted = completedSteps.has(4);
    let html = '<h2>Témoignages d\'anciens étudiants</h2>';
    if (alreadyCompleted) html += '<p style="color: #28a745; font-weight:500;">✅ Cette étape a déjà été validée.</p>';
    html += '<p>Découvrez les parcours inspirants de ceux qui sont passés par ces filières :</p>';
    html += '<div class="temoignages-list">';

    DATA.temoignages.forEach(t => {
        html += `
            <div class="temoignage-card" id="temoignage-${t.id}">
                <div class="temoignage-header">
                    <div class="temoignage-avatar">
                        <img src="${t.photo}" alt="Photo de ${t.nom}" onerror="this.src='assets/profiles/default-avatar.png'">
                    </div>
                    <div class="temoignage-info">
                        <h3>${t.nom}</h3>
                        <span class="temoignage-filiere">🎓 Filière : ${DATA.specialisations.find(s => s.id === t.filière)?.nom || t.filière}</span>
                        <span class="temoignage-profession">💼 ${t.profession} chez ${t.entreprise}</span>
                    </div>
                    <button class="btn-expand" data-id="${t.id}" title="Voir le parcours complet">
                        <span class="expand-icon">👇</span> Voir plus
                    </button>
                </div>
                <blockquote>“${t.citation}”</blockquote>
                <div class="temoignage-rating">Satisfaction : ${'⭐'.repeat(t.satisfaction)} (${t.satisfaction}/5)</div>
                <div class="temoignage-details" id="details-${t.id}" style="display:none;">
                    <div class="details-profile">
                        <div class="details-avatar"><img src="${t.photo}" alt="Photo de ${t.nom}" onerror="this.src='assets/profiles/default-avatar.png'"></div>
                        <div class="details-identity">
                            <h4>${t.nom}</h4><p>${t.age} ans</p>
                            <p>💼 ${t.profession} - ${t.entreprise}</p>
                            <p>🎓 ${t.parcours.diplome}</p>
                        </div>
                    </div>
                    <div class="details-section">
                        <h4>📚 Parcours académique</h4>
                        <p><strong>Université :</strong> ${t.parcours.universite}</p>
                        <p><strong>Filière suivie :</strong> ${t.parcours.filiere_suivie}</p>
                        <p><strong>Période :</strong> ${t.parcours.annee_debut} - ${t.parcours.annee_fin}</p>
                        <p><strong>Diplôme :</strong> ${t.parcours.diplome}</p>
                    </div>
                    <div class="details-section">
                        <h4>🚀 Carrière actuelle</h4>
                        <p><strong>Poste :</strong> ${t.carriere.poste_actuel}</p>
                        <p><strong>Entreprise :</strong> ${t.carriere.entreprise_actuelle}</p>
                        <p><strong>Technologies maîtrisées :</strong></p>
                        <div class="tech-tags">${t.carriere.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}</div>
                        <p><strong>Réalisations :</strong></p>
                        <ul>${t.carriere.realisations.map(r => `<li>${r}</li>`).join('')}</ul>
                    </div>
                    <div class="details-section conseil">
                        <h4>💡 Conseil pour les étudiants</h4>
                        <p>“${t.conseil}”</p>
                    </div>
                    <button class="btn-collapse" data-id="${t.id}"><span>👆</span> Replier</button>
                </div>
            </div>`;
    });

    html += '</div>';
    content.innerHTML = html;

    document.querySelectorAll('.btn-expand').forEach(btn => {
        btn.addEventListener('click', function () {
            const id = this.dataset.id;
            const details = document.getElementById(`details-${id}`);
            const card = document.getElementById(`temoignage-${id}`);
            if (details.style.display === 'none' || details.style.display === '') {
                details.style.display = 'block';
                this.innerHTML = '<span class="expand-icon">👆</span> Voir moins';
                card.classList.add('expanded');
                details.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                details.style.display = 'none';
                this.innerHTML = '<span class="expand-icon">👇</span> Voir plus';
                card.classList.remove('expanded');
            }
        });
    });

    document.querySelectorAll('.btn-collapse').forEach(btn => {
        btn.addEventListener('click', function () {
            const id = this.dataset.id;
            const details = document.getElementById(`details-${id}`);
            const expandBtn = document.querySelector(`.btn-expand[data-id="${id}"]`);
            const card = document.getElementById(`temoignage-${id}`);
            details.style.display = 'none';
            expandBtn.innerHTML = '<span class="expand-icon">👇</span> Voir plus';
            card.classList.remove('expanded');
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

// ==========================================
// ÉTAPE 5 : QUIZ DE CULTURE GÉNÉRALE
// ==========================================
function renderQuiz() {
    if (!DATA.questions || DATA.questions.length === 0) {
        content.innerHTML = '<p style="color:red;">❌ Aucune question disponible.</p>';
        return;
    }

    const alreadyCompleted = completedSteps.has(5);

    // Initialiser le quiz si nécessaire
    if (quizQuestions.length === 0) {
        quizQuestions = selectionnerQuestionsAleatoires(10);
        currentQuizIndex = 0;
        quizTermine = false;
        state.quizAnswers = {};
        state.quizPoints = { gl: 0, dm: 0, reseau: 0, msi: 0, asr: 0 };
        console.log('📝 Quiz initialisé avec', quizQuestions.length, 'questions');
    }

    // Vérifier si le quiz est terminé
    const toutesRepondues = quizQuestions.every(q => 
        state.quizAnswers[q.id] !== undefined && 
        state.quizAnswers[q.id] !== null && 
        state.quizAnswers[q.id] !== -1
    );

    if (toutesRepondues) {
        quizTermine = true;
        renderQuizTermine(alreadyCompleted);
        return;
    }

    // Si l'index dépasse, afficher la fin
    if (currentQuizIndex >= quizQuestions.length) {
        quizTermine = true;
        renderQuizTermine(alreadyCompleted);
        return;
    }

    const question = quizQuestions[currentQuizIndex];
    const totalQuestions = quizQuestions.length;

    let html = '<h2>Quiz de culture générale informatique</h2>';
    if (alreadyCompleted) html += '<p style="color: #28a745; font-weight:500;">✅ Cette étape a déjà été validée. Vous pouvez refaire le quiz.</p>';

    html += `<div class="quiz-card">`;
    html += `<div class="quiz-progress">Question ${currentQuizIndex + 1} sur ${totalQuestions}</div>`;
    html += `<div class="quiz-question">${question.question}</div>`;
    html += `<div class="quiz-options">`;

    question.options.forEach((opt, idx) => {
        html += `
            <div class="quiz-option-card" data-option="${idx}">
                <span class="option-letter">${String.fromCharCode(65 + idx)}</span>
                <span class="option-text">${opt.texte}</span>
            </div>`;
    });

    html += `</div>`;
    html += `<div class="quiz-dots">`;
    for (let i = 0; i < totalQuestions; i++) {
        let dotClass = '';
        if (i < currentQuizIndex) dotClass = 'answered';
        else if (i === currentQuizIndex) dotClass = 'current';
        html += `<span class="quiz-dot ${dotClass}"></span>`;
    }
    html += `</div></div>`;

    content.innerHTML = html;

    document.querySelectorAll('.quiz-option-card').forEach(card => {
        card.addEventListener('click', function () {
            if (this.classList.contains('selected')) return;

            document.querySelectorAll('.quiz-option-card').forEach(c => { c.style.pointerEvents = 'none'; });
            this.classList.add('selected');

            const optionIdx = parseInt(this.dataset.option);
            state.quizAnswers[question.id] = optionIdx;
            console.log('✅ Question', question.id, 'répondue. Total réponses:', Object.keys(state.quizAnswers).length);

            const points = question.options[optionIdx].points;
            for (let key in points) {
                state.quizPoints[key] = (state.quizPoints[key] || 0) + points[key];
            }

            setTimeout(() => {
                currentQuizIndex++;
                
                // Vérifier si toutes les questions sont répondues
                const toutRepondu = quizQuestions.every(q => 
                    state.quizAnswers[q.id] !== undefined && 
                    state.quizAnswers[q.id] !== null && 
                    state.quizAnswers[q.id] !== -1
                );

                if (toutRepondu || currentQuizIndex >= quizQuestions.length) {
                    quizTermine = true;
                    console.log('🏁 Quiz terminé ! Toutes les questions sont répondues.');
                }

                renderQuiz();
            }, 500);
        });
    });
}

function selectionnerQuestionsAleatoires(nombreTotal) {
    const toutesLesQuestions = [...DATA.questions];
    for (let i = toutesLesQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [toutesLesQuestions[i], toutesLesQuestions[j]] = [toutesLesQuestions[j], toutesLesQuestions[i]];
    }
    return toutesLesQuestions.slice(0, Math.min(nombreTotal, toutesLesQuestions.length));
}

function renderQuizTermine(alreadyCompleted) {
    const totalQuestions = quizQuestions.length;
    const nbReponses = quizQuestions.filter(q => 
        state.quizAnswers[q.id] !== undefined && 
        state.quizAnswers[q.id] !== null && 
        state.quizAnswers[q.id] !== -1
    ).length;

    let html = '<h2>Quiz de culture générale informatique</h2>';
    if (alreadyCompleted) html += '<p style="color: #28a745; font-weight:500;">✅ Cette étape a déjà été validée.</p>';
    html += `<div class="quiz-card quiz-completed">`;
    html += `<div class="quiz-completed-icon">🎉</div>`;
    html += `<h3>Quiz terminé !</h3>`;
    html += `<p>Vous avez répondu à <strong>${nbReponses}</strong> questions sur <strong>${totalQuestions}</strong>.</p>`;
    
    if (nbReponses >= totalQuestions) {
        html += `<p style="color:#28a745;">✅ Toutes les questions sont répondues. Vous pouvez passer à l'étape suivante.</p>`;
    } else {
        html += `<p style="color:#e67e22;">⚠️ Il manque ${totalQuestions - nbReponses} réponse(s). Le bouton Suivant sera débloqué quand tout sera répondu.</p>`;
    }
    
    html += `<button id="quiz-restart" class="btn-primary" style="margin-top:1rem;">🔄 Refaire le quiz</button>`;
    html += `</div>`;
    content.innerHTML = html;

    // Mettre à jour le bouton suivant
    updateUI();

    document.getElementById('quiz-restart')?.addEventListener('click', () => {
        quizQuestions = [];
        currentQuizIndex = 0;
        quizTermine = false;
        state.quizAnswers = {};
        state.quizPoints = { gl: 0, dm: 0, reseau: 0, msi: 0, asr: 0 };
        renderQuiz();
    });
}

// ==========================================
// ÉTAPE 6 : PRÉREQUIS
// ==========================================
function renderPrerequis() {
    if (!DATA.prerequis || DATA.prerequis.length === 0) {
        content.innerHTML = '<p>Aucun prérequis renseigné.</p>';
        return;
    }
    if (!DATA.specialisations || DATA.specialisations.length === 0) {
        content.innerHTML = '<p>Données des filières non chargées.</p>';
        return;
    }

    const alreadyCompleted = completedSteps.has(6);
    let html = '<h2>Vos prérequis</h2>';
    if (alreadyCompleted) html += '<p style="color: #28a745; font-weight:500;">✅ Cette étape a déjà été validée. Vous pouvez modifier votre sélection.</p>';
    html += '<p>Cochez les compétences que vous maîtrisez déjà, classées par filière :</p>';
    html += '<div class="prerequis-container">';

    DATA.specialisations.forEach(spe => {
        const prerequisFiliere = DATA.prerequis.filter(pre => pre.filières.includes(spe.id));
        if (prerequisFiliere.length === 0) return;

        const nbCoches = prerequisFiliere.filter(pre => state.prerequis.includes(pre.id)).length;
        const total = prerequisFiliere.length;

        html += `
            <div class="prerequis-card">
                <div class="prerequis-card-header">
                    <h3>${spe.nom}</h3>
                    <span class="prerequis-count ${nbCoches === total ? 'all-checked' : ''}">${nbCoches}/${total}</span>
                </div>
                <div class="prerequis-list">`;
        prerequisFiliere.forEach(pre => {
            const checked = state.prerequis.includes(pre.id) ? 'checked' : '';
            html += `
                <label class="checkbox-label prerequis-item">
                    <input type="checkbox" value="${pre.id}" ${checked}>
                    <span class="checkbox-text">${pre.description}</span>
                </label>`;
        });
        html += `</div></div>`;
    });

    html += '</div>';
    content.innerHTML = html;

    function updateCounters() {
        document.querySelectorAll('.prerequis-card').forEach(card => {
            const total = card.querySelectorAll('input[type="checkbox"]').length;
            const coches = card.querySelectorAll('input[type="checkbox"]:checked').length;
            const countSpan = card.querySelector('.prerequis-count');
            countSpan.textContent = `${coches}/${total}`;
            countSpan.classList.toggle('all-checked', coches === total && total > 0);
        });
    }

    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) state.prerequis.push(cb.value);
            else state.prerequis = state.prerequis.filter(id => id !== cb.value);
            updateCounters();
        });
    });

    updateCounters();
}

// ==========================================
// ÉTAPE 7 : PRÉSENTATION DES FILIÈRES
// ==========================================
function renderFilières() {
    if (!DATA.specialisations || DATA.specialisations.length === 0) {
        content.innerHTML = '<p>Aucune filière chargée.</p>';
        return;
    }

    const alreadyCompleted = completedSteps.has(7);
    let html = '<h2>Les filières</h2>';
    if (alreadyCompleted) html += '<p style="color: #28a745; font-weight:500;">✅ Cette étape a déjà été validée. Vous pouvez modifier votre soutien.</p>';
    html += '<p>Cliquez sur une carte pour voir tous les détails de la filière. Utilisez le cœur pour soutenir une filière.</p>';
    html += '<div class="filieres-grid">';

    DATA.specialisations.forEach(spe => {
        const liked = state.likedFiliere[spe.id] ? 'liked' : '';
        html += `
            <div class="filiere-card ${liked}" data-spe-id="${spe.id}" id="card-${spe.id}">
                <button class="like-btn" data-spe-id="${spe.id}" title="Soutenir cette filière">${liked ? '❤️' : '🤍'}</button>
                <h3>${spe.nom}</h3>
                <p>${spe.description.substring(0, 120)}...</p>
                <p class="click-hint">👆 Cliquez pour plus de détails</p>
            </div>`;
    });

    html += '</div><div id="filiere-detail" class="filiere-detail" style="display:none;"></div>';
    content.innerHTML = html;

    document.querySelectorAll('.filiere-card').forEach(card => {
        card.addEventListener('click', function (e) {
            if (e.target.closest('.like-btn')) return;
            const spe = DATA.specialisations.find(s => s.id === this.dataset.speId);
            if (spe) renderFiliereDetail(spe);
        });
    });

    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const speId = btn.dataset.speId;
            state.likedFiliere[speId] = state.likedFiliere[speId] ? undefined : 1;
            const card = document.getElementById(`card-${speId}`);
            if (card) {
                card.classList.toggle('liked');
                btn.innerHTML = state.likedFiliere[speId] ? '❤️' : '🤍';
            }
        });
    });
}

function renderFiliereDetail(spe) {
    const detailDiv = document.getElementById('filiere-detail');
    if (!detailDiv) return;

    const liked = state.likedFiliere[spe.id] ? '❤️' : '🤍';
    let html = `
        <div class="detail-container">
            <div class="detail-header">
                <h3>${spe.nom} <span class="detail-like" onclick="event.stopPropagation(); toggleLike('${spe.id}')">${liked}</span></h3>
                <button class="detail-close" title="Fermer les détails">✕</button>
            </div>
            <div class="detail-body">
                <div class="detail-section"><h4>📖 Description complète</h4><p>${spe.description}</p></div>
                <div class="detail-section"><h4>🎯 Objectifs de la formation</h4><p>${spe.details.objectifs}</p></div>
                <div class="detail-section"><h4>🔧 Compétences clés acquises</h4><ul>${spe.details.competences_cles.map(c => `<li>${c}</li>`).join('')}</ul></div>
                <div class="detail-section"><h4>💼 Débouchés professionnels</h4><div class="debouchés-tags">${spe.debouchés.map(d => `<span class="debouché-tag">${d}</span>`).join('')}</div></div>
                <div class="detail-section"><h4>🛠️ Projets typiques réalisés</h4><ul>${spe.details.projets_types.map(p => `<li>${p}</li>`).join('')}</ul></div>
                <div class="detail-section"><h4>👤 Profil idéal</h4><p>${spe.details.public_cible}</p></div>
                <div class="detail-section warning-section">
                    <h4>⚠️ Difficultés possibles</h4>
                    <div class="difficultes-list">${spe.details.difficultes.map(d => `
                        <div class="difficulte-item"><h5>${d.titre}</h5><p>${d.description}</p></div>
                    `).join('')}</div>
                </div>
            </div>
        </div>`;

    detailDiv.innerHTML = html;
    detailDiv.style.display = 'block';
    detailDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    detailDiv.querySelector('.detail-close').addEventListener('click', () => {
        detailDiv.style.display = 'none';
        document.querySelector('.filieres-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

function toggleLike(speId) {
    state.likedFiliere[speId] = state.likedFiliere[speId] ? undefined : 1;
    const card = document.getElementById(`card-${speId}`);
    const heart = state.likedFiliere[speId] ? '❤️' : '🤍';
    if (card) {
        card.classList.toggle('liked');
        const btn = card.querySelector('.like-btn');
        if (btn) btn.innerHTML = heart;
    }
    const detailLike = document.querySelector('.detail-like');
    if (detailLike) detailLike.textContent = heart;
}

// ==========================================
// ÉTAPE 8 : RÉSULTATS
// ==========================================
function renderResultats() {
    if (!window.calculerScores || !window.getAllScores) {
        content.innerHTML = '<p>Erreur : module de calcul des scores manquant.</p>';
        return;
    }

    const resultats = calculerScores(state.notes, state.passions, state.quizPoints, state.prerequis, state.likedFiliere);
    const tousLesScores = getAllScores(state.notes, state.passions, state.quizPoints, state.prerequis, state.likedFiliere);

    const hasNoIdea = state.passions.includes('aucune_idee');
    const hasPassions = state.passions.length > 0 && !hasNoIdea;

    let html = '<h2>🎓 Résultats de votre orientation</h2>';

    // Message personnalisé
    if (evaluationPrecedente) {
        html += '<p style="color: var(--primary); margin-bottom:1.5rem;">🔄 <strong>Comparaison avec votre évaluation précédente</strong></p>';
    } else if (hasNoIdea) {
        html += '<p style="color: var(--primary); margin-bottom:1.5rem;">📊 <strong>Orientation neutre</strong></p>';
    } else if (hasPassions) {
        html += '<p style="color: var(--primary); margin-bottom:1.5rem;">🎯 <strong>Orientation personnalisée</strong></p>';
    }

    // Comparaison avec l'évaluation précédente
    if (evaluationPrecedente && evaluationPrecedente.resultats) {
        html += renderComparaison(tousLesScores, evaluationPrecedente);
    }

    // Diagramme des scores
    html += '<div class="scores-chart"><h3>📊 Niveau d\'affinité par filière</h3><div class="chart-bars">';
    const maxScore = Math.max(...tousLesScores.map(s => s.score), 1);
    const colors = ['#2563eb', '#7c3aed', '#059669', '#ea580c', '#dc2626'];

    tousLesScores.forEach((item, index) => {
        const percentage = Math.round((item.score / maxScore) * 100);
        const color = colors[index] || '#6b7280';

        // Trouver le score précédent pour cette filière
        let previousScore = null;
        let difference = null;
        if (evaluationPrecedente && evaluationPrecedente.tousLesScores) {
            const prev = evaluationPrecedente.tousLesScores.find(s => s.id === item.id);
            if (prev) {
                previousScore = prev.score;
                difference = Math.round((item.score - prev.score) * 10) / 10;
            }
        }

        html += `
            <div class="chart-bar-container">
                <div class="chart-label">
                    <span class="chart-filiere-nom">${item.nom}</span>
                    <span class="chart-score">
                        ${item.score} pts
                        ${difference !== null ? 
                            (difference > 0 ? `<span style="color:#28a745;"> (+${difference})</span>` : 
                             difference < 0 ? `<span style="color:#dc3545;"> (${difference})</span>` : 
                             ' <span style="color:#6b7280;">(=)</span>') 
                            : ''}
                    </span>
                </div>
                <div class="chart-bar-wrapper">
                    <div class="chart-bar ${index < 2 ? 'top-bar' : ''}" style="width: ${percentage}%; background: ${color};"></div>
                </div>
            </div>`;
    });

    html += '</div></div>';

    // Recommandations
    html += '<div class="results-recommendations"><h3>🏆 Nos recommandations</h3>';
    if (resultats.length === 0) {
        html += '<p>Aucune recommandation pour le moment.</p>';
    } else {
        const medailles = ['🥇', '🥈'];
        resultats.forEach((spe, index) => {
            html += `
                <div class="result-card">
                    <h3>${medailles[index]} ${spe.nom} (score : ${spe.score})</h3>
                    <p>${spe.description}</p>
                </div>`;
        });
    }
    html += '</div>';

    html += '<button id="restart-btn" class="btn-secondary" style="margin-top:1.5rem;">🔄 Nouvelle évaluation</button>';
    content.innerHTML = html;

    setTimeout(() => document.querySelectorAll('.chart-bar').forEach(bar => bar.style.transition = 'width 1s ease'), 100);

    document.getElementById('restart-btn')?.addEventListener('click', () => {
        quizQuestions = []; currentQuizIndex = 0; quizTermine = false;
        evaluationPrecedente = null;
        sessionStorage.clear();
        location.reload();
    });

    // Sauvegarde de l'évaluation
    fetch('/api/save-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            matricule: currentUser.matricule,
            evaluation: {
                notes: state.notes,
                passions: state.passions,
                quizPoints: state.quizPoints,
                prerequis: state.prerequis,
                likedFiliere: state.likedFiliere,
                resultats: resultats,
                tousLesScores: tousLesScores
            }
        })
    }).catch(err => console.error('Sauvegarde évaluation échouée', err));
}

// ==========================================
// NAVIGATION
// ==========================================
function nextStep() {
    if (!isStepValid(currentStep)) { showValidationError(getValidationMessage(currentStep)); return; }
    completedSteps.add(currentStep);
    if (currentStep < TOTAL_STEPS) { currentStep++; renderStep(); }
}

function prevStep() {
    if (currentStep > 1) { currentStep--; renderStep(); }
}

// ==========================================
// INITIALISATION
// ==========================================
// ==========================================
// INITIALISATION
// ==========================================
(async () => {
    try {
        const success = await loadData();
        if (!success || !DATA.specialisations || DATA.specialisations.length === 0) {
            content.innerHTML = '<p style="color:red;">❌ Impossible de charger les données des filières.</p>';
            return;
        }

        // Vérifier s'il y a une évaluation précédente
        const hasPrevious = await checkPreviousEvaluation();
        
        if (hasPrevious && evaluationPrecedente && !saved) {
            // Proposer de récupérer les anciennes notes
            showPreviousEvaluationPrompt();
        } else {
            renderStep();
        }
    } catch (err) {
        console.error('Erreur chargement données', err);
        content.innerHTML = '<p style="color:red;">❌ Impossible de charger les données.</p>';
    }
})();


nextBtn.addEventListener('click', nextStep);
prevBtn.addEventListener('click', prevStep);

logoutBtn.addEventListener('click', () => {
    quizQuestions = []; currentQuizIndex = 0; quizTermine = false;
    sessionStorage.removeItem('currentUser'); sessionStorage.removeItem('orientationProgress');
    sessionStorage.removeItem('quizCurrent'); sessionStorage.removeItem('completedSteps');
    window.location.href = '/login';
});