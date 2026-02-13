// Unit tests for investmentplan.js (Vitest)
import { describe, it, expect } from 'vitest';
import { getTaperedEquityAllocation, UNIFIED_PORTFOLIO } from '../modules/calculator.js';

/**
 * Replicate the per-goal equity/debt split logic from calculateCategorySummary
 * to test it without DOM dependencies.
 */
function computeLongTermSplit(goals, equityAllocation) {
  const totalSIP = goals.reduce((sum, g) => sum + g.projections.monthlySIP, 0);
  let totalEquity = 0;
  let totalDebt = 0;
  goals.forEach(g => {
    const goalEquity = getTaperedEquityAllocation(g.projections.years, equityAllocation);
    const goalSIP = g.projections.monthlySIP;
    totalEquity += goalSIP * (goalEquity / 100);
    totalDebt += goalSIP * ((100 - goalEquity) / 100);
  });
  const effectiveEquity = totalSIP > 0 ? Math.round(totalEquity / totalSIP * 100) : equityAllocation;
  const nifty50 = totalEquity * (UNIFIED_PORTFOLIO.LONG_TERM.equitySplit.nifty50 / 100);
  const niftyNext50 = totalEquity * (UNIFIED_PORTFOLIO.LONG_TERM.equitySplit.niftyNext50 / 100);
  return { totalSIP, totalEquity, totalDebt, effectiveEquity, nifty50, niftyNext50 };
}

describe('Per-Goal Equity/Debt Split', () => {
  const equityAllocation = 60;

  it('two long-term goals with different timelines get correct per-goal equity splits', () => {
    // Goal A: 20 years remaining → getTaperedEquityAllocation(20, 60) = 60%
    // Goal B: 6 years remaining → getTaperedEquityAllocation(6, 60) = min(60/2, 40) = 30%
    const goals = [
      { projections: { monthlySIP: 10000, years: 20 } },
      { projections: { monthlySIP: 5000, years: 6 } },
    ];

    const result = computeLongTermSplit(goals, equityAllocation);

    // Goal A equity: 10000 * 0.60 = 6000, debt: 10000 * 0.40 = 4000
    // Goal B equity: 5000 * 0.30 = 1500, debt: 5000 * 0.70 = 3500
    expect(result.totalEquity).toBeCloseTo(7500, 2);
    expect(result.totalDebt).toBeCloseTo(7500, 2);
  });

  it('effective equity % reflects weighted average, not settings value', () => {
    // Same goals as above: total SIP = 15000, total equity = 7500
    // Weighted equity = 7500/15000 = 50%, NOT the settings-level 60%
    const goals = [
      { projections: { monthlySIP: 10000, years: 20 } },
      { projections: { monthlySIP: 5000, years: 6 } },
    ];

    const result = computeLongTermSplit(goals, equityAllocation);

    expect(result.effectiveEquity).toBe(50);
    expect(result.effectiveEquity).not.toBe(equityAllocation);
  });

  it('equity + debt fund SIPs equal total long-term SIP', () => {
    const goals = [
      { projections: { monthlySIP: 10000, years: 20 } },
      { projections: { monthlySIP: 5000, years: 6 } },
      { projections: { monthlySIP: 8000, years: 12 } },
    ];

    const result = computeLongTermSplit(goals, equityAllocation);

    // Invariant: totalEquity + totalDebt === totalSIP
    expect(result.totalEquity + result.totalDebt).toBeCloseTo(result.totalSIP, 2);
    // Also verify fund-level split: nifty50 + niftyNext50 = totalEquity
    expect(result.nifty50 + result.niftyNext50).toBeCloseTo(result.totalEquity, 2);
  });

  it('single goal with >= 8 years uses full equity allocation', () => {
    const goals = [
      { projections: { monthlySIP: 10000, years: 15 } },
    ];

    const result = computeLongTermSplit(goals, equityAllocation);

    expect(result.effectiveEquity).toBe(60);
    expect(result.totalEquity).toBeCloseTo(6000, 2);
    expect(result.totalDebt).toBeCloseTo(4000, 2);
  });

  it('single goal with 5-8 years uses reduced equity allocation', () => {
    const goals = [
      { projections: { monthlySIP: 10000, years: 6 } },
    ];

    const result = computeLongTermSplit(goals, equityAllocation);

    // getTaperedEquityAllocation(6, 60) = min(60/2, 40) = 30
    expect(result.effectiveEquity).toBe(30);
    expect(result.totalEquity).toBeCloseTo(3000, 2);
    expect(result.totalDebt).toBeCloseTo(7000, 2);
  });

  it('no goals returns settings-level equity allocation as default', () => {
    const result = computeLongTermSplit([], equityAllocation);

    expect(result.totalSIP).toBe(0);
    expect(result.effectiveEquity).toBe(equityAllocation);
  });

  it('goals with zero SIP do not distort the effective equity %', () => {
    const goals = [
      { projections: { monthlySIP: 0, years: 6 } },  // achieved goal
      { projections: { monthlySIP: 10000, years: 20 } },
    ];

    const result = computeLongTermSplit(goals, equityAllocation);

    // Only the 20yr goal contributes: 60% equity
    expect(result.effectiveEquity).toBe(60);
  });
});
