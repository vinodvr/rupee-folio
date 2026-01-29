// Unit tests for calculator.js
// Run in browser by opening tests/test-runner.html

import {
  getYearsRemaining,
  getMonthsRemaining,
  calculateInflationAdjustedAmount,
  calculateBlendedReturn,
  calculateRegularSIP,
  getGoalCategory,
  getMaxEquity,
  getMaxEquityForYearsRemaining,
  getYearlyReturns,
  calculateEffectiveXIRR,
  calculateCorpusFVWithGlidePath,
  calculateStepUpSIPWithGlidePath,
  calculateGoalProjections,
  calculateTotalInvested,
  needsRebalanceAlert
} from '../modules/calculator.js';

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

function assertApproxEqual(actual, expected, tolerance = 0.1, message = '') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message} Expected ~${expected}, got ${actual} (tolerance: ${tolerance})`);
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

// Helper to create a goal object
function createGoal(options) {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setFullYear(targetDate.getFullYear() + (options.yearsFromNow || 10));

  return {
    id: options.id || 'test-goal',
    name: options.name || 'Test Goal',
    targetAmount: options.targetAmount || 1000000,
    inflationRate: options.inflationRate ?? 6,
    targetDate: options.targetDate || targetDate.toISOString().split('T')[0],
    equityPercent: options.equityPercent ?? 70,
    debtPercent: options.debtPercent ?? 30,
    equityReturn: options.equityReturn ?? 11,
    debtReturn: options.debtReturn ?? 5,
    annualStepUp: options.annualStepUp ?? 5,
    goalType: options.goalType || 'one-time',
    initialLumpsum: options.initialLumpsum ?? 0,
    startDate: options.startDate || today.toISOString().split('T')[0],
    investments: options.investments || []
  };
}

// ============================================
// TESTS: Basic Calculation Functions
// ============================================

test('calculateBlendedReturn: 70/30 allocation', () => {
  const result = calculateBlendedReturn(70, 11, 30, 5);
  assertApproxEqual(result, 9.2, 0.01, 'Blended return');
});

test('calculateBlendedReturn: 100% equity', () => {
  const result = calculateBlendedReturn(100, 11, 0, 5);
  assertApproxEqual(result, 11, 0.01);
});

test('calculateBlendedReturn: 100% debt', () => {
  const result = calculateBlendedReturn(0, 11, 100, 5);
  assertApproxEqual(result, 5, 0.01);
});

test('calculateInflationAdjustedAmount: 6% for 10 years', () => {
  const result = calculateInflationAdjustedAmount(1000000, 6, 10);
  assertApproxEqual(result, 1790848, 1, 'Inflation adjusted amount');
});

test('calculateTotalInvested: lumpsum only', () => {
  const result = calculateTotalInvested([], 100000);
  assertEqual(result, 100000);
});

test('calculateTotalInvested: lumpsum + investments', () => {
  const investments = [
    { amount: 50000 },
    { amount: 30000 }
  ];
  const result = calculateTotalInvested(investments, 100000);
  assertEqual(result, 180000);
});

// ============================================
// TESTS: Goal Categories
// ============================================

test('getGoalCategory: Long term (10 years)', () => {
  const goal = createGoal({ yearsFromNow: 10 });
  assertEqual(getGoalCategory(goal.targetDate), 'long');
});

test('getGoalCategory: Mid term (5 years)', () => {
  const goal = createGoal({ yearsFromNow: 5 });
  assertEqual(getGoalCategory(goal.targetDate), 'mid');
});

test('getGoalCategory: Short term (2 years)', () => {
  const goal = createGoal({ yearsFromNow: 2 });
  assertEqual(getGoalCategory(goal.targetDate), 'short');
});

// ============================================
// TESTS: Max Equity - One-time Goals
// ============================================

test('getMaxEquityForYearsRemaining: One-time, 10 years', () => {
  assertEqual(getMaxEquityForYearsRemaining(10, 'one-time'), 70);
});

test('getMaxEquityForYearsRemaining: One-time, 8 years', () => {
  assertEqual(getMaxEquityForYearsRemaining(8, 'one-time'), 70);
});

test('getMaxEquityForYearsRemaining: One-time, 7 years', () => {
  assertEqual(getMaxEquityForYearsRemaining(7, 'one-time'), 40);
});

test('getMaxEquityForYearsRemaining: One-time, 5 years', () => {
  assertEqual(getMaxEquityForYearsRemaining(5, 'one-time'), 40);
});

test('getMaxEquityForYearsRemaining: One-time, 3 years', () => {
  assertEqual(getMaxEquityForYearsRemaining(3, 'one-time'), 40);
});

test('getMaxEquityForYearsRemaining: One-time, 2 years', () => {
  assertEqual(getMaxEquityForYearsRemaining(2, 'one-time'), 0);
});

test('getMaxEquityForYearsRemaining: One-time, 1 year', () => {
  assertEqual(getMaxEquityForYearsRemaining(1, 'one-time'), 0);
});

test('getMaxEquityForYearsRemaining: One-time, 0 years', () => {
  assertEqual(getMaxEquityForYearsRemaining(0, 'one-time'), 0);
});

// ============================================
// TESTS: Max Equity - Retirement Goals
// ============================================

test('getMaxEquityForYearsRemaining: Retirement, 10 years', () => {
  assertEqual(getMaxEquityForYearsRemaining(10, 'retirement'), 70);
});

test('getMaxEquityForYearsRemaining: Retirement, 5 years', () => {
  assertEqual(getMaxEquityForYearsRemaining(5, 'retirement'), 40);
});

test('getMaxEquityForYearsRemaining: Retirement, 2 years', () => {
  assertEqual(getMaxEquityForYearsRemaining(2, 'retirement'), 40);
});

test('getMaxEquityForYearsRemaining: Retirement, 1 year', () => {
  assertEqual(getMaxEquityForYearsRemaining(1, 'retirement'), 35);
});

test('getMaxEquityForYearsRemaining: Retirement, 0 years', () => {
  assertEqual(getMaxEquityForYearsRemaining(0, 'retirement'), 30);
});

// ============================================
// TESTS: Yearly Returns - Short Term One-time (2 years)
// ============================================

test('getYearlyReturns: Short-term one-time goal (2 years)', () => {
  const goal = createGoal({
    yearsFromNow: 2,
    goalType: 'one-time',
    equityPercent: 70,
    equityReturn: 11,
    debtReturn: 5
  });
  const returns = getYearlyReturns(goal);

  // 2 years, both should be at 0% equity (debt only) for one-time goals
  assertEqual(returns.length, 2, 'Should have 2 yearly returns');
  assertApproxEqual(returns[0], 5, 0.1, 'Year 1 should be debt-only (5%)');
  assertApproxEqual(returns[1], 5, 0.1, 'Year 2 should be debt-only (5%)');
});

// ============================================
// TESTS: Yearly Returns - Mid Term One-time (5 years)
// ============================================

test('getYearlyReturns: Mid-term one-time goal (5 years)', () => {
  const goal = createGoal({
    yearsFromNow: 5,
    goalType: 'one-time',
    equityPercent: 70,
    equityReturn: 11,
    debtReturn: 5
  });
  const returns = getYearlyReturns(goal);

  assertEqual(returns.length, 5, 'Should have 5 yearly returns');

  // Year 1-2: max 40% equity (mid-term, 3+ years remaining), but user has 70%, so capped at 40%
  // Blended: 40% * 11 + 60% * 5 = 4.4 + 3 = 7.4%
  assertApproxEqual(returns[0], 7.4, 0.1, 'Year 1 (4 years remaining): 40% equity');
  assertApproxEqual(returns[1], 7.4, 0.1, 'Year 2 (3 years remaining): 40% equity');

  // Year 3-5: < 3 years remaining, 0% equity for one-time goals
  assertApproxEqual(returns[2], 5, 0.1, 'Year 3 (2 years remaining): 0% equity');
  assertApproxEqual(returns[3], 5, 0.1, 'Year 4 (1 year remaining): 0% equity');
  assertApproxEqual(returns[4], 5, 0.1, 'Year 5 (0 years remaining): 0% equity');
});

// ============================================
// TESTS: Yearly Returns - Long Term One-time (10 years)
// ============================================

test('getYearlyReturns: Long-term one-time goal (10 years)', () => {
  const goal = createGoal({
    yearsFromNow: 10,
    goalType: 'one-time',
    equityPercent: 70,
    equityReturn: 11,
    debtReturn: 5
  });
  const returns = getYearlyReturns(goal);

  assertEqual(returns.length, 10, 'Should have 10 yearly returns');

  // Year 1-2: 70% equity (long-term, 8+ years remaining)
  // Blended: 70% * 11 + 30% * 5 = 7.7 + 1.5 = 9.2%
  assertApproxEqual(returns[0], 9.2, 0.1, 'Year 1 (9 years remaining): 70% equity');
  assertApproxEqual(returns[1], 9.2, 0.1, 'Year 2 (8 years remaining): 70% equity');

  // Year 3-7: 40% equity (mid-term, 3-7 years remaining)
  assertApproxEqual(returns[2], 7.4, 0.1, 'Year 3 (7 years remaining): 40% equity');
  assertApproxEqual(returns[6], 7.4, 0.1, 'Year 7 (3 years remaining): 40% equity');

  // Year 8-10: 0% equity (< 2 years remaining)
  assertApproxEqual(returns[7], 5, 0.1, 'Year 8 (2 years remaining): 0% equity');
  assertApproxEqual(returns[8], 5, 0.1, 'Year 9 (1 year remaining): 0% equity');
  assertApproxEqual(returns[9], 5, 0.1, 'Year 10 (0 years remaining): 0% equity');
});

// ============================================
// TESTS: Yearly Returns - Retirement Goal (10 years)
// ============================================

test('getYearlyReturns: Retirement goal (10 years)', () => {
  const goal = createGoal({
    yearsFromNow: 10,
    goalType: 'retirement',
    equityPercent: 70,
    equityReturn: 11,
    debtReturn: 5
  });
  const returns = getYearlyReturns(goal);

  assertEqual(returns.length, 10, 'Should have 10 yearly returns');

  // Year 1-2: 70% equity (long-term)
  assertApproxEqual(returns[0], 9.2, 0.1, 'Year 1: 70% equity');
  assertApproxEqual(returns[1], 9.2, 0.1, 'Year 2: 70% equity');

  // Year 3-8: 40% equity (mid-term, retirement maintains higher)
  assertApproxEqual(returns[2], 7.4, 0.1, 'Year 3: 40% equity');
  assertApproxEqual(returns[7], 7.4, 0.1, 'Year 8: 40% equity');

  // Year 9: 35% equity (1 year remaining, retirement glide path)
  // Blended: 35% * 11 + 65% * 5 = 3.85 + 3.25 = 7.1%
  assertApproxEqual(returns[8], 7.1, 0.1, 'Year 9: 35% equity');

  // Year 10: 30% equity (0 years remaining, retirement minimum)
  // Blended: 30% * 11 + 70% * 5 = 3.3 + 3.5 = 6.8%
  assertApproxEqual(returns[9], 6.8, 0.1, 'Year 10: 30% equity');
});

// ============================================
// TESTS: Effective XIRR
// ============================================

test('calculateEffectiveXIRR: Short-term one-time (2 years)', () => {
  const goal = createGoal({
    yearsFromNow: 2,
    goalType: 'one-time',
    equityPercent: 70,
    equityReturn: 11,
    debtReturn: 5
  });
  const xirr = calculateEffectiveXIRR(goal);
  // Should be close to debt return since all years are at 0% equity
  assertApproxEqual(xirr, 5, 0.5, 'XIRR for short-term one-time');
});

test('calculateEffectiveXIRR: Long-term one-time (10 years)', () => {
  const goal = createGoal({
    yearsFromNow: 10,
    goalType: 'one-time',
    equityPercent: 70,
    equityReturn: 11,
    debtReturn: 5
  });
  const xirr = calculateEffectiveXIRR(goal);
  // Should be between 5% (all debt) and 9.2% (all 70% equity)
  assertTrue(xirr > 5 && xirr < 9.2, `XIRR ${xirr} should be between 5 and 9.2`);
  // Expected around 7% based on glide path
  assertApproxEqual(xirr, 7, 0.5, 'XIRR for long-term one-time');
});

test('calculateEffectiveXIRR: Retirement goal (10 years)', () => {
  const goal = createGoal({
    yearsFromNow: 10,
    goalType: 'retirement',
    equityPercent: 70,
    equityReturn: 11,
    debtReturn: 5
  });
  const xirr = calculateEffectiveXIRR(goal);
  // Retirement maintains higher equity, so XIRR should be higher than one-time
  assertTrue(xirr > 7, `Retirement XIRR ${xirr} should be higher than one-time`);
  assertApproxEqual(xirr, 7.8, 0.5, 'XIRR for retirement');
});

// ============================================
// TESTS: Goal Projections
// ============================================

test('calculateGoalProjections: Short-term one-time goal', () => {
  const goal = createGoal({
    yearsFromNow: 2,
    goalType: 'one-time',
    targetAmount: 500000,
    inflationRate: 6,
    equityPercent: 70,
    annualStepUp: 0
  });

  const projections = calculateGoalProjections(goal);

  assertTrue(projections.years > 1.5 && projections.years < 2.5, 'Years should be ~2');
  assertTrue(projections.inflationAdjustedTarget > 500000, 'Target should be inflation adjusted');
  assertEqual(projections.category, 'short');
  assertEqual(projections.maxEquity, 0, 'Max equity should be 0 for short-term one-time');
  assertTrue(projections.monthlySIP > 0, 'SIP should be positive');
});

test('calculateGoalProjections: Mid-term one-time goal', () => {
  const goal = createGoal({
    yearsFromNow: 5,
    goalType: 'one-time',
    targetAmount: 1000000,
    inflationRate: 6,
    equityPercent: 70,
    annualStepUp: 5
  });

  const projections = calculateGoalProjections(goal);

  assertTrue(projections.years > 4.5 && projections.years < 5.5, 'Years should be ~5');
  assertEqual(projections.category, 'mid');
  assertEqual(projections.maxEquity, 40, 'Max equity should be 40 for mid-term');
  assertTrue(projections.monthlySIP > 0, 'SIP should be positive');
  assertTrue(projections.effectiveXIRR > 5 && projections.effectiveXIRR < 9, 'XIRR should be between 5 and 9');
});

test('calculateGoalProjections: Long-term one-time goal', () => {
  const goal = createGoal({
    yearsFromNow: 15,
    goalType: 'one-time',
    targetAmount: 5000000,
    inflationRate: 6,
    equityPercent: 70,
    annualStepUp: 5
  });

  const projections = calculateGoalProjections(goal);

  assertTrue(projections.years > 14 && projections.years < 16, 'Years should be ~15');
  assertEqual(projections.category, 'long');
  assertEqual(projections.maxEquity, 70, 'Max equity should be 70 for long-term');
  assertTrue(projections.monthlySIP > 0, 'SIP should be positive');
});

test('calculateGoalProjections: Retirement goal', () => {
  const goal = createGoal({
    yearsFromNow: 20,
    goalType: 'retirement',
    targetAmount: 10000000,
    inflationRate: 6,
    equityPercent: 70,
    annualStepUp: 5
  });

  const projections = calculateGoalProjections(goal);

  assertEqual(projections.category, 'long');
  assertEqual(projections.maxEquity, 70);
  assertTrue(projections.monthlySIP > 0, 'SIP should be positive');

  // Retirement XIRR should be higher due to maintaining equity longer
  assertTrue(projections.effectiveXIRR > 6, 'Retirement XIRR should be higher');
});

// ============================================
// TESTS: Rebalancing Alerts
// ============================================

test('needsRebalanceAlert: No alert when equity within limit', () => {
  const goal = createGoal({
    yearsFromNow: 10,
    goalType: 'one-time',
    equityPercent: 70
  });
  assertFalse(needsRebalanceAlert(goal), 'Should not need rebalance');
});

test('needsRebalanceAlert: Alert when equity exceeds max by > 5%', () => {
  const goal = createGoal({
    yearsFromNow: 5,
    goalType: 'one-time',
    equityPercent: 70  // Max is 40% for mid-term, 70 > 45
  });
  assertTrue(needsRebalanceAlert(goal), 'Should need rebalance');
});

test('needsRebalanceAlert: No alert for retirement with higher equity', () => {
  const goal = createGoal({
    yearsFromNow: 1,
    goalType: 'retirement',
    equityPercent: 35  // Max is 35% for retirement at 1 year
  });
  assertFalse(needsRebalanceAlert(goal), 'Should not need rebalance');
});

// ============================================
// TESTS: SIP Calculations
// ============================================

test('calculateStepUpSIPWithGlidePath: Returns positive SIP for gap', () => {
  const goal = createGoal({
    yearsFromNow: 10,
    goalType: 'one-time',
    equityPercent: 70,
    annualStepUp: 5
  });

  const futureValue = 1000000;
  const sip = calculateStepUpSIPWithGlidePath(futureValue, goal);

  assertTrue(sip > 0, 'SIP should be positive');
  assertTrue(sip < futureValue / 12, 'SIP should be less than simple division');
});

test('calculateStepUpSIPWithGlidePath: Zero SIP for zero gap', () => {
  const goal = createGoal({ yearsFromNow: 10 });
  const sip = calculateStepUpSIPWithGlidePath(0, goal);
  assertEqual(sip, 0, 'SIP should be 0 for 0 gap');
});

test('calculateStepUpSIPWithGlidePath: Higher SIP for shorter term', () => {
  const longGoal = createGoal({ yearsFromNow: 15, goalType: 'one-time' });
  const shortGoal = createGoal({ yearsFromNow: 5, goalType: 'one-time' });

  const futureValue = 1000000;
  const longSIP = calculateStepUpSIPWithGlidePath(futureValue, longGoal);
  const shortSIP = calculateStepUpSIPWithGlidePath(futureValue, shortGoal);

  assertTrue(shortSIP > longSIP, 'Short-term SIP should be higher than long-term');
});

// ============================================
// TESTS: Corpus FV with Glide Path
// ============================================

test('calculateCorpusFVWithGlidePath: Grows corpus', () => {
  const goal = createGoal({ yearsFromNow: 10, goalType: 'one-time' });
  const fv = calculateCorpusFVWithGlidePath(100000, goal);

  assertTrue(fv > 100000, 'FV should be greater than initial corpus');
});

test('calculateCorpusFVWithGlidePath: Zero for zero corpus', () => {
  const goal = createGoal({ yearsFromNow: 10 });
  const fv = calculateCorpusFVWithGlidePath(0, goal);
  assertEqual(fv, 0, 'FV should be 0 for 0 corpus');
});

// ============================================
// TESTS: Edge Cases
// ============================================

test('Edge case: Goal with 0% step-up', () => {
  const goal = createGoal({
    yearsFromNow: 10,
    annualStepUp: 0
  });
  const projections = calculateGoalProjections(goal);
  assertTrue(projections.monthlySIP > 0, 'SIP should be positive with 0% step-up');
});

test('Edge case: Goal with 100% debt allocation', () => {
  const goal = createGoal({
    yearsFromNow: 10,
    equityPercent: 0,
    debtPercent: 100
  });
  const projections = calculateGoalProjections(goal);
  assertApproxEqual(projections.effectiveXIRR, 5, 0.1, 'XIRR should equal debt return');
});

test('Edge case: Goal with initial lumpsum', () => {
  const goal = createGoal({
    yearsFromNow: 10,
    targetAmount: 1000000,
    initialLumpsum: 200000
  });
  const projections = calculateGoalProjections(goal);

  assertEqual(projections.totalInvested, 200000, 'Total invested should equal lumpsum');
  assertTrue(projections.gapAmount < projections.inflationAdjustedTarget, 'Gap should be reduced by lumpsum FV');
});

// ============================================
// TESTS: Boundary Conditions
// ============================================

// Note: Direct numeric tests are more reliable than date-based tests for exact boundaries
// because date calculations can have millisecond timing differences

test('Boundary: 8+ years should be long-term', () => {
  assertEqual(getMaxEquityForYearsRemaining(8, 'one-time'), 70, 'Exactly 8 years should get 70% max equity');
  assertEqual(getMaxEquityForYearsRemaining(8.5, 'one-time'), 70, '8.5 years should get 70% max equity');
  assertEqual(getMaxEquityForYearsRemaining(20, 'one-time'), 70, '20 years should get 70% max equity');
});

test('Boundary: Just under 8 years should be mid-term', () => {
  assertEqual(getMaxEquityForYearsRemaining(7.99, 'one-time'), 40, '7.99 years should get 40% max equity');
  assertEqual(getMaxEquityForYearsRemaining(7, 'one-time'), 40, '7 years should get 40% max equity');
});

test('Boundary: 3+ years (under 8) should be mid-term', () => {
  assertEqual(getMaxEquityForYearsRemaining(3, 'one-time'), 40, 'Exactly 3 years should get 40% max equity');
  assertEqual(getMaxEquityForYearsRemaining(5, 'one-time'), 40, '5 years should get 40% max equity');
});

test('Boundary: Just under 3 years should be short-term', () => {
  assertEqual(getMaxEquityForYearsRemaining(2.99, 'one-time'), 0, '2.99 years should get 0% max equity for one-time');
  assertEqual(getMaxEquityForYearsRemaining(2.99, 'retirement'), 40, '2.99 years should get 40% max equity for retirement');
});

test('Boundary: Retirement at exactly 2 years', () => {
  assertEqual(getMaxEquityForYearsRemaining(2, 'retirement'), 40, 'Retirement at 2 years should have 40% equity');
});

test('Boundary: Retirement at exactly 1 year', () => {
  assertEqual(getMaxEquityForYearsRemaining(1, 'retirement'), 35, 'Retirement at 1 year should have 35% equity');
});

test('Boundary: Goal category thresholds via dates', () => {
  // Use 9 and 4 years to avoid boundary timing issues
  const longTermGoal = createGoal({ yearsFromNow: 9 });
  const midTermGoal = createGoal({ yearsFromNow: 4 });
  const shortTermGoal = createGoal({ yearsFromNow: 2 });

  assertEqual(getGoalCategory(longTermGoal.targetDate), 'long', '9 years should be long-term');
  assertEqual(getGoalCategory(midTermGoal.targetDate), 'mid', '4 years should be mid-term');
  assertEqual(getGoalCategory(shortTermGoal.targetDate), 'short', '2 years should be short-term');
});

// ============================================
// TESTS: Zero and Negative Edge Cases
// ============================================

test('Edge case: Zero years remaining', () => {
  assertEqual(getYearsRemaining(new Date().toISOString().split('T')[0]), 0, 'Today should have 0 years remaining');
});

test('Edge case: Goal in the past', () => {
  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 1);
  const years = getYearsRemaining(pastDate.toISOString().split('T')[0]);
  assertEqual(years, 0, 'Past date should return 0 years (not negative)');
});

test('Edge case: Zero inflation', () => {
  const result = calculateInflationAdjustedAmount(1000000, 0, 10);
  assertEqual(result, 1000000, 'Zero inflation should return original amount');
});

test('Edge case: Zero years for inflation', () => {
  const result = calculateInflationAdjustedAmount(1000000, 6, 0);
  assertEqual(result, 1000000, 'Zero years should return original amount');
});

test('Edge case: Negative years for inflation', () => {
  const result = calculateInflationAdjustedAmount(1000000, 6, -5);
  assertEqual(result, 1000000, 'Negative years should return original amount');
});

test('Edge case: calculateRegularSIP with zero months', () => {
  const result = calculateRegularSIP(1000000, 10, 0);
  assertEqual(result, 0, 'Zero months should return 0 SIP');
});

test('Edge case: calculateRegularSIP with zero rate', () => {
  const result = calculateRegularSIP(120000, 0, 12);
  assertEqual(result, 10000, 'Zero rate should be simple division');
});

test('Edge case: calculateBlendedReturn with 50/50 split', () => {
  const result = calculateBlendedReturn(50, 12, 50, 6);
  assertApproxEqual(result, 9, 0.01, '50/50 split should average the returns');
});

// ============================================
// TESTS: Very Small and Large Numbers
// ============================================

test('Scale: Very small target amount (₹10,000)', () => {
  const goal = createGoal({
    yearsFromNow: 5,
    targetAmount: 10000
  });
  const projections = calculateGoalProjections(goal);
  assertTrue(projections.monthlySIP > 0, 'SIP should be positive for small targets');
  assertTrue(projections.monthlySIP < 1000, 'SIP should be reasonable for small target');
});

test('Scale: Very large target amount (₹10 crore)', () => {
  const goal = createGoal({
    yearsFromNow: 20,
    targetAmount: 100000000  // 10 crore
  });
  const projections = calculateGoalProjections(goal);
  assertTrue(projections.monthlySIP > 0, 'SIP should be positive for large targets');
  assertTrue(projections.inflationAdjustedTarget > goal.targetAmount, 'Inflation-adjusted should be larger');
});

test('Scale: Very short timeline (1 year)', () => {
  const goal = createGoal({
    yearsFromNow: 1,
    targetAmount: 100000,
    goalType: 'one-time'
  });
  const projections = calculateGoalProjections(goal);
  assertEqual(projections.category, 'short', 'Should be short-term');
  assertEqual(projections.maxEquity, 0, 'Max equity should be 0 for 1 year one-time');
});

test('Scale: Very long timeline (30 years)', () => {
  const goal = createGoal({
    yearsFromNow: 30,
    targetAmount: 10000000
  });
  const projections = calculateGoalProjections(goal);
  assertEqual(projections.category, 'long', 'Should be long-term');
  assertEqual(projections.maxEquity, 70, 'Max equity should be 70 for 30 years');
});

// ============================================
// TESTS: Glide Path Consistency
// ============================================

test('Glide path: Equity never increases as goal approaches (one-time)', () => {
  const goal = createGoal({ yearsFromNow: 15, goalType: 'one-time', equityPercent: 70 });
  const returns = getYearlyReturns(goal);

  let prevReturn = returns[0];
  let isMonotonicallyDecreasing = true;

  for (let i = 1; i < returns.length; i++) {
    if (returns[i] > prevReturn + 0.01) { // Allow tiny floating point tolerance
      isMonotonicallyDecreasing = false;
      break;
    }
    prevReturn = returns[i];
  }

  assertTrue(isMonotonicallyDecreasing, 'Returns should never increase as goal approaches');
});

test('Glide path: Equity never increases as goal approaches (retirement)', () => {
  const goal = createGoal({ yearsFromNow: 15, goalType: 'retirement', equityPercent: 70 });
  const returns = getYearlyReturns(goal);

  let prevReturn = returns[0];
  let isMonotonicallyDecreasing = true;

  for (let i = 1; i < returns.length; i++) {
    if (returns[i] > prevReturn + 0.01) {
      isMonotonicallyDecreasing = false;
      break;
    }
    prevReturn = returns[i];
  }

  assertTrue(isMonotonicallyDecreasing, 'Retirement returns should never increase as goal approaches');
});

test('Glide path: Retirement maintains minimum 30% equity at goal', () => {
  const goal = createGoal({ yearsFromNow: 10, goalType: 'retirement', equityPercent: 70 });
  const returns = getYearlyReturns(goal);
  const finalReturn = returns[returns.length - 1];

  // 30% equity at 11% + 70% debt at 5% = 3.3 + 3.5 = 6.8%
  assertApproxEqual(finalReturn, 6.8, 0.1, 'Final year should have 30% equity (6.8% return)');
});

test('Glide path: One-time reaches 0% equity before goal', () => {
  const goal = createGoal({ yearsFromNow: 10, goalType: 'one-time', equityPercent: 70 });
  const returns = getYearlyReturns(goal);
  const finalReturn = returns[returns.length - 1];

  // 0% equity = 100% debt at 5%
  assertApproxEqual(finalReturn, 5, 0.1, 'Final year should have 0% equity (5% return)');
});

test('Glide path: User with low equity preference stays within their limit', () => {
  const goal = createGoal({
    yearsFromNow: 10,
    goalType: 'one-time',
    equityPercent: 30,  // User prefers only 30% equity
    equityReturn: 11,
    debtReturn: 5
  });
  const returns = getYearlyReturns(goal);

  // Even in long-term years, return should be based on 30% equity (not 70%)
  // 30% * 11 + 70% * 5 = 3.3 + 3.5 = 6.8%
  assertApproxEqual(returns[0], 6.8, 0.1, 'Should respect user preference of 30% equity');
});

// ============================================
// TESTS: Investment Calculations
// ============================================

test('Investments: Total invested with multiple investments', () => {
  const investments = [
    { amount: 10000, date: '2025-01-01' },
    { amount: 20000, date: '2025-06-01' },
    { amount: 15000, date: '2025-12-01' }
  ];
  const total = calculateTotalInvested(investments, 50000);
  assertEqual(total, 95000, 'Should sum all investments plus lumpsum');
});

test('Investments: Total invested with empty investments array', () => {
  const total = calculateTotalInvested([], 100000);
  assertEqual(total, 100000, 'Should return just lumpsum when no investments');
});

test('Investments: Total invested with null lumpsum', () => {
  const investments = [{ amount: 25000 }];
  const total = calculateTotalInvested(investments, null);
  assertEqual(total, 25000, 'Should handle null lumpsum');
});

test('Investments: Total invested with undefined lumpsum', () => {
  const investments = [{ amount: 25000 }];
  const total = calculateTotalInvested(investments, undefined);
  assertEqual(total, 25000, 'Should handle undefined lumpsum');
});

// ============================================
// TESTS: Rebalancing Logic
// ============================================

test('Rebalancing: No alert when equity equals max', () => {
  const goal = createGoal({
    yearsFromNow: 5,
    goalType: 'one-time',
    equityPercent: 40  // Max is 40 for mid-term
  });
  assertFalse(needsRebalanceAlert(goal), 'Should not alert when equity equals max');
});

test('Rebalancing: No alert when equity is below max', () => {
  const goal = createGoal({
    yearsFromNow: 10,
    goalType: 'one-time',
    equityPercent: 50  // Max is 70 for long-term
  });
  assertFalse(needsRebalanceAlert(goal), 'Should not alert when equity is below max');
});

test('Rebalancing: Alert when equity exceeds max by exactly 6%', () => {
  const goal = createGoal({
    yearsFromNow: 5,
    goalType: 'one-time',
    equityPercent: 46  // Max is 40, exceeds by 6%
  });
  assertTrue(needsRebalanceAlert(goal), 'Should alert when equity exceeds max by > 5%');
});

test('Rebalancing: No alert when equity exceeds max by only 5%', () => {
  const goal = createGoal({
    yearsFromNow: 5,
    goalType: 'one-time',
    equityPercent: 45  // Max is 40, exceeds by exactly 5%
  });
  assertFalse(needsRebalanceAlert(goal), 'Should not alert when equity exceeds max by exactly 5%');
});

// ============================================
// TESTS: XIRR Calculations
// ============================================

test('XIRR: Consistent with simple blended return for uniform allocation', () => {
  // For a goal where equity stays at max throughout, XIRR should match expectations
  const goal = createGoal({
    yearsFromNow: 2,
    goalType: 'one-time',
    equityPercent: 0,  // Will be 0% throughout (short-term one-time)
    debtReturn: 6
  });
  const xirr = calculateEffectiveXIRR(goal);
  assertApproxEqual(xirr, 6, 0.1, 'XIRR should equal debt return when 100% debt throughout');
});

test('XIRR: Retirement higher than one-time for same timeline', () => {
  const retirementGoal = createGoal({
    yearsFromNow: 10,
    goalType: 'retirement',
    equityPercent: 70
  });
  const oneTimeGoal = createGoal({
    yearsFromNow: 10,
    goalType: 'one-time',
    equityPercent: 70
  });

  const retirementXIRR = calculateEffectiveXIRR(retirementGoal);
  const oneTimeXIRR = calculateEffectiveXIRR(oneTimeGoal);

  assertTrue(retirementXIRR > oneTimeXIRR, 'Retirement XIRR should be higher (maintains more equity)');
});

test('XIRR: Longer timeline has higher effective rate', () => {
  const shortGoal = createGoal({ yearsFromNow: 5, goalType: 'one-time', equityPercent: 70 });
  const longGoal = createGoal({ yearsFromNow: 15, goalType: 'one-time', equityPercent: 70 });

  const shortXIRR = calculateEffectiveXIRR(shortGoal);
  const longXIRR = calculateEffectiveXIRR(longGoal);

  assertTrue(longXIRR > shortXIRR, 'Longer timeline should have higher XIRR (more years at high equity)');
});

// ============================================
// TESTS: Corpus Future Value
// ============================================

test('Corpus FV: Grows correctly over time', () => {
  const goal = createGoal({ yearsFromNow: 10, goalType: 'one-time' });
  const fv = calculateCorpusFVWithGlidePath(100000, goal);

  assertTrue(fv > 100000, 'FV should be greater than initial corpus');
  assertTrue(fv < 300000, 'FV should be reasonable (not too high)');
});

test('Corpus FV: Short-term has lower growth', () => {
  const shortGoal = createGoal({ yearsFromNow: 2, goalType: 'one-time' });
  const longGoal = createGoal({ yearsFromNow: 10, goalType: 'one-time' });

  const shortFV = calculateCorpusFVWithGlidePath(100000, shortGoal);
  const longFV = calculateCorpusFVWithGlidePath(100000, longGoal);

  assertTrue(longFV > shortFV, 'Longer timeline should have higher FV');
});

// ============================================
// TESTS: SIP with Step-up
// ============================================

test('Step-up SIP: Higher step-up means lower starting SIP', () => {
  const noStepUpGoal = createGoal({ yearsFromNow: 10, annualStepUp: 0 });
  const highStepUpGoal = createGoal({ yearsFromNow: 10, annualStepUp: 10 });

  const noStepUpSIP = calculateStepUpSIPWithGlidePath(1000000, noStepUpGoal);
  const highStepUpSIP = calculateStepUpSIPWithGlidePath(1000000, highStepUpGoal);

  assertTrue(highStepUpSIP < noStepUpSIP, 'Higher step-up should result in lower starting SIP');
});

test('Step-up SIP: Same result for 0% step-up and regular SIP', () => {
  const goal = createGoal({ yearsFromNow: 10, annualStepUp: 0, equityPercent: 0, debtReturn: 8 });
  const months = getMonthsRemaining(goal.targetDate);

  const stepUpSIP = calculateStepUpSIPWithGlidePath(1000000, goal);
  const regularSIP = calculateRegularSIP(1000000, 8, months);

  // Should be approximately equal (small difference due to glide path calculation method)
  assertApproxEqual(stepUpSIP, regularSIP, regularSIP * 0.05, 'Should be within 5% of regular SIP');
});

// ============================================
// TESTS: Full Projection Consistency
// ============================================

test('Projections: Gap amount is non-negative', () => {
  const goal = createGoal({
    yearsFromNow: 10,
    targetAmount: 1000000,
    initialLumpsum: 5000000  // Lumpsum exceeds target
  });
  const projections = calculateGoalProjections(goal);

  assertTrue(projections.gapAmount >= 0, 'Gap amount should never be negative');
});

test('Projections: SIP is zero when corpus exceeds target', () => {
  const goal = createGoal({
    yearsFromNow: 10,
    targetAmount: 100000,
    initialLumpsum: 1000000  // Lumpsum far exceeds target
  });
  const projections = calculateGoalProjections(goal);

  assertEqual(projections.monthlySIP, 0, 'SIP should be 0 when corpus exceeds target');
});

test('Projections: All fields are present', () => {
  const goal = createGoal({ yearsFromNow: 10 });
  const projections = calculateGoalProjections(goal);

  assertTrue('years' in projections, 'Should have years');
  assertTrue('months' in projections, 'Should have months');
  assertTrue('inflationAdjustedTarget' in projections, 'Should have inflationAdjustedTarget');
  assertTrue('effectiveXIRR' in projections, 'Should have effectiveXIRR');
  assertTrue('totalInvested' in projections, 'Should have totalInvested');
  assertTrue('currentCorpus' in projections, 'Should have currentCorpus');
  assertTrue('corpusFV' in projections, 'Should have corpusFV');
  assertTrue('gapAmount' in projections, 'Should have gapAmount');
  assertTrue('monthlySIP' in projections, 'Should have monthlySIP');
  assertTrue('category' in projections, 'Should have category');
  assertTrue('maxEquity' in projections, 'Should have maxEquity');
  assertTrue('needsRebalance' in projections, 'Should have needsRebalance');
});

// ============================================
// TESTS: End-to-End SIP Validation
// Verify that calculated SIP actually reaches target corpus
// ============================================

/**
 * Simulates monthly SIP investments with step-up and glide path returns
 * Returns the final corpus after all investments
 */
function simulateSIPInvestments(goal, startingSIP) {
  const yearlyReturns = getYearlyReturns(goal);
  const totalMonths = getMonthsRemaining(goal.targetDate);  // Use same function as calculator
  const stepUpRate = (goal.annualStepUp || 0) / 100;

  if (totalMonths <= 0 || yearlyReturns.length === 0) return 0;

  // Build monthly returns array
  const monthlyReturns = [];
  for (let y = 0; y < yearlyReturns.length; y++) {
    const monthlyRate = yearlyReturns[y] / 100 / 12;
    for (let m = 0; m < 12; m++) {
      monthlyReturns.push(monthlyRate);
    }
  }
  // Pad if needed
  const lastMonthlyRate = yearlyReturns[yearlyReturns.length - 1] / 100 / 12;
  while (monthlyReturns.length < totalMonths) {
    monthlyReturns.push(lastMonthlyRate);
  }

  // Simulate month by month
  let corpus = 0;
  let currentSIP = startingSIP;
  let monthInYear = 0;

  for (let month = 0; month < totalMonths; month++) {
    // Add SIP at start of month, then apply growth
    corpus = (corpus + currentSIP) * (1 + monthlyReturns[month]);

    monthInYear++;
    if (monthInYear >= 12) {
      currentSIP *= (1 + stepUpRate);
      monthInYear = 0;
    }
  }

  return corpus;
}

test('E2E Validation: Long-term goal (15 years) SIP reaches target', () => {
  const goal = createGoal({
    yearsFromNow: 15,
    goalType: 'one-time',
    targetAmount: 5000000,
    inflationRate: 6,
    equityPercent: 70,
    annualStepUp: 5,
    initialLumpsum: 0
  });

  const projections = calculateGoalProjections(goal);
  const simulatedCorpus = simulateSIPInvestments(goal, projections.monthlySIP);

  // Should reach within 1% of target (allowing for rounding in SIP calculation)
  const tolerance = projections.inflationAdjustedTarget * 0.01;
  const diff = Math.abs(simulatedCorpus - projections.inflationAdjustedTarget);

  assertTrue(
    diff < tolerance,
    `Long-term: Simulated corpus ${Math.round(simulatedCorpus)} should be within 1% of target ${Math.round(projections.inflationAdjustedTarget)}, diff: ${Math.round(diff)}`
  );
});

test('E2E Validation: Mid-term goal (5 years) SIP reaches target', () => {
  const goal = createGoal({
    yearsFromNow: 5,
    goalType: 'one-time',
    targetAmount: 1000000,
    inflationRate: 6,
    equityPercent: 40,
    annualStepUp: 5,
    initialLumpsum: 0
  });

  const projections = calculateGoalProjections(goal);
  const simulatedCorpus = simulateSIPInvestments(goal, projections.monthlySIP);

  const tolerance = projections.inflationAdjustedTarget * 0.01;
  const diff = Math.abs(simulatedCorpus - projections.inflationAdjustedTarget);

  assertTrue(
    diff < tolerance,
    `Mid-term: Simulated corpus ${Math.round(simulatedCorpus)} should be within 1% of target ${Math.round(projections.inflationAdjustedTarget)}, diff: ${Math.round(diff)}`
  );
});

test('E2E Validation: Short-term goal (2 years) SIP reaches target', () => {
  const goal = createGoal({
    yearsFromNow: 2,
    goalType: 'one-time',
    targetAmount: 500000,
    inflationRate: 5,
    equityPercent: 0,  // Will be forced to 0% anyway
    annualStepUp: 0,
    initialLumpsum: 0
  });

  const projections = calculateGoalProjections(goal);
  const simulatedCorpus = simulateSIPInvestments(goal, projections.monthlySIP);

  const tolerance = projections.inflationAdjustedTarget * 0.01;
  const diff = Math.abs(simulatedCorpus - projections.inflationAdjustedTarget);

  assertTrue(
    diff < tolerance,
    `Short-term: Simulated corpus ${Math.round(simulatedCorpus)} should be within 1% of target ${Math.round(projections.inflationAdjustedTarget)}, diff: ${Math.round(diff)}`
  );
});

test('E2E Validation: Retirement goal (20 years) SIP reaches target', () => {
  const goal = createGoal({
    yearsFromNow: 20,
    goalType: 'retirement',
    targetAmount: 10000000,
    inflationRate: 6,
    equityPercent: 70,
    annualStepUp: 7,
    initialLumpsum: 0
  });

  const projections = calculateGoalProjections(goal);
  const simulatedCorpus = simulateSIPInvestments(goal, projections.monthlySIP);

  const tolerance = projections.inflationAdjustedTarget * 0.01;
  const diff = Math.abs(simulatedCorpus - projections.inflationAdjustedTarget);

  assertTrue(
    diff < tolerance,
    `Retirement: Simulated corpus ${Math.round(simulatedCorpus)} should be within 1% of target ${Math.round(projections.inflationAdjustedTarget)}, diff: ${Math.round(diff)}`
  );
});

test('E2E Validation: Goal with no step-up SIP reaches target', () => {
  const goal = createGoal({
    yearsFromNow: 10,
    goalType: 'one-time',
    targetAmount: 2000000,
    inflationRate: 6,
    equityPercent: 60,
    annualStepUp: 0,
    initialLumpsum: 0
  });

  const projections = calculateGoalProjections(goal);
  const simulatedCorpus = simulateSIPInvestments(goal, projections.monthlySIP);

  const tolerance = projections.inflationAdjustedTarget * 0.01;
  const diff = Math.abs(simulatedCorpus - projections.inflationAdjustedTarget);

  assertTrue(
    diff < tolerance,
    `No step-up: Simulated corpus ${Math.round(simulatedCorpus)} should be within 1% of target ${Math.round(projections.inflationAdjustedTarget)}, diff: ${Math.round(diff)}`
  );
});

test('E2E Validation: Goal with 100% debt allocation SIP reaches target', () => {
  const goal = createGoal({
    yearsFromNow: 8,
    goalType: 'one-time',
    targetAmount: 1500000,
    inflationRate: 5,
    equityPercent: 0,
    debtPercent: 100,
    annualStepUp: 5,
    initialLumpsum: 0
  });

  const projections = calculateGoalProjections(goal);
  const simulatedCorpus = simulateSIPInvestments(goal, projections.monthlySIP);

  const tolerance = projections.inflationAdjustedTarget * 0.01;
  const diff = Math.abs(simulatedCorpus - projections.inflationAdjustedTarget);

  assertTrue(
    diff < tolerance,
    `100% debt: Simulated corpus ${Math.round(simulatedCorpus)} should be within 1% of target ${Math.round(projections.inflationAdjustedTarget)}, diff: ${Math.round(diff)}`
  );
});

test('E2E Validation: Goal with high step-up (10%) SIP reaches target', () => {
  const goal = createGoal({
    yearsFromNow: 12,
    goalType: 'one-time',
    targetAmount: 3000000,
    inflationRate: 6,
    equityPercent: 70,
    annualStepUp: 10,
    initialLumpsum: 0
  });

  const projections = calculateGoalProjections(goal);
  const simulatedCorpus = simulateSIPInvestments(goal, projections.monthlySIP);

  const tolerance = projections.inflationAdjustedTarget * 0.01;
  const diff = Math.abs(simulatedCorpus - projections.inflationAdjustedTarget);

  assertTrue(
    diff < tolerance,
    `High step-up: Simulated corpus ${Math.round(simulatedCorpus)} should be within 1% of target ${Math.round(projections.inflationAdjustedTarget)}, diff: ${Math.round(diff)}`
  );
});

// ============================================
// Summary
// ============================================

console.log('\n========================================');
console.log(`Tests completed: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('========================================\n');

// Export for test runner
export { results, passed, failed };
