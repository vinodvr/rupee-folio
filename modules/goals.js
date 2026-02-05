// Goals CRUD and UI - Simplified for Unified Portfolio
import { addGoal, updateGoal, deleteGoal } from './storage.js';
import { formatCurrency, getSymbol } from './currency.js';
import {
  getYearsRemaining,
  getUnifiedCategory,
  getCategoryDisplay
} from './calculator.js';

let appData = null;
let currency = 'INR';
let fundHouse = 'icici';
let equityReturn = 10;
let debtReturn = 5;
let arbitrageReturn = 6;
let onDataChange = null;

function formatTimeline(years) {
  const totalMonths = Math.round(years * 12);
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;

  if (y === 0) return `${m} month${m !== 1 ? 's' : ''}`;
  if (m === 0) return `${y} year${y !== 1 ? 's' : ''}`;
  return `${y}y ${m}m`;
}

export function initGoals(data, curr, fh, eqReturn, debtRet, arbReturn, onChange) {
  appData = data;
  currency = curr;
  fundHouse = fh || 'icici';
  equityReturn = eqReturn ?? 10;
  debtReturn = debtRet ?? 5;
  arbitrageReturn = arbReturn ?? 6;
  onDataChange = onChange;
  renderGoalsList();
  setupEventListeners();
}

export function updateFundHouse(fh) {
  fundHouse = fh;
  renderGoalsList();
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

function showAddGoalModal(editGoal = null) {
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
    <div class="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
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

  // Show/hide EPF/NPS step-up option based on goal type
  goalTypeSelect.addEventListener('change', () => {
    const epfNpsContainer = document.getElementById('epf-nps-stepup-container');
    if (goalTypeSelect.value === 'retirement') {
      epfNpsContainer.classList.remove('hidden');
    } else {
      epfNpsContainer.classList.add('hidden');
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

    // Construct targetDate as first day of selected month/year
    const targetDate = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`;

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

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
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
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="text-lg font-semibold text-gray-800">${goal.name}</h3>
            <span class="inline-block px-2 py-0.5 text-xs font-medium rounded ${categoryColors[category]}">
              ${getCategoryDisplay(category)}
            </span>
            ${isRetirement ? '<span class="inline-block px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800">Retirement</span>' : ''}
          </div>
          <div class="text-sm text-gray-500 space-y-0.5">
            <div>Target: <span class="font-medium text-gray-700">${formatCurrency(goal.targetAmount, currency)}</span> (today's value)</div>
            <div>Timeline: <span class="font-medium text-gray-700">${formatTimeline(years)}</span> (${new Date(goal.targetDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })})</div>
            <div>Inflation: <span class="font-medium text-gray-700">${goal.inflationRate}%</span></div>
            ${isRetirement && goal.includeEpfNps ? '<div class="text-purple-600">EPF/NPS deductions included</div>' : ''}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 ml-4">
          <button class="edit-goal-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
            data-id="${goal.id}" title="Edit">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button class="delete-goal-btn p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
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
