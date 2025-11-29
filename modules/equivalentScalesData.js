(function() {
  'use strict';

  /**
   * Equivalent Scales Data Module
   *
   * Loads and caches the equivalent scales CSV matrix for O(1) lookup performance.
   * Replaces runtime calculation of equivalent scales with pre-calculated data.
   *
   * CSV Structure:
   *   - Column 1: Scale/Root (e.g., "C Major", "A Minor")
   *   - Column 2: Intervals (e.g., "0,2,4,5,7,9,11")
   *   - Columns 3+: All 216 scale/root combinations as headers
   *   - Cells: "yes" if equivalent, empty if not, "-" for diagonal
   *
   * Exports:
   *   - loadEquivalents()                    : Async load and parse CSV
   *   - getEquivalentScales(root, scale)     : Get equivalents for a scale
   *   - isLoaded()                           : Check if data is loaded
   */

  let equivalentsCache = null;
  let scaleHeaders = [];
  let isLoadedFlag = false;

  /**
   * Load and parse the equivalent scales CSV file
   * @returns {Promise<Map>} - Map of scale labels to equivalent scale labels
   */
  async function loadEquivalents() {
    if (equivalentsCache) {
      return equivalentsCache;
    }

    try {
      const response = await fetch('data/equivalent_scales.csv');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const csvText = await response.text();
      const parsed = window.SlimSolo.CSVParser.parseCSV(csvText);
      const errors = window.SlimSolo.CSVParser.validateCSV(parsed);

      if (errors.length > 0) {
        console.error('CSV validation errors:', errors);
        throw new Error('Invalid CSV structure');
      }

      // Build lookup map
      equivalentsCache = buildEquivalentsMap(parsed);
      isLoadedFlag = true;

      console.log(`Loaded ${equivalentsCache.size} scale combinations from CSV`);
      return equivalentsCache;

    } catch (error) {
      console.error('Failed to load equivalent scales:', error.message);
      // Return empty map to allow app to continue without equivalents
      equivalentsCache = new Map();
      isLoadedFlag = false;
      throw error;
    }
  }

  /**
   * Build equivalents lookup map from parsed CSV
   * @param {object} parsed - Parsed CSV data {headers, rows}
   * @returns {Map} - Map<scaleLabel, string[]>
   */
  function buildEquivalentsMap(parsed) {
    const { headers, rows } = parsed;
    const map = new Map();

    // Extract scale column headers (skip first 2 columns: Scale/Root, Intervals)
    scaleHeaders = headers.slice(2);

    rows.forEach(row => {
      const scaleLabel = row['Scale/Root'];
      if (!scaleLabel) return;

      const equivalents = [];

      // Check each column for "yes"
      scaleHeaders.forEach(header => {
        const cellValue = row[header];
        if (cellValue && cellValue.trim().toLowerCase() === 'yes') {
          equivalents.push(header);
        }
      });

      map.set(scaleLabel, equivalents);
    });

    return map;
  }

  /**
   * Get equivalent scales for a given root and scale type
   * @param {string} root - Root note (e.g., "C", "A#")
   * @param {string} scaleType - Scale type (e.g., "major", "minor", "blues")
   * @returns {object[]} - Array of equivalent scale objects {root, scale, label}
   */
  function getEquivalentScales(root, scaleType) {
    if (!equivalentsCache) {
      console.warn('Equivalents not loaded. Call loadEquivalents() first.');
      return [];
    }

    // Format scale name using musicTheory formatter
    const formatScaleName = window.SlimSolo.MusicTheory.formatScaleName;
    const scaleName = formatScaleName(scaleType);
    const key = `${root} ${scaleName}`;

    const equivalentLabels = equivalentsCache.get(key);
    if (!equivalentLabels || equivalentLabels.length === 0) {
      return [];
    }

    // Parse equivalent labels into structured objects
    const equivalents = equivalentLabels.map(label => {
      // Parse "C Major" into {root: "C", scaleName: "Major"}
      const parts = label.trim().split(' ');
      const eqRoot = parts[0];
      const eqScaleName = parts.slice(1).join(' ');

      // Reverse lookup: scale name → scale key
      const eqScaleKey = findScaleKeyFromName(eqScaleName);

      return {
        root: eqRoot,
        scale: eqScaleKey,
        mode: null,
        label: label
      };
    });

    // Sort by root note index, then alphabetically
    const NOTES = window.SlimSolo.MusicTheory.NOTES;
    return equivalents.sort((a, b) => {
      const aIndex = NOTES.indexOf(a.root);
      const bIndex = NOTES.indexOf(b.root);
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.label.localeCompare(b.label);
    });
  }

  /**
   * Reverse lookup: find scale key from display name
   * @param {string} displayName - Display name (e.g., "Major", "Blues (Minor)")
   * @returns {string} - Scale key (e.g., "major", "blues")
   */
  function findScaleKeyFromName(displayName) {
    const formatScaleName = window.SlimSolo.MusicTheory.formatScaleName;
    const SCALES = window.SlimSolo.MusicTheory.SCALES;

    // Try exact match first
    for (const [key, _] of Object.entries(SCALES)) {
      if (formatScaleName(key) === displayName) {
        return key;
      }
    }

    // Fallback: lowercase normalized match
    const normalized = displayName.toLowerCase().replace(/[^a-z]/g, '');
    for (const [key, _] of Object.entries(SCALES)) {
      const keyNormalized = formatScaleName(key).toLowerCase().replace(/[^a-z]/g, '');
      if (keyNormalized === normalized) {
        return key;
      }
    }

    console.warn(`Could not find scale key for display name: "${displayName}"`);
    return displayName.toLowerCase().replace(/\s+/g, ''); // Best guess
  }

  /**
   * Check if equivalents data is loaded
   * @returns {boolean}
   */
  function isLoaded() {
    return isLoadedFlag;
  }

  // Export to global namespace
  window.SlimSolo = window.SlimSolo || {};
  window.SlimSolo.EquivalentScalesData = {
    loadEquivalents,
    getEquivalentScales,
    isLoaded
  };
})();
