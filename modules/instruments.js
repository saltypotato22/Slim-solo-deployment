(function() {
  'use strict';

  const BASS_TUNING = ['E1', 'A1', 'D2', 'G2', 'C3', 'F3'];
  const STRING_COUNT = 6;

  function getStringNote(stringIndex, fret) {
    if (stringIndex < 0 || stringIndex >= STRING_COUNT || fret < 0) {
      return null;
    }

    const openNote = BASS_TUNING[stringIndex];
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

  window.SlimSolo = window.SlimSolo || {};
  window.SlimSolo.Instruments = {
    BASS_TUNING,
    STRING_COUNT,
    getStringNote
  };
})();