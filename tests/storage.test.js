// Unit tests for storage.js
// Run in browser by opening tests/test-runner.html

import {
  generateId,
  loadData,
  saveData,
  clearData,
  getCurrency,
  setCurrency,
  getFundHouse,
  setFundHouse,
  addIncome,
  updateIncome,
  deleteIncome,
  addExpense,
  updateExpense,
  deleteExpense,
  addGoal,
  updateGoal,
  deleteGoal,
  addInvestment,
  deleteInvestment
} from '../modules/storage.js';

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

function assertDeepEqual(actual, expected, message = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message} Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Helper to get fresh data without localStorage interference
function getFreshData() {
  return {
    settings: {
      currency: 'INR',
      fundHouse: 'icici'
    },
    cashflow: {
      income: [],
      expenses: []
    },
    goals: []
  };
}

// ============================================
// TESTS: ID Generation
// ============================================

test('generateId: Returns a string', () => {
  const id = generateId();
  assertEqual(typeof id, 'string', 'ID should be a string');
});

test('generateId: Returns unique IDs', () => {
  const id1 = generateId();
  const id2 = generateId();
  assertTrue(id1 !== id2, 'IDs should be unique');
});

test('generateId: ID has reasonable length', () => {
  const id = generateId();
  assertTrue(id.length >= 10, 'ID should be at least 10 characters');
});

// ============================================
// TESTS: Load/Save Data
// ============================================

test('loadData: Returns default structure when empty', () => {
  // Clear any existing data
  localStorage.removeItem('financial-planner-data');

  const data = loadData();
  assertTrue(data.settings !== undefined, 'Should have settings');
  assertTrue(data.cashflow !== undefined, 'Should have cashflow');
  assertTrue(data.goals !== undefined, 'Should have goals');
  assertEqual(data.settings.currency, 'INR', 'Default currency should be INR');
});

test('saveData: Returns true on success', () => {
  const data = getFreshData();
  const result = saveData(data);
  assertEqual(result, true, 'saveData should return true');
});

test('loadData: Round-trip preserves data', () => {
  const original = getFreshData();
  original.settings.fundHouse = 'hdfc';
  original.cashflow.income.push({ id: 'test-1', name: 'Salary', amount: 100000 });
  original.goals.push({ id: 'goal-1', name: 'Test Goal', targetAmount: 1000000 });

  saveData(original);
  const loaded = loadData();

  assertEqual(loaded.settings.fundHouse, 'hdfc', 'Fund house should be preserved');
  assertEqual(loaded.cashflow.income.length, 1, 'Income should be preserved');
  assertEqual(loaded.cashflow.income[0].name, 'Salary', 'Income name should be preserved');
  assertEqual(loaded.goals.length, 1, 'Goals should be preserved');
  assertEqual(loaded.goals[0].name, 'Test Goal', 'Goal name should be preserved');
});

test('clearData: Returns default structure', () => {
  // First save some data
  const data = getFreshData();
  data.goals.push({ id: 'g1', name: 'Test' });
  saveData(data);

  // Clear and verify
  const cleared = clearData();
  assertEqual(cleared.goals.length, 0, 'Goals should be empty after clear');
  assertEqual(cleared.cashflow.income.length, 0, 'Income should be empty after clear');

  // Verify localStorage is also cleared
  const loaded = loadData();
  assertEqual(loaded.goals.length, 0, 'Loaded data should also be empty');
});

test('loadData: Handles corrupted JSON gracefully', () => {
  // Inject corrupted data
  localStorage.setItem('financial-planner-data', 'not valid json {{{');

  // Should return defaults without throwing
  const data = loadData();
  assertTrue(data.settings !== undefined, 'Should return default settings');
  assertTrue(data.cashflow !== undefined, 'Should return default cashflow');

  // Clean up
  clearData();
});

test('loadData: Merges with defaults for schema updates', () => {
  // Save partial data (simulating old schema)
  localStorage.setItem('financial-planner-data', JSON.stringify({
    settings: { currency: 'INR' },
    goals: []
  }));

  const data = loadData();
  assertEqual(data.settings.currency, 'INR', 'Should preserve existing currency');
  assertEqual(data.settings.fundHouse, 'icici', 'Should add default fundHouse');
  assertTrue(data.cashflow.income !== undefined, 'Should add default cashflow');

  clearData();
});

// ============================================
// TESTS: Settings Helpers
// ============================================

test('getCurrency: Returns currency from data', () => {
  const data = getFreshData();
  data.settings.currency = 'INR';
  assertEqual(getCurrency(data), 'INR');
});

test('getCurrency: Returns INR as default', () => {
  assertEqual(getCurrency({}), 'INR');
  assertEqual(getCurrency({ settings: {} }), 'INR');
});

test('setCurrency: Updates and saves', () => {
  const data = getFreshData();
  setCurrency(data, 'INR');
  assertEqual(data.settings.currency, 'INR', 'Should update data object');
});

test('getFundHouse: Returns fundHouse from data', () => {
  const data = getFreshData();
  data.settings.fundHouse = 'hdfc';
  assertEqual(getFundHouse(data), 'hdfc');
});

test('getFundHouse: Returns icici as default', () => {
  assertEqual(getFundHouse({}), 'icici');
});

test('setFundHouse: Updates and saves', () => {
  const data = getFreshData();
  setFundHouse(data, 'hdfc');
  assertEqual(data.settings.fundHouse, 'hdfc');
});

// ============================================
// TESTS: Income CRUD
// ============================================

test('addIncome: Adds income with generated ID', () => {
  const data = getFreshData();
  addIncome(data, { name: 'Salary', amount: 100000 });

  assertEqual(data.cashflow.income.length, 1, 'Should have 1 income');
  assertEqual(data.cashflow.income[0].name, 'Salary', 'Name should match');
  assertEqual(data.cashflow.income[0].amount, 100000, 'Amount should match');
  assertTrue(data.cashflow.income[0].id !== undefined, 'Should have generated ID');
});

test('addIncome: Preserves provided ID', () => {
  const data = getFreshData();
  addIncome(data, { id: 'custom-id', name: 'Bonus', amount: 50000 });

  assertEqual(data.cashflow.income[0].id, 'custom-id', 'Should preserve custom ID');
});

test('updateIncome: Updates existing income', () => {
  const data = getFreshData();
  addIncome(data, { id: 'inc-1', name: 'Salary', amount: 100000 });

  updateIncome(data, 'inc-1', { amount: 120000 });

  assertEqual(data.cashflow.income[0].amount, 120000, 'Amount should be updated');
  assertEqual(data.cashflow.income[0].name, 'Salary', 'Name should be unchanged');
});

test('updateIncome: Does nothing for non-existent ID', () => {
  const data = getFreshData();
  addIncome(data, { id: 'inc-1', name: 'Salary', amount: 100000 });

  updateIncome(data, 'non-existent', { amount: 200000 });

  assertEqual(data.cashflow.income[0].amount, 100000, 'Original should be unchanged');
});

test('deleteIncome: Removes income by ID', () => {
  const data = getFreshData();
  addIncome(data, { id: 'inc-1', name: 'Salary', amount: 100000 });
  addIncome(data, { id: 'inc-2', name: 'Bonus', amount: 50000 });

  deleteIncome(data, 'inc-1');

  assertEqual(data.cashflow.income.length, 1, 'Should have 1 income');
  assertEqual(data.cashflow.income[0].id, 'inc-2', 'Remaining should be inc-2');
});

// ============================================
// TESTS: Expense CRUD
// ============================================

test('addExpense: Adds expense with generated ID', () => {
  const data = getFreshData();
  addExpense(data, { category: 'Housing', name: 'Rent', amount: 25000 });

  assertEqual(data.cashflow.expenses.length, 1, 'Should have 1 expense');
  assertEqual(data.cashflow.expenses[0].category, 'Housing', 'Category should match');
  assertEqual(data.cashflow.expenses[0].name, 'Rent', 'Name should match');
  assertTrue(data.cashflow.expenses[0].id !== undefined, 'Should have generated ID');
});

test('updateExpense: Updates existing expense', () => {
  const data = getFreshData();
  addExpense(data, { id: 'exp-1', category: 'Housing', name: 'Rent', amount: 25000 });

  updateExpense(data, 'exp-1', { amount: 28000 });

  assertEqual(data.cashflow.expenses[0].amount, 28000, 'Amount should be updated');
});

test('deleteExpense: Removes expense by ID', () => {
  const data = getFreshData();
  addExpense(data, { id: 'exp-1', name: 'Rent', amount: 25000 });
  addExpense(data, { id: 'exp-2', name: 'Utilities', amount: 5000 });

  deleteExpense(data, 'exp-1');

  assertEqual(data.cashflow.expenses.length, 1, 'Should have 1 expense');
  assertEqual(data.cashflow.expenses[0].id, 'exp-2', 'Remaining should be exp-2');
});

// ============================================
// TESTS: Goal CRUD
// ============================================

test('addGoal: Adds goal with defaults', () => {
  const data = getFreshData();
  addGoal(data, { name: 'Retirement', targetAmount: 10000000 });

  assertEqual(data.goals.length, 1, 'Should have 1 goal');
  assertEqual(data.goals[0].name, 'Retirement', 'Name should match');
  assertTrue(data.goals[0].id !== undefined, 'Should have generated ID');
  assertTrue(Array.isArray(data.goals[0].investments), 'Should have investments array');
  assertTrue(data.goals[0].startDate !== undefined, 'Should have startDate');
});

test('addGoal: Preserves provided values', () => {
  const data = getFreshData();
  const goalData = {
    id: 'goal-1',
    name: 'Education',
    targetAmount: 5000000,
    investments: [{ id: 'inv-1', amount: 100000 }],
    startDate: '2024-01-01'
  };

  addGoal(data, goalData);

  assertEqual(data.goals[0].id, 'goal-1', 'Should preserve custom ID');
  assertEqual(data.goals[0].investments.length, 1, 'Should preserve investments');
  assertEqual(data.goals[0].startDate, '2024-01-01', 'Should preserve startDate');
});

test('updateGoal: Updates existing goal', () => {
  const data = getFreshData();
  addGoal(data, { id: 'goal-1', name: 'Retirement', targetAmount: 10000000 });

  updateGoal(data, 'goal-1', { targetAmount: 15000000, inflationRate: 7 });

  assertEqual(data.goals[0].targetAmount, 15000000, 'Amount should be updated');
  assertEqual(data.goals[0].inflationRate, 7, 'Inflation should be added');
  assertEqual(data.goals[0].name, 'Retirement', 'Name should be unchanged');
});

test('deleteGoal: Removes goal by ID', () => {
  const data = getFreshData();
  addGoal(data, { id: 'goal-1', name: 'Retirement' });
  addGoal(data, { id: 'goal-2', name: 'Education' });

  deleteGoal(data, 'goal-1');

  assertEqual(data.goals.length, 1, 'Should have 1 goal');
  assertEqual(data.goals[0].id, 'goal-2', 'Remaining should be goal-2');
});

// ============================================
// TESTS: Investment Tracking
// ============================================

test('addInvestment: Adds investment to goal', () => {
  const data = getFreshData();
  addGoal(data, { id: 'goal-1', name: 'Retirement' });

  addInvestment(data, 'goal-1', { amount: 50000, note: 'Monthly SIP' });

  assertEqual(data.goals[0].investments.length, 1, 'Should have 1 investment');
  assertEqual(data.goals[0].investments[0].amount, 50000, 'Amount should match');
  assertTrue(data.goals[0].investments[0].id !== undefined, 'Should have generated ID');
  assertTrue(data.goals[0].investments[0].date !== undefined, 'Should have date');
});

test('addInvestment: Preserves provided date', () => {
  const data = getFreshData();
  addGoal(data, { id: 'goal-1', name: 'Retirement' });

  addInvestment(data, 'goal-1', { amount: 50000, date: '2024-06-15' });

  assertEqual(data.goals[0].investments[0].date, '2024-06-15', 'Should preserve date');
});

test('addInvestment: Does nothing for non-existent goal', () => {
  const data = getFreshData();
  addGoal(data, { id: 'goal-1', name: 'Retirement' });

  addInvestment(data, 'non-existent', { amount: 50000 });

  assertEqual(data.goals[0].investments.length, 0, 'Should not add investment');
});

test('deleteInvestment: Removes investment from goal', () => {
  const data = getFreshData();
  addGoal(data, { id: 'goal-1', name: 'Retirement' });
  addInvestment(data, 'goal-1', { id: 'inv-1', amount: 50000 });
  addInvestment(data, 'goal-1', { id: 'inv-2', amount: 30000 });

  deleteInvestment(data, 'goal-1', 'inv-1');

  assertEqual(data.goals[0].investments.length, 1, 'Should have 1 investment');
  assertEqual(data.goals[0].investments[0].id, 'inv-2', 'Remaining should be inv-2');
});

test('deleteInvestment: Does nothing for non-existent goal', () => {
  const data = getFreshData();
  addGoal(data, { id: 'goal-1', name: 'Retirement' });
  addInvestment(data, 'goal-1', { id: 'inv-1', amount: 50000 });

  deleteInvestment(data, 'non-existent', 'inv-1');

  assertEqual(data.goals[0].investments.length, 1, 'Investment should remain');
});

// ============================================
// TESTS: Schema Validation
// ============================================

test('Schema: Goals have required structure', () => {
  const data = getFreshData();
  addGoal(data, {
    name: 'Test',
    targetAmount: 1000000,
    inflationRate: 6,
    targetDate: '2035-01-01',
    equityPercent: 70,
    debtPercent: 30
  });

  const goal = data.goals[0];
  assertTrue(goal.id !== undefined, 'Should have id');
  assertTrue(goal.investments !== undefined, 'Should have investments');
  assertTrue(goal.startDate !== undefined, 'Should have startDate');
});

test('Schema: Cashflow has income and expenses arrays', () => {
  const data = loadData();
  assertTrue(Array.isArray(data.cashflow.income), 'income should be array');
  assertTrue(Array.isArray(data.cashflow.expenses), 'expenses should be array');
});

// ============================================
// Cleanup
// ============================================

// Clear test data
clearData();

// ============================================
// Summary
// ============================================

console.log('\n========================================');
console.log(`Storage Tests completed: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('========================================\n');

export { results, passed, failed };
