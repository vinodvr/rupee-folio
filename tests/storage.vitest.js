// Unit tests for storage.js (Vitest)
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateId,
  loadData,
  saveData,
  clearData,
  getCurrency,
  setCurrency,
  getEquityReturn,
  setEquityReturn,
  getDebtReturn,
  setDebtReturn,
  getArbitrageReturn,
  setArbitrageReturn,
  getEpfStepUp,
  setEpfStepUp,
  getNpsStepUp,
  setNpsStepUp,
  getInvestmentStepUp,
  setInvestmentStepUp,
  addIncome,
  updateIncome,
  deleteIncome,
  addExpense,
  updateExpense,
  deleteExpense,
  addGoal,
  updateGoal,
  deleteGoal,
  addAsset,
  updateAsset,
  deleteAsset,
  addLiability,
  updateLiability,
  deleteLiability,
  linkAssetToGoal,
  unlinkAssetFromGoal,
  updateLinkedAssetAmount
} from '../modules/storage.js';

// Helper to get fresh data
function getFreshData() {
  return {
    settings: {
      currency: 'INR',
      equityReturn: 10,
      debtReturn: 5,
      arbitrageReturn: 6
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

// Clear localStorage before each test
beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('ID Generation', () => {
  it('Returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('Returns unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('ID has reasonable length', () => {
    expect(generateId().length).toBeGreaterThanOrEqual(10);
  });
});

describe('Load/Save Data', () => {
  it('Returns default structure when empty', () => {
    const data = loadData();
    expect(data.settings).toBeDefined();
    expect(data.cashflow).toBeDefined();
    expect(data.goals).toBeDefined();
    expect(data.settings.currency).toBe('INR');
  });

  it('Returns true on success', () => {
    const data = getFreshData();
    expect(saveData(data)).toBe(true);
  });

  it('Round-trip preserves data', () => {
    const original = getFreshData();
    original.cashflow.income.push({ id: 'test-1', name: 'Salary', amount: 100000 });
    original.goals.push({ id: 'goal-1', name: 'Test Goal', targetAmount: 1000000 });

    saveData(original);
    const loaded = loadData();

    expect(loaded.cashflow.income.length).toBe(1);
    expect(loaded.cashflow.income[0].name).toBe('Salary');
    expect(loaded.goals.length).toBe(1);
    expect(loaded.goals[0].name).toBe('Test Goal');
  });

  it('clearData returns default structure', () => {
    const data = getFreshData();
    data.goals.push({ id: 'g1', name: 'Test' });
    saveData(data);

    const cleared = clearData();
    expect(cleared.goals.length).toBe(0);
    expect(cleared.cashflow.income.length).toBe(0);

    const loaded = loadData();
    expect(loaded.goals.length).toBe(0);
  });

  it('Handles corrupted JSON gracefully', () => {
    localStorage.setItem('financial-planner-data', 'not valid json {{{');
    const data = loadData();
    expect(data.settings).toBeDefined();
    expect(data.cashflow).toBeDefined();
  });

  it('Merges with defaults for schema updates', () => {
    localStorage.setItem('financial-planner-data', JSON.stringify({
      settings: { currency: 'INR' },
      goals: []
    }));

    const data = loadData();
    expect(data.settings.currency).toBe('INR');
    expect(data.cashflow.income).toBeDefined();
  });
});

describe('Settings Helpers', () => {
  it('getCurrency returns currency from data', () => {
    const data = getFreshData();
    data.settings.currency = 'INR';
    expect(getCurrency(data)).toBe('INR');
  });

  it('getCurrency returns INR as default', () => {
    expect(getCurrency({})).toBe('INR');
    expect(getCurrency({ settings: {} })).toBe('INR');
  });

  it('setCurrency updates and saves', () => {
    const data = getFreshData();
    setCurrency(data, 'INR');
    expect(data.settings.currency).toBe('INR');
  });

});

describe('Return Rate Settings', () => {
  it('getEquityReturn returns equityReturn from data', () => {
    const data = getFreshData();
    data.settings.equityReturn = 12;
    expect(getEquityReturn(data)).toBe(12);
  });

  it('getEquityReturn returns 10 as default', () => {
    expect(getEquityReturn({})).toBe(10);
    expect(getEquityReturn({ settings: {} })).toBe(10);
  });

  it('setEquityReturn updates and saves', () => {
    const data = getFreshData();
    setEquityReturn(data, 12);
    expect(data.settings.equityReturn).toBe(12);
  });

  it('setEquityReturn accepts decimal values', () => {
    const data = getFreshData();
    setEquityReturn(data, 11.5);
    expect(data.settings.equityReturn).toBe(11.5);
  });

  it('getDebtReturn returns debtReturn from data', () => {
    const data = getFreshData();
    data.settings.debtReturn = 6;
    expect(getDebtReturn(data)).toBe(6);
  });

  it('getDebtReturn returns 5 as default', () => {
    expect(getDebtReturn({})).toBe(5);
    expect(getDebtReturn({ settings: {} })).toBe(5);
  });

  it('setDebtReturn updates and saves', () => {
    const data = getFreshData();
    setDebtReturn(data, 6);
    expect(data.settings.debtReturn).toBe(6);
  });

  it('getArbitrageReturn returns arbitrageReturn from data', () => {
    const data = getFreshData();
    data.settings.arbitrageReturn = 7;
    expect(getArbitrageReturn(data)).toBe(7);
  });

  it('getArbitrageReturn returns 6 as default', () => {
    expect(getArbitrageReturn({})).toBe(6);
    expect(getArbitrageReturn({ settings: {} })).toBe(6);
  });

  it('setArbitrageReturn updates and saves', () => {
    const data = getFreshData();
    setArbitrageReturn(data, 7);
    expect(data.settings.arbitrageReturn).toBe(7);
  });

  it('Round-trip preserves return values', () => {
    const data = getFreshData();
    setEquityReturn(data, 13);
    setDebtReturn(data, 7);
    setArbitrageReturn(data, 8);
    saveData(data);

    const loaded = loadData();
    expect(loaded.settings.equityReturn).toBe(13);
    expect(loaded.settings.debtReturn).toBe(7);
    expect(loaded.settings.arbitrageReturn).toBe(8);
  });

  it('Default values in fresh load', () => {
    const data = loadData();
    expect(data.settings.equityReturn).toBe(10);
    expect(data.settings.debtReturn).toBe(5);
    expect(data.settings.arbitrageReturn).toBe(6);
  });

  it('getEpfStepUp returns epfStepUp from data', () => {
    const data = getFreshData();
    data.settings.epfStepUp = 7;
    expect(getEpfStepUp(data)).toBe(7);
  });

  it('getEpfStepUp returns 5 as default', () => {
    expect(getEpfStepUp({})).toBe(5);
    expect(getEpfStepUp({ settings: {} })).toBe(5);
  });

  it('getEpfStepUp falls back to old epfNpsStepUp for migration', () => {
    const data = { settings: { epfNpsStepUp: 8 } };
    expect(getEpfStepUp(data)).toBe(8);
  });

  it('setEpfStepUp updates and saves', () => {
    const data = getFreshData();
    data.settings.epfStepUp = 5;
    setEpfStepUp(data, 8);
    expect(data.settings.epfStepUp).toBe(8);
  });

  it('getNpsStepUp returns npsStepUp from data', () => {
    const data = getFreshData();
    data.settings.npsStepUp = 3;
    expect(getNpsStepUp(data)).toBe(3);
  });

  it('getNpsStepUp returns 0 as default', () => {
    expect(getNpsStepUp({})).toBe(0);
    expect(getNpsStepUp({ settings: {} })).toBe(0);
  });

  it('getNpsStepUp defaults to 0 even when old epfNpsStepUp exists', () => {
    const data = { settings: { epfNpsStepUp: 8 } };
    expect(getNpsStepUp(data)).toBe(0);
  });

  it('setNpsStepUp updates and saves', () => {
    const data = getFreshData();
    data.settings.npsStepUp = 0;
    setNpsStepUp(data, 5);
    expect(data.settings.npsStepUp).toBe(5);
  });

  it('getInvestmentStepUp returns investmentStepUp from data', () => {
    const data = getFreshData();
    data.settings.investmentStepUp = 6;
    expect(getInvestmentStepUp(data)).toBe(6);
  });

  it('getInvestmentStepUp returns 5 as default', () => {
    expect(getInvestmentStepUp({})).toBe(5);
    expect(getInvestmentStepUp({ settings: {} })).toBe(5);
  });

  it('setInvestmentStepUp updates and saves', () => {
    const data = getFreshData();
    data.settings.investmentStepUp = 5;
    setInvestmentStepUp(data, 10);
    expect(data.settings.investmentStepUp).toBe(10);
  });

  it('Round-trip preserves step-up values', () => {
    const data = getFreshData();
    data.settings.epfStepUp = 5;
    data.settings.npsStepUp = 0;
    data.settings.investmentStepUp = 5;
    setEpfStepUp(data, 7);
    setNpsStepUp(data, 3);
    setInvestmentStepUp(data, 8);
    saveData(data);

    const loaded = loadData();
    expect(loaded.settings.epfStepUp).toBe(7);
    expect(loaded.settings.npsStepUp).toBe(3);
    expect(loaded.settings.investmentStepUp).toBe(8);
  });
});

describe('Income CRUD', () => {
  it('addIncome adds income with generated ID', () => {
    const data = getFreshData();
    addIncome(data, { name: 'Salary', amount: 100000 });

    expect(data.cashflow.income.length).toBe(1);
    expect(data.cashflow.income[0].name).toBe('Salary');
    expect(data.cashflow.income[0].amount).toBe(100000);
    expect(data.cashflow.income[0].id).toBeDefined();
  });

  it('addIncome preserves provided ID', () => {
    const data = getFreshData();
    addIncome(data, { id: 'custom-id', name: 'Bonus', amount: 50000 });
    expect(data.cashflow.income[0].id).toBe('custom-id');
  });

  it('updateIncome updates existing income', () => {
    const data = getFreshData();
    addIncome(data, { id: 'inc-1', name: 'Salary', amount: 100000 });
    updateIncome(data, 'inc-1', { amount: 120000 });

    expect(data.cashflow.income[0].amount).toBe(120000);
    expect(data.cashflow.income[0].name).toBe('Salary');
  });

  it('updateIncome does nothing for non-existent ID', () => {
    const data = getFreshData();
    addIncome(data, { id: 'inc-1', name: 'Salary', amount: 100000 });
    updateIncome(data, 'non-existent', { amount: 200000 });
    expect(data.cashflow.income[0].amount).toBe(100000);
  });

  it('deleteIncome removes income by ID', () => {
    const data = getFreshData();
    addIncome(data, { id: 'inc-1', name: 'Salary', amount: 100000 });
    addIncome(data, { id: 'inc-2', name: 'Bonus', amount: 50000 });
    deleteIncome(data, 'inc-1');

    expect(data.cashflow.income.length).toBe(1);
    expect(data.cashflow.income[0].id).toBe('inc-2');
  });
});

describe('Expense CRUD', () => {
  it('addExpense adds expense with generated ID', () => {
    const data = getFreshData();
    addExpense(data, { category: 'Housing', name: 'Rent', amount: 25000 });

    expect(data.cashflow.expenses.length).toBe(1);
    expect(data.cashflow.expenses[0].category).toBe('Housing');
    expect(data.cashflow.expenses[0].name).toBe('Rent');
    expect(data.cashflow.expenses[0].id).toBeDefined();
  });

  it('updateExpense updates existing expense', () => {
    const data = getFreshData();
    addExpense(data, { id: 'exp-1', category: 'Housing', name: 'Rent', amount: 25000 });
    updateExpense(data, 'exp-1', { amount: 28000 });
    expect(data.cashflow.expenses[0].amount).toBe(28000);
  });

  it('deleteExpense removes expense by ID', () => {
    const data = getFreshData();
    addExpense(data, { id: 'exp-1', name: 'Rent', amount: 25000 });
    addExpense(data, { id: 'exp-2', name: 'Utilities', amount: 5000 });
    deleteExpense(data, 'exp-1');

    expect(data.cashflow.expenses.length).toBe(1);
    expect(data.cashflow.expenses[0].id).toBe('exp-2');
  });
});

describe('Goal CRUD', () => {
  it('addGoal adds goal with defaults', () => {
    const data = getFreshData();
    addGoal(data, { name: 'Retirement', targetAmount: 10000000 });

    expect(data.goals.length).toBe(1);
    expect(data.goals[0].name).toBe('Retirement');
    expect(data.goals[0].id).toBeDefined();
    expect(data.goals[0].startDate).toBeDefined();
  });

  it('addGoal preserves provided values', () => {
    const data = getFreshData();
    addGoal(data, { id: 'goal-1', name: 'Education', targetAmount: 5000000, startDate: '2024-01-01' });

    expect(data.goals[0].id).toBe('goal-1');
    expect(data.goals[0].startDate).toBe('2024-01-01');
  });

  it('updateGoal updates existing goal', () => {
    const data = getFreshData();
    addGoal(data, { id: 'goal-1', name: 'Retirement', targetAmount: 10000000 });
    updateGoal(data, 'goal-1', { targetAmount: 15000000, inflationRate: 7 });

    expect(data.goals[0].targetAmount).toBe(15000000);
    expect(data.goals[0].inflationRate).toBe(7);
    expect(data.goals[0].name).toBe('Retirement');
  });

  it('deleteGoal removes goal by ID', () => {
    const data = getFreshData();
    addGoal(data, { id: 'goal-1', name: 'Retirement' });
    addGoal(data, { id: 'goal-2', name: 'Education' });
    deleteGoal(data, 'goal-1');

    expect(data.goals.length).toBe(1);
    expect(data.goals[0].id).toBe('goal-2');
  });
});

describe('Asset CRUD', () => {
  it('addAsset adds asset with generated ID', () => {
    const data = getFreshData();
    addAsset(data, { name: 'Primary Residence', category: 'Real Estate', value: 5000000 });

    expect(data.assets.items.length).toBe(1);
    expect(data.assets.items[0].name).toBe('Primary Residence');
    expect(data.assets.items[0].category).toBe('Real Estate');
    expect(data.assets.items[0].value).toBe(5000000);
    expect(data.assets.items[0].id).toBeDefined();
  });

  it('addAsset preserves provided ID', () => {
    const data = getFreshData();
    addAsset(data, { id: 'asset-1', name: 'EPF', category: 'EPF', value: 1000000 });
    expect(data.assets.items[0].id).toBe('asset-1');
  });

  it('updateAsset updates existing asset', () => {
    const data = getFreshData();
    addAsset(data, { id: 'asset-1', name: 'EPF', category: 'EPF', value: 1000000 });
    const result = updateAsset(data, 'asset-1', { value: 1200000 });

    expect(result.success).toBe(true);
    expect(data.assets.items[0].value).toBe(1200000);
    expect(data.assets.items[0].name).toBe('EPF');
  });

  it('updateAsset returns error for non-existent ID', () => {
    const data = getFreshData();
    addAsset(data, { id: 'asset-1', name: 'EPF', category: 'EPF', value: 1000000 });
    const result = updateAsset(data, 'non-existent', { value: 2000000 });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Asset not found');
    expect(data.assets.items[0].value).toBe(1000000);
  });

  it('updateAsset allows any value change (auto-assign handles reallocation)', () => {
    const data = getFreshData();
    addAsset(data, { id: 'asset-1', name: 'FD', category: 'Bank/FD', value: 1000000 });

    const result = updateAsset(data, 'asset-1', { value: 500000 });
    expect(result.success).toBe(true);
    expect(data.assets.items[0].value).toBe(500000);
  });

  it('deleteAsset removes asset by ID when not linked', () => {
    const data = getFreshData();
    addAsset(data, { id: 'asset-1', name: 'EPF', category: 'EPF', value: 1000000 });
    addAsset(data, { id: 'asset-2', name: 'NPS', category: 'NPS', value: 500000 });
    const result = deleteAsset(data, 'asset-1');

    expect(result.success).toBe(true);
    expect(data.assets.items.length).toBe(1);
    expect(data.assets.items[0].id).toBe('asset-2');
  });

  it('deleteAsset removes linked asset and cleans up references', () => {
    const data = getFreshData();
    addAsset(data, { id: 'asset-1', name: 'FD', category: 'FDs & RDs', value: 500000 });
    addGoal(data, {
      id: 'goal-1',
      name: 'Emergency Fund',
      targetAmount: 500000,
      targetDate: '2030-01-01',
      linkedAssets: [{ assetId: 'asset-1', amount: 300000 }]
    });

    const result = deleteAsset(data, 'asset-1');

    expect(result.success).toBe(true);
    expect(data.assets.items.length).toBe(0);
    // Linked assets should be cleaned up
    expect(data.goals[0].linkedAssets.length).toBe(0);
  });

  it('Multiple assets of same category', () => {
    const data = getFreshData();
    addAsset(data, { id: 'epf-1', name: 'EPF Self', category: 'EPF', value: 1000000 });
    addAsset(data, { id: 'epf-2', name: 'EPF Spouse', category: 'EPF', value: 800000 });

    expect(data.assets.items.length).toBe(2);
    const epfAssets = data.assets.items.filter(a => a.category === 'EPF');
    expect(epfAssets.length).toBe(2);
  });
});

describe('Liability CRUD', () => {
  it('addLiability adds liability with generated ID', () => {
    const data = getFreshData();
    addLiability(data, { name: 'Home Loan - HDFC', category: 'Home Loan', amount: 4500000 });

    expect(data.liabilities.items.length).toBe(1);
    expect(data.liabilities.items[0].name).toBe('Home Loan - HDFC');
    expect(data.liabilities.items[0].category).toBe('Home Loan');
    expect(data.liabilities.items[0].amount).toBe(4500000);
    expect(data.liabilities.items[0].id).toBeDefined();
  });

  it('addLiability preserves provided ID', () => {
    const data = getFreshData();
    addLiability(data, { id: 'loan-1', name: 'Car Loan', category: 'Car Loan', amount: 500000 });
    expect(data.liabilities.items[0].id).toBe('loan-1');
  });

  it('updateLiability updates existing liability', () => {
    const data = getFreshData();
    addLiability(data, { id: 'loan-1', name: 'Home Loan', category: 'Home Loan', amount: 4500000 });
    updateLiability(data, 'loan-1', { amount: 4200000 });

    expect(data.liabilities.items[0].amount).toBe(4200000);
    expect(data.liabilities.items[0].name).toBe('Home Loan');
  });

  it('updateLiability does nothing for non-existent ID', () => {
    const data = getFreshData();
    addLiability(data, { id: 'loan-1', name: 'Home Loan', category: 'Home Loan', amount: 4500000 });
    updateLiability(data, 'non-existent', { amount: 1000000 });
    expect(data.liabilities.items[0].amount).toBe(4500000);
  });

  it('deleteLiability removes liability by ID', () => {
    const data = getFreshData();
    addLiability(data, { id: 'loan-1', name: 'Home Loan', category: 'Home Loan', amount: 4500000 });
    addLiability(data, { id: 'loan-2', name: 'Car Loan', category: 'Car Loan', amount: 500000 });
    deleteLiability(data, 'loan-1');

    expect(data.liabilities.items.length).toBe(1);
    expect(data.liabilities.items[0].id).toBe('loan-2');
  });
});

describe('Schema Validation', () => {
  it('Goals have required structure', () => {
    const data = getFreshData();
    addGoal(data, { name: 'Test', targetAmount: 1000000, inflationRate: 6, targetDate: '2035-01-01' });

    const goal = data.goals[0];
    expect(goal.id).toBeDefined();
    expect(goal.startDate).toBeDefined();
  });

  it('Cashflow has income and expenses arrays', () => {
    const data = loadData();
    expect(Array.isArray(data.cashflow.income)).toBe(true);
    expect(Array.isArray(data.cashflow.expenses)).toBe(true);
  });

  it('Assets and liabilities have items arrays', () => {
    const data = loadData();
    expect(data.assets).toBeDefined();
    expect(data.liabilities).toBeDefined();
    expect(Array.isArray(data.assets.items)).toBe(true);
    expect(Array.isArray(data.liabilities.items)).toBe(true);
  });
});

describe('Migration - EPF/NPS Corpus to Assets', () => {
  it('EPF corpus moved to assets', () => {
    localStorage.setItem('financial-planner-data', JSON.stringify({
      settings: { currency: 'INR', equityReturn: 10, debtReturn: 5 },
      cashflow: {
        income: [
          { id: 'inc-1', name: 'Salary Self', amount: 200000, epf: 36000, nps: 0, epfCorpus: 1500000, npsCorpus: 0 }
        ],
        expenses: []
      },
      goals: []
    }));

    const data = loadData();

    const epfAssets = data.assets.items.filter(a => a.category === 'EPF');
    expect(epfAssets.length).toBe(1);
    expect(epfAssets[0].value).toBe(1500000);
    expect(epfAssets[0].name).toBe('EPF - Salary Self');
    expect(data.cashflow.income[0].epfCorpus).toBeUndefined();
  });

  it('NPS corpus moved to assets', () => {
    localStorage.setItem('financial-planner-data', JSON.stringify({
      settings: { currency: 'INR', equityReturn: 10, debtReturn: 5 },
      cashflow: {
        income: [
          { id: 'inc-1', name: 'Salary Self', amount: 200000, epf: 0, nps: 10000, epfCorpus: 0, npsCorpus: 500000 }
        ],
        expenses: []
      },
      goals: []
    }));

    const data = loadData();

    const npsAssets = data.assets.items.filter(a => a.category === 'NPS');
    expect(npsAssets.length).toBe(1);
    expect(npsAssets[0].value).toBe(500000);
    expect(npsAssets[0].name).toBe('NPS - Salary Self');
    expect(data.cashflow.income[0].npsCorpus).toBeUndefined();
  });

  it('Multiple income entries with corpus', () => {
    localStorage.setItem('financial-planner-data', JSON.stringify({
      settings: { currency: 'INR', equityReturn: 10, debtReturn: 5 },
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

    const epfAssets = data.assets.items.filter(a => a.category === 'EPF');
    const npsAssets = data.assets.items.filter(a => a.category === 'NPS');

    expect(epfAssets.length).toBe(2);
    expect(npsAssets.length).toBe(1);

    const totalEpf = epfAssets.reduce((sum, a) => sum + a.value, 0);
    expect(totalEpf).toBe(2300000);
  });

  it('Zero corpus values not migrated', () => {
    localStorage.setItem('financial-planner-data', JSON.stringify({
      settings: { currency: 'INR', equityReturn: 10, debtReturn: 5 },
      cashflow: {
        income: [
          { id: 'inc-1', name: 'Salary Self', amount: 200000, epf: 36000, nps: 10000, epfCorpus: 0, npsCorpus: 0 }
        ],
        expenses: []
      },
      goals: []
    }));

    const data = loadData();
    expect(data.assets.items.length).toBe(0);
  });
});

describe('Migration - linkedAssets', () => {
  it('Adds linkedAssets array to goals that lack it', () => {
    localStorage.setItem('financial-planner-data', JSON.stringify({
      settings: { currency: 'INR', equityReturn: 10, debtReturn: 5 },
      cashflow: { income: [], expenses: [] },
      assets: { items: [] },
      goals: [
        { id: 'goal-1', name: 'Goal 1', targetAmount: 1000000 },
        { id: 'goal-2', name: 'Goal 2', targetAmount: 500000 }
      ]
    }));

    const data = loadData();

    expect(data.goals[0].linkedAssets).toBeDefined();
    expect(Array.isArray(data.goals[0].linkedAssets)).toBe(true);
    expect(data.goals[0].linkedAssets.length).toBe(0);
    expect(data.goals[1].linkedAssets).toBeDefined();
  });

  it('Preserves existing linkedAssets', () => {
    localStorage.setItem('financial-planner-data', JSON.stringify({
      settings: { currency: 'INR', equityReturn: 10, debtReturn: 5 },
      cashflow: { income: [], expenses: [] },
      assets: { items: [{ id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }] },
      goals: [
        { id: 'goal-1', name: 'Goal 1', targetAmount: 1000000, linkedAssets: [{ assetId: 'asset-1', amount: 200000 }] }
      ]
    }));

    const data = loadData();

    expect(data.goals[0].linkedAssets.length).toBe(1);
    expect(data.goals[0].linkedAssets[0].assetId).toBe('asset-1');
    expect(data.goals[0].linkedAssets[0].amount).toBe(200000);
  });

  it('Cleans up orphaned linkedAssets references', () => {
    localStorage.setItem('financial-planner-data', JSON.stringify({
      settings: { currency: 'INR', equityReturn: 10, debtReturn: 5 },
      cashflow: { income: [], expenses: [] },
      assets: { items: [{ id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }] },
      goals: [
        { id: 'goal-1', name: 'Goal 1', targetAmount: 1000000, linkedAssets: [
          { assetId: 'asset-1', amount: 200000 },
          { assetId: 'deleted-asset', amount: 100000 } // This asset doesn't exist
        ]}
      ]
    }));

    const data = loadData();

    expect(data.goals[0].linkedAssets.length).toBe(1);
    expect(data.goals[0].linkedAssets[0].assetId).toBe('asset-1');
  });
});

describe('Linked Assets CRUD', () => {
  it('linkAssetToGoal adds new link', () => {
    const data = getFreshData();
    addGoal(data, { id: 'goal-1', name: 'Goal 1', targetAmount: 1000000 });
    addAsset(data, { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 });

    linkAssetToGoal(data, 'goal-1', 'asset-1', 200000);

    expect(data.goals[0].linkedAssets.length).toBe(1);
    expect(data.goals[0].linkedAssets[0].assetId).toBe('asset-1');
    expect(data.goals[0].linkedAssets[0].amount).toBe(200000);
  });

  it('linkAssetToGoal updates existing link amount', () => {
    const data = getFreshData();
    addGoal(data, { id: 'goal-1', name: 'Goal 1', targetAmount: 1000000, linkedAssets: [{ assetId: 'asset-1', amount: 100000 }] });
    addAsset(data, { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 });

    linkAssetToGoal(data, 'goal-1', 'asset-1', 300000);

    expect(data.goals[0].linkedAssets.length).toBe(1);
    expect(data.goals[0].linkedAssets[0].amount).toBe(300000);
  });

  it('linkAssetToGoal initializes linkedAssets array if needed', () => {
    const data = getFreshData();
    addGoal(data, { id: 'goal-1', name: 'Goal 1', targetAmount: 1000000 });
    // Manually remove linkedAssets to simulate old data
    delete data.goals[0].linkedAssets;
    addAsset(data, { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 });

    linkAssetToGoal(data, 'goal-1', 'asset-1', 200000);

    expect(data.goals[0].linkedAssets).toBeDefined();
    expect(data.goals[0].linkedAssets.length).toBe(1);
  });

  it('linkAssetToGoal does nothing for non-existent goal', () => {
    const data = getFreshData();
    addAsset(data, { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 });

    const result = linkAssetToGoal(data, 'non-existent', 'asset-1', 200000);

    expect(result).toBe(data);
    expect(data.goals.length).toBe(0);
  });

  it('unlinkAssetFromGoal removes link', () => {
    const data = getFreshData();
    addGoal(data, { id: 'goal-1', name: 'Goal 1', targetAmount: 1000000, linkedAssets: [
      { assetId: 'asset-1', amount: 200000 },
      { assetId: 'asset-2', amount: 100000 }
    ]});

    unlinkAssetFromGoal(data, 'goal-1', 'asset-1');

    expect(data.goals[0].linkedAssets.length).toBe(1);
    expect(data.goals[0].linkedAssets[0].assetId).toBe('asset-2');
  });

  it('unlinkAssetFromGoal does nothing for non-existent goal', () => {
    const data = getFreshData();
    const result = unlinkAssetFromGoal(data, 'non-existent', 'asset-1');
    expect(result).toBe(data);
  });

  it('updateLinkedAssetAmount updates amount', () => {
    const data = getFreshData();
    addGoal(data, { id: 'goal-1', name: 'Goal 1', targetAmount: 1000000, linkedAssets: [{ assetId: 'asset-1', amount: 200000 }] });

    updateLinkedAssetAmount(data, 'goal-1', 'asset-1', 350000);

    expect(data.goals[0].linkedAssets[0].amount).toBe(350000);
  });

  it('deleteAsset cleans up linkedAssets references across goals', () => {
    const data = getFreshData();
    addAsset(data, { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 });
    addAsset(data, { id: 'asset-2', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 300000 });
    addGoal(data, { id: 'goal-1', name: 'Goal 1', targetAmount: 1000000, linkedAssets: [
      { assetId: 'asset-1', amount: 200000 },
      { assetId: 'asset-2', amount: 100000 }
    ]});
    addGoal(data, { id: 'goal-2', name: 'Goal 2', targetAmount: 500000, linkedAssets: [{ assetId: 'asset-1', amount: 150000 }] });

    deleteAsset(data, 'asset-1');

    expect(data.goals[0].linkedAssets.length).toBe(1);
    expect(data.goals[0].linkedAssets[0].assetId).toBe('asset-2');
    expect(data.goals[1].linkedAssets.length).toBe(0);
  });
});

