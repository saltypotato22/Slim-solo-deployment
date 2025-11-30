(function() {
  'use strict';

  let canvas, ctx;
  let layout = {};
  let currentTheme = 'light';
  let currentRenderState = null;

  // Visual constants - desktop defaults
  const NOTE_RADIUS = {
    STANDARD: 16,
    FIFTH: 18,
    ROOT: 20
  };

  // Mobile-specific larger note radii for touch
  const NOTE_RADIUS_MOBILE = {
    STANDARD: 20,
    FIFTH: 22,
    ROOT: 24
  };

  const OPEN_STRING_X_OFFSET = -20;
  const OPEN_STRING_LABEL_X_OFFSET = -35;

  // Click detection radius (larger on mobile for touch)
  const CLICK_RADIUS = 25;
  const CLICK_RADIUS_MOBILE = 40;

  const themes = {
    light: {
      fretboard: '#F5E6D3',
      frets: '#C0C0C0',
      strings: '#808080',
      blueCircle: '#3B82F6',
      blueSolid: '#3B82F6',
      root: '#DC2626',
      markers: '#D1D5DB',
      text: '#111827'
    },
    dark: {
      fretboard: '#1F1F1F',
      frets: '#4B5563',
      strings: '#6B7280',
      blueCircle: '#60A5FA',
      blueSolid: '#60A5FA',
      root: '#EF4444',
      markers: '#374151',
      text: '#F9FAFB'
    }
  };

  function init(canvasElement) {
    // Clean up any existing listeners first
    if (canvas) {
      dispose();
    }

    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    setupCanvas();

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleCanvasHover);
  }

  function dispose() {
    if (canvas) {
      canvas.removeEventListener('click', handleCanvasClick);
      canvas.removeEventListener('mousemove', handleCanvasHover);
    }
    currentRenderState = null;
  }

  function setupCanvas() {
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;

    // Minimal margin around canvas (4px total)
    const margin = 4;
    canvas.width = (container.clientWidth - margin) * dpr;
    canvas.height = (container.clientHeight - margin) * dpr;
    canvas.style.width = `${container.clientWidth - margin}px`;
    canvas.style.height = `${container.clientHeight - margin}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    calculateLayout();
  }

  function calculateLayout() {
    const displayWidth = canvas.width / (window.devicePixelRatio || 1);
    const displayHeight = canvas.height / (window.devicePixelRatio || 1);

    // Mobile detection: landscape phone (height < 500px)
    const isMobile = window.innerHeight < 500;

    // Responsive padding: smaller on mobile
    const padding = isMobile
      ? { top: 25, right: 25, bottom: 25, left: 35 }
      : { top: 60, right: 60, bottom: 60, left: 80 };

    const horizontalPadding = padding.left + padding.right;
    const verticalPadding = padding.top + padding.bottom;

    layout = {
      padding,
      width: displayWidth,
      height: displayHeight,
      fretboardWidth: displayWidth - horizontalPadding,
      fretboardHeight: displayHeight - verticalPadding,
      nutWidth: isMobile ? 4 : 8,
      stringSpacing: 0,
      fretPositions: [],
      fretCount: 21,
      isMobile
    };
  }

  function calculateFretPositions(fretCount) {
    const positions = [0];
    const availableWidth = layout.fretboardWidth - layout.nutWidth;
    const fretSpacing = availableWidth / fretCount;

    for (let i = 1; i <= fretCount; i++) {
      positions.push(i * fretSpacing);
    }

    return positions;
  }

  function findNoteAtPosition(x, y) {
    if (!currentRenderState || !currentRenderState.notePositions) return null;

    // Use larger click radius on mobile for touch
    const clickRadius = layout.isMobile ? CLICK_RADIUS_MOBILE : CLICK_RADIUS;

    for (const note of currentRenderState.notePositions) {
      const noteX = getNoteX(note.fret);
      const noteY = getNoteY(note.string, currentRenderState.stringCount);

      const distance = Math.sqrt((x - noteX) ** 2 + (y - noteY) ** 2);

      if (distance <= clickRadius) {
        return note;
      }
    }

    return null;
  }

  function handleCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = (event.clientX - rect.left) * (canvas.width / rect.width) / dpr;
    const y = (event.clientY - rect.top) * (canvas.height / rect.height) / dpr;

    if (!currentRenderState || !window.SlimSolo.onNoteClick) return;

    // Use larger click radius on mobile for touch
    const clickRadius = layout.isMobile ? CLICK_RADIUS_MOBILE : CLICK_RADIUS;
    const stringCount = currentRenderState.stringCount || 6;

    // Check all fret positions (chromatic)
    for (let stringIndex = 0; stringIndex < stringCount; stringIndex++) {
      for (let fret = 0; fret <= currentRenderState.fretCount; fret++) {
        const noteX = getNoteX(fret);
        const noteY = getNoteY(stringIndex, stringCount);
        const distance = Math.sqrt((x - noteX) ** 2 + (y - noteY) ** 2);

        if (distance <= clickRadius) {
          // Check if it's a root note (don't allow clicking roots)
          const scalePos = currentRenderState.notePositions?.find(p => p.string === stringIndex && p.fret === fret);
          if (scalePos && scalePos.isRoot) return;

          window.SlimSolo.onNoteClick(stringIndex, fret);
          return;
        }
      }
    }
  }

  function handleCanvasHover(event) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = (event.clientX - rect.left) * (canvas.width / rect.width) / dpr;
    const y = (event.clientY - rect.top) * (canvas.height / rect.height) / dpr;

    const note = findNoteAtPosition(x, y);
    canvas.style.cursor = (note && !note.isRoot) ? 'pointer' : 'default';
  }

  function render(state) {
    if (!canvas || !ctx) return;

    currentRenderState = state;
    window.lastRenderState = state;
    currentTheme = state.theme || 'light';
    const colors = themes[currentTheme];

    layout.fretCount = state.fretCount || 21;
    layout.stringSpacing = layout.fretboardHeight / (state.stringCount + 1);
    layout.fretPositions = calculateFretPositions(layout.fretCount);

    ctx.clearRect(0, 0, layout.width, layout.height);

    drawFretboard(colors);
    drawFrets(colors);
    drawFretMarkers(colors);
    drawStrings(colors, state.stringCount);
    drawNotes(state, colors);

    if (state.displayMode && state.displayMode !== 'none') {
      drawLabels(state, colors);
    }
  }

  function drawFretboard(colors) {
    ctx.fillStyle = colors.fretboard;
    ctx.fillRect(
      layout.padding.left,
      layout.padding.top,
      layout.fretboardWidth,
      layout.fretboardHeight
    );
  }

  function drawFrets(colors) {
    ctx.strokeStyle = colors.frets;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(layout.padding.left, layout.padding.top);
    ctx.lineTo(layout.padding.left, layout.padding.top + layout.fretboardHeight);
    ctx.stroke();

    for (let i = 1; i <= layout.fretCount; i++) {
      const x = layout.padding.left + layout.nutWidth + layout.fretPositions[i];
      ctx.lineWidth = i === 12 ? 3 : 2;

      ctx.beginPath();
      ctx.moveTo(x, layout.padding.top);
      ctx.lineTo(x, layout.padding.top + layout.fretboardHeight);
      ctx.stroke();
    }
  }

  function drawFretMarkers(colors) {
    const markers = [3, 5, 7, 9, 12, 15, 17, 19, 21];
    const doubleMarkers = [12, 24];

    ctx.fillStyle = colors.markers;

    markers.forEach(fret => {
      if (fret <= layout.fretCount) {
        const fretSpacing = (layout.fretboardWidth - layout.nutWidth) / layout.fretCount;
        const x = layout.padding.left + layout.nutWidth + (fret - 0.5) * fretSpacing;

        if (doubleMarkers.includes(fret)) {
          const y1 = layout.padding.top + layout.stringSpacing * 1.5;
          const y2 = layout.padding.top + layout.fretboardHeight - layout.stringSpacing * 1.5;

          ctx.beginPath();
          ctx.arc(x, y1, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, y2, 6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const y = layout.padding.top + layout.fretboardHeight / 2;
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  }

  function drawStrings(colors, stringCount) {
    ctx.strokeStyle = colors.strings;

    for (let i = 0; i < stringCount; i++) {
      const y = layout.padding.top + (stringCount - i) * layout.stringSpacing;
      const thickness = 1 + i * 0.3;
      ctx.lineWidth = thickness;

      ctx.beginPath();
      ctx.moveTo(layout.padding.left, y);
      ctx.lineTo(layout.padding.left + layout.fretboardWidth, y);
      ctx.stroke();
    }
  }


  function drawSolidNote(pos, color, radius, stringCount) {
    const x = getNoteX(pos.fret);
    const y = getNoteY(pos.string, stringCount);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRingNote(pos, color, radius, stringCount, backgroundColor) {
    const x = getNoteX(pos.fret);
    const y = getNoteY(pos.string, stringCount);

    ctx.fillStyle = backgroundColor;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawNotes(state, colors) {
    const stringCount = state.stringCount || 6;
    const fretStates = state.fretStates || new Map();

    // Use larger note radii on mobile for touch
    const radii = layout.isMobile ? NOTE_RADIUS_MOBILE : NOTE_RADIUS;

    for (let stringIndex = 0; stringIndex < stringCount; stringIndex++) {
      for (let fret = 0; fret <= state.fretCount; fret++) {
        const key = `${stringIndex}-${fret}`;
        const fretState = fretStates.get(key);
        const note = window.SlimSolo.Instruments.getStringNote(state.tuning, stringIndex, fret);
        const noteName = note ? note.replace(/\d+/, '') : '';
        const isRoot = noteName === state.rootNote;
        const pos = { string: stringIndex, fret };

        if (isRoot) {
          drawSolidNote(pos, colors.root, radii.ROOT, stringCount);
        } else if (fretState === 'blue-circle') {
          drawRingNote(pos, colors.blueCircle, radii.STANDARD, stringCount, colors.fretboard);
        } else if (fretState === 'blue-solid') {
          drawSolidNote(pos, colors.blueSolid, radii.STANDARD, stringCount);
        }
      }
    }
  }

  function drawLabels(state, colors) {
    if (!state.displayMode || state.displayMode === 'none') return;

    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const stringCount = state.stringCount || 6;
    const fretStates = state.fretStates || new Map();

    for (let stringIndex = 0; stringIndex < stringCount; stringIndex++) {
      for (let fret = 0; fret <= state.fretCount; fret++) {
        const key = `${stringIndex}-${fret}`;
        const fretState = fretStates.get(key);
        const note = window.SlimSolo.Instruments.getStringNote(state.tuning, stringIndex, fret);
        const noteName = note ? note.replace(/\d+/, '') : '';
        const isRoot = noteName === state.rootNote;

        if (isRoot || fretState === 'blue-solid' || fretState === 'blue-circle') {
          const x = getNoteX(fret);
          const y = getNoteY(stringIndex, stringCount);
          const interval = window.SlimSolo.MusicTheory.getInterval(state.rootNote, noteName);

          let label = '';

          // Root note always shows note name regardless of display mode
          if (isRoot) {
            label = noteName;
          } else {
            switch (state.displayMode) {
              case 'notes':
                label = noteName;
                break;
              case 'intervals':
                const intervalNames = ['1', 'm2', 'M2', 'm3', 'M3', 'P4', 'd5', 'P5', 'm6', 'M6', 'm7', 'M7'];
                label = intervalNames[interval] || '';
                break;
              case 'semitones':
                label = interval.toString();
                break;
              case 'semitonesString':
                if (interval >= 0 && interval <= 4) {
                  label = interval.toString();
                } else if (interval >= 5 && interval <= 9) {
                  label = (interval - 5).toString();
                } else if (interval >= 10 && interval <= 11) {
                  label = (interval - 10).toString();
                }
                break;
            }
          }

          if (label) {
            ctx.fillStyle = isRoot ? 'white' : colors.text;
            ctx.fillText(label, x, y);
          }
        }
      }
    }
  }

  function getNoteX(fret) {
    if (fret === 0) {
      return layout.padding.left + OPEN_STRING_X_OFFSET;
    }
    const fretSpacing = (layout.fretboardWidth - layout.nutWidth) / layout.fretCount;
    return layout.padding.left + layout.nutWidth + (fret - 0.5) * fretSpacing;
  }

  function getNoteY(stringIndex, stringCount) {
    return layout.padding.top + (stringCount - stringIndex) * layout.stringSpacing;
  }

  function resize() {
    setupCanvas();
  }

  window.SlimSolo = window.SlimSolo || {};
  window.SlimSolo.FretboardCanvas = {
    init,
    render,
    resize,
    dispose,
    themes
  };
})();