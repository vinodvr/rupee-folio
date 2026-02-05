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
 * Get tapered equity allocation based on years remaining
 * Implements glide path: full equity -> reduced -> 0% near goal
 * @param yearsRemaining - Years until goal deadline
 * @param initialEquity - Initial equity allocation percentage
 * @returns Equity allocation percentage for this phase
 */
export function getTaperedEquityAllocation(yearsRemaining, initialEquity) {
  if (yearsRemaining >= 8) return initialEquity;
  if (yearsRemaining >= 5) return Math.floor(Math.min(initialEquity / 2, 40));
  if (yearsRemaining >= 3) return Math.floor(Math.min(initialEquity / 4, 20));
  return 0;
}

/**
 * Calculate future value of SIP with equity tapering (glide path)
 * Simulates month-by-month compounding with varying equity allocation
 * @param monthlyPayment - Monthly SIP amount
 * @param totalMonths - Total investment period in months
 * @param initialEquity - Initial equity allocation percentage
 * @param equityReturn - Annual equity return percentage
 * @param debtReturn - Annual debt return percentage
 * @returns Future value of all SIP payments
 */
export function calculateSipFVWithTapering(monthlyPayment, totalMonths, initialEquity, equityReturn, debtReturn) {
  if (monthlyPayment <= 0 || totalMonths <= 0) return 0;

  let fv = 0;

  for (let month = 0; month < totalMonths; month++) {
    // Compound this payment forward month-by-month
    let paymentFV = monthlyPayment;
    for (let m = totalMonths - month; m > 0; m--) {
      const yrsRem = m / 12;
      const eq = getTaperedEquityAllocation(yrsRem, initialEquity);
      const rate = ((eq / 100 * equityReturn) + ((100 - eq) / 100 * debtReturn)) / 100 / 12;
      paymentFV *= (1 + rate);
    }
    fv += paymentFV;
  }

  return fv;
}

/**
 * Calculate required SIP to reach target with equity tapering (glide path)
 * Uses binary search to find the SIP that produces the target future value
 * @param futureValue - Target amount to accumulate
 * @param totalMonths - Total investment period in months
 * @param initialEquity - Initial equity allocation percentage
 * @param equityReturn - Annual equity return percentage
 * @param debtReturn - Annual debt return percentage
 * @returns Required monthly SIP amount
 */
export function calculateRegularSIPWithTapering(futureValue, totalMonths, initialEquity, equityReturn, debtReturn) {
  if (futureValue <= 0 || totalMonths <= 0) return 0;

  let low = 0;
  let high = futureValue / totalMonths * 2;
  const tolerance = 0.01;

  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const fv = calculateSipFVWithTapering(mid, totalMonths, initialEquity, equityReturn, debtReturn);

    if (Math.abs(fv - futureValue) < tolerance) return mid;
    if (fv < futureValue) low = mid;
    else high = mid;
  }

  return high;
}

/**
 * Calculate future value of SIP with both annual step-up and equity tapering
 * Combines step-up (SIP increases annually) with glide path (equity decreases over time)
 * @param startingSIP - Initial monthly SIP amount
 * @param totalMonths - Total investment period in months
 * @param annualStepUp - Annual step-up percentage (e.g., 10 for 10%)
 * @param initialEquity - Initial equity allocation percentage
 * @param equityReturn - Annual equity return percentage
 * @param debtReturn - Annual debt return percentage
 * @returns Future value of all SIP payments
 */
export function calculateSipFVWithTaperingAndStepUp(startingSIP, totalMonths, annualStepUp, initialEquity, equityReturn, debtReturn) {
  if (startingSIP <= 0 || totalMonths <= 0) return 0;

  const stepUpRate = annualStepUp / 100;
  let fv = 0;
  let currentSIP = startingSIP;
  let monthInYear = 0;

  for (let month = 0; month < totalMonths; month++) {
    // Compound this payment forward month-by-month with tapered rates
    let paymentFV = currentSIP;
    for (let m = totalMonths - month; m > 0; m--) {
      const yrsRem = m / 12;
      const eq = getTaperedEquityAllocation(yrsRem, initialEquity);
      const rate = ((eq / 100 * equityReturn) + ((100 - eq) / 100 * debtReturn)) / 100 / 12;
      paymentFV *= (1 + rate);
    }
    fv += paymentFV;

    monthInYear++;

    // Annual step-up
    if (monthInYear >= 12) {
      currentSIP *= (1 + stepUpRate);
      monthInYear = 0;
    }
  }

  return fv;
}

/**
 * Calculate required starting SIP with both annual step-up and equity tapering
 * Uses binary search to find the starting SIP that produces the target future value
 * @param futureValue - Target amount to accumulate
 * @param totalMonths - Total investment period in months
 * @param annualStepUp - Annual step-up percentage (e.g., 10 for 10%)
 * @param initialEquity - Initial equity allocation percentage
 * @param equityReturn - Annual equity return percentage
 * @param debtReturn - Annual debt return percentage
 * @returns Required starting monthly SIP amount
 */
export function calculateStepUpSIPWithTapering(futureValue, totalMonths, annualStepUp, initialEquity, equityReturn, debtReturn) {
  if (futureValue <= 0 || totalMonths <= 0) return 0;
  if (annualStepUp === 0) return calculateRegularSIPWithTapering(futureValue, totalMonths, initialEquity, equityReturn, debtReturn);

  let low = 0;
  let high = futureValue / totalMonths * 2;
  const tolerance = 0.01;

  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const fv = calculateSipFVWithTaperingAndStepUp(mid, totalMonths, annualStepUp, initialEquity, equityReturn, debtReturn);

    if (Math.abs(fv - futureValue) < tolerance) return mid;
    if (fv < futureValue) low = mid;
    else high = mid;
  }

  return high;
}

/**
 * Calculate unified goal projections with equity tapering for long-term goals
 * Optionally supports annual step-up for SIP calculations
 * Optionally accounts for linked assets that reduce required SIP
 * @param {object} goal - Goal object with targetAmount, targetDate, inflationRate, linkedAssets
 * @param {number} equityReturn - Expected equity return
 * @param {number} debtReturn - Expected debt return
 * @param {number} arbitrageReturn - Expected arbitrage return
 * @param {number} equityAllocation - Equity allocation percentage
 * @param {number} annualStepUp - Annual step-up percentage
 * @param {object} assetsData - Assets data for linked asset calculations (optional)
 */
export function calculateUnifiedGoalProjections(goal, equityReturn, debtReturn, arbitrageReturn, equityAllocation = 60, annualStepUp = 0, assetsData = null) {
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

  // Calculate future value of linked assets (if any)
  const linkedAssets = goal.linkedAssets || [];
  const linkedAssetsFV = assetsData
    ? calculateLinkedAssetsFV(linkedAssets, assetsData, goal.targetDate, equityReturn, debtReturn)
    : 0;

  // Gap amount = what SIP needs to cover after linked assets
  const gapAmount = Math.max(0, inflationAdjustedTarget - linkedAssetsFV);

  // Calculate required SIP for gap amount with tapering for long-term goals
  let monthlySIP;
  if (gapAmount <= 0) {
    // Linked assets cover entire goal
    monthlySIP = 0;
  } else if (category === 'short') {
    // Short-term: use arbitrage, no tapering needed
    monthlySIP = annualStepUp > 0
      ? calculateStepUpSIP(gapAmount, blendedReturn, months, annualStepUp)
      : calculateRegularSIP(gapAmount, blendedReturn, months);
  } else {
    // Long-term: use tapering with optional step-up
    monthlySIP = annualStepUp > 0
      ? calculateStepUpSIPWithTapering(gapAmount, months, annualStepUp, equityAllocation, equityReturn, debtReturn)
      : calculateRegularSIPWithTapering(gapAmount, months, equityAllocation, equityReturn, debtReturn);
  }

  return {
    years,
    months,
    category,
    inflationAdjustedTarget,
    blendedReturn,
    linkedAssetsFV,         // Future value of linked assets
    linkedAssetsCount: linkedAssets.length,
    gapAmount,              // What SIP needs to cover
    monthlySIP,
    annualStepUp,
    tapering: {
      initialEquity: equityAllocation,
      phases: [
        { yearsThreshold: 8, equity: equityAllocation },
        { yearsThreshold: 5, equity: Math.floor(Math.min(equityAllocation / 2, 40)) },
        { yearsThreshold: 3, equity: Math.floor(Math.min(equityAllocation / 4, 20)) },
        { yearsThreshold: 0, equity: 0 }
      ]
    }
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
  return Math.max(0, Math.round(getYearsRemaining(targetDate) * 12));
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
 * Calculate future value of regular SIP payments (annuity)
 * FV = PMT × ((1 + r)^n - 1) / r × (1 + r)
 */
export function calculateSipFV(monthlyPayment, annualRate, months) {
  if (monthlyPayment <= 0 || months <= 0) return 0;

  const monthlyRate = annualRate / 100 / 12;

  if (monthlyRate === 0) {
    return monthlyPayment * months;
  }

  const factor = Math.pow(1 + monthlyRate, months);
  return monthlyPayment * ((factor - 1) / monthlyRate) * (1 + monthlyRate);
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

  // Inverse of calculateSipFV
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
 * Generic helper that can be used for any contribution with annual step-up
 * Uses annuity due formula (payment at beginning of period) for consistency
 * with calculateSipFV
 */
function calculateStepUpSIPFutureValue(startingSIP, monthlyRate, totalMonths, stepUpRate) {
  if (startingSIP <= 0 || totalMonths <= 0) return 0;

  let fv = 0;
  let currentSIP = startingSIP;
  let monthInYear = 0;

  for (let month = 0; month < totalMonths; month++) {
    const remainingMonths = totalMonths - month;

    // Each payment compounds for remaining months
    if (monthlyRate === 0) {
      fv += currentSIP;
    } else {
      fv += currentSIP * Math.pow(1 + monthlyRate, remainingMonths);
    }

    monthInYear++;

    // Annual step-up
    if (monthInYear >= 12) {
      currentSIP *= (1 + stepUpRate);
      monthInYear = 0;
    }
  }

  // Multiply by (1 + monthlyRate) for annuity due (payment at start of period)
  // This matches the formula used in calculateSipFV
  if (monthlyRate === 0) {
    return fv;
  }
  return fv * (1 + monthlyRate);
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
    long: 'Long Term',
    short: 'Short Term'
  };
  return displays[category] || 'Unknown';
}


// EPF and NPS return rates (defaults)
export const EPF_RETURN = 8;
export const NPS_RETURN = 9;

/**
 * Get expected return rate for an asset category
 * @param {string} category - Asset category name
 * @param {number} equityReturn - Expected equity return from settings
 * @param {number} debtReturn - Expected debt return from settings
 * @returns {number} Expected annual return rate percentage
 */
export function getReturnForCategory(category, equityReturn, debtReturn) {
  switch (category) {
    // Equity-like returns
    case 'Equity Mutual Funds':
    case 'Stocks':
    case 'Gold ETFs/SGBs':
      return equityReturn;

    // Debt-like returns
    case 'Debt/Arbitrage Mutual Funds':
    case 'FDs & RDs':
      return debtReturn;

    // No growth assumed (very conservative)
    case 'Savings Bank':
      return 0;

    // Default to debt return for unknown categories
    default:
      return debtReturn;
  }
}

/**
 * Calculate future value of linked assets at goal target date
 * Each asset compounds at its category-specific return rate
 * @param {Array} linkedAssets - Array of { assetId, amount }
 * @param {object} assetsData - Assets data containing items array
 * @param {string} targetDate - Goal target date
 * @param {number} equityReturn - Expected equity return
 * @param {number} debtReturn - Expected debt return
 * @returns {number} Total future value of all linked assets
 */
export function calculateLinkedAssetsFV(linkedAssets, assetsData, targetDate, equityReturn, debtReturn) {
  if (!linkedAssets || linkedAssets.length === 0 || !assetsData || !assetsData.items) {
    return 0;
  }

  const years = getYearsRemaining(targetDate);
  if (years <= 0) {
    // Goal is in the past or now, just return current sum
    return linkedAssets.reduce((total, { amount }) => total + (amount || 0), 0);
  }

  return linkedAssets.reduce((total, { assetId, amount }) => {
    const asset = assetsData.items.find(a => a.id === assetId);
    if (!asset || !amount) return total;

    const returnRate = getReturnForCategory(asset.category, equityReturn, debtReturn);
    const fv = calculateLumpsumFV(amount, returnRate, years);
    return total + fv;
  }, 0);
}

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
 * Uses calculateSipFV for each contribution type
 */
export function calculateEpfNpsSipFV(monthlyEpf, monthlyNps, targetDate, epfReturn = EPF_RETURN, npsReturn = NPS_RETURN) {
  const months = getMonthsRemaining(targetDate);
  if (months <= 0) return 0;

  const epfSipFV = calculateSipFV(monthlyEpf, epfReturn, months);
  const npsSipFV = calculateSipFV(monthlyNps, npsReturn, months);

  return epfSipFV + npsSipFV;
}

/**
 * Calculate future value of monthly EPF/NPS SIP contributions with annual step-up
 * Uses calculateStepUpSIPFutureValue for each contribution type
 */
export function calculateEpfNpsSipFVWithStepUp(monthlyEpf, monthlyNps, targetDate, annualStepUp, epfReturn = EPF_RETURN, npsReturn = NPS_RETURN) {
  const totalMonths = getMonthsRemaining(targetDate);
  if (totalMonths <= 0) return 0;
  if (annualStepUp === 0) return calculateEpfNpsSipFV(monthlyEpf, monthlyNps, targetDate, epfReturn, npsReturn);

  const stepUpRate = annualStepUp / 100;
  const epfMonthlyRate = epfReturn / 100 / 12;
  const npsMonthlyRate = npsReturn / 100 / 12;

  const epfSipFV = calculateStepUpSIPFutureValue(monthlyEpf, epfMonthlyRate, totalMonths, stepUpRate);
  const npsSipFV = calculateStepUpSIPFutureValue(monthlyNps, npsMonthlyRate, totalMonths, stepUpRate);

  return epfSipFV + npsSipFV;
}

/**
 * Calculate retirement goal projections with EPF/NPS contributions (unified portfolio)
 * Returns projections with EPF/NPS breakdown for retirement goals
 * Also accounts for linked assets if assetsData is provided
 * @param epfNpsStepUp - Annual step-up percentage for EPF/NPS contributions (from settings)
 * @param investmentStepUp - Annual step-up percentage for other investments (from settings)
 * @param assetsData - Assets data for linked asset calculations (optional)
 */
export function calculateRetirementProjectionsWithEpfNps(goal, retirementContributions, equityReturn, debtReturn, arbitrageReturn, equityAllocation = 60, epfReturn = EPF_RETURN, npsReturn = NPS_RETURN, epfNpsStepUp = 0, investmentStepUp = 0, assetsData = null) {
  // Get base projections including linked assets FV
  const baseProjections = calculateUnifiedGoalProjections(goal, equityReturn, debtReturn, arbitrageReturn, equityAllocation, investmentStepUp, assetsData);

  // Skip EPF/NPS if not a retirement goal, no contributions data, or flag is unchecked
  if (goal.goalType !== 'retirement' || !retirementContributions || !goal.includeEpfNps) {
    return {
      ...baseProjections,
      epfNps: null
    };
  }

  const { monthlyEpf, monthlyNps, epfCorpus, npsCorpus, totalMonthly, totalCorpus } = retirementContributions;

  // If no EPF/NPS contributions exist, return base projections
  if (totalMonthly === 0 && totalCorpus === 0) {
    return {
      ...baseProjections,
      epfNps: null
    };
  }

  // Calculate FV of EPF/NPS corpus
  const epfNpsCorpusFV = calculateEpfNpsCorpusFV(epfCorpus, npsCorpus, goal.targetDate, epfReturn, npsReturn);

  // Calculate FV of EPF/NPS SIP contributions (with step-up from settings)
  const epfNpsSipFV = epfNpsStepUp > 0
    ? calculateEpfNpsSipFVWithStepUp(monthlyEpf, monthlyNps, goal.targetDate, epfNpsStepUp, epfReturn, npsReturn)
    : calculateEpfNpsSipFV(monthlyEpf, monthlyNps, goal.targetDate, epfReturn, npsReturn);

  // Total contribution from EPF/NPS at goal date
  const totalEpfNpsFV = epfNpsCorpusFV + epfNpsSipFV;

  // Recalculate gap amount after accounting for EPF/NPS AND linked assets
  // baseProjections.linkedAssetsFV already includes linked assets
  const adjustedGapAmount = Math.max(0, baseProjections.inflationAdjustedTarget - totalEpfNpsFV - baseProjections.linkedAssetsFV);

  // Recalculate required SIP for remaining gap (with investment step-up)
  const adjustedMonthlySIP = adjustedGapAmount > 0
    ? (investmentStepUp > 0
        ? calculateStepUpSIP(adjustedGapAmount, baseProjections.blendedReturn, baseProjections.months, investmentStepUp)
        : calculateRegularSIP(adjustedGapAmount, baseProjections.blendedReturn, baseProjections.months))
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
      stepUpRate: epfNpsStepUp
    }
  };
}
