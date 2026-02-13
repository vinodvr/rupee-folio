// Plan module - Unified Portfolio View
import { formatCurrency, formatCompact } from './currency.js';
import {
  UNIFIED_PORTFOLIO,
  getUnifiedCategory,
  getUnifiedBlendedReturn,
  getTaperedEquityAllocation,
  calculateUnifiedGoalProjections,
  calculateRetirementProjectionsWithEpfNps,
  formatTimeline
} from './calculator.js';
import { getRetirementContributions } from './cashflow.js';
import { showEstimateModal, showAddGoalModal } from './goals.js';
import { getAssetAllocations } from './assets.js';

let appData = null;
let currency = 'INR';
let equityAllocation = 60;
let equityReturn = 10;
let debtReturn = 5;
let arbitrageReturn = 6;
let epfReturn = 8;
let npsReturn = 9;
let epfStepUp = 5;
let npsStepUp = 0;
let investmentStepUp = 5;
let onDataChange = null;

export function initInvestmentPlan(data, curr, eqAlloc, eqReturn, debtRet, arbReturn, epfRet, npsRet, epfStep, npsStep, invStep, onChange) {
  appData = data;
  currency = curr;
  equityAllocation = eqAlloc ?? 60;
  equityReturn = eqReturn ?? 10;
  debtReturn = debtRet ?? 5;
  arbitrageReturn = arbReturn ?? 6;
  epfReturn = epfRet ?? 8;
  npsReturn = npsRet ?? 9;
  epfStepUp = epfStep ?? 5;
  npsStepUp = npsStep ?? 0;
  investmentStepUp = invStep ?? 5;
  onDataChange = onChange;
  renderInvestmentPlan();
}

export function updateCurrency(curr) {
  currency = curr;
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

export function updateStepUp(epfStep, npsStep, invStep) {
  epfStepUp = epfStep ?? epfStepUp;
  npsStepUp = npsStep ?? npsStepUp;
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
      ? calculateRetirementProjectionsWithEpfNps(goal, getRetirementContributions(), equityReturn, debtReturn, arbitrageReturn, equityAllocation, epfReturn, npsReturn, epfStepUp, npsStepUp, investmentStepUp, appData.assets)
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
export function calculateCategorySummary(goals, category) {
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
    // Long term: Per-goal equity/debt split using equity reduction schedule
    let totalEquity = 0;
    let totalDebt = 0;
    goals.forEach(g => {
      const goalEquity = getTaperedEquityAllocation(g.projections.years, equityAllocation);
      const goalSIP = g.projections.monthlySIP;
      totalEquity += goalSIP * (goalEquity / 100);
      totalDebt += goalSIP * ((100 - goalEquity) / 100);
    });

    const effectiveEquity = totalSIP > 0 ? Math.round(totalEquity / totalSIP * 100) : equityAllocation;
    const nifty50Amount = totalEquity * (UNIFIED_PORTFOLIO.LONG_TERM.equitySplit.nifty50 / 100);
    const niftyNext50Amount = totalEquity * (UNIFIED_PORTFOLIO.LONG_TERM.equitySplit.niftyNext50 / 100);

    return {
      totalSIP,
      blendedReturn,
      effectiveEquity,
      allocation: {
        nifty50: nifty50Amount,
        niftyNext50: niftyNext50Amount,
        moneyMarket: totalDebt
      }
    };
  }
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
    <div class="bg-blue-50 rounded-lg p-4">
      <!-- Line 1: Goal name -->
      <div class="font-medium text-gray-800 flex items-center gap-1.5">
        <span class="flex-1">${goal.name}</span>
        <button type="button" class="edit-goal-btn shrink-0 text-gray-400 hover:text-blue-600 cursor-pointer p-0.5 -mr-0.5 rounded" data-goal-id="${goal.id}" title="Edit goal">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
      </div>
      <!-- Target, duration, and estimate link -->
      <div class="text-sm text-gray-500 mt-1">
        <span>${formatCompact(goal.targetAmount, currency)}</span>
        <span class="mx-1">·</span>
        <span>${formatTimeline(goal.projections.years)}</span>
        ${isRetirement ? '<span class="mx-1">·</span><button type="button" class="estimate-retirement-link text-sm text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer">Estimate FI</button>' : ''}
      </div>
      <!-- SIP amount + View Details -->
      <div class="flex items-center justify-between mt-5">
        <div>
          ${Math.round(goal.projections.monthlySIP) === 0
            ? '<span class="text-sm text-green-600">&#10003; Achieved</span>'
            : `<span class="font-semibold text-blue-600">${formatCurrency(Math.round(goal.projections.monthlySIP), currency)}</span>
               <span class="text-xs text-gray-500">/month</span>`
          }
        </div>
        <div>
          <button class="toggle-details-btn text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1 py-1 px-1.5 -mr-1.5 rounded" data-target="${detailsId}">
            <span class="toggle-text">View Details</span>
            <svg class="w-3.5 h-3.5 toggle-icon transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Expandable Details — Money Waterfall -->
      <div id="${detailsId}" class="goal-details-expanded hidden mt-3 bg-blue-100/50 rounded-lg p-4">
        <div class="text-sm text-gray-600 space-y-2">
          <div class="flex justify-between gap-4">
            <span>Future Value</span>
            <span class="font-medium text-gray-700 text-right">${formatCurrency(Math.round(goal.projections.inflationAdjustedTarget), currency)}</span>
          </div>
          ${linkedAssetsList.length > 0 ? `
            <div class="flex justify-between gap-4">
              <span>Linked Assets</span>
            </div>
            ${linkedAssetsList.map(la => `
              <div class="flex justify-between gap-4 pl-3">
                <span class="text-gray-500">${la.name}</span>
                <span class="text-gray-500 text-right">${formatCurrency(la.amount, currency)}</span>
              </div>
            `).join('')}
            <div class="flex justify-between gap-4">
              <span>Linked Assets FV</span>
              <span class="font-medium text-blue-600 text-right">-${formatCurrency(Math.round(linkedFV), currency)}</span>
            </div>
          ` : ''}
          ${hasEpfNps ? `
            <div class="flex justify-between gap-4">
              <span>EPF/NPS FV</span>
              <span class="font-medium text-purple-600 text-right">-${formatCurrency(Math.round(epfNpsFV), currency)}</span>
            </div>
          ` : ''}
          ${totalDeductions > 0 ? `
            <div class="flex justify-between gap-4 border-t border-gray-300 pt-2 mt-1">
              <span class="font-medium text-gray-700">Gap to fill</span>
              <span class="font-medium text-gray-800 text-right">${formatCurrency(Math.round(goal.projections.gapAmount), currency)}</span>
            </div>
          ` : ''}
          <div class="flex justify-between gap-4 ${totalDeductions > 0 ? '' : 'border-t border-gray-300 pt-2 mt-1'}">
            <span class="font-medium text-gray-700">Monthly SIP</span>
            <span class="font-semibold text-blue-600 text-right">${
              Math.round(goal.projections.monthlySIP) === 0
                ? '<span class="text-green-600">&#10003; Achieved</span>'
                : formatCurrency(Math.round(goal.projections.monthlySIP), currency)
            }</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render inline existing investments content (assigned to goals + unassigned)
 */
function renderExistingInvestments() {
  const compact = (v) => formatCompact(v, currency);
  const items = appData?.assets?.items || [];
  const goals = appData?.goals || [];

  const sortedGoals = [...goals].sort((a, b) => {
    const catA = getUnifiedCategory(a.targetDate);
    const catB = getUnifiedCategory(b.targetDate);
    if (catA === 'short' && catB === 'long') return -1;
    if (catA === 'long' && catB === 'short') return 1;
    return new Date(a.targetDate) - new Date(b.targetDate);
  });

  const goalRowsHtml = sortedGoals.map(goal => {
    const linked = goal.linkedAssets || [];
    const validLinks = linked.filter(la => items.find(a => a.id === la.assetId));
    const assetLines = [];

    validLinks.forEach(la => {
      const asset = items.find(a => a.id === la.assetId);
      if (!asset) return;
      assetLines.push({ name: asset.name, amount: la.amount });
    });

    if (goal.goalType === 'retirement' && goal.includeEpfNps) {
      const epfAsset = items.find(a => a.category === 'EPF Corpus');
      const npsAsset = items.find(a => a.category === 'NPS Corpus');
      if (epfAsset && epfAsset.value > 0) assetLines.push({ name: epfAsset.name, amount: epfAsset.value });
      if (npsAsset && npsAsset.value > 0) assetLines.push({ name: npsAsset.name, amount: npsAsset.value });
    }

    if (assetLines.length === 0) {
      return `
        <div class="flex justify-between items-center py-2">
          <span class="text-sm text-gray-700">${goal.name}</span>
          <span class="text-xs text-gray-400 italic">No existing assets</span>
        </div>`;
    }

    const totalAmount = assetLines.reduce((s, a) => s + a.amount, 0);
    const detailLines = assetLines.map(a => `
      <div class="flex justify-between text-xs text-gray-500">
        <span>${a.name}</span>
        <span>${compact(a.amount)}</span>
      </div>`).join('');

    return `
      <div class="py-2">
        <div class="flex justify-between items-center">
          <span class="text-sm text-gray-700">${goal.name}</span>
          <span class="text-sm font-medium text-gray-800">${compact(totalAmount)}</span>
        </div>
        <div class="mt-1 space-y-0.5">${detailLines}</div>
      </div>`;
  }).join('');

  const allocations = getAssetAllocations(appData);
  const unallocated = Object.entries(allocations)
    .filter(([, info]) => info.available > 0.01)
    .map(([assetId, info]) => {
      const asset = items.find(a => a.id === assetId);
      return asset ? { name: asset.name, available: info.available, total: info.total } : null;
    })
    .filter(Boolean);

  let unallocatedHtml;
  if (unallocated.length === 0) {
    unallocatedHtml = '<div class="text-sm text-emerald-600 py-2">All assets fully assigned</div>';
  } else {
    unallocatedHtml = unallocated.map(a => `
      <div class="flex justify-between items-center py-2">
        <span class="text-sm text-gray-700">${a.name}</span>
        <span class="text-sm text-gray-500">${compact(a.available)} <span class="text-xs text-gray-400">of ${compact(a.total)}</span></span>
      </div>`).join('');
  }

  return `
    <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Existing Assets used for goals</h4>
    <div class="divide-y divide-gray-100">${goalRowsHtml}</div>
    <div class="mt-4 pt-3 border-t border-gray-100">
      <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Not assigned</h4>
      <div class="divide-y divide-gray-100">${unallocatedHtml}</div>
    </div>
  `;
}

/**
 * Read a DOM element's text, returning '–' if missing
 */
function readDomText(id) {
  return document.getElementById(id)?.textContent || '–';
}

/**
 * Clone the asset distribution chart SVG, restyled for a light background
 */
function cloneAssetChart() {
  const source = document.getElementById('asset-allocation-chart');
  if (!source || !source.querySelector('svg')) return '';

  const clone = source.cloneNode(true);
  clone.removeAttribute('id');
  // Restyle legend text for light background
  clone.querySelectorAll('.text-slate-200').forEach(el => {
    el.classList.replace('text-slate-200', 'text-gray-700');
  });
  clone.querySelectorAll('.text-white').forEach(el => {
    el.classList.replace('text-white', 'text-gray-900');
  });
  // Fix background circle stroke for light background
  clone.querySelectorAll('circle[stroke="rgba(255,255,255,0.1)"]').forEach(el => {
    el.setAttribute('stroke', 'rgba(0,0,0,0.08)');
  });

  return `
    <div class="bg-gray-50 rounded-lg p-4">
      <h3 class="text-sm font-semibold text-gray-700 mb-2">Asset Distribution</h3>
      ${clone.innerHTML}
    </div>
  `;
}

/**
 * Build the print-only snapshot (header, cashflow, net worth, chart)
 */
function buildPrintSnapshot() {
  const now = new Date();
  const date = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const section = document.createElement('div');
  section.id = 'print-snapshot';
  section.className = 'print-only hidden mb-6';
  section.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <span class="text-lg font-bold text-gray-800">RupeeFolio</span>
      <span class="text-sm text-gray-500">${date}, ${time}</span>
    </div>
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div class="bg-gray-50 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-gray-700 mb-2">Monthly Cash Flow</h3>
        <div class="text-sm space-y-1">
          <div class="flex justify-between"><span>Income</span><span class="font-medium">${readDomText('total-income')}</span></div>
          <div class="flex justify-between"><span>Expenses</span><span class="font-medium">${readDomText('total-expenses')}</span></div>
          <div class="flex justify-between border-t pt-1 mt-1"><span class="font-medium">Available</span><span class="font-semibold text-green-600">${readDomText('net-cashflow')}</span></div>
          <div class="flex justify-between"><span>Savings Rate</span><span class="font-medium">${readDomText('savings-rate')}</span></div>
        </div>
      </div>
      <div class="bg-gray-50 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-gray-700 mb-2">Net Worth</h3>
        <div class="text-sm space-y-1">
          <div class="flex justify-between"><span>Assets</span><span class="font-medium">${readDomText('total-assets')}</span></div>
          <div class="flex justify-between"><span>Liabilities</span><span class="font-medium">${readDomText('total-liabilities')}</span></div>
          <div class="flex justify-between border-t pt-1 mt-1"><span class="font-semibold">Net Worth</span><span class="font-bold text-emerald-600">${readDomText('net-worth')}</span></div>
        </div>
      </div>
    </div>
    ${cloneAssetChart()}
  `;
  return section;
}

/**
 * Handle Export as PDF — expand details, inject print snapshot, trigger print, clean up
 */
function handleExportPlan() {
  // Expand all collapsed goal details before printing
  document.querySelectorAll('#investment-plan-content .goal-details-expanded.hidden').forEach(el => {
    el.classList.remove('hidden');
  });

  const container = document.getElementById('investment-plan-content');
  const printSection = buildPrintSnapshot();
  container.prepend(printSection);
  window.print();
  printSection.remove();
}

/**
 * Main render function for the Plan tab
 */
function renderInvestmentPlan() {
  const container = document.getElementById('investment-plan-content');
  if (!container) return;

  // Show/hide allocation row, compute utilization %, and render inline content
  const planAllocRow = document.getElementById('plan-view-allocation-row');
  const planAllocLabel = document.getElementById('plan-view-allocation-label');
  const existingBody = document.getElementById('existing-investments-body');
  if (planAllocRow) {
    const hasLinkedAssets = appData.goals.some(g => g.linkedAssets && g.linkedAssets.length > 0);
    const hasAssets = appData.assets?.items?.length > 0;
    const show = hasLinkedAssets || (appData.goals.length > 0 && hasAssets);
    planAllocRow.classList.toggle('hidden', !show);

    if (show) {
      const allocations = getAssetAllocations(appData);
      let totalValue = 0;
      let totalAllocated = 0;
      Object.values(allocations).forEach(info => {
        totalValue += info.total;
        totalAllocated += info.allocated;
      });
      const pct = totalValue > 0 ? Math.round((totalAllocated / totalValue) * 100) : 0;
      if (planAllocLabel) planAllocLabel.textContent = `${pct}% of assets used for goals`;
      if (existingBody) existingBody.innerHTML = renderExistingInvestments();
    }
  }

  const exportRow = document.getElementById('export-plan-row');

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
    if (exportRow) exportRow.classList.add('hidden');
    updateSummary(0);
    return;
  }

  const { shortTerm, longTerm } = categorizeGoals();

  const shortTermSummary = calculateCategorySummary(shortTerm, 'short');
  const longTermSummary = calculateCategorySummary(longTerm, 'long');
  const totalSIP = shortTermSummary.totalSIP + longTermSummary.totalSIP;

  container.innerHTML = `
    <!-- Short Term Goals -->
    <div class="bg-white rounded-lg shadow-sm p-5 mb-6">
      <div class="mb-3">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold text-gray-800">Short Term Goals</h3>
          <div class="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium whitespace-nowrap">
            ${shortTerm.length} goal${shortTerm.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      ${shortTerm.length === 0 ? `
        <p class="text-gray-500 text-sm italic py-4">No short-term goals</p>
      ` : `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          ${shortTerm.map(g => renderGoalRow(g)).join('')}
        </div>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 pt-4 border-t">
          <span class="font-medium text-gray-700">Total SIP for Short Term Goals</span>
          <span class="text-xl font-bold text-amber-600">${formatCurrency(Math.round(shortTermSummary.totalSIP), currency)}</span>
        </div>
      `}
    </div>

    <!-- Long Term Goals -->
    <div class="bg-white rounded-lg shadow-sm p-5 mb-6">
      <div class="mb-3">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold text-gray-800">Long Term Goals</h3>
          <div class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium whitespace-nowrap">
            ${longTerm.length} goal${longTerm.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      ${longTerm.length === 0 ? `
        <p class="text-gray-500 text-sm italic py-4">No long-term goals</p>
      ` : `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          ${longTerm.map(g => renderGoalRow(g)).join('')}
        </div>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 pt-4 border-t">
          <span class="font-medium text-gray-700">Total SIP for Long Term Goals</span>
          <span class="text-xl font-bold text-green-600">${formatCurrency(Math.round(longTermSummary.totalSIP), currency)}</span>
        </div>
      `}
    </div>

    <!-- Recommended Funds -->
    <div class="bg-white rounded-lg shadow-sm p-5">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Recommended Funds</h3>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Short Term Goals SIP -->
        <div class="border rounded-lg p-4">
          <h4 class="text-sm font-semibold text-amber-700 mb-2">Short Term Goals SIP</h4>
          ${shortTermSummary.totalSIP > 0 ? `
            <div class="flex justify-between items-center flex-wrap gap-y-0.5">
              <span class="text-sm text-gray-700">Equity Arbitrage Fund Direct Plan</span>
              <span class="font-semibold text-gray-800 whitespace-nowrap">${formatCurrency(Math.round(shortTermSummary.allocation.arbitrage), currency)}</span>
            </div>
          ` : `
            <p class="text-gray-500 text-sm italic">No short-term goals</p>
          `}
        </div>

        <!-- Long Term Goals Equity SIP -->
        <div class="border rounded-lg p-4">
          <h4 class="text-sm font-semibold text-green-700 mb-2">Long Term Goals Equity SIP (${longTermSummary.effectiveEquity}%)</h4>
          ${longTermSummary.totalSIP > 0 ? `
            <div class="space-y-2">
              <div class="flex justify-between items-center flex-wrap gap-y-0.5">
                <span class="text-sm text-gray-700">Nifty 50 Index Fund Direct Plan</span>
                <span class="font-semibold text-gray-800 whitespace-nowrap">${formatCurrency(Math.round(longTermSummary.allocation.nifty50), currency)}</span>
              </div>
              <div class="flex justify-between items-center flex-wrap gap-y-0.5">
                <span class="text-sm text-gray-700">Nifty Next 50 Index Fund Direct Plan</span>
                <span class="font-semibold text-gray-800 whitespace-nowrap">${formatCurrency(Math.round(longTermSummary.allocation.niftyNext50), currency)}</span>
              </div>
            </div>
          ` : `
            <p class="text-gray-500 text-sm italic">No long-term goals</p>
          `}
        </div>

        <!-- Long Term Goals Debt SIP -->
        <div class="border rounded-lg p-4">
          <h4 class="text-sm font-semibold text-blue-700 mb-2">Long Term Goals Debt SIP (${100 - longTermSummary.effectiveEquity}%)</h4>
          ${longTermSummary.totalSIP > 0 ? `
            <div class="flex justify-between items-center flex-wrap gap-y-0.5">
              <span class="text-sm text-gray-700">Money Market Fund Direct Plan</span>
              <span class="font-semibold text-gray-800 whitespace-nowrap">${formatCurrency(Math.round(longTermSummary.allocation.moneyMarket), currency)}</span>
            </div>
          ` : `
            <p class="text-gray-500 text-sm italic">No long-term goals</p>
          `}
        </div>
      </div>

      <!-- Total -->
      <div class="mt-4 pt-4 border-t flex flex-wrap items-center gap-x-4 gap-y-1">
        <span class="font-semibold text-gray-800">Total Monthly SIP</span>
        <span class="text-xl font-bold text-blue-600">${formatCurrency(Math.round(totalSIP), currency)}</span>
      </div>
    </div>
  `;

  updateSummary(totalSIP);

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

  // Add event listeners for estimate retirement links
  document.querySelectorAll('#investment-plan-content .estimate-retirement-link').forEach(btn => {
    btn.addEventListener('click', () => showEstimateModal());
  });

  // Add event listeners for edit goal buttons
  document.querySelectorAll('#investment-plan-content .edit-goal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const goalId = btn.dataset.goalId;
      const goal = appData.goals.find(g => g.id === goalId);
      if (goal) showAddGoalModal(goal);
    });
  });

  // Show export button when goals exist
  if (exportRow) exportRow.classList.remove('hidden');

  // Export as PDF handler
  const exportBtn = document.getElementById('export-plan-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', handleExportPlan);
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

