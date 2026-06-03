const DATA = {};

async function loadData() {
    try {
        console.log('🔄 Chargement des données...');
        
        const [speRes, questRes, prereqRes, temRes] = await Promise.all([
            fetch('data/specialisations.json'),
            fetch('data/questions.json'),
            fetch('data/prerequis.json'),
            fetch('data/temoignages.json')
        ]);

        // Vérifier que toutes les réponses sont OK
        if (!speRes.ok) throw new Error(`Erreur specialisations.json: ${speRes.status}`);
        if (!questRes.ok) throw new Error(`Erreur questions.json: ${questRes.status}`);
        if (!prereqRes.ok) throw new Error(`Erreur prerequis.json: ${prereqRes.status}`);
        if (!temRes.ok) throw new Error(`Erreur temoignages.json: ${temRes.status}`);

        DATA.specialisations = await speRes.json();
        DATA.questions = await questRes.json();
        DATA.prerequis = await prereqRes.json();
        DATA.temoignages = await temRes.json();

        console.log('✅ Données chargées avec succès :');
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