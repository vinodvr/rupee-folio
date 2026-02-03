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
  getEquityReturn,
  setEquityReturn,
  getDebtReturn,
  setDebtReturn,
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
  deleteInvestment,
  addAsset,
  updateAsset,
  deleteAsset,
  addLiability,
  updateLiability,
  deleteLiability
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
      fundHouse: 'icici',
      equityReturn: 10,
      debtReturn: 5
    },
    cashflow: {
      income: [],
      expenses: []
    },
    assets: {
      items: []
    },
    liabilities: {
      items: []
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
// TESTS: Return Rate Settings
// ============================================

test('getEquityReturn: Returns equityReturn from data', () => {
  const data = getFreshData();
  data.settings.equityReturn = 12;
  assertEqual(getEquityReturn(data), 12);
});

test('getEquityReturn: Returns 10 as default', () => {
  assertEqual(getEquityReturn({}), 10);
  assertEqual(getEquityReturn({ settings: {} }), 10);
});

test('setEquityReturn: Updates and saves', () => {
  const data = getFreshData();
  setEquityReturn(data, 12);
  assertEqual(data.settings.equityReturn, 12);
});

test('setEquityReturn: Accepts decimal values', () => {
  const data = getFreshData();
  setEquityReturn(data, 11.5);
  assertEqual(data.settings.equityReturn, 11.5);
});

test('getDebtReturn: Returns debtReturn from data', () => {
  const data = getFreshData();
  data.settings.debtReturn = 6;
  assertEqual(getDebtReturn(data), 6);
});

test('getDebtReturn: Returns 5 as default', () => {
  assertEqual(getDebtReturn({}), 5);
  assertEqual(getDebtReturn({ settings: {} }), 5);
});

test('setDebtReturn: Updates and saves', () => {
  const data = getFreshData();
  setDebtReturn(data, 6);
  assertEqual(data.settings.debtReturn, 6);
});

test('setDebtReturn: Accepts decimal values', () => {
  const data = getFreshData();
  setDebtReturn(data, 5.5);
  assertEqual(data.settings.debtReturn, 5.5);
});

test('Return rates: Round-trip preserves values', () => {
  const data = getFreshData();
  setEquityReturn(data, 13);
  setDebtReturn(data, 7);
  saveData(data);

  const loaded = loadData();
  assertEqual(loaded.settings.equityReturn, 13, 'Equity return should be preserved');
  assertEqual(loaded.settings.debtReturn, 7, 'Debt return should be preserved');

  clearData();
});

test('Return rates: Default values in fresh load', () => {
  clearData();
  const data = loadData();
  assertEqual(data.settings.equityReturn, 10, 'Default equity return should be 10');
  assertEqual(data.settings.debtReturn, 5, 'Default debt return should be 5');
});

test('Return rates: Schema migration adds defaults', () => {
  // Save data without return rates (simulating old schema)
  localStorage.setItem('financial-planner-data', JSON.stringify({
    settings: { currency: 'INR', fundHouse: 'icici' },
    cashflow: { income: [], expenses: [] },
    goals: []
  }));

  const data = loadData();
  assertEqual(data.settings.equityReturn, 10, 'Should add default equity return');
  assertEqual(data.settings.debtReturn, 5, 'Should add default debt return');

  clearData();
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

test('Schema: Assets and liabilities have items arrays', () => {
  const data = loadData();
  assertTrue(data.assets !== undefined, 'Should have assets');
  assertTrue(data.liabilities !== undefined, 'Should have liabilities');
  assertTrue(Array.isArray(data.assets.items), 'assets.items should be array');
  assertTrue(Array.isArray(data.liabilities.items), 'liabilities.items should be array');
});

// ============================================
// TESTS: Asset CRUD
// ============================================

test('addAsset: Adds asset with generated ID', () => {
  const data = getFreshData();
  addAsset(data, { name: 'Primary Residence', category: 'Real Estate', value: 5000000 });

  assertEqual(data.assets.items.length, 1, 'Should have 1 asset');
  assertEqual(data.assets.items[0].name, 'Primary Residence', 'Name should match');
  assertEqual(data.assets.items[0].category, 'Real Estate', 'Category should match');
  assertEqual(data.assets.items[0].value, 5000000, 'Value should match');
  assertTrue(data.assets.items[0].id !== undefined, 'Should have generated ID');
});

test('addAsset: Preserves provided ID', () => {
  const data = getFreshData();
  addAsset(data, { id: 'asset-1', name: 'EPF', category: 'EPF', value: 1000000 });

  assertEqual(data.assets.items[0].id, 'asset-1', 'Should preserve custom ID');
});

test('updateAsset: Updates existing asset', () => {
  const data = getFreshData();
  addAsset(data, { id: 'asset-1', name: 'EPF', category: 'EPF', value: 1000000 });

  updateAsset(data, 'asset-1', { value: 1200000 });

  assertEqual(data.assets.items[0].value, 1200000, 'Value should be updated');
  assertEqual(data.assets.items[0].name, 'EPF', 'Name should be unchanged');
});

test('updateAsset: Does nothing for non-existent ID', () => {
  const data = getFreshData();
  addAsset(data, { id: 'asset-1', name: 'EPF', category: 'EPF', value: 1000000 });

  updateAsset(data, 'non-existent', { value: 2000000 });

  assertEqual(data.assets.items[0].value, 1000000, 'Original should be unchanged');
});

test('deleteAsset: Removes asset by ID', () => {
  const data = getFreshData();
  addAsset(data, { id: 'asset-1', name: 'EPF', category: 'EPF', value: 1000000 });
  addAsset(data, { id: 'asset-2', name: 'NPS', category: 'NPS', value: 500000 });

  deleteAsset(data, 'asset-1');

  assertEqual(data.assets.items.length, 1, 'Should have 1 asset');
  assertEqual(data.assets.items[0].id, 'asset-2', 'Remaining should be asset-2');
});

test('addAsset: Multiple assets of same category', () => {
  const data = getFreshData();
  addAsset(data, { id: 'epf-1', name: 'EPF Self', category: 'EPF', value: 1000000 });
  addAsset(data, { id: 'epf-2', name: 'EPF Spouse', category: 'EPF', value: 800000 });

  assertEqual(data.assets.items.length, 2, 'Should have 2 assets');
  const epfAssets = data.assets.items.filter(a => a.category === 'EPF');
  assertEqual(epfAssets.length, 2, 'Should have 2 EPF assets');
});

// ============================================
// TESTS: Liability CRUD
// ============================================

test('addLiability: Adds liability with generated ID', () => {
  const data = getFreshData();
  addLiability(data, { name: 'Home Loan - HDFC', category: 'Home Loan', amount: 4500000 });

  assertEqual(data.liabilities.items.length, 1, 'Should have 1 liability');
  assertEqual(data.liabilities.items[0].name, 'Home Loan - HDFC', 'Name should match');
  assertEqual(data.liabilities.items[0].category, 'Home Loan', 'Category should match');
  assertEqual(data.liabilities.items[0].amount, 4500000, 'Amount should match');
  assertTrue(data.liabilities.items[0].id !== undefined, 'Should have generated ID');
});

test('addLiability: Preserves provided ID', () => {
  const data = getFreshData();
  addLiability(data, { id: 'loan-1', name: 'Car Loan', category: 'Car Loan', amount: 500000 });

  assertEqual(data.liabilities.items[0].id, 'loan-1', 'Should preserve custom ID');
});

test('updateLiability: Updates existing liability', () => {
  const data = getFreshData();
  addLiability(data, { id: 'loan-1', name: 'Home Loan', category: 'Home Loan', amount: 4500000 });

  updateLiability(data, 'loan-1', { amount: 4200000 });

  assertEqual(data.liabilities.items[0].amount, 4200000, 'Amount should be updated');
  assertEqual(data.liabilities.items[0].name, 'Home Loan', 'Name should be unchanged');
});

test('updateLiability: Does nothing for non-existent ID', () => {
  const data = getFreshData();
  addLiability(data, { id: 'loan-1', name: 'Home Loan', category: 'Home Loan', amount: 4500000 });

  updateLiability(data, 'non-existent', { amount: 1000000 });

  assertEqual(data.liabilities.items[0].amount, 4500000, 'Original should be unchanged');
});

test('deleteLiability: Removes liability by ID', () => {
  const data = getFreshData();
  addLiability(data, { id: 'loan-1', name: 'Home Loan', category: 'Home Loan', amount: 4500000 });
  addLiability(data, { id: 'loan-2', name: 'Car Loan', category: 'Car Loan', amount: 500000 });

  deleteLiability(data, 'loan-1');

  assertEqual(data.liabilities.items.length, 1, 'Should have 1 liability');
  assertEqual(data.liabilities.items[0].id, 'loan-2', 'Remaining should be loan-2');
});

// ============================================
// TESTS: Migration - EPF/NPS Corpus to Assets
// ============================================

test('Migration: EPF corpus moved to assets', () => {
  // Simulate old data format with epfCorpus in income
  localStorage.setItem('financial-planner-data', JSON.stringify({
    settings: { currency: 'INR', fundHouse: 'icici', equityReturn: 10, debtReturn: 5 },
    cashflow: {
      income: [
        { id: 'inc-1', name: 'Salary Self', amount: 200000, epf: 36000, nps: 0, epfCorpus: 1500000, npsCorpus: 0 }
      ],
      expenses: []
    },
    goals: []
  }));

  const data = loadData();

  // EPF corpus should be moved to assets
  const epfAssets = data.assets.items.filter(a => a.category === 'EPF');
  assertEqual(epfAssets.length, 1, 'Should have 1 EPF asset');
  assertEqual(epfAssets[0].value, 1500000, 'EPF asset should have corpus value');
  assertEqual(epfAssets[0].name, 'EPF - Salary Self', 'EPF asset should have correct name');

  // epfCorpus should be removed from income
  assertEqual(data.cashflow.income[0].epfCorpus, undefined, 'epfCorpus should be removed from income');

  clearData();
});

test('Migration: NPS corpus moved to assets', () => {
  // Simulate old data format with npsCorpus in income
  localStorage.setItem('financial-planner-data', JSON.stringify({
    settings: { currency: 'INR', fundHouse: 'icici', equityReturn: 10, debtReturn: 5 },
    cashflow: {
      income: [
        { id: 'inc-1', name: 'Salary Self', amount: 200000, epf: 0, nps: 10000, epfCorpus: 0, npsCorpus: 500000 }
      ],
      expenses: []
    },
    goals: []
  }));

  const data = loadData();

  // NPS corpus should be moved to assets
  const npsAssets = data.assets.items.filter(a => a.category === 'NPS');
  assertEqual(npsAssets.length, 1, 'Should have 1 NPS asset');
  assertEqual(npsAssets[0].value, 500000, 'NPS asset should have corpus value');
  assertEqual(npsAssets[0].name, 'NPS - Salary Self', 'NPS asset should have correct name');

  // npsCorpus should be removed from income
  assertEqual(data.cashflow.income[0].npsCorpus, undefined, 'npsCorpus should be removed from income');

  clearData();
});

test('Migration: Both EPF and NPS corpus moved to assets', () => {
  // Simulate old data format with both epfCorpus and npsCorpus
  localStorage.setItem('financial-planner-data', JSON.stringify({
    settings: { currency: 'INR', fundHouse: 'icici', equityReturn: 10, debtReturn: 5 },
    cashflow: {
      income: [
        { id: 'inc-1', name: 'Salary Self', amount: 200000, epf: 36000, nps: 10000, epfCorpus: 1500000, npsCorpus: 500000 }
      ],
      expenses: []
    },
    goals: []
  }));

  const data = loadData();

  // Both should be in assets
  const epfAssets = data.assets.items.filter(a => a.category === 'EPF');
  const npsAssets = data.assets.items.filter(a => a.category === 'NPS');
  assertEqual(epfAssets.length, 1, 'Should have 1 EPF asset');
  assertEqual(npsAssets.length, 1, 'Should have 1 NPS asset');
  assertEqual(epfAssets[0].value, 1500000, 'EPF value should match');
  assertEqual(npsAssets[0].value, 500000, 'NPS value should match');

  clearData();
});

test('Migration: Multiple income entries with corpus', () => {
  // Simulate multiple incomes with corpus
  localStorage.setItem('financial-planner-data', JSON.stringify({
    settings: { currency: 'INR', fundHouse: 'icici', equityReturn: 10, debtReturn: 5 },
    cashflow: {
      income: [
        { id: 'inc-1', name: 'Salary Self', amount: 200000, epf: 36000, nps: 10000, epfCorpus: 1500000, npsCorpus: 500000 },
        { id: 'inc-2', name: 'Salary Spouse', amount: 150000, epf: 24000, nps: 0, epfCorpus: 800000, npsCorpus: 0 }
      ],
      expenses: []
    },
    goals: []
  }));

  const data = loadData();

  // Should have EPF assets from both incomes, and 1 NPS asset
  const epfAssets = data.assets.items.filter(a => a.category === 'EPF');
  const npsAssets = data.assets.items.filter(a => a.category === 'NPS');

  assertEqual(epfAssets.length, 2, 'Should have 2 EPF assets');
  assertEqual(npsAssets.length, 1, 'Should have 1 NPS asset (only Self had NPS)');

  // Total EPF should be sum of both
  const totalEpf = epfAssets.reduce((sum, a) => sum + a.value, 0);
  assertEqual(totalEpf, 2300000, 'Total EPF should be 15L + 8L = 23L');

  clearData();
});

test('Migration: Does not create duplicate assets on reload', () => {
  // First save with old format
  localStorage.setItem('financial-planner-data', JSON.stringify({
    settings: { currency: 'INR', fundHouse: 'icici', equityReturn: 10, debtReturn: 5 },
    cashflow: {
      income: [
        { id: 'inc-1', name: 'Salary Self', amount: 200000, epf: 36000, nps: 0, epfCorpus: 1500000, npsCorpus: 0 }
      ],
      expenses: []
    },
    goals: []
  }));

  // Load to trigger migration
  let data = loadData();
  assertEqual(data.assets.items.length, 1, 'Should have 1 asset after first migration');

  // Load again - should not create duplicate
  data = loadData();
  assertEqual(data.assets.items.length, 1, 'Should still have 1 asset after reload');

  clearData();
});

test('Migration: Zero corpus values not migrated', () => {
  // Data with zero corpus values
  localStorage.setItem('financial-planner-data', JSON.stringify({
    settings: { currency: 'INR', fundHouse: 'icici', equityReturn: 10, debtReturn: 5 },
    cashflow: {
      income: [
        { id: 'inc-1', name: 'Salary Self', amount: 200000, epf: 36000, nps: 10000, epfCorpus: 0, npsCorpus: 0 }
      ],
      expenses: []
    },
    goals: []
  }));

  const data = loadData();

  // Should not create assets for zero values
  assertEqual(data.assets.items.length, 0, 'Should have no assets for zero corpus values');

  clearData();
});

test('Migration: Existing assets preserved', () => {
  // Data that already has some assets
  localStorage.setItem('financial-planner-data', JSON.stringify({
    settings: { currency: 'INR', fundHouse: 'icici', equityReturn: 10, debtReturn: 5 },
    cashflow: {
      income: [
        { id: 'inc-1', name: 'Salary Self', amount: 200000, epf: 36000, nps: 0, epfCorpus: 1500000, npsCorpus: 0 }
      ],
      expenses: []
    },
    assets: {
      items: [
        { id: 'existing-1', name: 'House', category: 'Real Estate', value: 8000000 }
      ]
    },
    liabilities: { items: [] },
    goals: []
  }));

  const data = loadData();

  // Should have both the existing asset and the migrated EPF
  assertEqual(data.assets.items.length, 2, 'Should have 2 assets');
  const realEstateAssets = data.assets.items.filter(a => a.category === 'Real Estate');
  const epfAssets = data.assets.items.filter(a => a.category === 'EPF');
  assertEqual(realEstateAssets.length, 1, 'Should preserve existing Real Estate asset');
  assertEqual(epfAssets.length, 1, 'Should have migrated EPF asset');

  clearData();
});

test('loadData: Includes assets and liabilities in default structure', () => {
  localStorage.removeItem('financial-planner-data');
  const data = loadData();

  assertTrue(data.assets !== undefined, 'Should have assets');
  assertTrue(data.liabilities !== undefined, 'Should have liabilities');
  assertTrue(Array.isArray(data.assets.items), 'assets.items should be array');
  assertTrue(Array.isArray(data.liabilities.items), 'liabilities.items should be array');
  assertEqual(data.assets.items.length, 0, 'assets should start empty');
  assertEqual(data.liabilities.items.length, 0, 'liabilities should start empty');
});

test('loadData: Schema migration adds assets and liabilities', () => {
  // Save data without assets/liabilities (simulating old schema)
  localStorage.setItem('financial-planner-data', JSON.stringify({
    settings: { currency: 'INR', fundHouse: 'icici' },
    cashflow: { income: [], expenses: [] },
    goals: []
  }));

  const data = loadData();
  assertTrue(data.assets !== undefined, 'Should add default assets');
  assertTrue(data.liabilities !== undefined, 'Should add default liabilities');
  assertTrue(Array.isArray(data.assets.items), 'assets.items should be array');
  assertTrue(Array.isArray(data.liabilities.items), 'liabilities.items should be array');

  clearData();
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
