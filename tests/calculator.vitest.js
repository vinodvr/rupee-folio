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
  calculateRetirementProjectionsWithEpfNps,
  getTaperedEquityAllocation,
  calculateSipFVWithTapering,
  calculateRegularSIPWithTapering,
  calculateSipFVWithTaperingAndStepUp,
  calculateStepUpSIPWithTapering,
  getReturnForCategory,
  calculateLinkedAssetsFV
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
  it('10 years goal uses 60/40 allocation with tapering', () => {
    const goal = createGoal({
      yearsFromNow: 10,
      targetAmount: 1000000,
      inflationRate: 0
    });
    const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60);

    expect(projections.category).toBe('long');
    expect(projections.blendedReturn).toBe(8); // Nominal blend, but tapering reduces effective
    // With tapering, SIP is higher than constant 8% return would require
    expect(projections.monthlySIP).toBeGreaterThan(5000);
    expect(projections.monthlySIP).toBeLessThan(7000); // Updated for tapering
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

describe('Equity Tapering (Glide Path)', () => {
  describe('getTaperedEquityAllocation', () => {
    it('Returns initial equity for 8+ years', () => {
      expect(getTaperedEquityAllocation(10, 60)).toBe(60);
      expect(getTaperedEquityAllocation(8.5, 60)).toBe(60);
      expect(getTaperedEquityAllocation(8, 60)).toBe(60);
      expect(getTaperedEquityAllocation(20, 80)).toBe(80);
    });

    it('Returns min(initial/2, 40%) for 5-8 years', () => {
      // 60% initial -> 30% (60/2 = 30, min(30, 40) = 30)
      expect(getTaperedEquityAllocation(7, 60)).toBe(30);
      expect(getTaperedEquityAllocation(5.5, 60)).toBe(30);
      expect(getTaperedEquityAllocation(5, 60)).toBe(30);

      // 80% initial -> 40% (80/2 = 40, min(40, 40) = 40)
      expect(getTaperedEquityAllocation(6, 80)).toBe(40);

      // 40% initial -> 20% (40/2 = 20, min(20, 40) = 20)
      expect(getTaperedEquityAllocation(6, 40)).toBe(20);
    });

    it('Returns min(initial/4, 20%) for 3-5 years', () => {
      // 60% initial -> 15% (60/4 = 15, min(15, 20) = 15)
      expect(getTaperedEquityAllocation(4, 60)).toBe(15);
      expect(getTaperedEquityAllocation(3.5, 60)).toBe(15);
      expect(getTaperedEquityAllocation(3, 60)).toBe(15);

      // 80% initial -> 20% (80/4 = 20, min(20, 20) = 20)
      expect(getTaperedEquityAllocation(4, 80)).toBe(20);

      // 40% initial -> 10% (40/4 = 10, min(10, 20) = 10)
      expect(getTaperedEquityAllocation(4, 40)).toBe(10);
    });

    it('Returns 0% for less than 3 years', () => {
      expect(getTaperedEquityAllocation(2.9, 60)).toBe(0);
      expect(getTaperedEquityAllocation(2, 60)).toBe(0);
      expect(getTaperedEquityAllocation(1, 60)).toBe(0);
      expect(getTaperedEquityAllocation(0.5, 60)).toBe(0);
      expect(getTaperedEquityAllocation(0, 60)).toBe(0);
    });

    it('Works correctly at boundaries', () => {
      // Exactly 8 years = initial
      expect(getTaperedEquityAllocation(8, 60)).toBe(60);
      // Just under 8 years = mid-high
      expect(getTaperedEquityAllocation(7.99, 60)).toBe(30);
      // Exactly 5 years = mid-high
      expect(getTaperedEquityAllocation(5, 60)).toBe(30);
      // Just under 5 years = mid-low
      expect(getTaperedEquityAllocation(4.99, 60)).toBe(15);
      // Exactly 3 years = mid-low
      expect(getTaperedEquityAllocation(3, 60)).toBe(15);
      // Just under 3 years = 0
      expect(getTaperedEquityAllocation(2.99, 60)).toBe(0);
    });

    it('Caps are applied correctly for aggressive allocations', () => {
      // 80% initial: mid-high capped at 40%, mid-low capped at 20%
      expect(getTaperedEquityAllocation(6, 80)).toBe(40); // min(40, 40) = 40
      expect(getTaperedEquityAllocation(4, 80)).toBe(20); // min(20, 20) = 20

      // 100% initial (hypothetical): caps should limit
      expect(getTaperedEquityAllocation(6, 100)).toBe(40); // min(50, 40) = 40
      expect(getTaperedEquityAllocation(4, 100)).toBe(20); // min(25, 20) = 20
    });
  });

  describe('calculateSipFVWithTapering', () => {
    it('Returns 0 for invalid inputs', () => {
      expect(calculateSipFVWithTapering(0, 120, 60, 10, 5)).toBe(0);
      expect(calculateSipFVWithTapering(1000, 0, 60, 10, 5)).toBe(0);
      expect(calculateSipFVWithTapering(-1000, 120, 60, 10, 5)).toBe(0);
    });

    it('10-year goal with 60% initial has lower FV than constant 60% equity', () => {
      // With tapering, returns decrease as we approach goal
      const sipAmount = 10000;
      const months = 120; // 10 years
      const tapered = calculateSipFVWithTapering(sipAmount, months, 60, 10, 5);
      const constant = calculateSipFV(sipAmount, 8, months); // 60/40 blend = 8%

      // Tapered should produce less than constant equity due to reduced returns near goal
      expect(tapered).toBeLessThan(constant);
      expect(tapered).toBeGreaterThan(0);
    });

    it('Short-term goal (2 years) uses 0% equity throughout', () => {
      const sipAmount = 10000;
      const months = 24; // 2 years
      const tapered = calculateSipFVWithTapering(sipAmount, months, 60, 10, 5);
      const pureDebt = calculateSipFV(sipAmount, 5, months); // 0% equity = 5% return

      // Should be essentially the same since 0% equity for entire period
      expect(tapered).toBeCloseTo(pureDebt, 0);
    });

    it('4-year goal uses reduced equity (15%) for entire period', () => {
      const sipAmount = 10000;
      const months = 48; // 4 years
      const tapered = calculateSipFVWithTapering(sipAmount, months, 60, 10, 5);

      // With 15% equity: blended return = 15% * 10% + 85% * 5% = 5.75%
      // But last year is 0% equity, so actual return is lower
      expect(tapered).toBeGreaterThan(0);
      expect(tapered).toBeGreaterThan(sipAmount * months); // Should have some growth
    });
  });

  describe('calculateRegularSIPWithTapering', () => {
    it('Returns 0 for invalid inputs', () => {
      expect(calculateRegularSIPWithTapering(0, 120, 60, 10, 5)).toBe(0);
      expect(calculateRegularSIPWithTapering(1000000, 0, 60, 10, 5)).toBe(0);
      expect(calculateRegularSIPWithTapering(-1000000, 120, 60, 10, 5)).toBe(0);
    });

    it('10-year goal with tapering requires higher SIP than constant equity', () => {
      const target = 1000000;
      const months = 120;
      const taperedSIP = calculateRegularSIPWithTapering(target, months, 60, 10, 5);
      const constantSIP = calculateRegularSIP(target, 8, months); // 60/40 = 8%

      // Tapering reduces returns, so need higher SIP
      expect(taperedSIP).toBeGreaterThan(constantSIP);
    });

    it('Round-trip: SIP produces correct FV', () => {
      const target = 1000000;
      const months = 120;
      const sip = calculateRegularSIPWithTapering(target, months, 60, 10, 5);
      const fv = calculateSipFVWithTapering(sip, months, 60, 10, 5);

      expect(fv).toBeCloseTo(target, 0);
    });

    it('Higher initial equity means lower required SIP', () => {
      const target = 1000000;
      const months = 120;
      const sip40 = calculateRegularSIPWithTapering(target, months, 40, 10, 5);
      const sip60 = calculateRegularSIPWithTapering(target, months, 60, 10, 5);
      const sip80 = calculateRegularSIPWithTapering(target, months, 80, 10, 5);

      expect(sip40).toBeGreaterThan(sip60);
      expect(sip60).toBeGreaterThan(sip80);
    });

    it('Works for short-term goals', () => {
      const target = 500000;
      const months = 24; // 2 years
      const sip = calculateRegularSIPWithTapering(target, months, 60, 10, 5);

      // Should be positive and reasonable
      expect(sip).toBeGreaterThan(0);
      // For 2 years with 0% equity (5% return), SIP should be close to target/months
      expect(sip).toBeLessThan(target / months);
    });
  });

  describe('Tapering in Goal Projections', () => {
    it('Goal projections include tapering schedule with 4 phases', () => {
      const goal = createGoal({ yearsFromNow: 10 });
      const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60);

      expect(projections.tapering).toBeDefined();
      expect(projections.tapering.initialEquity).toBe(60);
      expect(projections.tapering.phases).toHaveLength(4);
      expect(projections.tapering.phases[0]).toEqual({ yearsThreshold: 8, equity: 60 });
      expect(projections.tapering.phases[1]).toEqual({ yearsThreshold: 5, equity: 30 }); // min(60/2, 40) = 30
      expect(projections.tapering.phases[2]).toEqual({ yearsThreshold: 3, equity: 15 }); // min(60/4, 20) = 15
      expect(projections.tapering.phases[3]).toEqual({ yearsThreshold: 0, equity: 0 });
    });

    it('Tapering phases reflect custom allocation (80%)', () => {
      const goal = createGoal({ yearsFromNow: 10 });
      const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 80);

      expect(projections.tapering.initialEquity).toBe(80);
      expect(projections.tapering.phases[0].equity).toBe(80);
      expect(projections.tapering.phases[1].equity).toBe(40); // min(80/2, 40) = 40
      expect(projections.tapering.phases[2].equity).toBe(20); // min(80/4, 20) = 20
      expect(projections.tapering.phases[3].equity).toBe(0);
    });

    it('Conservative allocation (40%) has lower mid-phase equity', () => {
      const goal = createGoal({ yearsFromNow: 10 });
      const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 40);

      expect(projections.tapering.initialEquity).toBe(40);
      expect(projections.tapering.phases[0].equity).toBe(40);
      expect(projections.tapering.phases[1].equity).toBe(20); // min(40/2, 40) = 20
      expect(projections.tapering.phases[2].equity).toBe(10); // min(40/4, 20) = 10
      expect(projections.tapering.phases[3].equity).toBe(0);
    });

    it('Glide path provides smooth equity reduction', () => {
      const goal = createGoal({ yearsFromNow: 15 });
      const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60);

      // Verify monotonic decrease: 60 -> 30 -> 15 -> 0
      const equities = projections.tapering.phases.map(p => p.equity);
      expect(equities).toEqual([60, 30, 15, 0]);

      // Each step roughly halves equity exposure
      expect(equities[1]).toBe(equities[0] / 2);
      expect(equities[2]).toBe(equities[0] / 4);
    });

    it('Long-term goal uses tapering in SIP calculation', () => {
      const goal = createGoal({
        yearsFromNow: 10,
        targetAmount: 1000000,
        inflationRate: 0
      });
      const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60);

      // Calculate what constant-rate SIP would be (without tapering)
      const constantSIP = calculateRegularSIP(1000000, 8, 120); // 60/40 = 8%

      // Tapering reduces effective returns, so SIP should be HIGHER than constant
      expect(projections.monthlySIP).toBeGreaterThan(constantSIP);

      // Verify round-trip: the calculated SIP should produce the target with tapering
      const fv = calculateSipFVWithTapering(projections.monthlySIP, 120, 60, 10, 5);
      expect(fv).toBeCloseTo(1000000, 0);
    });

    it('Short-term goal does NOT use tapering', () => {
      const goal = createGoal({
        yearsFromNow: 3,
        targetAmount: 500000,
        inflationRate: 0
      });
      const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60);

      // Short-term uses arbitrage rate (6%), not tapering
      expect(projections.category).toBe('short');
      expect(projections.blendedReturn).toBe(6);

      // Verify SIP matches constant-rate calculation
      const constantSIP = calculateRegularSIP(500000, 6, 36);
      expect(projections.monthlySIP).toBeCloseTo(constantSIP, 0);
    });
  });

  describe('Step-up SIP with Tapering', () => {
    it('Returns 0 for invalid inputs', () => {
      expect(calculateStepUpSIPWithTapering(0, 120, 10, 60, 10, 5)).toBe(0);
      expect(calculateStepUpSIPWithTapering(1000000, 0, 10, 60, 10, 5)).toBe(0);
    });

    it('0% step-up equals regular tapering SIP', () => {
      const target = 1000000;
      const months = 120;
      const regularTapering = calculateRegularSIPWithTapering(target, months, 60, 10, 5);
      const stepUpTapering = calculateStepUpSIPWithTapering(target, months, 0, 60, 10, 5);

      expect(stepUpTapering).toBeCloseTo(regularTapering, 2);
    });

    it('Higher step-up reduces starting SIP', () => {
      const target = 1000000;
      const months = 120;
      const sip0 = calculateStepUpSIPWithTapering(target, months, 0, 60, 10, 5);
      const sip5 = calculateStepUpSIPWithTapering(target, months, 5, 60, 10, 5);
      const sip10 = calculateStepUpSIPWithTapering(target, months, 10, 60, 10, 5);

      expect(sip0).toBeGreaterThan(sip5);
      expect(sip5).toBeGreaterThan(sip10);
    });

    it('Round-trip: SIP with step-up and tapering produces correct FV', () => {
      const target = 1000000;
      const months = 120;
      const stepUp = 7;
      const sip = calculateStepUpSIPWithTapering(target, months, stepUp, 60, 10, 5);
      const fv = calculateSipFVWithTaperingAndStepUp(sip, months, stepUp, 60, 10, 5);

      expect(fv).toBeCloseTo(target, 0);
    });

    it('Combined step-up + tapering requires lower starting SIP than tapering alone', () => {
      const target = 1000000;
      const months = 120;
      const taperingOnly = calculateRegularSIPWithTapering(target, months, 60, 10, 5);
      const taperingWithStepUp = calculateStepUpSIPWithTapering(target, months, 10, 60, 10, 5);

      // Step-up means starting lower and increasing, so starting SIP should be less
      expect(taperingWithStepUp).toBeLessThan(taperingOnly);
    });

    it('FV function handles edge cases', () => {
      expect(calculateSipFVWithTaperingAndStepUp(0, 120, 10, 60, 10, 5)).toBe(0);
      expect(calculateSipFVWithTaperingAndStepUp(1000, 0, 10, 60, 10, 5)).toBe(0);
    });
  });

  describe('Integration: Goal Projections with Step-up and Tapering', () => {
    it('Long-term goal with step-up uses combined calculation', () => {
      const goal = createGoal({
        yearsFromNow: 10,
        targetAmount: 1000000,
        inflationRate: 0
      });

      const withStepUp = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60, 10);
      const withoutStepUp = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60, 0);

      // With step-up, starting SIP should be lower
      expect(withStepUp.monthlySIP).toBeLessThan(withoutStepUp.monthlySIP);

      // Verify round-trip
      const fv = calculateSipFVWithTaperingAndStepUp(withStepUp.monthlySIP, 120, 10, 60, 10, 5);
      expect(fv).toBeCloseTo(1000000, 0);
    });

    it('Short-term goal with step-up does NOT use tapering', () => {
      const goal = createGoal({
        yearsFromNow: 3,
        targetAmount: 500000,
        inflationRate: 0
      });

      const withStepUp = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60, 10);
      const expectedSIP = calculateStepUpSIP(500000, 6, 36, 10);

      expect(withStepUp.category).toBe('short');
      expect(withStepUp.monthlySIP).toBeCloseTo(expectedSIP, 0);
    });

    it('Comparison: all four SIP calculation modes for 10-year goal', () => {
      const target = 1000000;
      const months = 120;

      // 1. Constant rate (no tapering, no step-up)
      const constantSIP = calculateRegularSIP(target, 8, months);
      // 2. Step-up only (no tapering)
      const stepUpOnlySIP = calculateStepUpSIP(target, 8, months, 10);
      // 3. Tapering only (no step-up)
      const taperingOnlySIP = calculateRegularSIPWithTapering(target, months, 60, 10, 5);
      // 4. Both tapering and step-up
      const bothSIP = calculateStepUpSIPWithTapering(target, months, 10, 60, 10, 5);

      // Tapering increases required SIP (lower effective return)
      expect(taperingOnlySIP).toBeGreaterThan(constantSIP);
      // Step-up reduces starting SIP
      expect(stepUpOnlySIP).toBeLessThan(constantSIP);
      // Combined: tapering increases, step-up decreases
      expect(bothSIP).toBeLessThan(taperingOnlySIP);
      expect(bothSIP).toBeGreaterThan(stepUpOnlySIP);
    });
  });

  describe('Tapering Golden Values and Phase Boundaries', () => {
    it('Golden value: 24-month goal uses 0% equity throughout', () => {
      // 24 months = 2 years, which is < 3 years remaining
      // So entire period should use 0% equity (pure debt)
      const months = 24;
      const sipAmount = 10000;

      // Manual calculation: 0% equity = 5% debt return
      const pureDebtFV = calculateSipFV(sipAmount, 5, months);
      const taperedFV = calculateSipFVWithTapering(sipAmount, months, 60, 10, 5);

      // Should match pure debt since 0% equity for entire period
      expect(taperedFV).toBeCloseTo(pureDebtFV, 0);
    });

    it('Golden value: 36-month goal starts in 3-5 bucket then tapers to 0%', () => {
      // 36 months = 3 years
      // Month 0: yrsRem = 3, equity = 15% (3-5 bucket)
      // Final months: yrsRem < 3, equity = 0%
      const months = 36;
      const sipAmount = 10000;

      // Verify starting allocation
      expect(getTaperedEquityAllocation(3, 60)).toBe(15);
      expect(getTaperedEquityAllocation(2.5, 60)).toBe(0);

      // FV should be higher than pure debt (because first year has 15% equity)
      const pureDebtFV = calculateSipFV(sipAmount, 5, months);
      const taperedFV = calculateSipFVWithTapering(sipAmount, months, 60, 10, 5);

      expect(taperedFV).toBeGreaterThan(pureDebtFV);
    });

    it('Phase boundary: 96-month goal starts in full equity phase', () => {
      // 96 months = 8 years
      // First ~0 months: 60% equity (8+ years)
      // At 8 years: switch to 30% (5-8 bucket)
      const months = 96;
      const target = 1000000;
      const sip = calculateRegularSIPWithTapering(target, months, 60, 10, 5);

      // Should require more than constant 60/40 due to tapering
      const constantSIP = calculateRegularSIP(target, 8, months);
      expect(sip).toBeGreaterThan(constantSIP);

      // Round-trip verification
      const fv = calculateSipFVWithTapering(sip, months, 60, 10, 5);
      expect(fv).toBeCloseTo(target, 0);
    });

    it('Phase boundary: 60-month goal starts in 5-8 bucket', () => {
      // 60 months = 5 years
      // Starts in 5-8 bucket (30% equity for 60% initial)
      // At 5 years: stays in 5-8 bucket until year 3
      const months = 60;
      const target = 1000000;
      const sip = calculateRegularSIPWithTapering(target, months, 60, 10, 5);

      // Effective return is lower than constant 60/40
      const constantSIP = calculateRegularSIP(target, 8, months);
      expect(sip).toBeGreaterThan(constantSIP);

      // Verify the phase at month 0 (5 years remaining)
      expect(getTaperedEquityAllocation(5, 60)).toBe(30);

      // Round-trip verification
      const fv = calculateSipFVWithTapering(sip, months, 60, 10, 5);
      expect(fv).toBeCloseTo(target, 0);
    });

    it('Phase boundary: 36-month goal starts in 3-5 bucket', () => {
      // 36 months = 3 years
      // Starts in 3-5 bucket (15% equity for 60% initial)
      const months = 36;
      const target = 500000;
      const sip = calculateRegularSIPWithTapering(target, months, 60, 10, 5);

      // Verify the phase at month 0 (3 years remaining)
      expect(getTaperedEquityAllocation(3, 60)).toBe(15);

      // Round-trip verification
      const fv = calculateSipFVWithTapering(sip, months, 60, 10, 5);
      expect(fv).toBeCloseTo(target, 0);
    });

    it('Manual FV verification for month-by-month tapering', () => {
      // Verify a simple case manually
      // 36 months, 60% initial, 10% equity, 5% debt
      // yrsRem at each compounding step determines equity allocation
      const sipAmount = 10000;
      const months = 36;

      // Calculate expected FV manually
      let expectedFV = 0;
      for (let month = 0; month < months; month++) {
        let paymentFV = sipAmount;
        for (let m = months - month; m > 0; m--) {
          const yrsRem = m / 12;
          const eq = getTaperedEquityAllocation(yrsRem, 60);
          const rate = ((eq / 100 * 10) + ((100 - eq) / 100 * 5)) / 100 / 12;
          paymentFV *= (1 + rate);
        }
        expectedFV += paymentFV;
      }

      const calculatedFV = calculateSipFVWithTapering(sipAmount, months, 60, 10, 5);
      expect(calculatedFV).toBeCloseTo(expectedFV, 2);
    });
  });
});

describe('Linked Assets', () => {
  describe('getReturnForCategory', () => {
    it('Returns equity return for equity-like assets', () => {
      expect(getReturnForCategory('Equity Mutual Funds', 10, 5)).toBe(10);
      expect(getReturnForCategory('Stocks', 12, 6)).toBe(12);
      expect(getReturnForCategory('Gold ETFs/SGBs', 11, 5)).toBe(11);
    });

    it('Returns debt return for debt-like assets', () => {
      expect(getReturnForCategory('Debt/Arbitrage Mutual Funds', 10, 5)).toBe(5);
      expect(getReturnForCategory('FDs & RDs', 10, 6)).toBe(6);
    });

    it('Returns 0 for savings bank', () => {
      expect(getReturnForCategory('Savings Bank', 10, 5)).toBe(0);
    });

    it('Returns debt return for unknown categories', () => {
      expect(getReturnForCategory('Unknown', 10, 5)).toBe(5);
      expect(getReturnForCategory('Other', 10, 6)).toBe(6);
    });

    it('Returns debt return for null/undefined category', () => {
      expect(getReturnForCategory(null, 10, 5)).toBe(5);
      expect(getReturnForCategory(undefined, 10, 5)).toBe(5);
    });

    it('Returns debt return for empty string category', () => {
      expect(getReturnForCategory('', 10, 5)).toBe(5);
    });

    it('Is case-sensitive', () => {
      // Lowercase should not match
      expect(getReturnForCategory('equity mutual funds', 10, 5)).toBe(5); // Falls to default
      expect(getReturnForCategory('EQUITY MUTUAL FUNDS', 10, 5)).toBe(5); // Falls to default
    });
  });

  describe('calculateLinkedAssetsFV', () => {
    it('Returns 0 for empty/null inputs', () => {
      expect(calculateLinkedAssetsFV(null, {}, '2035-01-01', 10, 5)).toBe(0);
      expect(calculateLinkedAssetsFV([], {}, '2035-01-01', 10, 5)).toBe(0);
      expect(calculateLinkedAssetsFV([{ assetId: '1', amount: 100000 }], null, '2035-01-01', 10, 5)).toBe(0);
    });

    it('Returns current sum for past target date', () => {
      const linkedAssets = [
        { assetId: '1', amount: 100000 },
        { assetId: '2', amount: 50000 }
      ];
      const assetsData = {
        items: [
          { id: '1', category: 'Equity Mutual Funds', value: 500000 },
          { id: '2', category: 'Debt/Arbitrage Mutual Funds', value: 200000 }
        ]
      };

      const pastDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const result = calculateLinkedAssetsFV(linkedAssets, assetsData, pastDate, 10, 5);

      expect(result).toBe(150000);
    });

    it('Compounds equity assets at equity return', () => {
      const linkedAssets = [{ assetId: '1', amount: 100000 }];
      const assetsData = {
        items: [{ id: '1', category: 'Equity Mutual Funds', value: 500000 }]
      };

      const goal = createGoal({ yearsFromNow: 10 });
      const result = calculateLinkedAssetsFV(linkedAssets, assetsData, goal.targetDate, 10, 5);

      // Should compound at ~10% for 10 years
      expect(result).toBeGreaterThan(250000);
      expect(result).toBeLessThan(280000);
    });

    it('Compounds debt assets at debt return', () => {
      const linkedAssets = [{ assetId: '1', amount: 100000 }];
      const assetsData = {
        items: [{ id: '1', category: 'Debt/Arbitrage Mutual Funds', value: 300000 }]
      };

      const goal = createGoal({ yearsFromNow: 10 });
      const result = calculateLinkedAssetsFV(linkedAssets, assetsData, goal.targetDate, 10, 5);

      // Should compound at ~5% for 10 years
      expect(result).toBeGreaterThan(160000);
      expect(result).toBeLessThan(170000);
    });

    it('Handles multiple linked assets with different categories', () => {
      const linkedAssets = [
        { assetId: '1', amount: 100000 },
        { assetId: '2', amount: 100000 }
      ];
      const assetsData = {
        items: [
          { id: '1', category: 'Equity Mutual Funds', value: 500000 },
          { id: '2', category: 'FDs & RDs', value: 200000 }
        ]
      };

      const goal = createGoal({ yearsFromNow: 10 });
      const result = calculateLinkedAssetsFV(linkedAssets, assetsData, goal.targetDate, 10, 5);

      // Equity ~260k + Debt ~165k = ~425k
      expect(result).toBeGreaterThan(400000);
      expect(result).toBeLessThan(450000);
    });

    it('Skips missing assets', () => {
      const linkedAssets = [
        { assetId: '1', amount: 100000 },
        { assetId: 'missing', amount: 50000 }
      ];
      const assetsData = {
        items: [{ id: '1', category: 'Equity Mutual Funds', value: 500000 }]
      };

      const goal = createGoal({ yearsFromNow: 10 });
      const result = calculateLinkedAssetsFV(linkedAssets, assetsData, goal.targetDate, 10, 5);

      // Only the equity asset should be counted
      expect(result).toBeGreaterThan(250000);
      expect(result).toBeLessThan(280000);
    });
  });

  describe('Goal Projections with Linked Assets', () => {
    it('Linked assets reduce required SIP', () => {
      const goal = createGoal({
        yearsFromNow: 10,
        targetAmount: 1000000,
        inflationRate: 0
      });

      // Add linked assets
      goal.linkedAssets = [{ assetId: '1', amount: 300000 }];

      const assetsData = {
        items: [{ id: '1', category: 'Equity Mutual Funds', value: 500000 }]
      };

      const withLinked = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60, 0, assetsData);

      // Goal without linked assets
      const goalNoLinked = { ...goal, linkedAssets: [] };
      const withoutLinked = calculateUnifiedGoalProjections(goalNoLinked, 10, 5, 6, 60, 0, null);

      // Linked assets should reduce gap and SIP
      expect(withLinked.linkedAssetsFV).toBeGreaterThan(0);
      expect(withLinked.gapAmount).toBeLessThan(withoutLinked.inflationAdjustedTarget);
      expect(withLinked.monthlySIP).toBeLessThan(withoutLinked.monthlySIP);
    });

    it('Returns zero SIP when linked assets cover entire goal', () => {
      const goal = createGoal({
        yearsFromNow: 10,
        targetAmount: 100000, // Small target
        inflationRate: 0
      });

      // Link more than needed
      goal.linkedAssets = [{ assetId: '1', amount: 100000 }];

      const assetsData = {
        items: [{ id: '1', category: 'Equity Mutual Funds', value: 500000 }]
      };

      const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60, 0, assetsData);

      // ₹1L at 10% for 10 years = ~₹2.6L which exceeds ₹1L target
      expect(projections.linkedAssetsFV).toBeGreaterThan(100000);
      expect(projections.gapAmount).toBe(0);
      expect(projections.monthlySIP).toBe(0);
    });

    it('Includes linked assets count in projections', () => {
      const goal = createGoal({ yearsFromNow: 10 });
      goal.linkedAssets = [
        { assetId: '1', amount: 100000 },
        { assetId: '2', amount: 50000 }
      ];

      const assetsData = {
        items: [
          { id: '1', category: 'Equity Mutual Funds', value: 500000 },
          { id: '2', category: 'Debt/Arbitrage Mutual Funds', value: 200000 }
        ]
      };

      const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60, 0, assetsData);

      expect(projections.linkedAssetsCount).toBe(2);
    });

    it('Works without assetsData (backwards compatible)', () => {
      const goal = createGoal({ yearsFromNow: 10 });
      goal.linkedAssets = [{ assetId: '1', amount: 100000 }];

      // No assetsData provided
      const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60, 0);

      expect(projections.linkedAssetsFV).toBe(0);
      expect(projections.gapAmount).toBe(projections.inflationAdjustedTarget);
    });

    it('Goal with no linkedAssets has full SIP requirement', () => {
      const goal = createGoal({
        yearsFromNow: 10,
        targetAmount: 1000000,
        inflationRate: 0
      });
      // No linkedAssets at all
      const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60, 0, null);

      expect(projections.linkedAssetsFV).toBe(0);
      expect(projections.linkedAssetsCount).toBe(0);
      expect(projections.gapAmount).toBe(projections.inflationAdjustedTarget);
      expect(projections.monthlySIP).toBeGreaterThan(0);
    });

    it('Goal with empty linkedAssets array has full SIP requirement', () => {
      const goal = createGoal({
        yearsFromNow: 10,
        targetAmount: 1000000,
        inflationRate: 0
      });
      goal.linkedAssets = [];

      const assetsData = {
        items: [{ id: '1', category: 'Equity Mutual Funds', value: 500000 }]
      };

      const projections = calculateUnifiedGoalProjections(goal, 10, 5, 6, 60, 0, assetsData);

      expect(projections.linkedAssetsFV).toBe(0);
      expect(projections.linkedAssetsCount).toBe(0);
      expect(projections.gapAmount).toBe(projections.inflationAdjustedTarget);
    });

    it('Compares SIP: goal with linked assets vs goal without linked assets', () => {
      // Same goal parameters
      const targetAmount = 1000000;
      const yearsFromNow = 10;
      const linkedAmount = 200000; // Link ₹2L of equity MF

      // Goal WITHOUT linked assets
      const goalWithout = createGoal({
        yearsFromNow,
        targetAmount,
        inflationRate: 0
      });
      goalWithout.linkedAssets = [];

      // Goal WITH linked assets
      const goalWith = createGoal({
        yearsFromNow,
        targetAmount,
        inflationRate: 0
      });
      goalWith.linkedAssets = [{ assetId: 'equity-1', amount: linkedAmount }];

      const assetsData = {
        items: [{ id: 'equity-1', category: 'Equity Mutual Funds', value: 500000 }]
      };

      const projWithout = calculateUnifiedGoalProjections(goalWithout, 10, 5, 6, 60, 0, assetsData);
      const projWith = calculateUnifiedGoalProjections(goalWith, 10, 5, 6, 60, 0, assetsData);

      // Without linked assets: full target needs to be covered by SIP
      expect(projWithout.linkedAssetsFV).toBe(0);
      expect(projWithout.gapAmount).toBe(targetAmount);
      expect(projWithout.monthlySIP).toBeGreaterThan(0);

      // With linked assets: reduced gap and lower SIP
      expect(projWith.linkedAssetsFV).toBeGreaterThan(0);
      expect(projWith.gapAmount).toBeLessThan(targetAmount);
      expect(projWith.monthlySIP).toBeLessThan(projWithout.monthlySIP);

      // Verify the reduction is significant (linked ₹2L at 10% for 10 years ≈ ₹5.2L)
      // So gap should be reduced by roughly ₹5.2L
      const expectedFV = linkedAmount * Math.pow(1 + 0.10 / 12, 120); // Approx compound
      expect(projWith.linkedAssetsFV).toBeCloseTo(expectedFV, -4); // Within ₹10k
      expect(projWith.gapAmount).toBeCloseTo(targetAmount - expectedFV, -4);

      // SIP reduction should be proportional
      const sipReductionPercent = (projWithout.monthlySIP - projWith.monthlySIP) / projWithout.monthlySIP * 100;
      expect(sipReductionPercent).toBeGreaterThan(30); // At least 30% reduction
    });

    it('Multiple goals: one with linked assets, one without', () => {
      const assetsData = {
        items: [
          { id: 'equity-1', category: 'Equity Mutual Funds', value: 500000 },
          { id: 'debt-1', category: 'Debt/Arbitrage Mutual Funds', value: 300000 }
        ]
      };

      // Goal 1: No linked assets
      const goal1 = createGoal({
        yearsFromNow: 10,
        targetAmount: 1000000,
        inflationRate: 0
      });
      goal1.linkedAssets = [];

      // Goal 2: Has linked assets
      const goal2 = createGoal({
        yearsFromNow: 10,
        targetAmount: 1000000,
        inflationRate: 0
      });
      goal2.linkedAssets = [
        { assetId: 'equity-1', amount: 150000 },
        { assetId: 'debt-1', amount: 100000 }
      ];

      const proj1 = calculateUnifiedGoalProjections(goal1, 10, 5, 6, 60, 0, assetsData);
      const proj2 = calculateUnifiedGoalProjections(goal2, 10, 5, 6, 60, 0, assetsData);

      // Goal 1: Full SIP needed
      expect(proj1.linkedAssetsCount).toBe(0);
      expect(proj1.linkedAssetsFV).toBe(0);

      // Goal 2: Reduced SIP due to linked assets
      expect(proj2.linkedAssetsCount).toBe(2);
      expect(proj2.linkedAssetsFV).toBeGreaterThan(0);
      expect(proj2.monthlySIP).toBeLessThan(proj1.monthlySIP);
    });
  });

  describe('Retirement Goals with EPF/NPS AND Linked Assets', () => {
    it('Retirement goal with both EPF/NPS and linked assets has reduced SIP', () => {
      const goal = createGoal({
        yearsFromNow: 20,
        targetAmount: 50000000, // 5 Cr
        inflationRate: 6,
        goalType: 'retirement',
        includeEpfNps: true
      });
      goal.linkedAssets = [{ assetId: 'equity-1', amount: 500000 }];

      const assetsData = {
        items: [{ id: 'equity-1', category: 'Equity Mutual Funds', value: 1000000 }]
      };

      const contributions = {
        monthlyEpf: 20000,
        monthlyNps: 10000,
        epfCorpus: 1000000,
        npsCorpus: 500000,
        totalMonthly: 30000,
        totalCorpus: 1500000
      };

      // With EPF/NPS only
      const goalNoLinked = { ...goal, linkedAssets: [] };
      const projEpfOnly = calculateRetirementProjectionsWithEpfNps(
        goalNoLinked, contributions, 10, 5, 6, 60, 8, 9, 5, 5, null
      );

      // With EPF/NPS AND linked assets
      const projBoth = calculateRetirementProjectionsWithEpfNps(
        goal, contributions, 10, 5, 6, 60, 8, 9, 5, 5, assetsData
      );

      // Both should reduce SIP compared to base
      expect(projEpfOnly.epfNps).not.toBeNull();
      expect(projBoth.epfNps).not.toBeNull();

      // Linked assets should further reduce SIP beyond EPF/NPS
      expect(projBoth.linkedAssetsFV).toBeGreaterThan(0);
      expect(projBoth.gapAmount).toBeLessThan(projEpfOnly.gapAmount);
      expect(projBoth.monthlySIP).toBeLessThan(projEpfOnly.monthlySIP);
    });

    it('EPF/NPS + linked assets can fully cover retirement goal', () => {
      const goal = createGoal({
        yearsFromNow: 25,
        targetAmount: 10000000, // 1 Cr - achievable target
        inflationRate: 5,
        goalType: 'retirement',
        includeEpfNps: true
      });
      goal.linkedAssets = [
        { assetId: 'equity-1', amount: 2000000 }, // 20L
        { assetId: 'debt-1', amount: 500000 }     // 5L
      ];

      const assetsData = {
        items: [
          { id: 'equity-1', category: 'Equity Mutual Funds', value: 3000000 },
          { id: 'debt-1', category: 'Debt/Arbitrage Mutual Funds', value: 1000000 }
        ]
      };

      const contributions = {
        monthlyEpf: 30000,
        monthlyNps: 20000,
        epfCorpus: 2000000,
        npsCorpus: 1000000,
        totalMonthly: 50000,
        totalCorpus: 3000000
      };

      const proj = calculateRetirementProjectionsWithEpfNps(
        goal, contributions, 10, 5, 6, 60, 8, 9, 5, 5, assetsData
      );

      // With high contributions and linked assets, gap could be 0
      expect(proj.epfNps.totalEpfNpsFV).toBeGreaterThan(0);
      expect(proj.linkedAssetsFV).toBeGreaterThan(0);
      // SIP should be very low or zero
      expect(proj.monthlySIP).toBeLessThan(proj.inflationAdjustedTarget * 0.01);
    });

    it('Non-retirement goal ignores EPF/NPS but uses linked assets', () => {
      const goal = createGoal({
        yearsFromNow: 10,
        targetAmount: 2000000,
        inflationRate: 6,
        goalType: 'one-time' // Not retirement
      });
      goal.linkedAssets = [{ assetId: 'equity-1', amount: 300000 }];

      const assetsData = {
        items: [{ id: 'equity-1', category: 'Equity Mutual Funds', value: 500000 }]
      };

      const contributions = {
        monthlyEpf: 20000,
        monthlyNps: 10000,
        epfCorpus: 1000000,
        npsCorpus: 500000,
        totalMonthly: 30000,
        totalCorpus: 1500000
      };

      const proj = calculateRetirementProjectionsWithEpfNps(
        goal, contributions, 10, 5, 6, 60, 8, 9, 5, 5, assetsData
      );

      // EPF/NPS should be ignored (not retirement)
      expect(proj.epfNps).toBeNull();
      // But linked assets should still be used
      expect(proj.linkedAssetsFV).toBeGreaterThan(0);
    });

    it('Retirement goal with includeEpfNps=false uses only linked assets', () => {
      const goal = createGoal({
        yearsFromNow: 20,
        targetAmount: 20000000,
        inflationRate: 6,
        goalType: 'retirement',
        includeEpfNps: false // Explicitly disabled
      });
      goal.linkedAssets = [{ assetId: 'equity-1', amount: 500000 }];

      const assetsData = {
        items: [{ id: 'equity-1', category: 'Equity Mutual Funds', value: 1000000 }]
      };

      const contributions = {
        monthlyEpf: 20000,
        monthlyNps: 10000,
        epfCorpus: 1000000,
        npsCorpus: 500000,
        totalMonthly: 30000,
        totalCorpus: 1500000
      };

      const proj = calculateRetirementProjectionsWithEpfNps(
        goal, contributions, 10, 5, 6, 60, 8, 9, 5, 5, assetsData
      );

      // EPF/NPS should be ignored
      expect(proj.epfNps).toBeNull();
      // Linked assets should still work
      expect(proj.linkedAssetsFV).toBeGreaterThan(0);
    });
  });

  describe('calculateLinkedAssetsFV Edge Cases', () => {
    it('Asset with zero amount returns 0 contribution', () => {
      const linkedAssets = [{ assetId: '1', amount: 0 }];
      const assetsData = {
        items: [{ id: '1', category: 'Equity Mutual Funds', value: 500000 }]
      };

      const goal = createGoal({ yearsFromNow: 10 });
      const result = calculateLinkedAssetsFV(linkedAssets, assetsData, goal.targetDate, 10, 5);

      expect(result).toBe(0);
    });

    it('Savings Bank uses 0% return', () => {
      const linkedAssets = [{ assetId: '1', amount: 100000 }];
      const assetsData = {
        items: [{ id: '1', category: 'Savings Bank', value: 200000 }]
      };

      const goal = createGoal({ yearsFromNow: 10 });
      const result = calculateLinkedAssetsFV(linkedAssets, assetsData, goal.targetDate, 10, 5);

      // 0% return means no growth - should be exactly 100000
      expect(result).toBe(100000);
    });

    it('FDs use debt return rate', () => {
      const linkedAssets = [{ assetId: '1', amount: 100000 }];
      const assetsData = {
        items: [{ id: '1', category: 'FDs & RDs', value: 200000 }]
      };

      const goal = createGoal({ yearsFromNow: 10 });
      const resultDebt5 = calculateLinkedAssetsFV(linkedAssets, assetsData, goal.targetDate, 10, 5);
      const resultDebt7 = calculateLinkedAssetsFV(linkedAssets, assetsData, goal.targetDate, 10, 7);

      // Higher debt return should produce higher FV
      expect(resultDebt7).toBeGreaterThan(resultDebt5);
    });

    it('Handles very distant future target date', () => {
      const linkedAssets = [{ assetId: '1', amount: 100000 }];
      const assetsData = {
        items: [{ id: '1', category: 'Equity Mutual Funds', value: 500000 }]
      };

      const goal = createGoal({ yearsFromNow: 50 });
      const result = calculateLinkedAssetsFV(linkedAssets, assetsData, goal.targetDate, 10, 5);

      // Should compound significantly - ~117x at 10% for 50 years
      expect(result).toBeGreaterThan(10000000);
      expect(Number.isFinite(result)).toBe(true);
    });

    it('Handles linked amount greater than asset value (theoretical)', () => {
      // This shouldn't happen in practice but test defensive behavior
      const linkedAssets = [{ assetId: '1', amount: 1000000 }]; // More than asset value
      const assetsData = {
        items: [{ id: '1', category: 'Equity Mutual Funds', value: 500000 }]
      };

      const goal = createGoal({ yearsFromNow: 10 });
      const result = calculateLinkedAssetsFV(linkedAssets, assetsData, goal.targetDate, 10, 5);

      // Should still calculate FV based on linked amount
      expect(result).toBeGreaterThan(0);
      expect(Number.isFinite(result)).toBe(true);
    });
  });
});
