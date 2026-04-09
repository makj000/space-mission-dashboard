/**
 * tests.js — Test runner for all required functions.
 *
 * Currently covers: getMissionCountByCompany (Function 1).
 *
 * The sample CSV is embedded below so tests run immediately without a
 * network request or manual file-pick. A "Load custom CSV" button lets
 * testers override with a different file.
 *
 * Failing tests attempt to save a screenshot to test_screenshots/:
 *   - Chrome/Edge  : File System Access API (showDirectoryPicker)
 *   - All browsers : fallback auto-download to the browser's download folder
 */
'use strict';

// ── Embedded sample data (mirrors data/sample.csv exactly) ───────────────────
const SAMPLE_CSV = `Company,Location,Date,Time,Rocket,Mission,RocketStatus,Price,MissionStatus
RVSN USSR,"Site 1/5, Baikonur Cosmodrome, Kazakhstan",1957-10-04,19:28:00,Sputnik 8K71PS,Sputnik-1,Retired,,Success
RVSN USSR,"Site 1/5, Baikonur Cosmodrome, Kazakhstan",1957-11-03,02:30:00,Sputnik 8K71PS,Sputnik-2,Retired,,Success
US Navy,"LC-18A, Cape Canaveral AFS, Florida, USA",1957-12-06,16:44:00,Vanguard,Vanguard TV3,Retired,,Failure
AMBA,"LC-26A, Cape Canaveral AFS, Florida, USA",1958-02-01,03:48:00,Juno I,Explorer 1,Retired,,Success
US Navy,"LC-18A, Cape Canaveral AFS, Florida, USA",1958-02-05,07:33:00,Vanguard,Vanguard TV3BU,Retired,,Failure
AMBA,"LC-26A, Cape Canaveral AFS, Florida, USA",1958-03-05,18:27:00,Juno I,Explorer 2,Retired,,Failure
US Navy,"LC-18A, Cape Canaveral AFS, Florida, USA",1958-03-17,12:15:00,Vanguard,Vanguard 1,Retired,,Success
AMBA,"LC-5, Cape Canaveral AFS, Florida, USA",1958-03-26,17:38:00,Juno I,Explorer 3,Retired,,Success
RVSN USSR,"Site 1/5, Baikonur Cosmodrome, Kazakhstan",1958-04-27,09:01:00,Sputnik 8A91,Sputnik-3 #1,Retired,,Failure
US Navy,"LC-18A, Cape Canaveral AFS, Florida, USA",1958-04-28,02:53:00,Vanguard,Vanguard TV5,Retired,,Failure`;

// ── Test case definitions ─────────────────────────────────────────────────────
// Each entry: { id, fn, description, run }
//   run()  must return { passed: bool, actual, expected, note? }

const TEST_CASES = [
  // ── Happy-path: known counts (derived from sample.csv) ─────────────────
  {
    id: 'fn1_rvsn_count',
    fn: 'getMissionCountByCompany',
    description: '"RVSN USSR" → 3 missions',
    run() {
      const actual   = getMissionCountByCompany('RVSN USSR');
      const expected = 3;
      return { passed: actual === expected, actual, expected };
    }
  },
  {
    id: 'fn1_usnavy_count',
    fn: 'getMissionCountByCompany',
    description: '"US Navy" → 4 missions',
    run() {
      const actual   = getMissionCountByCompany('US Navy');
      const expected = 4;
      return { passed: actual === expected, actual, expected };
    }
  },
  {
    id: 'fn1_amba_count',
    fn: 'getMissionCountByCompany',
    description: '"AMBA" → 3 missions',
    run() {
      const actual   = getMissionCountByCompany('AMBA');
      const expected = 3;
      return { passed: actual === expected, actual, expected };
    }
  },

  // ── Unknown company → 0 ────────────────────────────────────────────────
  {
    id: 'fn1_unknown_company',
    fn: 'getMissionCountByCompany',
    description: 'Unknown company "SpaceX" → 0',
    run() {
      const actual   = getMissionCountByCompany('SpaceX');
      const expected = 0;
      return { passed: actual === expected, actual, expected };
    }
  },
  {
    id: 'fn1_nonexistent',
    fn: 'getMissionCountByCompany',
    description: 'Completely unknown "NonExistentCorp2099" → 0',
    run() {
      const actual   = getMissionCountByCompany('NonExistentCorp2099');
      const expected = 0;
      return { passed: actual === expected, actual, expected };
    }
  },

  // ── Return type ────────────────────────────────────────────────────────
  {
    id: 'fn1_returns_integer',
    fn: 'getMissionCountByCompany',
    description: 'Return value is a number (integer)',
    run() {
      const actual   = getMissionCountByCompany('RVSN USSR');
      const isInt    = typeof actual === 'number' && Number.isInteger(actual);
      return { passed: isInt, actual: `typeof=${typeof actual}, isInt=${Number.isInteger(actual)}`, expected: 'integer number' };
    }
  },

  // ── Whitespace trimming ────────────────────────────────────────────────
  {
    id: 'fn1_trim_whitespace',
    fn: 'getMissionCountByCompany',
    description: '"  RVSN USSR  " (padded) → same as "RVSN USSR"',
    run() {
      const actual   = getMissionCountByCompany('  RVSN USSR  ');
      const expected = 3;
      return { passed: actual === expected, actual, expected };
    }
  },

  // ── Case sensitivity ───────────────────────────────────────────────────
  {
    id: 'fn1_case_sensitive',
    fn: 'getMissionCountByCompany',
    description: '"rvsn ussr" (lowercase) → 0 (case-sensitive match)',
    run() {
      const actual   = getMissionCountByCompany('rvsn ussr');
      const expected = 0;
      return { passed: actual === expected, actual, expected };
    }
  },

  // ── Invalid inputs: should throw ──────────────────────────────────────
  {
    id: 'fn1_throw_null',
    fn: 'getMissionCountByCompany',
    description: 'null → throws Error',
    run() {
      try {
        getMissionCountByCompany(null);
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  },
  {
    id: 'fn1_throw_undefined',
    fn: 'getMissionCountByCompany',
    description: 'undefined → throws Error',
    run() {
      try {
        getMissionCountByCompany(undefined);
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  },
  {
    id: 'fn1_throw_empty_string',
    fn: 'getMissionCountByCompany',
    description: '"" (empty string) → throws Error',
    run() {
      try {
        getMissionCountByCompany('');
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  },
  {
    id: 'fn1_throw_whitespace_only',
    fn: 'getMissionCountByCompany',
    description: '"   " (whitespace only) → throws Error',
    run() {
      try {
        getMissionCountByCompany('   ');
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  },
  {
    id: 'fn1_throw_number',
    fn: 'getMissionCountByCompany',
    description: '42 (number) → throws Error',
    run() {
      try {
        getMissionCountByCompany(42);
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  },
  {
    id: 'fn1_throw_object',
    fn: 'getMissionCountByCompany',
    description: '{} (object) → throws Error',
    run() {
      try {
        getMissionCountByCompany({});
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  },
  {
    id: 'fn1_throw_array',
    fn: 'getMissionCountByCompany',
    description: '[] (array) → throws Error',
    run() {
      try {
        getMissionCountByCompany([]);
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  }
];

// ── Screenshot helpers ────────────────────────────────────────────────────────

let _fsDirectoryHandle = null; // File System Access API handle (Chrome/Edge)

async function _pickScreenshotDir() {
  if (typeof window.showDirectoryPicker !== 'function') return null;
  try {
    _fsDirectoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    return _fsDirectoryHandle;
  } catch {
    return null;
  }
}

async function _saveScreenshot(testId, fnName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const filename  = `test_${fnName}_${testId}_${timestamp}.png`;

  let canvas;
  try {
    canvas = await html2canvas(document.getElementById('results-container'), {
      backgroundColor: '#ffffff',
      scale: 1
    });
  } catch (err) {
    console.warn('Screenshot capture failed:', err);
    return;
  }

  // Try File System Access API first (Chrome/Edge — writes to test_screenshots/)
  if (_fsDirectoryHandle) {
    try {
      const fileHandle = await _fsDirectoryHandle.getFileHandle(filename, { create: true });
      const writable   = await fileHandle.createWritable();
      canvas.toBlob(async blob => {
        await writable.write(blob);
        await writable.close();
        console.log(`Screenshot saved: ${filename}`);
      }, 'image/png');
      return;
    } catch (err) {
      console.warn('FSAPI write failed, falling back to download:', err);
    }
  }

  // Fallback: auto-download (all browsers)
  canvas.toBlob(blob => {
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, 'image/png');
}

// ── Runner ────────────────────────────────────────────────────────────────────

async function runTests() {
  const resultsEl = document.getElementById('results-container');
  const summaryEl = document.getElementById('summary');

  resultsEl.innerHTML = '';
  summaryEl.textContent = 'Running…';

  let passed = 0;
  let failed = 0;
  const failedIds = [];

  const table = document.createElement('table');
  table.className = 'test-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th>Function</th>
        <th>Description</th>
        <th>Expected</th>
        <th>Actual</th>
        <th>Result</th>
      </tr>
    </thead>`;
  const tbody = document.createElement('tbody');

  for (const [i, tc] of TEST_CASES.entries()) {
    let result;
    try {
      result = tc.run();
    } catch (err) {
      result = { passed: false, actual: `Uncaught: ${err.message}`, expected: 'No uncaught error' };
    }

    const tr = document.createElement('tr');
    tr.className = result.passed ? 'pass' : 'fail';
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td><code>${tc.fn}</code></td>
      <td>${tc.description}</td>
      <td>${result.expected}</td>
      <td>${result.actual}</td>
      <td class="status">${result.passed ? '✅ PASS' : '❌ FAIL'}</td>`;
    tbody.appendChild(tr);

    if (result.passed) {
      passed++;
    } else {
      failed++;
      failedIds.push(tc.id);
    }
  }

  table.appendChild(tbody);
  resultsEl.appendChild(table);

  summaryEl.textContent =
    `${TEST_CASES.length} tests — ✅ ${passed} passed, ❌ ${failed} failed`;
  summaryEl.className = failed === 0 ? 'summary-pass' : 'summary-fail';

  // Take screenshots for each failing test
  if (failedIds.length > 0) {
    for (const id of failedIds) {
      const tc = TEST_CASES.find(t => t.id === id);
      await _saveScreenshot(id, tc.fn);
    }
  }
}

// ── Initialisation ────────────────────────────────────────────────────────────

async function initTestRunner() {
  const statusEl   = document.getElementById('data-status');
  const runBtn     = document.getElementById('btn-run');
  const csvBtn     = document.getElementById('btn-load-csv');
  const csvInput   = document.getElementById('csv-input');
  const screenshotBtn = document.getElementById('btn-pick-dir');

  // Load embedded sample data immediately
  try {
    await DataStore.loadFromString(SAMPLE_CSV, 'sample.csv (embedded)');
    statusEl.textContent = `Data loaded: sample.csv (embedded) — ${DataStore.getData().length} rows`;
    statusEl.className = 'status-ok';
  } catch (err) {
    statusEl.textContent = `Failed to load embedded data: ${err.message}`;
    statusEl.className = 'status-error';
  }

  // Allow loading a different CSV file
  csvBtn.addEventListener('click', () => csvInput.click());
  csvInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      DataStore.clear();
      const info = await DataStore.loadFromFile(file);
      statusEl.textContent = `Data loaded: ${info.fileName} — ${info.rows.length} rows`;
      statusEl.className = 'status-ok';
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.className = 'status-error';
    }
  });

  // Screenshot directory picker (Chrome/Edge only)
  if (typeof window.showDirectoryPicker === 'function') {
    screenshotBtn.style.display = 'inline-block';
    screenshotBtn.addEventListener('click', async () => {
      const handle = await _pickScreenshotDir();
      screenshotBtn.textContent = handle
        ? '📁 Screenshots → test_screenshots/'
        : '📁 Pick screenshot folder';
    });
  }

  // Run button
  runBtn.addEventListener('click', runTests);

  // Auto-run on load
  await runTests();
}

document.addEventListener('DOMContentLoaded', initTestRunner);
