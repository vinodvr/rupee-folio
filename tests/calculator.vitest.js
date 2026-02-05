// Unit tests for calculator.js - Unified Portfolio (Vitest)
import { describe, it, expect } from 'vitest';
import {
  getYearsRemaining,
  getMonthsRemaining,
  calculateInflationAdjustedAmount,
  calculateBlendedReturn,
  calculateRegularSIP,
  calculateStepUpSIP,
  calculateSipFV,
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
    includeEpfNps: options.includeEpfNps || false
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
    expect(getCategoryDisplay('short')).toBe('Short Term');
  });

  it('getCategoryDisplay: Long term', () => {
    expect(getCategoryDisplay('long')).toBe('Long Term');
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
      inflationRate: 6,
      includeEpfNps: true
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
    const goal = createGoal({ yearsFromNow: 20, goalType: 'retirement', targetAmount: 50000000, includeEpfNps: true });

    const contributions = {
      monthlyEpf: 20000, monthlyNps: 10000, epfCorpus: 0, npsCorpus: 0, totalMonthly: 30000, totalCorpus: 0
    };

    // Compare 0% step-up vs 5% step-up
    const withoutStepUp = calculateRetirementProjectionsWithEpfNps(goal, contributions, 10, 5, 6, 60, 8, 9, 0, 0);
    const withStepUp = calculateRetirementProjectionsWithEpfNps(goal, contributions, 10, 5, 6, 60, 8, 9, 5, 0);

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

describe('Step-up SIP Validation', () => {
  it('Step-up at 0% equals regular SIP', () => {
    const futureValue = 1000000;
    const annualRate = 12;
    const months = 120; // 10 years

    const regularSIP = calculateRegularSIP(futureValue, annualRate, months);
    const stepUpSIP = calculateStepUpSIP(futureValue, annualRate, months, 0);

    expect(stepUpSIP).toBeCloseTo(regularSIP, 2);
  });

  it('Step-up SIP produces correct future value (round-trip)', () => {
    const targetFV = 1000000;
    const annualRate = 12;
    const months = 120; // 10 years
    const stepUpPercent = 10;

    // Calculate the starting SIP needed
    const startingSIP = calculateStepUpSIP(targetFV, annualRate, months, stepUpPercent);

    // Verify it's positive and reasonable
    expect(startingSIP).toBeGreaterThan(0);
    expect(startingSIP).toBeLessThan(targetFV / months); // Should be less than simple division

    // Calculate the FV with that SIP using our formula
    const monthlyRate = annualRate / 100 / 12;
    const stepUpRate = stepUpPercent / 100;
    let fv = 0;
    let currentSIP = startingSIP;
    let monthInYear = 0;

    for (let month = 0; month < months; month++) {
      const remainingMonths = months - month;
      fv += currentSIP * Math.pow(1 + monthlyRate, remainingMonths);
      monthInYear++;
      if (monthInYear >= 12) {
        currentSIP *= (1 + stepUpRate);
        monthInYear = 0;
      }
    }
    fv *= (1 + monthlyRate); // Annuity due adjustment

    // The calculated FV should be at least the target (conservative approach)
    expect(fv).toBeGreaterThanOrEqual(targetFV - 1); // Allow for tiny rounding
  });

  it('Higher step-up reduces starting SIP (monotonic)', () => {
    const futureValue = 1000000;
    const annualRate = 12;
    const months = 120; // 10 years

    const sip3 = calculateStepUpSIP(futureValue, annualRate, months, 3);
    const sip5 = calculateStepUpSIP(futureValue, annualRate, months, 5);
    const sip7 = calculateStepUpSIP(futureValue, annualRate, months, 7);
    const sip10 = calculateStepUpSIP(futureValue, annualRate, months, 10);

    // Higher step-up = lower starting SIP needed
    expect(sip3).toBeGreaterThan(sip5);
    expect(sip5).toBeGreaterThan(sip7);
    expect(sip7).toBeGreaterThan(sip10);
  });
});

describe('Boundary Conditions', () => {
  it('Exactly 5 years is long term (>= threshold)', () => {
    // Create a goal slightly more than 5 years from now to account for timing
    const today = new Date();
    const targetDate = new Date(today.getTime() + 5.01 * 365.25 * 24 * 60 * 60 * 1000);
    const goal = createGoal({ targetDate: targetDate.toISOString().split('T')[0] });

    expect(UNIFIED_PORTFOLIO.SHORT_TERM_THRESHOLD).toBe(5);
    expect(getUnifiedCategory(goal.targetDate)).toBe('long');

    // Also test that 4.99 years is short
    const shortTarget = new Date(today.getTime() + 4.99 * 365.25 * 24 * 60 * 60 * 1000);
    expect(getUnifiedCategory(shortTarget.toISOString().split('T')[0])).toBe('short');
  });

  it('1-month goal works correctly', () => {
    const today = new Date();
    const targetDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // ~1 month
    const goal = createGoal({
      targetDate: targetDate.toISOString().split('T')[0],
      targetAmount: 100000,
      inflationRate: 0
    });

    const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60);

    expect(projections.months).toBeLessThanOrEqual(2);
    expect(projections.months).toBeGreaterThanOrEqual(0);
    expect(projections.category).toBe('short');
    expect(projections.monthlySIP).toBeGreaterThan(0);
  });

  it('3-month goal works correctly', () => {
    const today = new Date();
    const targetDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000); // ~3 months
    const goal = createGoal({
      targetDate: targetDate.toISOString().split('T')[0],
      targetAmount: 100000,
      inflationRate: 0
    });

    const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60);

    expect(projections.months).toBeLessThanOrEqual(4);
    expect(projections.months).toBeGreaterThanOrEqual(2);
    expect(projections.category).toBe('short');
    expect(projections.monthlySIP).toBeGreaterThan(0);
  });

  it('30-year goal produces reasonable SIP', () => {
    const goal = createGoal({
      yearsFromNow: 30,
      targetAmount: 10000000,
      inflationRate: 6
    });

    const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60);

    expect(projections.category).toBe('long');
    expect(projections.years).toBeCloseTo(30, 0);
    expect(projections.months).toBeCloseTo(360, 1);
    // SIP should be positive but much smaller than target divided by months
    expect(projections.monthlySIP).toBeGreaterThan(0);
    expect(projections.monthlySIP).toBeLessThan(projections.inflationAdjustedTarget / projections.months);
  });

  it('Past target date returns 0 months/years', () => {
    const today = new Date();
    const pastDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
    const targetDate = pastDate.toISOString().split('T')[0];

    expect(getYearsRemaining(targetDate)).toBe(0);
    expect(getMonthsRemaining(targetDate)).toBe(0);
  });
});

describe('Input Edge Cases', () => {
  it('Negative target amount returns 0 SIP', () => {
    expect(calculateRegularSIP(-100000, 10, 12)).toBe(0);
    expect(calculateStepUpSIP(-100000, 10, 12, 5)).toBe(0);
  });

  it('Zero return rate with step-up works', () => {
    const sip = calculateStepUpSIP(120000, 0, 12, 10);
    // With 0% return, it's just simple saving
    expect(sip).toBeGreaterThan(0);
    expect(sip).toBeLessThanOrEqual(10000); // Should be around 10000 or less with step-up
  });
});

describe('Consistency', () => {
  it('EPF/NPS step-up 0% equals regular EPF/NPS', () => {
    const goal = createGoal({ yearsFromNow: 10 });

    const regular = calculateEpfNpsSipFV(5000, 5000, goal.targetDate);
    const withZeroStepUp = calculateEpfNpsSipFVWithStepUp(5000, 5000, goal.targetDate, 0);

    expect(withZeroStepUp).toBeCloseTo(regular, 0);
  });

  it('SIP FV calculation is consistent with regular SIP inverse', () => {
    // If we calculate a SIP and then its FV, we should get close to target
    const targetFV = 500000;
    const annualRate = 10;
    const months = 60;

    const monthlySIP = calculateRegularSIP(targetFV, annualRate, months);
    const calculatedFV = calculateSipFV(monthlySIP, annualRate, months);

    expect(calculatedFV).toBeCloseTo(targetFV, 0);
  });

  it('EPF at 8% and NPS at 9% compound separately', () => {
    const goal = createGoal({ yearsFromNow: 10 });

    // Calculate separately
    const epfOnly = calculateEpfNpsSipFV(10000, 0, goal.targetDate, 8, 9);
    const npsOnly = calculateEpfNpsSipFV(0, 10000, goal.targetDate, 8, 9);
    const combined = calculateEpfNpsSipFV(10000, 10000, goal.targetDate, 8, 9);

    expect(combined).toBeCloseTo(epfOnly + npsOnly, 0);
  });
});

describe('Golden Values - Known Correct Answers', () => {
  it('Standard SIP FV: ₹10,000/month at 12% for 12 months', () => {
    // ₹10,000/month at 12% for 12 months with annuity due ≈ ₹1,28,093
    // Ordinary annuity would be ₹1,26,825, annuity due adds one month's interest
    const fv = calculateSipFV(10000, 12, 12);
    expect(fv).toBeCloseTo(128093, -2); // within ₹100
  });

  it('10-year SIP FV: ₹10,000/month at 12% for 120 months', () => {
    // ₹10,000/month at 12% for 10 years (annuity due) ≈ ₹23,23,391
    const fv = calculateSipFV(10000, 12, 120);
    expect(fv).toBeCloseTo(2323391, -2); // within ₹100
  });

  it('Required SIP for ₹10 lakh in 5 years at 12%', () => {
    // To get ₹10,00,000 in 60 months at 12% ≈ ₹12,100/month
    const sip = calculateRegularSIP(1000000, 12, 60);
    expect(sip).toBeCloseTo(12100, -2); // within ₹100
  });
});

describe('Mathematical Properties', () => {
  it('Doubling target doubles SIP (linearity)', () => {
    const sip1 = calculateRegularSIP(500000, 10, 60);
    const sip2 = calculateRegularSIP(1000000, 10, 60);
    expect(sip2).toBeCloseTo(sip1 * 2, 0);
  });

  it('Higher return rate requires lower SIP', () => {
    const sip8 = calculateRegularSIP(1000000, 8, 120);
    const sip10 = calculateRegularSIP(1000000, 10, 120);
    const sip12 = calculateRegularSIP(1000000, 12, 120);
    expect(sip8).toBeGreaterThan(sip10);
    expect(sip10).toBeGreaterThan(sip12);
  });

  it('Longer horizon requires lower SIP', () => {
    const sip5yr = calculateRegularSIP(1000000, 10, 60);
    const sip10yr = calculateRegularSIP(1000000, 10, 120);
    const sip20yr = calculateRegularSIP(1000000, 10, 240);
    expect(sip5yr).toBeGreaterThan(sip10yr);
    expect(sip10yr).toBeGreaterThan(sip20yr);
  });
});

describe('Step-up Specific Behavior', () => {
  it('Step-up total invested is higher than regular SIP total', () => {
    const months = 120;
    const regularSIP = calculateRegularSIP(1000000, 12, months);
    const stepUpSIP = calculateStepUpSIP(1000000, 12, months, 10);

    // Calculate total invested for each
    const regularTotal = regularSIP * months;

    let stepUpTotal = 0;
    let currentSIP = stepUpSIP;
    for (let m = 0; m < months; m++) {
      stepUpTotal += currentSIP;
      if ((m + 1) % 12 === 0) currentSIP *= 1.1;
    }

    // Step-up starts lower but invests more total over time
    expect(stepUpSIP).toBeLessThan(regularSIP);
    expect(stepUpTotal).toBeGreaterThan(regularTotal);
  });

  it('Step-up with very high rate (25%) still works', () => {
    const sip = calculateStepUpSIP(1000000, 10, 120, 25);
    expect(sip).toBeGreaterThan(0);
    expect(Number.isFinite(sip)).toBe(true);
    // With 25% annual step-up, starting SIP should be much lower
    const regularSIP = calculateRegularSIP(1000000, 10, 120);
    expect(sip).toBeLessThan(regularSIP * 0.5);
  });
});

describe('Numerical Stability', () => {
  it('Very small target (₹10,000) works', () => {
    const sip = calculateRegularSIP(10000, 10, 12);
    expect(sip).toBeGreaterThan(0);
    expect(sip).toBeLessThan(1000);
  });

  it('Very large target (₹10 crore) works', () => {
    const sip = calculateRegularSIP(100000000, 10, 240);
    expect(sip).toBeGreaterThan(0);
    expect(Number.isFinite(sip)).toBe(true);
  });

  it('Very long horizon (50 years) works', () => {
    const sip = calculateRegularSIP(100000000, 10, 600);
    expect(sip).toBeGreaterThan(0);
    expect(Number.isFinite(sip)).toBe(true);
    // 50 years of compounding should require much smaller SIP
    const sip10yr = calculateRegularSIP(100000000, 10, 120);
    expect(sip).toBeLessThan(sip10yr * 0.1);
  });

  it('Small monthly amounts (₹500) accumulate correctly', () => {
    const fv = calculateSipFV(500, 8, 360); // ₹500/month for 30 years at 8%
    expect(fv).toBeGreaterThan(700000); // Should be over ₹7 lakh
    expect(Number.isFinite(fv)).toBe(true);
  });
});

describe('Annuity Due Verification', () => {
  it('Our formula uses annuity due (payment at start of period)', () => {
    // Annuity due FV = Ordinary annuity FV × (1 + r)
    const monthlyRate = 0.01; // 1% monthly = 12% annual
    const months = 12;
    const pmt = 10000;

    // Ordinary annuity: PMT × ((1+r)^n - 1) / r
    const ordinaryAnnuity = pmt * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    // Annuity due: Ordinary × (1 + r)
    const annuityDue = ordinaryAnnuity * (1 + monthlyRate);

    const ourFV = calculateSipFV(pmt, 12, months);
    expect(ourFV).toBeCloseTo(annuityDue, 0);
  });

  it('Step-up SIP also uses annuity due formula', () => {
    // With 0% step-up, step-up SIP should match regular SIP exactly
    // This confirms both use the same annuity due formula
    const target = 1000000;
    const rate = 10;
    const months = 60;

    const regularSIP = calculateRegularSIP(target, rate, months);
    const stepUpSIP = calculateStepUpSIP(target, rate, months, 0);

    // Should be essentially identical
    expect(stepUpSIP).toBeCloseTo(regularSIP, 1);
  });
});
