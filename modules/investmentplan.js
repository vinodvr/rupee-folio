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
          <span class="font-semibold text-blue-600">${formatCurrency(Math.round(goal.projections.monthlySIP), currency)}</span>
          <span class="text-xs text-gray-500">/month</span>
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
          <span class="toggle-text">Details</span>
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

  // Check if there are linkable assets available
  const allocations = getAssetAllocations(appData);
  const hasAvailableAssets = Object.values(allocations).some(a => a.available > 0);

  container.innerHTML = `
    <!-- Assign Existing Investments Button -->
    ${hasAvailableAssets ? `
      <div class="mb-4 flex justify-end">
        <button id="auto-assign-assets-btn" class="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
          <span>Assign Existing Investments to Goals</span>
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
    autoAssignBtn.addEventListener('click', showAutoAssignModal);
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
 * Show auto-assign preview modal
 */
function showAutoAssignModal() {
  const modal = document.getElementById('goal-modal');
  const content = document.getElementById('goal-modal-content');

  const assignments = calculateAutoAssignments();

  if (assignments.length === 0) {
    content.innerHTML = `
      <div class="bg-white rounded-lg p-6 w-full max-w-lg">
        <h3 class="text-xl font-semibold mb-4">Assign Existing Investments</h3>
        <div class="text-center py-8 text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-sm">No additional investments to assign.</p>
          <p class="text-xs text-gray-400 mt-1">All available investments are already linked to goals, or no matching types found.</p>
        </div>
        <div class="flex justify-end pt-4 border-t">
          <button id="close-auto-assign-btn" class="px-4 py-2 border rounded-lg hover:bg-gray-50">Close</button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    document.getElementById('close-auto-assign-btn').addEventListener('click', () => {
      modal.classList.add('hidden');
    });
    return;
  }

  // Group assignments by goal
  const groupedByGoal = {};
  assignments.forEach(a => {
    if (!groupedByGoal[a.goalId]) {
      groupedByGoal[a.goalId] = {
        goalName: a.goalName,
        goalCategory: a.goalCategory,
        assignments: []
      };
    }
    groupedByGoal[a.goalId].assignments.push(a);
  });

  const totalAssigned = assignments.reduce((sum, a) => sum + a.amount, 0);

  content.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <h3 class="text-xl font-semibold mb-2">Assign Existing Investments</h3>
      <p class="text-sm text-gray-500 mb-4">Review the proposed assignments below. This will link your existing investments to goals to reduce required SIP.</p>

      <div class="space-y-4 mb-6">
        ${Object.entries(groupedByGoal).map(([goalId, data]) => `
          <div class="border rounded-lg p-3">
            <div class="flex items-center gap-2 mb-2">
              <span class="font-medium text-gray-800">${data.goalName}</span>
              <span class="px-2 py-0.5 text-xs rounded ${data.goalCategory === 'short' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}">
                ${data.goalCategory === 'short' ? 'Short Term' : 'Long Term'}
              </span>
            </div>
            <div class="space-y-1">
              ${data.assignments.map(a => `
                <div class="flex items-center justify-between text-sm">
                  <div>
                    <span class="text-gray-700">${a.assetName}</span>
                    <span class="text-xs text-gray-400 ml-1">(${a.assetCategory})</span>
                  </div>
                  <span class="font-medium text-blue-600">${formatCurrency(a.amount, currency)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="bg-blue-50 rounded-lg p-3 mb-4">
        <div class="flex justify-between items-center">
          <span class="text-sm text-blue-700">Total to be linked:</span>
          <span class="font-semibold text-blue-700">${formatCurrency(totalAssigned, currency)}</span>
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-4 border-t">
        <button id="cancel-auto-assign-btn" class="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
        <button id="apply-auto-assign-btn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Apply Assignments
        </button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  document.getElementById('cancel-auto-assign-btn').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  document.getElementById('apply-auto-assign-btn').addEventListener('click', () => {
    // Apply all assignments
    assignments.forEach(a => {
      const goal = appData.goals.find(g => g.id === a.goalId);
      if (goal) {
        if (!goal.linkedAssets) {
          goal.linkedAssets = [];
        }
        // Check if already linked (shouldn't happen but be safe)
        const existing = goal.linkedAssets.find(la => la.assetId === a.assetId);
        if (existing) {
          existing.amount += a.amount;
        } else {
          goal.linkedAssets.push({ assetId: a.assetId, amount: a.amount });
        }
      }
    });

    // Save and refresh
    saveData(appData);
    modal.classList.add('hidden');
    renderInvestmentPlan();
    if (onDataChange) onDataChange();
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
}
