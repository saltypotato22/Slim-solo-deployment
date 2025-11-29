(function() {
  'use strict';

  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const ENHARMONICS = {
    'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'
  };

  // 18 Essential Scales from CSV (alphabetical order)
  const SCALES = {
    blues: [0, 3, 5, 6, 7, 10],
    bluesMajor: [0, 2, 3, 4, 7, 9],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    harmonicMajor: [0, 2, 4, 5, 7, 8, 11],
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
    hungarianMinor: [0, 2, 3, 6, 7, 8, 11],
    inSen: [0, 1, 5, 7, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    major: [0, 2, 4, 5, 7, 9, 11],
    majorPentatonic: [0, 2, 4, 7, 9],
    melodicMinor: [0, 2, 3, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    minorPentatonic: [0, 3, 5, 7, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    persian: [0, 1, 4, 5, 6, 8, 11],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    phrygianDominant: [0, 1, 4, 5, 7, 8, 10]
  };

  // Pattern notation for bass fretboard (from CSV)
  const SCALE_PATTERNS = {
    blues: '0-3 / 0-1-2 / 0',
    bluesMajor: '0-2-3-4 / 2-4 /',
    dorian: '0-2-3 / 0-2-4 / 0',
    harmonicMajor: '0-2-4 / 0-2-3 / 1',
    harmonicMinor: '0-2-3 / 0-2-3 / 1',
    hungarianMinor: '0-2-3 / 1-2-3 / 1',
    inSen: '0-1 / 0-2 / 0',
    locrian: '0-1-3 / 0-1-3 / 0',
    lydian: '0-2-4 / 1-2-4 / 1',
    major: '0-2-4 / 0-2-4 / 1',
    majorPentatonic: '0-2-4 / 2-4 /',
    melodicMinor: '0-2-3 / 0-2-4 / 1',
    minor: '0-2-3 / 0-2-3 / 0',
    minorPentatonic: '0-3 / 0-2 / 0',
    mixolydian: '0-2-4 / 0-2-4 / 0',
    persian: '0-1-4 / 0-1-3 / 1',
    phrygian: '0-1-3 / 0-2-3 / 0',
    phrygianDominant: '0-1-4 / 0-2-3 / 0'
  };

  const MODES = {
    major: {
      ionian: 0,
      dorian: 1,
      phrygian: 2,
      lydian: 3,
      mixolydian: 4,
      aeolian: 5,
      locrian: 6
    },
    harmonicMinor: {
      harmonicMinor: 0,
      locrian6: 1,
      ionianSharp5: 2,
      dorianSharp4: 3,
      phrygianDominant: 4,
      lydianSharp2: 5,
      superLocrianBb7: 6
    },
    melodicMinor: {
      melodicMinor: 0,
      dorianB2: 1,
      lydianAugmented: 2,
      lydianDominant: 3,
      mixolydianB6: 4,
      locrianNat2: 5,
      altered: 6
    }
  };

  const MODE_FORMULAS = {
    ionian: [0, 2, 4, 5, 7, 9, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    aeolian: [0, 2, 3, 5, 7, 8, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10],
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
    locrian6: [0, 1, 3, 5, 6, 9, 10],
    ionianSharp5: [0, 2, 4, 5, 8, 9, 11],
    dorianSharp4: [0, 2, 3, 6, 7, 9, 10],
    phrygianDominant: [0, 1, 4, 5, 7, 8, 10],
    lydianSharp2: [0, 3, 4, 6, 7, 9, 11],
    superLocrianBb7: [0, 1, 3, 4, 6, 8, 9],
    melodicMinor: [0, 2, 3, 5, 7, 9, 11],
    dorianB2: [0, 1, 3, 5, 7, 9, 10],
    lydianAugmented: [0, 2, 4, 6, 8, 9, 11],
    lydianDominant: [0, 2, 4, 6, 7, 9, 10],
    mixolydianB6: [0, 2, 4, 5, 7, 8, 10],
    locrianNat2: [0, 2, 3, 5, 6, 8, 10],
    altered: [0, 1, 3, 4, 6, 8, 10]
  };

  function getNoteIndex(note) {
    const noteName = note.replace(/\d+/, '');
    return NOTES.indexOf(noteName);
  }

  function getNoteName(index) {
    return NOTES[index % 12];
  }

  function getScaleNotes(root, scaleType, mode) {
    const rootIndex = getNoteIndex(root);
    let intervals;

    if (mode && mode !== scaleType) {
      if (MODE_FORMULAS[mode]) {
        intervals = MODE_FORMULAS[mode];
      } else {
        const scaleFamily = Object.keys(MODES).find(family =>
          MODES[family][mode] !== undefined
        );
        if (scaleFamily && SCALES[scaleFamily]) {
          const modeOffset = MODES[scaleFamily][mode];
          const baseScale = SCALES[scaleFamily];
          intervals = [];
          for (let i = 0; i < baseScale.length; i++) {
            const noteIndex = (baseScale[(i + modeOffset) % baseScale.length] - baseScale[modeOffset] + 12) % 12;
            intervals.push(noteIndex);
          }
        } else {
          intervals = SCALES[scaleType] || SCALES.major;
        }
      }
    } else {
      intervals = SCALES[scaleType] || SCALES.major;
    }

    return intervals.map(interval =>
      getNoteName((rootIndex + interval) % 12)
    );
  }

  function getInterval(root, note) {
    const rootIndex = getNoteIndex(root);
    const noteIndex = getNoteIndex(note);
    return (noteIndex - rootIndex + 12) % 12;
  }

  function isNoteInScale(note, scaleNotes) {
    const noteName = note.replace(/\d+/, '');
    return scaleNotes.some(scaleNote => {
      return scaleNote === noteName ||
             ENHARMONICS[scaleNote] === noteName ||
             ENHARMONICS[noteName] === scaleNote;
    });
  }

  function getNoteOctave(note) {
    const match = note.match(/\d+/);
    return match ? parseInt(match[0]) : 4;
  }

  function transposeNote(note, semitones) {
    const noteName = note.replace(/\d+/, '');
    const octave = getNoteOctave(note);
    const noteIndex = getNoteIndex(noteName);

    const newIndex = noteIndex + semitones;
    const octaveChange = Math.floor(newIndex / 12);
    const newNoteIndex = ((newIndex % 12) + 12) % 12;

    return getNoteName(newNoteIndex) + (octave + octaveChange);
  }

  function getScaleInfo() {
    const scaleInfo = {};
    Object.keys(SCALES).forEach(scale => {
      const formula = SCALES[scale];
      scaleInfo[scale] = {
        intervals: formula,
        noteCount: formula.length
      };
    });
    return scaleInfo;
  }

  function getModeInfo(scaleType) {
    return MODES[scaleType] || {};
  }

  function compareNoteArrays(notes1, notes2) {
    if (notes1.length !== notes2.length) return false;
    const sorted1 = [...notes1].map(n => n.replace(/\d+/, '')).sort();
    const sorted2 = [...notes2].map(n => n.replace(/\d+/, '')).sort();
    return sorted1.every((note, i) => note === sorted2[i]);
  }

  function detectScaleFromIntervals(intervals) {
    if (!intervals || intervals.length === 0) return null;

    const sortedIntervals = [...new Set(intervals)].sort((a, b) => a - b);

    for (const [scaleKey, scaleIntervals] of Object.entries(SCALES)) {
      if (sortedIntervals.length !== scaleIntervals.length) continue;

      if (sortedIntervals.every((interval, i) => interval === scaleIntervals[i])) {
        return scaleKey;
      }
    }

    return null;
  }

  // findEquivalentScales() has been replaced by CSV-based lookup
  // See modules/equivalentScalesData.js and data/equivalent_scales.csv

  // Format scale names for display (18 essential scales)
  function formatScaleName(scale) {
    const names = {
      // 18 Essential Scales (alphabetical)
      blues: 'Blues (Minor)',
      bluesMajor: 'Blues (Major)',
      dorian: 'Dorian',
      harmonicMajor: 'Harmonic Major',
      harmonicMinor: 'Harmonic Minor',
      hungarianMinor: 'Hungarian Minor',
      inSen: 'In-sen (Japanese)',
      locrian: 'Locrian',
      lydian: 'Lydian',
      major: 'Major',
      majorPentatonic: 'Major Pentatonic',
      melodicMinor: 'Melodic Minor',
      minor: 'Minor',
      minorPentatonic: 'Minor Pentatonic',
      mixolydian: 'Mixolydian',
      persian: 'Persian',
      phrygian: 'Phrygian',
      phrygianDominant: 'Phrygian Dominant (Maqam Hijaz)'
    };
    return names[scale] || scale;
  }

  function formatModeName(mode) {
    const names = {
      ionian: 'Ionian',
      dorian: 'Dorian',
      phrygian: 'Phrygian',
      lydian: 'Lydian',
      mixolydian: 'Mixolydian',
      aeolian: 'Aeolian',
      locrian: 'Locrian',
      harmonicMinor: 'Harmonic Minor',
      locrian6: 'Locrian ♮6',
      ionianSharp5: 'Ionian #5',
      dorianSharp4: 'Dorian #4',
      phrygianDominant: 'Phrygian Dominant',
      lydianSharp2: 'Lydian #2',
      superLocrianBb7: 'Super Locrian ♭♭7',
      melodicMinor: 'Melodic Minor',
      dorianB2: 'Dorian ♭2',
      lydianAugmented: 'Lydian Augmented',
      lydianDominant: 'Lydian Dominant',
      mixolydianB6: 'Mixolydian ♭6',
      locrianNat2: 'Locrian ♮2',
      altered: 'Altered'
    };
    return names[mode] || mode;
  }

  function getSemitonesBetweenNotes(note1, note2) {
    const note1Name = note1.replace(/\d+/, '');
    const note2Name = note2.replace(/\d+/, '');
    const octave1 = getNoteOctave(note1);
    const octave2 = getNoteOctave(note2);

    const index1 = getNoteIndex(note1Name);
    const index2 = getNoteIndex(note2Name);

    return (octave2 - octave1) * 12 + (index2 - index1);
  }

  function isSymmetricalTuning(tuning) {
    if (!tuning || tuning.length < 2) return false;

    const firstInterval = getSemitonesBetweenNotes(tuning[0], tuning[1]);

    for (let i = 1; i < tuning.length - 1; i++) {
      const interval = getSemitonesBetweenNotes(tuning[i], tuning[i + 1]);
      if (interval !== firstInterval) return false;
    }

    return true;
  }

  function getSymmetricalInterval(tuning) {
    if (!isSymmetricalTuning(tuning)) return null;
    return getSemitonesBetweenNotes(tuning[0], tuning[1]);
  }

  function findAllRootPositions(rootNote, tuning, fretCount) {
    const positions = [];
    const rootNoteName = rootNote.replace(/\d+/, '');
    const stringCount = window.SlimSolo.Instruments.STRING_COUNT;

    for (let stringIndex = 0; stringIndex < stringCount; stringIndex++) {
      for (let fret = 0; fret <= fretCount; fret++) {
        const note = window.SlimSolo.Instruments.getStringNote(stringIndex, fret);
        const noteName = note.replace(/\d+/, '');

        if (noteName === rootNoteName ||
            ENHARMONICS[noteName] === rootNoteName ||
            ENHARMONICS[rootNoteName] === noteName) {
          positions.push({
            string: stringIndex,
            fret: fret,
            note: note
          });
        }
      }
    }

    return positions;
  }

  function isValidPattern(pattern, scaleNotes) {
    // Check for no skipped frets and max 4 notes per string
    const notesByString = {};
    const noteSequence = [];

    // Sort pattern by string and fret
    const sortedPattern = [...pattern].sort((a, b) => {
      if (a.string !== b.string) return a.string - b.string;
      return a.fret - b.fret;
    });

    sortedPattern.forEach(note => {
      if (!notesByString[note.string]) {
        notesByString[note.string] = [];
      }
      notesByString[note.string].push(note);
      noteSequence.push(note.note.replace(/\d+/, ''));
    });

    // Check max 4 notes per string
    for (let string in notesByString) {
      const notes = notesByString[string];
      if (notes.length > 4) {
        return false;
      }

      // Check no large gaps on same string
      const frets = notes.map(n => n.fret).sort((a, b) => a - b);
      for (let i = 1; i < frets.length; i++) {
        const gap = frets[i] - frets[i - 1];
        if (gap > 2) {
          return false;
        }
      }
    }

    // Check that scale notes appear in order without skipping
    // when moving between strings
    let scaleIndex = scaleNotes.indexOf(noteSequence[0]);
    if (scaleIndex === -1) return false;

    for (let i = 1; i < noteSequence.length; i++) {
      const currentNote = noteSequence[i];
      const currentIndex = scaleNotes.indexOf(currentNote);

      if (currentIndex === -1) return false;

      // Allow only consecutive scale degrees or wrapping around
      const expectedNext = (scaleIndex + 1) % scaleNotes.length;
      const expectedNext2 = (scaleIndex + 2) % scaleNotes.length;

      if (currentIndex !== expectedNext && currentIndex !== expectedNext2 && currentIndex !== scaleIndex) {
        // Check if we're moving between strings
        const prevNote = sortedPattern[i - 1];
        const currNote = sortedPattern[i];

        if (prevNote.string !== currNote.string) {
          // When changing strings, we can't skip scale degrees
          return false;
        }
      }

      scaleIndex = currentIndex;
    }

    return true;
  }

  function findCentralRoot(rootNote, tuning, fretCount) {
    // Find a root note near the center of the fretboard
    const rootPositions = findAllRootPositions(rootNote, tuning, fretCount);
    if (rootPositions.length === 0) return null;

    const centerFret = Math.floor(fretCount / 2);
    const centerString = Math.floor(tuning.length / 2);

    // Find the root closest to the center
    let bestRoot = rootPositions[0];
    let bestDistance = Number.MAX_VALUE;

    rootPositions.forEach(pos => {
      const fretDistance = Math.abs(pos.fret - centerFret);
      const stringDistance = Math.abs(pos.string - centerString);
      const totalDistance = fretDistance + stringDistance * 3; // Weight string distance more

      if (totalDistance < bestDistance) {
        bestDistance = totalDistance;
        bestRoot = pos;
      }
    });

    return bestRoot;
  }

  function generatePatternsFromIntervals(rootNote, intervals, tuning, fretCount) {
    const rootIndex = getNoteIndex(rootNote);
    const scaleNotes = intervals.map(i => getNoteName((rootIndex + i) % 12));
    const centralRoot = findCentralRoot(rootNote, tuning, fretCount);

    if (!centralRoot) return [];

    const patterns = [];

    // Generate 2-string patterns around the central root
    for (let stringOffset = -1; stringOffset <= 0; stringOffset++) {
      const startString = Math.max(0, Math.min(tuning.length - 2, centralRoot.string + stringOffset));

      for (let fretOffset = -4; fretOffset <= 0; fretOffset++) {
        const startFret = Math.max(0, centralRoot.fret + fretOffset);
        const pattern = [];
        const foundNotes = new Map();
        const notesPerString = new Map();

        // Scan the pattern area
        const stringCount = window.SlimSolo.Instruments.STRING_COUNT;
        for (let string = startString; string <= startString + 1 && string < stringCount; string++) {
          let stringNoteCount = 0;
          let lastFretOnString = -999;

          for (let fret = startFret; fret <= Math.min(startFret + 8, fretCount); fret++) {
            const note = window.SlimSolo.Instruments.getStringNote(string, fret);
            const noteName = note.replace(/\d+/, '');

            if (isNoteInScale(note, scaleNotes)) {
              const interval = getInterval(rootNote, noteName);

              // Check if we can add this note
              if (!foundNotes.has(noteName) && stringNoteCount < 4) {
                // Check for skipped frets
                if (lastFretOnString === -999 || fret === lastFretOnString + 1 || fret === lastFretOnString + 2) {
                  foundNotes.set(noteName, true);
                  stringNoteCount++;
                  lastFretOnString = fret;

                  pattern.push({
                    string: string,
                    fret: fret,
                    note: note,
                    interval: interval,
                    isRoot: noteName === rootNote ||
                           ENHARMONICS[noteName] === rootNote ||
                           ENHARMONICS[rootNote] === noteName,
                    isFifth: interval === 7
                  });
                }
              }
            }
          }
          notesPerString.set(string, stringNoteCount);
        }

        // Validate pattern: no skipped frets, max 4 notes per string
        if (foundNotes.size === scaleNotes.length && isValidPattern(pattern, scaleNotes)) {
          patterns.push({
            type: '2-string',
            startString: startString,
            startFret: startFret,
            notes: pattern,
            stringRange: `${startString + 1}-${startString + 2}`,
            rootInPattern: pattern.some(n => n.string === centralRoot.string && n.fret === centralRoot.fret)
          });
        }
      }
    }

    // Generate 3-string patterns around the central root
    for (let stringOffset = -2; stringOffset <= 0; stringOffset++) {
      const startString = Math.max(0, Math.min(tuning.length - 3, centralRoot.string + stringOffset));

      for (let fretOffset = -3; fretOffset <= 0; fretOffset++) {
        const startFret = Math.max(0, centralRoot.fret + fretOffset);
        const pattern = [];
        const foundNotes = new Map();
        const notesPerString = new Map();

        // Scan the pattern area
        const stringCount = window.SlimSolo.Instruments.STRING_COUNT;
        for (let string = startString; string <= startString + 2 && string < stringCount; string++) {
          let stringNoteCount = 0;
          let lastFretOnString = -999;

          for (let fret = startFret; fret <= Math.min(startFret + 5, fretCount); fret++) {
            const note = window.SlimSolo.Instruments.getStringNote(string, fret);
            const noteName = note.replace(/\d+/, '');

            if (isNoteInScale(note, scaleNotes)) {
              const interval = getInterval(rootNote, noteName);

              // Check if we can add this note
              if (!foundNotes.has(noteName) && stringNoteCount < 4) {
                // Check for skipped frets
                if (lastFretOnString === -999 || fret === lastFretOnString + 1 || fret === lastFretOnString + 2) {
                  foundNotes.set(noteName, true);
                  stringNoteCount++;
                  lastFretOnString = fret;

                  pattern.push({
                    string: string,
                    fret: fret,
                    note: note,
                    interval: interval,
                    isRoot: noteName === rootNote ||
                           ENHARMONICS[noteName] === rootNote ||
                           ENHARMONICS[rootNote] === noteName,
                    isFifth: interval === 7
                  });
                }
              }
            }
          }
          notesPerString.set(string, stringNoteCount);
        }

        // Validate pattern
        if (foundNotes.size === scaleNotes.length && isValidPattern(pattern, scaleNotes)) {
          patterns.push({
            type: '3-string',
            startString: startString,
            startFret: startFret,
            notes: pattern,
            stringRange: `${startString + 1}-${startString + 3}`,
            rootInPattern: pattern.some(n => n.string === centralRoot.string && n.fret === centralRoot.fret)
          });
        }
      }
    }

    // Remove duplicates and sort by type and position
    const uniquePatterns = [];
    const seen = new Set();

    patterns.forEach(pattern => {
      const key = pattern.notes.map(n => `${n.string}-${n.fret}`).sort().join(',');
      if (!seen.has(key)) {
        seen.add(key);
        uniquePatterns.push(pattern);
      }
    });

    // Sort: prioritize patterns containing the central root, then by type
    return uniquePatterns.sort((a, b) => {
      if (a.rootInPattern && !b.rootInPattern) return -1;
      if (!a.rootInPattern && b.rootInPattern) return 1;
      if (a.type !== b.type) return a.type === '2-string' ? -1 : 1;
      return 0;
    });
  }

  function generatePatternsAroundRoot(rootNote, scaleType, mode, tuning, fretCount) {
    const scaleNotes = getScaleNotes(rootNote, scaleType, mode);
    const intervals = scaleNotes.map(note => getInterval(rootNote, note));
    return generatePatternsFromIntervals(rootNote, intervals, tuning, fretCount);
  }

  function getIntervalFromClick(string, fret, rootNote, tuning) {
    const note = window.SlimSolo.Instruments.getStringNote(string, fret);
    const noteName = note.replace(/\d+/, '');
    return getInterval(rootNote, noteName);
  }

  function findExactMatches(intervals, rootNote) {
    const matches = [];
    const intervalSet = new Set(intervals);

    NOTES.forEach(testRoot => {
      Object.keys(SCALES).forEach(testScale => {
        const scaleIntervals = SCALES[testScale];
        if (scaleIntervals.length === intervals.length) {
          const scaleSet = new Set(scaleIntervals);
          if ([...intervalSet].every(i => scaleSet.has(i)) &&
              [...scaleSet].every(i => intervalSet.has(i))) {
            const rootOffset = getInterval(rootNote, testRoot);
            const rotatedIntervals = scaleIntervals.map(i => (i - rootOffset + 12) % 12);
            const rotatedSet = new Set(rotatedIntervals);

            if ([...intervalSet].every(i => rotatedSet.has(i)) &&
                [...rotatedSet].every(i => intervalSet.has(i))) {
              matches.push({
                root: testRoot,
                scale: testScale,
                mode: null,
                label: `${testRoot} ${formatScaleName(testScale)}`
              });
            }
          }
        }
      });

      Object.keys(MODE_FORMULAS).forEach(testMode => {
        const modeIntervals = MODE_FORMULAS[testMode];
        if (modeIntervals.length === intervals.length) {
          const modeSet = new Set(modeIntervals);
          if ([...intervalSet].every(i => modeSet.has(i)) &&
              [...modeSet].every(i => intervalSet.has(i))) {
            const rootOffset = getInterval(rootNote, testRoot);
            const rotatedIntervals = modeIntervals.map(i => (i - rootOffset + 12) % 12);
            const rotatedSet = new Set(rotatedIntervals);

            if ([...intervalSet].every(i => rotatedSet.has(i)) &&
                [...rotatedSet].every(i => intervalSet.has(i))) {
              matches.push({
                root: testRoot,
                scale: null,
                mode: testMode,
                label: `${testRoot} ${formatModeName(testMode)}`
              });
            }
          }
        }
      });
    });

    const uniqueMatches = [];
    const seen = new Set();
    matches.forEach(match => {
      const key = `${match.root}-${match.scale || match.mode}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMatches.push(match);
      }
    });

    return uniqueMatches.sort((a, b) => {
      const aIndex = NOTES.indexOf(a.root);
      const bIndex = NOTES.indexOf(b.root);
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.label.localeCompare(b.label);
    });
  }

  function findContainedScales(intervals, rootNote) {
    const contained = [];
    const intervalSet = new Set(intervals);

    if (intervalSet.size < 4) return [];

    NOTES.forEach(testRoot => {
      Object.keys(SCALES).forEach(testScale => {
        const scaleIntervals = SCALES[testScale];

        if (scaleIntervals.length < intervalSet.size) {
          const rootOffset = getInterval(rootNote, testRoot);
          const rotatedIntervals = scaleIntervals.map(i => (i - rootOffset + 12) % 12);

          if (rotatedIntervals.every(i => intervalSet.has(i))) {
            const extraIntervals = [...intervalSet].filter(i => !rotatedIntervals.includes(i));
            const extraNotes = extraIntervals.map(i => getNoteName((getNoteIndex(rootNote) + i) % 12));

            contained.push({
              root: testRoot,
              scale: testScale,
              mode: null,
              label: `${testRoot} ${formatScaleName(testScale)}`,
              extraNotes: extraNotes,
              missingCount: extraIntervals.length
            });
          }
        }
      });

      Object.keys(MODE_FORMULAS).forEach(testMode => {
        const modeIntervals = MODE_FORMULAS[testMode];

        if (modeIntervals.length < intervalSet.size) {
          const rootOffset = getInterval(rootNote, testRoot);
          const rotatedIntervals = modeIntervals.map(i => (i - rootOffset + 12) % 12);

          if (rotatedIntervals.every(i => intervalSet.has(i))) {
            const extraIntervals = [...intervalSet].filter(i => !rotatedIntervals.includes(i));
            const extraNotes = extraIntervals.map(i => getNoteName((getNoteIndex(rootNote) + i) % 12));

            contained.push({
              root: testRoot,
              scale: null,
              mode: testMode,
              label: `${testRoot} ${formatModeName(testMode)}`,
              extraNotes: extraNotes,
              missingCount: extraIntervals.length
            });
          }
        }
      });
    });

    const uniqueContained = [];
    const seen = new Set();
    contained.forEach(item => {
      const key = `${item.root}-${item.scale || item.mode}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueContained.push(item);
      }
    });

    return uniqueContained
      .sort((a, b) => {
        if (a.missingCount !== b.missingCount) return a.missingCount - b.missingCount;
        const aIndex = NOTES.indexOf(a.root);
        const bIndex = NOTES.indexOf(b.root);
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.label.localeCompare(b.label);
      })
      .slice(0, 15);
  }

  const SCALE_POPULARITY = {
    major: 10,
    minor: 10,
    majorPentatonic: 9,
    minorPentatonic: 9,
    blues: 9,
    harmonicMinor: 8,
    dorian: 8,
    mixolydian: 8,
    melodicMinor: 7,
    aeolian: 7,
    phrygian: 6,
    lydian: 6,
    locrian: 5,
    phrygianDominant: 6,
    bebopDominant: 6,
    bebopMajor: 5,
    bebopMinor: 5,
    bebopDorian: 5,
    altered: 4,
    lydianDominant: 4,
    wholeTone: 4,
    lydianAugmented: 4,
    mixolydianB6: 4,
    locrianNat2: 4,
    diminishedWH: 3,
    diminishedHW: 3,
    augmented: 3,
    majorBlues: 3,
    chromatic: 2,
    hungarianMinor: 2,
    hungarianMajor: 2,
    persian: 2,
    arabian: 2,
    byzantine: 2,
    jewish: 2,
    spanish8Tone: 2,
    neapolitanMajor: 2,
    neapolitanMinor: 2,
    romanian: 2,
    doubleHarmonicMajor: 1,
    doubleHarmonicMinor: 1,
    prometheus: 1,
    tritone: 1,
    egyptian: 1,
    hirajoshi: 1,
    iwato: 1,
    inSen: 1,
    blues9Note: 1,
    lydianChromatic: 1,
    dorianB2: 3,
    locrian6: 3,
    ionianSharp5: 2,
    dorianSharp4: 2,
    lydianSharp2: 2,
    superLocrianBb7: 2,
    ionian: 10,
    harmonicMinor: 8
  };

  function getScalePopularity(scaleOrMode) {
    return SCALE_POPULARITY[scaleOrMode] || 0;
  }

  function detectAllScalesFromNotes(noteNames) {
    if (!noteNames || noteNames.length === 0) return [];

    const matches = [];
    const noteSet = new Set(noteNames.map(n => n.replace(/\d+/, '')));

    NOTES.forEach(testRoot => {
      const intervals = [];
      noteSet.forEach(noteName => {
        const interval = getInterval(testRoot, noteName);
        intervals.push(interval);
      });
      intervals.sort((a, b) => a - b);

      Object.keys(SCALES).forEach(testScale => {
        const scaleIntervals = SCALES[testScale];
        if (intervals.length !== scaleIntervals.length) return;

        if (intervals.every((interval, i) => interval === scaleIntervals[i])) {
          matches.push({
            root: testRoot,
            scale: testScale,
            mode: null,
            label: `${testRoot} ${formatScaleName(testScale)}`,
            popularity: getScalePopularity(testScale)
          });
        }
      });

      Object.keys(MODE_FORMULAS).forEach(testMode => {
        const modeIntervals = MODE_FORMULAS[testMode];
        if (intervals.length !== modeIntervals.length) return;

        if (intervals.every((interval, i) => interval === modeIntervals[i])) {
          matches.push({
            root: testRoot,
            scale: null,
            mode: testMode,
            label: `${testRoot} ${formatModeName(testMode)}`,
            popularity: getScalePopularity(testMode)
          });
        }
      });
    });

    const uniqueMatches = [];
    const seen = new Set();
    matches.forEach(match => {
      const key = `${match.root}-${match.scale || match.mode}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMatches.push(match);
      }
    });

    return uniqueMatches.sort((a, b) => {
      if (b.popularity !== a.popularity) return b.popularity - a.popularity;
      const aIndex = NOTES.indexOf(a.root);
      const bIndex = NOTES.indexOf(b.root);
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.label.localeCompare(b.label);
    });
  }

  function findMainListMatches(blueIntervals, rootNote) {
    if (!blueIntervals || blueIntervals.length === 0) return [];

    const matches = [];
    const intervalSet = new Set(blueIntervals);

    NOTES.forEach(testRoot => {
      Object.keys(SCALES).forEach(testScale => {
        const scaleIntervals = SCALES[testScale];
        if (scaleIntervals.length !== blueIntervals.length) return;

        const scaleSet = new Set(scaleIntervals);
        if ([...intervalSet].every(i => scaleSet.has(i)) &&
            [...scaleSet].every(i => intervalSet.has(i))) {
          const rootOffset = getInterval(rootNote, testRoot);
          const rotatedIntervals = scaleIntervals.map(i => (i - rootOffset + 12) % 12);
          const rotatedSet = new Set(rotatedIntervals);

          if ([...intervalSet].every(i => rotatedSet.has(i)) &&
              [...rotatedSet].every(i => intervalSet.has(i))) {
            matches.push({
              root: testRoot,
              scale: testScale,
              mode: null,
              label: `${testRoot} ${formatScaleName(testScale)}`,
              popularity: getScalePopularity(testScale)
            });
          }
        }
      });

      Object.keys(MODE_FORMULAS).forEach(testMode => {
        const modeIntervals = MODE_FORMULAS[testMode];
        if (modeIntervals.length !== blueIntervals.length) return;

        const modeSet = new Set(modeIntervals);
        if ([...intervalSet].every(i => modeSet.has(i)) &&
            [...modeSet].every(i => intervalSet.has(i))) {
          const rootOffset = getInterval(rootNote, testRoot);
          const rotatedIntervals = modeIntervals.map(i => (i - rootOffset + 12) % 12);
          const rotatedSet = new Set(rotatedIntervals);

          if ([...intervalSet].every(i => rotatedSet.has(i)) &&
              [...rotatedSet].every(i => intervalSet.has(i))) {
            matches.push({
              root: testRoot,
              scale: null,
              mode: testMode,
              label: `${testRoot} ${formatModeName(testMode)}`,
              popularity: getScalePopularity(testMode)
            });
          }
        }
      });
    });

    const uniqueMatches = [];
    const seen = new Set();
    matches.forEach(match => {
      const key = `${match.root}-${match.scale || match.mode}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMatches.push(match);
      }
    });

    return uniqueMatches.sort((a, b) => {
      if (b.popularity !== a.popularity) return b.popularity - a.popularity;
      const aIndex = NOTES.indexOf(a.root);
      const bIndex = NOTES.indexOf(b.root);
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.label.localeCompare(b.label);
    });
  }

  function findExtendedListMatches(blueIntervals, greenIntervals, rootNote) {
    if (!blueIntervals || blueIntervals.length === 0) return [];

    const allIntervals = [...blueIntervals, ...greenIntervals];
    const intervalSet = new Set(allIntervals);
    const matches = [];

    NOTES.forEach(testRoot => {
      Object.keys(SCALES).forEach(testScale => {
        const scaleIntervals = SCALES[testScale];
        const scaleSet = new Set(scaleIntervals);

        const rootOffset = getInterval(rootNote, testRoot);
        const rotatedIntervals = scaleIntervals.map(i => (i - rootOffset + 12) % 12);
        const rotatedSet = new Set(rotatedIntervals);

        if ([...intervalSet].every(i => rotatedSet.has(i))) {
          matches.push({
            root: testRoot,
            scale: testScale,
            mode: null,
            label: `${testRoot} ${formatScaleName(testScale)}`,
            popularity: getScalePopularity(testScale)
          });
        }
      });

      Object.keys(MODE_FORMULAS).forEach(testMode => {
        const modeIntervals = MODE_FORMULAS[testMode];
        const modeSet = new Set(modeIntervals);

        const rootOffset = getInterval(rootNote, testRoot);
        const rotatedIntervals = modeIntervals.map(i => (i - rootOffset + 12) % 12);
        const rotatedSet = new Set(rotatedIntervals);

        if ([...intervalSet].every(i => rotatedSet.has(i))) {
          matches.push({
            root: testRoot,
            scale: null,
            mode: testMode,
            label: `${testRoot} ${formatModeName(testMode)}`,
            popularity: getScalePopularity(testMode)
          });
        }
      });
    });

    const uniqueMatches = [];
    const seen = new Set();
    matches.forEach(match => {
      const key = `${match.root}-${match.scale || match.mode}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMatches.push(match);
      }
    });

    return uniqueMatches.sort((a, b) => {
      if (b.popularity !== a.popularity) return b.popularity - a.popularity;
      const aIndex = NOTES.indexOf(a.root);
      const bIndex = NOTES.indexOf(b.root);
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.label.localeCompare(b.label);
    }).slice(0, 20);
  }

  // findContainingScales removed - unused dead code

  window.SlimSolo = window.SlimSolo || {};
  window.SlimSolo.MusicTheory = {
    // Core data
    NOTES,
    ENHARMONICS,
    SCALES,
    SCALE_PATTERNS,
    MODES,
    MODE_FORMULAS,
    SCALE_POPULARITY,
    // Core functions
    getNoteIndex,
    getNoteName,
    getScaleNotes,
    getInterval,
    isNoteInScale,
    getNoteOctave,
    transposeNote,
    getScaleInfo,
    getModeInfo,
    compareNoteArrays,
    getSemitonesBetweenNotes,
    // Detection functions
    detectScaleFromIntervals,
    findMainListMatches,
    // Formatting
    formatScaleName,
    formatModeName,
    getScalePopularity
    // Removed unused: findContainingScales, findExactMatches, findContainedScales,
    // findExtendedListMatches, detectAllScalesFromNotes, getIntervalFromClick
  };
})();