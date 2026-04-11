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

  let _rows        = [];
  let _loaded      = false;
  let _fileName    = null;
  let _lastFile    = null;
  let _activeParser = null;  // PapaParse parser ref during streaming
  let _cancelled   = false;  // set by cancelLoad(), checked in complete()

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
      // Trim leading/trailing whitespace from every string field so that
      // manually edited rows with extra spaces don't break equality checks.
      _rows = results.data.map(row => {
        const clean = {};
        for (const key of Object.keys(row)) {
          const val = row[key];
          clean[key] = typeof val === 'string' ? val.trim() : val;
        }
        return clean;
      });
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
   * Fetch a CSV from a URL and parse it (works when served over HTTP).
   * Falls back gracefully if the file is not found.
   * @param {string} url       Relative or absolute URL to the CSV file.
   * @param {string} [fileName] Display name; defaults to the URL basename.
   * @returns {Promise<{rows, fileName, sizeMB}>}
   */
  function loadFromURL(url, fileName) {
    const name = fileName || url.split('/').pop();
    return new Promise((resolve, reject) => {
      fetch(url, { cache: 'no-store' })
        .then(response => {
          if (!response.ok) {
            reject(new Error(`Could not fetch "${url}": HTTP ${response.status}`));
            return;
          }
          const sizeMB = Number(response.headers.get('content-length') || 0) / (1024 * 1024);
          return response.text().then(text => {
            const results = Papa.parse(text, { header: true, skipEmptyLines: true });
            _parseComplete(results, name, sizeMB, resolve, reject);
          });
        })
        .catch(err => reject(new Error(`Could not fetch "${url}": ${err.message}`)));
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
   * Load and parse a File object in 1 MB chunks, calling onChunk after each.
   * Renders can be triggered progressively while the file is still being read.
   * @param {File}     file
   * @param {Function} [onChunk]  called as onChunk({ isDone, rowCount, sizeMB })
   * @returns {Promise<{rows, fileName, sizeMB}>}
   */
  function loadFromFileStreaming(file, onChunk) {
    return new Promise((resolve, reject) => {
      if (!file) { reject(new Error('No file provided')); return; }

      const sizeMB = file.size / (1024 * 1024);
      _rows      = [];
      _loaded    = false;
      _lastFile  = file;
      _cancelled = false;

      let headerValidated = false;
      let bytesLoaded = 0;
      const CHUNK_SIZE  = 1024 * 1024; // 1 MB
      const pauseEvery  = file.size / 10; // pause at every 10% of file size
      let nextPauseAt   = pauseEvery;

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        chunkSize: CHUNK_SIZE,
        chunk(results, parser) {
          _activeParser = parser;
          if (!headerValidated) {
            try {
              _validateColumns(results.meta.fields || []);
              headerValidated = true;
            } catch (e) {
              parser.abort();
              reject(e);
              return;
            }
          }
          if (results.errors.length > 0) console.warn('CSV chunk warnings:', results.errors);
          const trimmed = results.data.map(row => {
            const clean = {};
            for (const key of Object.keys(row)) {
              const val = row[key];
              clean[key] = typeof val === 'string' ? val.trim() : val;
            }
            return clean;
          });
          Array.prototype.push.apply(_rows, trimmed);
          // Use PapaParse's real byte cursor when available; fall back to the
          // CHUNK_SIZE accumulator so progress is always accurate.
          bytesLoaded = (results.meta && results.meta.cursor)
            ? Math.min(results.meta.cursor, file.size)
            : Math.min(bytesLoaded + CHUNK_SIZE, file.size);
          _loaded   = _rows.length > 0;
          _fileName = file.name;
          if (onChunk) onChunk({
            isDone: false, rowCount: _rows.length, sizeMB,
            bytesLoaded, bytesTotal: file.size
          });
          // Pause 500 ms at every 10% boundary to give the browser a repaint.
          if (bytesLoaded >= nextPauseAt) {
            nextPauseAt += pauseEvery;
            parser.pause();
            setTimeout(() => parser.resume(), 100);
          }
        },
        complete() {
          _activeParser = null;
          if (_cancelled) {
            _cancelled = false;
            _rows = []; _loaded = false; _fileName = null;
            reject(new Error('LOAD_CANCELLED'));
            return;
          }
          _loaded   = _rows.length > 0;
          _fileName = file.name;
          if (onChunk) onChunk({
            isDone: true, rowCount: _rows.length, sizeMB,
            bytesLoaded: file.size, bytesTotal: file.size
          });
          resolve({ rows: _rows, fileName: file.name, sizeMB });
        },
        error(err) {
          _activeParser = null;
          reject(new Error(`Could not parse file: ${err.message}`));
        }
      });
    });
  }

  /**
   * Re-parse the last loaded File without prompting the user again.
   * @param {Function} [onChunk]  optional streaming callback (same as loadFromFileStreaming)
   * @returns {Promise}
   */
  function reload(onChunk) {
    if (!_lastFile) {
      return Promise.reject(new Error('No file has been loaded yet. Please load a file first.'));
    }
    // _rows / _loaded reset inside loadFromFileStreaming
    return loadFromFileStreaming(_lastFile, onChunk);
  }

  /** @returns {Object[]} array of parsed row objects */
  function getData()     { return _rows; }

  /** @returns {boolean} */
  function isLoaded()    { return _loaded; }

  /** @returns {string|null} */
  function getFileName() { return _fileName; }

  /** Abort an in-progress streaming load. The load promise will reject with LOAD_CANCELLED. */
  function cancelLoad() {
    if (_activeParser) {
      _cancelled = true;
      _activeParser.abort();
      _activeParser = null;
    }
  }

  /** Reset all state (used before a fresh load). */
  function clear() {
    _rows     = [];
    _loaded   = false;
    _fileName = null;
    _lastFile = null;
  }

  return { loadFromFile, loadFromFileStreaming, loadFromString, loadFromURL, reload, cancelLoad, getData, isLoaded, getFileName, clear };
})();
