// Unit tests for assets.js (Vitest)
import { describe, it, expect } from 'vitest';
import { getRetirementAssets, getLinkableAssets, getAssetAllocations, getGoalLinkedTotal, validateLinkAmount, checkAssetOverAllocation } from '../modules/assets.js';

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

describe('getRetirementAssets', () => {
  it('Returns zero for empty assets', () => {
    const data = createTestData([]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(0);
    expect(result.npsCorpus).toBe(0);
    expect(result.totalCorpus).toBe(0);
  });

  it('Returns zero when no EPF/NPS assets', () => {
    const data = createTestData([
      { id: '1', name: 'House', category: 'Real Estate', value: 8000000 },
      { id: '2', name: 'Car', category: 'Vehicles', value: 500000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(0);
    expect(result.npsCorpus).toBe(0);
    expect(result.totalCorpus).toBe(0);
  });

  it('Sums single EPF asset', () => {
    const data = createTestData([
      { id: '1', name: 'EPF Self', category: 'EPF', value: 1500000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(1500000);
    expect(result.npsCorpus).toBe(0);
    expect(result.totalCorpus).toBe(1500000);
  });

  it('Sums single NPS asset', () => {
    const data = createTestData([
      { id: '1', name: 'NPS Self', category: 'NPS', value: 500000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(0);
    expect(result.npsCorpus).toBe(500000);
    expect(result.totalCorpus).toBe(500000);
  });

  it('Sums multiple EPF assets', () => {
    const data = createTestData([
      { id: '1', name: 'EPF Self', category: 'EPF', value: 1500000 },
      { id: '2', name: 'EPF Spouse', category: 'EPF', value: 800000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(2300000);
    expect(result.npsCorpus).toBe(0);
    expect(result.totalCorpus).toBe(2300000);
  });

  it('Sums multiple NPS assets', () => {
    const data = createTestData([
      { id: '1', name: 'NPS Self', category: 'NPS', value: 500000 },
      { id: '2', name: 'NPS Spouse', category: 'NPS', value: 300000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(0);
    expect(result.npsCorpus).toBe(800000);
    expect(result.totalCorpus).toBe(800000);
  });

  it('Sums both EPF and NPS', () => {
    const data = createTestData([
      { id: '1', name: 'EPF Self', category: 'EPF', value: 1500000 },
      { id: '2', name: 'NPS Self', category: 'NPS', value: 500000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(1500000);
    expect(result.npsCorpus).toBe(500000);
    expect(result.totalCorpus).toBe(2000000);
  });

  it('Ignores non-EPF/NPS assets', () => {
    const data = createTestData([
      { id: '1', name: 'House', category: 'Real Estate', value: 8000000 },
      { id: '2', name: 'EPF Self', category: 'EPF', value: 1500000 },
      { id: '3', name: 'Car', category: 'Vehicles', value: 500000 },
      { id: '4', name: 'NPS Self', category: 'NPS', value: 500000 },
      { id: '5', name: 'FD', category: 'Bank/FDs', value: 200000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(1500000);
    expect(result.npsCorpus).toBe(500000);
    expect(result.totalCorpus).toBe(2000000);
  });

  it('Handles null data gracefully', () => {
    const result = getRetirementAssets(null);

    expect(result.epfCorpus).toBe(0);
    expect(result.npsCorpus).toBe(0);
    expect(result.totalCorpus).toBe(0);
  });

  it('Handles missing assets gracefully', () => {
    const result = getRetirementAssets({});

    expect(result.epfCorpus).toBe(0);
    expect(result.npsCorpus).toBe(0);
    expect(result.totalCorpus).toBe(0);
  });

  it('Handles undefined value in asset', () => {
    const data = createTestData([
      { id: '1', name: 'EPF Self', category: 'EPF', value: undefined }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(0);
    expect(result.totalCorpus).toBe(0);
  });

  it('Handles null value in asset', () => {
    const data = createTestData([
      { id: '1', name: 'EPF Self', category: 'EPF', value: null }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(0);
    expect(result.totalCorpus).toBe(0);
  });

  it('Full sample data scenario', () => {
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

    expect(result.epfCorpus).toBe(2300000);
    expect(result.npsCorpus).toBe(500000);
    expect(result.totalCorpus).toBe(2800000);
  });
});

describe('Asset Categories', () => {
  it('EPF category is case-sensitive', () => {
    const data = createTestData([
      { id: '1', name: 'EPF', category: 'EPF', value: 1000000 },
      { id: '2', name: 'epf', category: 'epf', value: 500000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.epfCorpus).toBe(1000000);
  });

  it('NPS category is case-sensitive', () => {
    const data = createTestData([
      { id: '1', name: 'NPS', category: 'NPS', value: 1000000 },
      { id: '2', name: 'nps', category: 'nps', value: 500000 }
    ]);
    const result = getRetirementAssets(data);

    expect(result.npsCorpus).toBe(1000000);
  });
});

describe('getLinkableAssets', () => {
  it('Returns empty array for null data', () => {
    expect(getLinkableAssets(null, 'short')).toEqual([]);
    expect(getLinkableAssets(null, 'long')).toEqual([]);
  });

  it('Returns empty array for missing assets', () => {
    expect(getLinkableAssets({}, 'short')).toEqual([]);
    expect(getLinkableAssets({ assets: {} }, 'long')).toEqual([]);
  });

  it('Returns only short-term eligible assets for short goals', () => {
    const data = createTestData([
      { id: '1', name: 'FD', category: 'FDs & RDs', value: 100000 },
      { id: '2', name: 'Savings', category: 'Savings Bank', value: 50000 },
      { id: '3', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 200000 },
      { id: '4', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 },
      { id: '5', name: 'EPF', category: 'EPF Corpus', value: 1000000 }
    ]);

    const result = getLinkableAssets(data, 'short');

    expect(result.length).toBe(3);
    expect(result.map(a => a.category)).toContain('FDs & RDs');
    expect(result.map(a => a.category)).toContain('Savings Bank');
    expect(result.map(a => a.category)).toContain('Debt/Arbitrage Mutual Funds');
    expect(result.map(a => a.category)).not.toContain('Equity Mutual Funds');
    expect(result.map(a => a.category)).not.toContain('EPF Corpus');
  });

  it('Returns only long-term eligible assets for long goals', () => {
    const data = createTestData([
      { id: '1', name: 'FD', category: 'FDs & RDs', value: 100000 },
      { id: '2', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 },
      { id: '3', name: 'Stocks', category: 'Stocks', value: 300000 },
      { id: '4', name: 'Gold ETF', category: 'Gold ETFs/SGBs', value: 200000 },
      { id: '5', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 150000 },
      { id: '6', name: 'NPS', category: 'NPS Corpus', value: 500000 }
    ]);

    const result = getLinkableAssets(data, 'long');

    expect(result.length).toBe(4);
    expect(result.map(a => a.category)).toContain('Equity Mutual Funds');
    expect(result.map(a => a.category)).toContain('Stocks');
    expect(result.map(a => a.category)).toContain('Gold ETFs/SGBs');
    expect(result.map(a => a.category)).toContain('Debt/Arbitrage Mutual Funds');
    expect(result.map(a => a.category)).not.toContain('FDs & RDs');
    expect(result.map(a => a.category)).not.toContain('NPS Corpus');
  });

  it('Excludes retirement and illiquid assets', () => {
    const data = createTestData([
      { id: '1', name: 'EPF', category: 'EPF Corpus', value: 1000000 },
      { id: '2', name: 'PPF', category: 'PPF Corpus', value: 500000 },
      { id: '3', name: 'NPS', category: 'NPS Corpus', value: 300000 },
      { id: '4', name: 'House', category: 'House', value: 5000000 },
      { id: '5', name: 'Gold Coins', category: 'Physical Gold', value: 200000 },
      { id: '6', name: 'LIC', category: 'LIC/Insurance Policy', value: 100000 }
    ]);

    expect(getLinkableAssets(data, 'short').length).toBe(0);
    expect(getLinkableAssets(data, 'long').length).toBe(0);
  });
});

describe('getAssetAllocations', () => {
  it('Returns empty object for null/missing data', () => {
    expect(getAssetAllocations(null)).toEqual({});
    expect(getAssetAllocations({})).toEqual({});
  });

  it('Returns allocations for linkable assets only', () => {
    const data = createTestData([
      { id: '1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 },
      { id: '2', name: 'EPF', category: 'EPF Corpus', value: 1000000 }
    ]);

    const result = getAssetAllocations(data);

    expect(result['1']).toBeDefined();
    expect(result['1'].total).toBe(500000);
    expect(result['1'].allocated).toBe(0);
    expect(result['1'].available).toBe(500000);
    expect(result['2']).toBeUndefined(); // EPF not linkable
  });

  it('Tracks allocations from goal linkedAssets', () => {
    const data = {
      ...createTestData([
        { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 },
        { id: 'asset-2', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 300000 }
      ]),
      goals: [
        { id: 'goal-1', name: 'Goal 1', linkedAssets: [{ assetId: 'asset-1', amount: 200000 }] },
        { id: 'goal-2', name: 'Goal 2', linkedAssets: [{ assetId: 'asset-1', amount: 100000 }, { assetId: 'asset-2', amount: 150000 }] }
      ]
    };

    const result = getAssetAllocations(data);

    expect(result['asset-1'].total).toBe(500000);
    expect(result['asset-1'].allocated).toBe(300000);
    expect(result['asset-1'].available).toBe(200000);

    expect(result['asset-2'].total).toBe(300000);
    expect(result['asset-2'].allocated).toBe(150000);
    expect(result['asset-2'].available).toBe(150000);
  });

  it('Handles goals without linkedAssets', () => {
    const data = {
      ...createTestData([
        { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
      ]),
      goals: [
        { id: 'goal-1', name: 'Goal 1' }, // No linkedAssets field
        { id: 'goal-2', name: 'Goal 2', linkedAssets: [] }
      ]
    };

    const result = getAssetAllocations(data);

    expect(result['asset-1'].allocated).toBe(0);
    expect(result['asset-1'].available).toBe(500000);
  });
});

describe('getGoalLinkedTotal', () => {
  it('Returns 0 for null/undefined goal', () => {
    expect(getGoalLinkedTotal(null)).toBe(0);
    expect(getGoalLinkedTotal(undefined)).toBe(0);
  });

  it('Returns 0 for goal without linkedAssets', () => {
    expect(getGoalLinkedTotal({ id: '1', name: 'Goal' })).toBe(0);
    expect(getGoalLinkedTotal({ id: '1', name: 'Goal', linkedAssets: [] })).toBe(0);
  });

  it('Sums linked asset amounts', () => {
    const goal = {
      id: '1',
      name: 'Goal',
      linkedAssets: [
        { assetId: 'a1', amount: 100000 },
        { assetId: 'a2', amount: 250000 },
        { assetId: 'a3', amount: 50000 }
      ]
    };

    expect(getGoalLinkedTotal(goal)).toBe(400000);
  });

  it('Handles missing/null amounts', () => {
    const goal = {
      id: '1',
      name: 'Goal',
      linkedAssets: [
        { assetId: 'a1', amount: 100000 },
        { assetId: 'a2' }, // No amount
        { assetId: 'a3', amount: null }
      ]
    };

    expect(getGoalLinkedTotal(goal)).toBe(100000);
  });
});

describe('validateLinkAmount', () => {
  it('Returns invalid for null/missing data', () => {
    const result = validateLinkAmount(null, 'asset-1', 100000, 'goal-1');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid data');
  });

  it('Returns invalid for non-existent asset', () => {
    const data = createTestData([
      { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ]);
    data.goals = [];

    const result = validateLinkAmount(data, 'non-existent', 100000, 'goal-1');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Asset not found');
  });

  it('Returns invalid for zero or negative amount', () => {
    const data = createTestData([
      { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ]);
    data.goals = [];

    expect(validateLinkAmount(data, 'asset-1', 0, 'goal-1').valid).toBe(false);
    expect(validateLinkAmount(data, 'asset-1', -100, 'goal-1').valid).toBe(false);
  });

  it('Returns valid when amount is within available', () => {
    const data = createTestData([
      { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ]);
    data.goals = [];

    const result = validateLinkAmount(data, 'asset-1', 200000, 'goal-1');
    expect(result.valid).toBe(true);
    expect(result.available).toBe(500000);
  });

  it('Returns valid when amount equals full asset value', () => {
    const data = createTestData([
      { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ]);
    data.goals = [];

    const result = validateLinkAmount(data, 'asset-1', 500000, 'goal-1');
    expect(result.valid).toBe(true);
  });

  it('Returns invalid when amount exceeds asset value', () => {
    const data = createTestData([
      { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ]);
    data.goals = [];

    const result = validateLinkAmount(data, 'asset-1', 600000, 'goal-1');
    expect(result.valid).toBe(false);
    expect(result.available).toBe(500000);
    expect(result.error).toContain('exceeds available');
  });

  it('Accounts for allocations to other goals', () => {
    const data = createTestData([
      { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ]);
    data.goals = [
      { id: 'goal-1', name: 'Goal 1', linkedAssets: [{ assetId: 'asset-1', amount: 200000 }] },
      { id: 'goal-2', name: 'Goal 2', linkedAssets: [] }
    ];

    // Trying to link to goal-2, goal-1 already has 200k allocated
    const result = validateLinkAmount(data, 'asset-1', 400000, 'goal-2');
    expect(result.valid).toBe(false);
    expect(result.available).toBe(300000); // 500k - 200k = 300k available
  });

  it('Excludes current goal from allocation calculation (for updates)', () => {
    const data = createTestData([
      { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ]);
    data.goals = [
      { id: 'goal-1', name: 'Goal 1', linkedAssets: [{ assetId: 'asset-1', amount: 200000 }] },
      { id: 'goal-2', name: 'Goal 2', linkedAssets: [{ assetId: 'asset-1', amount: 150000 }] }
    ];

    // Updating goal-1's link - should allow up to 350k (500k - 150k from goal-2)
    const result = validateLinkAmount(data, 'asset-1', 350000, 'goal-1');
    expect(result.valid).toBe(true);
    expect(result.available).toBe(350000);

    // But 400k should fail
    const result2 = validateLinkAmount(data, 'asset-1', 400000, 'goal-1');
    expect(result2.valid).toBe(false);
  });

  it('Handles multiple goals allocating same asset', () => {
    const data = createTestData([
      { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ]);
    data.goals = [
      { id: 'goal-1', name: 'Goal 1', linkedAssets: [{ assetId: 'asset-1', amount: 150000 }] },
      { id: 'goal-2', name: 'Goal 2', linkedAssets: [{ assetId: 'asset-1', amount: 200000 }] },
      { id: 'goal-3', name: 'Goal 3', linkedAssets: [] }
    ];

    // Goal-3 trying to link - only 150k available (500k - 150k - 200k)
    const result = validateLinkAmount(data, 'asset-1', 150000, 'goal-3');
    expect(result.valid).toBe(true);
    expect(result.available).toBe(150000);

    const result2 = validateLinkAmount(data, 'asset-1', 200000, 'goal-3');
    expect(result2.valid).toBe(false);
  });
});

describe('checkAssetOverAllocation', () => {
  it('Returns not over-allocated for null/missing data', () => {
    const result = checkAssetOverAllocation(null, 'asset-1');
    expect(result.overAllocated).toBe(false);
  });

  it('Returns not over-allocated for non-existent asset', () => {
    const data = createTestData([]);
    data.goals = [];

    const result = checkAssetOverAllocation(data, 'non-existent');
    expect(result.overAllocated).toBe(false);
  });

  it('Returns not over-allocated when no links exist', () => {
    const data = createTestData([
      { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ]);
    data.goals = [];

    const result = checkAssetOverAllocation(data, 'asset-1');
    expect(result.overAllocated).toBe(false);
    expect(result.total).toBe(500000);
    expect(result.allocated).toBe(0);
    expect(result.excess).toBe(0);
  });

  it('Returns not over-allocated when allocations are within limit', () => {
    const data = createTestData([
      { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ]);
    data.goals = [
      { id: 'goal-1', name: 'Goal 1', linkedAssets: [{ assetId: 'asset-1', amount: 200000 }] },
      { id: 'goal-2', name: 'Goal 2', linkedAssets: [{ assetId: 'asset-1', amount: 300000 }] }
    ];

    const result = checkAssetOverAllocation(data, 'asset-1');
    expect(result.overAllocated).toBe(false);
    expect(result.total).toBe(500000);
    expect(result.allocated).toBe(500000);
    expect(result.excess).toBe(0);
  });

  it('Returns over-allocated when allocations exceed asset value', () => {
    const data = createTestData([
      { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ]);
    data.goals = [
      { id: 'goal-1', name: 'Goal 1', linkedAssets: [{ assetId: 'asset-1', amount: 300000 }] },
      { id: 'goal-2', name: 'Goal 2', linkedAssets: [{ assetId: 'asset-1', amount: 300000 }] }
    ];

    const result = checkAssetOverAllocation(data, 'asset-1');
    expect(result.overAllocated).toBe(true);
    expect(result.total).toBe(500000);
    expect(result.allocated).toBe(600000);
    expect(result.excess).toBe(100000);
  });

  it('Sums allocations from multiple goals correctly', () => {
    const data = createTestData([
      { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 1000000 }
    ]);
    data.goals = [
      { id: 'goal-1', name: 'Goal 1', linkedAssets: [{ assetId: 'asset-1', amount: 300000 }] },
      { id: 'goal-2', name: 'Goal 2', linkedAssets: [{ assetId: 'asset-1', amount: 400000 }] },
      { id: 'goal-3', name: 'Goal 3', linkedAssets: [{ assetId: 'asset-1', amount: 500000 }] }
    ];

    const result = checkAssetOverAllocation(data, 'asset-1');
    expect(result.overAllocated).toBe(true);
    expect(result.allocated).toBe(1200000);
    expect(result.excess).toBe(200000);
  });

  it('Handles goals without linkedAssets field', () => {
    const data = createTestData([
      { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ]);
    data.goals = [
      { id: 'goal-1', name: 'Goal 1' }, // No linkedAssets
      { id: 'goal-2', name: 'Goal 2', linkedAssets: [{ assetId: 'asset-1', amount: 200000 }] }
    ];

    const result = checkAssetOverAllocation(data, 'asset-1');
    expect(result.overAllocated).toBe(false);
    expect(result.allocated).toBe(200000);
  });
});

describe('Over-allocation Prevention Integration', () => {
  it('getAssetAllocations shows 0 available when fully allocated', () => {
    const data = createTestData([
      { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ]);
    data.goals = [
      { id: 'goal-1', name: 'Goal 1', linkedAssets: [{ assetId: 'asset-1', amount: 500000 }] }
    ];

    const allocations = getAssetAllocations(data);
    expect(allocations['asset-1'].available).toBe(0);
  });

  it('getAssetAllocations shows negative available as 0 when over-allocated', () => {
    const data = createTestData([
      { id: 'asset-1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ]);
    data.goals = [
      { id: 'goal-1', name: 'Goal 1', linkedAssets: [{ assetId: 'asset-1', amount: 300000 }] },
      { id: 'goal-2', name: 'Goal 2', linkedAssets: [{ assetId: 'asset-1', amount: 300000 }] }
    ];

    const allocations = getAssetAllocations(data);
    // Available should be capped at 0, not negative
    expect(allocations['asset-1'].available).toBe(0);
    expect(allocations['asset-1'].allocated).toBe(600000);
  });

  it('Scenario: Prevent linking ₹3L to third goal when ₹5L asset already has ₹3L allocated', () => {
    const data = createTestData([
      { id: 'asset-1', name: 'Bluechip Fund', category: 'Equity Mutual Funds', value: 500000 }
    ]);
    data.goals = [
      { id: 'goal-1', name: 'Child Education', linkedAssets: [{ assetId: 'asset-1', amount: 200000 }] },
      { id: 'goal-2', name: 'Car Purchase', linkedAssets: [{ assetId: 'asset-1', amount: 100000 }] },
      { id: 'goal-3', name: 'House Down Payment', linkedAssets: [] }
    ];

    // Available: 500k - 200k - 100k = 200k
    const allocations = getAssetAllocations(data);
    expect(allocations['asset-1'].available).toBe(200000);

    // Validation should fail for 300k
    const result = validateLinkAmount(data, 'asset-1', 300000, 'goal-3');
    expect(result.valid).toBe(false);
    expect(result.available).toBe(200000);

    // Validation should pass for 200k
    const result2 = validateLinkAmount(data, 'asset-1', 200000, 'goal-3');
    expect(result2.valid).toBe(true);
  });
});
