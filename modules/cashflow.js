// Cash flow management UI and logic
import { addIncome, updateIncome, deleteIncome, addExpense, updateExpense, deleteExpense, generateId } from './storage.js';
import { formatCurrency, getSymbol } from './currency.js';
import { getRetirementAssets } from './assets.js';

const expenseCategories = [
  // Essential
  { name: 'Housing', hint: 'Rent, Society Maintenance' },
  { name: 'Food', hint: 'Groceries, Vegetables, Dining Out' },
  { name: 'Utilities', hint: 'Electricity, Mobile, Broadband, Cable TV' },
  { name: 'Health & Insurance', hint: 'Medical, Premiums' },
  { name: 'EMIs/Loans', hint: 'Home, Car, Personal Loans' },
  { name: 'Transport', hint: 'Fuel, Vehicle Maintenance, Parking' },
  // Discretionary
  { name: 'Household Help', hint: 'Maid, Driver, Cook' },
  { name: 'Lifestyle', hint: 'Entertainment, Shopping, Subscriptions' },
  { name: 'Education', hint: 'Fees, Tuition, Books' },
  { name: 'Children', hint: 'Clothes, Activities, Pocket Money' },
  { name: 'Other', hint: 'Miscellaneous' }
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
      <input type="text" id="new-income-name" placeholder="Income source - optional (e.g., Freelance)"
        class="w-full px-3 py-2 border rounded mb-2 text-sm">
      <div class="flex gap-2 mb-2">
        <div class="relative flex-1">
          <span class="absolute left-3 top-2 text-gray-500">${getSymbol(currency)}</span>
          <input type="number" id="new-income-amount" placeholder="Monthly take-home pay"
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

      <div class="flex gap-2 justify-end">
        <button id="cancel-income-btn" class="bg-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-400">Cancel</button>
        <button id="save-income-btn" class="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">Save</button>
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
  const name = document.getElementById('new-income-name').value.trim() || 'Salary';
  const amount = parseFloat(document.getElementById('new-income-amount').value);
  const epf = parseFloat(document.getElementById('new-income-epf').value) || 0;
  const nps = parseFloat(document.getElementById('new-income-nps').value) || 0;

  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }

  const maxEpfNps = amount * 0.3;
  if (epf + nps > maxEpfNps) {
    alert(`EPF + NPS contributions cannot exceed 30% of income (max ${formatCurrency(maxEpfNps, settings.currency)})`);
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
    list.innerHTML = '<p class="text-gray-500 text-sm italic">Add your income to get started</p>';
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
      <div class="flex items-center justify-between py-3 border-b border-gray-100 group" data-id="${income.id}">
        <div class="min-w-0">
          <span class="text-sm">${income.name}</span>
          ${epfNpsInfo}
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-sm font-medium text-green-600">${formatCurrency(income.amount, currency)}</span>
          <button class="edit-income-btn text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded p-1 transition-colors" data-id="${income.id}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
          </button>
          <button class="delete-income-btn text-gray-400 hover:text-red-600 hover:bg-red-50 rounded p-1 transition-colors" data-id="${income.id}">
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
  row.className = 'py-3 border-b border-gray-100';
  row.innerHTML = `
    <div class="space-y-2 mb-3">
      <input type="text" value="${income.name}" class="edit-income-name w-full px-3 py-2 border rounded text-sm" placeholder="Description">
      <div class="relative">
        <span class="absolute left-3 top-2 text-gray-500 text-sm">${getSymbol(currency)}</span>
        <input type="number" value="${income.amount}" class="edit-income-amount w-full pl-7 pr-3 py-2 border rounded text-sm" placeholder="Amount">
      </div>
    </div>

    <!-- EPF/NPS Edit Section -->
    <details class="mb-3" ${(income.epf > 0 || income.nps > 0) ? 'open' : ''}>
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

    <div class="flex gap-2 justify-end">
      <button class="cancel-edit-income bg-gray-300 px-3 py-1.5 rounded text-sm hover:bg-gray-400">Cancel</button>
      <button class="save-edit-income bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">Save</button>
    </div>
  `;

  row.querySelector('.save-edit-income').addEventListener('click', () => {
    const newName = row.querySelector('.edit-income-name').value.trim();
    const newAmount = parseFloat(row.querySelector('.edit-income-amount').value);
    const newEpf = parseFloat(row.querySelector('.edit-income-epf').value) || 0;
    const newNps = parseFloat(row.querySelector('.edit-income-nps').value) || 0;

    if (!newName || isNaN(newAmount) || newAmount <= 0) {
      return;
    }

    const maxEpfNps = newAmount * 0.3;
    if (newEpf + newNps > maxEpfNps) {
      alert(`EPF + NPS contributions cannot exceed 30% of income (max ${formatCurrency(maxEpfNps, settings.currency)})`);
      return;
    }

    updateIncome(appData, id, {
      name: newName,
      amount: newAmount,
      epf: newEpf,
      nps: newNps
    });
    renderIncomeList();
    updateSummary();
    if (onDataChange) onDataChange();
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
        ${expenseCategories.map(cat => `<option value="${cat.name}">${cat.name} (${cat.hint})</option>`).join('')}
      </select>
      <div class="relative mb-2">
        <span class="absolute left-3 top-2 text-gray-500">${getSymbol(currency)}</span>
        <input type="number" id="new-expense-amount" placeholder="Amount"
          class="w-full pl-8 pr-3 py-2 border rounded text-sm">
      </div>
      <input type="text" id="new-expense-name" placeholder="Description - optional (e.g., Monthly Rent)"
        class="w-full px-3 py-2 border rounded mb-2 text-sm">
      <div class="flex gap-2 justify-end">
        <button id="cancel-expense-btn" class="bg-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-400">Cancel</button>
        <button id="save-expense-btn" class="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">Save</button>
      </div>
    </div>
  `;

  document.getElementById('save-expense-btn').addEventListener('click', saveNewExpense);
  document.getElementById('cancel-expense-btn').addEventListener('click', () => {
    container.innerHTML = '';
  });
  document.getElementById('new-expense-amount').focus();
}

function saveNewExpense() {
  const category = document.getElementById('new-expense-category').value;
  const categoryData = expenseCategories.find(c => c.name === category);
  const defaultName = categoryData ? categoryData.hint : category;
  const name = document.getElementById('new-expense-name').value.trim() || defaultName;
  const amount = parseFloat(document.getElementById('new-expense-amount').value);

  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }

  addExpense(appData, { category, name, amount });
  document.getElementById('expense-form-container').innerHTML = '';
  renderExpenseList();
  updateSummary();
  if (onDataChange) onDataChange();
}

function renderExpenseList() {
  const list = document.getElementById('expense-list');
  if (!list) return;

  if (appData.cashflow.expenses.length === 0) {
    list.innerHTML = '<p class="text-gray-500 text-sm italic">Add your expenses to track savings</p>';
    return;
  }

  // Group by category
  const grouped = {};
  appData.cashflow.expenses.forEach(exp => {
    if (!grouped[exp.category]) grouped[exp.category] = [];
    grouped[exp.category].push(exp);
  });

  list.innerHTML = Object.entries(grouped).map(([category, expenses]) => `
    <div class="pt-4 first:pt-0">
      <div class="text-xs font-semibold text-gray-500 uppercase mb-1">${category}</div>
      ${expenses.map(exp => `
        <div class="flex items-center justify-between py-3 border-b border-gray-100 group" data-id="${exp.id}">
          <span class="text-sm min-w-0">${exp.name}</span>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-sm font-medium text-red-600">${formatCurrency(exp.amount, currency)}</span>
            <button class="edit-expense-btn text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded p-1 transition-colors" data-id="${exp.id}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
            </button>
            <button class="delete-expense-btn text-gray-400 hover:text-red-600 hover:bg-red-50 rounded p-1 transition-colors" data-id="${exp.id}">
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
  row.className = 'py-3 border-b border-gray-100';
  row.innerHTML = `
    <div class="space-y-2 mb-3">
      <select class="edit-expense-category w-full px-3 py-2 border rounded text-sm">
        ${expenseCategories.map(cat => `<option value="${cat.name}" ${cat.name === expense.category ? 'selected' : ''}>${cat.name} (${cat.hint})</option>`).join('')}
      </select>
      <input type="text" value="${expense.name}" class="edit-expense-name w-full px-3 py-2 border rounded text-sm" placeholder="Description">
      <div class="relative">
        <span class="absolute left-3 top-2 text-gray-500 text-sm">${getSymbol(currency)}</span>
        <input type="number" value="${expense.amount}" class="edit-expense-amount w-full pl-7 pr-3 py-2 border rounded text-sm" placeholder="Amount">
      </div>
    </div>
    <div class="flex gap-2 justify-end">
      <button class="cancel-edit-expense bg-gray-300 px-3 py-1.5 rounded text-sm hover:bg-gray-400">Cancel</button>
      <button class="save-edit-expense bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">Save</button>
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
  const totalEpfNps = appData.cashflow.income.reduce((sum, i) => sum + (i.epf || 0) + (i.nps || 0), 0);

  document.getElementById('total-income').textContent = formatCurrency(totalIncome, currency);
  document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses, currency);

  // Show/hide EPF/NPS contributions row
  const epfNpsRow = document.getElementById('epf-nps-row');
  const epfNpsEl = document.getElementById('epf-nps-contributions');
  if (epfNpsRow && epfNpsEl) {
    if (totalEpfNps > 0) {
      epfNpsRow.classList.remove('hidden');
      epfNpsEl.textContent = formatCurrency(totalEpfNps, currency);
    } else {
      epfNpsRow.classList.add('hidden');
    }
  }

  const netFlowEl = document.getElementById('net-cashflow');
  netFlowEl.textContent = formatCurrency(netFlow, currency);
  netFlowEl.className = netFlow >= 0 ? 'text-4xl font-bold' : 'text-4xl font-bold text-red-300';

  // Update savings rate (includes EPF/NPS as part of gross income and savings)
  const savingsRateEl = document.getElementById('savings-rate');
  const savingsRateLabelEl = document.getElementById('savings-rate-label');
  if (savingsRateEl && savingsRateLabelEl) {
    const grossIncome = totalIncome + totalEpfNps;
    const savingsRate = grossIncome > 0 ? getSavingsRate(totalIncome, netFlow, totalEpfNps) : 0;
    savingsRateEl.textContent = `${savingsRate}%`;

    const { label } = getSavingsRateLabel(savingsRate);

    savingsRateEl.className = 'text-4xl font-bold';
    savingsRateLabelEl.textContent = label;
    savingsRateLabelEl.className = 'text-xs px-3 py-1 rounded-full bg-white/20 text-white';

    // Show/hide suggestion for low savings rate
    const suggestionEl = document.getElementById('savings-rate-suggestion');
    if (suggestionEl) {
      if (shouldShowSavingsSuggestion(grossIncome, savingsRate)) {
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
export function getSavingsRate(totalIncome, netCashflow, epfNpsTotal = 0) {
  const grossIncome = totalIncome + epfNpsTotal;
  if (grossIncome <= 0) return 0;
  const totalSavings = netCashflow + epfNpsTotal;
  return Math.round((totalSavings / grossIncome) * 100);
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
