// Cash flow management UI and logic
import { addIncome, updateIncome, deleteIncome, addExpense, updateExpense, deleteExpense, generateId } from './storage.js';
import { formatCurrency, getSymbol } from './currency.js';
import { getRetirementAssets } from './assets.js';
import { isDataEmpty, getQuickSetupButtonHTML, openWizard } from './wizard.js';

const expenseCategories = [
  'Housing',
  'Utilities',
  'Food',
  'Transport',
  'Healthcare',
  'Insurance',
  'Education',
  'Entertainment',
  'Shopping',
  'EMIs/Loans',
  'Other'
];

let appData = null;
let currency = 'INR';
let onDataChange = null;

export function initCashflow(data, curr, onChange) {
  appData = data;
  currency = curr;
  onDataChange = onChange;
  renderIncomeList();
  renderExpenseList();
  updateSummary();
  setupEventListeners();
}

export function updateCurrency(curr) {
  currency = curr;
  renderIncomeList();
  renderExpenseList();
  updateSummary();
}

export function refreshData(data) {
  appData = data;
  renderIncomeList();
  renderExpenseList();
  updateSummary();
}

function setupEventListeners() {
  // Add income button
  document.getElementById('add-income-btn')?.addEventListener('click', showAddIncomeForm);

  // Add expense button
  document.getElementById('add-expense-btn')?.addEventListener('click', showAddExpenseForm);
}

// Income functions
function showAddIncomeForm() {
  const container = document.getElementById('income-form-container');
  container.innerHTML = `
    <div class="bg-gray-50 p-3 rounded-lg mb-3">
      <input type="text" id="new-income-name" placeholder="Income source (e.g., Salary)"
        class="w-full px-3 py-2 border rounded mb-2 text-sm">
      <div class="flex gap-2 mb-2">
        <div class="relative flex-1">
          <span class="absolute left-3 top-2 text-gray-500">${getSymbol(currency)}</span>
          <input type="number" id="new-income-amount" placeholder="In-hand amount after tax/deductions"
            class="w-full pl-8 pr-3 py-2 border rounded text-sm">
        </div>
      </div>

      <!-- EPF/NPS Section -->
      <details class="mb-2">
        <summary class="cursor-pointer text-xs text-blue-600 hover:text-blue-800">+ Add EPF/NPS contributions (optional)</summary>
        <div class="mt-2 p-2 bg-white rounded border space-y-2">
          <div class="grid grid-cols-2 gap-2">
            <div class="relative">
              <label class="text-xs text-gray-500">EPF (monthly)</label>
              <span class="absolute left-2 top-6 text-gray-500 text-sm">${getSymbol(currency)}</span>
              <input type="number" id="new-income-epf" placeholder="0" value="0"
                class="w-full pl-6 pr-2 py-1 border rounded text-sm">
            </div>
            <div class="relative">
              <label class="text-xs text-gray-500">NPS (monthly)</label>
              <span class="absolute left-2 top-6 text-gray-500 text-sm">${getSymbol(currency)}</span>
              <input type="number" id="new-income-nps" placeholder="0" value="0"
                class="w-full pl-6 pr-2 py-1 border rounded text-sm">
            </div>
          </div>
          <p class="text-xs text-gray-400">Monthly EPF/NPS contributions for retirement goal calculations</p>
        </div>
      </details>

      <div class="flex gap-2">
        <button id="save-income-btn" class="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">Save</button>
        <button id="cancel-income-btn" class="bg-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-400">Cancel</button>
      </div>
    </div>
  `;

  document.getElementById('save-income-btn').addEventListener('click', saveNewIncome);
  document.getElementById('cancel-income-btn').addEventListener('click', () => {
    container.innerHTML = '';
  });
  document.getElementById('new-income-name').focus();
}

function saveNewIncome() {
  const name = document.getElementById('new-income-name').value.trim();
  const amount = parseFloat(document.getElementById('new-income-amount').value);
  const epf = parseFloat(document.getElementById('new-income-epf').value) || 0;
  const nps = parseFloat(document.getElementById('new-income-nps').value) || 0;

  if (!name || isNaN(amount) || amount <= 0) {
    alert('Please enter a valid name and amount');
    return;
  }

  addIncome(appData, { name, amount, epf, nps });
  document.getElementById('income-form-container').innerHTML = '';
  renderIncomeList();
  updateSummary();
  if (onDataChange) onDataChange();
}

function renderIncomeList() {
  const list = document.getElementById('income-list');
  if (!list) return;

  if (appData.cashflow.income.length === 0) {
    // Show Quick Setup button if all data is empty
    if (isDataEmpty(appData)) {
      list.innerHTML = `
        <div class="text-center py-6">
          <p class="text-gray-500 text-sm mb-4">No income sources added</p>
          ${getQuickSetupButtonHTML()}
        </div>
      `;
      setupQuickSetupButton();
    } else {
      list.innerHTML = '<p class="text-gray-500 text-sm italic">No income sources added</p>';
    }
    return;
  }

  list.innerHTML = appData.cashflow.income.map(income => {
    const hasEpfNps = (income.epf > 0 || income.nps > 0);
    const epfNpsInfo = hasEpfNps ? `
      <div class="text-xs text-gray-500 mt-0.5">
        ${income.epf > 0 ? `EPF: ${formatCurrency(income.epf, currency)}/mo` : ''}
        ${income.epf > 0 && income.nps > 0 ? ' | ' : ''}
        ${income.nps > 0 ? `NPS: ${formatCurrency(income.nps, currency)}/mo` : ''}
      </div>
    ` : '';

    return `
      <div class="flex items-center justify-between py-2 border-b border-gray-100 group" data-id="${income.id}">
        <div>
          <span class="text-sm">${income.name}</span>
          ${epfNpsInfo}
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-green-600">${formatCurrency(income.amount, currency)}</span>
          <button class="edit-income-btn opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity" data-id="${income.id}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
          </button>
          <button class="delete-income-btn opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity" data-id="${income.id}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Add event listeners
  list.querySelectorAll('.edit-income-btn').forEach(btn => {
    btn.addEventListener('click', () => editIncome(btn.dataset.id));
  });
  list.querySelectorAll('.delete-income-btn').forEach(btn => {
    btn.addEventListener('click', () => removeIncome(btn.dataset.id));
  });
}

function editIncome(id) {
  const income = appData.cashflow.income.find(i => i.id === id);
  if (!income) return;

  const row = document.querySelector(`[data-id="${id}"]`);
  row.className = 'py-2 border-b border-gray-100';
  row.innerHTML = `
    <div class="flex flex-wrap gap-2 mb-2">
      <input type="text" value="${income.name}" class="edit-income-name flex-1 min-w-[120px] px-2 py-1 border rounded text-sm">
      <div class="relative">
        <span class="absolute left-2 top-1 text-gray-500 text-sm">${getSymbol(currency)}</span>
        <input type="number" value="${income.amount}" class="edit-income-amount w-24 pl-6 pr-2 py-1 border rounded text-sm">
      </div>
    </div>

    <!-- EPF/NPS Edit Section -->
    <details class="mb-2" ${(income.epf > 0 || income.nps > 0) ? 'open' : ''}>
      <summary class="cursor-pointer text-xs text-blue-600 hover:text-blue-800">EPF/NPS contributions</summary>
      <div class="mt-2 p-2 bg-gray-50 rounded border space-y-2">
        <div class="grid grid-cols-2 gap-2">
          <div class="relative">
            <label class="text-xs text-gray-500">EPF (monthly)</label>
            <input type="number" value="${income.epf || 0}" class="edit-income-epf w-full px-2 py-1 border rounded text-sm">
          </div>
          <div class="relative">
            <label class="text-xs text-gray-500">NPS (monthly)</label>
            <input type="number" value="${income.nps || 0}" class="edit-income-nps w-full px-2 py-1 border rounded text-sm">
          </div>
        </div>
      </div>
    </details>

    <div class="flex gap-2">
      <button class="save-edit-income bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Save</button>
      <button class="cancel-edit-income bg-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-400">Cancel</button>
    </div>
  `;

  row.querySelector('.save-edit-income').addEventListener('click', () => {
    const newName = row.querySelector('.edit-income-name').value.trim();
    const newAmount = parseFloat(row.querySelector('.edit-income-amount').value);
    const newEpf = parseFloat(row.querySelector('.edit-income-epf').value) || 0;
    const newNps = parseFloat(row.querySelector('.edit-income-nps').value) || 0;

    if (newName && !isNaN(newAmount) && newAmount > 0) {
      updateIncome(appData, id, {
        name: newName,
        amount: newAmount,
        epf: newEpf,
        nps: newNps
      });
      renderIncomeList();
      updateSummary();
      if (onDataChange) onDataChange();
    }
  });

  row.querySelector('.cancel-edit-income').addEventListener('click', () => {
    renderIncomeList();
  });
}

function removeIncome(id) {
  if (confirm('Delete this income source?')) {
    deleteIncome(appData, id);
    renderIncomeList();
    updateSummary();
    if (onDataChange) onDataChange();
  }
}

// Expense functions
function showAddExpenseForm() {
  const container = document.getElementById('expense-form-container');
  container.innerHTML = `
    <div class="bg-gray-50 p-3 rounded-lg mb-3">
      <select id="new-expense-category" class="w-full px-3 py-2 border rounded mb-2 text-sm">
        ${expenseCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
      </select>
      <input type="text" id="new-expense-name" placeholder="Description (e.g., Monthly Rent)"
        class="w-full px-3 py-2 border rounded mb-2 text-sm">
      <div class="flex gap-2">
        <div class="relative flex-1">
          <span class="absolute left-3 top-2 text-gray-500">${getSymbol(currency)}</span>
          <input type="number" id="new-expense-amount" placeholder="Amount"
            class="w-full pl-8 pr-3 py-2 border rounded text-sm">
        </div>
        <button id="save-expense-btn" class="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">Save</button>
        <button id="cancel-expense-btn" class="bg-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-400">Cancel</button>
      </div>
    </div>
  `;

  document.getElementById('save-expense-btn').addEventListener('click', saveNewExpense);
  document.getElementById('cancel-expense-btn').addEventListener('click', () => {
    container.innerHTML = '';
  });
  document.getElementById('new-expense-name').focus();
}

function saveNewExpense() {
  const category = document.getElementById('new-expense-category').value;
  const name = document.getElementById('new-expense-name').value.trim();
  const amount = parseFloat(document.getElementById('new-expense-amount').value);

  if (!name || isNaN(amount) || amount <= 0) {
    alert('Please enter a valid description and amount');
    return;
  }

  addExpense(appData, { category, name, amount });
  document.getElementById('expense-form-container').innerHTML = '';
  renderExpenseList();
  updateSummary();
  if (onDataChange) onDataChange();
}

function setupQuickSetupButton() {
  const btn = document.getElementById('quick-setup-btn');
  if (btn) {
    btn.addEventListener('click', openWizard);
  }
}

function renderExpenseList() {
  const list = document.getElementById('expense-list');
  if (!list) return;

  if (appData.cashflow.expenses.length === 0) {
    // Only show plain message (Quick Setup is already in income section)
    list.innerHTML = '<p class="text-gray-500 text-sm italic">No expenses added</p>';
    return;
  }

  // Group by category
  const grouped = {};
  appData.cashflow.expenses.forEach(exp => {
    if (!grouped[exp.category]) grouped[exp.category] = [];
    grouped[exp.category].push(exp);
  });

  list.innerHTML = Object.entries(grouped).map(([category, expenses]) => `
    <div class="mb-3">
      <div class="text-xs font-semibold text-gray-500 uppercase mb-1">${category}</div>
      ${expenses.map(exp => `
        <div class="flex items-center justify-between py-2 border-b border-gray-100 group" data-id="${exp.id}">
          <span class="text-sm">${exp.name}</span>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-red-600">${formatCurrency(exp.amount, currency)}</span>
            <button class="edit-expense-btn opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity" data-id="${exp.id}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
            </button>
            <button class="delete-expense-btn opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity" data-id="${exp.id}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');

  // Add event listeners
  list.querySelectorAll('.edit-expense-btn').forEach(btn => {
    btn.addEventListener('click', () => editExpense(btn.dataset.id));
  });
  list.querySelectorAll('.delete-expense-btn').forEach(btn => {
    btn.addEventListener('click', () => removeExpense(btn.dataset.id));
  });
}

function editExpense(id) {
  const expense = appData.cashflow.expenses.find(e => e.id === id);
  if (!expense) return;

  const row = document.querySelector(`[data-id="${id}"]`);
  row.className = 'py-2 border-b border-gray-100';
  row.innerHTML = `
    <div class="flex flex-wrap gap-2 mb-2">
      <select class="edit-expense-category px-2 py-1 border rounded text-sm">
        ${expenseCategories.map(cat => `<option value="${cat}" ${cat === expense.category ? 'selected' : ''}>${cat}</option>`).join('')}
      </select>
      <input type="text" value="${expense.name}" class="edit-expense-name flex-1 min-w-[120px] px-2 py-1 border rounded text-sm">
      <div class="relative">
        <span class="absolute left-2 top-1 text-gray-500 text-sm">${getSymbol(currency)}</span>
        <input type="number" value="${expense.amount}" class="edit-expense-amount w-24 pl-6 pr-2 py-1 border rounded text-sm">
      </div>
    </div>
    <div class="flex gap-2">
      <button class="save-edit-expense bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Save</button>
      <button class="cancel-edit-expense bg-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-400">Cancel</button>
    </div>
  `;

  row.querySelector('.save-edit-expense').addEventListener('click', () => {
    const newCategory = row.querySelector('.edit-expense-category').value;
    const newName = row.querySelector('.edit-expense-name').value.trim();
    const newAmount = parseFloat(row.querySelector('.edit-expense-amount').value);
    if (newName && !isNaN(newAmount) && newAmount > 0) {
      updateExpense(appData, id, { category: newCategory, name: newName, amount: newAmount });
      renderExpenseList();
      updateSummary();
      if (onDataChange) onDataChange();
    }
  });

  row.querySelector('.cancel-edit-expense').addEventListener('click', () => {
    renderExpenseList();
  });
}

function removeExpense(id) {
  if (confirm('Delete this expense?')) {
    deleteExpense(appData, id);
    renderExpenseList();
    updateSummary();
    if (onDataChange) onDataChange();
  }
}

// Summary calculation
function updateSummary() {
  const totalIncome = appData.cashflow.income.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = appData.cashflow.expenses.reduce((sum, e) => sum + e.amount, 0);
  const netFlow = totalIncome - totalExpenses;

  document.getElementById('total-income').textContent = formatCurrency(totalIncome, currency);
  document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses, currency);

  const netFlowEl = document.getElementById('net-cashflow');
  netFlowEl.textContent = formatCurrency(netFlow, currency);
  netFlowEl.className = netFlow >= 0 ? 'text-xl font-bold text-green-600' : 'text-xl font-bold text-red-600';

  // Update available for investment display
  const availableEl = document.getElementById('available-investment');
  if (availableEl) {
    availableEl.textContent = formatCurrency(Math.max(0, netFlow), currency);
  }

  // Update savings rate
  const savingsRateEl = document.getElementById('savings-rate');
  const savingsRateLabelEl = document.getElementById('savings-rate-label');
  if (savingsRateEl && savingsRateLabelEl) {
    const savingsRate = totalIncome > 0 ? Math.round((netFlow / totalIncome) * 100) : 0;
    savingsRateEl.textContent = `${savingsRate}%`;

    // Determine label and styling based on rate
    let label, bgClass, textClass;
    if (savingsRate >= 60) {
      label = 'Excellent';
      bgClass = 'bg-green-100';
      textClass = 'text-green-700';
    } else if (savingsRate >= 40) {
      label = 'Good';
      bgClass = 'bg-blue-100';
      textClass = 'text-blue-700';
    } else if (savingsRate >= 30) {
      label = 'Reasonable';
      bgClass = 'bg-yellow-100';
      textClass = 'text-yellow-700';
    } else {
      label = 'Poor';
      bgClass = 'bg-red-100';
      textClass = 'text-red-700';
    }

    savingsRateEl.className = `font-semibold ${textClass}`;
    savingsRateLabelEl.textContent = label;
    savingsRateLabelEl.className = `text-xs px-2 py-1 rounded-full ${bgClass} ${textClass}`;

    // Show/hide suggestion for low savings rate
    const suggestionEl = document.getElementById('savings-rate-suggestion');
    if (suggestionEl) {
      if (totalIncome > 0 && savingsRate < 40) {
        suggestionEl.classList.remove('hidden');
      } else {
        suggestionEl.classList.add('hidden');
      }
    }
  }
}

export function getTotalIncome() {
  return appData.cashflow.income.reduce((sum, i) => sum + i.amount, 0);
}

export function getTotalExpenses() {
  return appData.cashflow.expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function getNetCashflow() {
  return getTotalIncome() - getTotalExpenses();
}

/**
 * Calculate savings rate as a percentage
 */
export function getSavingsRate(totalIncome, netCashflow) {
  if (totalIncome <= 0) return 0;
  return Math.round((netCashflow / totalIncome) * 100);
}

/**
 * Get savings rate label and styling based on rate
 * >= 60%: Excellent (green)
 * 40-59%: Good (blue)
 * 30-39%: Reasonable (yellow)
 * < 30%: Poor (red)
 */
export function getSavingsRateLabel(savingsRate) {
  if (savingsRate >= 60) {
    return { label: 'Excellent', level: 'excellent' };
  } else if (savingsRate >= 40) {
    return { label: 'Good', level: 'good' };
  } else if (savingsRate >= 30) {
    return { label: 'Reasonable', level: 'reasonable' };
  } else {
    return { label: 'Poor', level: 'poor' };
  }
}

/**
 * Check if savings rate suggestion should be shown
 */
export function shouldShowSavingsSuggestion(totalIncome, savingsRate) {
  return totalIncome > 0 && savingsRate < 40;
}

// EPF/NPS helper functions for retirement goal calculations
export function getTotalEpfMonthly() {
  return appData.cashflow.income.reduce((sum, i) => sum + (i.epf || 0), 0);
}

export function getTotalNpsMonthly() {
  return appData.cashflow.income.reduce((sum, i) => sum + (i.nps || 0), 0);
}

export function getRetirementContributions() {
  const retirementAssets = getRetirementAssets(appData);
  return {
    monthlyEpf: getTotalEpfMonthly(),
    monthlyNps: getTotalNpsMonthly(),
    epfCorpus: retirementAssets.epfCorpus,
    npsCorpus: retirementAssets.npsCorpus,
    totalMonthly: getTotalEpfMonthly() + getTotalNpsMonthly(),
    totalCorpus: retirementAssets.totalCorpus
  };
}
