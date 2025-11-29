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
      <div class="space-y-1">
        <label class="block text-xs text-gray-500 dark:text-gray-400">
          Scale/Mode
        </label>
        <select
          class="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm text-lg font-bold"
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
      </div>
    `;
  }

  function ScaleInfo({ state }) {
    // Get scale intervals (semitones from root) - shows ACTUAL canvas notes
    const getScaleIntervals = () => {
      if (state.blueIntervals && state.blueIntervals.length > 0) {
        return state.blueIntervals.join('-');
      }
      return '';
    };

    // Generate pattern from intervals (5-5-2 block structure)
    const generatePatternFromIntervals = (intervals) => {
      if (!intervals || intervals.length === 0) return '';

      const block1 = [];
      const block2 = [];
      const block3 = [];

      intervals.forEach(interval => {
        if (interval >= 0 && interval <= 4) {
          block1.push(interval);
        } else if (interval >= 5 && interval <= 9) {
          block2.push(interval - 5);
        } else if (interval >= 10 && interval <= 11) {
          block3.push(interval - 10);
        }
      });

      const parts = [];
      if (block1.length > 0) parts.push(block1.join('-'));
      if (block2.length > 0) parts.push(block2.join('-'));
      if (block3.length > 0) parts.push(block3.join('-'));

      return parts.join(' / ');
    };

    const getScalePattern = () => {
      if (state.blueIntervals && state.blueIntervals.length > 0) {
        return generatePatternFromIntervals(state.blueIntervals);
      }
      return '';
    };

    return html`
      <div class="space-y-2">
        <${CurrentScaleDisplay} state=${state} />
        <div class="text-xs text-gray-600 dark:text-gray-400 mt-1 font-mono" aria-live="polite">
          Intervals: ${getScaleIntervals()}
        </div>
        <div class="text-xs text-gray-600 dark:text-gray-400 mt-1 font-mono" aria-live="polite">
          Pattern: ${getScalePattern()}
        </div>
      </div>
    `;
  }

  function EquivalentScalesDropdown({ detectedScales, dispatch, actions }) {
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
            class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm text-sm"
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

  function CurrentScaleDisplay({ state }) {
    const blueIntervals = state.blueIntervals || [];
    const rootIndex = window.SlimSolo.MusicTheory.getNoteIndex(state.rootNote);

    if (blueIntervals.length === 0) {
      return html`
        <div class="text-xs text-gray-600 dark:text-gray-400 mt-1 font-mono" aria-live="polite">
          Notes: ${state.scaleNotes ? state.scaleNotes.map(n => n.replace(/\d+/, '')).join('-') : ''}
        </div>
      `;
    }

    const blueNotes = blueIntervals.map(interval =>
      window.SlimSolo.MusicTheory.getNoteName((rootIndex + interval) % 12)
    );

    return html`
      <div class="text-xs text-gray-600 dark:text-gray-400 mt-1 font-mono" aria-live="polite">
        Notes: ${blueNotes.join('-')}
      </div>
    `;
  }

  function RootNoteSelector({ state, dispatch, actions }) {
    const notes = window.SlimSolo.MusicTheory.NOTES;

    const handleTransposeChange = (e) => {
      dispatch({ type: actions.SET_ROOT_TRANSPOSE, payload: e.target.value });
    };

    return html`
      <div class="space-y-1">
        <label class="block text-xs text-gray-500 dark:text-gray-400">
          Root
        </label>
        <select
          class="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm text-lg font-bold"
          value=${state.rootNote}
          onChange=${handleTransposeChange}
          aria-label="Transpose scale to root"
          title="Select root to transpose scale"
        >
          ${notes.map(note => html`
            <option key=${note} value=${note}>
              ${note}
            </option>
          `)}
        </select>
      </div>
    `;
  }

  function MoveRootSelector({ state, dispatch, actions }) {
    const notes = window.SlimSolo.MusicTheory.NOTES;

    const handleMoveChange = (e) => {
      dispatch({ type: actions.SET_ROOT, payload: e.target.value });
    };

    return html`
      <div class="space-y-2">
        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">
          ↻ Move Root
          <select
            class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm text-sm"
            value=${state.rootNote}
            onChange=${handleMoveChange}
            aria-label="Move root (reinterpret notes)"
            title="Select root to reinterpret notes"
          >
            ${notes.map(note => html`
              <option key=${note} value=${note}>
                ${note}
              </option>
            `)}
          </select>
        </label>
      </div>
    `;
  }

  function FretCountSlider({ state, dispatch, actions }) {
    const handleFretChange = (e) => {
      const value = parseInt(e.target.value);
      if (!isNaN(value) && value >= 12 && value <= 24) {
        dispatch({ type: actions.SET_FRET_COUNT, payload: value });
      }
    };

    return html`
      <div class="flex items-center gap-2">
        <label class="text-xs font-medium text-gray-900 dark:text-gray-100">
          Frets:
        </label>
        <input
          type="number"
          min="12"
          max="24"
          value=${state.fretCount}
          onChange=${handleFretChange}
          class="flex-1 px-2 py-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm text-sm"
          aria-label="Adjust fret count"
          aria-valuemin="12"
          aria-valuemax="24"
          aria-valuenow=${state.fretCount}
        />
      </div>
    `;
  }

  function DisplayOptions({ state, dispatch, actions }) {
    const displayModes = [
      { value: 'none', label: 'None' },
      { value: 'notes', label: 'Notes' },
      { value: 'intervals', label: 'Intervals' },
      { value: 'semitones', label: 'Semitones' },
      { value: 'semitonesString', label: 'Semitones-String' }
    ];

    const handleDisplayModeChange = (mode) => {
      dispatch({ type: actions.SET_DISPLAY_MODE, payload: mode });
    };

    return html`
      <div class="space-y-2">
        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Display
        </label>
        <div class="space-y-1">
          ${displayModes.map(mode => html`
            <label key=${mode.value} class="flex items-center space-x-1">
              <input
                type="radio"
                name="displayMode"
                value=${mode.value}
                checked=${state.displayMode === mode.value}
                onChange=${() => handleDisplayModeChange(mode.value)}
                class="border-gray-300 dark:border-gray-600 h-3 w-3"
              />
              <span class="text-xs text-gray-700 dark:text-gray-300">${mode.label}</span>
            </label>
          `)}
        </div>
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
        ${state.theme === 'light' ? '🌙 Dark' : '☀️ Light'}
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
        📥 Export PNG
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
                class="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm text-xs"
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

  function ControlPanel({ state, dispatch, actions }) {
    return html`
      <div class="w-full h-full p-3 space-y-3 overflow-y-auto bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
        <div class="flex gap-2">
          <div class="w-10 flex-shrink-0">
            <${RootNoteSelector} state=${state} dispatch=${dispatch} actions=${actions} />
          </div>
          <div class="flex-1">
            <${ScaleDropdown} state=${state} dispatch=${dispatch} actions=${actions} />
          </div>
        </div>

        <${ScaleInfo} state=${state} />

        ${state.detectedScales && state.detectedScales.length > 0
          ? html`<${EquivalentScalesDropdown} detectedScales=${state.detectedScales} dispatch=${dispatch} actions=${actions} />`
          : null}

        <${DisplayOptions} state=${state} dispatch=${dispatch} actions=${actions} />

        <${MoveRootSelector} state=${state} dispatch=${dispatch} actions=${actions} />
        <${FretCountSlider} state=${state} dispatch=${dispatch} actions=${actions} />

        <div class="flex gap-2">
          <${ThemeToggle} state=${state} dispatch=${dispatch} actions=${actions} />
          <${ExportButton} state=${state} />
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
      phrygianDominant: 'Phrygian Dominant (Maqam Hijaz)'
    };
    return names[scale] || scale;
  }

  window.SlimSolo = window.SlimSolo || {};
  window.SlimSolo.ControlPanel = {
    Component: ControlPanel,
    render: (root, props) => {
      root.render(React.createElement(ControlPanel, props));
    }
  };
})();