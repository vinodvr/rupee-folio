// Assets & Liabilities management UI and logic
import { addAsset, updateAsset, deleteAsset, addLiability, updateLiability, deleteLiability, generateId } from './storage.js';
import { formatCurrency, getSymbol } from './currency.js';

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
      <input type="text" id="new-asset-name" placeholder="Description (e.g., Primary Residence)"
        class="w-full px-3 py-2 border rounded mb-2 text-sm">
      <div class="flex gap-2">
        <div class="relative flex-1">
          <span class="absolute left-3 top-2 text-gray-500">${getSymbol(currency)}</span>
          <input type="number" id="new-asset-value" placeholder="Current Value"
            class="w-full pl-8 pr-3 py-2 border rounded text-sm">
        </div>
        <button id="save-asset-btn" class="bg-emerald-600 text-white px-4 py-2 rounded text-sm hover:bg-emerald-700">Save</button>
        <button id="cancel-asset-btn" class="bg-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-400">Cancel</button>
      </div>
    </div>
  `;

  document.getElementById('save-asset-btn').addEventListener('click', saveNewAsset);
  document.getElementById('cancel-asset-btn').addEventListener('click', () => {
    container.innerHTML = '';
  });
  document.getElementById('new-asset-name').focus();
}

function saveNewAsset() {
  const category = document.getElementById('new-asset-category').value;
  const name = document.getElementById('new-asset-name').value.trim();
  const value = parseFloat(document.getElementById('new-asset-value').value);

  if (!name || isNaN(value) || value < 0) {
    alert('Please enter a valid description and value');
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
                <button class="edit-asset-btn opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity" data-id="${asset.id}">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                </button>
                <button class="delete-asset-btn opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity" data-id="${asset.id}">
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
  row.className = 'py-2 border-b border-gray-100';
  row.innerHTML = `
    <div class="flex flex-wrap gap-2 mb-2">
      <select class="edit-asset-category px-2 py-1 border rounded text-sm">
        ${renderAssetCategoryOptions(asset.category)}
      </select>
      <input type="text" value="${asset.name}" class="edit-asset-name flex-1 min-w-[120px] px-2 py-1 border rounded text-sm">
      <div class="relative">
        <span class="absolute left-2 top-1 text-gray-500 text-sm">${getSymbol(currency)}</span>
        <input type="number" value="${asset.value}" class="edit-asset-value w-28 pl-6 pr-2 py-1 border rounded text-sm">
      </div>
    </div>
    <div class="flex gap-2">
      <button class="save-edit-asset bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-700">Save</button>
      <button class="cancel-edit-asset bg-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-400">Cancel</button>
    </div>
  `;

  row.querySelector('.save-edit-asset').addEventListener('click', () => {
    const newCategory = row.querySelector('.edit-asset-category').value;
    const newName = row.querySelector('.edit-asset-name').value.trim();
    const newValue = parseFloat(row.querySelector('.edit-asset-value').value);
    if (newName && !isNaN(newValue) && newValue >= 0) {
      updateAsset(appData, id, { category: newCategory, name: newName, value: newValue });
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
  if (confirm('Delete this asset?')) {
    deleteAsset(appData, id);
    renderAssetsList();
    updateNetWorthSummary();
    if (onDataChange) onDataChange();
  }
}

// Liability functions
function showAddLiabilityForm() {
  const container = document.getElementById('liability-form-container');
  container.innerHTML = `
    <div class="bg-gray-50 p-3 rounded-lg mb-3">
      <select id="new-liability-category" class="w-full px-3 py-2 border rounded mb-2 text-sm">
        ${liabilityCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
      </select>
      <input type="text" id="new-liability-name" placeholder="Description (e.g., Home Loan - SBI)"
        class="w-full px-3 py-2 border rounded mb-2 text-sm">
      <div class="flex gap-2">
        <div class="relative flex-1">
          <span class="absolute left-3 top-2 text-gray-500">${getSymbol(currency)}</span>
          <input type="number" id="new-liability-amount" placeholder="Outstanding Amount"
            class="w-full pl-8 pr-3 py-2 border rounded text-sm">
        </div>
        <button id="save-liability-btn" class="bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700">Save</button>
        <button id="cancel-liability-btn" class="bg-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-400">Cancel</button>
      </div>
    </div>
  `;

  document.getElementById('save-liability-btn').addEventListener('click', saveNewLiability);
  document.getElementById('cancel-liability-btn').addEventListener('click', () => {
    container.innerHTML = '';
  });
  document.getElementById('new-liability-name').focus();
}

function saveNewLiability() {
  const category = document.getElementById('new-liability-category').value;
  const name = document.getElementById('new-liability-name').value.trim();
  const amount = parseFloat(document.getElementById('new-liability-amount').value);

  if (!name || isNaN(amount) || amount < 0) {
    alert('Please enter a valid description and amount');
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
            <button class="edit-liability-btn opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity" data-id="${liability.id}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
            </button>
            <button class="delete-liability-btn opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity" data-id="${liability.id}">
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
  row.className = 'py-2 border-b border-gray-100';
  row.innerHTML = `
    <div class="flex flex-wrap gap-2 mb-2">
      <select class="edit-liability-category px-2 py-1 border rounded text-sm">
        ${liabilityCategories.map(cat => `<option value="${cat}" ${cat === liability.category ? 'selected' : ''}>${cat}</option>`).join('')}
      </select>
      <input type="text" value="${liability.name}" class="edit-liability-name flex-1 min-w-[120px] px-2 py-1 border rounded text-sm">
      <div class="relative">
        <span class="absolute left-2 top-1 text-gray-500 text-sm">${getSymbol(currency)}</span>
        <input type="number" value="${liability.amount}" class="edit-liability-amount w-28 pl-6 pr-2 py-1 border rounded text-sm">
      </div>
    </div>
    <div class="flex gap-2">
      <button class="save-edit-liability bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700">Save</button>
      <button class="cancel-edit-liability bg-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-400">Cancel</button>
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
