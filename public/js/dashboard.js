// ==========================================
// VÉRIFICATION DE LA CONNEXION
// ==========================================
const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = '/login';
}

// ==========================================
// OVERLAY DE BIENVENUE
// ==========================================
(function showWelcomeOverlay() {
    const overlay = document.getElementById('welcome-overlay');
    const message = document.getElementById('welcome-message');

    // Message personnalisé
    const heure = new Date().getHours();
    let salutation;
    if (heure < 6) salutation = 'Bonne nuit';
    else if (heure < 12) salutation = 'Bonjour';
    else if (heure < 18) salutation = 'Bon après-midi';
    else salutation = 'Bonsoir';

    message.textContent = `${salutation} et bienvenue cher(e) ${currentUser.nom} !`;

    // Afficher l'overlay
    overlay.style.display = 'flex';

    // Masquer après 3 secondes
    setTimeout(() => {
        overlay.classList.add('fade-out');

        // Supprimer complètement après la transition
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);
    }, 6000);
})();

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
// OVERLAY D'AU REVOIR
// ==========================================
function showGoodbyeOverlay() {
    const overlay = document.getElementById('goodbye-overlay');
    const nameSpan = document.getElementById('goodbye-name');
    const countdownEl = document.getElementById('goodbye-countdown');
    const closeBtn = document.getElementById('goodbye-close-btn');
    const cancelBtn = document.getElementById('goodbye-cancel-btn');

    // Afficher le nom
    nameSpan.textContent = currentUser.nom;

    // Afficher l'overlay
    overlay.style.display = 'flex';

    // Compte à rebours
    let countdown = 5;
    countdownEl.textContent = countdown;
    let countdownInterval;

    function startCountdown() {
        countdownInterval = setInterval(() => {
            countdown--;
            countdownEl.textContent = countdown;

            if (countdown <= 0) {
                clearInterval(countdownInterval);
                logout();
            }
        }, 1000);
    }

    startCountdown();

    // Bouton de déconnexion immédiate
    closeBtn.onclick = () => {
        clearInterval(countdownInterval);
        logout();
    };

    // Bouton d'annulation - rester sur la plateforme
    cancelBtn.onclick = () => {
        clearInterval(countdownInterval);
        overlay.style.display = 'none';
        // Revenir à l'étape des résultats
        console.log('↩️ L\'utilisateur a choisi de rester');
    };

    // Empêcher la fermeture accidentelle en cliquant à l'extérieur
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            // Ne rien faire
        }
    });
}

// Fonction de déconnexion propre
function logout() {
    quizQuestions = [];
    currentQuizIndex = 0;
    quizTermine = false;
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('orientationProgress');
    sessionStorage.removeItem('quizCurrent');
    sessionStorage.removeItem('completedSteps');
    window.location.href = '/login';
}

// Fonction de déconnexion propre
function logout() {
    quizQuestions = [];
    currentQuizIndex = 0;
    quizTermine = false;
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('orientationProgress');
    sessionStorage.removeItem('quizCurrent');
    sessionStorage.removeItem('completedSteps');
    window.location.href = '/login';
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

// Affichage du nom utilisateur avec photo
const userPhotoHeader = document.getElementById('user-photo-header');
const userIconHeader = document.getElementById('user-icon-header');
const userNameHeader = document.getElementById('user-name-header');
const userMatriculeHeader = document.getElementById('user-matricule-header');

userNameHeader.textContent = currentUser.nom;

// Charger la photo si elle existe
if (currentUser.photo) {
    userPhotoHeader.src = currentUser.photo;
    userPhotoHeader.style.display = 'inline-block';
    userIconHeader.style.display = 'none';
} else {
    userPhotoHeader.style.display = 'none';
    userIconHeader.style.display = 'inline-block';
}

// ==========================================
// MODALE PROFIL UTILISATEUR
// ==========================================

// Rendre le nom cliquable
userDisplay.style.cursor = 'pointer';
userDisplay.title = 'Voir mon profil';

userDisplay.addEventListener('click', () => {
    openProfileModal();
});

function openProfileModal() {
    const modal = document.getElementById('profile-modal');
    const overlay = modal.querySelector('.profile-modal-overlay');
    const closeBtn = modal.querySelector('.profile-modal-close');

    // Remplir les informations
    document.getElementById('profile-name').textContent = currentUser.nom;
    document.getElementById('profile-matricule').textContent = currentUser.matricule;

    // Avatar avec possibilité de changer la photo
    const avatarContainer = document.querySelector('.profile-avatar');
    if (currentUser.photo) {
        avatarContainer.innerHTML = `
            <img src="${currentUser.photo}" alt="Photo de profil" class="profile-avatar-img" id="profile-avatar-img">
            <div class="profile-avatar-overlay" id="profile-avatar-overlay">
                <span>📷 Modifier</span>
            </div>
        `;
    } else {
        avatarContainer.innerHTML = `
            <i class="fas fa-user-circle" id="profile-avatar-icon"></i>
            <div class="profile-avatar-overlay" id="profile-avatar-overlay">
                <span>📷 Ajouter une photo</span>
            </div>
        `;
    }

    // Supprimer l'ancien input file s'il existe
    let fileInput = document.getElementById('profile-photo-input');
    if (fileInput) {
        fileInput.remove();
    }

    // Créer un nouvel input file
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'profile-photo-input';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // Gérer le clic sur l'avatar
    const avatarClickHandler = () => {
        fileInput.value = '';
        fileInput.click();
    };

    avatarContainer.removeEventListener('click', avatarClickHandler);
    avatarContainer.addEventListener('click', avatarClickHandler);

    // Gérer le changement de fichier
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('⚠️ La photo ne doit pas dépasser 2 Mo.');
            fileInput.value = '';
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('⚠️ Type de fichier non autorisé. Utilisez JPG, PNG, GIF ou WEBP.');
            fileInput.value = '';
            return;
        }

        const overlayEl = document.getElementById('profile-avatar-overlay');
        if (overlayEl) {
            overlayEl.innerHTML = '<span>⏳ Chargement...</span>';
            overlayEl.style.opacity = '1';
        }

        const formData = new FormData();
        formData.append('photo', file);

        try {
            const response = await fetch(`/api/upload-photo/${currentUser.matricule}`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                const newPhotoUrl = data.photoUrl + '?t=' + Date.now();

                currentUser.photo = data.photoUrl;
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

                const userPhotoHeader = document.getElementById('user-photo-header');
                const userIconHeader = document.getElementById('user-icon-header');
                if (userPhotoHeader && userIconHeader) {
                    userPhotoHeader.src = newPhotoUrl;
                    userPhotoHeader.style.display = 'inline-block';
                    userIconHeader.style.display = 'none';
                }

                const avatarImgNow = document.getElementById('profile-avatar-img');
                const avatarIconNow = document.getElementById('profile-avatar-icon');

                if (avatarImgNow) {
                    avatarImgNow.src = newPhotoUrl;
                } else if (avatarIconNow) {
                    avatarContainer.innerHTML = `
                        <img src="${newPhotoUrl}" alt="Photo de profil" class="profile-avatar-img" id="profile-avatar-img">
                        <div class="profile-avatar-overlay" id="profile-avatar-overlay">
                            <span>📷 Modifier</span>
                        </div>
                    `;
                }

                const overlayNow = document.getElementById('profile-avatar-overlay');
                if (overlayNow) {
                    overlayNow.innerHTML = '<span>📷 Modifier</span>';
                    overlayNow.style.opacity = '';
                }
            } else {
                alert('❌ ' + (data.message || 'Erreur lors du téléchargement.'));
                if (overlayEl) {
                    overlayEl.innerHTML = '<span>📷 Modifier</span>';
                    overlayEl.style.opacity = '';
                }
            }
        } catch (err) {
            alert('❌ Erreur lors du téléchargement de la photo.');
            if (overlayEl) {
                overlayEl.innerHTML = '<span>📷 Modifier</span>';
                overlayEl.style.opacity = '';
            }
        }

        fileInput.value = '';
    };

    // Infos personnelles
    const infoGrid = document.getElementById('profile-info');
    const dateInscription = currentUser.dateInscription
        ? new Date(currentUser.dateInscription).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric'
          })
        : 'Inconnue';

    infoGrid.innerHTML = `
        <div class="profile-info-item">
            <div class="profile-info-label">Nom complet</div>
            <div class="profile-info-value">${currentUser.nom}</div>
        </div>
        <div class="profile-info-item">
            <div class="profile-info-label">Matricule</div>
            <div class="profile-info-value">${currentUser.matricule}</div>
        </div>
        <div class="profile-info-item">
            <div class="profile-info-label">Email</div>
            <div class="profile-info-value">${currentUser.email || 'Non renseigné'}</div>
        </div>
        <div class="profile-info-item">
            <div class="profile-info-label">Inscrit depuis</div>
            <div class="profile-info-value">${dateInscription}</div>
        </div>
    `;

    // Historique des évaluations
    const evalContainer = document.getElementById('profile-evaluations');

    fetch(`/api/get-evaluations/${currentUser.matricule}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.historique && data.historique.length > 0) {
                evalContainer.innerHTML = data.historique.map((evalItem, index) => {
                    const date = new Date(evalItem.date).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    });
                    const topResult = evalItem.resultats?.[0]?.nom || 'N/A';
                    const topScore = evalItem.resultats?.[0]?.score || '-';

                    return `
                        <div class="profile-eval-item">
                            <span class="profile-eval-date">
                                ${index === data.historique.length - 1 ? '🟢 Dernière' : '📅'} ${date}
                            </span>
                            <span class="profile-eval-result">${topResult} - ${topScore} pts</span>
                        </div>
                    `;
                }).join('');
            } else {
                evalContainer.innerHTML = '<p class="profile-no-data">Aucune évaluation effectuée</p>';
            }
        })
        .catch(() => {
            evalContainer.innerHTML = '<p class="profile-no-data">Impossible de charger l\'historique</p>';
        });

    // Préférences
    const prefsGrid = document.getElementById('profile-preferences');
    const currentTheme = currentUser.theme || 'light';
    prefsGrid.innerHTML = `
        <div class="profile-info-item profile-theme-item" id="profile-theme-toggle">
            <div class="profile-info-label">Thème</div>
            <div class="profile-info-value profile-theme-value">
                <span class="theme-indicator ${currentTheme}"></span>
                <span id="profile-theme-text">${currentTheme === 'dark' ? 'Sombre' : 'Clair'}</span>
                <span class="theme-toggle-icon">🔄</span>
            </div>
        </div>
        <div class="profile-info-item">
            <div class="profile-info-label">Dernière activité</div>
            <div class="profile-info-value">${new Date().toLocaleDateString('fr-FR')}</div>
        </div>
        <div class="profile-info-item">
            <div class="profile-info-label">Évaluations effectuées</div>
            <div class="profile-info-value">${historiqueEvaluations.length || 0}</div>
        </div>
        <div class="profile-info-item">
            <div class="profile-info-label">Photo de profil</div>
            <div class="profile-info-value">${currentUser.photo ? '✅ Personnalisée' : '❌ Par défaut'}</div>
        </div>
    `;

    // Gérer le clic sur le thème
    const themeItem = document.getElementById('profile-theme-toggle');
    if (themeItem) {
        themeItem.addEventListener('click', () => {
            const newTheme = currentUser.theme === 'dark' ? 'light' : 'dark';
            
            // Appliquer le thème
            if (newTheme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
            }
            
            // Mettre à jour currentUser
            currentUser.theme = newTheme;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Mettre à jour l'affichage dans la modale
            const themeText = document.getElementById('profile-theme-text');
            const themeIndicator = themeItem.querySelector('.theme-indicator');
            if (themeText) {
                themeText.textContent = newTheme === 'dark' ? 'Sombre' : 'Clair';
            }
            if (themeIndicator) {
                themeIndicator.className = `theme-indicator ${newTheme}`;
            }
            
            // Sauvegarder côté serveur
            fetch('/api/save-theme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matricule: currentUser.matricule,
                    theme: newTheme
                })
            }).catch(err => console.error('Erreur sauvegarde thème:', err));
        });
    }

    // Afficher la modale
    modal.style.display = 'flex';

    // Fermer la modale
    function closeModal() {
        modal.style.display = 'none';
    }

    closeBtn.onclick = closeModal;
    overlay.onclick = closeModal;

    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

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

    // Calculer le temps écoulé
    const maintenant = new Date();
    const diffJours = Math.floor((maintenant - dateDerniereEval) / (1000 * 60 * 60 * 24));

    let messageTemps;
    if (diffJours === 0) messageTemps = "Aujourd'hui";
    else if (diffJours === 1) messageTemps = "Hier";
    else if (diffJours < 7) messageTemps = `Il y a ${diffJours} jours`;
    else if (diffJours < 30) messageTemps = `Il y a ${Math.floor(diffJours / 7)} semaine(s)`;
    else messageTemps = `Il y a ${Math.floor(diffJours / 30)} mois`;

    const resultats = evaluationPrecedente.resultats || [];
    const medailles = ['🥇', '🥈'];

    content.innerHTML = `
        <div class="previous-eval-container">
            <div class="previous-eval-badge">
                <span class="badge-dot"></span>
                ${messageTemps}
            </div>

            <div class="previous-eval-icon">📂</div>
            <h2>Évaluation précédente détectée</h2>
            <p class="previous-eval-date">Effectuée le <strong>${dateFormatee}</strong></p>

            <div class="previous-results-cards">
                ${resultats.map((r, i) => `
                    <div class="prev-result-card ${i === 0 ? 'top-result' : ''}">
                        <div class="prev-result-rank">${medailles[i]}</div>
                        <div class="prev-result-info">
                            <h4>${r.nom}</h4>
                            <div class="prev-result-score">
                                <div class="prev-score-bar">
                                    <div class="prev-score-fill" style="width: ${Math.round((r.score / 100) * 100)}%"></div>
                                </div>
                                <span class="prev-score-value">${r.score} pts</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="previous-eval-actions">
                <p>Que souhaitez-vous faire ?</p>
                <div class="eval-choices">
                    <button id="btn-reuse-notes" class="btn-primary btn-choice">
                        <span class="choice-icon">📝</span>
                        <span class="choice-text">
                            <strong>Réutiliser mes notes</strong>
                            <small>Vos notes, passions et prérequis seront restaurés. Le quiz sera à refaire.</small>
                        </span>
                    </button>
                    <button id="btn-new-eval" class="btn-secondary btn-choice">
                        <span class="choice-icon">🔄</span>
                        <span class="choice-text">
                            <strong>Nouvelle évaluation</strong>
                            <small>Tout recommencer depuis le début avec des données vierges.</small>
                        </span>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-reuse-notes').addEventListener('click', () => {
        state.notes = { ...evaluationPrecedente.notes };
        state.passions = [...(evaluationPrecedente.passions || [])];
        state.prerequis = [...(evaluationPrecedente.prerequis || [])];
        state.likedFiliere = { ...(evaluationPrecedente.likedFiliere || {}) };
        state.quizAnswers = {};
        state.quizPoints = { gl: 0, dm: 0, reseau: 0, msi: 0, asr: 0 };
        currentStep = 3;
        completedSteps.add(1);
        completedSteps.add(2);
        renderStep();
        window.scrollTo({ top: 0, behavior: 'instant' });
    });

    document.getElementById('btn-new-eval').addEventListener('click', () => {
        evaluationPrecedente = null;
        renderStep();
        window.scrollTo({ top: 0, behavior: 'instant' });
    });
}

function renderComparaison(nouveauxScores, evaluationPrecedente) {
    if (!evaluationPrecedente.tousLesScores) return '';

    const precedentScores = evaluationPrecedente.tousLesScores;
    const dateDerniereEval = new Date(evaluationPrecedente.date);
    const dateFormatee = dateDerniereEval.toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    // Comparaisons détaillées
    const comparaisons = nouveauxScores.map(nouveau => {
        const precedent = precedentScores.find(p => p.id === nouveau.id);
        const difference = precedent ? Math.round((nouveau.score - precedent.score) * 10) / 10 : 0;
        return { ...nouveau, precedent: precedent?.score || 0, difference };
    });

    // Meilleures progressions
    const meilleuresProgressions = [...comparaisons]
        .filter(c => c.difference > 0)
        .sort((a, b) => b.difference - a.difference);

    // Filières en baisse
    const filieresEnBaisse = [...comparaisons]
        .filter(c => c.difference < 0)
        .sort((a, b) => a.difference - b.difference);

    // Ancien top 1
    const ancienTop1 = evaluationPrecedente.resultats?.[0];
    const nouveauTop1 = nouveauxScores[0];

    let html = '<div class="comparaison-container">';

    // En-tête de la comparaison
    html += `
        <div class="comparaison-header">
            <div class="comparaison-title">
                <span class="comparaison-icon">📊</span>
                <h3>Comparaison avec votre évaluation du ${dateFormatee}</h3>
            </div>
        </div>
    `;

    // Résumé des changements
    html += '<div class="comparaison-summary">';

    // Carte progression
    if (meilleuresProgressions.length > 0) {
        html += `
            <div class="summary-card summary-progress">
                <div class="summary-card-icon">📈</div>
                <div class="summary-card-content">
                    <h4>Progression</h4>
                    <p>${meilleuresProgressions.length} filière(s) en hausse</p>
                    <p class="summary-highlight">+${meilleuresProgressions[0].difference} pts sur ${meilleuresProgressions[0].nom}</p>
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="summary-card summary-neutral">
                <div class="summary-card-icon">📊</div>
                <div class="summary-card-content">
                    <h4>Scores stables</h4>
                    <p>Aucune progression significative</p>
                </div>
            </div>
        `;
    }

    // Carte changement de recommandation
    if (ancienTop1 && nouveauTop1 && ancienTop1.id !== nouveauTop1.id) {
        html += `
            <div class="summary-card summary-change">
                <div class="summary-card-icon">🔄</div>
                <div class="summary-card-content">
                    <h4>Nouvelle recommandation</h4>
                    <p><strong>${ancienTop1.nom}</strong> → <strong>${nouveauTop1.nom}</strong></p>
                </div>
            </div>
        `;
    } else if (ancienTop1 && nouveauTop1) {
        html += `
            <div class="summary-card summary-confirm">
                <div class="summary-card-icon">✅</div>
                <div class="summary-card-content">
                    <h4>Recommandation confirmée</h4>
                    <p><strong>${nouveauTop1.nom}</strong> reste en tête</p>
                </div>
            </div>
        `;
    }

    // Carte scores détaillés
    html += '</div>'; // Fin comparaison-summary

    // Tableau comparatif détaillé
    html += '<div class="comparaison-table">';
    html += '<h4>📋 Évolution détaillée par filière</h4>';

    comparaisons.forEach(c => {
        const diffClass = c.difference > 0 ? 'positive' : c.difference < 0 ? 'negative' : 'neutral';
        const diffSign = c.difference > 0 ? '+' : '';
        const diffIcon = c.difference > 0 ? '↗' : c.difference < 0 ? '↘' : '→';

        html += `
            <div class="comparaison-row">
                <span class="comparaison-filiere">${c.nom}</span>
                <div class="comparaison-scores">
                    <span class="score-avant">${c.precedent}</span>
                    <span class="score-fleche">${diffIcon}</span>
                    <span class="score-apres">${c.score}</span>
                    <span class="score-diff ${diffClass}">${diffSign}${c.difference}</span>
                </div>
            </div>
        `;
    });

    html += '</div>'; // Fin comparaison-table

    // Message d'encouragement
    if (meilleuresProgressions.length >= 2) {
        html += `
            <div class="comparaison-encouragement">
                <span>🎉</span>
                <p>Félicitations ! Vos efforts ont porté leurs fruits. Continuez sur cette lancée !</p>
            </div>
        `;
    } else if (filieresEnBaisse.length >= 2) {
        html += `
            <div class="comparaison-encouragement warning">
                <span>💪</span>
                <p>Certains scores sont en baisse. Concentrez-vous sur les matières clés pour améliorer vos résultats.</p>
            </div>
        `;
    }

    html += '</div>'; // Fin comparaison-container

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
        nextBtn.textContent = '🏁 Terminé';
        nextBtn.className = 'btn-primary btn-finished';
    } else if (!isStepValid(currentStep)) {
        nextBtn.textContent = '🔒 Complétez cette étape';
        nextBtn.className = 'btn-primary btn-disabled';
    } else {
        nextBtn.textContent = 'Suivant →';
        nextBtn.className = 'btn-primary';
    }

    sessionStorage.setItem('orientationProgress', JSON.stringify({ ...state, currentStep }));
    sessionStorage.setItem('completedSteps', JSON.stringify([...completedSteps]));

    // Sauvegarder la progression côté serveur (MySQL)
    saveProgressionToServer();
}

// Fonction de sauvegarde vers MySQL
async function saveProgressionToServer() {
    try {
        await fetch('/api/save-progression', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                matricule: currentUser.matricule,
                progression: {
                    notes: state.notes,
                    passions: state.passions,
                    quizPoints: state.quizPoints,
                    prerequis: state.prerequis,
                    likedFiliere: state.likedFiliere
                }
            })
        });
    } catch (err) {
        console.error('Erreur sauvegarde progression:', err);
    }
}

// ==========================================
// RENDU DE L'ÉTAPE COURANTE AVEC TRANSITION
// ==========================================
function renderStep() {
    // Ajouter la classe fade-out
    content.classList.add('fade-out');

    // Remonter en haut de la page avant le changement d'étape
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
        // Vider et reconstruire l'étape
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

        // Retirer la classe fade-out
        content.classList.remove('fade-out');
        updateUI();

        // S'assurer qu'on est bien en haut après le rendu
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, 250);
}

// ==========================================
// ÉTAPE 1 : ACCUEIL
// ==========================================
function renderWelcome() {
    const alreadyCompleted = completedSteps.has(1);
    content.innerHTML = `
        <div class="welcome-container">
            <div class="welcome-icon">👋</div>
            <h2>Bienvenue ${currentUser.nom} !</h2>
            ${alreadyCompleted ? '<p class="welcome-badge">✅ Étape validée</p>' : ''}
            
            <div class="welcome-intro">
                <p>Ce tableau de bord va vous guider en <strong>7 étapes</strong> pour déterminer les <strong>deux filières informatiques</strong> qui vous correspondent le mieux.</p>
            </div>

            <div class="welcome-steps-preview">
                <div class="preview-item">
                    <span class="preview-icon">📝</span>
                    <span>Vos notes de L2</span>
                </div>
                <div class="preview-item">
                    <span class="preview-icon">❤️</span>
                    <span>Vos passions</span>
                </div>
                <div class="preview-item">
                    <span class="preview-icon">📖</span>
                    <span>Témoignages inspirants</span>
                </div>
                <div class="preview-item">
                    <span class="preview-icon">🧠</span>
                    <span>Quiz de culture générale</span>
                </div>
                <div class="preview-item">
                    <span class="preview-icon">✅</span>
                    <span>Vos prérequis</span>
                </div>
                <div class="preview-item">
                    <span class="preview-icon">🎓</span>
                    <span>Découverte des filières</span>
                </div>
                <div class="preview-item">
                    <span class="preview-icon">🏆</span>
                    <span>Résultat personnalisé</span>
                </div>
            </div>

            <div class="welcome-tip">
                <span class="tip-icon">💡</span>
                <p>Préparez vos notes de L2 et répondez honnêtement aux questions pour obtenir la meilleure recommandation.</p>
            </div>

            <p class="welcome-start"><strong>Cliquez sur « Suivant » pour commencer votre orientation !</strong></p>
        </div>
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

    if (quizQuestions.length === 0) {
        quizQuestions = selectionnerQuestionsAleatoires(10);
        currentQuizIndex = 0;
        quizTermine = false;
        state.quizAnswers = {};
        state.quizPoints = { gl: 0, dm: 0, reseau: 0, msi: 0, asr: 0 };
    }

    if (quizTermine || currentQuizIndex >= quizQuestions.length) {
        renderQuizTermine(alreadyCompleted);
        return;
    }

    const question = quizQuestions[currentQuizIndex];
    const totalQuestions = quizQuestions.length;
    const correctIndex = question.correct !== undefined ? question.correct : 0;

    let html = '<h2>Quiz de culture générale informatique</h2>';
    if (alreadyCompleted) html += '<p style="color: #28a745; font-weight:500;">✅ Cette étape a déjà été validée. Vous pouvez refaire le quiz.</p>';

    html += `<div class="quiz-card">`;
    html += `<div class="quiz-progress">Question ${currentQuizIndex + 1} sur ${totalQuestions}</div>`;
    html += `<div class="quiz-question">${question.question}</div>`;
    html += `<div class="quiz-options">`;

    question.options.forEach((opt, idx) => {
        html += `
            <div class="quiz-option-card" data-option="${idx}" data-correct="${idx === correctIndex ? 'true' : 'false'}">
                <span class="option-letter">${String.fromCharCode(65 + idx)}</span>
                <span class="option-text">${opt.texte}</span>
                <span class="option-feedback"></span>
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

    // Gestion du clic sur les options
    document.querySelectorAll('.quiz-option-card').forEach(card => {
        card.addEventListener('click', function () {
            // Empêcher les doubles clics
            if (this.classList.contains('selected') || this.classList.contains('correct') || this.classList.contains('incorrect')) return;

            // Désactiver tous les clics
            document.querySelectorAll('.quiz-option-card').forEach(c => {
                c.style.pointerEvents = 'none';
            });

            const optionIdx = parseInt(this.dataset.option);
            const isCorrect = this.dataset.correct === 'true';

            // Enregistrer la réponse
            state.quizAnswers[question.id] = optionIdx;

            // Ajouter les points (toujours, même si mauvaise réponse)
            const points = question.options[optionIdx].points;
            for (let key in points) {
                state.quizPoints[key] = (state.quizPoints[key] || 0) + points[key];
            }

            // Appliquer les effets visuels
            if (isCorrect) {
                // Effet vert sur la carte sélectionnée
                this.classList.add('correct');
                this.querySelector('.option-feedback').innerHTML = '✅ <span>Bonne réponse !</span>';
            } else {
                // Effet rouge sur la carte sélectionnée
                this.classList.add('incorrect');
                this.querySelector('.option-feedback').innerHTML = '❌ <span>Mauvaise réponse</span>';

                // Afficher la bonne réponse en vert
                document.querySelectorAll('.quiz-option-card').forEach(c => {
                    if (c.dataset.correct === 'true') {
                        c.classList.add('correct');
                        c.querySelector('.option-feedback').innerHTML = '✅ <span>Réponse correcte</span>';
                    }
                });
            }

            // Passer à la question suivante après un délai (pour voir le feedback)
            setTimeout(() => {
                currentQuizIndex++;

                if (currentQuizIndex >= quizQuestions.length) {
                    quizTermine = true;
                }

                renderQuiz();
            }, 1500); // 1.5 seconde pour voir le feedback
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

function melangerOptions(question) {
    // Créer une copie des options avec leur index original
    const optionsAvecIndex = question.options.map((opt, index) => ({
        ...opt,
        indexOriginal: index
    }));

    // Mélanger avec Fisher-Yates
    for (let i = optionsAvecIndex.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionsAvecIndex[i], optionsAvecIndex[j]] = [optionsAvecIndex[j], optionsAvecIndex[i]];
    }

    // Trouver le nouvel index de la bonne réponse
    const nouvelIndexCorrect = optionsAvecIndex.findIndex(opt => opt.indexOriginal === question.correct);

    return {
        ...question,
        options: optionsAvecIndex,
        correct: nouvelIndexCorrect
    };
}

function selectionnerQuestionsAleatoires(nombreTotal) {
    const toutesLesQuestions = [...DATA.questions];
    
    // Mélanger les questions
    for (let i = toutesLesQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [toutesLesQuestions[i], toutesLesQuestions[j]] = [toutesLesQuestions[j], toutesLesQuestions[i]];
    }
    
    // Prendre les 10 premières et mélanger leurs options
    return toutesLesQuestions
        .slice(0, Math.min(nombreTotal, toutesLesQuestions.length))
        .map(q => melangerOptions(q));
}

function renderQuizTermine(alreadyCompleted) {
    const totalQuestions = quizQuestions.length;
    const nbReponses = quizQuestions.filter(q => 
        state.quizAnswers[q.id] !== undefined && 
        state.quizAnswers[q.id] !== null && 
        state.quizAnswers[q.id] !== -1
    ).length;
    
    const toutesRepondues = nbReponses >= totalQuestions;
    const pourcentage = Math.round((nbReponses / totalQuestions) * 100);

    let html = '<h2>Quiz de culture générale informatique</h2>';
    if (alreadyCompleted) html += '<p style="color: #28a745; font-weight:500;">✅ Cette étape a déjà été validée.</p>';

    html += `
        <div class="quiz-completed-container">
            <div class="quiz-completed-header">
                <div class="quiz-completed-icon">${toutesRepondues ? '🎉' : '📝'}</div>
                <h3>${toutesRepondues ? 'Quiz terminé avec succès !' : 'Quiz terminé'}</h3>
            </div>

            <div class="quiz-completed-progress">
                <div class="quiz-progress-bar">
                    <div class="quiz-progress-fill ${toutesRepondues ? 'complete' : ''}" style="width: ${pourcentage}%"></div>
                </div>
                <div class="quiz-progress-label">
                    <span>${nbReponses} / ${totalQuestions} questions</span>
                    <span>${pourcentage}%</span>
                </div>
            </div>

            <div class="quiz-completed-message">
                ${toutesRepondues 
                    ? '<p>✅ <strong>Excellent !</strong> Toutes les questions sont répondues. Vos points sont comptabilisés pour l\'évaluation finale.</p>'
                    : `<p>⚠️ Il vous manque <strong>${totalQuestions - nbReponses} réponse(s)</strong>. Répondez à toutes les questions pour débloquer le bouton Suivant.</p>`
                }
            </div>

            <div class="quiz-completed-actions">
                <button id="quiz-restart" class="btn-primary btn-quiz-action">
                    🔄 Refaire le quiz
                </button>
            </div>
        </div>
    `;

    content.innerHTML = html;
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
    if (alreadyCompleted) {
        html += '<p style="color: #28a745; font-weight:500;">✅ Cette étape a déjà été validée. Vous pouvez modifier votre sélection.</p>';
    }
    html += '<p>Cochez les compétences que vous maîtrisez déjà, classées par filière :</p>';
    html += '<div class="prerequis-container">';

    // Couleurs par filière
    const filiereColors = {
        gl: { bg: 'rgba(37, 99, 235, 0.06)', border: 'rgba(37, 99, 235, 0.25)', accent: '#2563eb' },
        dm: { bg: 'rgba(124, 58, 237, 0.06)', border: 'rgba(124, 58, 237, 0.25)', accent: '#7c3aed' },
        reseau: { bg: 'rgba(5, 150, 105, 0.06)', border: 'rgba(5, 150, 105, 0.25)', accent: '#059669' },
        msi: { bg: 'rgba(234, 88, 12, 0.06)', border: 'rgba(234, 88, 12, 0.25)', accent: '#ea580c' },
        asr: { bg: 'rgba(220, 38, 38, 0.06)', border: 'rgba(220, 38, 38, 0.25)', accent: '#dc2626' }
    };

    DATA.specialisations.forEach(spe => {
        const prerequisFiliere = DATA.prerequis.filter(pre => pre.filières.includes(spe.id));
        if (prerequisFiliere.length === 0) return;

        const nbCoches = prerequisFiliere.filter(pre => state.prerequis.includes(pre.id)).length;
        const total = prerequisFiliere.length;
        const toutesCochees = nbCoches === total && total > 0;
        const colors = filiereColors[spe.id] || filiereColors.gl;

        html += `
            <div class="prerequis-card" style="border-color: ${toutesCochees ? colors.accent : colors.border}; background: ${toutesCochees ? colors.bg : 'var(--card-bg)'};">
                <div class="prerequis-card-header" style="border-bottom-color: ${colors.border};">
                    <div class="prerequis-header-left">
                        <span class="prerequis-dot" style="background: ${colors.accent};"></span>
                        <h3>${spe.nom}</h3>
                    </div>
                    <span class="prerequis-count ${toutesCochees ? 'all-checked' : ''}" style="${toutesCochees ? 'background: ' + colors.accent + '; color: #fff;' : ''}">
                        ${nbCoches}/${total}
                    </span>
                </div>
                <div class="prerequis-list">`;

        prerequisFiliere.forEach(pre => {
            const checked = state.prerequis.includes(pre.id) ? 'checked' : '';
            html += `
                    <label class="prerequis-item">
                        <input type="checkbox" value="${pre.id}" ${checked}>
                        <span class="prerequis-checkbox"></span>
                        <span class="prerequis-text">${pre.description}</span>
                    </label>`;
        });

        html += `
                </div>
                ${toutesCochees ? '<div class="prerequis-complete-badge">✅ Tous les prérequis maîtrisés</div>' : ''}
            </div>`;
    });

    html += '</div>';
    content.innerHTML = html;

    function updateCounters() {
        document.querySelectorAll('.prerequis-card').forEach(card => {
            const checkboxes = card.querySelectorAll('input[type="checkbox"]');
            const total = checkboxes.length;
            const coches = card.querySelectorAll('input[type="checkbox"]:checked').length;
            const countSpan = card.querySelector('.prerequis-count');
            const badge = card.querySelector('.prerequis-complete-badge');
            
            countSpan.textContent = `${coches}/${total}`;
            
            if (coches === total && total > 0) {
                countSpan.classList.add('all-checked');
                if (!badge) {
                    const newBadge = document.createElement('div');
                    newBadge.className = 'prerequis-complete-badge';
                    newBadge.textContent = '✅ Tous les prérequis maîtrisés';
                    card.appendChild(newBadge);
                }
            } else {
                countSpan.classList.remove('all-checked');
                if (badge) badge.remove();
            }
        });
    }

    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const preId = cb.value;
            
            if (cb.checked) {
                // Ajouter ce prérequis s'il n'y est pas déjà
                if (!state.prerequis.includes(preId)) {
                    state.prerequis.push(preId);
                }
            } else {
                // Retirer ce prérequis
                state.prerequis = state.prerequis.filter(id => id !== preId);
            }
            
            // Synchroniser toutes les cases à cocher ayant le même ID
            document.querySelectorAll(`input[type="checkbox"][value="${preId}"]`).forEach(otherCb => {
                otherCb.checked = cb.checked;
            });
            
            // Mettre à jour les compteurs de toutes les cartes
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
        html += '<p style="color: var(--primary); margin-bottom:1.5rem;">📊 <strong>Orientation neutre :</strong> Vous n\'aviez pas de préférence particulière. Notre recommandation est basée sur vos notes, le quiz et vos compétences.</p>';
    } else if (hasPassions) {
        html += '<p style="color: var(--primary); margin-bottom:1.5rem;">🎯 <strong>Orientation personnalisée :</strong> Nous avons pris en compte vos passions tout en analysant objectivement vos notes, le quiz et vos compétences.</p>';
    } else {
        html += '<p style="color: var(--primary); margin-bottom:1.5rem;">📋 <strong>Orientation générale :</strong> Notre analyse est basée sur l\'ensemble de vos résultats.</p>';
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
        const isTop2 = index < 2;

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
                    <div class="chart-bar ${isTop2 ? 'top-bar' : ''}" 
                         style="width: ${percentage}%; background: ${color};"
                         data-nom="${item.nom}"
                         data-score="${item.score} pts${difference !== null ? (difference > 0 ? ' +'+difference : difference < 0 ? ' '+difference : ' =') : ''}">
                    </div>
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
                    <p><strong>Pourquoi ?</strong> 
                    ${hasNoIdea 
                        ? 'Cette filière correspond le mieux à vos résultats objectifs (notes, quiz, compétences).' 
                        : hasPassions && index === 0 && state.passions.includes(spe.id)
                            ? 'Cette filière correspond à la fois à vos passions et à vos résultats objectifs !'
                            : 'Vos résultats (notes, passions, quiz, compétences) convergent vers cette filière.'
                    }
                    </p>
                </div>`;
        });
    }
    html += '</div>';

    // Section Ressources
    html += '<div class="results-ressources">';
    html += '<h3>📚 Ressources pour aller plus loin</h3>';
    html += '<p>Cliquez sur une filière pour voir les ressources disponibles :</p>';
    html += '<div class="ressources-actions" id="ressources-buttons">';
    resultats.forEach((spe) => {
        html += `
            <button class="btn-ressource" data-filiere="${spe.id}" data-nom="${spe.nom.replace(/"/g, '&quot;')}">
                📖 Ressources pour ${spe.nom}
            </button>`;
    });
    html += '</div>';
    html += '<div id="ressources-detail" class="ressources-detail" style="display:none;"></div>';
    html += '</div>';

    // Bouton recommencer
    html += `
        <div class="restart-container">
            <div class="restart-divider"><span>ou</span></div>
            <button id="restart-btn" class="btn-restart">
                <span class="restart-icon">🔄</span>
                <span class="restart-text">
                    <strong>Nouvelle évaluation</strong>
                    <small>Recommencer avec de nouvelles données</small>
                </span>
                <span class="restart-arrow">→</span>
            </button>
        </div>
    `;

    content.innerHTML = html;

    // Écouteurs pour les boutons de ressources
    document.querySelectorAll('.btn-ressource').forEach(btn => {
        btn.addEventListener('click', function() {
            const filiereId = this.dataset.filiere;
            const filiereNom = this.dataset.nom;
            afficherRessources(filiereId, filiereNom);
        });
    });

    // Animation des barres
    setTimeout(() => {
        document.querySelectorAll('.chart-bar').forEach(bar => {
            bar.style.transition = 'width 1s ease';
        });
    }, 100);

    // Bouton recommencer
    document.getElementById('restart-btn')?.addEventListener('click', () => {
        quizQuestions = [];
        currentQuizIndex = 0;
        quizTermine = false;
        sessionStorage.removeItem('orientationProgress');
        sessionStorage.removeItem('quizCurrent');
        sessionStorage.removeItem('completedSteps');
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
// AFFICHAGE DES RESSOURCES
// ==========================================

async function afficherRessources(filiereId, filiereNom) {
    const detailDiv = document.getElementById('ressources-detail');
    
    if (!detailDiv) {
        console.error('❌ Élément ressources-detail non trouvé');
        return;
    }

    // Afficher un loader
    detailDiv.style.display = 'block';
    detailDiv.innerHTML = '<p style="text-align:center; padding:1rem;">⏳ Chargement des ressources...</p>';
    detailDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        console.log('📚 Chargement ressources pour:', filiereId);
        const response = await fetch(`/api/ressources/${filiereId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            detailDiv.innerHTML = '<p style="color:red; padding:1rem;">❌ Ressources non disponibles pour cette filière.</p>';
            return;
        }

        const r = data.ressources;
        let html = `
            <div class="ressources-container">
                <div class="ressources-header">
                    <h4>📚 ${r.nom}</h4>
                    <button class="ressources-close" onclick="document.getElementById('ressources-detail').style.display='none'">✕</button>
                </div>
                <div class="ressources-body">
        `;

        // Section PDF
        if (r.pdfs && r.pdfs.length > 0) {
            html += '<div class="ressource-section">';
            html += '<h5>📄 Documents PDF à télécharger</h5>';
            html += '<div class="pdf-list">';
            r.pdfs.forEach(pdf => {
                html += `
                    <a href="/api/download-pdf/${filiereId}/${encodeURIComponent(pdf.fichier)}" class="pdf-item" download>
                        <span class="pdf-icon">📕</span>
                        <div class="pdf-info">
                            <span class="pdf-nom">${pdf.nom}</span>
                            <span class="pdf-taille">${formatTaille(pdf.taille)}</span>
                        </div>
                        <span class="pdf-download">⬇ Télécharger</span>
                    </a>`;
            });
            html += '</div></div>';
        } else {
            html += '<div class="ressource-section">';
            html += '<h5>📄 Documents PDF</h5>';
            html += '<p style="opacity:0.6; font-style:italic;">Aucun PDF disponible pour le moment dans cette filière.</p>';
            html += '</div>';
        }

        // Section Sites web
        if (r.sites && r.sites.length > 0) {
            html += '<div class="ressource-section">';
            html += '<h5>🌐 Sites recommandés pour apprendre</h5>';
            html += '<div class="sites-list">';
            r.sites.forEach(site => {
                html += `
                    <a href="${site.url}" target="_blank" rel="noopener" class="site-item">
                        <span class="site-icon">🔗</span>
                        <div class="site-info">
                            <strong>${site.nom}</strong>
                            <p>${site.description}</p>
                        </div>
                        <span class="site-arrow">→</span>
                    </a>`;
            });
            html += '</div></div>';
        }

        // Section Livres
        if (r.livres && r.livres.length > 0) {
            html += '<div class="ressource-section">';
            html += '<h5>📖 Livres recommandés</h5>';
            html += '<div class="livres-list">';
            r.livres.forEach(livre => {
                html += `
                    <div class="livre-item">
                        <span class="livre-icon">📘</span>
                        <span><strong>${livre.nom}</strong> - ${livre.auteur}</span>
                    </div>`;
            });
            html += '</div></div>';
        }

        html += '</div></div>';
        detailDiv.innerHTML = html;
        detailDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
        console.error('❌ Erreur chargement ressources:', err);
        detailDiv.innerHTML = '<p style="color:red; padding:1rem;">❌ Erreur lors du chargement des ressources. Veuillez réessayer.</p>';
    }
}

// Formater la taille des fichiers
function formatTaille(octets) {
    if (!octets || octets === 0) return '0 Ko';
    const ko = octets / 1024;
    if (ko < 1024) return `${Math.round(ko)} Ko`;
    const mo = ko / 1024;
    return `${Math.round(mo * 10) / 10} Mo`;
}

// Rendre les fonctions accessibles globalement
window.afficherRessources = afficherRessources;
window.formatTaille = formatTaille;

// Rendre la fonction accessible globalement
window.afficherRessources = afficherRessources;

// ==========================================
// NAVIGATION
// ==========================================
function nextStep() {
    // Si on est à la dernière étape, afficher le message d'au revoir
    if (currentStep === TOTAL_STEPS) {
        showGoodbyeOverlay();
        return;
    }

    if (!isStepValid(currentStep)) {
        showValidationError(getValidationMessage(currentStep));
        return;
    }

    completedSteps.add(currentStep);

    if (currentStep < TOTAL_STEPS) {
        currentStep++;
        window.scrollTo({ top: 0, behavior: 'instant' });
        renderStep();
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        // Remonter en haut
        window.scrollTo({ top: 0, behavior: 'instant' });
        renderStep();
    }
}
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

// ==========================================
// BOUTONS DE SCROLL RAPIDE
// ==========================================
const scrollUpBtn = document.getElementById('scroll-up-btn');
const scrollDownBtn = document.getElementById('scroll-down-btn');
let scrollTimeout;

// Détecter si on est sur mobile
const isMobile = window.matchMedia('(max-width: 600px)').matches;

function updateScrollButtons() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    const isAtTop = scrollTop < 100;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 100;

    // Afficher les boutons
    scrollUpBtn.style.display = 'flex';
    scrollDownBtn.style.display = 'flex';

    // Gérer le bouton "haut"
    if (isAtTop) {
        scrollUpBtn.style.opacity = '0.4';
        scrollUpBtn.style.pointerEvents = 'none';
    } else {
        scrollUpBtn.style.opacity = '0.8';
        scrollUpBtn.style.pointerEvents = 'auto';
    }

    // Gérer le bouton "bas"
    if (isAtBottom) {
        scrollDownBtn.style.opacity = '0.4';
        scrollDownBtn.style.pointerEvents = 'none';
    } else {
        scrollDownBtn.style.opacity = '0.8';
        scrollDownBtn.style.pointerEvents = 'auto';
    }

    // Délai avant disparition : 2 secondes sur mobile, 3 secondes sur desktop
    const delay = isMobile ? 2000 : 3000;

    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        scrollUpBtn.style.opacity = '0';
        scrollDownBtn.style.opacity = '0';
        setTimeout(() => {
            if (scrollUpBtn.style.opacity === '0') {
                scrollUpBtn.style.display = 'none';
                scrollDownBtn.style.display = 'none';
            }
        }, 300);
    }, delay);
}

// Fonctions de scroll
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToBottom() {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
}

// Écouteurs d'événements
scrollUpBtn.addEventListener('click', scrollToTop);
scrollDownBtn.addEventListener('click', scrollToBottom);

// Afficher les boutons au scroll
window.addEventListener('scroll', () => {
    updateScrollButtons();
}, { passive: true });

// Afficher les boutons au mouvement tactile sur mobile
document.addEventListener('touchmove', () => {
    updateScrollButtons();
}, { passive: true });

// Afficher les boutons au mouvement de la souris sur desktop
document.addEventListener('mousemove', () => {
    if (scrollUpBtn.style.display === 'none') {
        updateScrollButtons();
    }
});

// Cacher les boutons après un clic sur un bouton
scrollUpBtn.addEventListener('click', () => {
    setTimeout(() => {
        scrollUpBtn.style.display = 'none';
        scrollDownBtn.style.display = 'none';
    }, 1000);
});

scrollDownBtn.addEventListener('click', () => {
    setTimeout(() => {
        scrollUpBtn.style.display = 'none';
        scrollDownBtn.style.display = 'none';
    }, 1000);
});

// Mettre à jour isMobile si la fenêtre est redimensionnée
window.matchMedia('(max-width: 600px)').addEventListener('change', (e) => {
    // Recalculer isMobile (on utilise e.matches directement)
    if (e.matches) {
        // Passage en mode mobile
        updateScrollButtons();
    }
});


nextBtn.addEventListener('click', nextStep);
prevBtn.addEventListener('click', prevStep);

logoutBtn.addEventListener('click', () => {
    quizQuestions = []; currentQuizIndex = 0; quizTermine = false;
    sessionStorage.removeItem('currentUser'); sessionStorage.removeItem('orientationProgress');
    sessionStorage.removeItem('quizCurrent'); sessionStorage.removeItem('completedSteps');
    window.location.href = '/login';
    showGoodbyeOverlay();
});