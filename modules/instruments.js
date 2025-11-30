(function() {
  'use strict';

  // 15 Popular Tunings (4-7 strings)
  const TUNINGS = {
    // Guitar tunings
    'all-fourths-guitar': {
      name: 'All Fourths Guitar',
      strings: ['E2', 'A2', 'D3', 'G3', 'C4', 'F4'],
      category: 'Guitar'
    },
    'standard-guitar': {
      name: 'Standard Guitar',
      strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
      category: 'Guitar'
    },
    'drop-d-guitar': {
      name: 'Drop D Guitar',
      strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],
      category: 'Guitar'
    },
    'open-g-guitar': {
      name: 'Open G Guitar',
      strings: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'],
      category: 'Guitar'
    },
    'dadgad': {
      name: 'DADGAD',
      strings: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'],
      category: 'Guitar'
    },
    'standard-7-string': {
      name: 'Standard 7-String',
      strings: ['B1', 'E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
      category: 'Guitar'
    },

    // Bass tunings
    'standard-bass': {
      name: 'Standard Bass',
      strings: ['E1', 'A1', 'D2', 'G2'],
      category: 'Bass'
    },
    '5-string-bass': {
      name: '5-String Bass',
      strings: ['B0', 'E1', 'A1', 'D2', 'G2'],
      category: 'Bass'
    },
    '6-string-bass': {
      name: '6-String Bass',
      strings: ['B0', 'E1', 'A1', 'D2', 'G2', 'C3'],
      category: 'Bass'
    },
    'tenor-bass': {
      name: 'Tenor Bass',
      strings: ['C2', 'G2', 'D3', 'A3'],
      category: 'Bass'
    },
    'all-fourths-bass': {
      name: 'All Fourths Bass',
      strings: ['E1', 'A1', 'D2', 'G2', 'C3', 'F3'],
      category: 'Bass'
    },

    // Other instruments
    'standard-ukulele': {
      name: 'Standard Ukulele',
      strings: ['G4', 'C4', 'E4', 'A4'],
      category: 'Other'
    },
    'baritone-ukulele': {
      name: 'Baritone Ukulele',
      strings: ['D3', 'G3', 'B3', 'E4'],
      category: 'Other'
    },
    '5-string-banjo': {
      name: '5-String Banjo',
      strings: ['G4', 'D3', 'G3', 'B3', 'D4'],
      category: 'Other'
    },
    'mandolin': {
      name: 'Mandolin',
      strings: ['G3', 'D4', 'A4', 'E5'],
      category: 'Other'
    }
  };

  const DEFAULT_TUNING = 'all-fourths-guitar';

  // Get tuning data by key
  function getTuning(tuningKey) {
    return TUNINGS[tuningKey] || TUNINGS[DEFAULT_TUNING];
  }

  // Get string count for a tuning
  function getStringCount(tuningKey) {
    const tuning = getTuning(tuningKey);
    return tuning.strings.length;
  }

  // Get note at a specific string and fret position
  function getStringNote(tuningKey, stringIndex, fret) {
    const tuning = getTuning(tuningKey);
    const stringCount = tuning.strings.length;

    if (stringIndex < 0 || stringIndex >= stringCount || fret < 0) {
      return null;
    }

    const openNote = tuning.strings[stringIndex];
    const noteName = openNote.replace(/\d+/, '');
    const octave = parseInt(openNote.match(/\d+/)?.[0] || '4');

    if (!window.SlimSolo || !window.SlimSolo.MusicTheory) {
      return openNote;
    }

    const noteIndex = window.SlimSolo.MusicTheory.getNoteIndex(noteName);
    const newNoteIndex = (noteIndex + fret) % 12;
    const octaveChange = Math.floor((noteIndex + fret) / 12);

    return window.SlimSolo.MusicTheory.getNoteName(newNoteIndex) + (octave + octaveChange);
  }

  // Get tuning keys grouped by category (for dropdown)
  function getTuningsByCategory() {
    const categories = { Guitar: [], Bass: [], Other: [] };

    for (const [key, tuning] of Object.entries(TUNINGS)) {
      categories[tuning.category].push({
        key,
        name: tuning.name,
        stringCount: tuning.strings.length
      });
    }

    return categories;
  }

  // Backward compatibility: expose string count and tuning for default
  const BASS_TUNING = TUNINGS[DEFAULT_TUNING].strings;
  const STRING_COUNT = BASS_TUNING.length;

  window.SlimSolo = window.SlimSolo || {};
  window.SlimSolo.Instruments = {
    TUNINGS,
    DEFAULT_TUNING,
    getTuning,
    getStringCount,
    getStringNote,
    getTuningsByCategory,
    // Backward compatibility
    BASS_TUNING,
    STRING_COUNT
  };
})();
