// Assets & Liabilities management UI and logic
import { addAsset, updateAsset, deleteAsset, addLiability, updateLiability, deleteLiability, generateId } from './storage.js';
import { formatCurrency, getSymbol } from './currency.js';

// Asset class mapping for pie chart allocation
const ASSET_CLASS_MAP = {
  // Equity
  'Equity Mutual Funds': 'Equity',
  'Stocks': 'Equity',
  'ULIPs': 'Equity',
  'Crypto': 'Equity',
  'ESOPs': 'Equity',
  // Debt
  'Debt/Arbitrage Mutual Funds': 'Debt',
  'FDs & RDs': 'Debt',
  'Savings Bank': 'Debt',
  'Bonds': 'Debt',
  'LIC/Insurance Policy': 'Debt',
  'Gratuity': 'Debt',
  // Gold
  'Gold ETFs/SGBs': 'Gold',
  'Physical Gold': 'Gold',
  // Real Estate
  'House': 'Real Estate',
  'Land': 'Real Estate',
  // Retirement
  'EPF Corpus': 'Retirement',
  'NPS Corpus': 'Retirement',
  'PPF Corpus': 'Retirement',
  // Other
  'Other': 'Other'
};

// Asset class colors (Tailwind-inspired)
const ASSET_CLASS_COLORS = {
  'Equity': '#8b5cf6',      // violet-500
  'Debt': '#3b82f6',        // blue-500
  'Gold': '#f59e0b',        // amber-500
  'Real Estate': '#f97316', // orange-500
  'Retirement': '#ec4899',  // pink-500
  'Other': '#6b7280'        // gray-500
};

// Grouped asset categories for organized dropdown
const assetCategoryGroups = [
  {
    group: 'Retirement',
    categories: ['EPF Corpus', 'PPF Corpus', 'NPS Corpus']
  },
  {
    group: 'Mutual Funds & Securities',
    categories: ['Equity Mutual Funds', 'Debt/Arbitrage Mutual Funds', 'Stocks', 'Bonds', 'ULIPs', 'Crypto']
  },
  {
    group: 'Gold',
    categories: ['Gold ETFs/SGBs', 'Physical Gold']
  },
  {
    group: 'Real Estate',
    categories: ['House', 'Land']
  },
  {
    group: 'Savings Instruments',
    categories: ['Savings Bank', 'FDs & RDs']
  },
  {
    group: 'Insurance',
    categories: ['LIC/Insurance Policy']
  },
  {
    group: 'Employment Benefits',
    categories: ['ESOPs', 'Gratuity']
  },
  {
    group: 'Other',
    categories: ['Other']
  }
];

// Flat list of all categories (for validation and ordering)
const assetCategories = assetCategoryGroups.flatMap(g => g.categories);

// Retirement-related categories
const retirementCategories = ['EPF Corpus', 'PPF Corpus', 'NPS Corpus'];

// Asset categories that can be linked to goals by timeline
// Short-term only (< 5 years): low volatility, fixed-tenure assets
const SHORT_TERM_ONLY = ['FDs & RDs', 'Savings Bank'];

// Long-term only (5+ years): volatile assets that need time to smooth out
const LONG_TERM_ONLY = ['Equity Mutual Funds', 'Stocks', 'Gold ETFs/SGBs'];

// Both short and long term: liquid and versatile
const BOTH_TERMS = ['Debt/Arbitrage Mutual Funds'];

// NOT linkable: retirement instruments, illiquid assets, insurance
const NOT_LINKABLE = [
  'EPF Corpus', 'PPF Corpus', 'NPS Corpus',  // Retirement
  'House', 'Land',                            // Real Estate (illiquid)
  'Physical Gold',                            // Illiquid
  'LIC/Insurance Policy',                     // Insurance
  'ESOPs', 'Gratuity',                        // Employment benefits
  'ULIPs', 'Bonds', 'Crypto',                 // Complex/volatile
  'Other'                                     // Unknown
];

// Helper to render category dropdown with optgroups
function renderAssetCategoryOptions(selectedCategory = '') {
  return assetCategoryGroups.map(group => `
    <optgroup label="${group.group}">
      ${group.categories.map(cat => `<option value="${cat}" ${cat === selectedCategory ? 'selected' : ''}>${cat}</option>`).join('')}
    </optgroup>
  `).join('');
}

const liabilityCategories = [
  'Home Loan',
  'Car Loan',
  'Personal Loan',
  'Credit Card',
  'Other'
];

let appData = null;
let currency = 'INR';
let onDataChange = null;

export function initAssets(data, curr, onChange) {
  appData = data;
  currency = curr;
  onDataChange = onChange;
  renderAssetsList();
  renderLiabilitiesList();
  updateNetWorthSummary();
  setupEventListeners();
}

export function updateCurrency(curr) {
  currency = curr;
  renderAssetsList();
  renderLiabilitiesList();
  updateNetWorthSummary();
}

export function refreshData(data) {
  appData = data;
  renderAssetsList();
  renderLiabilitiesList();
  updateNetWorthSummary();
}

function setupEventListeners() {
  document.getElementById('add-asset-btn')?.addEventListener('click', showAddAssetForm);
  document.getElementById('add-liability-btn')?.addEventListener('click', showAddLiabilityForm);
}

// Get retirement-related assets (EPF and NPS corpus values)
export function getRetirementAssets(data = null) {
  const sourceData = data || appData;
  if (!sourceData || !sourceData.assets) {
    return { epfCorpus: 0, npsCorpus: 0, totalCorpus: 0 };
  }

  // Support both old ('EPF', 'NPS') and new ('EPF Corpus', 'NPS Corpus') category names
  const epfAssets = sourceData.assets.items.filter(a => a.category === 'EPF Corpus' || a.category === 'EPF');
  const npsAssets = sourceData.assets.items.filter(a => a.category === 'NPS Corpus' || a.category === 'NPS');

  const epfCorpus = epfAssets.reduce((sum, a) => sum + (a.value || 0), 0);
  const npsCorpus = npsAssets.reduce((sum, a) => sum + (a.value || 0), 0);

  return {
    epfCorpus,
    npsCorpus,
    totalCorpus: epfCorpus + npsCorpus
  };
}

// Asset functions
function showAddAssetForm() {
  const container = document.getElementById('asset-form-container');
  container.innerHTML = `
    <div class="bg-gray-50 p-3 rounded-lg mb-3">
      <select id="new-asset-category" class="w-full px-3 py-2 border rounded mb-2 text-sm">
        ${renderAssetCategoryOptions()}
      </select>
      <div class="relative mb-2">
        <span class="absolute left-3 top-2 text-gray-500">${getSymbol(currency)}</span>
        <input type="number" id="new-asset-value" placeholder="Current Value"
          class="w-full pl-8 pr-3 py-2 border rounded text-sm">
      </div>
      <input type="text" id="new-asset-name" placeholder="Description - optional (e.g., HDFC Savings)"
        class="w-full px-3 py-2 border rounded mb-2 text-sm">
      <div class="flex gap-2 justify-end">
        <button id="cancel-asset-btn" class="bg-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-400">Cancel</button>
        <button id="save-asset-btn" class="bg-emerald-600 text-white px-4 py-2 rounded text-sm hover:bg-emerald-700">Save</button>
      </div>
    </div>
  `;

  document.getElementById('save-asset-btn').addEventListener('click', saveNewAsset);
  document.getElementById('cancel-asset-btn').addEventListener('click', () => {
    container.innerHTML = '';
  });
  document.getElementById('new-asset-value').focus();
}

function saveNewAsset() {
  const category = document.getElementById('new-asset-category').value;
  const name = document.getElementById('new-asset-name').value.trim() || category;
  const value = parseFloat(document.getElementById('new-asset-value').value);

  if (isNaN(value) || value < 0) {
    alert('Please enter a valid value');
    return;
  }

  addAsset(appData, { category, name, value });
  document.getElementById('asset-form-container').innerHTML = '';
  renderAssetsList();
  updateNetWorthSummary();
  if (onDataChange) onDataChange();
}

function renderAssetsList() {
  const list = document.getElementById('assets-list');
  if (!list) return;

  if (appData.assets.items.length === 0) {
    list.innerHTML = '<p class="text-gray-500 text-sm italic">Add your assets to track net worth</p>';
    return;
  }

  // Group by category
  const grouped = {};
  appData.assets.items.forEach(asset => {
    if (!grouped[asset.category]) grouped[asset.category] = [];
    grouped[asset.category].push(asset);
  });

  // Get all unique categories from data, ordered by our defined order
  // Also support legacy category names
  const allCategories = [...new Set(appData.assets.items.map(a => a.category))];
  const categoryOrder = [...assetCategories, 'EPF', 'NPS', 'Real Estate', 'Vehicles', 'Bank/FDs', 'Stocks', 'Mutual Funds', 'Gold'];
  const orderedCategories = categoryOrder.filter(c => allCategories.includes(c));
  // Add any categories not in our predefined order
  const remainingCategories = allCategories.filter(c => !orderedCategories.includes(c));

  list.innerHTML = [...orderedCategories, ...remainingCategories]
    .filter(category => grouped[category])
    .map(category => {
      const assets = grouped[category];
      const isRetirement = retirementCategories.includes(category) || category === 'EPF' || category === 'NPS';
      const badgeClass = isRetirement ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600';

      return `
        <div class="mb-3">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-semibold uppercase ${badgeClass} px-2 py-0.5 rounded">${category}</span>
          </div>
          ${assets.map(asset => `
            <div class="flex items-center justify-between py-2 border-b border-gray-100 group" data-asset-id="${asset.id}">
              <span class="text-sm">${asset.name}</span>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-emerald-600">${formatCurrency(asset.value, currency)}</span>
                <button class="edit-asset-btn text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded p-1 transition-colors" data-id="${asset.id}">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                </button>
                <button class="delete-asset-btn text-gray-400 hover:text-red-600 hover:bg-red-50 rounded p-1 transition-colors" data-id="${asset.id}">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }).join('');

  // Add event listeners
  list.querySelectorAll('.edit-asset-btn').forEach(btn => {
    btn.addEventListener('click', () => editAsset(btn.dataset.id));
  });
  list.querySelectorAll('.delete-asset-btn').forEach(btn => {
    btn.addEventListener('click', () => removeAsset(btn.dataset.id));
  });
}

function editAsset(id) {
  const asset = appData.assets.items.find(a => a.id === id);
  if (!asset) return;

  const row = document.querySelector(`[data-asset-id="${id}"]`);
  row.className = 'py-3 border-b border-gray-100';
  row.innerHTML = `
    <div class="space-y-2 mb-3">
      <select class="edit-asset-category w-full px-3 py-2 border rounded text-sm">
        ${renderAssetCategoryOptions(asset.category)}
      </select>
      <input type="text" value="${asset.name}" class="edit-asset-name w-full px-3 py-2 border rounded text-sm" placeholder="Description">
      <div class="relative">
        <span class="absolute left-3 top-2 text-gray-500 text-sm">${getSymbol(currency)}</span>
        <input type="number" value="${asset.value}" class="edit-asset-value w-full pl-7 pr-3 py-2 border rounded text-sm" placeholder="Value">
      </div>
    </div>
    <div class="flex gap-2 justify-end">
      <button class="cancel-edit-asset bg-gray-300 px-3 py-1.5 rounded text-sm hover:bg-gray-400">Cancel</button>
      <button class="save-edit-asset bg-emerald-600 text-white px-3 py-1.5 rounded text-sm hover:bg-emerald-700">Save</button>
    </div>
  `;

  row.querySelector('.save-edit-asset').addEventListener('click', () => {
    const newCategory = row.querySelector('.edit-asset-category').value;
    const newName = row.querySelector('.edit-asset-name').value.trim();
    const newValue = parseFloat(row.querySelector('.edit-asset-value').value);
    if (newName && !isNaN(newValue) && newValue >= 0) {
      const result = updateAsset(appData, id, { category: newCategory, name: newName, value: newValue });

      // Check if validation failed
      if (result && result.success === false) {
        showAssetValidationError(result.error, result.allocations);
        return;
      }

      renderAssetsList();
      updateNetWorthSummary();
      if (onDataChange) onDataChange();
    }
  });

  row.querySelector('.cancel-edit-asset').addEventListener('click', () => {
    renderAssetsList();
  });
}

function removeAsset(id) {
  const result = deleteAsset(appData, id);

  // Check if validation failed
  if (result && result.success === false) {
    showAssetValidationError(result.error, result.allocations);
    return;
  }

  renderAssetsList();
  updateNetWorthSummary();
  if (onDataChange) onDataChange();
}

/**
 * Show validation error modal when asset cannot be modified/deleted
 */
function showAssetValidationError(errorMessage, allocations) {
  const modal = document.getElementById('goal-modal');
  const content = document.getElementById('goal-modal-content');

  if (!modal || !content) {
    alert(errorMessage);
    return;
  }

  content.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-full max-w-md">
      <div class="flex items-center gap-3 mb-4">
        <div class="p-2 bg-red-100 rounded-full">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-800">Cannot Complete Action</h3>
      </div>

      <p class="text-sm text-gray-600 mb-4">${errorMessage}</p>

      ${allocations && allocations.length > 0 ? `
        <div class="bg-gray-50 rounded-lg p-3 mb-4">
          <p class="text-xs font-medium text-gray-500 uppercase mb-2">Linked to Goals:</p>
          <div class="space-y-2">
            ${allocations.map(a => `
              <div class="flex justify-between items-center text-sm">
                <span class="text-gray-700">${a.goalName}</span>
                <span class="font-medium text-blue-600">${formatCurrency(a.amount, currency)}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <p class="text-xs text-gray-500 mb-4">
          To modify this asset, first adjust or remove the allocations using the
          <span class="font-medium">Plan</span> tab.
        </p>
      ` : ''}

      <div class="flex justify-end pt-2 border-t">
        <button id="close-validation-error-btn" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
          OK
        </button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  document.getElementById('close-validation-error-btn').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  // Close on backdrop click
  const closeOnBackdrop = (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
      modal.removeEventListener('click', closeOnBackdrop);
    }
  };
  modal.addEventListener('click', closeOnBackdrop);
}

// Liability functions
function showAddLiabilityForm() {
  const container = document.getElementById('liability-form-container');
  container.innerHTML = `
    <div class="bg-gray-50 p-3 rounded-lg mb-3">
      <select id="new-liability-category" class="w-full px-3 py-2 border rounded mb-2 text-sm">
        ${liabilityCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
      </select>
      <div class="relative mb-2">
        <span class="absolute left-3 top-2 text-gray-500">${getSymbol(currency)}</span>
        <input type="number" id="new-liability-amount" placeholder="Outstanding Amount"
          class="w-full pl-8 pr-3 py-2 border rounded text-sm">
      </div>
      <input type="text" id="new-liability-name" placeholder="Description - optional (e.g., SBI Home Loan)"
        class="w-full px-3 py-2 border rounded mb-2 text-sm">
      <div class="flex gap-2 justify-end">
        <button id="cancel-liability-btn" class="bg-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-400">Cancel</button>
        <button id="save-liability-btn" class="bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700">Save</button>
      </div>
    </div>
  `;

  document.getElementById('save-liability-btn').addEventListener('click', saveNewLiability);
  document.getElementById('cancel-liability-btn').addEventListener('click', () => {
    container.innerHTML = '';
  });
  document.getElementById('new-liability-amount').focus();
}

function saveNewLiability() {
  const category = document.getElementById('new-liability-category').value;
  const name = document.getElementById('new-liability-name').value.trim() || category;
  const amount = parseFloat(document.getElementById('new-liability-amount').value);

  if (isNaN(amount) || amount < 0) {
    alert('Please enter a valid amount');
    return;
  }

  addLiability(appData, { category, name, amount });
  document.getElementById('liability-form-container').innerHTML = '';
  renderLiabilitiesList();
  updateNetWorthSummary();
  if (onDataChange) onDataChange();
}

function renderLiabilitiesList() {
  const list = document.getElementById('liabilities-list');
  if (!list) return;

  if (appData.liabilities.items.length === 0) {
    list.innerHTML = '<p class="text-gray-500 text-sm italic">No loans or liabilities yet</p>';
    return;
  }

  // Group by category
  const grouped = {};
  appData.liabilities.items.forEach(liability => {
    if (!grouped[liability.category]) grouped[liability.category] = [];
    grouped[liability.category].push(liability);
  });

  list.innerHTML = Object.entries(grouped).map(([category, liabilities]) => `
    <div class="mb-3">
      <div class="text-xs font-semibold text-gray-500 uppercase mb-1">${category}</div>
      ${liabilities.map(liability => `
        <div class="flex items-center justify-between py-2 border-b border-gray-100 group" data-liability-id="${liability.id}">
          <span class="text-sm">${liability.name}</span>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-orange-600">${formatCurrency(liability.amount, currency)}</span>
            <button class="edit-liability-btn text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded p-1 transition-colors" data-id="${liability.id}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
            </button>
            <button class="delete-liability-btn text-gray-400 hover:text-red-600 hover:bg-red-50 rounded p-1 transition-colors" data-id="${liability.id}">
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
  list.querySelectorAll('.edit-liability-btn').forEach(btn => {
    btn.addEventListener('click', () => editLiability(btn.dataset.id));
  });
  list.querySelectorAll('.delete-liability-btn').forEach(btn => {
    btn.addEventListener('click', () => removeLiability(btn.dataset.id));
  });
}

function editLiability(id) {
  const liability = appData.liabilities.items.find(l => l.id === id);
  if (!liability) return;

  const row = document.querySelector(`[data-liability-id="${id}"]`);
  row.className = 'py-3 border-b border-gray-100';
  row.innerHTML = `
    <div class="space-y-2 mb-3">
      <select class="edit-liability-category w-full px-3 py-2 border rounded text-sm">
        ${liabilityCategories.map(cat => `<option value="${cat}" ${cat === liability.category ? 'selected' : ''}>${cat}</option>`).join('')}
      </select>
      <input type="text" value="${liability.name}" class="edit-liability-name w-full px-3 py-2 border rounded text-sm" placeholder="Description">
      <div class="relative">
        <span class="absolute left-3 top-2 text-gray-500 text-sm">${getSymbol(currency)}</span>
        <input type="number" value="${liability.amount}" class="edit-liability-amount w-full pl-7 pr-3 py-2 border rounded text-sm" placeholder="Amount">
      </div>
    </div>
    <div class="flex gap-2 justify-end">
      <button class="cancel-edit-liability bg-gray-300 px-3 py-1.5 rounded text-sm hover:bg-gray-400">Cancel</button>
      <button class="save-edit-liability bg-orange-600 text-white px-3 py-1.5 rounded text-sm hover:bg-orange-700">Save</button>
    </div>
  `;

  row.querySelector('.save-edit-liability').addEventListener('click', () => {
    const newCategory = row.querySelector('.edit-liability-category').value;
    const newName = row.querySelector('.edit-liability-name').value.trim();
    const newAmount = parseFloat(row.querySelector('.edit-liability-amount').value);
    if (newName && !isNaN(newAmount) && newAmount >= 0) {
      updateLiability(appData, id, { category: newCategory, name: newName, amount: newAmount });
      renderLiabilitiesList();
      updateNetWorthSummary();
      if (onDataChange) onDataChange();
    }
  });

  row.querySelector('.cancel-edit-liability').addEventListener('click', () => {
    renderLiabilitiesList();
  });
}

function removeLiability(id) {
  if (confirm('Delete this liability?')) {
    deleteLiability(appData, id);
    renderLiabilitiesList();
    updateNetWorthSummary();
    if (onDataChange) onDataChange();
  }
}

// Summary calculation
function updateNetWorthSummary() {
  const totalAssets = appData.assets.items.reduce((sum, a) => sum + (a.value || 0), 0);
  const totalLiabilities = appData.liabilities.items.reduce((sum, l) => sum + (l.amount || 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  const totalAssetsEl = document.getElementById('total-assets');
  const totalLiabilitiesEl = document.getElementById('total-liabilities');
  const netWorthEl = document.getElementById('net-worth');

  if (totalAssetsEl) totalAssetsEl.textContent = formatCurrency(totalAssets, currency);
  if (totalLiabilitiesEl) totalLiabilitiesEl.textContent = formatCurrency(totalLiabilities, currency);
  if (netWorthEl) netWorthEl.textContent = formatCurrency(netWorth, currency);

  // Render asset allocation pie chart
  renderAssetAllocationChart();
}

/**
 * Calculate asset allocation by asset class
 * @returns {object} Allocation by asset class { Equity: 0, Debt: 0, ... }
 */
export function getAssetAllocation() {
  const allocation = { Equity: 0, Debt: 0, Gold: 0, 'Real Estate': 0, Retirement: 0, Other: 0 };

  if (!appData || !appData.assets || !appData.assets.items) {
    return allocation;
  }

  appData.assets.items.forEach(asset => {
    const assetClass = ASSET_CLASS_MAP[asset.category] || 'Other';
    allocation[assetClass] += asset.value || 0;
  });

  return allocation;
}

/**
 * Render the asset allocation donut chart
 */
function renderAssetAllocationChart() {
  const container = document.getElementById('asset-allocation-chart');
  if (!container) return;

  const allocation = getAssetAllocation();
  const total = Object.values(allocation).reduce((a, b) => a + b, 0);

  if (total === 0) {
    container.innerHTML = '';
    return;
  }

  // Filter out zero-value classes and calculate percentages
  const slices = Object.entries(allocation)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
      percentage: (value / total) * 100,
      color: ASSET_CLASS_COLORS[name]
    }))
    .sort((a, b) => b.value - a.value); // Sort by value descending

  // Generate SVG donut chart
  const size = 120;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let currentOffset = 0;
  const paths = slices.map(slice => {
    const dashLength = (slice.percentage / 100) * circumference;
    const dashOffset = -currentOffset;
    currentOffset += dashLength;

    return `<circle
      cx="${center}"
      cy="${center}"
      r="${radius}"
      fill="none"
      stroke="${slice.color}"
      stroke-width="${strokeWidth}"
      stroke-dasharray="${dashLength} ${circumference - dashLength}"
      stroke-dashoffset="${dashOffset}"
      transform="rotate(-90 ${center} ${center})"
    />`;
  }).join('');

  // Build legend items for all slices
  const legendItems = slices.map(slice => `
    <div class="flex items-center gap-2">
      <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${slice.color}"></span>
      <span class="text-sm text-slate-200 flex-1">${slice.name}</span>
      <span class="text-sm font-semibold text-white">${Math.round(slice.percentage)}%</span>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="flex items-center justify-center gap-6">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="shrink-0">
        <!-- Background circle -->
        <circle
          cx="${center}"
          cy="${center}"
          r="${radius}"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          stroke-width="${strokeWidth}"
        />
        ${paths}
      </svg>
      <div class="flex flex-col gap-1.5 text-left">
        ${legendItems}
      </div>
    </div>
  `;
}

export function getTotalAssets() {
  return appData.assets.items.reduce((sum, a) => sum + (a.value || 0), 0);
}

export function getTotalLiabilities() {
  return appData.liabilities.items.reduce((sum, l) => sum + (l.amount || 0), 0);
}

export function getNetWorth() {
  return getTotalAssets() - getTotalLiabilities();
}

/**
 * Get assets that can be linked to goals based on goal timeline category
 * @param {object} data - App data containing assets
 * @param {string} goalCategory - 'short' for < 5 years, 'long' for 5+ years
 * @returns {Array} Filtered array of linkable assets
 */
export function getLinkableAssets(data, goalCategory) {
  if (!data || !data.assets || !data.assets.items) {
    return [];
  }

  const allowedCategories = goalCategory === 'short'
    ? [...SHORT_TERM_ONLY, ...BOTH_TERMS]
    : [...LONG_TERM_ONLY, ...BOTH_TERMS];

  return data.assets.items.filter(asset =>
    allowedCategories.includes(asset.category)
  );
}

/**
 * Get allocation status for all linkable assets
 * Shows how much of each asset is allocated across all goals
 * @param {object} data - App data containing assets and goals
 * @returns {object} Map of assetId to { total, allocated, available }
 */
export function getAssetAllocations(data) {
  if (!data || !data.assets || !data.assets.items) {
    return {};
  }

  const allocations = {};

  // Initialize with total values
  data.assets.items.forEach(asset => {
    // Only track linkable assets
    if (!NOT_LINKABLE.includes(asset.category)) {
      allocations[asset.id] = {
        total: asset.value || 0,
        allocated: 0,
        available: asset.value || 0
      };
    }
  });

  // Sum up allocations from all goals
  if (data.goals) {
    data.goals.forEach(goal => {
      if (goal.linkedAssets && goal.linkedAssets.length > 0) {
        goal.linkedAssets.forEach(linked => {
          if (allocations[linked.assetId]) {
            allocations[linked.assetId].allocated += linked.amount || 0;
            allocations[linked.assetId].available = Math.max(0,
              allocations[linked.assetId].total - allocations[linked.assetId].allocated
            );
          }
        });
      }
    });
  }

  return allocations;
}

/**
 * Get total linked amount for a specific goal
 * @param {object} goal - Goal with linkedAssets array
 * @returns {number} Total amount linked to this goal
 */
export function getGoalLinkedTotal(goal) {
  if (!goal || !goal.linkedAssets || goal.linkedAssets.length === 0) {
    return 0;
  }
  return goal.linkedAssets.reduce((sum, la) => sum + (la.amount || 0), 0);
}

/**
 * Validate if a proposed link amount is valid (doesn't exceed available)
 * @param {object} data - App data containing assets and goals
 * @param {string} assetId - Asset to link
 * @param {number} proposedAmount - Amount to link
 * @param {string} goalId - Goal being linked to (excluded from current allocations)
 * @returns {object} { valid: boolean, available: number, error?: string }
 */
export function validateLinkAmount(data, assetId, proposedAmount, goalId) {
  if (!data || !data.assets || !data.assets.items) {
    return { valid: false, available: 0, error: 'Invalid data' };
  }

  const asset = data.assets.items.find(a => a.id === assetId);
  if (!asset) {
    return { valid: false, available: 0, error: 'Asset not found' };
  }

  if (proposedAmount <= 0) {
    return { valid: false, available: asset.value, error: 'Amount must be positive' };
  }

  // Calculate how much is allocated to OTHER goals (not the current one)
  let allocatedToOthers = 0;
  if (data.goals) {
    data.goals.forEach(goal => {
      if (goal.id === goalId) return; // Skip the goal we're linking to
      if (goal.linkedAssets && goal.linkedAssets.length > 0) {
        const link = goal.linkedAssets.find(la => la.assetId === assetId);
        if (link) {
          allocatedToOthers += link.amount || 0;
        }
      }
    });
  }

  const available = Math.max(0, asset.value - allocatedToOthers);

  if (proposedAmount > available) {
    return {
      valid: false,
      available,
      error: `Amount exceeds available (${available}). Asset value: ${asset.value}, allocated to other goals: ${allocatedToOthers}`
    };
  }

  return { valid: true, available };
}

/**
 * Check if total allocations for an asset exceed its value
 * @param {object} data - App data
 * @param {string} assetId - Asset to check
 * @returns {object} { overAllocated: boolean, total: number, allocated: number, excess: number }
 */
export function checkAssetOverAllocation(data, assetId) {
  if (!data || !data.assets || !data.assets.items) {
    return { overAllocated: false, total: 0, allocated: 0, excess: 0 };
  }

  const asset = data.assets.items.find(a => a.id === assetId);
  if (!asset) {
    return { overAllocated: false, total: 0, allocated: 0, excess: 0 };
  }

  let totalAllocated = 0;
  if (data.goals) {
    data.goals.forEach(goal => {
      if (goal.linkedAssets && goal.linkedAssets.length > 0) {
        const link = goal.linkedAssets.find(la => la.assetId === assetId);
        if (link) {
          totalAllocated += link.amount || 0;
        }
      }
    });
  }

  const excess = Math.max(0, totalAllocated - asset.value);

  return {
    overAllocated: totalAllocated > asset.value,
    total: asset.value,
    allocated: totalAllocated,
    excess
  };
}

// Export constants for use in other modules
export { SHORT_TERM_ONLY, LONG_TERM_ONLY, BOTH_TERMS, NOT_LINKABLE };
