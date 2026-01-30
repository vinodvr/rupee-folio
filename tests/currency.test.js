// Unit tests for currency.js
// Run in browser by opening tests/test-runner.html

import {
  currencyConfig,
  getCurrencyConfig,
  formatCurrency,
  formatNumber,
  getSymbol,
  getRecommendations,
  getFunds,
  getEquityLimits,
  getDebtLimits,
  constrainEquityReturn,
  constrainDebtReturn
} from '../modules/currency.js';

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

function assertContains(str, substring, message = '') {
  if (!str.includes(substring)) {
    throw new Error(`${message} Expected "${str}" to contain "${substring}"`);
  }
}

// ============================================
// TESTS: Currency Configuration
// ============================================

test('Config: INR configuration exists', () => {
  assertTrue(currencyConfig.INR !== undefined, 'INR config should exist');
  assertEqual(currencyConfig.INR.symbol, '₹', 'INR symbol should be ₹');
  assertEqual(currencyConfig.INR.locale, 'en-IN', 'INR locale should be en-IN');
});

test('Config: getCurrencyConfig returns correct config', () => {
  const inrConfig = getCurrencyConfig('INR');
  assertEqual(inrConfig.symbol, '₹');
});

test('Config: getCurrencyConfig defaults to INR for unknown currency', () => {
  const config = getCurrencyConfig('UNKNOWN');
  assertEqual(config.symbol, '₹', 'Unknown currency should default to INR');
});

// ============================================
// TESTS: INR Return Limits
// ============================================

test('INR Limits: Equity return range is 8-13%', () => {
  const limits = getEquityLimits('INR');
  assertEqual(limits.min, 8, 'INR equity min should be 8%');
  assertEqual(limits.max, 13, 'INR equity max should be 13%');
  assertEqual(limits.default, 10, 'INR equity default should be 10%');
});

test('INR Limits: Debt return range is 4-7%', () => {
  const limits = getDebtLimits('INR');
  assertEqual(limits.min, 4, 'INR debt min should be 4%');
  assertEqual(limits.max, 7, 'INR debt max should be 7%');
  assertEqual(limits.default, 5, 'INR debt default should be 5%');
});

// ============================================
// TESTS: Return Constraints
// ============================================

test('Constraint: INR equity return clamped to min', () => {
  const result = constrainEquityReturn(5, 'INR');
  assertEqual(result, 8, 'Should clamp to min 8%');
});

test('Constraint: INR equity return clamped to max', () => {
  const result = constrainEquityReturn(20, 'INR');
  assertEqual(result, 13, 'Should clamp to max 13%');
});

test('Constraint: INR equity return unchanged when in range', () => {
  const result = constrainEquityReturn(11, 'INR');
  assertEqual(result, 11, 'Should remain 11%');
});

test('Constraint: INR debt return clamped to min', () => {
  const result = constrainDebtReturn(1, 'INR');
  assertEqual(result, 4, 'Should clamp to min 4%');
});

test('Constraint: INR debt return clamped to max', () => {
  const result = constrainDebtReturn(10, 'INR');
  assertEqual(result, 7, 'Should clamp to max 7%');
});

test('Constraint: INR debt return unchanged when in range', () => {
  const result = constrainDebtReturn(5, 'INR');
  assertEqual(result, 5, 'Should remain 5%');
});

// ============================================
// TESTS: Currency Symbols
// ============================================

test('Symbol: INR returns ₹', () => {
  assertEqual(getSymbol('INR'), '₹');
});

test('Symbol: Unknown currency defaults to ₹', () => {
  assertEqual(getSymbol('EUR'), '₹', 'Unknown should default to INR symbol');
});

// ============================================
// TESTS: Currency Formatting
// ============================================

test('Format: INR formats with Indian numbering', () => {
  const formatted = formatCurrency(1234567, 'INR');
  assertContains(formatted, '₹', 'Should contain ₹ symbol');
  // Indian numbering: 12,34,567
  assertContains(formatted, '12', 'Should have lakhs separator');
});

test('Format: formatNumber without currency symbol', () => {
  const formatted = formatNumber(1000000, 'INR');
  assertFalse(formatted.includes('₹'), 'Should not contain currency symbol');
  assertTrue(formatted.includes('10'), 'Should contain formatted number');
});

test('Format: Handles zero amount', () => {
  const formatted = formatCurrency(0, 'INR');
  assertContains(formatted, '₹', 'Should contain symbol for zero');
  assertContains(formatted, '0', 'Should contain zero');
});

test('Format: Handles negative amount', () => {
  const formatted = formatCurrency(-50000, 'INR');
  assertContains(formatted, '₹', 'Should contain symbol');
  // Should have negative indicator
  assertTrue(formatted.includes('-') || formatted.includes('('), 'Should indicate negative');
});

// ============================================
// TESTS: Fund Recommendations
// ============================================

test('Funds: INR has fund recommendations', () => {
  const funds = getFunds('INR');
  assertTrue(funds !== null, 'INR should have funds');
  assertTrue(funds.icici !== undefined, 'Should have ICICI funds');
  assertTrue(funds.hdfc !== undefined, 'Should have HDFC funds');
});

test('Funds: ICICI fund names are correct', () => {
  const funds = getFunds('INR');
  assertContains(funds.icici.nifty50, 'ICICI', 'Nifty 50 fund should be ICICI');
  assertContains(funds.icici.nifty50, 'Nifty 50', 'Should mention Nifty 50');
  assertContains(funds.icici.niftyNext50, 'Nifty Next 50', 'Should mention Nifty Next 50');
  assertContains(funds.icici.moneyMarket, 'Money Market', 'Should mention Money Market');
});

test('Funds: HDFC fund names are correct', () => {
  const funds = getFunds('INR');
  assertContains(funds.hdfc.nifty50, 'HDFC', 'Nifty 50 fund should be HDFC');
  assertContains(funds.hdfc.nifty50, 'Nifty 50', 'Should mention Nifty 50');
});

test('Funds: ICICI has arbitrage fund', () => {
  const funds = getFunds('INR');
  assertContains(funds.icici.arbitrage, 'Arbitrage', 'Should have arbitrage fund');
  assertContains(funds.icici.arbitrage, 'ICICI', 'Arbitrage fund should be ICICI');
});

test('Funds: HDFC has arbitrage fund', () => {
  const funds = getFunds('INR');
  assertContains(funds.hdfc.arbitrage, 'Arbitrage', 'Should have arbitrage fund');
  assertContains(funds.hdfc.arbitrage, 'HDFC', 'Arbitrage fund should be HDFC');
});

test('Recommendations: INR has generic recommendations', () => {
  const recs = getRecommendations('INR');
  assertTrue(recs.equity !== undefined, 'Should have equity recommendation');
  assertTrue(recs.debt !== undefined, 'Should have debt recommendation');
  assertContains(recs.equity, 'Index', 'Should recommend index funds');
});

// ============================================
// TESTS: Edge Cases
// ============================================

test('Edge case: Constraint at exact boundary', () => {
  assertEqual(constrainEquityReturn(8, 'INR'), 8, 'Exact min should be allowed');
  assertEqual(constrainEquityReturn(13, 'INR'), 13, 'Exact max should be allowed');
});

test('Edge case: Very large number formatting', () => {
  const formatted = formatCurrency(10000000000, 'INR'); // 1000 crore
  assertContains(formatted, '₹', 'Should handle large numbers');
});

test('Edge case: Decimal amounts', () => {
  const formatted = formatCurrency(1234.56, 'INR');
  // Should round to whole number based on config
  assertContains(formatted, '₹', 'Should handle decimals');
});

// ============================================
// Summary
// ============================================

console.log('\n========================================');
console.log(`Currency Tests completed: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('========================================\n');

export { results, passed, failed };
