// Investment tracking per goal
import { addInvestment, deleteInvestment } from './storage.js';
import { formatCurrency, getSymbol } from './currency.js';

let appData = null;
let currency = 'INR';
let onDataChange = null;

export function initInvestments(data, curr, onChange) {
  appData = data;
  currency = curr;
  onDataChange = onChange;
}

export function updateCurrency(curr) {
  currency = curr;
}

export function refreshData(data) {
  appData = data;
}

export function showAddInvestmentModal(goalId) {
  const goal = appData.goals.find(g => g.id === goalId);
  if (!goal) return;

  const modal = document.getElementById('investment-modal');
  const content = document.getElementById('investment-modal-content');

  content.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-full max-w-md">
      <h3 class="text-lg font-semibold mb-4">Add Investment - ${goal.name}</h3>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" id="inv-date" value="${new Date().toISOString().split('T')[0]}"
            class="w-full px-3 py-2 border rounded-lg">
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <div class="relative">
            <span class="absolute left-3 top-2 text-gray-500">${getSymbol(currency)}</span>
            <input type="number" id="inv-amount" placeholder="Investment amount"
              class="w-full pl-8 pr-3 py-2 border rounded-lg">
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
          <input type="text" id="inv-note" placeholder="e.g., SIP"
            class="w-full px-3 py-2 border rounded-lg">
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <button id="cancel-inv-btn" class="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
        <button id="save-inv-btn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Investment</button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  document.getElementById('cancel-inv-btn').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  document.getElementById('save-inv-btn').addEventListener('click', () => {
    const date = document.getElementById('inv-date').value;
    const amount = parseFloat(document.getElementById('inv-amount').value);
    const note = document.getElementById('inv-note').value.trim();

    if (!date || isNaN(amount) || amount <= 0) {
      alert('Please enter a valid date and amount');
      return;
    }

    addInvestment(appData, goalId, { date, amount, note });
    modal.classList.add('hidden');
    if (onDataChange) onDataChange();
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
}

export function showInvestmentHistory(goalId) {
  const goal = appData.goals.find(g => g.id === goalId);
  if (!goal) return;

  const modal = document.getElementById('investment-modal');
  const content = document.getElementById('investment-modal-content');

  const investments = goal.investments || [];
  const hasLumpsum = goal.initialLumpsum > 0;

  content.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-full max-w-lg">
      <h3 class="text-lg font-semibold mb-4">Investment History - ${goal.name}</h3>

      <div class="max-h-96 overflow-y-auto">
        ${hasLumpsum ? `
          <div class="flex items-center justify-between py-3 border-b">
            <div>
              <div class="font-medium">Initial Lumpsum</div>
              <div class="text-sm text-gray-500">${goal.startDate || 'Start date'}</div>
            </div>
            <div class="text-right">
              <div class="font-medium text-green-600">${formatCurrency(goal.initialLumpsum, currency)}</div>
            </div>
          </div>
        ` : ''}

        ${investments.length > 0 ? investments.map(inv => `
          <div class="flex items-center justify-between py-3 border-b group">
            <div>
              <div class="font-medium">${inv.note || 'Investment'}</div>
              <div class="text-sm text-gray-500">${formatDate(inv.date)}</div>
            </div>
            <div class="flex items-center gap-3">
              <div class="font-medium text-green-600">${formatCurrency(inv.amount, currency)}</div>
              <button class="delete-inv-btn opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity"
                data-goal-id="${goalId}" data-inv-id="${inv.id}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        `).join('') : ''}

        ${!hasLumpsum && investments.length === 0 ? `
          <p class="text-gray-500 text-center py-4">No investments recorded yet</p>
        ` : ''}
      </div>

      <div class="flex justify-between items-center mt-6 pt-4 border-t">
        <div class="text-sm text-gray-600">
          Total invested: <span class="font-semibold">${formatCurrency(
            (goal.initialLumpsum || 0) + investments.reduce((sum, i) => sum + i.amount, 0),
            currency
          )}</span>
        </div>
        <button id="close-history-btn" class="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  document.getElementById('close-history-btn').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  // Delete investment handlers
  content.querySelectorAll('.delete-inv-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this investment record?')) {
        deleteInvestment(appData, btn.dataset.goalId, btn.dataset.invId);
        modal.classList.add('hidden');
        if (onDataChange) onDataChange();
      }
    });
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
