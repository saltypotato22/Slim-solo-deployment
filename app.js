(function() {
  'use strict';

  // Wait for all dependencies
  function waitForDependencies(callback) {
    const checkDependencies = () => {
      if (typeof React !== 'undefined' &&
          typeof ReactDOM !== 'undefined' &&
          typeof htm !== 'undefined' &&
          window.SlimSolo &&
          window.SlimSolo.MusicTheory &&
          window.SlimSolo.Instruments &&
          window.SlimSolo.FretboardCanvas &&
          window.SlimSolo.ControlPanel &&
          window.SlimSolo.ExportManager &&
          window.SlimSolo.CSVParser &&
          window.SlimSolo.EquivalentScalesData) {
        callback();
      } else {
        setTimeout(checkDependencies, 10);
      }
    };
    checkDependencies();
  }

  waitForDependencies(() => {
    const { useState, useEffect, useReducer, useRef, useMemo, Component } = React;
    const html = htm.bind(React.createElement);

    // Error Boundary Component
    class ErrorBoundary extends Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }

      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }

      componentDidCatch(error, errorInfo) {
        console.error('Slim Solo Error:', error, errorInfo);
      }

      render() {
        if (this.state.hasError) {
          return React.createElement('div', {
            className: 'h-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 p-8'
          },
            React.createElement('div', { className: 'text-center' },
              React.createElement('h1', { className: 'text-2xl font-bold text-red-600 dark:text-red-400 mb-4' },
                'Something went wrong'
              ),
              React.createElement('p', { className: 'text-red-500 dark:text-red-300 mb-4' },
                this.state.error?.message || 'An unexpected error occurred'
              ),
              React.createElement('button', {
                className: 'px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700',
                onClick: () => window.location.reload()
              }, 'Reload Application')
            )
          );
        }

        return this.props.children;
      }
    }

    const initialState = {
      tuning: window.SlimSolo.Instruments.DEFAULT_TUNING,
      scale: 'minor',
      mode: 'ionian',
      rootNote: 'E',
      fretCount: 8,
      displayMode: 'semitones',
      showAllOpenStrings: true,
      theme: 'light',
      menuLayout: 'sidebar', // 'sidebar' | 'topbar'
      panelCollapsed: false,
      fretStates: new Map(),
      isManuallyEdited: false,
      detectedScale: null
    };

    const actions = {
      SET_TUNING: 'SET_TUNING',
      SET_SCALE: 'SET_SCALE',
      SET_MODE: 'SET_MODE',
      SET_ROOT: 'SET_ROOT',
      SET_ROOT_TRANSPOSE: 'SET_ROOT_TRANSPOSE',
      SET_FRET_COUNT: 'SET_FRET_COUNT',
      SET_DISPLAY_MODE: 'SET_DISPLAY_MODE',
      TOGGLE_ALL_OPEN_STRINGS: 'TOGGLE_ALL_OPEN_STRINGS',
      SET_THEME: 'SET_THEME',
      SET_MENU_LAYOUT: 'SET_MENU_LAYOUT',
      TOGGLE_PANEL: 'TOGGLE_PANEL',
      CYCLE_FRET: 'CYCLE_FRET',
      LOAD_SCALE_FROM_LIST: 'LOAD_SCALE_FROM_LIST',
      SET_FROM_EQUIVALENT: 'SET_FROM_EQUIVALENT'
    };

    function populateFretStatesForScale(tuning, rootNote, scale, mode, fretCount) {
      const newFretStates = new Map();
      const scaleNotes = window.SlimSolo.MusicTheory.getScaleNotes(rootNote, scale, mode);
      const stringCount = window.SlimSolo.Instruments.getStringCount(tuning);

      for (let string = 0; string < stringCount; string++) {
        for (let fret = 0; fret <= fretCount; fret++) {
          const note = window.SlimSolo.Instruments.getStringNote(tuning, string, fret);
          if (!note) continue; // Null check for safety
          const noteName = note.replace(/\d+/, '');

          if (noteName === rootNote) continue;

          if (window.SlimSolo.MusicTheory.isNoteInScale(note, scaleNotes)) {
            newFretStates.set(`${string}-${fret}`, 'blue-circle');
          }
        }
      }

      return newFretStates;
    }

    function stateReducer(state, action) {
      switch (action.type) {
        case actions.SET_TUNING: {
          // Reset to default scale (E Minor) when changing tuning
          const defaultRoot = 'E';
          const defaultScale = 'minor';
          const defaultMode = defaultScale === 'major' ? 'ionian' : defaultScale;
          return {
            ...state,
            tuning: action.payload,
            rootNote: defaultRoot,
            scale: defaultScale,
            mode: defaultMode,
            isManuallyEdited: false,
            detectedScale: null,
            fretStates: populateFretStatesForScale(action.payload, defaultRoot, defaultScale, defaultMode, state.fretCount)
          };
        }
        case actions.SET_SCALE: {
          const newMode = action.payload === 'major' ? 'ionian' : action.payload;
          return {
            ...state,
            scale: action.payload,
            mode: newMode,
            isManuallyEdited: false,
            detectedScale: null,
            fretStates: populateFretStatesForScale(state.tuning, state.rootNote, action.payload, newMode, state.fretCount)
          };
        }
        case actions.SET_MODE: {
          return {
            ...state,
            mode: action.payload,
            fretStates: populateFretStatesForScale(state.tuning, state.rootNote, state.scale, action.payload, state.fretCount)
          };
        }
        case actions.SET_ROOT: {
          const newFretStates = new Map(state.fretStates);
          const oldRoot = state.rootNote;
          const newRoot = action.payload;
          const stringCount = window.SlimSolo.Instruments.getStringCount(state.tuning);

          // Process all fretboard positions
          for (let s = 0; s < stringCount; s++) {
            for (let f = 0; f <= state.fretCount; f++) {
              const note = window.SlimSolo.Instruments.getStringNote(state.tuning, s, f);
              if (!note) continue; // Null check for safety
              const noteName = note.replace(/\d+/, '');
              const posKey = `${s}-${f}`;

              // Step 1: Add old root positions as blue-circle
              if (noteName === oldRoot) {
                newFretStates.set(posKey, 'blue-circle');
              }

              // Step 2: Remove new root from fretStates (roots are never in fretStates)
              if (noteName === newRoot) {
                newFretStates.delete(posKey);
              }
            }
          }

          return {
            ...state,
            rootNote: newRoot,
            fretStates: newFretStates,
            isManuallyEdited: true
          };
        }
        case actions.SET_ROOT_TRANSPOSE: {
          return {
            ...state,
            rootNote: action.payload,
            fretStates: populateFretStatesForScale(
              state.tuning,
              action.payload,
              state.scale,
              state.mode,
              state.fretCount
            ),
            isManuallyEdited: false,
            detectedScale: null
          };
        }
        case actions.SET_FRET_COUNT: {
          const newFretCount = action.payload;
          const oldFretCount = state.fretCount;

          // If decreasing frets, just update the count (notes beyond won't render)
          if (newFretCount <= oldFretCount) {
            return { ...state, fretCount: newFretCount };
          }

          // Increasing frets - need to populate new positions

          // If clean scale (not manually edited), repopulate entire scale
          if (!state.isManuallyEdited) {
            return {
              ...state,
              fretCount: newFretCount,
              fretStates: populateFretStatesForScale(
                state.tuning,
                state.rootNote,
                state.scale,
                state.mode,
                newFretCount
              )
            };
          }

          // If manually edited, extend existing note pattern to new frets
          const newFretStates = new Map(state.fretStates);
          const stringCount = window.SlimSolo.Instruments.getStringCount(state.tuning);

          // Find all note names currently in blue states
          const blueNotes = new Set();
          state.fretStates.forEach((value, key) => {
            if (value === 'blue-circle' || value === 'blue-solid') {
              const [string, fret] = key.split('-').map(Number);
              const note = window.SlimSolo.Instruments.getStringNote(state.tuning, string, fret);
              if (note) {
                blueNotes.add(note.replace(/\d+/, ''));
              }
            }
          });

          // Add these notes at new fret positions
          for (let string = 0; string < stringCount; string++) {
            for (let fret = oldFretCount + 1; fret <= newFretCount; fret++) {
              const note = window.SlimSolo.Instruments.getStringNote(state.tuning, string, fret);
              if (!note) continue;
              const noteName = note.replace(/\d+/, '');

              // Skip root notes (never in fretStates)
              if (noteName === state.rootNote) continue;

              // If this note is in our blue notes, add it as blue-circle
              if (blueNotes.has(noteName)) {
                newFretStates.set(`${string}-${fret}`, 'blue-circle');
              }
            }
          }

          return {
            ...state,
            fretCount: newFretCount,
            fretStates: newFretStates
          };
        }
        case actions.SET_DISPLAY_MODE:
          return { ...state, displayMode: action.payload };
        case actions.TOGGLE_ALL_OPEN_STRINGS:
          return { ...state, showAllOpenStrings: !state.showAllOpenStrings };
        case actions.SET_THEME:
          // Pure reducer - side effects moved to useEffect
          return { ...state, theme: action.payload };
        case actions.SET_MENU_LAYOUT:
          return { ...state, menuLayout: action.payload };
        case actions.TOGGLE_PANEL:
          return { ...state, panelCollapsed: !state.panelCollapsed };
        case actions.CYCLE_FRET: {
          const { noteName, clickedString, clickedFret } = action.payload;
          const newFretStates = new Map(state.fretStates);
          const stringCount = window.SlimSolo.Instruments.getStringCount(state.tuning);

          // Calculate nextState from CURRENT state (not stale ref)
          const clickedKey = `${clickedString}-${clickedFret}`;
          const currentState = state.fretStates.get(clickedKey) || 'blank';
          let nextState;
          if (currentState === 'blank') {
            nextState = 'blue-circle';
          } else if (currentState === 'blue-circle') {
            nextState = 'blue-solid';
          } else if (currentState === 'blue-solid') {
            nextState = 'blank';
          } else {
            nextState = 'blue-circle';
          }

          const isCircleState = nextState === 'blue-circle';

          for (let s = 0; s < stringCount; s++) {
            for (let f = 0; f <= state.fretCount; f++) {
              const note = window.SlimSolo.Instruments.getStringNote(state.tuning, s, f);
              if (!note) continue; // Null check for safety
              const noteNameAtPos = note.replace(/\d+/, '');

              if (noteNameAtPos === noteName) {
                const posKey = `${s}-${f}`;
                const isClickedFret = s === clickedString && f === clickedFret;

                if (isClickedFret) {
                  if (nextState === 'blank') {
                    newFretStates.delete(posKey);
                  } else {
                    newFretStates.set(posKey, nextState);
                  }
                } else if (isCircleState || nextState === 'blank') {
                  if (nextState === 'blank') {
                    newFretStates.delete(posKey);
                  } else {
                    newFretStates.set(posKey, nextState);
                  }
                }
              }
            }
          }

          return {
            ...state,
            fretStates: newFretStates,
            isManuallyEdited: true
          };
        }
        case actions.LOAD_SCALE_FROM_LIST: {
          const { root, scale, mode } = action.payload;
          const newScale = scale || mode;
          const newMode = mode || newScale;
          const oldRoot = state.rootNote;
          const newRoot = root;
          const stringCount = window.SlimSolo.Instruments.getStringCount(state.tuning);

          // Get the notes in the new scale
          const newScaleNotes = window.SlimSolo.MusicTheory.getScaleNotes(newRoot, newScale, newMode);

          // Start with filtered fretStates (only notes in new scale)
          const newFretStates = new Map();
          state.fretStates.forEach((value, key) => {
            const [string, fret] = key.split('-').map(Number);
            const note = window.SlimSolo.Instruments.getStringNote(state.tuning, string, fret);
            if (!note) return;

            if (window.SlimSolo.MusicTheory.isNoteInScale(note, newScaleNotes)) {
              newFretStates.set(key, value);
            }
          });

          // Handle root change: old root becomes blue-circle, new root removed from fretStates
          if (oldRoot !== newRoot) {
            for (let s = 0; s < stringCount; s++) {
              for (let f = 0; f <= state.fretCount; f++) {
                const note = window.SlimSolo.Instruments.getStringNote(state.tuning, s, f);
                if (!note) continue;
                const noteName = note.replace(/\d+/, '');
                const posKey = `${s}-${f}`;

                // Old root becomes blue-circle (if it's in the new scale)
                if (noteName === oldRoot && window.SlimSolo.MusicTheory.isNoteInScale(note, newScaleNotes)) {
                  newFretStates.set(posKey, 'blue-circle');
                }

                // New root removed from fretStates (roots are never in fretStates)
                if (noteName === newRoot) {
                  newFretStates.delete(posKey);
                }
              }
            }
          }

          return {
            ...state,
            rootNote: newRoot,
            scale: newScale,
            mode: newMode,
            fretStates: newFretStates,
            isManuallyEdited: true
          };
        }
        case actions.SET_FROM_EQUIVALENT: {
          const { root, scale, mode } = action.payload;
          const newFretStates = new Map(state.fretStates);
          const oldRoot = state.rootNote;
          const newRoot = root;
          const stringCount = window.SlimSolo.Instruments.getStringCount(state.tuning);

          // Process all fretboard positions (same logic as SET_ROOT)
          // Keep all existing notes, just swap which one is the root
          for (let s = 0; s < stringCount; s++) {
            for (let f = 0; f <= state.fretCount; f++) {
              const note = window.SlimSolo.Instruments.getStringNote(state.tuning, s, f);
              if (!note) continue; // Null check for safety
              const noteName = note.replace(/\d+/, '');
              const posKey = `${s}-${f}`;

              // Step 1: Add old root positions as blue-circle
              if (noteName === oldRoot) {
                newFretStates.set(posKey, 'blue-circle');
              }

              // Step 2: Remove new root from fretStates (roots are never in fretStates)
              if (noteName === newRoot) {
                newFretStates.delete(posKey);
              }
            }
          }

          return {
            ...state,
            rootNote: newRoot,
            scale: scale,
            mode: mode,
            fretStates: newFretStates,
            isManuallyEdited: true
          };
        }
        default:
          return state;
      }
    }

    function App() {
      const [state, dispatch] = useReducer(stateReducer, initialState);
      const [equivalentsLoaded, setEquivalentsLoaded] = useState(false);
      const [isMobile, setIsMobile] = useState(false);
      const [sidebarOpen, setSidebarOpen] = useState(false);
      const canvasRef = useRef(null);
      const stateRef = useRef(state);

      // Detect mobile (landscape phone: height < 500px)
      useEffect(() => {
        const checkMobile = () => {
          const mobile = window.innerHeight < 500;
          setIsMobile(mobile);
          // Auto-close sidebar when switching to mobile
          if (mobile) setSidebarOpen(false);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
      }, []);

      // Keep stateRef in sync with state
      useEffect(() => {
        stateRef.current = state;
      }, [state]);

      // Load equivalent scales CSV at startup with retry logic
      const [csvLoadError, setCsvLoadError] = useState(null);

      useEffect(() => {
        const loadWithRetry = async (maxRetries = 3) => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              await window.SlimSolo.EquivalentScalesData.loadEquivalents();
              setEquivalentsLoaded(true);
              setCsvLoadError(null);
              return; // Success
            } catch (err) {
              console.warn(`CSV load attempt ${attempt}/${maxRetries} failed:`, err.message);
              if (attempt === maxRetries) {
                setCsvLoadError(`Failed to load scale data: ${err.message}`);
                setEquivalentsLoaded(false);
              } else {
                // Wait before retry (exponential backoff: 1s, 2s, 4s)
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
              }
            }
          }
        };

        loadWithRetry();
      }, []);

      // Load saved preferences and initialize fretStates
      useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
          dispatch({ type: actions.SET_THEME, payload: savedTheme });
        }

        const savedLayout = localStorage.getItem('menuLayout');
        if (savedLayout && (savedLayout === 'sidebar' || savedLayout === 'topbar')) {
          dispatch({ type: actions.SET_MENU_LAYOUT, payload: savedLayout });
        }

        dispatch({ type: actions.SET_SCALE, payload: initialState.scale });
      }, []);

      // Theme side effects (moved from reducer for purity)
      useEffect(() => {
        document.documentElement.className = state.theme;
        localStorage.setItem('theme', state.theme);
      }, [state.theme]);

      // Menu layout persistence
      useEffect(() => {
        localStorage.setItem('menuLayout', state.menuLayout);
      }, [state.menuLayout]);

      // Calculate scale notes and positions with useMemo
      const { scaleNotes, notePositions } = useMemo(() => {
        const scaleNotes = window.SlimSolo.MusicTheory.getScaleNotes(
          state.rootNote,
          state.scale,
          state.mode
        );

        const notePositions = [];
        const stringCount = window.SlimSolo.Instruments.getStringCount(state.tuning);
        for (let stringIndex = 0; stringIndex < stringCount; stringIndex++) {
          for (let fret = 0; fret <= state.fretCount; fret++) {
            const note = window.SlimSolo.Instruments.getStringNote(state.tuning, stringIndex, fret);
            if (window.SlimSolo.MusicTheory.isNoteInScale(note, scaleNotes)) {
              const interval = window.SlimSolo.MusicTheory.getInterval(state.rootNote, note);
              notePositions.push({
                string: stringIndex,
                fret,
                note,
                interval,
                isRoot: note.replace(/\d+/, '') === state.rootNote,
                isFifth: interval === 7
              });
            }
          }
        }

        return { scaleNotes, notePositions };
      }, [
        state.tuning,
        state.rootNote,
        state.scale,
        state.mode,
        state.fretCount
      ]);

      // Extract blue note names from fretStates (absolute, not relative to root)
      const blueNotes = useMemo(() => {
        const notes = new Set();
        notes.add(state.rootNote); // Root is always included (never in fretStates)

        state.fretStates.forEach((fretState, key) => {
          const [string, fret] = key.split('-').map(Number);
          const note = window.SlimSolo.Instruments.getStringNote(state.tuning, string, fret);
          const noteName = note.replace(/\d+/, '');

          if (fretState === 'blue-circle' || fretState === 'blue-solid') {
            notes.add(noteName);
          }
        });

        return Array.from(notes);
      }, [state.tuning, state.fretStates, state.rootNote]);

      // Extract blue intervals from fretStates (for legacy compatibility)
      const blueIntervals = useMemo(() => {
        const blue = new Set();
        blue.add(0); // Root is always included (never in fretStates)

        state.fretStates.forEach((fretState, key) => {
          const [string, fret] = key.split('-').map(Number);
          const note = window.SlimSolo.Instruments.getStringNote(state.tuning, string, fret);
          const noteName = note.replace(/\d+/, '');
          const interval = window.SlimSolo.MusicTheory.getInterval(state.rootNote, noteName);

          if (fretState === 'blue-circle' || fretState === 'blue-solid') {
            blue.add(interval);
          }
        });

        return Array.from(blue).sort((a, b) => a - b);
      }, [state.tuning, state.fretStates, state.rootNote]);

      // Detect scale from intervals in CURRENT root only (for dropdown)
      const detectedScale = useMemo(() => {
        if (!state.isManuallyEdited) return null;
        if (blueIntervals.length === 0) return null;
        return window.SlimSolo.MusicTheory.detectScaleFromIntervals(blueIntervals);
      }, [state.isManuallyEdited, blueIntervals]);

      // Track previous detectedScale to detect transitions
      const prevDetectedScaleRef = useRef(detectedScale);

      // Flash effect when scale transitions from undefined to defined
      useEffect(() => {
        const prevScale = prevDetectedScaleRef.current;
        const wasUndefined = state.isManuallyEdited && prevScale === null;
        const isNowDefined = state.isManuallyEdited && detectedScale !== null;

        // Only flash when transitioning FROM undefined TO defined (not on initial load)
        if (wasUndefined && isNowDefined && prevScale !== detectedScale) {
          window.SlimSolo.FretboardCanvas.flashScaleDetected();
        }

        prevDetectedScaleRef.current = detectedScale;
      }, [detectedScale, state.isManuallyEdited]);

      // Detect ALL equivalent scales across ALL roots (for clickable list)
      const detectedScales = useMemo(() => {
        // Wait for CSV to load
        if (!equivalentsLoaded) {
          return [];
        }

        // If manually edited but no scale detected (undefined), don't show equivalents
        if (state.isManuallyEdited && detectedScale === null) {
          return [];
        }

        // If manually edited and scale detected, show equivalents for detected scale
        if (state.isManuallyEdited && detectedScale !== null) {
          return window.SlimSolo.EquivalentScalesData.getEquivalentScales(
            state.rootNote,
            detectedScale
          );
        }

        // Otherwise (clean scale from dropdown), show equivalents for selected scale
        return window.SlimSolo.EquivalentScalesData.getEquivalentScales(
          state.rootNote,
          state.scale
        );
      }, [equivalentsLoaded, state.isManuallyEdited, detectedScale, state.rootNote, state.scale]);

      // Calculate Main List matches (blue notes only)
      const mainListMatches = useMemo(() => {
        if (blueIntervals.length === 0) return [];
        return window.SlimSolo.MusicTheory.findMainListMatches(blueIntervals, state.rootNote);
      }, [blueIntervals, state.rootNote]);

      // Initialize canvas once
      useEffect(() => {
        if (canvasRef.current) {
          window.SlimSolo.FretboardCanvas.init(canvasRef.current);
        }
      }, []);

      // Combine state with computed values for rendering
      const renderState = useMemo(() => {
        const tuningData = window.SlimSolo.Instruments.getTuning(state.tuning);
        return {
          ...state,
          stringCount: tuningData.strings.length,
          tuningStrings: tuningData.strings,
          tuningName: tuningData.name,
          scaleNotes,
          notePositions,
          mainListMatches,
          blueIntervals,
          detectedScale,
          detectedScales
        };
      }, [
        state,
        scaleNotes,
        notePositions,
        mainListMatches,
        blueIntervals,
        detectedScale,
        detectedScales
      ]);

      // Render canvas when visual data changes
      // Note: renderState already includes all visual state, so only it is needed as dependency
      useEffect(() => {
        if (canvasRef.current && window.SlimSolo.FretboardCanvas) {
          window.SlimSolo.FretboardCanvas.render(renderState);
        }
      }, [renderState]);

      // Handle window resize
      const renderStateRef = useRef(renderState);
      useEffect(() => {
        renderStateRef.current = renderState;
      }, [renderState]);

      useEffect(() => {
        const handleResize = () => {
          if (canvasRef.current && window.SlimSolo.FretboardCanvas) {
            window.SlimSolo.FretboardCanvas.resize();
            window.SlimSolo.FretboardCanvas.render(renderStateRef.current);
          }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
      }, []);

      // Resize canvas when sidebar opens/closes (push layout)
      useEffect(() => {
        // Small delay to let CSS transition complete
        const timer = setTimeout(() => {
          if (canvasRef.current && window.SlimSolo.FretboardCanvas) {
            window.SlimSolo.FretboardCanvas.resize();
            window.SlimSolo.FretboardCanvas.render(renderStateRef.current);
          }
        }, 350);
        return () => clearTimeout(timer);
      }, [sidebarOpen]);

      // Resize canvas when menu layout changes
      useEffect(() => {
        const timer = setTimeout(() => {
          if (canvasRef.current && window.SlimSolo.FretboardCanvas) {
            window.SlimSolo.FretboardCanvas.resize();
            window.SlimSolo.FretboardCanvas.render(renderStateRef.current);
          }
        }, 50);
        return () => clearTimeout(timer);
      }, [state.menuLayout]);

      // Handle note clicks from canvas - 3-state cycling (ALL octaves together)
      // Uses stateRef only to check root note; nextState calculated in reducer for accuracy
      useEffect(() => {
        window.SlimSolo.onNoteClick = (string, fret) => {
          const currentState = stateRef.current;
          const note = window.SlimSolo.Instruments.getStringNote(currentState.tuning, string, fret);
          if (!note) return; // Null check for safety
          const noteName = note.replace(/\d+/, '');

          // Don't allow clicking root notes
          if (noteName === currentState.rootNote) return;

          // Dispatch to reducer - nextState calculated there for correct batching
          dispatch({
            type: actions.CYCLE_FRET,
            payload: { noteName, clickedString: string, clickedFret: fret }
          });
        };

        return () => {
          window.SlimSolo.onNoteClick = null;
        };
      }, [dispatch]); // Stable dependencies - uses stateRef only for root check

      // Toggle sidebar visibility on mobile
      const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

      // Sidebar layout (vertical menu on left)
      if (state.menuLayout === 'sidebar') {
        return html`
          <div class="h-full flex">
            <!-- Control Panel - sidebar -->
            <div class="w-48 flex-shrink-0">
              <${window.SlimSolo.ControlPanel.Component}
                state=${renderState}
                dispatch=${dispatch}
                actions=${actions}
                isMobile=${isMobile}
              />
            </div>

            <!-- Canvas Container - align to top -->
            <div id="canvas-container" class="flex-1 flex items-start justify-center pt-1 px-1 bg-gray-50 dark:bg-gray-800">
              <canvas id="fretboard-canvas" ref=${canvasRef}></canvas>
            </div>
          </div>
        `;
      }

      // Topbar layout (horizontal menu on top)
      return html`
        <div class="h-full flex flex-col">
          <!-- Top Menu Bar -->
          <${window.SlimSolo.ControlPanel.TopMenuBar}
            state=${renderState}
            dispatch=${dispatch}
            actions=${actions}
          />

          <!-- Canvas Container - fills remaining space -->
          <div id="canvas-container" class="flex-1 flex items-start justify-center pt-1 px-1 bg-gray-50 dark:bg-gray-800">
            <canvas id="fretboard-canvas" ref=${canvasRef}></canvas>
          </div>
        </div>
      `;
    }

    // Initialize app
    window.SlimSolo.App = {
      init: function() {
        const root = ReactDOM.createRoot(document.getElementById('app'));
        root.render(React.createElement(ErrorBoundary, null, React.createElement(App)));
      }
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', window.SlimSolo.App.init);
    } else {
      window.SlimSolo.App.init();
    }
  });
})();