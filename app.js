// Main application initialization and event coordination
import { loadData, saveData, setCurrency, getCurrency, getFundHouse, setFundHouse } from './modules/storage.js';
import { initCashflow, updateCurrency as updateCashflowCurrency, refreshData as refreshCashflow } from './modules/cashflow.js';
import { initGoals, updateCurrency as updateGoalsCurrency, updateFundHouse as updateGoalsFundHouse, refreshData as refreshGoals } from './modules/goals.js';
import { initInvestments, updateCurrency as updateInvestmentsCurrency, refreshData as refreshInvestments } from './modules/investments.js';

let appData = null;

function init() {
  // Load data from localStorage
  appData = loadData();

  const currency = getCurrency(appData);
  const fundHouse = getFundHouse(appData);

  // Set up currency selector
  const currencySelect = document.getElementById('currency-select');
  currencySelect.value = currency;
  currencySelect.addEventListener('change', handleCurrencyChange);

  // Set up fund house selector
  const fundHouseSelect = document.getElementById('fund-house-select');
  const fundHouseContainer = document.getElementById('fund-house-container');
  fundHouseSelect.value = fundHouse;
  fundHouseSelect.addEventListener('change', handleFundHouseChange);

  // Show/hide fund house selector based on currency
  updateFundHouseVisibility(currency);

  // Initialize all modules
  const onDataChange = () => {
    refreshAllModules();
  };

  initCashflow(appData, currency, onDataChange);
  initInvestments(appData, currency, onDataChange);
  initGoals(appData, currency, fundHouse, onDataChange);

  // Listen for storage changes from other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'financial-planner-data') {
      appData = loadData();
      refreshAllModules();
    }
  });

  console.log('Rookie Financial Planner initialized');
}

function handleCurrencyChange(e) {
  const newCurrency = e.target.value;
  setCurrency(appData, newCurrency);

  updateCashflowCurrency(newCurrency);
  updateInvestmentsCurrency(newCurrency);
  updateGoalsCurrency(newCurrency);
  updateFundHouseVisibility(newCurrency);
}

function handleFundHouseChange(e) {
  const newFundHouse = e.target.value;
  setFundHouse(appData, newFundHouse);
  updateGoalsFundHouse(newFundHouse);
}

function updateFundHouseVisibility(currency) {
  const fundHouseContainer = document.getElementById('fund-house-container');
  if (currency === 'INR') {
    fundHouseContainer.classList.remove('hidden');
  } else {
    fundHouseContainer.classList.add('hidden');
  }
}

function refreshAllModules() {
  const currency = getCurrency(appData);
  const fundHouse = getFundHouse(appData);
  refreshCashflow(appData);
  refreshInvestments(appData);
  refreshGoals(appData);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
