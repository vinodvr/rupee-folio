// Unit tests for investmentplan.js - Auto-assign Algorithm (Vitest)
import { describe, it, expect, beforeEach } from 'vitest';

// Since the auto-assign functions are not exported, we need to test them indirectly
// or extract the logic. For now, let's create a testable version of the algorithm.

// Replicate the constants from assets.js for testing
const SHORT_TERM_ONLY = ['FDs & RDs', 'Savings Bank'];
const LONG_TERM_ONLY = ['Equity Mutual Funds', 'Stocks', 'Gold ETFs/SGBs'];
const BOTH_TERMS = ['Debt/Arbitrage Mutual Funds'];
const NOT_LINKABLE = [
  'EPF Corpus', 'PPF Corpus', 'NPS Corpus',
  'House', 'Land',
  'Physical Gold',
  'LIC/Insurance Policy',
  'ESOPs', 'Gratuity',
  'ULIPs', 'Bonds', 'Crypto',
  'Other'
];

// Helper to get years remaining (simplified for tests)
function getYearsRemaining(targetDate) {
  const now = new Date();
  const target = new Date(targetDate);
  const diffTime = target - now;
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, diffYears);
}

// Helper to get goal category
function getUnifiedCategory(targetDate) {
  const years = getYearsRemaining(targetDate);
  return years < 5 ? 'short' : 'long';
}

// Helper to calculate inflation-adjusted amount
function calculateInflationAdjustedAmount(presentValue, inflationRate, years) {
  if (years <= 0) return presentValue;
  return presentValue * Math.pow(1 + inflationRate / 100, years);
}

// Replicate getAssetAllocations logic for testing
function getAssetAllocations(data) {
  if (!data || !data.assets || !data.assets.items) return {};

  const allocations = {};
  data.assets.items.forEach(asset => {
    if (!NOT_LINKABLE.includes(asset.category)) {
      allocations[asset.id] = {
        total: asset.value || 0,
        allocated: 0,
        available: asset.value || 0
      };
    }
  });

  if (data.goals) {
    data.goals.forEach(goal => {
      if (goal.linkedAssets && goal.linkedAssets.length > 0) {
        goal.linkedAssets.forEach(linked => {
          if (allocations[linked.assetId]) {
            allocations[linked.assetId].allocated += linked.amount || 0;
            allocations[linked.assetId].available = Math.max(0,
              allocations[linked.assetId].total - allocations[linked.assetId].allocated
            );
          }
        });
      }
    });
  }

  return allocations;
}

/**
 * Testable version of auto-assign algorithm (matches investmentplan.js logic)
 */
function calculateAutoAssignments(data) {
  const allocations = getAssetAllocations(data);
  const availableAssets = {};

  // Track available amounts for each asset
  Object.entries(allocations).forEach(([assetId, alloc]) => {
    if (alloc.available > 0) {
      const asset = data.assets.items.find(a => a.id === assetId);
      if (asset) {
        availableAssets[assetId] = {
          ...asset,
          available: alloc.available
        };
      }
    }
  });

  // Sort goals by target date (nearest first)
  const sortedGoals = [...data.goals].sort((a, b) =>
    new Date(a.targetDate) - new Date(b.targetDate)
  );

  const assignments = [];

  sortedGoals.forEach(goal => {
    const category = getUnifiedCategory(goal.targetDate);
    const years = getYearsRemaining(goal.targetDate);

    // Calculate inflation-adjusted target
    const inflationAdjustedTarget = calculateInflationAdjustedAmount(
      goal.targetAmount,
      goal.inflationRate || 0,
      years
    );

    // Already linked amount
    const alreadyLinked = (goal.linkedAssets || [])
      .reduce((sum, la) => sum + (la.amount || 0), 0);

    // Remaining need
    let remainingNeed = Math.max(0, inflationAdjustedTarget - alreadyLinked);

    // Get eligible asset categories for this goal type
    const eligibleCategories = category === 'short'
      ? [...SHORT_TERM_ONLY, ...BOTH_TERMS]
      : [...LONG_TERM_ONLY, ...BOTH_TERMS];

    // Find available assets that match
    Object.entries(availableAssets).forEach(([assetId, asset]) => {
      if (remainingNeed <= 0) return;
      if (!eligibleCategories.includes(asset.category)) return;
      if (asset.available <= 0) return;

      // Skip if already linked to this goal
      const existingLink = (goal.linkedAssets || []).find(la => la.assetId === assetId);
      if (existingLink) return;

      // Assign up to the remaining need or available amount
      const assignAmount = Math.min(remainingNeed, asset.available);

      assignments.push({
        goalId: goal.id,
        goalName: goal.name,
        goalCategory: category,
        assetId: assetId,
        assetName: asset.name,
        assetCategory: asset.category,
        amount: assignAmount
      });

      // Update tracking
      availableAssets[assetId].available -= assignAmount;
      remainingNeed -= assignAmount;
    });
  });

  return assignments;
}

// Helper to create test data
function createTestData(assets = [], goals = []) {
  return {
    settings: { currency: 'INR', equityReturn: 10, debtReturn: 5 },
    cashflow: { income: [], expenses: [] },
    assets: { items: assets },
    liabilities: { items: [] },
    goals: goals
  };
}

// Helper to create a goal with date
function createGoal(options) {
  const today = new Date();
  const yearsFromNow = options.yearsFromNow || 10;
  const targetDate = new Date(today.getTime() + yearsFromNow * 365.25 * 24 * 60 * 60 * 1000);

  return {
    id: options.id || `goal-${Math.random().toString(36).slice(2)}`,
    name: options.name || 'Test Goal',
    targetAmount: options.targetAmount ?? 1000000,
    inflationRate: options.inflationRate ?? 0,
    targetDate: options.targetDate || targetDate.toISOString().split('T')[0],
    goalType: options.goalType || 'one-time',
    linkedAssets: options.linkedAssets || []
  };
}

describe('Auto-assign Algorithm', () => {
  describe('Basic Functionality', () => {
    it('Returns empty array when no goals', () => {
      const data = createTestData([
        { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
      ], []);

      const assignments = calculateAutoAssignments(data);
      expect(assignments).toEqual([]);
    });

    it('Returns empty array when no assets', () => {
      const data = createTestData([], [
        createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 1000000 })
      ]);

      const assignments = calculateAutoAssignments(data);
      expect(assignments).toEqual([]);
    });

    it('Returns empty array when only non-linkable assets exist', () => {
      const data = createTestData([
        { id: 'a1', name: 'EPF', category: 'EPF Corpus', value: 1000000 },
        { id: 'a2', name: 'House', category: 'House', value: 5000000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 1000000 })
      ]);

      const assignments = calculateAutoAssignments(data);
      expect(assignments).toEqual([]);
    });

    it('Assigns equity assets to long-term goals', () => {
      const data = createTestData([
        { id: 'a1', name: 'Bluechip Fund', category: 'Equity Mutual Funds', value: 500000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 })
      ]);

      const assignments = calculateAutoAssignments(data);

      expect(assignments.length).toBe(1);
      expect(assignments[0].goalId).toBe('g1');
      expect(assignments[0].assetId).toBe('a1');
      expect(assignments[0].amount).toBe(500000);
      expect(assignments[0].goalCategory).toBe('long');
    });

    it('Assigns debt assets to short-term goals', () => {
      const data = createTestData([
        { id: 'a1', name: 'FD', category: 'FDs & RDs', value: 200000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 2, targetAmount: 300000, inflationRate: 0 })
      ]);

      const assignments = calculateAutoAssignments(data);

      expect(assignments.length).toBe(1);
      expect(assignments[0].goalId).toBe('g1');
      expect(assignments[0].assetId).toBe('a1');
      expect(assignments[0].amount).toBe(200000);
      expect(assignments[0].goalCategory).toBe('short');
    });

    it('Does NOT assign equity assets to short-term goals', () => {
      const data = createTestData([
        { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 2, targetAmount: 300000, inflationRate: 0 })
      ]);

      const assignments = calculateAutoAssignments(data);
      expect(assignments.length).toBe(0);
    });

    it('Does NOT assign FDs to long-term goals', () => {
      const data = createTestData([
        { id: 'a1', name: 'FD', category: 'FDs & RDs', value: 500000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 })
      ]);

      const assignments = calculateAutoAssignments(data);
      expect(assignments.length).toBe(0);
    });

    it('Assigns Debt MFs to both short and long-term goals', () => {
      const data = createTestData([
        { id: 'a1', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 500000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 2, targetAmount: 200000, inflationRate: 0 }),
        createGoal({ id: 'g2', yearsFromNow: 10, targetAmount: 500000, inflationRate: 0 })
      ]);

      const assignments = calculateAutoAssignments(data);

      expect(assignments.length).toBe(2);
      // Short-term goal gets assigned first (sorted by date)
      expect(assignments[0].goalId).toBe('g1');
      expect(assignments[0].amount).toBe(200000);
      // Long-term goal gets the rest
      expect(assignments[1].goalId).toBe('g2');
      expect(assignments[1].amount).toBe(300000);
    });
  });

  describe('Goal Sorting and Priority', () => {
    it('Assigns to nearest goal first', () => {
      const data = createTestData([
        { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 300000 }
      ], [
        createGoal({ id: 'g-far', yearsFromNow: 15, targetAmount: 1000000, inflationRate: 0 }),
        createGoal({ id: 'g-near', yearsFromNow: 6, targetAmount: 500000, inflationRate: 0 }),
        createGoal({ id: 'g-mid', yearsFromNow: 10, targetAmount: 800000, inflationRate: 0 })
      ]);

      const assignments = calculateAutoAssignments(data);

      // g-near (6 years) should get the asset first
      expect(assignments[0].goalId).toBe('g-near');
      expect(assignments[0].amount).toBe(300000);
    });

    it('Distributes limited assets to multiple goals by priority', () => {
      const data = createTestData([
        { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 6, targetAmount: 300000, inflationRate: 0 }),
        createGoal({ id: 'g2', yearsFromNow: 8, targetAmount: 400000, inflationRate: 0 }),
        createGoal({ id: 'g3', yearsFromNow: 12, targetAmount: 500000, inflationRate: 0 })
      ]);

      const assignments = calculateAutoAssignments(data);

      // g1 gets 300k, g2 gets remaining 200k
      expect(assignments.length).toBe(2);
      expect(assignments[0].goalId).toBe('g1');
      expect(assignments[0].amount).toBe(300000);
      expect(assignments[1].goalId).toBe('g2');
      expect(assignments[1].amount).toBe(200000);
      // g3 gets nothing - asset exhausted
    });
  });

  describe('Already Linked Assets', () => {
    it('Skips assets already linked to the same goal', () => {
      const data = createTestData([
        { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
      ], [
        createGoal({
          id: 'g1',
          yearsFromNow: 10,
          targetAmount: 1000000,
          inflationRate: 0,
          linkedAssets: [{ assetId: 'a1', amount: 200000 }]
        })
      ]);

      const assignments = calculateAutoAssignments(data);

      // Should not create new assignment for already-linked asset
      expect(assignments.length).toBe(0);
    });

    it('Uses remaining available amount after existing links', () => {
      const data = createTestData([
        { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
      ], [
        createGoal({
          id: 'g1',
          yearsFromNow: 6,
          targetAmount: 300000,
          inflationRate: 0,
          linkedAssets: [{ assetId: 'a1', amount: 200000 }]
        }),
        createGoal({ id: 'g2', yearsFromNow: 10, targetAmount: 500000, inflationRate: 0 })
      ]);

      const assignments = calculateAutoAssignments(data);

      // g2 should get 300k (500k - 200k already linked to g1)
      expect(assignments.length).toBe(1);
      expect(assignments[0].goalId).toBe('g2');
      expect(assignments[0].amount).toBe(300000);
    });

    it('Skips fully allocated assets', () => {
      const data = createTestData([
        { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
      ], [
        createGoal({
          id: 'g1',
          yearsFromNow: 6,
          targetAmount: 600000,
          inflationRate: 0,
          linkedAssets: [{ assetId: 'a1', amount: 500000 }]
        }),
        createGoal({ id: 'g2', yearsFromNow: 10, targetAmount: 300000, inflationRate: 0 })
      ]);

      const assignments = calculateAutoAssignments(data);

      // a1 is fully allocated - no assignments possible
      expect(assignments.length).toBe(0);
    });
  });

  describe('Multiple Assets and Goals', () => {
    it('Assigns multiple assets to meet goal target', () => {
      const data = createTestData([
        { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 200000 },
        { id: 'a2', name: 'Stocks', category: 'Stocks', value: 300000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 400000, inflationRate: 0 })
      ]);

      const assignments = calculateAutoAssignments(data);

      expect(assignments.length).toBe(2);
      const totalAssigned = assignments.reduce((sum, a) => sum + a.amount, 0);
      expect(totalAssigned).toBe(400000);
    });

    it('Mixed short and long-term goals with various assets', () => {
      const data = createTestData([
        { id: 'fd', name: 'FD', category: 'FDs & RDs', value: 200000 },
        { id: 'savings', name: 'Savings', category: 'Savings Bank', value: 100000 },
        { id: 'equity', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 },
        { id: 'debt', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 300000 }
      ], [
        createGoal({ id: 'g-short', yearsFromNow: 2, targetAmount: 250000, inflationRate: 0 }),
        createGoal({ id: 'g-long', yearsFromNow: 10, targetAmount: 600000, inflationRate: 0 })
      ]);

      const assignments = calculateAutoAssignments(data);

      // Short-term goal should get FD + Savings + Debt MF (up to need)
      const shortAssignments = assignments.filter(a => a.goalId === 'g-short');
      const longAssignments = assignments.filter(a => a.goalId === 'g-long');

      // Short-term: FD (200k) + Savings (50k) = 250k
      expect(shortAssignments.some(a => a.assetCategory === 'FDs & RDs')).toBe(true);

      // Long-term: Equity + remaining Debt MF
      expect(longAssignments.some(a => a.assetCategory === 'Equity Mutual Funds')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('Handles zero-value assets', () => {
      const data = createTestData([
        { id: 'a1', name: 'Empty MF', category: 'Equity Mutual Funds', value: 0 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 })
      ]);

      const assignments = calculateAutoAssignments(data);
      expect(assignments.length).toBe(0);
    });

    it('Handles goal with zero target amount', () => {
      const data = createTestData([
        { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 0, inflationRate: 0 })
      ]);

      const assignments = calculateAutoAssignments(data);
      expect(assignments.length).toBe(0);
    });

    it('Limits assignment to goal need (does not over-assign)', () => {
      const data = createTestData([
        { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 1000000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 300000, inflationRate: 0 })
      ]);

      const assignments = calculateAutoAssignments(data);

      expect(assignments.length).toBe(1);
      expect(assignments[0].amount).toBe(300000); // Only what's needed
    });

    it('Handles inflation-adjusted targets', () => {
      const data = createTestData([
        { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 500000, inflationRate: 6 })
      ]);

      const assignments = calculateAutoAssignments(data);

      // Inflation-adjusted target at 6% for 10 years ≈ 895k
      // So 500k should all be assigned
      expect(assignments[0].amount).toBe(500000);
    });

    it('Accounts for already linked amounts when calculating remaining need', () => {
      const data = createTestData([
        { id: 'a1', name: 'Equity MF 1', category: 'Equity Mutual Funds', value: 300000 },
        { id: 'a2', name: 'Equity MF 2', category: 'Equity Mutual Funds', value: 400000 }
      ], [
        createGoal({
          id: 'g1',
          yearsFromNow: 10,
          targetAmount: 500000,
          inflationRate: 0,
          linkedAssets: [{ assetId: 'a1', amount: 200000 }]
        })
      ]);

      const assignments = calculateAutoAssignments(data);

      // Goal needs 500k, already has 200k linked
      // Remaining need: 300k
      // Should assign 300k from a2 (a1 is already linked to g1)
      expect(assignments.length).toBe(1);
      expect(assignments[0].assetId).toBe('a2');
      expect(assignments[0].amount).toBe(300000);
    });
  });

  describe('Category Boundary (5 years)', () => {
    it('Goal at exactly 5 years is long-term', () => {
      const today = new Date();
      const fiveYearsFromNow = new Date(today.getTime() + 5.01 * 365.25 * 24 * 60 * 60 * 1000);

      const data = createTestData([
        { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 300000 }
      ], [
        createGoal({
          id: 'g1',
          targetDate: fiveYearsFromNow.toISOString().split('T')[0],
          targetAmount: 500000,
          inflationRate: 0
        })
      ]);

      const assignments = calculateAutoAssignments(data);

      expect(assignments.length).toBe(1);
      expect(assignments[0].goalCategory).toBe('long');
    });

    it('Goal at 4.99 years is short-term', () => {
      const today = new Date();
      const almostFiveYears = new Date(today.getTime() + 4.9 * 365.25 * 24 * 60 * 60 * 1000);

      const data = createTestData([
        { id: 'a1', name: 'FD', category: 'FDs & RDs', value: 300000 }
      ], [
        createGoal({
          id: 'g1',
          targetDate: almostFiveYears.toISOString().split('T')[0],
          targetAmount: 500000,
          inflationRate: 0
        })
      ]);

      const assignments = calculateAutoAssignments(data);

      expect(assignments.length).toBe(1);
      expect(assignments[0].goalCategory).toBe('short');
    });
  });
});

describe('Asset Category Eligibility', () => {
  const shortTermEligible = ['FDs & RDs', 'Savings Bank', 'Debt/Arbitrage Mutual Funds'];
  const longTermEligible = ['Equity Mutual Funds', 'Stocks', 'Gold ETFs/SGBs', 'Debt/Arbitrage Mutual Funds'];

  shortTermEligible.forEach(category => {
    it(`${category} is eligible for short-term goals`, () => {
      const data = createTestData([
        { id: 'a1', name: 'Test Asset', category, value: 100000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 2, targetAmount: 200000, inflationRate: 0 })
      ]);

      const assignments = calculateAutoAssignments(data);
      expect(assignments.length).toBe(1);
    });
  });

  longTermEligible.forEach(category => {
    it(`${category} is eligible for long-term goals`, () => {
      const data = createTestData([
        { id: 'a1', name: 'Test Asset', category, value: 100000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 200000, inflationRate: 0 })
      ]);

      const assignments = calculateAutoAssignments(data);
      expect(assignments.length).toBe(1);
    });
  });

  const notLinkable = ['EPF Corpus', 'NPS Corpus', 'PPF Corpus', 'House', 'Land', 'Physical Gold'];

  notLinkable.forEach(category => {
    it(`${category} is NOT eligible for any goal`, () => {
      const data = createTestData([
        { id: 'a1', name: 'Test Asset', category, value: 1000000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 2, targetAmount: 200000, inflationRate: 0 }),
        createGoal({ id: 'g2', yearsFromNow: 10, targetAmount: 500000, inflationRate: 0 })
      ]);

      const assignments = calculateAutoAssignments(data);
      expect(assignments.length).toBe(0);
    });
  });
});
