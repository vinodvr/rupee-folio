// Unit tests for autoassign.js (Vitest)
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { autoAssignAssets } from '../modules/autoassign.js';
import { calculateLumpsumFV, getReturnForCategory, getYearsRemaining } from '../modules/calculator.js';
import { createGoal, createTestData } from './helpers.js';

// Helper: compute total FV of a goal's linked assets using the same years the algorithm sees
function linkedFV(goal, assets, equityReturn = 10, debtReturn = 5) {
  const years = getYearsRemaining(goal.targetDate);
  return (goal.linkedAssets || []).reduce((total, la) => {
    const asset = assets.find(a => a.id === la.assetId);
    if (!asset) return total;
    const rate = getReturnForCategory(asset.category, equityReturn, debtReturn);
    return total + calculateLumpsumFV(la.amount, rate, years);
  }, 0);
}

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
  it('Assigns FD to single short-term goal (full allocation when FV < target)', () => {
    const data = createTestData([
      { id: 'a1', name: 'FD', category: 'FDs & RDs', value: 200000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 3, targetAmount: 500000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    // FD 200k at 5% for 3yr = 231k FV, which is < 500k target, so full asset is assigned
    expect(data.goals[0].linkedAssets.length).toBe(1);
    expect(data.goals[0].linkedAssets[0].assetId).toBe('a1');
    expect(data.goals[0].linkedAssets[0].amount).toBe(200000);
  });

  it('Assigns Equity MF to single long-term goal (full allocation when FV < target)', () => {
    const data = createTestData([
      { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 300000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    // Equity 300k at 10% for 10yr = 778k FV, which is < 1M target, so full asset assigned
    expect(data.goals[0].linkedAssets.length).toBe(1);
    expect(data.goals[0].linkedAssets[0].assetId).toBe('a1');
    expect(data.goals[0].linkedAssets[0].amount).toBe(300000);
  });

  it('Spills equity assets to short-term goals when no long-term goals need them', () => {
    const data = createTestData([
      { id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 500000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 3, targetAmount: 300000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    // Spillover: equity has no long-term goal, so it helps the short-term goal
    expect(data.goals[0].linkedAssets.length).toBe(1);
    expect(data.goals[0].linkedAssets[0].assetId).toBe('a1');
    expect(linkedFV(data.goals[0], data.assets.items)).toBeCloseTo(300000, -2);
  });

  it('Spills FDs to long-term goals when no short-term goals need them', () => {
    const data = createTestData([
      { id: 'a1', name: 'FD', category: 'FDs & RDs', value: 500000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    // Spillover: FD has no short-term goal, so it helps the long-term goal
    expect(data.goals[0].linkedAssets.length).toBe(1);
    expect(data.goals[0].linkedAssets[0].assetId).toBe('a1');
    expect(data.goals[0].linkedAssets[0].amount).toBe(500000);
  });

  it('Assigns Debt/Arbitrage MF to short-term goal (full allocation when FV < target)', () => {
    const data = createTestData([
      { id: 'a1', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 200000 }
    ], [
      createGoal({ id: 'g1', yearsFromNow: 3, targetAmount: 500000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    // Debt MF 200k at 5% for 3yr = 231k FV < 500k, full allocation
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
    // FD FV at 5% for 2yr = 330k << 10M, so full 300k goes to closest goal
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
    // FD = 500k, Goal 2yr target=200k, Goal 4yr target=10M
    // FV-aware: only assign PV that grows to 200k at 5% over 2yr
    const assets = [{ id: 'a1', name: 'FD', category: 'FDs & RDs', value: 500000 }];
    const data = createTestData(assets, [
      createGoal({ id: 'g-2yr', yearsFromNow: 2, targetAmount: 200000, inflationRate: 0 }),
      createGoal({ id: 'g-4yr', yearsFromNow: 4, targetAmount: 10000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const g2yr = data.goals.find(g => g.id === 'g-2yr');
    const g4yr = data.goals.find(g => g.id === 'g-4yr');

    // Goal 2yr: FV of assigned amount should equal target
    const g2yrFV = linkedFV(g2yr, assets);
    expect(g2yrFV).toBeCloseTo(200000, -2);
    // Goal 2yr gets less current value than 200k (growth handles the rest)
    expect(g2yr.linkedAssets[0].amount).toBeLessThan(200000);
    // Goal 4yr gets the remainder
    expect(g4yr.linkedAssets[0].amount).toBeGreaterThan(300000);
  });

  it('Multiple long-term goals: closest gets served first', () => {
    // Equity MF = 600k, Goal 5yr needs 400k, Goal 10yr needs 10M
    const assets = [{ id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 600000 }];
    const data = createTestData(assets, [
      createGoal({ id: 'g-5yr', yearsFromNow: 5.1, targetAmount: 400000, inflationRate: 0 }),
      createGoal({ id: 'g-10yr', yearsFromNow: 10, targetAmount: 10000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const g5yr = data.goals.find(g => g.id === 'g-5yr');
    const g10yr = data.goals.find(g => g.id === 'g-10yr');

    // Goal 5yr: FV of assigned should cover the target
    const g5yrFV = linkedFV(g5yr, assets);
    expect(g5yrFV).toBeCloseTo(400000, -2);
    // Less current value assigned since equity grows at 10%
    expect(g5yr.linkedAssets[0].amount).toBeLessThan(400000);
    // Goal 10yr gets the rest
    expect(g10yr.linkedAssets[0].amount).toBeGreaterThan(300000);
  });
});

describe('autoAssignAssets - Greedy: Fewest Assets Per Goal', () => {
  it('Uses single large asset to cover a goal instead of spreading many', () => {
    // Goal needs 200k. Available: FD 300k, Savings 100k
    // FD at 5% for 3yr: 300k grows to 347k. PV for 200k = ~173k.
    // Since FD alone can cover it, only FD is used (1 asset)
    const assets = [
      { id: 'fd', name: 'FD', category: 'FDs & RDs', value: 300000 },
      { id: 'savings', name: 'Savings', category: 'Savings Bank', value: 100000 }
    ];
    const data = createTestData(assets, [
      createGoal({ id: 'g1', yearsFromNow: 3, targetAmount: 200000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const g1 = data.goals.find(g => g.id === 'g1');
    // Only 1 asset linked (the larger FD)
    expect(g1.linkedAssets.length).toBe(1);
    expect(g1.linkedAssets[0].assetId).toBe('fd');
    // FV of assigned should equal target
    const fv = linkedFV(g1, assets);
    expect(fv).toBeCloseTo(200000, -2);
  });

  it('Uses two assets only when largest is insufficient', () => {
    // Goal needs 350k. FD 300k at 5%/3yr → FV 347k < 350k.
    // So FD is fully used (300k), then Savings fills remaining gap
    const assets = [
      { id: 'fd', name: 'FD', category: 'FDs & RDs', value: 300000 },
      { id: 'savings', name: 'Savings', category: 'Savings Bank', value: 100000 }
    ];
    const data = createTestData(assets, [
      createGoal({ id: 'g1', yearsFromNow: 3, targetAmount: 350000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const g1 = data.goals.find(g => g.id === 'g1');
    expect(g1.linkedAssets.length).toBe(2);
    // FD fully used since its FV (347k) < target (350k)
    expect(g1.linkedAssets.find(la => la.assetId === 'fd').amount).toBe(300000);
    // Savings fills small remaining gap
    const savingsAmount = g1.linkedAssets.find(la => la.assetId === 'savings').amount;
    expect(savingsAmount).toBeGreaterThan(0);
    expect(savingsAmount).toBeLessThan(10000); // Only ~2.6k needed in PV
    // Total FV should match target
    const fv = linkedFV(g1, assets);
    expect(fv).toBeCloseTo(350000, -2);
  });

  it('Leftover from first goal flows to second goal', () => {
    // Goal A (2yr, 200k), Goal B (4yr, 300k)
    // Assets: FD 300k, Savings 100k, Debt MF 200k
    const assets = [
      { id: 'fd', name: 'FD', category: 'FDs & RDs', value: 300000 },
      { id: 'savings', name: 'Savings', category: 'Savings Bank', value: 100000 },
      { id: 'debt', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 200000 }
    ];
    const data = createTestData(assets, [
      createGoal({ id: 'g-a', yearsFromNow: 2, targetAmount: 200000, inflationRate: 0 }),
      createGoal({ id: 'g-b', yearsFromNow: 4, targetAmount: 300000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const gA = data.goals.find(g => g.id === 'g-a');
    const gB = data.goals.find(g => g.id === 'g-b');

    // Goal A: FV of assigned should match target
    const fvA = linkedFV(gA, assets);
    expect(fvA).toBeCloseTo(200000, -2);

    // Goal B: FV of assigned should match target
    const fvB = linkedFV(gB, assets);
    expect(fvB).toBeCloseTo(300000, -2);
  });
});

describe('autoAssignAssets - Goal Capping', () => {
  it('Caps allocation so FV matches inflation-adjusted target', () => {
    // Goal target = 100k (no inflation), Asset = 300k FD
    // FD at 5%/2yr: 300k → 330k FV. But goal only needs 100k.
    // Should assign PV = 100k / 1.1025 ≈ 90.7k
    const assets = [{ id: 'a1', name: 'FD', category: 'FDs & RDs', value: 300000 }];
    const data = createTestData(assets, [
      createGoal({ id: 'g1', yearsFromNow: 2, targetAmount: 100000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const assigned = data.goals[0].linkedAssets[0].amount;
    // Should be less than 100k (growth handles the rest)
    expect(assigned).toBeLessThan(100000);
    // FV of assigned should equal target
    const fv = linkedFV(data.goals[0], assets);
    expect(fv).toBeCloseTo(100000, -2);
  });

  it('Does not over-assign when asset exceeds all goals combined', () => {
    const assets = [{ id: 'a1', name: 'FD', category: 'FDs & RDs', value: 1000000 }];
    const data = createTestData(assets, [
      createGoal({ id: 'g1', yearsFromNow: 2, targetAmount: 100000, inflationRate: 0 }),
      createGoal({ id: 'g2', yearsFromNow: 4, targetAmount: 200000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const g1 = data.goals.find(g => g.id === 'g1');
    const g2 = data.goals.find(g => g.id === 'g2');

    // FV of each goal's allocation should match its target
    expect(linkedFV(g1, assets)).toBeCloseTo(100000, -2);
    expect(linkedFV(g2, assets)).toBeCloseTo(200000, -2);

    // Total current value assigned should be well under 300k (since growth covers the gap)
    const totalAllocated = (g1.linkedAssets[0]?.amount || 0) + (g2.linkedAssets[0]?.amount || 0);
    expect(totalAllocated).toBeLessThan(300000);
  });
});

describe('autoAssignAssets - Exclusive-First Priority', () => {
  it('Short-term: uses SHORT_TERM_ONLY before BOTH_TERMS even when BOTH_TERMS is larger', () => {
    // Debt MF 500k (BOTH_TERMS) vs Savings 100k (SHORT_TERM_ONLY)
    // Goal needs 150k — should use Savings first, then Debt MF for remaining gap
    const assets = [
      { id: 'debt', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 500000 },
      { id: 'savings', name: 'Savings', category: 'Savings Bank', value: 100000 }
    ];
    const data = createTestData(assets, [
      createGoal({ id: 'g-short', yearsFromNow: 3, targetAmount: 150000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const g = data.goals[0];
    // Savings should be fully used (its FV < 150k target)
    expect(g.linkedAssets.find(la => la.assetId === 'savings').amount).toBe(100000);
    // Debt MF fills the remaining FV gap
    const debtAmount = g.linkedAssets.find(la => la.assetId === 'debt').amount;
    expect(debtAmount).toBeGreaterThan(0);
    expect(debtAmount).toBeLessThan(50000); // Less PV needed due to growth
    // Total FV should match target
    const fv = linkedFV(g, assets);
    expect(fv).toBeCloseTo(150000, -2);
  });

  it('Short-term: BOTH_TERMS preserved for long-term when SHORT_TERM_ONLY suffices', () => {
    // FD 300k covers short-term goal (200k FV). Debt MF should be available for long-term.
    const assets = [
      { id: 'fd', name: 'FD', category: 'FDs & RDs', value: 300000 },
      { id: 'debt', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 400000 }
    ];
    const data = createTestData(assets, [
      createGoal({ id: 'g-short', yearsFromNow: 3, targetAmount: 200000, inflationRate: 0 }),
      createGoal({ id: 'g-long', yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const gShort = data.goals.find(g => g.id === 'g-short');
    const gLong = data.goals.find(g => g.id === 'g-long');

    // Short-term uses only FD (FD's FV at 5%/3yr = 347k > 200k, so partial)
    expect(gShort.linkedAssets.length).toBe(1);
    expect(gShort.linkedAssets[0].assetId).toBe('fd');
    expect(linkedFV(gShort, assets)).toBeCloseTo(200000, -2);

    // Long-term gets full Debt MF (preserved from short-term)
    expect(gLong.linkedAssets.find(la => la.assetId === 'debt').amount).toBeCloseTo(400000, -2);
  });

  it('Long-term: uses LONG_TERM_ONLY before BOTH_TERMS even when BOTH_TERMS is larger', () => {
    // Debt MF 800k (BOTH_TERMS) vs Equity MF 200k (LONG_TERM_ONLY)
    // Long-term goal needs 300k — should use Equity MF first, then Debt MF
    const assets = [
      { id: 'debt', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 800000 },
      { id: 'equity', name: 'Equity MF', category: 'Equity Mutual Funds', value: 200000 }
    ];
    const data = createTestData(assets, [
      createGoal({ id: 'g-long', yearsFromNow: 10, targetAmount: 300000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const g = data.goals[0];
    // Equity MF: 200k at 10%/10yr → FV 519k > 300k target, so partial assignment
    const equityAmount = g.linkedAssets.find(la => la.assetId === 'equity').amount;
    expect(equityAmount).toBeLessThan(200000); // Only enough PV to cover 300k FV
    // Debt MF should not be needed (equity alone covers the target)
    expect(g.linkedAssets.find(la => la.assetId === 'debt')).toBeUndefined();
    // Total FV should match target
    expect(linkedFV(g, assets)).toBeCloseTo(300000, -2);
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

    // All short-term-only assets should be fully assigned (their FV << 10M target)
    expect(gShort.linkedAssets.find(la => la.assetId === 'savings').amount).toBe(100000);
    expect(gShort.linkedAssets.find(la => la.assetId === 'fd').amount).toBe(200000);
    expect(gShort.linkedAssets.find(la => la.assetId === 'debt').amount).toBe(500000);
  });
});

describe('autoAssignAssets - BOTH_TERMS Priority', () => {
  it('Debt/Arbitrage MF: short-term goals first, overflow to long-term', () => {
    const assets = [{ id: 'a1', name: 'Debt MF', category: 'Debt/Arbitrage Mutual Funds', value: 500000 }];
    const data = createTestData(assets, [
      createGoal({ id: 'g-short', yearsFromNow: 3, targetAmount: 200000, inflationRate: 0 }),
      createGoal({ id: 'g-long', yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const gShort = data.goals.find(g => g.id === 'g-short');
    const gLong = data.goals.find(g => g.id === 'g-long');

    // Short-term goal: FV of assigned should equal target
    expect(linkedFV(gShort, assets)).toBeCloseTo(200000, -2);
    // Short-term gets less PV than 200k
    expect(gShort.linkedAssets[0].amount).toBeLessThan(200000);
    // Long-term goal gets the remainder
    expect(gLong.linkedAssets[0].amount).toBeGreaterThan(300000);
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

    // Debt MF FV at 5%/3yr = 347k < 500k target, so all 300k goes to short-term
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

    // Short-term: FD + Savings + Debt MF (all fully used since FV << 10M)
    expect(gShort.linkedAssets.some(la => la.assetId === 'fd')).toBe(true);
    expect(gShort.linkedAssets.some(la => la.assetId === 'savings')).toBe(true);
    expect(gShort.linkedAssets.some(la => la.assetId === 'debt')).toBe(true);

    // Long-term: Equity MF (fully used since FV << 10M)
    expect(gLong.linkedAssets.some(la => la.assetId === 'equity')).toBe(true);

    // Total allocated = all assets (since targets are huge)
    const shortTotal = gShort.linkedAssets.reduce((s, la) => s + la.amount, 0);
    const longTotal = gLong.linkedAssets.reduce((s, la) => s + la.amount, 0);
    expect(shortTotal + longTotal).toBeCloseTo(1100000, -2);
  });

  it('Multiple assets: larger assets used first to minimize links', () => {
    // 3 equity MFs: 500k, 300k, 200k
    // Goal at 6yr needs 600k. Equity at 10%/6yr: 500k → 886k FV > 600k.
    // So only eq1 is needed (partial), and remaining goes to goal 2.
    const assets = [
      { id: 'eq1', name: 'Equity MF 1', category: 'Equity Mutual Funds', value: 500000 },
      { id: 'eq2', name: 'Equity MF 2', category: 'Equity Mutual Funds', value: 300000 },
      { id: 'eq3', name: 'Equity MF 3', category: 'Equity Mutual Funds', value: 200000 }
    ];
    const data = createTestData(assets, [
      createGoal({ id: 'g1', yearsFromNow: 6, targetAmount: 600000, inflationRate: 0 }),
      createGoal({ id: 'g2', yearsFromNow: 12, targetAmount: 10000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const g1 = data.goals.find(g => g.id === 'g1');
    const g2 = data.goals.find(g => g.id === 'g2');

    // g1: single asset sufficient (500k at 10%/6yr = 886k > 600k)
    expect(g1.linkedAssets.length).toBe(1);
    expect(g1.linkedAssets[0].assetId).toBe('eq1');
    expect(linkedFV(g1, assets)).toBeCloseTo(600000, -2);

    // g2 gets remaining eq1 + all of eq2 + eq3
    const g2Total = g2.linkedAssets.reduce((s, la) => s + la.amount, 0);
    expect(g2Total).toBeGreaterThan(400000);
  });

  it('Stocks: long-term first, remainder spills to short-term', () => {
    // Stocks 400k at 10%/10yr = 1.04M > 1M target. Partial assignment to long-term.
    // Remainder spills to short-term goal.
    const assets = [{ id: 'a1', name: 'TCS Stocks', category: 'Stocks', value: 400000 }];
    const data = createTestData(assets, [
      createGoal({ id: 'g-short', yearsFromNow: 3, targetAmount: 500000, inflationRate: 0 }),
      createGoal({ id: 'g-long', yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 })
    ]);

    autoAssignAssets(data);

    const gShort = data.goals.find(g => g.id === 'g-short');
    const gLong = data.goals.find(g => g.id === 'g-long');

    // Long-term goal gets what it needs
    expect(gLong.linkedAssets.length).toBe(1);
    expect(linkedFV(gLong, assets)).toBeCloseTo(1000000, -2);
    expect(gLong.linkedAssets[0].amount).toBeLessThan(400000);
    // Remainder spills to short-term
    expect(gShort.linkedAssets.length).toBe(1);
    expect(gShort.linkedAssets[0].assetId).toBe('a1');
    expect(gShort.linkedAssets[0].amount).toBeGreaterThan(0);
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
  it('Uses inflation-adjusted target and FV-aware capping', () => {
    // Goal: 100k target, 6% inflation, 10 years
    // Inflation-adjusted = 100000 * (1.06^10) ≈ 179,085
    // Asset: 200k equity MF at 10%/10yr → FV 519k > 179k
    // Should assign PV so that FV = 179k → PV ≈ 69k
    const assets = [{ id: 'a1', name: 'Equity MF', category: 'Equity Mutual Funds', value: 200000 }];
    const data = createTestData(assets, [
      createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 100000, inflationRate: 6 })
    ]);

    autoAssignAssets(data);

    const linked = data.goals[0].linkedAssets[0]?.amount || 0;
    // PV should be ~69k (much less than 179k inflation-adjusted target)
    expect(linked).toBeGreaterThan(60000);
    expect(linked).toBeLessThan(80000);
    // FV of assigned should match inflation-adjusted target
    expect(linkedFV(data.goals[0], assets)).toBeCloseTo(179085, -3);
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

  it('SHORT_TERM_ONLY categories spill to long-term when no short-term goals', () => {
    const categories = ['FDs & RDs', 'Savings Bank'];
    categories.forEach(category => {
      const data = createTestData([
        { id: 'a1', name: 'Test', category, value: 100000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 10, targetAmount: 500000, inflationRate: 0 })
      ]);

      autoAssignAssets(data);
      // Spillover: no short-term goals to consume them, so they help long-term
      expect(data.goals[0].linkedAssets.length).toBe(1);
      expect(data.goals[0].linkedAssets[0].amount).toBe(100000);
    });
  });

  it('LONG_TERM_ONLY categories spill to short-term when no long-term goals', () => {
    const categories = ['Equity Mutual Funds', 'Stocks', 'Gold ETFs/SGBs'];
    categories.forEach(category => {
      const data = createTestData([
        { id: 'a1', name: 'Test', category, value: 100000 }
      ], [
        createGoal({ id: 'g1', yearsFromNow: 3, targetAmount: 500000, inflationRate: 0 })
      ]);

      autoAssignAssets(data);
      // Spillover: no long-term goals to consume them, so they help short-term
      expect(data.goals[0].linkedAssets.length).toBe(1);
      expect(data.goals[0].linkedAssets[0].amount).toBe(100000);
    });
  });
});
