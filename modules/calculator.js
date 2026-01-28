// Financial calculation functions

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
  let low = 0;
  let high = futureValue / months * 2; // Upper bound estimate
  const tolerance = 0.01;

  for (let iterations = 0; iterations < 100; iterations++) {
    const mid = (low + high) / 2;
    const fv = calculateStepUpSIPFutureValue(mid, monthlyRate, months, stepUpRate);

    if (Math.abs(fv - futureValue) < tolerance) {
      return mid;
    }

    if (fv < futureValue) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
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
 * Get goal category based on years remaining
 */
export function getGoalCategory(targetDate) {
  const years = getYearsRemaining(targetDate);

  if (years >= 8) return 'long';
  if (years >= 3) return 'mid';
  return 'short';
}

/**
 * Get category display name
 */
export function getCategoryDisplay(category) {
  const displays = {
    long: 'Long Term',
    mid: 'Mid Term',
    short: 'Short Term'
  };
  return displays[category] || 'Unknown';
}

/**
 * Get maximum equity allocation based on category and years remaining
 * Implements glide path for short-term goals
 *
 * For retirement goals: minimum 30% equity at retirement (corpus consumed over time)
 * For one-time goals: 0% equity 2 years before goal (entire corpus consumed at once)
 */
export function getMaxEquity(targetDate, goalType = 'one-time') {
  const years = getYearsRemaining(targetDate);
  const isRetirement = goalType === 'retirement';
  const minEquity = isRetirement ? 30 : 0;

  if (years >= 8) return 70;  // Long term
  if (years >= 3) return Math.max(40, minEquity);  // Mid term

  // Short term - glide path
  if (isRetirement) {
    // Retirement: gradual reduction to 30%
    if (years >= 2) return 40;
    if (years >= 1) return 35;
    return 30;  // At retirement - maintain 30% equity
  } else {
    // One-time goals: reach 0% equity 2 years before goal
    if (years >= 2) return 0;  // 2+ years before - move to 0% equity
    return 0;  // Less than 2 years - stay at 0% equity
  }
}

/**
 * Constrain equity allocation to maximum allowed
 */
export function constrainEquityAllocation(equityPercent, targetDate, goalType = 'one-time') {
  const maxEquity = getMaxEquity(targetDate, goalType);
  return Math.min(equityPercent, maxEquity);
}

/**
 * Check if goal needs rebalancing alert
 */
export function needsRebalanceAlert(goal) {
  if (!goal.targetDate) return false;

  const maxEquity = getMaxEquity(goal.targetDate, goal.goalType);
  const currentEquity = goal.equityPercent || 0;

  // Alert if current equity exceeds max by more than 5%
  return currentEquity > maxEquity + 5;
}

/**
 * Calculate complete goal projections
 */
export function calculateGoalProjections(goal) {
  const years = getYearsRemaining(goal.targetDate);
  const months = getMonthsRemaining(goal.targetDate);

  // Inflation-adjusted target
  const inflationAdjustedTarget = calculateInflationAdjustedAmount(
    goal.targetAmount,
    goal.inflationRate,
    years
  );

  // Blended return
  const blendedReturn = calculateBlendedReturn(
    goal.equityPercent,
    goal.equityReturn,
    goal.debtPercent,
    goal.debtReturn
  );

  // Total amount invested (for display)
  const totalInvested = calculateTotalInvested(
    goal.investments,
    goal.initialLumpsum || 0
  );

  // Current corpus value (compounded for calculations)
  const currentCorpus = calculateCurrentCorpus(
    goal.investments,
    blendedReturn,
    goal.targetDate,
    goal.initialLumpsum || 0,
    goal.startDate
  );

  // Future value of current corpus at goal date
  const corpusFV = calculateCorpusFV(currentCorpus, blendedReturn, goal.targetDate);

  // Gap to cover with SIP
  const gapAmount = Math.max(0, inflationAdjustedTarget - corpusFV);

  // Calculate SIP needed
  const monthlySIP = calculateStepUpSIP(
    gapAmount,
    blendedReturn,
    months,
    goal.annualStepUp || 0
  );

  // Category and max equity
  const category = getGoalCategory(goal.targetDate);
  const maxEquity = getMaxEquity(goal.targetDate, goal.goalType);
  const needsRebalance = needsRebalanceAlert(goal);

  return {
    years,
    months,
    inflationAdjustedTarget,
    blendedReturn,
    totalInvested,
    currentCorpus,
    corpusFV,
    gapAmount,
    monthlySIP,
    category,
    maxEquity,
    needsRebalance,
    investmentCount: (goal.investments?.length || 0) + (goal.initialLumpsum > 0 ? 1 : 0)
  };
}
