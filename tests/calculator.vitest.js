// Unit tests for calculator.js - Unified Portfolio (Vitest)
import { describe, it, expect } from 'vitest';
import {
  getYearsRemaining,
  getMonthsRemaining,
  calculateInflationAdjustedAmount,
  calculateBlendedReturn,
  calculateRegularSIP,
  getGoalCategory,
  getCategoryDisplay,
  UNIFIED_PORTFOLIO,
  getUnifiedCategory,
  getUnifiedBlendedReturn,
  calculateUnifiedGoalProjections,
  calculateEpfNpsCorpusFV,
  calculateEpfNpsSipFV,
  calculateEpfNpsSipFVWithStepUp,
  calculateRetirementProjectionsWithEpfNps
} from '../modules/calculator.js';

// Helper to create a goal object
function createGoal(options) {
  const today = new Date();
  const yearsFromNow = options.yearsFromNow || 10;
  const targetDate = new Date(today.getTime() + yearsFromNow * 365.25 * 24 * 60 * 60 * 1000);

  return {
    id: options.id || 'test-goal',
    name: options.name || 'Test Goal',
    targetAmount: options.targetAmount || 1000000,
    inflationRate: options.inflationRate ?? 6,
    targetDate: options.targetDate || targetDate.toISOString().split('T')[0],
    goalType: options.goalType || 'one-time',
    startDate: options.startDate || today.toISOString().split('T')[0],
    epfNpsStepUp: options.epfNpsStepUp || false
  };
}

describe('Basic Calculation Functions', () => {
  it('calculateBlendedReturn: 70/30 allocation', () => {
    const result = calculateBlendedReturn(70, 11, 30, 5);
    expect(result).toBeCloseTo(9.2, 1);
  });

  it('calculateBlendedReturn: 100% equity', () => {
    const result = calculateBlendedReturn(100, 11, 0, 5);
    expect(result).toBeCloseTo(11, 1);
  });

  it('calculateBlendedReturn: 100% debt', () => {
    const result = calculateBlendedReturn(0, 11, 100, 5);
    expect(result).toBeCloseTo(5, 1);
  });

  it('calculateInflationAdjustedAmount: 6% for 10 years', () => {
    const result = calculateInflationAdjustedAmount(1000000, 6, 10);
    expect(result).toBeCloseTo(1790848, 0);
  });
});

describe('Unified Portfolio Categories', () => {
  it('SHORT_TERM_THRESHOLD is 5 years', () => {
    expect(UNIFIED_PORTFOLIO.SHORT_TERM_THRESHOLD).toBe(5);
  });

  it('Long term allocation is 60/40', () => {
    expect(UNIFIED_PORTFOLIO.LONG_TERM.equity).toBe(60);
    expect(UNIFIED_PORTFOLIO.LONG_TERM.debt).toBe(40);
  });

  it('Less than 5 years is short', () => {
    const goal = createGoal({ yearsFromNow: 3 });
    expect(getUnifiedCategory(goal.targetDate)).toBe('short');
  });

  it('5 years or more is long', () => {
    const goal = createGoal({ yearsFromNow: 5.1 });
    expect(getUnifiedCategory(goal.targetDate)).toBe('long');
  });

  it('More than 5 years is long', () => {
    const goal = createGoal({ yearsFromNow: 10 });
    expect(getUnifiedCategory(goal.targetDate)).toBe('long');
  });

  it('getCategoryDisplay: Short term', () => {
    expect(getCategoryDisplay('short')).toBe('Short Term (< 5 yrs)');
  });

  it('getCategoryDisplay: Long term', () => {
    expect(getCategoryDisplay('long')).toBe('Long Term (5+ yrs)');
  });
});

describe('Unified Blended Returns', () => {
  it('Short term uses arbitrage return', () => {
    const result = getUnifiedBlendedReturn('short', 10, 5, 6);
    expect(result).toBe(6);
  });

  it('Short term falls back to debt return if no arbitrage', () => {
    const result = getUnifiedBlendedReturn('short', 10, 5);
    expect(result).toBe(5);
  });

  it('Long term uses 60/40 split by default', () => {
    const result = getUnifiedBlendedReturn('long', 10, 5, 6);
    expect(result).toBe(8); // 60% * 10 + 40% * 5 = 8
  });

  it('Long term with custom 80/20 allocation', () => {
    const result = getUnifiedBlendedReturn('long', 10, 5, 6, 80);
    expect(result).toBe(9); // 80% * 10 + 20% * 5 = 9
  });

  it('Long term with conservative 40/60 allocation', () => {
    const result = getUnifiedBlendedReturn('long', 10, 5, 6, 40);
    expect(result).toBe(7); // 40% * 10 + 60% * 5 = 7
  });
});

describe('Regular SIP Calculation', () => {
  it('Basic SIP calculation', () => {
    const sip = calculateRegularSIP(100000, 12, 12);
    expect(sip).toBeGreaterThan(7500);
    expect(sip).toBeLessThan(8500);
  });

  it('Zero rate returns simple division', () => {
    const sip = calculateRegularSIP(120000, 0, 12);
    expect(sip).toBe(10000);
  });

  it('Zero target returns 0', () => {
    expect(calculateRegularSIP(0, 10, 12)).toBe(0);
  });

  it('Zero months returns 0', () => {
    expect(calculateRegularSIP(100000, 10, 0)).toBe(0);
  });
});

describe('SIP Calculations - Short Term Goals', () => {
  it('3 years goal uses arbitrage (6%)', () => {
    const goal = createGoal({
      yearsFromNow: 3,
      targetAmount: 500000,
      inflationRate: 0
    });
    const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60);

    expect(projections.category).toBe('short');
    expect(projections.blendedReturn).toBe(6);
    expect(projections.monthlySIP).toBeGreaterThan(12000);
    expect(projections.monthlySIP).toBeLessThan(14000);
  });

  it('4.99 years is still short term', () => {
    const goal = createGoal({ yearsFromNow: 4.99 });
    const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60);
    expect(projections.category).toBe('short');
    expect(projections.blendedReturn).toBe(6);
  });
});

describe('SIP Calculations - Long Term Goals', () => {
  it('10 years goal uses 60/40 allocation (8%)', () => {
    const goal = createGoal({
      yearsFromNow: 10,
      targetAmount: 1000000,
      inflationRate: 0
    });
    const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60);

    expect(projections.category).toBe('long');
    expect(projections.blendedReturn).toBe(8);
    expect(projections.monthlySIP).toBeGreaterThan(5000);
    expect(projections.monthlySIP).toBeLessThan(6000);
  });

  it('5.01 years is long term', () => {
    const goal = createGoal({ yearsFromNow: 5.01 });
    const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60);
    expect(projections.category).toBe('long');
  });

  it('80/20 allocation gives higher return, lower SIP', () => {
    const goal = createGoal({
      yearsFromNow: 10,
      targetAmount: 1000000,
      inflationRate: 0
    });
    const proj60 = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60);
    const proj80 = calculateUnifiedGoalProjections(goal, 10, 5, 6, 80);

    expect(proj80.blendedReturn).toBe(9);
    expect(proj80.monthlySIP).toBeLessThan(proj60.monthlySIP);
  });

  it('40/60 allocation gives lower return, higher SIP', () => {
    const goal = createGoal({
      yearsFromNow: 10,
      targetAmount: 1000000,
      inflationRate: 0
    });
    const proj60 = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60);
    const proj40 = calculateUnifiedGoalProjections(goal, 10, 5, 6, 40);

    expect(proj40.blendedReturn).toBe(7);
    expect(proj40.monthlySIP).toBeGreaterThan(proj60.monthlySIP);
  });

  it('Inflation increases target and SIP', () => {
    const goalNoInf = createGoal({ yearsFromNow: 10, targetAmount: 1000000, inflationRate: 0 });
    const goalWithInf = createGoal({ yearsFromNow: 10, targetAmount: 1000000, inflationRate: 6 });

    const projNoInf = calculateUnifiedGoalProjections(goalNoInf, 10, 5, 6, 60);
    const projWithInf = calculateUnifiedGoalProjections(goalWithInf, 10, 5, 6, 60);

    expect(projWithInf.inflationAdjustedTarget).toBeGreaterThan(projNoInf.inflationAdjustedTarget);
    expect(projWithInf.monthlySIP).toBeGreaterThan(projNoInf.monthlySIP);
  });
});

describe('EPF/NPS Calculations', () => {
  it('Corpus compounds correctly', () => {
    const goal = createGoal({ yearsFromNow: 10 });
    const result = calculateEpfNpsCorpusFV(100000, 100000, goal.targetDate);

    expect(result).toBeGreaterThan(450000);
    expect(result).toBeLessThan(550000);
  });

  it('Monthly contributions compound', () => {
    const goal = createGoal({ yearsFromNow: 10 });
    const result = calculateEpfNpsSipFV(5000, 5000, goal.targetDate);

    expect(result).toBeGreaterThan(1500000);
    expect(result).toBeLessThan(2500000);
  });

  it('Step-up increases future value', () => {
    const goal = createGoal({ yearsFromNow: 10 });
    const withoutStepUp = calculateEpfNpsSipFV(5000, 5000, goal.targetDate);
    const withStepUp = calculateEpfNpsSipFVWithStepUp(5000, 5000, goal.targetDate, 7);

    expect(withStepUp).toBeGreaterThan(withoutStepUp);
    expect(withStepUp).toBeGreaterThan(withoutStepUp * 1.25);
  });
});

describe('Retirement Goals with EPF/NPS', () => {
  it('Non-retirement returns base projections without EPF/NPS', () => {
    const goal = createGoal({ yearsFromNow: 10, goalType: 'one-time' });
    const projections = calculateRetirementProjectionsWithEpfNps(goal, null, 10, 5, 6);

    expect(projections.epfNps).toBeNull();
    expect(projections.monthlySIP).toBeGreaterThan(0);
  });

  it('EPF/NPS significantly reduces required SIP', () => {
    const goal = createGoal({
      yearsFromNow: 20,
      goalType: 'retirement',
      targetAmount: 50000000,
      inflationRate: 6
    });

    const contributions = {
      monthlyEpf: 20000,
      monthlyNps: 10000,
      epfCorpus: 1000000,
      npsCorpus: 500000,
      totalMonthly: 30000,
      totalCorpus: 1500000
    };

    const withEpfNps = calculateRetirementProjectionsWithEpfNps(goal, contributions, 10, 5, 6, 60, 8, 9);
    const baseProjections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60);

    // EPF/NPS should contribute substantially
    expect(withEpfNps.epfNps.totalEpfNpsFV).toBeGreaterThan(20000000);
    // Required additional SIP should be reduced
    expect(withEpfNps.monthlySIP).toBeLessThan(baseProjections.monthlySIP);
    // Verify it's a meaningful reduction (at least 15%)
    expect(withEpfNps.monthlySIP).toBeLessThan(baseProjections.monthlySIP * 0.85);
  });

  it('No EPF/NPS returns base projections', () => {
    const goal = createGoal({ yearsFromNow: 20, goalType: 'retirement', targetAmount: 10000000 });
    const noContributions = {
      monthlyEpf: 0, monthlyNps: 0, epfCorpus: 0, npsCorpus: 0, totalMonthly: 0, totalCorpus: 0
    };

    const result = calculateRetirementProjectionsWithEpfNps(goal, noContributions, 10, 5, 6, 60, 8, 9);
    const base = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60);

    expect(result.epfNps).toBeNull();
    expect(result.monthlySIP).toBeCloseTo(base.monthlySIP, 0);
  });

  it('EPF/NPS step-up increases contribution and reduces SIP', () => {
    const goalNoStepUp = createGoal({ yearsFromNow: 20, goalType: 'retirement', targetAmount: 50000000, epfNpsStepUp: false });
    const goalWithStepUp = createGoal({ yearsFromNow: 20, goalType: 'retirement', targetAmount: 50000000, epfNpsStepUp: true });

    const contributions = {
      monthlyEpf: 20000, monthlyNps: 10000, epfCorpus: 0, npsCorpus: 0, totalMonthly: 30000, totalCorpus: 0
    };

    const withoutStepUp = calculateRetirementProjectionsWithEpfNps(goalNoStepUp, contributions, 10, 5, 6, 60, 8, 9);
    const withStepUp = calculateRetirementProjectionsWithEpfNps(goalWithStepUp, contributions, 10, 5, 6, 60, 8, 9);

    expect(withStepUp.epfNps.totalEpfNpsFV).toBeGreaterThan(withoutStepUp.epfNps.totalEpfNpsFV * 1.3);
    expect(withStepUp.monthlySIP).toBeLessThan(withoutStepUp.monthlySIP);
  });

  it('Short retirement goal uses arbitrage return', () => {
    const goal = createGoal({ yearsFromNow: 3, goalType: 'retirement', targetAmount: 5000000 });
    const contributions = {
      monthlyEpf: 10000, monthlyNps: 5000, epfCorpus: 1000000, npsCorpus: 500000, totalMonthly: 15000, totalCorpus: 1500000
    };

    const result = calculateRetirementProjectionsWithEpfNps(goal, contributions, 10, 5, 6, 60, 8, 9);

    expect(result.category).toBe('short');
    expect(result.blendedReturn).toBe(6);
  });
});
