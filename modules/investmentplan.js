// Investment Plan module - Unified Portfolio View
import { formatCurrency, getFunds } from './currency.js';
import {
  UNIFIED_PORTFOLIO,
  getUnifiedCategory,
  getUnifiedBlendedReturn,
  calculateUnifiedGoalProjections,
  calculateRetirementProjectionsWithEpfNps,
  getYearsRemaining
} from './calculator.js';
import { getRetirementContributions } from './cashflow.js';

let appData = null;
let currency = 'INR';
let fundHouse = 'icici';
let equityAllocation = 60;
let equityReturn = 10;
let debtReturn = 5;
let arbitrageReturn = 6;
let epfReturn = 8;
let npsReturn = 9;
let onDataChange = null;

export function initInvestmentPlan(data, curr, fh, eqAlloc, eqReturn, debtRet, arbReturn, epfRet, npsRet, onChange) {
  appData = data;
  currency = curr;
  fundHouse = fh || 'icici';
  equityAllocation = eqAlloc ?? 60;
  equityReturn = eqReturn ?? 10;
  debtReturn = debtRet ?? 5;
  arbitrageReturn = arbReturn ?? 6;
  epfReturn = epfRet ?? 8;
  npsReturn = npsRet ?? 9;
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
      ? calculateRetirementProjectionsWithEpfNps(goal, getRetirementContributions(), equityReturn, debtReturn, arbitrageReturn, equityAllocation, epfReturn, npsReturn)
      : calculateUnifiedGoalProjections(goal, equityReturn, debtReturn, arbitrageReturn, equityAllocation);

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
 * Render goal row in the investment plan
 */
function renderGoalRow(goal) {
  const isRetirement = goal.goalType === 'retirement';
  const hasEpfNps = isRetirement && goal.projections.epfNps;

  return `
    <div class="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div class="flex-1">
        <div class="font-medium text-gray-800">${goal.name}</div>
        <div class="text-sm text-gray-500">
          ${formatCurrency(goal.targetAmount, currency)} in ${formatTimeline(goal.projections.years)}
          ${isRetirement ? '<span class="ml-1 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">Retirement</span>' : ''}
        </div>
        ${hasEpfNps ? `
          <div class="text-xs text-purple-600 mt-1">
            EPF/NPS is contributing additional ${formatCurrency(Math.round(goal.projections.epfNps.totalMonthly), currency)}/month
          </div>
        ` : ''}
      </div>
      <div class="text-right">
        <div class="font-semibold text-blue-600">${formatCurrency(Math.round(goal.projections.monthlySIP), currency)}</div>
        <div class="text-xs text-gray-500">per month</div>
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
        <p class="text-sm">Add goals in the Financial Goals tab to see your investment plan</p>
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

  container.innerHTML = `
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
              <span class="font-medium text-gray-700">Combined Monthly SIP</span>
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
              <span class="font-medium text-gray-700">Combined Monthly SIP</span>
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
}

/**
 * Update the summary section with cashflow comparison
 */
function updateSummary(totalSIP) {
  const totalSIPElement = document.getElementById('plan-total-sip');
  const availableElement = document.getElementById('plan-available-cashflow');
  const gapElement = document.getElementById('plan-gap');
  const gapLabel = document.getElementById('plan-gap-label');

  if (!totalSIPElement) return;

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
