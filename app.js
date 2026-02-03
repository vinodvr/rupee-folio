// Main application initialization and event coordination
import { loadData, saveData, clearData, setCurrency, getCurrency, getFundHouse, setFundHouse, getEquityReturn, setEquityReturn, getDebtReturn, setDebtReturn } from './modules/storage.js';
import { initCashflow, updateCurrency as updateCashflowCurrency, refreshData as refreshCashflow } from './modules/cashflow.js';
import { initGoals, updateCurrency as updateGoalsCurrency, updateFundHouse as updateGoalsFundHouse, updateReturns as updateGoalsReturns, refreshData as refreshGoals } from './modules/goals.js';
import { initInvestments, updateCurrency as updateInvestmentsCurrency, refreshData as refreshInvestments } from './modules/investments.js';

let appData = null;

// Sample data for demo purposes
function getSampleData() {
  return {
    settings: {
      currency: 'INR',
      fundHouse: 'icici',
      equityReturn: 10,
      debtReturn: 5
    },
    cashflow: {
      income: [
        { name: 'Salary Self', amount: 200000, epf: 36000, nps: 10000, epfCorpus: 1500000, npsCorpus: 500000, id: '421af97f-222b-4ec1-97f4-e0a9a071c3be' },
        { name: 'Salary Spouse', amount: 150000, epf: 24000, nps: 0, epfCorpus: 800000, npsCorpus: 0, id: '77e29ba2-756f-4409-9f4a-e8a9c0285b72' }
      ],
      expenses: [
        { category: 'Housing', name: 'Rent', amount: 50000, id: '35c860f6-8a25-48f9-85ce-48d6ee333718' },
        { category: 'Utilities', name: 'Elec + Internet', amount: 5000, id: '26647708-b354-4fd5-aa03-0a6ee0fe6341' },
        { category: 'Food', name: 'Groceries + Eat out', amount: 15000, id: '7642cb61-da32-4ca5-9e0b-bff3496dc9eb' },
        { category: 'Insurance', name: 'Health + Life', amount: 3000, id: 'a837f139-bef7-4485-b7f2-57f2633e4311' },
        { category: 'Entertainment', name: 'OTT + Partying', amount: 10000, id: '39cf5253-4092-4350-8149-a0ee16acba93' },
        { category: 'Shopping', name: 'Malls', amount: 8000, id: '59213d20-d9d5-455e-b132-5683d6213eb8' }
      ]
    },
    goals: [
      {
        name: 'Trip to Japan',
        goalType: 'one-time',
        targetAmount: 1000000,
        inflationRate: 5,
        targetDate: '2028-01-29',
        equityPercent: 0,
        debtPercent: 100,
        annualStepUp: 0,
        initialLumpsum: 0,
        startDate: '2026-01-29',
        investments: [],
        id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab'
      },
      {
        name: 'Retirement',
        goalType: 'retirement',
        targetAmount: 40000000,
        inflationRate: 6,
        targetDate: '2046-01-29',
        equityPercent: 70,
        debtPercent: 30,
        annualStepUp: 7,
        epfNpsStepUp: true,
        initialLumpsum: 0,
        startDate: '2026-01-29',
        investments: [],
        id: '5c582900-7783-4f61-b700-920a5cf67d1b'
      },
      {
        name: 'Car',
        goalType: 'one-time',
        targetAmount: 1500000,
        inflationRate: 8,
        targetDate: '2032-01-29',
        equityPercent: 30,
        debtPercent: 70,
        annualStepUp: 7,
        initialLumpsum: 0,
        startDate: '2026-01-29',
        investments: [],
        id: '4f056bc9-e8ce-4116-a394-6ddd99017a92'
      },
      {
        name: 'Home at Retirement',
        goalType: 'one-time',
        targetAmount: 20000000,
        inflationRate: 6,
        targetDate: '2045-01-29',
        equityPercent: 70,
        debtPercent: 30,
        annualStepUp: 7,
        initialLumpsum: 0,
        startDate: '2026-01-29',
        investments: [],
        id: 'f7340a31-3a65-4b70-a63b-a1cc4039628d'
      }
    ]
  };
}

function init() {
  // Check for URL parameters
  const urlParams = new URLSearchParams(window.location.search);

  // Handle clear data route
  if (urlParams.get('clear') === '1') {
    clearData();
    window.location.href = window.location.pathname;
    return;
  }

  // Handle sample data route
  if (urlParams.get('sample_plan') === '1') {
    appData = getSampleData();
    saveData(appData);
    window.location.href = window.location.pathname;
    return;
  }

  // Load data from localStorage
  appData = loadData();

  const currency = getCurrency(appData);
  const fundHouse = getFundHouse(appData);
  const equityReturn = getEquityReturn(appData);
  const debtReturn = getDebtReturn(appData);

  // Set up currency selector
  const currencySelect = document.getElementById('currency-select');
  currencySelect.value = currency;
  currencySelect.addEventListener('change', handleCurrencyChange);

  // Set up fund house selector
  const fundHouseSelect = document.getElementById('fund-house-select');
  fundHouseSelect.value = fundHouse;
  fundHouseSelect.addEventListener('change', handleFundHouseChange);

  // Set up return rate sliders
  const equityReturnSlider = document.getElementById('equity-return-setting');
  const equityReturnValue = document.getElementById('equity-return-value');
  equityReturnSlider.value = equityReturn;
  equityReturnValue.textContent = `${equityReturn}%`;
  equityReturnSlider.addEventListener('input', handleEquityReturnChange);

  const debtReturnSlider = document.getElementById('debt-return-setting');
  const debtReturnValue = document.getElementById('debt-return-value');
  debtReturnSlider.value = debtReturn;
  debtReturnValue.textContent = `${debtReturn}%`;
  debtReturnSlider.addEventListener('input', handleDebtReturnChange);

  // Set up settings modal
  setupSettingsModal(currency);

  // Initialize all modules
  const onDataChange = () => {
    refreshAllModules();
  };

  initCashflow(appData, currency, onDataChange);
  initInvestments(appData, currency, onDataChange);
  initGoals(appData, currency, fundHouse, equityReturn, debtReturn, onDataChange);

  // Listen for storage changes from other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'financial-planner-data') {
      appData = loadData();
      refreshAllModules();
    }
  });

  console.log('GlidePath Planner initialized');
}

function handleCurrencyChange(e) {
  const newCurrency = e.target.value;
  setCurrency(appData, newCurrency);

  updateCashflowCurrency(newCurrency);
  updateInvestmentsCurrency(newCurrency);
  updateGoalsCurrency(newCurrency);

  // Update fund house visibility in settings modal
  const fundHouseContainer = document.getElementById('fund-house-container');
  if (newCurrency === 'INR') {
    fundHouseContainer.classList.remove('hidden');
  } else {
    fundHouseContainer.classList.add('hidden');
  }
}

function handleFundHouseChange(e) {
  const newFundHouse = e.target.value;
  setFundHouse(appData, newFundHouse);
  updateGoalsFundHouse(newFundHouse);
}

function handleEquityReturnChange(e) {
  const newEquityReturn = parseFloat(e.target.value);
  document.getElementById('equity-return-value').textContent = `${newEquityReturn}%`;
  setEquityReturn(appData, newEquityReturn);
  updateGoalsReturns(newEquityReturn, getDebtReturn(appData));
}

function handleDebtReturnChange(e) {
  const newDebtReturn = parseFloat(e.target.value);
  document.getElementById('debt-return-value').textContent = `${newDebtReturn}%`;
  setDebtReturn(appData, newDebtReturn);
  updateGoalsReturns(getEquityReturn(appData), newDebtReturn);
}

function setupSettingsModal(currency) {
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const doneSettingsBtn = document.getElementById('done-settings-btn');
  const fundHouseContainer = document.getElementById('fund-house-container');

  // Show/hide fund house based on currency
  if (currency === 'INR') {
    fundHouseContainer.classList.remove('hidden');
  } else {
    fundHouseContainer.classList.add('hidden');
  }

  // Open modal
  settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
  });

  // Close modal
  const closeModal = () => {
    settingsModal.classList.add('hidden');
  };

  closeSettingsBtn.addEventListener('click', closeModal);
  doneSettingsBtn.addEventListener('click', closeModal);

  // Close on backdrop click
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeModal();
    }
  });
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
