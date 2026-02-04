// Financial calculation functions

// Unified Portfolio Constants
export const UNIFIED_PORTFOLIO = {
  SHORT_TERM_THRESHOLD: 5, // years
  LONG_TERM: {
    equity: 60,
    debt: 40,
    // Equity split: 70% Nifty 50, 30% Nifty Next 50
    equitySplit: { nifty50: 70, niftyNext50: 30 }
  },
  SHORT_TERM: {
    // 100% Equity Arbitrage (treated as debt for risk, equity for tax)
    arbitrage: 100
  }
};

/**
 * Get unified portfolio category based on years remaining
 * @returns 'short' for < 5 years, 'long' for >= 5 years
 */
export function getUnifiedCategory(targetDate) {
  const years = getYearsRemaining(targetDate);
  return years < UNIFIED_PORTFOLIO.SHORT_TERM_THRESHOLD ? 'short' : 'long';
}

/**
 * Get blended return for unified portfolio category
 * Short term: Uses arbitrage return (Arbitrage fund)
 * Long term: Uses configurable equity/debt allocation
 */
export function getUnifiedBlendedReturn(category, equityReturn, debtReturn, arbitrageReturn, equityAllocation = 60) {
  if (category === 'short') {
    return arbitrageReturn ?? debtReturn; // Arbitrage fund (fallback to debt for backward compatibility)
  }
  // Long term: configurable equity/debt split
  const debtAllocation = 100 - equityAllocation;
  return (equityAllocation / 100 * equityReturn) +
         (debtAllocation / 100 * debtReturn);
}

/**
 * Calculate unified goal projections (simplified - no glide path)
 */
export function calculateUnifiedGoalProjections(goal, equityReturn, debtReturn, arbitrageReturn, equityAllocation = 60) {
  const years = getYearsRemaining(goal.targetDate);
  const months = getMonthsRemaining(goal.targetDate);
  const category = getUnifiedCategory(goal.targetDate);

  // Inflation-adjusted target
  const inflationAdjustedTarget = calculateInflationAdjustedAmount(
    goal.targetAmount,
    goal.inflationRate,
    years
  );

  // Blended return based on category
  const blendedReturn = getUnifiedBlendedReturn(category, equityReturn, debtReturn, arbitrageReturn, equityAllocation);

  // Calculate required SIP (no step-up in unified model)
  const monthlySIP = calculateRegularSIP(inflationAdjustedTarget, blendedReturn, months);

  return {
    years,
    months,
    category,
    inflationAdjustedTarget,
    blendedReturn,
    monthlySIP
  };
}

/**
 * Calculate years remaining until target date
 */
export function getYearsRemaining(targetDate) {
  const now = new Date();
  const target = new Date(targetDate);
  const diffTime = target - now;
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, diffYears);
}

/**
 * Calculate months remaining until target date
 */
export function getMonthsRemaining(targetDate) {
  return Math.max(0, Math.floor(getYearsRemaining(targetDate) * 12));
}

/**
 * Calculate inflation-adjusted future value
 * FV = PV × (1 + r)^n
 */
export function calculateInflationAdjustedAmount(presentValue, inflationRate, years) {
  if (years <= 0) return presentValue;
  return presentValue * Math.pow(1 + inflationRate / 100, years);
}

/**
 * Calculate blended annual return rate
 */
export function calculateBlendedReturn(equityPercent, equityReturn, debtPercent, debtReturn) {
  return (equityPercent / 100 * equityReturn) + (debtPercent / 100 * debtReturn);
}

/**
 * Calculate future value of a lump sum investment
 * FV = PV × (1 + r)^n
 */
export function calculateLumpsumFV(principal, annualRate, years) {
  if (years <= 0 || principal <= 0) return principal;
  const monthlyRate = annualRate / 100 / 12;
  const months = Math.round(years * 12);
  return principal * Math.pow(1 + monthlyRate, months);
}

/**
 * Calculate total amount invested (without compounding)
 */
export function calculateTotalInvested(investments, initialLumpsum) {
  let total = parseFloat(initialLumpsum) || 0;
  if (investments && investments.length > 0) {
    total += investments.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
  }
  return total;
}

/**
 * Calculate future value of existing investments (corpus)
 * Each investment compounds from its date to the target date
 */
export function calculateCurrentCorpus(investments, annualRate, targetDate, initialLumpsum, startDate) {
  const now = new Date();
  let corpus = 0;
  const lumpsum = parseFloat(initialLumpsum) || 0;

  // Add initial lumpsum compounded from start date to now
  if (lumpsum > 0 && startDate) {
    const startDateObj = new Date(startDate);
    const monthsSinceStart = Math.max(0, (now - startDateObj) / (1000 * 60 * 60 * 24 * 30.44));
    const monthlyRate = annualRate / 100 / 12;
    corpus += lumpsum * Math.pow(1 + monthlyRate, monthsSinceStart);
  }

  // Add each logged investment compounded from its date to now
  if (investments && investments.length > 0) {
    const monthlyRate = annualRate / 100 / 12;
    investments.forEach(inv => {
      const invDate = new Date(inv.date);
      const monthsSinceInv = Math.max(0, (now - invDate) / (1000 * 60 * 60 * 24 * 30.44));
      const amount = parseFloat(inv.amount) || 0;
      corpus += amount * Math.pow(1 + monthlyRate, monthsSinceInv);
    });
  }

  return corpus;
}

/**
 * Calculate future value of current corpus at target date
 */
export function calculateCorpusFV(currentCorpus, annualRate, targetDate) {
  const years = getYearsRemaining(targetDate);
  return calculateLumpsumFV(currentCorpus, annualRate, years);
}

/**
 * Calculate regular SIP (no step-up) using Future Value of Annuity formula
 * PMT = FV × r / ((1 + r)^n - 1)
 */
export function calculateRegularSIP(futureValue, annualRate, months) {
  if (futureValue <= 0 || months <= 0) return 0;

  const monthlyRate = annualRate / 100 / 12;

  if (monthlyRate === 0) {
    return futureValue / months;
  }

  // FV of annuity: FV = PMT × ((1 + r)^n - 1) / r × (1 + r)
  // Solving for PMT: PMT = FV × r / (((1 + r)^n - 1) × (1 + r))
  const factor = Math.pow(1 + monthlyRate, months);
  return futureValue * monthlyRate / ((factor - 1) * (1 + monthlyRate));
}

/**
 * Calculate SIP with annual step-up
 * Uses iterative approach to find the starting monthly SIP
 * that will accumulate to the target future value
 */
export function calculateStepUpSIP(futureValue, annualRate, months, annualStepUp) {
  if (futureValue <= 0 || months <= 0) return 0;
  if (annualStepUp === 0) return calculateRegularSIP(futureValue, annualRate, months);

  const monthlyRate = annualRate / 100 / 12;
  const stepUpRate = annualStepUp / 100;
  const years = Math.ceil(months / 12);

  // Binary search for the starting SIP amount
  // Always return a SIP that delivers >= target (conservative approach)
  let low = 0;
  let high = futureValue / months * 2; // Upper bound estimate
  const tolerance = 0.01;

  for (let iterations = 0; iterations < 100; iterations++) {
    const mid = (low + high) / 2;
    const fv = calculateStepUpSIPFutureValue(mid, monthlyRate, months, stepUpRate);

    if (Math.abs(fv - futureValue) < tolerance) {
      // Within tolerance - return mid if it meets target, otherwise nudge up
      return fv >= futureValue ? mid : mid + 0.01;
    }

    if (fv < futureValue) {
      low = mid;
    } else {
      high = mid;
    }
  }

  // Return high (not midpoint) to ensure we meet/exceed target
  return high;
}

/**
 * Calculate future value of step-up SIP payments
 */
function calculateStepUpSIPFutureValue(startingSIP, monthlyRate, totalMonths, stepUpRate) {
  let fv = 0;
  let currentSIP = startingSIP;
  let monthsProcessed = 0;

  while (monthsProcessed < totalMonths) {
    // Process 12 months (or remaining months) at current SIP
    const monthsThisYear = Math.min(12, totalMonths - monthsProcessed);

    for (let m = 0; m < monthsThisYear; m++) {
      const remainingMonths = totalMonths - monthsProcessed - m;
      // Each payment compounds for remaining months
      if (monthlyRate === 0) {
        fv += currentSIP;
      } else {
        fv += currentSIP * Math.pow(1 + monthlyRate, remainingMonths);
      }
    }

    monthsProcessed += monthsThisYear;
    // Step up for next year
    currentSIP *= (1 + stepUpRate);
  }

  return fv;
}

/**
 * Get goal category based on years remaining (unified 2-category system)
 */
export function getGoalCategory(targetDate) {
  return getUnifiedCategory(targetDate);
}

/**
 * Get category display name (unified 2-category system)
 */
export function getCategoryDisplay(category) {
  const displays = {
    long: 'Long Term (5+ yrs)',
    short: 'Short Term (< 5 yrs)'
  };
  return displays[category] || 'Unknown';
}


// EPF and NPS return rates (defaults)
export const EPF_RETURN = 8;
export const NPS_RETURN = 9;

/**
 * Calculate future value of EPF/NPS corpus at target date
 */
export function calculateEpfNpsCorpusFV(epfCorpus, npsCorpus, targetDate, epfReturn = EPF_RETURN, npsReturn = NPS_RETURN) {
  const years = getYearsRemaining(targetDate);
  if (years <= 0) return epfCorpus + npsCorpus;

  const epfFV = calculateLumpsumFV(epfCorpus, epfReturn, years);
  const npsFV = calculateLumpsumFV(npsCorpus, npsReturn, years);

  return epfFV + npsFV;
}

/**
 * Calculate future value of monthly EPF/NPS SIP contributions
 * FV = PMT * ((1 + r)^n - 1) / r * (1 + r)
 */
export function calculateEpfNpsSipFV(monthlyEpf, monthlyNps, targetDate, epfReturn = EPF_RETURN, npsReturn = NPS_RETURN) {
  const months = getMonthsRemaining(targetDate);
  if (months <= 0) return 0;

  const epfMonthlyRate = epfReturn / 100 / 12;
  const npsMonthlyRate = npsReturn / 100 / 12;

  let epfSipFV = 0;
  let npsSipFV = 0;

  if (monthlyEpf > 0) {
    if (epfMonthlyRate === 0) {
      epfSipFV = monthlyEpf * months;
    } else {
      const factor = Math.pow(1 + epfMonthlyRate, months);
      epfSipFV = monthlyEpf * ((factor - 1) / epfMonthlyRate) * (1 + epfMonthlyRate);
    }
  }

  if (monthlyNps > 0) {
    if (npsMonthlyRate === 0) {
      npsSipFV = monthlyNps * months;
    } else {
      const factor = Math.pow(1 + npsMonthlyRate, months);
      npsSipFV = monthlyNps * ((factor - 1) / npsMonthlyRate) * (1 + npsMonthlyRate);
    }
  }

  return epfSipFV + npsSipFV;
}

/**
 * Calculate future value of monthly EPF/NPS SIP contributions with annual step-up
 * Contributions increase annually by stepUpRate (reflecting salary growth)
 */
export function calculateEpfNpsSipFVWithStepUp(monthlyEpf, monthlyNps, targetDate, annualStepUp, epfReturn = EPF_RETURN, npsReturn = NPS_RETURN) {
  const totalMonths = getMonthsRemaining(targetDate);
  if (totalMonths <= 0) return 0;
  if (annualStepUp === 0) return calculateEpfNpsSipFV(monthlyEpf, monthlyNps, targetDate, epfReturn, npsReturn);

  const epfMonthlyRate = epfReturn / 100 / 12;
  const npsMonthlyRate = npsReturn / 100 / 12;
  const stepUpRate = annualStepUp / 100;

  let epfSipFV = 0;
  let npsSipFV = 0;
  let currentEpf = monthlyEpf;
  let currentNps = monthlyNps;
  let monthInYear = 0;

  for (let month = 0; month < totalMonths; month++) {
    const remainingMonths = totalMonths - month;

    // EPF contribution compounded to end
    if (currentEpf > 0) {
      epfSipFV += currentEpf * Math.pow(1 + epfMonthlyRate, remainingMonths);
    }

    // NPS contribution compounded to end
    if (currentNps > 0) {
      npsSipFV += currentNps * Math.pow(1 + npsMonthlyRate, remainingMonths);
    }

    monthInYear++;

    // Annual step-up
    if (monthInYear >= 12) {
      currentEpf *= (1 + stepUpRate);
      currentNps *= (1 + stepUpRate);
      monthInYear = 0;
    }
  }

  return epfSipFV + npsSipFV;
}

/**
 * Calculate retirement goal projections with EPF/NPS contributions (unified portfolio)
 * Returns projections with EPF/NPS breakdown for retirement goals
 */
export function calculateRetirementProjectionsWithEpfNps(goal, retirementContributions, equityReturn, debtReturn, arbitrageReturn, equityAllocation = 60, epfReturn = EPF_RETURN, npsReturn = NPS_RETURN) {
  const baseProjections = calculateUnifiedGoalProjections(goal, equityReturn, debtReturn, arbitrageReturn, equityAllocation);

  if (goal.goalType !== 'retirement' || !retirementContributions) {
    return {
      ...baseProjections,
      epfNps: null
    };
  }

  const { monthlyEpf, monthlyNps, epfCorpus, npsCorpus, totalMonthly, totalCorpus } = retirementContributions;

  // If no EPF/NPS, return base projections
  if (totalMonthly === 0 && totalCorpus === 0) {
    return {
      ...baseProjections,
      epfNps: null
    };
  }

  // Calculate FV of EPF/NPS corpus
  const epfNpsCorpusFV = calculateEpfNpsCorpusFV(epfCorpus, npsCorpus, goal.targetDate, epfReturn, npsReturn);

  // Calculate FV of EPF/NPS SIP contributions (with step-up based on epfNpsStepUp flag)
  // Use 7% as default step-up rate for salary growth
  const stepUpRate = goal.epfNpsStepUp ? 7 : 0;
  const epfNpsSipFV = stepUpRate > 0
    ? calculateEpfNpsSipFVWithStepUp(monthlyEpf, monthlyNps, goal.targetDate, stepUpRate, epfReturn, npsReturn)
    : calculateEpfNpsSipFV(monthlyEpf, monthlyNps, goal.targetDate, epfReturn, npsReturn);

  // Total contribution from EPF/NPS at goal date
  const totalEpfNpsFV = epfNpsCorpusFV + epfNpsSipFV;

  // Recalculate gap amount after accounting for EPF/NPS
  const adjustedGapAmount = Math.max(0, baseProjections.inflationAdjustedTarget - totalEpfNpsFV);

  // Recalculate required SIP for remaining gap
  const adjustedMonthlySIP = adjustedGapAmount > 0
    ? calculateRegularSIP(adjustedGapAmount, baseProjections.blendedReturn, baseProjections.months)
    : 0;

  return {
    ...baseProjections,
    // Override with adjusted values
    gapAmount: adjustedGapAmount,
    monthlySIP: adjustedMonthlySIP,
    // EPF/NPS details
    epfNps: {
      monthlyEpf,
      monthlyNps,
      totalMonthly,
      epfCorpus,
      npsCorpus,
      totalCorpus,
      epfNpsCorpusFV,
      epfNpsSipFV,
      totalEpfNpsFV,
      epfReturn,
      npsReturn,
      stepUpEnabled: goal.epfNpsStepUp || false,
      stepUpRate: stepUpRate
    }
  };
}
