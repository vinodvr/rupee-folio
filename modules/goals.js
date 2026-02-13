// Goals CRUD and UI - Simplified for Unified Portfolio
import { addGoal, updateGoal, deleteGoal } from './storage.js';
import { formatCurrency, formatCompact, getSymbol } from './currency.js';
import {
  getYearsRemaining,
  getUnifiedCategory,
  getCategoryDisplay,
  formatTimeline
} from './calculator.js';
import { getAssetAllocations, getGoalLinkedTotal } from './assets.js';

let appData = null;
let currency = 'INR';
let equityReturn = 10;
let debtReturn = 5;
let arbitrageReturn = 6;
let onDataChange = null;

export function initGoals(data, curr, eqReturn, debtRet, arbReturn, onChange) {
  appData = data;
  currency = curr;
  equityReturn = eqReturn ?? 10;
  debtReturn = debtRet ?? 5;
  arbitrageReturn = arbReturn ?? 6;
  onDataChange = onChange;
  renderGoalsList();
  setupEventListeners();
}

export function updateReturns(eqReturn, debtRet, arbReturn) {
  equityReturn = eqReturn;
  debtReturn = debtRet;
  arbitrageReturn = arbReturn;
  renderGoalsList();
}

export function updateCurrency(curr) {
  currency = curr;
  renderGoalsList();
}

export function refreshData(data) {
  appData = data;
  renderGoalsList();
}

function setupEventListeners() {
  document.getElementById('add-goal-btn')?.addEventListener('click', () => showAddGoalModal(null));
}

export function showAddGoalModal(editGoal = null) {
  // Handle case where event object is passed instead of goal
  if (editGoal instanceof Event || (editGoal && !editGoal.id)) {
    editGoal = null;
  }

  const modal = document.getElementById('goal-modal');
  const content = document.getElementById('goal-modal-content');
  const isEdit = editGoal !== null;

  // Calculate default target (10 years from now)
  const now = new Date();
  const defaultMonth = now.getMonth(); // 0-indexed
  const defaultYear = now.getFullYear() + 10;

  // Parse existing targetDate for editing
  let selectedMonth = defaultMonth;
  let selectedYear = defaultYear;
  if (isEdit && editGoal.targetDate) {
    const existingDate = new Date(editGoal.targetDate);
    selectedMonth = existingDate.getMonth();
    selectedYear = existingDate.getFullYear();
  }

  const goal = isEdit ? editGoal : {
    name: '',
    goalType: 'one-time',
    targetAmount: '',
    inflationRate: 6
  };

  // Generate month options
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const monthOptions = months.map((m, i) =>
    `<option value="${i}" ${i === selectedMonth ? 'selected' : ''}>${m}</option>`
  ).join('');

  // Generate year options (current year to +40 years)
  const currentYear = now.getFullYear();
  const yearOptions = Array.from({ length: 41 }, (_, i) => currentYear + i)
    .map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`)
    .join('');

  content.innerHTML = `
    <div class="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <h3 class="text-xl font-semibold mb-6">${isEdit ? 'Edit Goal' : 'Add New Goal'}</h3>

      <div class="space-y-4">
        <!-- Goal Name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Goal Name</label>
          <input type="text" id="goal-name" value="${goal.name}" placeholder="e.g., Child Education, Retirement"
            class="w-full px-3 py-2 border rounded-lg">
        </div>

        <!-- Goal Type -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Goal Type</label>
          <select id="goal-type" class="w-full px-3 py-2 border rounded-lg">
            <option value="one-time" ${(goal.goalType || 'one-time') === 'one-time' ? 'selected' : ''}>One-time (e.g., Education, House, Car)</option>
            <option value="retirement" ${goal.goalType === 'retirement' ? 'selected' : ''}>Retirement</option>
          </select>
        </div>

        <!-- Target Amount -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Target Amount (today's value)</label>
          <div class="relative">
            <span class="absolute left-3 top-2 text-gray-500">${getSymbol(currency)}</span>
            <input type="number" id="goal-amount" value="${goal.targetAmount}" placeholder="e.g., 5000000"
              class="w-full pl-8 pr-3 py-2 border rounded-lg">
          </div>
          <div id="estimate-retirement-container" class="${(goal.goalType || 'one-time') === 'retirement' ? '' : 'hidden'}">
            <button type="button" id="estimate-retirement-btn" class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 px-3 py-1.5 rounded-lg shadow-sm mt-1.5 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              Estimate FI Corpus
            </button>
          </div>
        </div>

        <!-- Inflation Rate -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Inflation Rate (%)</label>
          <input type="number" id="goal-inflation" value="${goal.inflationRate}" min="0" max="15" step="0.5"
            class="w-full px-3 py-2 border rounded-lg">
          <p class="text-xs text-gray-500 mt-1">Education: 6-8%, General: 4-5%</p>
        </div>

        <!-- Target Month & Year -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Target Month & Year</label>
          <div class="flex gap-3">
            <select id="goal-month" class="flex-1 px-3 py-2 border rounded-lg">
              ${monthOptions}
            </select>
            <select id="goal-year" class="w-28 px-3 py-2 border rounded-lg">
              ${yearOptions}
            </select>
          </div>
        </div>

        <!-- EPF/NPS Step-Up (Retirement only) -->
        <div id="epf-nps-stepup-container" class="${(goal.goalType || 'one-time') === 'retirement' ? '' : 'hidden'}">
          <div class="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" id="goal-epf-nps-stepup" ${goal.includeEpfNps ? 'checked' : ''}
                class="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500">
              <div>
                <span class="text-sm font-medium text-purple-800">EPF/NPS deductions from income</span>
                <p class="text-xs text-purple-600">Include EPF/NPS contributions in retirement calculation</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
        <button id="cancel-goal-btn" class="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
        <button id="save-goal-btn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          ${isEdit ? 'Update Goal' : 'Create Goal'}
        </button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  const goalTypeSelect = document.getElementById('goal-type');

  // Show/hide retirement-specific options based on goal type
  goalTypeSelect.addEventListener('change', () => {
    const epfNpsContainer = document.getElementById('epf-nps-stepup-container');
    const estimateContainer = document.getElementById('estimate-retirement-container');
    if (goalTypeSelect.value === 'retirement') {
      epfNpsContainer.classList.remove('hidden');
      estimateContainer.classList.remove('hidden');
    } else {
      epfNpsContainer.classList.add('hidden');
      estimateContainer.classList.add('hidden');
    }
  });

  // Cancel button
  document.getElementById('cancel-goal-btn').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  // Save button
  document.getElementById('save-goal-btn').addEventListener('click', () => {
    const name = document.getElementById('goal-name').value.trim();
    const goalType = document.getElementById('goal-type').value;
    const targetAmount = parseFloat(document.getElementById('goal-amount').value);
    const inflationRate = parseFloat(document.getElementById('goal-inflation').value);
    const targetMonth = parseInt(document.getElementById('goal-month').value);
    const targetYear = parseInt(document.getElementById('goal-year').value);
    const includeEpfNps = goalType === 'retirement' ? document.getElementById('goal-epf-nps-stepup').checked : false;

    if (!name) {
      alert('Please enter a goal name');
      return;
    }
    if (isNaN(targetAmount) || targetAmount <= 0) {
      alert('Please enter a valid target amount');
      return;
    }
    const maxTargetAmount = 100000000; // 10 Crore
    if (targetAmount > maxTargetAmount) {
      alert('Target amount cannot exceed ₹10 Crore');
      return;
    }

    // Construct targetDate as first day of selected month/year
    const targetDate = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`;

    // Validate target date is in the future
    const now = new Date();
    const targetDateObj = new Date(targetDate);
    if (targetDateObj <= now) {
      alert('Target date must be in the future');
      return;
    }

    const goalData = {
      name,
      goalType,
      targetAmount,
      inflationRate,
      targetDate,
      includeEpfNps
    };

    if (isEdit) {
      updateGoal(appData, goal.id, goalData);
    } else {
      goalData.startDate = new Date().toISOString().split('T')[0];
      addGoal(appData, goalData);
    }

    modal.classList.add('hidden');
    renderGoalsList();
    if (onDataChange) onDataChange();
  });

  // Estimate retirement corpus button
  document.getElementById('estimate-retirement-btn').addEventListener('click', () => {
    showEstimateModal();
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
}

// Constants matching personaData.js
const RETIREMENT_EXPENSE_RATIO = 0.70;
const HEALTHCARE_PERCENT = 0.05;
const HEALTHCARE_CAP = 25000;
const LIFE_EXPECTANCY = 90;

export function calculateRetirementEstimate() {
  const expenses = appData?.cashflow?.expenses || [];
  const incomes = appData?.cashflow?.income || [];

  if (expenses.length === 0 && incomes.length === 0) {
    return null;
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const emiExpenses = expenses
    .filter(e => e.category === 'EMIs/Loans')
    .reduce((sum, e) => sum + e.amount, 0);
  const nonEmiExpenses = totalExpenses - emiExpenses;
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);

  const healthcare = Math.round(
    Math.min(totalIncome * HEALTHCARE_PERCENT, HEALTHCARE_CAP) / 1000
  ) * 1000;
  const monthlyRetirement = Math.round(nonEmiExpenses * RETIREMENT_EXPENSE_RATIO + healthcare);

  const retirementAges = [45, 50, 55];
  const estimates = retirementAges.map(age => {
    const yearsInRetirement = LIFE_EXPECTANCY - age;
    const corpus = monthlyRetirement * 12 * yearsInRetirement;
    // Round to nearest 10 Lakh (1,000,000)
    const rounded = Math.round(corpus / 1000000) * 1000000;
    return { age, yearsInRetirement, corpus: rounded };
  });

  return {
    nonEmiExpenses,
    totalIncome,
    healthcare,
    monthlyRetirement,
    estimates
  };
}

export function showEstimateModal() {
  const estimate = calculateRetirementEstimate();

  const formulaHtml = `
    <div>
      <div class="flex items-center gap-2 mb-3">
        <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
        </div>
        <h4 class="font-semibold text-gray-900">The Formula</h4>
      </div>
      <div class="bg-gray-50 rounded-lg p-4 space-y-2.5 text-sm">
        <div class="flex items-start gap-2">
          <span class="text-emerald-500 mt-0.5 flex-shrink-0">1.</span>
          <p class="text-gray-700"><span class="font-medium text-gray-900">Monthly retirement spend</span> = Non-EMI expenses × 70% + Healthcare</p>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-emerald-500 mt-0.5 flex-shrink-0">2.</span>
          <p class="text-gray-700"><span class="font-medium text-gray-900">Healthcare budget</span> = 5% of income <span class="text-gray-400">(max ₹25K/month)</span></p>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-emerald-500 mt-0.5 flex-shrink-0">3.</span>
          <p class="text-gray-700"><span class="font-medium text-gray-900">Years in retirement</span> = 90 − Retirement age</p>
        </div>
        <div class="flex items-start gap-2 pt-2 border-t border-gray-200">
          <span class="text-emerald-600 mt-0.5 flex-shrink-0">=</span>
          <p class="text-gray-800 font-medium">Corpus = Monthly spend × 12 × Years in retirement</p>
        </div>
      </div>
    </div>
  `;

  let personalHtml = '';
  if (estimate) {
    const fmt = (v) => formatCurrency(v, currency);
    personalHtml = `
      <div class="mt-5">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <h4 class="font-semibold text-gray-900">Your Estimate</h4>
        </div>

        <!-- Calculation breakdown -->
        <div class="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
          <div class="flex justify-between items-center">
            <span class="text-gray-600">Non-EMI monthly expenses</span>
            <span class="font-medium text-gray-900">${fmt(estimate.nonEmiExpenses)}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600">× 70% (retirement ratio)</span>
            <span class="font-medium text-gray-900">${fmt(Math.round(estimate.nonEmiExpenses * RETIREMENT_EXPENSE_RATIO))}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600">+ Healthcare budget</span>
            <span class="font-medium text-gray-900">${fmt(estimate.healthcare)}</span>
          </div>
          <div class="flex justify-between items-center pt-2 border-t border-blue-200">
            <span class="font-medium text-blue-800">Monthly retirement spend</span>
            <span class="font-semibold text-blue-800">${fmt(estimate.monthlyRetirement)}</span>
          </div>
        </div>

        <!-- Corpus table -->
        <div class="mt-4 rounded-lg border border-gray-200 overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50">
                <th class="text-left py-2.5 px-3 font-medium text-gray-600">Retire at</th>
                <th class="text-center py-2.5 px-3 font-medium text-gray-600">Years in retirement</th>
                <th class="text-right py-2.5 px-3 font-medium text-gray-600">Corpus needed</th>
              </tr>
            </thead>
            <tbody>
              ${estimate.estimates.map((e, i) => `
                <tr class="${i < estimate.estimates.length - 1 ? 'border-b border-gray-100' : ''}">
                  <td class="py-2.5 px-3 text-gray-700">Age ${e.age}</td>
                  <td class="py-2.5 px-3 text-center text-gray-700">${e.yearsInRetirement} years</td>
                  <td class="py-2.5 px-3 text-right font-semibold text-gray-900">${fmt(e.corpus)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <p class="text-xs text-gray-400 mt-3 text-center">These are today's values — inflation adjustment is handled separately by the app.</p>
      </div>
    `;
  } else {
    personalHtml = `
      <div class="mt-5 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <svg class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-sm text-amber-800">Add your income and expenses in Cash Flow to see a personalized estimate.</p>
      </div>
    `;
  }

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'estimate-modal-overlay';
  overlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4';
  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-blue-50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
            <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900">Estimating Retirement Corpus</h3>
        </div>
        <button id="close-estimate-modal" class="text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-lg p-1.5 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="px-4 sm:px-6 py-5 overflow-y-auto">
        ${formulaHtml}
        ${personalHtml}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();
  overlay.querySelector('#close-estimate-modal').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
}

export function showAllocationModal() {
  const compact = (v) => formatCompact(v, currency);
  const items = appData?.assets?.items || [];
  const goals = appData?.goals || [];

  // Sort goals: short-term first, then long-term, earliest first within each
  const sortedGoals = [...goals].sort((a, b) => {
    const catA = getUnifiedCategory(a.targetDate);
    const catB = getUnifiedCategory(b.targetDate);
    if (catA === 'short' && catB === 'long') return -1;
    if (catA === 'long' && catB === 'short') return 1;
    return new Date(a.targetDate) - new Date(b.targetDate);
  });

  // Section A: Assigned to Goals
  const goalRowsHtml = sortedGoals.map(goal => {
    const linked = goal.linkedAssets || [];
    const validLinks = linked.filter(la => items.find(a => a.id === la.assetId));

    // Build asset lines: linked assets + EPF/NPS for retirement goals
    const assetLines = [];

    validLinks.forEach(la => {
      const asset = items.find(a => a.id === la.assetId);
      if (!asset) return;
      assetLines.push({ name: asset.name, amount: la.amount });
    });

    // Add EPF/NPS corpus for retirement goals with includeEpfNps
    if (goal.goalType === 'retirement' && goal.includeEpfNps) {
      const epfAsset = items.find(a => a.category === 'EPF Corpus');
      const npsAsset = items.find(a => a.category === 'NPS Corpus');
      if (epfAsset && epfAsset.value > 0) {
        assetLines.push({ name: epfAsset.name, amount: epfAsset.value });
      }
      if (npsAsset && npsAsset.value > 0) {
        assetLines.push({ name: npsAsset.name, amount: npsAsset.value });
      }
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

  // Section B: Not assigned
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

  // Build modal
  const overlay = document.createElement('div');
  overlay.id = 'allocation-modal-overlay';
  overlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4';
  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 class="text-base font-semibold text-gray-900">Existing Investment Utilization</h3>
        <button id="close-allocation-modal" class="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="px-5 py-4 overflow-y-auto">
        <p class="text-sm text-gray-500 mb-4">How your existing investments are being used towards your goals.</p>

        <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Assigned to goals</h4>
        <div class="divide-y divide-gray-100">
          ${goalRowsHtml}
        </div>

        <div class="mt-4 pt-3 border-t border-gray-100">
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Not assigned</h4>
          <div class="divide-y divide-gray-100">
            ${unallocatedHtml}
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();
  overlay.querySelector('#close-allocation-modal').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
}

function renderGoalsList() {
  const container = document.getElementById('goals-list');
  if (!container) return;

  if (appData.goals.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
        </svg>
        <p class="text-lg mb-2">No financial goals yet</p>
        <p class="text-sm mb-4">Add your first goal to create your investment plan</p>
      </div>
    `;
    return;
  }

  // Sort goals: short-term first, then long-term
  const sortedGoals = [...appData.goals].sort((a, b) => {
    const categoryA = getUnifiedCategory(a.targetDate);
    const categoryB = getUnifiedCategory(b.targetDate);
    if (categoryA === 'short' && categoryB === 'long') return -1;
    if (categoryA === 'long' && categoryB === 'short') return 1;
    // Within same category, sort by target date (earliest first)
    return new Date(a.targetDate) - new Date(b.targetDate);
  });

  container.innerHTML = sortedGoals.map(goal => renderGoalCard(goal)).join('');

  // Add event listeners for goal actions
  container.querySelectorAll('.edit-goal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const goal = appData.goals.find(g => g.id === btn.dataset.id);
      if (goal) showAddGoalModal(goal);
    });
  });

  container.querySelectorAll('.delete-goal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this goal? This cannot be undone.')) {
        deleteGoal(appData, btn.dataset.id);
        renderGoalsList();
        if (onDataChange) onDataChange();
      }
    });
  });

  container.querySelectorAll('.estimate-retirement-link').forEach(btn => {
    btn.addEventListener('click', () => showEstimateModal());
  });

}

function renderGoalCard(goal) {
  const years = getYearsRemaining(goal.targetDate);
  const category = getUnifiedCategory(goal.targetDate);
  const isRetirement = goal.goalType === 'retirement';

  const categoryColors = {
    long: 'bg-green-100 text-green-800',
    short: 'bg-amber-100 text-amber-800'
  };

  return `
    <div class="bg-white border rounded-lg p-4 mb-3 shadow-sm hover:shadow-md transition-shadow">
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <h3 class="text-lg font-semibold text-gray-800">${goal.name}</h3>
            <span class="inline-block px-2 py-0.5 text-xs font-medium rounded whitespace-nowrap ${categoryColors[category]}">
              ${getCategoryDisplay(category)}
            </span>
            ${isRetirement ? '<span class="inline-block px-2 py-0.5 text-xs font-medium rounded whitespace-nowrap bg-purple-100 text-purple-800">Retirement</span>' : ''}
          </div>
          <div class="text-sm text-gray-500 space-y-0.5">
            <div>Target: <span class="font-medium text-gray-700">${formatCompact(goal.targetAmount, currency)}</span> (today's value)</div>
            <div>Timeline: <span class="font-medium text-gray-700">${formatTimeline(years)}</span> (${new Date(goal.targetDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })})</div>
            <div>Inflation: <span class="font-medium text-gray-700">${goal.inflationRate}%</span></div>
            ${isRetirement && goal.includeEpfNps ? '<div class="text-purple-600">EPF/NPS deductions included</div>' : ''}
            ${isRetirement ? `<button type="button" class="estimate-retirement-link inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 px-3 py-1.5 rounded-lg shadow-sm mt-1.5 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              Estimate FI Corpus
            </button>` : ''}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 ml-4 shrink-0">
          <button class="edit-goal-btn p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            data-id="${goal.id}" title="Edit">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button class="delete-goal-btn p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            data-id="${goal.id}" title="Delete">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

