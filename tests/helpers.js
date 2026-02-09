// Shared test helpers

/**
 * Create a goal object for testing
 * Union of all fields used across calculator and investmentplan tests
 */
export function createGoal(options = {}) {
  const today = new Date();
  const yearsFromNow = options.yearsFromNow || 10;
  const targetDate = new Date(today.getTime() + yearsFromNow * 365.25 * 24 * 60 * 60 * 1000);

  return {
    id: options.id || 'test-goal',
    name: options.name || 'Test Goal',
    targetAmount: options.targetAmount ?? 1000000,
    inflationRate: options.inflationRate ?? 6,
    targetDate: options.targetDate || targetDate.toISOString().split('T')[0],
    goalType: options.goalType || 'one-time',
    startDate: options.startDate || today.toISOString().split('T')[0],
    includeEpfNps: options.includeEpfNps || false,
    linkedAssets: options.linkedAssets || []
  };
}

/**
 * Create a full test data structure with optional assets and goals
 */
export function createTestData(assets = [], goals = []) {
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
    goals
  };
}
