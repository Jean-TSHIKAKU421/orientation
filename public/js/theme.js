(function() {
    const toggleBtn = document.getElementById('theme-toggle');
    const html = document.documentElement;

    function applyTheme(theme) {
        if (theme === 'dark') {
            html.setAttribute('data-theme', 'dark');
        } else {
            html.removeAttribute('data-theme');
        }
        localStorage.setItem('theme', theme);

        // Sauvegarder côté serveur si l'utilisateur est connecté
        saveThemeToServer(theme);
    }

    // Sauvegarde du thème côté serveur
    async function saveThemeToServer(theme) {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        if (!currentUser || !currentUser.matricule) {
            console.log('ℹ️ Aucun utilisateur connecté, thème sauvegardé uniquement en local.');
            return;
        }

        try {
            const response = await fetch('/api/save-theme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matricule: currentUser.matricule,
                    theme: theme
                })
            });

            const data = await response.json();
            if (data.success) {
                console.log('✅ Thème sauvegardé sur le serveur :', theme);
            } else {
                console.error('❌ Erreur serveur :', data.message);
            }
        } catch (err) {
            console.error('❌ Erreur réseau sauvegarde thème :', err);
        }
    }

    // Appliquer le thème sauvegardé ou le thème système
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        applyTheme('dark');
    }

    // Bascule au clic
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const current = html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
            applyTheme(current === 'dark' ? 'light' : 'dark');
        });
    }

    // Optionnel : écouter les changements de préférence système
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
})();