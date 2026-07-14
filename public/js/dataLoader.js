const DATA = {};

async function loadData() {
    try {
        console.log('🔄 Chargement des données depuis MySQL...');

        const [speRes, questRes, prereqRes, temRes] = await Promise.all([
            fetch('/api/specialisations'),
            fetch('/api/questions'),
            fetch('/api/prerequis'),
            fetch('/api/temoignages')
        ]);

        if (!speRes.ok) throw new Error(`Erreur spécialisations: ${speRes.status}`);
        if (!questRes.ok) throw new Error(`Erreur questions: ${questRes.status}`);
        if (!prereqRes.ok) throw new Error(`Erreur prérequis: ${prereqRes.status}`);
        if (!temRes.ok) throw new Error(`Erreur témoignages: ${temRes.status}`);

        DATA.specialisations = await speRes.json();
        DATA.questions = await questRes.json();
        DATA.prerequis = await prereqRes.json();
        DATA.temoignages = await temRes.json();

        console.log('✅ Données chargées avec succès depuis MySQL :');
        console.log('   - Spécialisations :', DATA.specialisations.length);
        console.log('   - Questions :', DATA.questions.length);
        console.log('   - Prérequis :', DATA.prerequis.length);
        console.log('   - Témoignages :', DATA.temoignages.length);

        return true;
    } catch (err) {
        console.error('❌ Erreur lors du chargement des données :', err.message);
        return false;
    }
}