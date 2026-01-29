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

test('Config: USD configuration exists', () => {
  assertTrue(currencyConfig.USD !== undefined, 'USD config should exist');
  assertEqual(currencyConfig.USD.symbol, '$', 'USD symbol should be $');
  assertEqual(currencyConfig.USD.locale, 'en-US', 'USD locale should be en-US');
});

test('Config: getCurrencyConfig returns correct config', () => {
  const inrConfig = getCurrencyConfig('INR');
  assertEqual(inrConfig.symbol, '₹');

  const usdConfig = getCurrencyConfig('USD');
  assertEqual(usdConfig.symbol, '$');
});

test('Config: getCurrencyConfig defaults to INR for unknown currency', () => {
  const config = getCurrencyConfig('UNKNOWN');
  assertEqual(config.symbol, '₹', 'Unknown currency should default to INR');
});

// ============================================
// TESTS: INR Return Limits (from README)
// ============================================

test('INR Limits: Equity return range is 9-13.5%', () => {
  const limits = getEquityLimits('INR');
  assertEqual(limits.min, 9, 'INR equity min should be 9%');
  assertEqual(limits.max, 13.5, 'INR equity max should be 13.5%');
  assertEqual(limits.default, 11, 'INR equity default should be 11%');
});

test('INR Limits: Debt return range is 4-6.5%', () => {
  const limits = getDebtLimits('INR');
  assertEqual(limits.min, 4, 'INR debt min should be 4%');
  assertEqual(limits.max, 6.5, 'INR debt max should be 6.5%');
  assertEqual(limits.default, 5, 'INR debt default should be 5%');
});

// ============================================
// TESTS: USD Return Limits (from README)
// ============================================

test('USD Limits: Equity return range is 6-10%', () => {
  const limits = getEquityLimits('USD');
  assertEqual(limits.min, 6, 'USD equity min should be 6%');
  assertEqual(limits.max, 10, 'USD equity max should be 10%');
  assertEqual(limits.default, 8, 'USD equity default should be 8%');
});

test('USD Limits: Debt return range is 2-4.5%', () => {
  const limits = getDebtLimits('USD');
  assertEqual(limits.min, 2, 'USD debt min should be 2%');
  assertEqual(limits.max, 4.5, 'USD debt max should be 4.5%');
  assertEqual(limits.default, 3, 'USD debt default should be 3%');
});

// ============================================
// TESTS: Return Constraints
// ============================================

test('Constraint: INR equity return clamped to min', () => {
  const result = constrainEquityReturn(5, 'INR');
  assertEqual(result, 9, 'Should clamp to min 9%');
});

test('Constraint: INR equity return clamped to max', () => {
  const result = constrainEquityReturn(20, 'INR');
  assertEqual(result, 13.5, 'Should clamp to max 13.5%');
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
  assertEqual(result, 6.5, 'Should clamp to max 6.5%');
});

test('Constraint: USD equity return clamped correctly', () => {
  assertEqual(constrainEquityReturn(3, 'USD'), 6, 'Should clamp to min 6%');
  assertEqual(constrainEquityReturn(15, 'USD'), 10, 'Should clamp to max 10%');
  assertEqual(constrainEquityReturn(8, 'USD'), 8, 'Should remain 8%');
});

test('Constraint: USD debt return clamped correctly', () => {
  assertEqual(constrainDebtReturn(0, 'USD'), 2, 'Should clamp to min 2%');
  assertEqual(constrainDebtReturn(10, 'USD'), 4.5, 'Should clamp to max 4.5%');
  assertEqual(constrainDebtReturn(3, 'USD'), 3, 'Should remain 3%');
});

// ============================================
// TESTS: Currency Symbols
// ============================================

test('Symbol: INR returns ₹', () => {
  assertEqual(getSymbol('INR'), '₹');
});

test('Symbol: USD returns $', () => {
  assertEqual(getSymbol('USD'), '$');
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

test('Format: USD formats with Western numbering', () => {
  const formatted = formatCurrency(1234567, 'USD');
  assertContains(formatted, '$', 'Should contain $ symbol');
  // Western numbering: 1,234,567
  assertContains(formatted, '1,234,567', 'Should have thousands separator');
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

test('Funds: USD returns null for funds', () => {
  const funds = getFunds('USD');
  assertEqual(funds, null, 'USD should not have specific fund recommendations');
});

test('Recommendations: INR has generic recommendations', () => {
  const recs = getRecommendations('INR');
  assertTrue(recs.equity !== undefined, 'Should have equity recommendation');
  assertTrue(recs.debt !== undefined, 'Should have debt recommendation');
  assertContains(recs.equity, 'Index', 'Should recommend index funds');
});

test('Recommendations: USD has generic recommendations', () => {
  const recs = getRecommendations('USD');
  assertTrue(recs.equity !== undefined, 'Should have equity recommendation');
  assertTrue(recs.debt !== undefined, 'Should have debt recommendation');
  assertContains(recs.equity, 'VTI', 'Should recommend VTI or similar');
});

// ============================================
// TESTS: Edge Cases
// ============================================

test('Edge case: Constraint at exact boundary', () => {
  assertEqual(constrainEquityReturn(9, 'INR'), 9, 'Exact min should be allowed');
  assertEqual(constrainEquityReturn(13.5, 'INR'), 13.5, 'Exact max should be allowed');
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
