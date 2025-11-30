(function() {
  'use strict';

  const { useState, useEffect, useCallback } = React;
  const html = htm.bind(React.createElement);

  // 18 essential scales (alphabetical order)
  const allScales = [
    'blues', 'bluesMajor', 'dorian', 'harmonicMajor', 'harmonicMinor', 'hungarianMinor',
    'inSen', 'locrian', 'lydian', 'major', 'majorPentatonic', 'melodicMinor',
    'minor', 'minorPentatonic', 'mixolydian', 'persian', 'phrygian', 'phrygianDominant'
  ];

  function TuningSelector({ state, dispatch, actions }) {
    const tuningsByCategory = window.SlimSolo.Instruments.getTuningsByCategory();
    const currentTuning = window.SlimSolo.Instruments.getTuning(state.tuning);

    // Get string notes without octave numbers (e.g., 'E2' -> 'E')
    const tuningNotes = currentTuning.strings.map(s => s.replace(/\d+/, '')).join(' ');

    const handleTuningChange = (e) => {
      dispatch({ type: actions.SET_TUNING, payload: e.target.value });
    };

    return html`
      <div class="space-y-1">
        <select
          class="block w-full rounded-md border-gray-300 shadow-sm text-xs"
          value=${state.tuning}
          onChange=${handleTuningChange}
          aria-label="Select tuning"
        >
          <optgroup label="Guitar">
            ${tuningsByCategory.Guitar.map(t => html`
              <option key=${t.key} value=${t.key}>
                ${t.name} (${t.stringCount})
              </option>
            `)}
          </optgroup>
          <optgroup label="Bass">
            ${tuningsByCategory.Bass.map(t => html`
              <option key=${t.key} value=${t.key}>
                ${t.name} (${t.stringCount})
              </option>
            `)}
          </optgroup>
          <optgroup label="Other">
            ${tuningsByCategory.Other.map(t => html`
              <option key=${t.key} value=${t.key}>
                ${t.name} (${t.stringCount})
              </option>
            `)}
          </optgroup>
        </select>
        <div class="text-xs text-gray-500 text-center font-mono">${tuningNotes}</div>
      </div>
    `;
  }

  function ScaleDropdown({ state, dispatch, actions }) {
    const displayedScale = state.isManuallyEdited
      ? (state.detectedScale || 'undefined')
      : state.scale;

    const handleScaleChange = (e) => {
      const selectedValue = e.target.value;
      if (selectedValue === 'undefined') return;
      dispatch({ type: actions.SET_SCALE, payload: selectedValue });
    };

    return html`
      <select
        class="block w-full rounded-md border-gray-300 shadow-sm text-sm"
        value=${displayedScale}
        onChange=${handleScaleChange}
        aria-label="Select scale or mode"
      >
        ${state.isManuallyEdited && !state.detectedScale
          ? html`<option key="undefined" value="undefined" disabled>Undefined</option>`
          : null}
        ${allScales.map(scale => html`
          <option key=${scale} value=${scale}>
            ${formatScaleName(scale)}
          </option>
        `)}
      </select>
    `;
  }

  function ScaleInfo({ state }) {
    const blueIntervals = state.blueIntervals || [];
    const rootIndex = window.SlimSolo.MusicTheory.getNoteIndex(state.rootNote);

    // Get notes from intervals
    const notes = blueIntervals.map(interval =>
      window.SlimSolo.MusicTheory.getNoteName((rootIndex + interval) % 12)
    );

    if (blueIntervals.length === 0) {
      return html`<div class="text-sm text-gray-500 dark:text-gray-400 font-mono">No notes</div>`;
    }

    return html`
      <div class="font-mono text-xs text-gray-700 dark:text-gray-300" aria-live="polite">
        <div class="flex flex-wrap">
          ${notes.map((note, i) => html`
            <span key=${i} class="w-5 text-center">${note}</span>
          `)}
        </div>
        <div class="flex flex-wrap text-gray-500 dark:text-gray-400">
          ${blueIntervals.map((interval, i) => html`
            <span key=${i} class="w-5 text-center">${interval}</span>
          `)}
        </div>
      </div>
    `;
  }

  function EquivalentScalesDropdown({ detectedScales, dispatch, actions, theme }) {
    const handleScaleChange = (e) => {
      const selectedIndex = parseInt(e.target.value);
      if (isNaN(selectedIndex) || selectedIndex < 0) return;

      const match = detectedScales[selectedIndex];
      const scale = match.scale || match.mode;
      const mode = match.mode || scale;
      dispatch({
        type: actions.SET_FROM_EQUIVALENT,
        payload: { root: match.root, scale, mode }
      });
    };

    return html`
      <div class="space-y-2">
        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Equivalent Scales (${detectedScales.length})
          <select
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
            onChange=${handleScaleChange}
            aria-label="Select equivalent scale"
          >
            <option value="-1">Select to switch...</option>
            ${detectedScales.map((match, index) => html`
              <option key="${match.root}-${match.scale || match.mode}" value=${index}>
                ${match.label}
              </option>
            `)}
          </select>
        </label>
      </div>
    `;
  }

  function formatModeName(mode) {
    const names = {
      ionian: 'Ionian',
      dorian: 'Dorian',
      phrygian: 'Phrygian',
      lydian: 'Lydian',
      mixolydian: 'Mixolydian',
      aeolian: 'Aeolian',
      locrian: 'Locrian'
    };
    return names[mode] || mode;
  }

  function RootNoteSelector({ state, dispatch, actions }) {
    const notes = window.SlimSolo.MusicTheory.NOTES;

    const handleTransposeChange = (e) => {
      dispatch({ type: actions.SET_ROOT_TRANSPOSE, payload: e.target.value });
    };

    return html`
      <div class="flex items-center gap-2">
        <label class="text-xs font-medium text-gray-700 dark:text-gray-300">Root</label>
        <select
          class="rounded-md border-gray-300 shadow-sm text-sm font-bold px-2 py-1"
          value=${state.rootNote}
          onChange=${handleTransposeChange}
          aria-label="Transpose scale to root"
        >
          ${notes.map(note => html`
            <option key=${note} value=${note}>${note}</option>
          `)}
        </select>
      </div>
    `;
  }

  function MoveRootSelector({ state, dispatch, actions }) {
    // Calculate available notes and their resulting scales
    const noteOptions = React.useMemo(() => {
      const blueIntervals = state.blueIntervals || [];
      const currentRootIndex = window.SlimSolo.MusicTheory.getNoteIndex(state.rootNote);

      // Get all notes currently on canvas
      const noteSet = new Set();
      blueIntervals.forEach(interval => {
        const noteName = window.SlimSolo.MusicTheory.getNoteName((currentRootIndex + interval) % 12);
        noteSet.add(noteName);
      });

      // For each note, calculate what scale would result if it became root
      const options = [];
      window.SlimSolo.MusicTheory.NOTES.filter(note => noteSet.has(note)).forEach(note => {
        const newRootIndex = window.SlimSolo.MusicTheory.getNoteIndex(note);

        // Recalculate intervals from the new root's perspective
        const newIntervals = blueIntervals.map(interval => {
          const absoluteNote = (currentRootIndex + interval) % 12;
          return (absoluteNote - newRootIndex + 12) % 12;
        }).sort((a, b) => a - b);

        // Detect what scale this would be
        const detectedScale = window.SlimSolo.MusicTheory.detectScaleFromIntervals(newIntervals);
        const scaleName = detectedScale ? formatScaleName(detectedScale) : 'Undefined';

        options.push({ note, scaleName });
      });

      return options;
    }, [state.blueIntervals, state.rootNote]);

    const handleMoveChange = (e) => {
      dispatch({ type: actions.SET_ROOT, payload: e.target.value });
    };

    return html`
      <div class="space-y-2">
        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">
          ↻ Move Root
          <select
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
              value=${state.rootNote}
            onChange=${handleMoveChange}
            aria-label="Move root (reinterpret notes)"
            title="Select root to reinterpret notes"
          >
            ${noteOptions.map(({ note, scaleName }) => html`
              <option key=${note} value=${note}>
                ${note} → ${scaleName}
              </option>
            `)}
          </select>
        </label>
      </div>
    `;
  }

  function FretCountSlider({ state, dispatch, actions }) {
    const fretOptions = Array.from({ length: 21 }, (_, i) => i + 4); // 4 to 24

    const handleFretChange = (e) => {
      const value = parseInt(e.target.value);
      if (!isNaN(value)) {
        dispatch({ type: actions.SET_FRET_COUNT, payload: value });
      }
    };

    return html`
      <div class="flex items-center gap-2">
        <label class="text-xs font-medium text-gray-900 dark:text-gray-100">
          Frets:
        </label>
        <select
          value=${state.fretCount}
          onChange=${handleFretChange}
          class="flex-1 px-2 py-1 rounded-md border-gray-300 shadow-sm text-sm"
          aria-label="Select fret count"
        >
          ${fretOptions.map(n => html`
            <option key=${n} value=${n}>${n}</option>
          `)}
        </select>
      </div>
    `;
  }

  function DisplayOptions({ state, dispatch, actions }) {
    const displayModes = [
      { value: 'semitones', label: 'Semitones' },
      { value: 'intervals', label: 'Intervals' },
      { value: 'notes', label: 'Notes' },
      { value: 'none', label: 'None' }
    ];

    const handleDisplayModeChange = (e) => {
      dispatch({ type: actions.SET_DISPLAY_MODE, payload: e.target.value });
    };

    return html`
      <div class="space-y-1">
        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Note Display
          <select
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
            value=${state.displayMode}
            onChange=${handleDisplayModeChange}
            aria-label="Select note display mode"
          >
            ${displayModes.map(mode => html`
              <option key=${mode.value} value=${mode.value}>
                ${mode.label}
              </option>
            `)}
          </select>
        </label>
      </div>
    `;
  }

  function ThemeToggle({ state, dispatch, actions }) {
    const handleThemeToggle = () => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      dispatch({ type: actions.SET_THEME, payload: newTheme });
    };

    return html`
      <button
        onClick=${handleThemeToggle}
        class="w-full px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs"
      >
        ${state.theme === 'light' ? '☀️ Light' : '🌙 Dark'}
      </button>
    `;
  }

  function ExportButton({ state }) {
    const handleExport = () => {
      if (window.SlimSolo.ExportManager) {
        const canvas = document.getElementById('fretboard-canvas');
        const filename = `fretboard-${state.rootNote}-${state.scale}-${state.instrument}.png`;
        window.SlimSolo.ExportManager.exportToPNG(canvas, filename);
      }
    };

    return html`
      <button
        onClick=${handleExport}
        class="w-full px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-xs font-medium"
      >
        📥 PNG
      </button>
    `;
  }

  function MainListMatches({ state, dispatch, actions }) {
    if (!state.mainListMatches || state.mainListMatches.length === 0) return null;

    const handleLoadScale = (match) => {
      dispatch({ type: actions.LOAD_SCALE_FROM_LIST, payload: match });
    };

    return html`
      <div class="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
        <div class="font-medium text-sm text-blue-700 dark:text-blue-300">
          📘 Main List (${state.mainListMatches.length})
        </div>
        <div class="max-h-40 overflow-y-auto space-y-1">
          ${state.mainListMatches.slice(0, 10).map(match => html`
            <button
              key=${match.label}
              onClick=${() => handleLoadScale(match)}
              class="block w-full text-left text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
            >
              ${match.label}
            </button>
          `)}
        </div>
      </div>
    `;
  }

  function CreateScaleModePanel({ state, dispatch, actions }) {
    const customNoteArray = Array.from(state.customScaleNotes || []).sort((a,b) => a-b);
    const positionCount = (state.customScalePositions || new Set()).size;
    const noteNames = customNoteArray.map(i => {
      const rootIndex = window.SlimSolo.MusicTheory.getNoteIndex(state.customScaleRoot);
      return window.SlimSolo.MusicTheory.getNoteName((rootIndex + i) % 12);
    });

    const handleRootChange = (e) => {
      dispatch({ type: actions.SET_CUSTOM_ROOT, payload: e.target.value });
    };

    const handleClear = () => {
      dispatch({ type: actions.CLEAR_CUSTOM_SCALE });
    };

    const handleClearPositions = () => {
      dispatch({ type: actions.CLEAR_POSITIONS });
    };

    const handleLoadMatch = (match) => {
      dispatch({ type: actions.LOAD_MATCH, payload: match });
    };

    return html`
      <div class="space-y-3 p-3 border-t border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20">
        <div class="space-y-2">
          <div class="text-xs">
            <div class="font-medium text-blue-700 dark:text-blue-300">
              Intervals: ${customNoteArray.length} | Solid: ${positionCount}
            </div>
            ${customNoteArray.length > 0 ? html`
              <div class="text-blue-600 dark:text-blue-400 font-mono">${noteNames.join(', ')}</div>
            ` : html`
              <div class="text-blue-500 dark:text-blue-500">Click fretboard to add notes</div>
            `}
          </div>

          <div class="flex gap-2">
            <div class="flex-1">
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Root</label>
              <select
                value=${state.customScaleRoot}
                onChange=${handleRootChange}
                class="block w-full rounded-md border-gray-300 shadow-sm text-xs"
                    >
                ${window.SlimSolo.MusicTheory.NOTES.map(note => html`
                  <option value=${note}>${note}</option>
                `)}
              </select>
            </div>
            ${customNoteArray.length > 0 ? html`
              <button
                onClick=${handleClear}
                class="mt-5 text-xs px-3 py-1 bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-300 dark:hover:bg-blue-700"
              >
                Clear All
              </button>
            ` : null}
            ${positionCount > 0 ? html`
              <button
                onClick=${handleClearPositions}
                class="mt-5 text-xs px-3 py-1 bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-300 dark:hover:bg-purple-700"
              >
                Clear Solid
              </button>
            ` : null}
          </div>
        </div>

        ${state.exactMatches && state.exactMatches.length > 0 ? html`
          <div class="space-y-1">
            <div class="font-medium text-xs text-green-700 dark:text-green-300">Exact Matches (${state.exactMatches.length}):</div>
            <div class="space-y-1 max-h-32 overflow-y-auto">
              ${state.exactMatches.map(match => html`
                <button
                  onClick=${() => handleLoadMatch(match)}
                  class="block w-full text-left text-xs px-2 py-1 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                >
                  • ${match.label}
                </button>
              `)}
            </div>
          </div>
        ` : null}

        ${state.containedScales && state.containedScales.length > 0 ? html`
          <div class="space-y-1">
            <div class="font-medium text-xs text-orange-700 dark:text-orange-300">Contains These (${state.containedScales.length}):</div>
            <div class="space-y-1 max-h-40 overflow-y-auto">
              ${state.containedScales.map(match => html`
                <div class="text-xs px-2 py-1 text-orange-600 dark:text-orange-400">
                  • ${match.label} <span class="text-red-500">(remove ${match.extraNotes.join(', ')})</span>
                </div>
              `)}
            </div>
          </div>
        ` : null}
      </div>
    `;
  }

  // Layout toggle button component - compact square text-only
  function LayoutToggle({ state, dispatch, actions }) {
    const handleToggle = () => {
      const newLayout = state.menuLayout === 'sidebar' ? 'topbar' : 'sidebar';
      dispatch({ type: actions.SET_MENU_LAYOUT, payload: newLayout });
    };

    const isSidebar = state.menuLayout === 'sidebar';

    return html`
      <button
        onClick=${handleToggle}
        class="layout-toggle-btn flex flex-col items-center justify-center px-1.5 py-0.5 rounded text-xs font-medium leading-tight transition-all
               bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
               border border-gray-300 dark:border-gray-600"
        aria-label="Toggle menu layout"
        title=${isSidebar ? 'Switch to top bar' : 'Switch to sidebar'}
      >
        ${isSidebar
          ? 'Top Menu'
          : html`<span>Side</span><span>Menu</span>`}
      </button>
    `;
  }

  // Compact inline tuning for top bar
  function TuningSelectorCompact({ state, dispatch, actions }) {
    const tuningsByCategory = window.SlimSolo.Instruments.getTuningsByCategory();

    const handleTuningChange = (e) => {
      dispatch({ type: actions.SET_TUNING, payload: e.target.value });
    };

    return html`
      <select
        class="topbar-select rounded border-gray-300 shadow-sm text-xs px-1 py-0.5"
        value=${state.tuning}
        onChange=${handleTuningChange}
        aria-label="Select tuning"
      >
        <optgroup label="Guitar">
          ${tuningsByCategory.Guitar.map(t => html`
            <option key=${t.key} value=${t.key}>${t.name}</option>
          `)}
        </optgroup>
        <optgroup label="Bass">
          ${tuningsByCategory.Bass.map(t => html`
            <option key=${t.key} value=${t.key}>${t.name}</option>
          `)}
        </optgroup>
        <optgroup label="Other">
          ${tuningsByCategory.Other.map(t => html`
            <option key=${t.key} value=${t.key}>${t.name}</option>
          `)}
        </optgroup>
      </select>
    `;
  }

  // Compact root selector for top bar
  function RootNoteSelectorCompact({ state, dispatch, actions }) {
    const notes = window.SlimSolo.MusicTheory.NOTES;

    const handleTransposeChange = (e) => {
      dispatch({ type: actions.SET_ROOT_TRANSPOSE, payload: e.target.value });
    };

    return html`
      <select
        class="topbar-select rounded border-gray-300 shadow-sm text-xs font-bold px-1 py-0.5 w-12"
        value=${state.rootNote}
        onChange=${handleTransposeChange}
        aria-label="Root note"
      >
        ${notes.map(note => html`
          <option key=${note} value=${note}>${note}</option>
        `)}
      </select>
    `;
  }

  // Compact scale dropdown for top bar
  function ScaleDropdownCompact({ state, dispatch, actions }) {
    const displayedScale = state.isManuallyEdited
      ? (state.detectedScale || 'undefined')
      : state.scale;

    const handleScaleChange = (e) => {
      const selectedValue = e.target.value;
      if (selectedValue === 'undefined') return;
      dispatch({ type: actions.SET_SCALE, payload: selectedValue });
    };

    return html`
      <select
        class="topbar-select rounded border-gray-300 shadow-sm text-xs px-1 py-0.5"
        value=${displayedScale}
        onChange=${handleScaleChange}
        aria-label="Select scale"
      >
        ${state.isManuallyEdited && !state.detectedScale
          ? html`<option key="undefined" value="undefined" disabled>Undefined</option>`
          : null}
        ${allScales.map(scale => html`
          <option key=${scale} value=${scale}>
            ${formatScaleName(scale)}
          </option>
        `)}
      </select>
    `;
  }

  // Compact display mode for top bar
  function DisplayModeCompact({ state, dispatch, actions }) {
    const displayModes = [
      { value: 'semitones', label: 'Semitones' },
      { value: 'intervals', label: 'Intervals' },
      { value: 'notes', label: 'Notes' },
      { value: 'none', label: 'None' }
    ];

    const handleDisplayModeChange = (e) => {
      dispatch({ type: actions.SET_DISPLAY_MODE, payload: e.target.value });
    };

    return html`
      <select
        class="topbar-select rounded border-gray-300 shadow-sm text-xs px-1 py-0.5"
        value=${state.displayMode}
        onChange=${handleDisplayModeChange}
        aria-label="Display mode"
      >
        ${displayModes.map(mode => html`
          <option key=${mode.value} value=${mode.value}>${mode.label}</option>
        `)}
      </select>
    `;
  }

  // Compact Move Root selector for top bar
  function MoveRootSelectorCompact({ state, dispatch, actions }) {
    const noteOptions = React.useMemo(() => {
      const blueIntervals = state.blueIntervals || [];
      const currentRootIndex = window.SlimSolo.MusicTheory.getNoteIndex(state.rootNote);

      const noteSet = new Set();
      blueIntervals.forEach(interval => {
        const noteName = window.SlimSolo.MusicTheory.getNoteName((currentRootIndex + interval) % 12);
        noteSet.add(noteName);
      });

      const options = [];
      window.SlimSolo.MusicTheory.NOTES.filter(note => noteSet.has(note)).forEach(note => {
        const newRootIndex = window.SlimSolo.MusicTheory.getNoteIndex(note);
        const newIntervals = blueIntervals.map(interval => {
          const absoluteNote = (currentRootIndex + interval) % 12;
          return (absoluteNote - newRootIndex + 12) % 12;
        }).sort((a, b) => a - b);

        const detectedScale = window.SlimSolo.MusicTheory.detectScaleFromIntervals(newIntervals);
        const scaleName = detectedScale ? formatScaleName(detectedScale) : 'Undefined';
        options.push({ note, scaleName });
      });

      return options;
    }, [state.blueIntervals, state.rootNote]);

    const handleMoveChange = (e) => {
      dispatch({ type: actions.SET_ROOT, payload: e.target.value });
    };

    return html`
      <select
        class="topbar-select rounded border-gray-300 shadow-sm text-xs px-1 py-0.5"
        value=${state.rootNote}
        onChange=${handleMoveChange}
        aria-label="Move root"
      >
        ${noteOptions.map(({ note, scaleName }) => html`
          <option key=${note} value=${note}>${note} → ${scaleName}</option>
        `)}
      </select>
    `;
  }

  // Compact fret count for top bar
  function FretCountCompact({ state, dispatch, actions }) {
    const fretOptions = Array.from({ length: 21 }, (_, i) => i + 4); // 4 to 24

    const handleFretChange = (e) => {
      const value = parseInt(e.target.value);
      if (!isNaN(value)) {
        dispatch({ type: actions.SET_FRET_COUNT, payload: value });
      }
    };

    return html`
      <select
        value=${state.fretCount}
        onChange=${handleFretChange}
        class="topbar-select rounded border-gray-300 shadow-sm text-xs px-1 py-0.5"
        aria-label="Fret count"
      >
        ${fretOptions.map(n => html`
          <option key=${n} value=${n}>${n}</option>
        `)}
      </select>
    `;
  }

  // Compact theme toggle for top bar (stacked)
  function ThemeToggleCompact({ state, dispatch, actions }) {
    const handleThemeToggle = () => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      dispatch({ type: actions.SET_THEME, payload: newTheme });
    };

    return html`
      <button
        onClick=${handleThemeToggle}
        class="w-full px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600"
        aria-label="Toggle theme"
      >
        ${state.theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button>
    `;
  }

  // Compact export button for top bar (stacked)
  function ExportButtonCompact({ state }) {
    const handleExport = () => {
      if (window.SlimSolo.ExportManager) {
        const canvas = document.getElementById('fretboard-canvas');
        const filename = `fretboard-${state.rootNote}-${state.scale}-${state.instrument}.png`;
        window.SlimSolo.ExportManager.exportToPNG(canvas, filename);
      }
    };

    return html`
      <button
        onClick=${handleExport}
        class="w-full px-2 py-0.5 rounded text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors whitespace-nowrap"
        aria-label="Export PNG"
      >
        📥 PNG
      </button>
    `;
  }

  // Compact scale info for topbar (notes + intervals)
  function ScaleInfoCompact({ state }) {
    const blueIntervals = state.blueIntervals || [];
    const rootIndex = window.SlimSolo.MusicTheory.getNoteIndex(state.rootNote);

    const notes = blueIntervals.map(interval =>
      window.SlimSolo.MusicTheory.getNoteName((rootIndex + interval) % 12)
    );

    if (blueIntervals.length === 0) return null;

    return html`
      <div class="font-mono text-xs font-bold leading-none text-gray-700 dark:text-gray-300">
        <div class="flex">${notes.map((n, i) => html`<span key=${i} class="w-4 text-center">${n}</span>`)}</div>
        <div class="flex text-gray-500 dark:text-gray-400">${blueIntervals.map((int, i) => html`<span key=${i} class="w-4 text-center">${int}</span>`)}</div>
      </div>
    `;
  }

  // Top Menu Bar Component - horizontal layout with tuning notes and scale info
  function TopMenuBar({ state, dispatch, actions }) {
    // Get tuning notes
    const currentTuning = window.SlimSolo.Instruments.getTuning(state.tuning);
    const tuningNotes = currentTuning.strings.map(s => s.replace(/\d+/, '')).join(' ');

    return html`
      <div class="topbar-container w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-2 py-1">
        <div class="flex items-start gap-1.5 flex-wrap">
          <!-- Layout toggle -->
          <${LayoutToggle} state=${state} dispatch=${dispatch} actions=${actions} />

          <div class="topbar-divider h-8 w-px bg-gray-300 dark:bg-gray-600 self-center" />

          <!-- Tuning with notes underneath -->
          <div class="flex flex-col">
            <${TuningSelectorCompact} state=${state} dispatch=${dispatch} actions=${actions} />
            <div class="text-xs font-bold text-gray-700 dark:text-gray-300 font-mono text-center leading-none">${tuningNotes}</div>
          </div>

          <div class="topbar-divider h-8 w-px bg-gray-300 dark:bg-gray-600 self-center" />

          <!-- Root + Scale with notes/intervals underneath -->
          <div class="flex flex-col">
            <div class="flex items-center gap-1">
              <span class="topbar-label">Root</span>
              <${RootNoteSelectorCompact} state=${state} dispatch=${dispatch} actions=${actions} />
              <${ScaleDropdownCompact} state=${state} dispatch=${dispatch} actions=${actions} />
            </div>
            <${ScaleInfoCompact} state=${state} />
          </div>

          <div class="topbar-divider h-8 w-px bg-gray-300 dark:bg-gray-600 self-center" />

          <!-- Note Display -->
          <div class="flex flex-col self-center">
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300">Note Display</span>
            <${DisplayModeCompact} state=${state} dispatch=${dispatch} actions=${actions} />
          </div>

          <div class="topbar-divider h-8 w-px bg-gray-300 dark:bg-gray-600 self-center" />

          <!-- Move Root -->
          <div class="flex flex-col self-center">
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300">Move Root</span>
            <${MoveRootSelectorCompact} state=${state} dispatch=${dispatch} actions=${actions} />
          </div>

          <div class="topbar-divider h-8 w-px bg-gray-300 dark:bg-gray-600 self-center" />

          <!-- Frets -->
          <div class="flex flex-col self-center">
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300">Frets</span>
            <${FretCountCompact} state=${state} dispatch=${dispatch} actions=${actions} />
          </div>

          <!-- Stacked Dark/Export buttons -->
          <div class="flex flex-col gap-1 self-center">
            <${ThemeToggleCompact} state=${state} dispatch=${dispatch} actions=${actions} />
            <${ExportButtonCompact} state=${state} />
          </div>
        </div>
      </div>
    `;
  }

  function ControlPanel({ state, dispatch, actions, isMobile = false, onClose }) {
    // Mobile: compact spacing, extra padding for hamburger button
    const containerClass = isMobile
      ? 'w-full h-full p-2 pt-14 space-y-2 overflow-y-auto bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700'
      : 'w-full h-full p-3 space-y-3 overflow-y-auto bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700';

    return html`
      <div class="${containerClass}">
        <!-- Layout toggle at top of sidebar -->
        <${LayoutToggle} state=${state} dispatch=${dispatch} actions=${actions} />

        <${TuningSelector} state=${state} dispatch=${dispatch} actions=${actions} />
        <${RootNoteSelector} state=${state} dispatch=${dispatch} actions=${actions} />
        <${ScaleDropdown} state=${state} dispatch=${dispatch} actions=${actions} />

        <${ScaleInfo} state=${state} />

        ${state.detectedScales && state.detectedScales.length > 0
          ? html`<${EquivalentScalesDropdown} detectedScales=${state.detectedScales} dispatch=${dispatch} actions=${actions} theme=${state.theme} />`
          : null}

        <${DisplayOptions} state=${state} dispatch=${dispatch} actions=${actions} />

        <${MoveRootSelector} state=${state} dispatch=${dispatch} actions=${actions} />
        <${FretCountSlider} state=${state} dispatch=${dispatch} actions=${actions} />

        <div class="flex flex-col gap-1">
          <${ThemeToggleCompact} state=${state} dispatch=${dispatch} actions=${actions} />
          <${ExportButtonCompact} state=${state} />
        </div>
      </div>
    `;
  }

  function formatScaleName(scale) {
    const names = {
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
      phrygianDominant: 'Phrygian Dominant'
    };
    return names[scale] || scale;
  }

  window.SlimSolo = window.SlimSolo || {};
  window.SlimSolo.ControlPanel = {
    Component: ControlPanel,
    TopMenuBar: TopMenuBar,
    render: (root, props) => {
      root.render(React.createElement(ControlPanel, props));
    }
  };
})();