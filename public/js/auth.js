// Détection de la page courante
const isLoginPage = !!document.getElementById('login-form');
const isRegisterPage = !!document.getElementById('register-form');

// --- Gestion de l'inscription ---
if (isRegisterPage) {
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const nom = document.getElementById('nom').value.trim();
        const matricule = document.getElementById('matricule').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const messageEl = document.getElementById('form-message');

        // Vérification rapide
        if (!nom || !matricule || !password) {
            messageEl.textContent = '❌ Nom, matricule et mot de passe sont obligatoires.';
            messageEl.style.color = 'red';
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nom, matricule, email, password })
            });

            const data = await response.json();

            if (data.success) {
                messageEl.textContent = '✅ Compte créé avec succès ! Redirection...';
                messageEl.style.color = 'green';
                setTimeout(() => { window.location.href = '/login'; }, 1500);
            } else {
                messageEl.textContent = '❌ ' + data.message;
                messageEl.style.color = 'red';
            }
        } catch (error) {
            console.error('Erreur réseau :', error);
            messageEl.textContent = '❌ Impossible de contacter le serveur.';
            messageEl.style.color = 'red';
        }
    });
}

// --- Gestion de la connexion ---
if (isLoginPage) {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const matricule = document.getElementById('matricule').value.trim();
        const password = document.getElementById('password').value;
        const messageEl = document.getElementById('form-message');

        if (!matricule || !password) {
            messageEl.textContent = '❌ Matricule et mot de passe sont obligatoires.';
            messageEl.style.color = 'red';
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matricule, password })
            });

            const data = await response.json();

            if (data.success) {
                // Stockage de l'utilisateur en session
                sessionStorage.setItem('currentUser', JSON.stringify(data.user));

                // Appliquer le thème sauvegardé de l'utilisateur
                if (data.user.theme) {
                    localStorage.setItem('theme', data.user.theme);
                    if (data.user.theme === 'dark') {
                        document.documentElement.setAttribute('data-theme', 'dark');
                    } else {
                        document.documentElement.removeAttribute('data-theme');
                    }
                }

                messageEl.textContent = '✅ Connexion réussie. Redirection...';
                messageEl.style.color = 'green';
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
            } else {
                messageEl.textContent = '❌ ' + data.message;
                messageEl.style.color = 'red';
            }
        } catch (error) {
            console.error('Erreur réseau :', error);
            messageEl.textContent = '❌ Impossible de contacter le serveur.';
            messageEl.style.color = 'red';
        }
    });
}

// Toggle visibilité du mot de passe
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', function () {
        const wrapper = this.closest('.password-wrapper');
        const input = wrapper.querySelector('input');
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        this.textContent = type === 'text' ? '🙈' : '👁️';
    });
});