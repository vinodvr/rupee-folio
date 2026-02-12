// Unit tests for autoassign.js (Vitest)
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { autoAssignAssets } from '../modules/autoassign.js';
import { createGoal, createTestData } from './helpers.js';

// Clear localStorage before each test (saveData writes to it)
beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('autoAssignAssets - Basic', () => {
  it('Returns data unchanged when no assets', () => {
    const data = createTestData([], [
      createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 1000000 })
    ]);

    autoAssignAssets(data);

    expect(data.goals[0].linkedAssets).toEqual([]);
  });

  it('Returns data unchanged when no goals', () => {
    const data = createTestData([
      { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ], []);

    autoAssignAssets(data);

    expect(data.goals).toEqual([]);
  });

  it('Handles null/undefined data gracefully', () => {
    expect(autoAssignAssets(null)).toBe(null);
    expect(autoAssignAssets(undefined)).toBe(undefined);
    expect(autoAssignAssets({})).toEqual({});
  });

  it('Ignores NOT_LINKABLE assets', () => {
    const data = createTestData([
      { id: 'a1', name: 'EPF', category: 'EPF Corpus', value: 1000000 },
      { id: 'a2', name: 'House', category: 'House', value: 5000000 },
      { id: 'a3', name: 'PPF', category: 'PPF Corpus', value: 300000 },
      { id: 'a4', name: 'NPS', category: 'NPS Corpus', value: 400000 },
      { id: 'a5', name: 'Gold', category: 'Physical Gold', value: 200000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 }),
      createGoal({ id: 'g2', yearsFromNow: 3, targetAmount: 500000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    expect(data.goals[0].linkedAssets).toEqual([]);
    expect(data.goals[1].linkedAssets).toEqual([]);
  });

  it('Ignores zero-value assets', () => {
    const data = createTestData([
      { id: 'a1', name: 'Empty MF', category: 'Equity Mutual Funds', value: 0 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    expect(data.goals[0].linkedAssets).toEqual([]);
  });

  it('Ignores goals with zero target amount', () => {
    const data = createTestData([
      { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 0, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    expect(data.goals[0].linkedAssets).toEqual([]);
  });
});

describe('autoAssignAssets - Single Goal', () => {
  it('Assigns FD to single short-term goal (full allocation)', () => {
    const data = createTestData([
      { id: 'a1', name: 'FD', category: 'FDs & RDs', value: 200000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 3, targetAmount: 500000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    expect(data.goals[0].linkedAssets.length).toBe(1);
    expect(data.goals[0].linkedAssets[0].assetId).toBe('a1');
    expect(data.goals[0].linkedAssets[0].amount).toBe(200000);
  });

  it('Assigns Equity MF to single long-term goal (full allocation)', () => {
    const data = createTestData([
      { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 300000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    expect(data.goals[0].linkedAssets.length).toBe(1);
    expect(data.goals[0].linkedAssets[0].assetId).toBe('a1');
    expect(data.goals[0].linkedAssets[0].amount).toBe(300000);
  });

  it('Does NOT assign equity assets to short-term goals', () => {
    const data = createTestData([
      { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 3, targetAmount: 300000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    expect(data.goals[0].linkedAssets).toEqual([]);
  });

  it('Does NOT assign FDs to long-term goals', () => {
    const data = createTestData([
      { id: 'a1', name: 'FD', category: 'FDs & RDs', value: 500000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    expect(data.goals[0].linkedAssets).toEqual([]);
  });

  it('Assigns Debt/Arbitrage MF to short-term goal', () => {
    const data = createTestData([
      { id: 'a1', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 200000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 3, targetAmount: 500000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    expect(data.goals[0].linkedAssets.length).toBe(1);
    expect(data.goals[0].linkedAssets[0].assetId).toBe('a1');
    expect(data.goals[0].linkedAssets[0].amount).toBe(200000);
  });

  it('Assigns Debt/Arbitrage MF to long-term goal', () => {
    const data = createTestData([
      { id: 'a1', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 200000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    expect(data.goals[0].linkedAssets.length).toBe(1);
    expect(data.goals[0].linkedAssets[0].assetId).toBe('a1');
  });
});

describe('autoAssignAssets - Greedy: Closest Goal First', () => {
  it('Closer goal gets served first when assets are scarce', () => {
    // FD = 300k, Goal 2yr needs 10M, Goal 4yr needs 10M
    // Closest goal (2yr) gets all 300k, further goal gets nothing
    const data = createTestData([
      { id: 'a1', name: 'FD', category: 'FDs & RDs', value: 300000 }
    ], [
      createGoal({ id: 'g-2yr', yearsFromNow: 2, targetAmount: 10000000, inflationRate: 0 }),
      createGoal({ id: 'g-4yr', yearsFromNow: 4, targetAmount: 10000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const g2yr = data.goals.find(g => g.id === 'g-2yr');
    const g4yr = data.goals.find(g => g.id === 'g-4yr');

    expect(g2yr.linkedAssets.length).toBe(1);
    expect(g2yr.linkedAssets[0].amount).toBe(300000);
    expect(g4yr.linkedAssets.length).toBe(0);
  });

  it('Closer goal is fully covered before further goal gets assets', () => {
    // FD = 500k, Goal 2yr needs 200k, Goal 4yr needs 10M
    // Goal 2yr gets 200k (fully covered), Goal 4yr gets remaining 300k
    const data = createTestData([
      { id: 'a1', name: 'FD', category: 'FDs & RDs', value: 500000 }
    ], [
      createGoal({ id: 'g-2yr', yearsFromNow: 2, targetAmount: 200000, inflationRate: 0 }),
      createGoal({ id: 'g-4yr', yearsFromNow: 4, targetAmount: 10000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const g2yr = data.goals.find(g => g.id === 'g-2yr');
    const g4yr = data.goals.find(g => g.id === 'g-4yr');

    expect(g2yr.linkedAssets[0].amount).toBeCloseTo(200000, -2);
    expect(g4yr.linkedAssets[0].amount).toBeCloseTo(300000, -2);
  });

  it('Multiple long-term goals: closest gets served first', () => {
    // Equity MF = 600k, Goal 5yr needs 400k, Goal 10yr needs 10M
    // Goal 5yr gets 400k, Goal 10yr gets remaining 200k
    const data = createTestData([
      { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 600000 }
    ], [
      createGoal({ id: 'g-5yr', yearsFromNow: 5.1, targetAmount: 400000, inflationRate: 0 }),
      createGoal({ id: 'g-10yr', yearsFromNow: 10, targetAmount: 10000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const g5yr = data.goals.find(g => g.id === 'g-5yr');
    const g10yr = data.goals.find(g => g.id === 'g-10yr');

    expect(g5yr.linkedAssets[0].amount).toBeCloseTo(400000, -2);
    expect(g10yr.linkedAssets[0].amount).toBeCloseTo(200000, -2);
  });
});

describe('autoAssignAssets - Greedy: Fewest Assets Per Goal', () => {
  it('Uses single large asset to cover a goal instead of spreading many', () => {
    // Goal needs 200k. Available: FD 300k, Savings 100k
    // Should use just the FD (1 asset), not both
    const data = createTestData([
      { id: 'fd', name: 'FD', category: 'FDs & RDs', value: 300000 },
      { id: 'savings', name: 'Savings', category: 'Savings Bank', value: 100000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 3, targetAmount: 200000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const g1 = data.goals.find(g => g.id === 'g1');
    // Only 1 asset linked (the larger FD)
    expect(g1.linkedAssets.length).toBe(1);
    expect(g1.linkedAssets[0].assetId).toBe('fd');
    expect(g1.linkedAssets[0].amount).toBeCloseTo(200000, -2);
  });

  it('Uses two assets only when largest is insufficient', () => {
    // Goal needs 350k. Available: FD 300k, Savings 100k
    // FD covers 300k, then Savings covers remaining 50k = 2 assets
    const data = createTestData([
      { id: 'fd', name: 'FD', category: 'FDs & RDs', value: 300000 },
      { id: 'savings', name: 'Savings', category: 'Savings Bank', value: 100000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 3, targetAmount: 350000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const g1 = data.goals.find(g => g.id === 'g1');
    expect(g1.linkedAssets.length).toBe(2);
    expect(g1.linkedAssets.find(la => la.assetId === 'fd').amount).toBe(300000);
    expect(g1.linkedAssets.find(la => la.assetId === 'savings').amount).toBe(50000);
  });

  it('Leftover from first goal flows to second goal', () => {
    // Goal A (2yr, 200k), Goal B (4yr, 300k)
    // Assets: FD 300k, Savings 100k, Debt MF 200k
    // Pass 1 (SHORT_TERM_ONLY): Goal A uses FD (200k), Goal B uses FD (100k) + Savings (100k)
    // Pass 2 (BOTH_TERMS): Goal B still needs 100k, gets Debt MF (100k)
    const data = createTestData([
      { id: 'fd', name: 'FD', category: 'FDs & RDs', value: 300000 },
      { id: 'savings', name: 'Savings', category: 'Savings Bank', value: 100000 },
      { id: 'debt', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 200000 }
    ], [
      createGoal({ id: 'g-a', yearsFromNow: 2, targetAmount: 200000, inflationRate: 0 }),
      createGoal({ id: 'g-b', yearsFromNow: 4, targetAmount: 300000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const gA = data.goals.find(g => g.id === 'g-a');
    const gB = data.goals.find(g => g.id === 'g-b');

    // Goal A should use just 1 asset (largest first = FD)
    expect(gA.linkedAssets.length).toBe(1);
    expect(gA.linkedAssets[0].assetId).toBe('fd');
    expect(gA.linkedAssets[0].amount).toBeCloseTo(200000, -2);

    // Goal B uses remaining assets
    const gBTotal = gB.linkedAssets.reduce((s, la) => s + la.amount, 0);
    expect(gBTotal).toBeCloseTo(300000, -2);
  });
});

describe('autoAssignAssets - Goal Capping', () => {
  it('Caps allocation at inflation-adjusted target', () => {
    // Goal target = 100k (no inflation), Asset = 300k
    // Should only assign 100k, not 300k
    const data = createTestData([
      { id: 'a1', name: 'FD', category: 'FDs & RDs', value: 300000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 2, targetAmount: 100000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    expect(data.goals[0].linkedAssets[0].amount).toBeCloseTo(100000, -2);
  });

  it('Does not over-assign when asset exceeds all goals combined', () => {
    const data = createTestData([
      { id: 'a1', name: 'FD', category: 'FDs & RDs', value: 1000000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 2, targetAmount: 100000, inflationRate: 0 }),
      createGoal({ id: 'g2', yearsFromNow: 4, targetAmount: 200000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const g1 = data.goals.find(g => g.id === 'g1');
    const g2 = data.goals.find(g => g.id === 'g2');

    const totalAllocated = (g1.linkedAssets[0]?.amount || 0) + (g2.linkedAssets[0]?.amount || 0);

    // Should not exceed 300k total (100k + 200k)
    expect(totalAllocated).toBeCloseTo(300000, -2);
    expect(g1.linkedAssets[0].amount).toBeCloseTo(100000, -2);
    expect(g2.linkedAssets[0].amount).toBeCloseTo(200000, -2);
  });
});

describe('autoAssignAssets - Exclusive-First Priority', () => {
  it('Short-term: uses SHORT_TERM_ONLY before BOTH_TERMS even when BOTH_TERMS is larger', () => {
    // Debt MF 500k (BOTH_TERMS) vs Savings 100k (SHORT_TERM_ONLY)
    // Goal needs 150k — should use Savings (100k) first, then Debt MF (50k)
    // This preserves 450k of Debt MF for potential long-term goals
    const data = createTestData([
      { id: 'debt', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 500000 },
      { id: 'savings', name: 'Savings', category: 'Savings Bank', value: 100000 }
    ], [
      createGoal({ id: 'g-short', yearsFromNow: 3, targetAmount: 150000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const g = data.goals[0];
    // Savings should be fully used
    expect(g.linkedAssets.find(la => la.assetId === 'savings').amount).toBe(100000);
    // Debt MF should only fill the remaining 50k gap
    expect(g.linkedAssets.find(la => la.assetId === 'debt').amount).toBe(50000);
  });

  it('Short-term: BOTH_TERMS preserved for long-term when SHORT_TERM_ONLY suffices', () => {
    // FD 300k covers short-term goal (200k). Debt MF 400k should be fully available for long-term.
    const data = createTestData([
      { id: 'fd', name: 'FD', category: 'FDs & RDs', value: 300000 },
      { id: 'debt', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 400000 }
    ], [
      createGoal({ id: 'g-short', yearsFromNow: 3, targetAmount: 200000, inflationRate: 0 }),
      createGoal({ id: 'g-long', yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const gShort = data.goals.find(g => g.id === 'g-short');
    const gLong = data.goals.find(g => g.id === 'g-long');

    // Short-term uses only FD
    expect(gShort.linkedAssets.length).toBe(1);
    expect(gShort.linkedAssets[0].assetId).toBe('fd');
    expect(gShort.linkedAssets[0].amount).toBeCloseTo(200000, -2);

    // Long-term gets full Debt MF (preserved from short-term)
    expect(gLong.linkedAssets.find(la => la.assetId === 'debt').amount).toBeCloseTo(400000, -2);
  });

  it('Long-term: uses LONG_TERM_ONLY before BOTH_TERMS even when BOTH_TERMS is larger', () => {
    // Debt MF 800k (BOTH_TERMS) vs Equity MF 200k (LONG_TERM_ONLY)
    // Long-term goal needs 300k — should use Equity MF (200k) first, then Debt MF (100k)
    const data = createTestData([
      { id: 'debt', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 800000 },
      { id: 'equity', name: 'Equity MF', category: 'Equity Mutual Funds', value: 200000 }
    ], [
      createGoal({ id: 'g-long', yearsFromNow: 10, targetAmount: 300000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const g = data.goals[0];
    // Equity MF should be fully used
    expect(g.linkedAssets.find(la => la.assetId === 'equity').amount).toBe(200000);
    // Debt MF should only fill the remaining 100k gap
    expect(g.linkedAssets.find(la => la.assetId === 'debt').amount).toBe(100000);
  });

  it('No SHORT_TERM_ONLY assets stranded when BOTH_TERMS is larger', () => {
    // Key scenario: Debt MF 500k is bigger than Savings 100k + FD 200k
    // All short-term-only assets should be used before touching Debt MF
    const data = createTestData([
      { id: 'debt', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 500000 },
      { id: 'savings', name: 'Savings', category: 'Savings Bank', value: 100000 },
      { id: 'fd', name: 'FD', category: 'FDs & RDs', value: 200000 }
    ], [
      createGoal({ id: 'g-short', yearsFromNow: 3, targetAmount: 10000000, inflationRate: 0 }),
      createGoal({ id: 'g-long', yearsFromNow: 10, targetAmount: 10000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const gShort = data.goals.find(g => g.id === 'g-short');

    // All short-term-only assets should be assigned
    expect(gShort.linkedAssets.find(la => la.assetId === 'savings').amount).toBe(100000);
    expect(gShort.linkedAssets.find(la => la.assetId === 'fd').amount).toBe(200000);
    expect(gShort.linkedAssets.find(la => la.assetId === 'debt').amount).toBe(500000);
  });
});

describe('autoAssignAssets - BOTH_TERMS Priority', () => {
  it('Debt/Arbitrage MF: short-term goals first, overflow to long-term', () => {
    const data = createTestData([
      { id: 'a1', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 500000 }
    ], [
      createGoal({ id: 'g-short', yearsFromNow: 3, targetAmount: 200000, inflationRate: 0 }),
      createGoal({ id: 'g-long', yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const gShort = data.goals.find(g => g.id === 'g-short');
    const gLong = data.goals.find(g => g.id === 'g-long');

    // Short-term goal gets 200k (capped at target)
    expect(gShort.linkedAssets[0].amount).toBeCloseTo(200000, -2);
    // Long-term goal gets remaining 300k
    expect(gLong.linkedAssets[0].amount).toBeCloseTo(300000, -2);
  });

  it('Debt/Arbitrage MF: all goes to short-term if it needs it all', () => {
    const data = createTestData([
      { id: 'a1', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 300000 }
    ], [
      createGoal({ id: 'g-short', yearsFromNow: 3, targetAmount: 500000, inflationRate: 0 }),
      createGoal({ id: 'g-long', yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const gShort = data.goals.find(g => g.id === 'g-short');
    const gLong = data.goals.find(g => g.id === 'g-long');

    // Short-term goal gets all 300k
    expect(gShort.linkedAssets[0].amount).toBeCloseTo(300000, -2);
    // Long-term goal gets nothing from this asset
    expect(gLong.linkedAssets.length).toBe(0);
  });
});

describe('autoAssignAssets - Mixed Scenarios', () => {
  it('Mixed short+long goals with mixed assets', () => {
    const data = createTestData([
      { id: 'fd', name: 'FD', category: 'FDs & RDs', value: 200000 },
      { id: 'savings', name: 'Savings', category: 'Savings Bank', value: 100000 },
      { id: 'equity', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 },
      { id: 'debt', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 300000 }
    ], [
      createGoal({ id: 'g-short', yearsFromNow: 3, targetAmount: 10000000, inflationRate: 0 }),
      createGoal({ id: 'g-long', yearsFromNow: 10, targetAmount: 10000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const gShort = data.goals.find(g => g.id === 'g-short');
    const gLong = data.goals.find(g => g.id === 'g-long');

    // Short-term: FD (200k) + Savings (100k) + Debt MF (300k) = 600k
    const shortTotal = gShort.linkedAssets.reduce((s, la) => s + la.amount, 0);
    expect(gShort.linkedAssets.some(la => la.assetId === 'fd')).toBe(true);
    expect(gShort.linkedAssets.some(la => la.assetId === 'savings')).toBe(true);
    expect(gShort.linkedAssets.some(la => la.assetId === 'debt')).toBe(true);

    // Long-term: Equity MF (500k) + any remaining Debt MF
    const longTotal = gLong.linkedAssets.reduce((s, la) => s + la.amount, 0);
    expect(gLong.linkedAssets.some(la => la.assetId === 'equity')).toBe(true);

    // Total allocated = short + long should equal total assets (1.1M)
    expect(shortTotal + longTotal).toBeCloseTo(1100000, -2);
  });

  it('Multiple assets: larger assets used first to minimize links', () => {
    // 3 equity MFs: 500k, 300k, 200k
    // Goal at 6yr needs 600k → should use 500k + 100k from 300k = 2 assets
    // Goal at 12yr needs 10M → should use remaining 200k from 300k + 200k = 2 assets
    const data = createTestData([
      { id: 'eq1', name: 'Equity MF 1', category: 'Equity Mutual Funds', value: 500000 },
      { id: 'eq2', name: 'Equity MF 2', category: 'Equity Mutual Funds', value: 300000 },
      { id: 'eq3', name: 'Equity MF 3', category: 'Equity Mutual Funds', value: 200000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 6, targetAmount: 600000, inflationRate: 0 }),
      createGoal({ id: 'g2', yearsFromNow: 12, targetAmount: 10000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const g1 = data.goals.find(g => g.id === 'g1');
    const g2 = data.goals.find(g => g.id === 'g2');

    // g1 should use eq1 (500k) + 100k from eq2 = 2 assets, 600k total
    expect(g1.linkedAssets.length).toBe(2);
    const g1Total = g1.linkedAssets.reduce((s, la) => s + la.amount, 0);
    expect(g1Total).toBeCloseTo(600000, -2);

    // g2 gets remaining: eq2 (200k) + eq3 (200k) = 400k
    const g2Total = g2.linkedAssets.reduce((s, la) => s + la.amount, 0);
    expect(g2Total).toBeCloseTo(400000, -2);

    // Total
    expect(g1Total + g2Total).toBeCloseTo(1000000, -2);
  });

  it('Stocks assigned to long-term goals only', () => {
    const data = createTestData([
      { id: 'a1', name: 'TCS Stocks', category: 'Stocks', value: 400000 }
    ], [
      createGoal({ id: 'g-short', yearsFromNow: 3, targetAmount: 500000, inflationRate: 0 }),
      createGoal({ id: 'g-long', yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const gShort = data.goals.find(g => g.id === 'g-short');
    const gLong = data.goals.find(g => g.id === 'g-long');

    expect(gShort.linkedAssets.length).toBe(0);
    expect(gLong.linkedAssets.length).toBe(1);
    expect(gLong.linkedAssets[0].amount).toBe(400000);
  });

  it('Gold ETFs/SGBs assigned to long-term goals only', () => {
    const data = createTestData([
      { id: 'a1', name: 'Gold ETF', category: 'Gold ETFs/SGBs', value: 200000 }
    ], [
      createGoal({ id: 'g-short', yearsFromNow: 3, targetAmount: 500000, inflationRate: 0 }),
      createGoal({ id: 'g-long', yearsFromNow: 8, targetAmount: 1000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const gShort = data.goals.find(g => g.id === 'g-short');
    const gLong = data.goals.find(g => g.id === 'g-long');

    expect(gShort.linkedAssets.length).toBe(0);
    expect(gLong.linkedAssets.length).toBe(1);
  });

  it('Savings Bank assigned to short-term goals only', () => {
    const data = createTestData([
      { id: 'a1', name: 'HDFC Savings', category: 'Savings Bank', value: 100000 }
    ], [
      createGoal({ id: 'g-short', yearsFromNow: 2, targetAmount: 500000, inflationRate: 0 }),
      createGoal({ id: 'g-long', yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const gShort = data.goals.find(g => g.id === 'g-short');
    const gLong = data.goals.find(g => g.id === 'g-long');

    expect(gShort.linkedAssets.length).toBe(1);
    expect(gLong.linkedAssets.length).toBe(0);
  });
});

describe('autoAssignAssets - Idempotency', () => {
  it('Re-running produces the same result', () => {
    const data = createTestData([
      { id: 'fd', name: 'FD', category: 'FDs & RDs', value: 200000 },
      { id: 'equity', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 },
      { id: 'debt', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 300000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 3, targetAmount: 10000000, inflationRate: 0 }),
      createGoal({ id: 'g2', yearsFromNow: 10, targetAmount: 10000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);
    const firstRun = JSON.parse(JSON.stringify(data.goals.map(g => g.linkedAssets)));

    autoAssignAssets(data);
    const secondRun = data.goals.map(g => g.linkedAssets);

    // Compare each goal's linkedAssets
    for (let i = 0; i < firstRun.length; i++) {
      expect(secondRun[i].length).toBe(firstRun[i].length);
      for (let j = 0; j < firstRun[i].length; j++) {
        expect(secondRun[i][j].assetId).toBe(firstRun[i][j].assetId);
        expect(secondRun[i][j].amount).toBeCloseTo(firstRun[i][j].amount, -2);
      }
    }
  });

  it('Clears previous manual assignments', () => {
    const data = createTestData([
      { id: 'a1', name: 'FD', category: 'FDs & RDs', value: 200000 }
    ], [
      createGoal({
        id: 'g1',
        yearsFromNow: 3,
        targetAmount: 500000,
        inflationRate: 0,
        linkedAssets: [{ assetId: 'fake-asset', amount: 999999 }]
      })
    ]);

    autoAssignAssets(data);

    // Old manual link should be gone
    expect(data.goals[0].linkedAssets.some(la => la.assetId === 'fake-asset')).toBe(false);
    // New auto-assigned link should exist
    expect(data.goals[0].linkedAssets.some(la => la.assetId === 'a1')).toBe(true);
  });
});

describe('autoAssignAssets - Inflation Adjustment', () => {
  it('Uses inflation-adjusted target for capping', () => {
    // Goal: 100k target, 6% inflation, 10 years
    // Inflation-adjusted = 100000 * (1.06^10) ≈ 179,085
    // Asset: 200k equity MF
    // Should cap at ~179k
    const data = createTestData([
      { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 200000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 100000, inflationRate: 6 })
    ]);

    autoAssignAssets(data);

    const linked = data.goals[0].linkedAssets[0]?.amount || 0;
    // Should be close to 179,085 (inflation-adjusted target)
    expect(linked).toBeGreaterThan(170000);
    expect(linked).toBeLessThan(190000);
    // Should NOT be 200k (full asset value)
    expect(linked).toBeLessThan(200000);
  });
});

describe('autoAssignAssets - Edge Cases', () => {
  it('Handles goal with past target date', () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    const data = createTestData([
      { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ], [
      createGoal({
        id: 'g1',
        targetDate: pastDate.toISOString().split('T')[0],
        targetAmount: 1000000,
        inflationRate: 0
      })
    ]);

    autoAssignAssets(data);

    // Past goals should get no allocation
    expect(data.goals[0].linkedAssets).toEqual([]);
  });

  it('All categories in SHORT_TERM_ONLY are assigned to short-term', () => {
    const categories = ['FDs & RDs', 'Savings Bank'];
    categories.forEach(category => {
      const data = createTestData([
        { id: 'a1', name: 'Test', category, value: 100000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 3, targetAmount: 500000, inflationRate: 0 })
      ]);

      autoAssignAssets(data);
      expect(data.goals[0].linkedAssets.length).toBe(1);
    });
  });

  it('All categories in LONG_TERM_ONLY are assigned to long-term', () => {
    const categories = ['Equity Mutual Funds', 'Stocks', 'Gold ETFs/SGBs'];
    categories.forEach(category => {
      const data = createTestData([
        { id: 'a1', name: 'Test', category, value: 100000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 500000, inflationRate: 0 })
      ]);

      autoAssignAssets(data);
      expect(data.goals[0].linkedAssets.length).toBe(1);
    });
  });

  it('SHORT_TERM_ONLY categories are NOT assigned to long-term', () => {
    const categories = ['FDs & RDs', 'Savings Bank'];
    categories.forEach(category => {
      const data = createTestData([
        { id: 'a1', name: 'Test', category, value: 100000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 500000, inflationRate: 0 })
      ]);

      autoAssignAssets(data);
      expect(data.goals[0].linkedAssets.length).toBe(0);
    });
  });

  it('LONG_TERM_ONLY categories are NOT assigned to short-term', () => {
    const categories = ['Equity Mutual Funds', 'Stocks', 'Gold ETFs/SGBs'];
    categories.forEach(category => {
      const data = createTestData([
        { id: 'a1', name: 'Test', category, value: 100000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 3, targetAmount: 500000, inflationRate: 0 })
      ]);

      autoAssignAssets(data);
      expect(data.goals[0].linkedAssets.length).toBe(0);
    });
  });
});
