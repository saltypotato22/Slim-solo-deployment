(function() {
  'use strict';

  /**
   * CSV Parser Module
   *
   * Native JavaScript CSV parser for the Bass Fretboard Visualizer.
   * Handles quoted fields and basic CSV edge cases without external dependencies.
   *
   * Exports:
   *   - parseCSV(csvText, options)  : Parses CSV text into {headers, rows}
   *   - parseCSVLine(line)          : Parses a single CSV line
   *   - validateCSV(parsed)         : Validates CSV structure
   */

  /**
   * Parse a single CSV line respecting quoted fields
   * @param {string} line - CSV line to parse
   * @returns {string[]} - Array of field values
   */
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote (double quote)
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // End of field
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    // Push last field
    result.push(current);
    return result;
  }

  /**
   * Parse entire CSV text into array of objects
   * @param {string} csvText - Full CSV text content
   * @param {object} options - Parsing options
   * @param {boolean} options.hasHeader - First line is header (default: true)
   * @param {boolean} options.trimHeaders - Trim whitespace from headers (default: true)
   * @param {boolean} options.trimValues - Trim whitespace from values (default: true)
   * @param {boolean} options.skipEmpty - Skip empty lines (default: true)
   * @returns {object} - {headers: string[], rows: object[]}
   */
  function parseCSV(csvText, options = {}) {
    const {
      hasHeader = true,
      trimHeaders = true,
      trimValues = true,
      skipEmpty = true
    } = options;

    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return { headers: [], rows: [] };

    // Parse header row
    const headers = parseCSVLine(lines[0]);
    if (trimHeaders) {
      headers.forEach((_, i) => {
        headers[i] = headers[i].trim();
      });
    }

    const rows = [];
    const startIdx = hasHeader ? 1 : 0;

    // Parse data rows
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (skipEmpty && line === '') continue;

      const values = parseCSVLine(line);
      const row = {};

      headers.forEach((header, index) => {
        let value = values[index] || '';
        if (trimValues) value = value.trim();
        row[header] = value;
      });

      rows.push(row);
    }

    return { headers, rows };
  }

  /**
   * Validate CSV structure
   * @param {object} parsed - Parsed CSV object from parseCSV()
   * @returns {string[]} - Array of error messages (empty if valid)
   */
  function validateCSV(parsed) {
    const { headers, rows } = parsed;
    const errors = [];

    if (headers.length === 0) {
      errors.push('No headers found');
    }

    rows.forEach((row, idx) => {
      const keys = Object.keys(row);
      if (keys.length !== headers.length) {
        errors.push(`Row ${idx + 2}: Expected ${headers.length} columns, got ${keys.length}`);
      }
    });

    return errors;
  }

  // Export to global namespace
  window.SlimSolo = window.SlimSolo || {};
  window.SlimSolo.CSVParser = {
    parseCSV,
    parseCSVLine,
    validateCSV
  };
})();
