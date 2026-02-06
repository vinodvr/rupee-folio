// Investment Plan module - Unified Portfolio View
import { formatCurrency, getFunds, getSymbol } from './currency.js';
import {
  UNIFIED_PORTFOLIO,
  getUnifiedCategory,
  getUnifiedBlendedReturn,
  calculateUnifiedGoalProjections,
  calculateRetirementProjectionsWithEpfNps,
  calculateInflationAdjustedAmount,
  getYearsRemaining
} from './calculator.js';
import { getRetirementContributions } from './cashflow.js';
import { getLinkableAssets, getAssetAllocations, SHORT_TERM_ONLY, LONG_TERM_ONLY, BOTH_TERMS } from './assets.js';
import { saveData } from './storage.js';

let appData = null;
let currency = 'INR';
let fundHouse = 'icici';
let equityAllocation = 60;
let equityReturn = 10;
let debtReturn = 5;
let arbitrageReturn = 6;
let epfReturn = 8;
let npsReturn = 9;
let epfNpsStepUp = 5;
let investmentStepUp = 5;
let onDataChange = null;

export function initInvestmentPlan(data, curr, fh, eqAlloc, eqReturn, debtRet, arbReturn, epfRet, npsRet, epfNpsStep, invStep, onChange) {
  appData = data;
  currency = curr;
  fundHouse = fh || 'icici';
  equityAllocation = eqAlloc ?? 60;
  equityReturn = eqReturn ?? 10;
  debtReturn = debtRet ?? 5;
  arbitrageReturn = arbReturn ?? 6;
  epfReturn = epfRet ?? 8;
  npsReturn = npsRet ?? 9;
  epfNpsStepUp = epfNpsStep ?? 5;
  investmentStepUp = invStep ?? 5;
  onDataChange = onChange;
  renderInvestmentPlan();
}

export function updateCurrency(curr) {
  currency = curr;
  renderInvestmentPlan();
}

export function updateFundHouse(fh) {
  fundHouse = fh;
  renderInvestmentPlan();
}

export function updateAllocation(eqAlloc) {
  equityAllocation = eqAlloc;
  renderInvestmentPlan();
}

export function updateReturns(eqReturn, debtRet, arbReturn, epfRet, npsRet) {
  equityReturn = eqReturn;
  debtReturn = debtRet;
  arbitrageReturn = arbReturn;
  epfReturn = epfRet ?? epfReturn;
  npsReturn = npsRet ?? npsReturn;
  renderInvestmentPlan();
}

export function updateStepUp(epfNpsStep, invStep) {
  epfNpsStepUp = epfNpsStep ?? epfNpsStepUp;
  investmentStepUp = invStep ?? investmentStepUp;
  renderInvestmentPlan();
}

export function refreshData(data) {
  appData = data;
  renderInvestmentPlan();
}

/**
 * Categorize goals into short-term and long-term buckets
 */
function categorizeGoals() {
  const shortTerm = [];
  const longTerm = [];

  appData.goals.forEach(goal => {
    const category = getUnifiedCategory(goal.targetDate);
    const projections = goal.goalType === 'retirement'
      ? calculateRetirementProjectionsWithEpfNps(goal, getRetirementContributions(), equityReturn, debtReturn, arbitrageReturn, equityAllocation, epfReturn, npsReturn, epfNpsStepUp, investmentStepUp, appData.assets)
      : calculateUnifiedGoalProjections(goal, equityReturn, debtReturn, arbitrageReturn, equityAllocation, investmentStepUp, appData.assets);

    const goalData = {
      ...goal,
      projections,
      category
    };

    if (category === 'short') {
      shortTerm.push(goalData);
    } else {
      longTerm.push(goalData);
    }
  });

  return { shortTerm, longTerm };
}

/**
 * Calculate summary for a category of goals
 */
function calculateCategorySummary(goals, category) {
  const totalSIP = goals.reduce((sum, g) => sum + g.projections.monthlySIP, 0);
  const debtAllocation = 100 - equityAllocation;
  const blendedReturn = category === 'short'
    ? arbitrageReturn
    : (equityAllocation / 100 * equityReturn) + (debtAllocation / 100 * debtReturn);

  if (category === 'short') {
    // Short term: 100% into Arbitrage fund
    return {
      totalSIP,
      blendedReturn,
      allocation: {
        arbitrage: totalSIP
      }
    };
  } else {
    // Long term: Use configurable equity/debt allocation
    const equityAmount = totalSIP * (equityAllocation / 100);
    const debtAmount = totalSIP * (debtAllocation / 100);
    const nifty50Amount = equityAmount * (UNIFIED_PORTFOLIO.LONG_TERM.equitySplit.nifty50 / 100);
    const niftyNext50Amount = equityAmount * (UNIFIED_PORTFOLIO.LONG_TERM.equitySplit.niftyNext50 / 100);

    return {
      totalSIP,
      blendedReturn,
      equityAllocation,
      debtAllocation,
      allocation: {
        nifty50: nifty50Amount,
        niftyNext50: niftyNext50Amount,
        moneyMarket: debtAmount
      }
    };
  }
}

/**
 * Format timeline string
 */
function formatTimeline(years) {
  const totalMonths = Math.round(years * 12);
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;

  if (y === 0) return `${m} month${m !== 1 ? 's' : ''}`;
  if (m === 0) return `${y} year${y !== 1 ? 's' : ''}`;
  return `${y}y ${m}m`;
}

/**
 * Format target date for display
 */
function formatTargetDate(targetDate) {
  return new Date(targetDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

/**
 * Render goal row in the investment plan
 */
function renderGoalRow(goal) {
  const isRetirement = goal.goalType === 'retirement';
  const hasEpfNps = isRetirement && goal.projections.epfNps;
  const hasLinkedAssets = goal.projections.linkedAssetsFV > 0;

  // Calculate various deduction amounts
  const epfNpsFV = hasEpfNps ? goal.projections.epfNps.totalEpfNpsFV : 0;
  const linkedFV = goal.projections.linkedAssetsFV || 0;
  const totalDeductions = epfNpsFV + linkedFV;

  // Unique ID for toggle functionality
  const detailsId = `goal-details-${goal.id}`;

  // Get linked asset details
  const linkedAssetsList = (goal.linkedAssets || []).map(la => {
    const asset = appData.assets.items.find(a => a.id === la.assetId);
    return asset ? { name: asset.name, amount: la.amount } : null;
  }).filter(Boolean);

  return `
    <div class="py-3 border-b border-gray-100 last:border-0">
      <!-- Header: Goal name and SIP -->
      <div class="flex items-center justify-between mb-1">
        <div class="font-medium text-gray-800">
          <a href="#goals" class="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">${goal.name}</a>
          ${isRetirement ? '<span class="ml-2 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">Retirement</span>' : ''}
        </div>
        <div class="text-right">
          ${Math.round(goal.projections.monthlySIP) === 0
            ? '<span class="font-semibold text-green-600">Achieved</span>'
            : `<span class="font-semibold text-blue-600">${formatCurrency(Math.round(goal.projections.monthlySIP), currency)}</span>
               <span class="text-xs text-gray-500">/month</span>`
          }
        </div>
      </div>

      <!-- Compact info line -->
      <div class="flex items-center justify-between text-sm text-gray-500">
        <div>
          <span class="font-medium text-gray-700">${formatCurrency(goal.targetAmount, currency)}</span>
          <span class="mx-1">·</span>
          <span>${formatTimeline(goal.projections.years)}</span>
        </div>
        <button class="toggle-details-btn text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1" data-target="${detailsId}">
          <span class="toggle-text">View Details</span>
          <svg class="w-3 h-3 toggle-icon transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      </div>

      <!-- Expandable Details Section -->
      <div id="${detailsId}" class="goal-details-expanded hidden mt-3 bg-gray-50 rounded p-3">
        <div class="text-xs text-gray-600 space-y-1.5">
          <!-- Goal parameters -->
          <div class="flex justify-between">
            <span>Target Date:</span>
            <span class="font-medium text-gray-700">${formatTargetDate(goal.targetDate)}</span>
          </div>
          <div class="flex justify-between">
            <span>Inflation Rate:</span>
            <span class="font-medium text-gray-700">${goal.inflationRate}%</span>
          </div>
          ${goal.projections.annualStepUp > 0 ? `
            <div class="flex justify-between">
              <span>Annual Step-up:</span>
              <span class="font-medium text-gray-700">${goal.projections.annualStepUp}%</span>
            </div>
          ` : ''}

          <!-- FV Calculations -->
          <div class="border-t border-gray-200 pt-2 mt-2">
            <div class="flex justify-between">
              <span>Future Value:</span>
              <span class="font-medium text-gray-700">${formatCurrency(Math.round(goal.projections.inflationAdjustedTarget), currency)}</span>
            </div>
          </div>
          ${linkedAssetsList.length > 0 ? `
            <div class="mt-2">
              <span class="font-medium text-gray-700">Linked Investments:</span>
            </div>
            ${linkedAssetsList.map(la => `
              <div class="flex justify-between pl-2">
                <span class="text-gray-500">${la.name}</span>
                <span class="text-blue-600">${formatCurrency(la.amount, currency)}</span>
              </div>
            `).join('')}
            <div class="flex justify-between">
              <span>Linked Investments FV:</span>
              <span class="font-medium text-blue-600">-${formatCurrency(Math.round(linkedFV), currency)}</span>
            </div>
          ` : ''}
          ${hasEpfNps ? `
            <div class="flex justify-between">
              <span>EPF/NPS FV:</span>
              <span class="font-medium text-purple-600">-${formatCurrency(Math.round(epfNpsFV), currency)}</span>
            </div>
          ` : ''}
          ${totalDeductions > 0 ? `
            <div class="flex justify-between border-t border-gray-200 pt-1 mt-1">
              <span class="font-medium">Gap to fill:</span>
              <span class="font-medium text-gray-800">${formatCurrency(Math.round(goal.projections.gapAmount), currency)}</span>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Main render function for the Investment Plan tab
 */
function renderInvestmentPlan() {
  const container = document.getElementById('investment-plan-content');
  if (!container) return;

  if (appData.goals.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        <p class="text-lg mb-2">No goals to plan for</p>
        <p class="text-sm">Add financial goals to generate your personalized investment plan</p>
      </div>
    `;
    updateSummary(0);
    return;
  }

  const { shortTerm, longTerm } = categorizeGoals();
  const funds = getFunds(currency);

  const shortTermSummary = calculateCategorySummary(shortTerm, 'short');
  const longTermSummary = calculateCategorySummary(longTerm, 'long');
  const totalSIP = shortTermSummary.totalSIP + longTermSummary.totalSIP;

  // Check if there are linkable assets available or existing links (for reassign)
  const allocations = getAssetAllocations(appData);
  const hasAvailableAssets = Object.values(allocations).some(a => a.available > 0);
  const hasExistingLinks = appData.goals.some(g => g.linkedAssets && g.linkedAssets.length > 0);
  const showAssignButton = hasAvailableAssets || hasExistingLinks;
  const buttonText = hasExistingLinks ? 'Adjust Investment Assignments' : 'Assign Investments to Goals';

  container.innerHTML = `
    <!-- Assign Existing Investments Button -->
    ${showAssignButton ? `
      <div class="mb-4 flex justify-end">
        <button id="auto-assign-assets-btn" class="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
          <span>${buttonText}</span>
        </button>
      </div>
    ` : ''}

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Short Term Goals -->
      <div class="bg-white rounded-lg shadow-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-800">Short Term Goals</h3>
            <p class="text-sm text-gray-500">Less than 5 years | 100% Arbitrage Fund</p>
          </div>
          <div class="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
            ${shortTerm.length} goal${shortTerm.length !== 1 ? 's' : ''}
          </div>
        </div>

        ${shortTerm.length === 0 ? `
          <p class="text-gray-500 text-sm italic py-4">No short-term goals</p>
        ` : `
          <div class="mb-4">
            ${shortTerm.map(g => renderGoalRow(g)).join('')}
          </div>

          <div class="border-t pt-4">
            <div class="flex justify-between items-center">
              <span class="font-medium text-gray-700">Total SIP for Short Term Goals</span>
              <span class="text-xl font-bold text-amber-600">${formatCurrency(Math.round(shortTermSummary.totalSIP), currency)}</span>
            </div>
            <div class="text-xs text-gray-500">Expected return: ${shortTermSummary.blendedReturn.toFixed(1)}% p.a. post tax</div>
          </div>
        `}
      </div>

      <!-- Long Term Goals -->
      <div class="bg-white rounded-lg shadow-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-800">Long Term Goals</h3>
            <p class="text-sm text-gray-500">5+ years | ${equityAllocation}% Equity / ${100 - equityAllocation}% Debt</p>
          </div>
          <div class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            ${longTerm.length} goal${longTerm.length !== 1 ? 's' : ''}
          </div>
        </div>

        ${longTerm.length === 0 ? `
          <p class="text-gray-500 text-sm italic py-4">No long-term goals</p>
        ` : `
          <div class="mb-4">
            ${longTerm.map(g => renderGoalRow(g)).join('')}
          </div>

          <div class="border-t pt-4">
            <div class="flex justify-between items-center">
              <span class="font-medium text-gray-700">Total SIP for Long Term Goals</span>
              <span class="text-xl font-bold text-green-600">${formatCurrency(Math.round(longTermSummary.totalSIP), currency)}</span>
            </div>
            <div class="text-xs text-gray-500">Expected return: ${longTermSummary.blendedReturn.toFixed(1)}% p.a. post tax</div>
          </div>
        `}
      </div>
    </div>

    <!-- Recommended Funds -->
    <div class="bg-white rounded-lg shadow-sm p-5 mt-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-800">Recommended Funds</h3>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Fund House:</span>
          <select id="fund-house-plan-select" class="px-2 py-1 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="icici" ${fundHouse === 'icici' ? 'selected' : ''}>ICICI Prudential</option>
            <option value="hdfc" ${fundHouse === 'hdfc' ? 'selected' : ''}>HDFC</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Short Term Funds -->
        <div>
          <h4 class="text-sm font-semibold text-amber-700 mb-3">Short Term Goals</h4>
          ${shortTermSummary.totalSIP > 0 ? `
            <div class="bg-amber-50 rounded-lg p-4">
              <div class="flex justify-between items-center">
                <div>
                  <div class="font-medium text-amber-800">${funds?.[fundHouse]?.arbitrage || 'Equity Arbitrage Fund'}</div>
                  <div class="text-xs text-amber-600">100% allocation | Low risk, equity taxation</div>
                </div>
                <div class="text-right">
                  <div class="font-bold text-amber-700">${formatCurrency(Math.round(shortTermSummary.allocation.arbitrage), currency)}</div>
                  <div class="text-xs text-amber-600">per month</div>
                </div>
              </div>
            </div>
          ` : `
            <p class="text-gray-500 text-sm italic">No short-term goals</p>
          `}
        </div>

        <!-- Long Term Funds -->
        <div>
          <h4 class="text-sm font-semibold text-green-700 mb-3">Long Term Goals</h4>
          ${longTermSummary.totalSIP > 0 ? `
            <div class="space-y-2">
              <div class="bg-green-50 rounded-lg p-3">
                <div class="text-xs font-medium text-green-700 mb-2">Equity (${equityAllocation}%)</div>
                <div class="space-y-2">
                  <div class="flex justify-between items-center">
                    <div>
                      <div class="text-sm font-medium text-gray-800">${funds?.[fundHouse]?.nifty50 || 'Nifty 50 Index Fund'}</div>
                      <div class="text-xs text-gray-500">70% of equity (${Math.round(equityAllocation * 0.7)}% of SIP)</div>
                    </div>
                    <div class="font-semibold text-green-600">${formatCurrency(Math.round(longTermSummary.allocation.nifty50), currency)}</div>
                  </div>
                  <div class="flex justify-between items-center">
                    <div>
                      <div class="text-sm font-medium text-gray-800">${funds?.[fundHouse]?.niftyNext50 || 'Nifty Next 50 Index Fund'}</div>
                      <div class="text-xs text-gray-500">30% of equity (${Math.round(equityAllocation * 0.3)}% of SIP)</div>
                    </div>
                    <div class="font-semibold text-green-600">${formatCurrency(Math.round(longTermSummary.allocation.niftyNext50), currency)}</div>
                  </div>
                </div>
              </div>
              <div class="bg-blue-50 rounded-lg p-3">
                <div class="text-xs font-medium text-blue-700 mb-2">Debt (${100 - equityAllocation}%)</div>
                <div class="flex justify-between items-center">
                  <div>
                    <div class="text-sm font-medium text-gray-800">${funds?.[fundHouse]?.moneyMarket || 'Money Market Fund'}</div>
                  </div>
                  <div class="font-semibold text-blue-600">${formatCurrency(Math.round(longTermSummary.allocation.moneyMarket), currency)}</div>
                </div>
              </div>
            </div>
          ` : `
            <p class="text-gray-500 text-sm italic">No long-term goals</p>
          `}
        </div>
      </div>

      <!-- Total -->
      <div class="mt-4 pt-4 border-t flex justify-between items-center">
        <span class="font-semibold text-gray-800">Total Monthly SIP</span>
        <span class="text-xl font-bold text-gray-800">${formatCurrency(Math.round(totalSIP), currency)}</span>
      </div>
    </div>
  `;

  updateSummary(totalSIP);

  // Add event listener for fund house dropdown
  const fundHouseSelect = document.getElementById('fund-house-plan-select');
  if (fundHouseSelect) {
    fundHouseSelect.addEventListener('change', (e) => {
      // Dispatch custom event to sync with app.js
      const event = new CustomEvent('fundHouseChange', { detail: { fundHouse: e.target.value } });
      document.dispatchEvent(event);
    });
  }

  // Add event listener for auto-assign button
  const autoAssignBtn = document.getElementById('auto-assign-assets-btn');
  if (autoAssignBtn) {
    autoAssignBtn.addEventListener('click', showAssignmentWizard);
  }

  // Add event listeners for toggle details buttons
  const toggleBtns = document.querySelectorAll('.toggle-details-btn');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const detailsSection = document.getElementById(targetId);
      const toggleText = btn.querySelector('.toggle-text');
      const toggleIcon = btn.querySelector('.toggle-icon');

      if (detailsSection) {
        const isHidden = detailsSection.classList.contains('hidden');
        detailsSection.classList.toggle('hidden');

        // Update button text and icon
        if (toggleText) {
          toggleText.textContent = isHidden ? 'Hide Details' : 'View Details';
        }
        if (toggleIcon) {
          toggleIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        }
      }
    });
  });
}

/**
 * Update the summary section with cashflow comparison
 */
function updateSummary(totalSIP) {
  const totalSIPElement = document.getElementById('plan-total-sip');
  const availableElement = document.getElementById('plan-available-cashflow');
  const gapElement = document.getElementById('plan-gap');
  const gapLabel = document.getElementById('plan-gap-label');

  if (!totalSIPElement || !availableElement || !gapElement || !gapLabel) return;

  totalSIPElement.textContent = formatCurrency(Math.round(totalSIP), currency);

  // Get cashflow data
  const totalIncome = appData.cashflow.income.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = appData.cashflow.expenses.reduce((sum, e) => sum + e.amount, 0);
  const netCashflow = Math.max(0, totalIncome - totalExpenses);

  availableElement.textContent = formatCurrency(netCashflow, currency);

  const gap = totalSIP - netCashflow;
  gapElement.textContent = formatCurrency(Math.abs(Math.round(gap)), currency);

  if (gap > 0) {
    gapElement.classList.remove('text-green-400');
    gapElement.classList.add('text-red-400');
    gapLabel.textContent = 'Shortfall:';
  } else {
    gapElement.classList.remove('text-red-400');
    gapElement.classList.add('text-green-400');
    gapLabel.textContent = 'Surplus:';
  }
}

/**
 * Get total monthly SIP needed across all goals
 */
export function getTotalMonthlySIP() {
  const { shortTerm, longTerm } = categorizeGoals();
  const shortTermSummary = calculateCategorySummary(shortTerm, 'short');
  const longTermSummary = calculateCategorySummary(longTerm, 'long');
  return shortTermSummary.totalSIP + longTermSummary.totalSIP;
}

/**
 * Auto-assign algorithm: Match assets to goals based on timeline
 * - Sort goals by target date (nearest first)
 * - Short-term goals get debt-type assets (FDs, Savings, Debt MFs)
 * - Long-term goals get equity-type assets (Equity MFs, Stocks, Gold ETFs)
 */
function calculateAutoAssignments() {
  const allocations = getAssetAllocations(appData);
  const availableAssets = {};

  // Track available amounts for each asset
  Object.entries(allocations).forEach(([assetId, alloc]) => {
    if (alloc.available > 0) {
      const asset = appData.assets.items.find(a => a.id === assetId);
      if (asset) {
        availableAssets[assetId] = {
          ...asset,
          available: alloc.available
        };
      }
    }
  });

  // Sort goals by target date (nearest first)
  const sortedGoals = [...appData.goals].sort((a, b) =>
    new Date(a.targetDate) - new Date(b.targetDate)
  );

  const assignments = []; // { goalId, goalName, assetId, assetName, amount }

  sortedGoals.forEach(goal => {
    const category = getUnifiedCategory(goal.targetDate);
    const years = getYearsRemaining(goal.targetDate);

    // Calculate inflation-adjusted target
    const inflationAdjustedTarget = calculateInflationAdjustedAmount(
      goal.targetAmount,
      goal.inflationRate,
      years
    );

    // Already linked amount
    const alreadyLinked = (goal.linkedAssets || [])
      .reduce((sum, la) => sum + (la.amount || 0), 0);

    // Remaining need (simplified - doesn't account for FV growth perfectly)
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

/**
 * Wizard state for multi-step assignment
 */
let wizardState = {
  mode: 'assign', // 'assign' | 'reassign'
  currentStep: 0, // 0-indexed, last step is review
  goals: [],      // Goals to process (sorted by target date)
  assignments: {}, // goalId -> [{ assetId, amount }]
  availableAssets: {}, // assetId -> { ...asset, available }
  originalLinks: {} // Original links for reassign mode comparison
};

/**
 * Initialize wizard state
 */
function initWizardState() {
  const allocations = getAssetAllocations(appData);

  // Check if we're in reassign mode (any existing links)
  const hasExistingLinks = appData.goals.some(g =>
    g.linkedAssets && g.linkedAssets.length > 0
  );

  // Build available assets map with all linkable assets
  const availableAssets = {};
  appData.assets.items.forEach(asset => {
    if (allocations[asset.id] !== undefined) {
      availableAssets[asset.id] = {
        ...asset,
        total: asset.value,
        available: allocations[asset.id].available,
        originalAvailable: allocations[asset.id].available
      };
    }
  });

  // Sort goals by target date (nearest first)
  const sortedGoals = [...appData.goals]
    .sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate));

  // Pre-populate assignments with existing links if in reassign mode
  const assignments = {};
  const originalLinks = {};

  sortedGoals.forEach(goal => {
    assignments[goal.id] = [];
    originalLinks[goal.id] = [];

    if (goal.linkedAssets && goal.linkedAssets.length > 0) {
      goal.linkedAssets.forEach(la => {
        assignments[goal.id].push({ assetId: la.assetId, amount: la.amount });
        originalLinks[goal.id].push({ assetId: la.assetId, amount: la.amount });
      });
    }
  });

  wizardState = {
    mode: hasExistingLinks ? 'reassign' : 'assign',
    currentStep: 0,
    goals: sortedGoals,
    assignments,
    availableAssets,
    originalLinks
  };
}

/**
 * Get effective available amount for an asset considering wizard assignments
 */
function getEffectiveAvailable(assetId, excludeGoalId = null) {
  const asset = wizardState.availableAssets[assetId];
  if (!asset) return 0;

  // Start with total value
  let allocated = 0;

  // Sum up assignments from wizard state
  Object.entries(wizardState.assignments).forEach(([goalId, assignments]) => {
    if (goalId === excludeGoalId) return;
    const link = assignments.find(a => a.assetId === assetId);
    if (link) {
      allocated += link.amount;
    }
  });

  return Math.max(0, asset.total - allocated);
}

/**
 * Get eligible assets for a goal based on its timeline
 */
function getEligibleAssetsForGoal(goal) {
  const category = getUnifiedCategory(goal.targetDate);
  const eligibleCategories = category === 'short'
    ? [...SHORT_TERM_ONLY, ...BOTH_TERMS]
    : [...LONG_TERM_ONLY, ...BOTH_TERMS];

  return Object.values(wizardState.availableAssets)
    .filter(asset => eligibleCategories.includes(asset.category));
}

/**
 * Show the assignment wizard
 */
function showAssignmentWizard() {
  initWizardState();

  const modal = document.getElementById('goal-modal');

  // Check if there are any goals to assign
  if (wizardState.goals.length === 0) {
    showNoGoalsMessage(modal);
    return;
  }

  // Check if there are any eligible assets
  const hasEligibleAssets = wizardState.goals.some(goal =>
    getEligibleAssetsForGoal(goal).length > 0
  );

  if (!hasEligibleAssets && wizardState.mode === 'assign') {
    showNoAssetsMessage(modal);
    return;
  }

  modal.classList.remove('hidden');
  renderWizardStep();
}

function showNoGoalsMessage(modal) {
  const content = document.getElementById('goal-modal-content');
  content.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-full max-w-lg">
      <h3 class="text-xl font-semibold mb-4">Assign Investments to Goals</h3>
      <div class="text-center py-8 text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p class="text-sm">No goals to assign investments to.</p>
        <p class="text-xs text-gray-400 mt-1">Add some financial goals first.</p>
      </div>
      <div class="flex justify-end pt-4 border-t">
        <button id="close-wizard-btn" class="px-4 py-2 border rounded-lg hover:bg-gray-50">Close</button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  document.getElementById('close-wizard-btn').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
}

function showNoAssetsMessage(modal) {
  const content = document.getElementById('goal-modal-content');
  content.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-full max-w-lg">
      <h3 class="text-xl font-semibold mb-4">Assign Investments to Goals</h3>
      <div class="text-center py-8 text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-sm">No eligible investments available.</p>
        <p class="text-xs text-gray-400 mt-1">Add some investments (Equity MFs, FDs, etc.) to link to goals.</p>
      </div>
      <div class="flex justify-end pt-4 border-t">
        <button id="close-wizard-btn" class="px-4 py-2 border rounded-lg hover:bg-gray-50">Close</button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  document.getElementById('close-wizard-btn').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
}

/**
 * Render the current wizard step
 */
function renderWizardStep() {
  const content = document.getElementById('goal-modal-content');
  const totalSteps = wizardState.goals.length + 1; // +1 for review step
  const isReviewStep = wizardState.currentStep === wizardState.goals.length;

  if (isReviewStep) {
    renderReviewStep(content, totalSteps);
  } else {
    renderGoalStep(content, totalSteps);
  }
}

/**
 * Render a goal assignment step
 */
function renderGoalStep(content, totalSteps) {
  const goal = wizardState.goals[wizardState.currentStep];
  const category = getUnifiedCategory(goal.targetDate);
  const years = getYearsRemaining(goal.targetDate);

  // Get current assignments for this goal
  const currentAssignments = wizardState.assignments[goal.id] || [];
  const totalLinked = currentAssignments.reduce((sum, a) => sum + a.amount, 0);

  // Calculate remaining goal need
  const goalTarget = goal.targetAmount;
  const remainingGoalNeed = Math.max(0, goalTarget - totalLinked);

  // Get eligible assets
  const eligibleAssets = getEligibleAssetsForGoal(goal);

  content.innerHTML = `
    <div class="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="p-4 border-b bg-gray-50">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-semibold text-gray-800">
            ${wizardState.mode === 'reassign' ? 'Adjust' : 'Assign'} Investments
          </h3>
          <span class="text-sm text-gray-500">Step ${wizardState.currentStep + 1} of ${totalSteps}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-1.5">
          <div class="bg-blue-600 h-1.5 rounded-full transition-all" style="width: ${((wizardState.currentStep + 1) / totalSteps) * 100}%"></div>
        </div>
      </div>

      <!-- Goal Summary -->
      <div class="p-4 border-b">
        <div class="flex items-center gap-2 mb-2">
          <span class="font-semibold text-gray-800">${goal.name}</span>
          <span class="px-2 py-0.5 text-xs rounded ${category === 'short' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}">
            ${category === 'short' ? 'Short Term' : 'Long Term'}
          </span>
          ${goal.goalType === 'retirement' ? '<span class="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">Retirement</span>' : ''}
        </div>
        <div class="flex items-center gap-4 text-sm">
          <div>
            <span class="text-gray-500">Target:</span>
            <span class="font-medium ml-1">${formatCurrency(goal.targetAmount, currency)}</span>
          </div>
          <div>
            <span class="text-gray-500">Timeline:</span>
            <span class="font-medium ml-1">${formatTimeline(years)}</span>
          </div>
          <div>
            <span class="text-gray-500">Linked:</span>
            <span id="linked-total-display" class="font-medium ml-1 ${totalLinked > 0 ? 'text-blue-600' : ''}">${formatCurrency(totalLinked, currency)}</span>
          </div>
        </div>
      </div>

      <!-- Assets List -->
      <div class="flex-1 overflow-y-auto p-4">
        <h4 class="text-sm font-medium text-gray-700 mb-3">Available Investments</h4>

        ${eligibleAssets.length === 0 ? `
          <div class="text-center py-6 text-gray-500">
            <p class="text-sm">No eligible investments for this ${category === 'short' ? 'short-term' : 'long-term'} goal.</p>
            <p class="text-xs text-gray-400 mt-1">${category === 'short' ? 'Short-term goals can use FDs, Savings, and Debt MFs.' : 'Long-term goals can use Equity MFs, Stocks, Gold ETFs, and Debt MFs.'}</p>
          </div>
        ` : `
          <div class="space-y-3">
            ${eligibleAssets.map(asset => {
              const assignment = currentAssignments.find(a => a.assetId === asset.id);
              const isSelected = assignment && assignment.amount > 0;
              const assignedAmount = assignment ? assignment.amount : 0;
              const availableForThis = getEffectiveAvailable(asset.id, goal.id);
              const originalLink = (wizardState.originalLinks[goal.id] || []).find(l => l.assetId === asset.id);
              const isOriginallyLinked = originalLink && originalLink.amount > 0;
              // "Use All" should cap at what the goal still needs (plus what this asset already contributes)
              const maxForGoal = remainingGoalNeed + assignedAmount;
              const useAllAmount = Math.min(availableForThis, maxForGoal);

              return `
                <div class="asset-container border rounded-lg p-3 ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}" data-asset-id="${asset.id}">
                  <div class="flex items-start gap-3">
                    <input type="checkbox" class="asset-checkbox mt-1"
                      ${isSelected ? 'checked' : ''}>
                    <div class="flex-1">
                      <div class="flex items-center justify-between gap-4 mb-1">
                        <div>
                          <span class="font-medium text-gray-800">${asset.name}</span>
                          ${isOriginallyLinked ? '<span class="ml-2 text-xs text-blue-600">(Currently linked)</span>' : ''}
                        </div>
                        <span class="text-xs text-gray-500 whitespace-nowrap">Available: ${formatCurrency(availableForThis, currency)}</span>
                      </div>
                      <div class="text-xs text-gray-500 mb-2">${asset.category}</div>

                      <div class="asset-controls ${isSelected ? '' : 'hidden'}">
                        <div class="flex items-center gap-2">
                          <div class="relative flex-1">
                            <span class="absolute left-2 top-1.5 text-gray-500 text-sm">${getSymbol(currency)}</span>
                            <input type="number" class="amount-input w-full pl-6 pr-2 py-1 border rounded text-sm"
                              value="${assignedAmount || ''}"
                              placeholder="Amount"
                              min="0"
                              max="${availableForThis}">
                          </div>
                          <button class="use-all-btn px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                            data-max="${useAllAmount}">
                            Use All
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Footer -->
      <div class="p-4 border-t bg-gray-50 flex justify-between">
        <div>
          ${wizardState.currentStep > 0 ? `
            <button id="wizard-back-btn" class="px-4 py-2 border rounded-lg hover:bg-gray-100 flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              Back
            </button>
          ` : `
            <button id="wizard-cancel-btn" class="px-4 py-2 border rounded-lg hover:bg-gray-100">
              Cancel
            </button>
          `}
        </div>
        <div class="flex gap-2">
          <button id="wizard-skip-btn" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            Skip Goal
          </button>
          <button id="wizard-next-btn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
            Next
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  // Add event listeners
  setupGoalStepListeners(goal);
}

/**
 * Setup event listeners for a goal step
 */
function setupGoalStepListeners(goal) {
  const modal = document.getElementById('goal-modal');

  // Checkbox toggles
  document.querySelectorAll('.asset-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const container = e.target.closest('.asset-container');
      const assetId = container.dataset.assetId;
      const controls = container.querySelector('.asset-controls');

      if (e.target.checked) {
        controls.classList.remove('hidden');
        container.classList.add('border-blue-300', 'bg-blue-50');
        container.classList.remove('border-gray-200');
      } else {
        controls.classList.add('hidden');
        container.classList.remove('border-blue-300', 'bg-blue-50');
        container.classList.add('border-gray-200');
        // Clear the amount
        updateAssignment(goal.id, assetId, 0);
        container.querySelector('.amount-input').value = '';
        updateLinkedTotal(goal.id);
      }
    });
  });

  // Amount input changes - update state without re-rendering
  document.querySelectorAll('.amount-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const container = e.target.closest('.asset-container');
      const assetId = container.dataset.assetId;
      const amount = parseFloat(e.target.value) || 0;
      const available = getEffectiveAvailable(assetId, goal.id);
      const validAmount = Math.min(Math.max(0, amount), available);

      updateAssignment(goal.id, assetId, validAmount);
      updateLinkedTotal(goal.id);
    });
  });

  // Use All buttons
  document.querySelectorAll('.use-all-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const container = e.target.closest('.asset-container');
      const assetId = container.dataset.assetId;
      const maxAmount = parseFloat(e.target.dataset.max) || 0;

      updateAssignment(goal.id, assetId, maxAmount);

      const amountInput = container.querySelector('.amount-input');
      if (amountInput) amountInput.value = maxAmount;

      updateLinkedTotal(goal.id);
    });
  });

  // Navigation buttons
  const backBtn = document.getElementById('wizard-back-btn');
  const cancelBtn = document.getElementById('wizard-cancel-btn');
  const skipBtn = document.getElementById('wizard-skip-btn');
  const nextBtn = document.getElementById('wizard-next-btn');

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      wizardState.currentStep--;
      renderWizardStep();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      wizardState.currentStep++;
      renderWizardStep();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      wizardState.currentStep++;
      renderWizardStep();
    });
  }

  // Close on backdrop click
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  };
}

/**
 * Update an assignment in wizard state
 */
function updateAssignment(goalId, assetId, amount) {
  if (!wizardState.assignments[goalId]) {
    wizardState.assignments[goalId] = [];
  }

  const existing = wizardState.assignments[goalId].find(a => a.assetId === assetId);
  if (existing) {
    existing.amount = amount;
  } else {
    wizardState.assignments[goalId].push({ assetId, amount });
  }
}

/**
 * Update the linked total display without re-rendering the entire wizard
 */
function updateLinkedTotal(goalId) {
  const displayEl = document.getElementById('linked-total-display');
  if (!displayEl) return;

  const assignments = wizardState.assignments[goalId] || [];
  const totalLinked = assignments.reduce((sum, a) => sum + (a.amount || 0), 0);

  displayEl.textContent = formatCurrency(totalLinked, currency);

  // Update styling based on whether there's a linked amount
  if (totalLinked > 0) {
    displayEl.classList.add('text-blue-600');
  } else {
    displayEl.classList.remove('text-blue-600');
  }
}

/**
 * Render the review step
 */
function renderReviewStep(content, totalSteps) {
  const modal = document.getElementById('goal-modal');

  // Calculate changes
  const changes = [];
  let totalNewlyLinked = 0;
  let totalRemoved = 0;

  wizardState.goals.forEach(goal => {
    const currentAssignments = wizardState.assignments[goal.id] || [];
    const originalLinks = wizardState.originalLinks[goal.id] || [];

    const goalChanges = {
      goal,
      added: [],
      modified: [],
      removed: []
    };

    // Check for added/modified
    currentAssignments.forEach(ca => {
      if (ca.amount <= 0) return;

      const original = originalLinks.find(o => o.assetId === ca.assetId);
      const asset = wizardState.availableAssets[ca.assetId];

      if (!original) {
        goalChanges.added.push({ asset, amount: ca.amount });
        totalNewlyLinked += ca.amount;
      } else if (original.amount !== ca.amount) {
        goalChanges.modified.push({ asset, oldAmount: original.amount, newAmount: ca.amount });
        totalNewlyLinked += Math.max(0, ca.amount - original.amount);
        totalRemoved += Math.max(0, original.amount - ca.amount);
      }
    });

    // Check for removed
    originalLinks.forEach(ol => {
      const current = currentAssignments.find(c => c.assetId === ol.assetId);
      if (!current || current.amount === 0) {
        const asset = wizardState.availableAssets[ol.assetId];
        goalChanges.removed.push({ asset, amount: ol.amount });
        totalRemoved += ol.amount;
      }
    });

    if (goalChanges.added.length > 0 || goalChanges.modified.length > 0 || goalChanges.removed.length > 0) {
      changes.push(goalChanges);
    }
  });

  const hasChanges = changes.length > 0;

  content.innerHTML = `
    <div class="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="p-4 border-b bg-gray-50">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-semibold text-gray-800">Review & Apply</h3>
          <span class="text-sm text-gray-500">Step ${totalSteps} of ${totalSteps}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-1.5">
          <div class="bg-blue-600 h-1.5 rounded-full" style="width: 100%"></div>
        </div>
      </div>

      <!-- Changes Summary -->
      <div class="flex-1 overflow-y-auto p-4">
        ${!hasChanges ? `
          <div class="text-center py-8 text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p class="text-sm">No changes to apply.</p>
            <p class="text-xs text-gray-400 mt-1">Go back to make some assignments.</p>
          </div>
        ` : `
          <div class="space-y-4">
            ${changes.map(change => {
              const category = getUnifiedCategory(change.goal.targetDate);
              return `
                <div class="border rounded-lg p-3">
                  <div class="flex items-center gap-2 mb-3">
                    <span class="font-medium text-gray-800">${change.goal.name}</span>
                    <span class="px-2 py-0.5 text-xs rounded ${category === 'short' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}">
                      ${category === 'short' ? 'Short Term' : 'Long Term'}
                    </span>
                  </div>

                  ${change.added.length > 0 ? `
                    <div class="mb-2">
                      <span class="text-xs font-medium text-green-700 uppercase">New Links</span>
                      ${change.added.map(a => `
                        <div class="flex justify-between items-center text-sm mt-1">
                          <span class="text-gray-700">${a.asset.name}</span>
                          <span class="font-medium text-green-600">+${formatCurrency(a.amount, currency)}</span>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}

                  ${change.modified.length > 0 ? `
                    <div class="mb-2">
                      <span class="text-xs font-medium text-blue-700 uppercase">Modified</span>
                      ${change.modified.map(m => `
                        <div class="flex justify-between items-center text-sm mt-1">
                          <span class="text-gray-700">${m.asset.name}</span>
                          <span class="font-medium text-blue-600">
                            ${formatCurrency(m.oldAmount, currency)} → ${formatCurrency(m.newAmount, currency)}
                          </span>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}

                  ${change.removed.length > 0 ? `
                    <div>
                      <span class="text-xs font-medium text-red-700 uppercase">Removed</span>
                      ${change.removed.map(r => `
                        <div class="flex justify-between items-center text-sm mt-1">
                          <span class="text-gray-700">${r.asset.name}</span>
                          <span class="font-medium text-red-600">-${formatCurrency(r.amount, currency)}</span>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <div class="mt-4 bg-blue-50 rounded-lg p-3">
            <div class="flex justify-between items-center text-sm">
              <span class="text-blue-700">Net change:</span>
              <span class="font-semibold ${totalNewlyLinked - totalRemoved >= 0 ? 'text-green-600' : 'text-red-600'}">
                ${totalNewlyLinked - totalRemoved >= 0 ? '+' : ''}${formatCurrency(totalNewlyLinked - totalRemoved, currency)}
              </span>
            </div>
          </div>
        `}
      </div>

      <!-- Footer -->
      <div class="p-4 border-t bg-gray-50 flex justify-between">
        <button id="wizard-back-btn" class="px-4 py-2 border rounded-lg hover:bg-gray-100 flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <div class="flex gap-2">
          <button id="wizard-cancel-btn" class="px-4 py-2 border rounded-lg hover:bg-gray-100">
            Cancel
          </button>
          <button id="wizard-apply-btn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}"
            ${!hasChanges ? 'disabled' : ''}>
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  `;

  // Event listeners
  document.getElementById('wizard-back-btn').addEventListener('click', () => {
    wizardState.currentStep--;
    renderWizardStep();
  });

  document.getElementById('wizard-cancel-btn').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  const applyBtn = document.getElementById('wizard-apply-btn');
  if (applyBtn && hasChanges) {
    applyBtn.addEventListener('click', applyWizardChanges);
  }

  // Close on backdrop click
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  };
}

/**
 * Apply all wizard changes to the data
 */
function applyWizardChanges() {
  const modal = document.getElementById('goal-modal');

  // Update each goal's linkedAssets
  wizardState.goals.forEach(goal => {
    const assignments = wizardState.assignments[goal.id] || [];
    const goalData = appData.goals.find(g => g.id === goal.id);

    if (goalData) {
      // Filter out zero amounts and build new linkedAssets array
      goalData.linkedAssets = assignments
        .filter(a => a.amount > 0)
        .map(a => ({ assetId: a.assetId, amount: a.amount }));
    }
  });

  // Save and refresh
  saveData(appData);
  modal.classList.add('hidden');
  renderInvestmentPlan();
  if (onDataChange) onDataChange();
}
