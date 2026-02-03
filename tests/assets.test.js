// Unit tests for assets.js
// Run in browser by opening tests/test-runner.html

import { getRetirementAssets } from '../modules/assets.js';

// Simple test framework
let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    results.push({ name, status: 'FAIL', error: e.message });
    console.error(`✗ ${name}: ${e.message}`);
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(message || 'Expected true, got false');
  }
}

function assertFalse(condition, message = '') {
  if (condition) {
    throw new Error(message || 'Expected false, got true');
  }
}

// Helper to create test data with assets
function createTestData(assets = []) {
  return {
    settings: {
      currency: 'INR',
      fundHouse: 'icici',
      equityReturn: 10,
      debtReturn: 5
    },
    cashflow: {
      income: [],
      expenses: []
    },
    assets: {
      items: assets
    },
    liabilities: {
      items: []
    },
    goals: []
  };
}

// ============================================
// TESTS: getRetirementAssets
// ============================================

test('getRetirementAssets: Returns zero for empty assets', () => {
  const data = createTestData([]);
  const result = getRetirementAssets(data);

  assertEqual(result.epfCorpus, 0, 'EPF corpus should be 0');
  assertEqual(result.npsCorpus, 0, 'NPS corpus should be 0');
  assertEqual(result.totalCorpus, 0, 'Total corpus should be 0');
});

test('getRetirementAssets: Returns zero when no EPF/NPS assets', () => {
  const data = createTestData([
    { id: '1', name: 'House', category: 'Real Estate', value: 8000000 },
    { id: '2', name: 'Car', category: 'Vehicles', value: 500000 }
  ]);
  const result = getRetirementAssets(data);

  assertEqual(result.epfCorpus, 0, 'EPF corpus should be 0');
  assertEqual(result.npsCorpus, 0, 'NPS corpus should be 0');
  assertEqual(result.totalCorpus, 0, 'Total corpus should be 0');
});

test('getRetirementAssets: Sums single EPF asset', () => {
  const data = createTestData([
    { id: '1', name: 'EPF Self', category: 'EPF', value: 1500000 }
  ]);
  const result = getRetirementAssets(data);

  assertEqual(result.epfCorpus, 1500000, 'EPF corpus should be 15L');
  assertEqual(result.npsCorpus, 0, 'NPS corpus should be 0');
  assertEqual(result.totalCorpus, 1500000, 'Total corpus should be 15L');
});

test('getRetirementAssets: Sums single NPS asset', () => {
  const data = createTestData([
    { id: '1', name: 'NPS Self', category: 'NPS', value: 500000 }
  ]);
  const result = getRetirementAssets(data);

  assertEqual(result.epfCorpus, 0, 'EPF corpus should be 0');
  assertEqual(result.npsCorpus, 500000, 'NPS corpus should be 5L');
  assertEqual(result.totalCorpus, 500000, 'Total corpus should be 5L');
});

test('getRetirementAssets: Sums multiple EPF assets', () => {
  const data = createTestData([
    { id: '1', name: 'EPF Self', category: 'EPF', value: 1500000 },
    { id: '2', name: 'EPF Spouse', category: 'EPF', value: 800000 }
  ]);
  const result = getRetirementAssets(data);

  assertEqual(result.epfCorpus, 2300000, 'EPF corpus should be 23L');
  assertEqual(result.npsCorpus, 0, 'NPS corpus should be 0');
  assertEqual(result.totalCorpus, 2300000, 'Total corpus should be 23L');
});

test('getRetirementAssets: Sums multiple NPS assets', () => {
  const data = createTestData([
    { id: '1', name: 'NPS Self', category: 'NPS', value: 500000 },
    { id: '2', name: 'NPS Spouse', category: 'NPS', value: 300000 }
  ]);
  const result = getRetirementAssets(data);

  assertEqual(result.epfCorpus, 0, 'EPF corpus should be 0');
  assertEqual(result.npsCorpus, 800000, 'NPS corpus should be 8L');
  assertEqual(result.totalCorpus, 800000, 'Total corpus should be 8L');
});

test('getRetirementAssets: Sums both EPF and NPS', () => {
  const data = createTestData([
    { id: '1', name: 'EPF Self', category: 'EPF', value: 1500000 },
    { id: '2', name: 'NPS Self', category: 'NPS', value: 500000 }
  ]);
  const result = getRetirementAssets(data);

  assertEqual(result.epfCorpus, 1500000, 'EPF corpus should be 15L');
  assertEqual(result.npsCorpus, 500000, 'NPS corpus should be 5L');
  assertEqual(result.totalCorpus, 2000000, 'Total corpus should be 20L');
});

test('getRetirementAssets: Ignores non-EPF/NPS assets', () => {
  const data = createTestData([
    { id: '1', name: 'House', category: 'Real Estate', value: 8000000 },
    { id: '2', name: 'EPF Self', category: 'EPF', value: 1500000 },
    { id: '3', name: 'Car', category: 'Vehicles', value: 500000 },
    { id: '4', name: 'NPS Self', category: 'NPS', value: 500000 },
    { id: '5', name: 'FD', category: 'Bank/FDs', value: 200000 }
  ]);
  const result = getRetirementAssets(data);

  assertEqual(result.epfCorpus, 1500000, 'EPF corpus should only include EPF');
  assertEqual(result.npsCorpus, 500000, 'NPS corpus should only include NPS');
  assertEqual(result.totalCorpus, 2000000, 'Total should only include EPF+NPS');
});

test('getRetirementAssets: Handles null data gracefully', () => {
  const result = getRetirementAssets(null);

  assertEqual(result.epfCorpus, 0, 'EPF corpus should be 0 for null');
  assertEqual(result.npsCorpus, 0, 'NPS corpus should be 0 for null');
  assertEqual(result.totalCorpus, 0, 'Total corpus should be 0 for null');
});

test('getRetirementAssets: Handles missing assets gracefully', () => {
  const result = getRetirementAssets({});

  assertEqual(result.epfCorpus, 0, 'EPF corpus should be 0 for empty object');
  assertEqual(result.npsCorpus, 0, 'NPS corpus should be 0 for empty object');
  assertEqual(result.totalCorpus, 0, 'Total corpus should be 0 for empty object');
});

test('getRetirementAssets: Handles undefined value in asset', () => {
  const data = createTestData([
    { id: '1', name: 'EPF Self', category: 'EPF', value: undefined }
  ]);
  const result = getRetirementAssets(data);

  assertEqual(result.epfCorpus, 0, 'Should treat undefined as 0');
  assertEqual(result.totalCorpus, 0, 'Total should be 0');
});

test('getRetirementAssets: Handles null value in asset', () => {
  const data = createTestData([
    { id: '1', name: 'EPF Self', category: 'EPF', value: null }
  ]);
  const result = getRetirementAssets(data);

  assertEqual(result.epfCorpus, 0, 'Should treat null as 0');
  assertEqual(result.totalCorpus, 0, 'Total should be 0');
});

test('getRetirementAssets: Full sample data scenario', () => {
  const data = createTestData([
    { id: 'asset-epf-1', name: 'EPF - Salary Self', category: 'EPF', value: 1500000 },
    { id: 'asset-epf-2', name: 'EPF - Salary Spouse', category: 'EPF', value: 800000 },
    { id: 'asset-nps-1', name: 'NPS - Salary Self', category: 'NPS', value: 500000 },
    { id: 'asset-re-1', name: 'Apartment', category: 'Real Estate', value: 8000000 },
    { id: 'asset-car-1', name: 'Honda City', category: 'Vehicles', value: 800000 },
    { id: 'asset-mf-1', name: 'Bluechip Fund', category: 'Mutual Funds', value: 500000 },
    { id: 'asset-fd-1', name: 'HDFC FD', category: 'Bank/FDs', value: 300000 }
  ]);
  const result = getRetirementAssets(data);

  assertEqual(result.epfCorpus, 2300000, 'EPF corpus should be 15L + 8L = 23L');
  assertEqual(result.npsCorpus, 500000, 'NPS corpus should be 5L');
  assertEqual(result.totalCorpus, 2800000, 'Total corpus should be 28L');
});

// ============================================
// TESTS: Asset Categories
// ============================================

test('Categories: EPF category is case-sensitive', () => {
  const data = createTestData([
    { id: '1', name: 'EPF', category: 'EPF', value: 1000000 },
    { id: '2', name: 'epf', category: 'epf', value: 500000 }  // lowercase won't match
  ]);
  const result = getRetirementAssets(data);

  assertEqual(result.epfCorpus, 1000000, 'Only exact EPF category should match');
});

test('Categories: NPS category is case-sensitive', () => {
  const data = createTestData([
    { id: '1', name: 'NPS', category: 'NPS', value: 1000000 },
    { id: '2', name: 'nps', category: 'nps', value: 500000 }  // lowercase won't match
  ]);
  const result = getRetirementAssets(data);

  assertEqual(result.npsCorpus, 1000000, 'Only exact NPS category should match');
});

// ============================================
// Summary
// ============================================

console.log('\n========================================');
console.log(`Assets Tests completed: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('========================================\n');

export { results, passed, failed };
