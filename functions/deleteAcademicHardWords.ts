import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// מילים אקדמאיות קשות שאנו רוצים למחוק
const ACADEMIC_HARD_WORDS = [
  'philosophical', 'epistemological', 'ontological', 'phenomenological',
  'metaphysical', 'transcendental', 'categorical', 'dialectical',
  'hermeneutic', 'pragmatic', 'existential', 'anthropological',
  'sociological', 'etymological', 'syntactical', 'morphological',
  'anatomical', 'physiological', 'cytological', 'pathological',
  'epidemiological', 'pharmacological', 'seismological', 'mineralogical',
  'mycological', 'ornithological', 'ichthyological', 'entomological',
  'paleontological', 'archaeological', 'chronological', 'genealogical',
  'eschatological', 'apocalyptic', 'messianic', 'ecclesiastical',
  'sacramental', 'liturgical', 'homiletical', 'catechetical',
  'cosmological', 'teleological', 'axiological', 'deontological',
  'consequentialist', 'utilitarian', 'egalitarian', 'libertarian'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all vocabulary words with difficulty 3
    const allWords = await base44.entities.VocabularyWord.list();
    const hardWords = allWords.filter(w => w.difficulty_level === 3);

    // Find academic words to delete
    const wordsToDelete = hardWords.filter(word => {
      const normalizedEnglish = (word.word_english || '').toLowerCase().trim();
      return ACADEMIC_HARD_WORDS.some(academic => 
        normalizedEnglish.includes(academic.toLowerCase()) || 
        academic.toLowerCase().includes(normalizedEnglish)
      );
    });

    console.log(`Found ${wordsToDelete.length} academic hard words to delete`);

    // Delete them
    for (const word of wordsToDelete) {
      try {
        await base44.entities.VocabularyWord.delete(word.id);
        console.log(`✓ Deleted: ${word.word_english}`);
      } catch (err) {
        console.error(`Error deleting ${word.word_english}:`, err);
      }
    }

    return Response.json({
      success: true,
      deletedCount: wordsToDelete.length,
      deletedWords: wordsToDelete.map(w => ({ english: w.word_english, hebrew: w.word_hebrew }))
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});