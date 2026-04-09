/**
 * data.js — CSV loading, parsing, validation, and in-memory data store.
 * All other modules call DataStore.getData() to access the loaded rows.
 */
const DataStore = (() => {
  'use strict';

  const REQUIRED_COLUMNS = [
    'Company', 'Location', 'Date', 'Time',
    'Rocket', 'Mission', 'RocketStatus', 'Price', 'MissionStatus'
  ];
  const MAX_FILE_SIZE_MB = 50;

  let _rows     = [];
  let _loaded   = false;
  let _fileName = null;
  let _lastFile = null;

  // ── private helpers ──────────────────────────────────────────────────────

  function _validateColumns(fields) {
    const missing = REQUIRED_COLUMNS.filter(col => !fields.includes(col));
    if (missing.length > 0) {
      throw new Error(`Missing required column(s): ${missing.join(', ')}`);
    }
  }

  function _parseComplete(results, fileName, sizeMB, resolve, reject) {
    try {
      if (!results.meta.fields || results.meta.fields.length === 0) {
        reject(new Error('Could not parse file. Please verify it is a valid CSV.'));
        return;
      }
      _validateColumns(results.meta.fields);
      if (results.errors.length > 0) {
        console.warn('CSV parse warnings:', results.errors);
      }
      _rows     = results.data;
      _loaded   = true;
      _fileName = fileName;
      resolve({ rows: _rows, fileName, sizeMB });
    } catch (e) {
      reject(e);
    }
  }

  // ── public API ───────────────────────────────────────────────────────────

  /**
   * Load and parse a File object (from <input type="file"> or drag-and-drop).
   * @param {File} file
   * @returns {Promise<{rows, fileName, sizeMB}>}
   */
  function loadFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file provided'));
        return;
      }

      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_FILE_SIZE_MB) {
        console.warn(
          `Large file detected (${sizeMB.toFixed(1)} MB). Performance may be affected.`
        );
      }

      _lastFile = file;

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: results =>
          _parseComplete(results, file.name, sizeMB, resolve, reject),
        error: err =>
          reject(new Error(`Could not parse file: ${err.message}`))
      });
    });
  }

  /**
   * Load and parse a raw CSV string (used by the test runner with embedded data).
   * @param {string} csvString
   * @param {string} [fileName]
   * @returns {Promise<{rows, fileName, sizeMB}>}
   */
  function loadFromString(csvString, fileName = 'inline-data') {
    return new Promise((resolve, reject) => {
      if (typeof csvString !== 'string' || csvString.trim() === '') {
        reject(new Error('csvString must be a non-empty string'));
        return;
      }
      const results = Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true
      });
      _parseComplete(results, fileName, 0, resolve, reject);
    });
  }

  /**
   * Re-parse the last loaded File without prompting the user again.
   * @returns {Promise}
   */
  function reload() {
    if (!_lastFile) {
      return Promise.reject(new Error('No file has been loaded yet. Please load a file first.'));
    }
    _rows   = [];
    _loaded = false;
    return loadFromFile(_lastFile);
  }

  /** @returns {Object[]} array of parsed row objects */
  function getData()     { return _rows; }

  /** @returns {boolean} */
  function isLoaded()    { return _loaded; }

  /** @returns {string|null} */
  function getFileName() { return _fileName; }

  /** Reset all state (used before a fresh load). */
  function clear() {
    _rows     = [];
    _loaded   = false;
    _fileName = null;
    _lastFile = null;
  }

  return { loadFromFile, loadFromString, reload, getData, isLoaded, getFileName, clear };
})();
