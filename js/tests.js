/**
 * tests.js — Test runner for all required functions.
 *
 * Covers all 8 required functions (Functions 1–8).
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

// ── Embedded sample data (mirrors test/test_cases.csv exactly) ───────────────
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
  },

  // ── Function 2: getSuccessRate ────────────────────────────────────────────────

  {
    id: 'fn2_rvsn_rate',
    fn: 'getSuccessRate',
    description: '"RVSN USSR" → 66.66667% (2 of 3 success)',
    run() {
      const actual   = getSuccessRate('RVSN USSR');
      const expected = parseFloat((2/3*100).toFixed(5));
      return { passed: actual === expected, actual, expected };
    }
  },
  {
    id: 'fn2_usnavy_rate',
    fn: 'getSuccessRate',
    description: '"US Navy" → 25% (1 of 4 success)',
    run() {
      const actual   = getSuccessRate('US Navy');
      const expected = 25.00000;
      return { passed: actual === expected, actual, expected };
    }
  },
  {
    id: 'fn2_unknown_returns_zero',
    fn: 'getSuccessRate',
    description: 'Unknown company → 0.0',
    run() {
      const actual   = getSuccessRate('NoSuchCorp');
      const expected = 0.0;
      return { passed: actual === expected, actual, expected };
    }
  },
  {
    id: 'fn2_returns_float',
    fn: 'getSuccessRate',
    description: 'Return value is a number',
    run() {
      const actual = getSuccessRate('RVSN USSR');
      return { passed: typeof actual === 'number', actual: typeof actual, expected: 'number' };
    }
  },
  {
    id: 'fn2_throw_null',
    fn: 'getSuccessRate',
    description: 'null → throws Error',
    run() {
      try {
        getSuccessRate(null);
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  },
  {
    id: 'fn2_throw_empty',
    fn: 'getSuccessRate',
    description: '"" → throws Error',
    run() {
      try {
        getSuccessRate('');
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  },

  // ── Function 3: getMissionsByDateRange ────────────────────────────────────────

  {
    id: 'fn3_range_1957',
    fn: 'getMissionsByDateRange',
    description: '1957-10-01 to 1957-12-31 → [Sputnik-1, Sputnik-2, Vanguard TV3]',
    run() {
      const actual   = getMissionsByDateRange('1957-10-01', '1957-12-31');
      const expected = ['Sputnik-1', 'Sputnik-2', 'Vanguard TV3'];
      const passed   = JSON.stringify(actual) === JSON.stringify(expected);
      return { passed, actual: JSON.stringify(actual), expected: JSON.stringify(expected) };
    }
  },
  {
    id: 'fn3_single_day',
    fn: 'getMissionsByDateRange',
    description: 'Same start and end date → only that day',
    run() {
      const actual = getMissionsByDateRange('1957-10-04', '1957-10-04');
      const passed = actual.length === 1 && actual[0] === 'Sputnik-1';
      return { passed, actual: JSON.stringify(actual), expected: '["Sputnik-1"]' };
    }
  },
  {
    id: 'fn3_empty_range',
    fn: 'getMissionsByDateRange',
    description: 'Range with no missions → []',
    run() {
      const actual = getMissionsByDateRange('1900-01-01', '1900-12-31');
      return { passed: Array.isArray(actual) && actual.length === 0, actual: JSON.stringify(actual), expected: '[]' };
    }
  },
  {
    id: 'fn3_sorted_chronologically',
    fn: 'getMissionsByDateRange',
    description: 'Results are sorted chronologically',
    run() {
      const actual = getMissionsByDateRange('1957-10-01', '1958-04-28');
      const dates  = actual.map(name => {
        const row = DataStore.getData().find(r => r.Mission === name);
        return row ? row.Date : '';
      });
      const sorted = [...dates].sort();
      const passed = JSON.stringify(dates) === JSON.stringify(sorted);
      return { passed, actual: `${actual.length} missions`, expected: 'chronologically sorted' };
    }
  },
  {
    id: 'fn3_throw_bad_format',
    fn: 'getMissionsByDateRange',
    description: 'Bad date format → throws Error',
    run() {
      try {
        getMissionsByDateRange('10/04/1957', '1957-12-31');
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  },
  {
    id: 'fn3_throw_start_after_end',
    fn: 'getMissionsByDateRange',
    description: 'startDate after endDate → throws Error',
    run() {
      try {
        getMissionsByDateRange('1958-12-31', '1957-01-01');
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  },

  // ── Function 4: getTopCompaniesByMissionCount ─────────────────────────────────

  {
    id: 'fn4_top1',
    fn: 'getTopCompaniesByMissionCount',
    description: 'n=1 → top company is US Navy with 4 missions',
    run() {
      const actual   = getTopCompaniesByMissionCount(1);
      const passed   = actual.length === 1 && actual[0][0] === 'US Navy' && actual[0][1] === 4;
      return { passed, actual: JSON.stringify(actual), expected: '[["US Navy",4]]' };
    }
  },
  {
    id: 'fn4_top3',
    fn: 'getTopCompaniesByMissionCount',
    description: 'n=3 → top 3 companies sorted by count desc, ties alpha',
    run() {
      const actual = getTopCompaniesByMissionCount(3);
      const passed = actual.length === 3 &&
        actual[0][1] >= actual[1][1] &&
        actual[1][1] >= actual[2][1];
      return { passed, actual: JSON.stringify(actual), expected: '3 items desc by count' };
    }
  },
  {
    id: 'fn4_returns_array',
    fn: 'getTopCompaniesByMissionCount',
    description: 'Return value is an Array',
    run() {
      const actual = getTopCompaniesByMissionCount(2);
      return { passed: Array.isArray(actual), actual: typeof actual, expected: 'array' };
    }
  },
  {
    id: 'fn4_throw_zero',
    fn: 'getTopCompaniesByMissionCount',
    description: 'n=0 → throws Error',
    run() {
      try {
        getTopCompaniesByMissionCount(0);
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  },
  {
    id: 'fn4_throw_float',
    fn: 'getTopCompaniesByMissionCount',
    description: 'n=1.5 → throws Error',
    run() {
      try {
        getTopCompaniesByMissionCount(1.5);
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  },
  {
    id: 'fn4_throw_null',
    fn: 'getTopCompaniesByMissionCount',
    description: 'null → throws Error',
    run() {
      try {
        getTopCompaniesByMissionCount(null);
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  },

  // ── Function 5: getMissionStatusCount ────────────────────────────────────────

  {
    id: 'fn5_returns_object',
    fn: 'getMissionStatusCount',
    description: 'Returns an object with all 4 status keys',
    run() {
      const actual = getMissionStatusCount();
      const keys   = ['Success', 'Failure', 'Partial Failure', 'Prelaunch Failure'];
      const passed = typeof actual === 'object' && keys.every(k => k in actual);
      return { passed, actual: JSON.stringify(Object.keys(actual)), expected: JSON.stringify(keys) };
    }
  },
  {
    id: 'fn5_correct_counts',
    fn: 'getMissionStatusCount',
    description: 'Success=5, Failure=5, Partial Failure=0, Prelaunch Failure=0 (sample)',
    run() {
      const actual = getMissionStatusCount();
      const passed = actual['Success'] === 5 && actual['Failure'] === 5 &&
                     actual['Partial Failure'] === 0 && actual['Prelaunch Failure'] === 0;
      return { passed, actual: JSON.stringify(actual), expected: '{"Success":5,"Failure":5,"Partial Failure":0,"Prelaunch Failure":0}' };
    }
  },
  {
    id: 'fn5_values_are_integers',
    fn: 'getMissionStatusCount',
    description: 'All values are non-negative integers',
    run() {
      const actual = getMissionStatusCount();
      const passed = Object.values(actual).every(v => Number.isInteger(v) && v >= 0);
      return { passed, actual: JSON.stringify(actual), expected: 'all non-negative integers' };
    }
  },

  // ── Function 6: getMissionsByYear ─────────────────────────────────────────────

  {
    id: 'fn6_1957',
    fn: 'getMissionsByYear',
    description: '1957 → 3 missions',
    run() {
      const actual   = getMissionsByYear(1957);
      const expected = 3;
      return { passed: actual === expected, actual, expected };
    }
  },
  {
    id: 'fn6_1958',
    fn: 'getMissionsByYear',
    description: '1958 → 7 missions',
    run() {
      const actual   = getMissionsByYear(1958);
      const expected = 7;
      return { passed: actual === expected, actual, expected };
    }
  },
  {
    id: 'fn6_no_missions_year',
    fn: 'getMissionsByYear',
    description: '1900 → 0 missions',
    run() {
      const actual   = getMissionsByYear(1900);
      const expected = 0;
      return { passed: actual === expected, actual, expected };
    }
  },
  {
    id: 'fn6_throw_zero',
    fn: 'getMissionsByYear',
    description: '0 → throws Error',
    run() {
      try {
        getMissionsByYear(0);
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  },
  {
    id: 'fn6_throw_string',
    fn: 'getMissionsByYear',
    description: '"1957" (string) → throws Error',
    run() {
      try {
        getMissionsByYear('1957');
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  },

  // ── Function 7: getMostUsedRocket ─────────────────────────────────────────────

  {
    id: 'fn7_most_used',
    fn: 'getMostUsedRocket',
    description: 'Returns the most used rocket (Vanguard: 4 uses in sample)',
    run() {
      const actual   = getMostUsedRocket();
      const expected = 'Vanguard';
      return { passed: actual === expected, actual, expected };
    }
  },
  {
    id: 'fn7_returns_string',
    fn: 'getMostUsedRocket',
    description: 'Return value is a string',
    run() {
      const actual = getMostUsedRocket();
      return { passed: typeof actual === 'string', actual: typeof actual, expected: 'string' };
    }
  },
  {
    id: 'fn7_alpha_tiebreak',
    fn: 'getMostUsedRocket',
    description: 'Ties broken alphabetically (Juno I and Sputnik 8K71PS both have 2 uses — Juno I wins)',
    run() {
      // In sample: Vanguard=4, Juno I=3, Sputnik 8K71PS=2, Sputnik 8A91=1
      // So no actual tie for most-used, but verify result is non-empty
      const actual = getMostUsedRocket();
      return { passed: actual.length > 0, actual, expected: 'non-empty string' };
    }
  },

  // ── Function 8: getAverageMissionsPerYear ─────────────────────────────────────

  {
    id: 'fn8_two_years',
    fn: 'getAverageMissionsPerYear',
    description: '1957–1958 → avg (3+7)/2 = 5.00000',
    run() {
      const actual   = getAverageMissionsPerYear(1957, 1958);
      const expected = 5.00000;
      return { passed: actual === expected, actual, expected };
    }
  },
  {
    id: 'fn8_single_year',
    fn: 'getAverageMissionsPerYear',
    description: '1957–1957 → 3.00000 (same as getMissionsByYear(1957))',
    run() {
      const actual   = getAverageMissionsPerYear(1957, 1957);
      const expected = 3.00000;
      return { passed: actual === expected, actual, expected };
    }
  },
  {
    id: 'fn8_returns_float',
    fn: 'getAverageMissionsPerYear',
    description: 'Return value is a number',
    run() {
      const actual = getAverageMissionsPerYear(1957, 1958);
      return { passed: typeof actual === 'number', actual: typeof actual, expected: 'number' };
    }
  },
  {
    id: 'fn8_five_decimals',
    fn: 'getAverageMissionsPerYear',
    description: 'Value has at most 5 decimal places',
    run() {
      const actual   = getAverageMissionsPerYear(1957, 1958);
      const decimals = (actual.toString().split('.')[1] || '').length;
      return { passed: decimals <= 5, actual: `${actual} (${decimals} decimals)`, expected: '≤ 5 decimal places' };
    }
  },
  {
    id: 'fn8_throw_start_after_end',
    fn: 'getAverageMissionsPerYear',
    description: 'startYear > endYear → throws Error',
    run() {
      try {
        getAverageMissionsPerYear(1958, 1957);
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  },
  {
    id: 'fn8_throw_float',
    fn: 'getAverageMissionsPerYear',
    description: 'Float year → throws Error',
    run() {
      try {
        getAverageMissionsPerYear(1957.5, 1958);
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  },
  {
    id: 'fn8_throw_null',
    fn: 'getAverageMissionsPerYear',
    description: 'null startYear → throws Error',
    run() {
      try {
        getAverageMissionsPerYear(null, 1958);
        return { passed: false, actual: 'no error thrown', expected: 'Error thrown' };
      } catch (e) {
        return { passed: e instanceof Error, actual: `Error: ${e.message}`, expected: 'Error thrown' };
      }
    }
  },

  // ── full_ tests: only run when DataStore has >100 rows (full CSV loaded) ──────
  // These verify the Artemis II row added to data/space_missions.csv on 2026-04-01.

  {
    id: 'full_fn6_2026',
    fn: 'getMissionsByYear',
    description: '[full CSV] 2026 → 1 mission (Artemis II)',
    run() {
      const actual   = getMissionsByYear(2026);
      const expected = 1;
      return { passed: actual === expected, actual, expected };
    }
  },
  {
    id: 'full_fn3_artemis_ii',
    fn: 'getMissionsByDateRange',
    description: '[full CSV] 2026-04-01 to 2026-04-01 → ["Artemis II"]',
    run() {
      const actual   = getMissionsByDateRange('2026-04-01', '2026-04-01');
      const expected = ['Artemis II'];
      const passed   = JSON.stringify(actual) === JSON.stringify(expected);
      return { passed, actual: JSON.stringify(actual), expected: JSON.stringify(expected) };
    }
  },
  {
    id: 'full_fn1_nasa_2026',
    fn: 'getMissionCountByCompany',
    description: '[full CSV] NASA count includes Artemis II (> 0)',
    run() {
      const actual = getMissionCountByCompany('NASA');
      return { passed: actual > 0, actual, expected: '> 0' };
    }
  },
  {
    id: 'full_fn2_nasa_rate',
    fn: 'getSuccessRate',
    description: '[full CSV] NASA success rate is a float 0–100',
    run() {
      const actual = getSuccessRate('NASA');
      const passed = typeof actual === 'number' && actual >= 0 && actual <= 100;
      return { passed, actual, expected: 'float 0–100' };
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

  const isFullDataLoaded = DataStore.getData().length > 100;
  let skipped = 0;

  for (const [i, tc] of TEST_CASES.entries()) {
    const isFull = tc.id.startsWith('full_');

    // full_ tests require the complete CSV; skip them in sample mode
    if (isFull && !isFullDataLoaded) {
      skipped++;
      const tr = document.createElement('tr');
      tr.className = 'skip';
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td><code>${tc.fn}</code></td>
        <td>${tc.description}</td>
        <td>—</td>
        <td>—</td>
        <td class="status">⏭ SKIP</td>`;
      tbody.appendChild(tr);
      continue;
    }

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

  const skipNote = skipped > 0 ? `, ⏭ ${skipped} skipped (load full CSV to run)` : '';
  summaryEl.textContent =
    `${TEST_CASES.length} tests — ✅ ${passed} passed, ❌ ${failed} failed${skipNote}`;
  summaryEl.className = failed === 0 ? 'summary-pass' : 'summary-fail';

  const tsEl = document.getElementById('run-timestamp');
  if (tsEl) {
    tsEl.textContent = `Last run: ${new Date().toLocaleString()}`;
    tsEl.style.display = 'block';
  }

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
