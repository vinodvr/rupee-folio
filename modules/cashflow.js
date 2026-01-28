// Cash flow management UI and logic
import { addIncome, updateIncome, deleteIncome, addExpense, updateExpense, deleteExpense, generateId } from './storage.js';
import { formatCurrency, getSymbol } from './currency.js';

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
      <div class="flex gap-2">
        <div class="relative flex-1">
          <span class="absolute left-3 top-2 text-gray-500">${getSymbol(currency)}</span>
          <input type="number" id="new-income-amount" placeholder="Amount"
            class="w-full pl-8 pr-3 py-2 border rounded text-sm">
        </div>
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

  if (!name || isNaN(amount) || amount <= 0) {
    alert('Please enter a valid name and amount');
    return;
  }

  addIncome(appData, { name, amount });
  document.getElementById('income-form-container').innerHTML = '';
  renderIncomeList();
  updateSummary();
  if (onDataChange) onDataChange();
}

function renderIncomeList() {
  const list = document.getElementById('income-list');
  if (!list) return;

  if (appData.cashflow.income.length === 0) {
    list.innerHTML = '<p class="text-gray-500 text-sm italic">No income sources added</p>';
    return;
  }

  list.innerHTML = appData.cashflow.income.map(income => `
    <div class="flex items-center justify-between py-2 border-b border-gray-100 group" data-id="${income.id}">
      <span class="text-sm">${income.name}</span>
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
  `).join('');

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
    <div class="flex gap-2">
      <button class="save-edit-income bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Save</button>
      <button class="cancel-edit-income bg-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-400">Cancel</button>
    </div>
  `;

  row.querySelector('.save-edit-income').addEventListener('click', () => {
    const newName = row.querySelector('.edit-income-name').value.trim();
    const newAmount = parseFloat(row.querySelector('.edit-income-amount').value);
    if (newName && !isNaN(newAmount) && newAmount > 0) {
      updateIncome(appData, id, { name: newName, amount: newAmount });
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

function renderExpenseList() {
  const list = document.getElementById('expense-list');
  if (!list) return;

  if (appData.cashflow.expenses.length === 0) {
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
