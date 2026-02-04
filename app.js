// Main application initialization and event coordination
import { loadData, saveData, clearData, setCurrency, getCurrency, getFundHouse, setFundHouse, getEquityAllocation, setEquityAllocation, getEquityReturn, setEquityReturn, getDebtReturn, setDebtReturn, getArbitrageReturn, setArbitrageReturn, getEpfReturn, setEpfReturn, getNpsReturn, setNpsReturn } from './modules/storage.js';
import { initCashflow, updateCurrency as updateCashflowCurrency, refreshData as refreshCashflow } from './modules/cashflow.js';
import { initAssets, updateCurrency as updateAssetsCurrency, refreshData as refreshAssets } from './modules/assets.js';
import { initGoals, updateCurrency as updateGoalsCurrency, updateFundHouse as updateGoalsFundHouse, updateReturns as updateGoalsReturns, refreshData as refreshGoals } from './modules/goals.js';
import { initInvestmentPlan, updateCurrency as updateInvestmentPlanCurrency, updateFundHouse as updateInvestmentPlanFundHouse, updateAllocation as updateInvestmentPlanAllocation, updateReturns as updateInvestmentPlanReturns, refreshData as refreshInvestmentPlan } from './modules/investmentplan.js';

let appData = null;

// Sample data for demo purposes
function getSampleData() {
  return {
    settings: {
      currency: 'INR',
      fundHouse: 'icici',
      equityAllocation: 60,
      equityReturn: 10,
      debtReturn: 5,
      arbitrageReturn: 6,
      epfReturn: 8,
      npsReturn: 9
    },
    cashflow: {
      income: [
        { name: 'Salary Self', amount: 200000, epf: 36000, nps: 10000, id: '421af97f-222b-4ec1-97f4-e0a9a071c3be' },
        { name: 'Salary Spouse', amount: 150000, epf: 24000, nps: 0, id: '77e29ba2-756f-4409-9f4a-e8a9c0285b72' }
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
    assets: {
      items: [
        { id: 'asset-epf-1', name: 'EPF Corpus - Self', category: 'EPF', value: 1500000 },
        { id: 'asset-epf-2', name: 'EPF Corpus - Spouse', category: 'EPF', value: 800000 },
        { id: 'asset-nps-1', name: 'NPS - Corpus', category: 'NPS', value: 500000 },
        { id: 'asset-gold-1', name: 'Physical Gold', category: 'Gold', value: 500000 },
        { id: 'asset-mf-1', name: 'Equity MF', category: 'Mutual Funds', value: 1500000 },
        { id: 'asset-mf-2', name: 'Debt MFs', category: 'Mutual Funds', value: 500000 }
      ]
    },
    liabilities: {
      items: [
        { id: 'liability-car-1', name: 'Car Loan (Honda City)', category: 'Car Loan', amount: 1500000 }
      ]
    },
    goals: [
      {
        name: 'Trip to Japan',
        goalType: 'one-time',
        targetAmount: 1000000,
        inflationRate: 5,
        targetDate: '2028-01-29',
        startDate: '2026-01-29',
        id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab'
      },
      {
        name: 'Retirement',
        goalType: 'retirement',
        targetAmount: 40000000,
        inflationRate: 6,
        targetDate: '2046-01-29',
        epfNpsStepUp: true,
        startDate: '2026-01-29',
        id: '5c582900-7783-4f61-b700-920a5cf67d1b'
      },
      {
        name: 'Car',
        goalType: 'one-time',
        targetAmount: 1500000,
        inflationRate: 8,
        targetDate: '2030-01-29',
        startDate: '2026-01-29',
        id: '4f056bc9-e8ce-4116-a394-6ddd99017a92'
      },
      {
        name: 'Home at Retirement',
        goalType: 'one-time',
        targetAmount: 20000000,
        inflationRate: 6,
        targetDate: '2045-01-29',
        startDate: '2026-01-29',
        id: 'f7340a31-3a65-4b70-a63b-a1cc4039628d'
      }
    ]
  };
}

function setupTabNavigation() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  function switchToTab(tabName) {
    const tab = document.getElementById(`tab-${tabName}`);
    const targetId = `panel-${tabName}`;

    if (!tab) return;

    // Update tab active states
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Show/hide panels
    panels.forEach(panel => {
      if (panel.id === targetId) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.id.replace('tab-', '');

      // Update URL hash without scrolling
      history.replaceState(null, '', `#${tabName}`);

      switchToTab(tabName);
    });
  });

  // On page load, check for hash in URL
  const hash = window.location.hash.slice(1);
  if (hash && document.getElementById(`tab-${hash}`)) {
    switchToTab(hash);
  }

  // Handle browser back/forward
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1);
    if (hash && document.getElementById(`tab-${hash}`)) {
      switchToTab(hash);
    }
  });
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
  const equityAllocation = getEquityAllocation(appData);
  const equityReturn = getEquityReturn(appData);
  const debtReturn = getDebtReturn(appData);
  const arbitrageReturn = getArbitrageReturn(appData);
  const epfReturn = getEpfReturn(appData);
  const npsReturn = getNpsReturn(appData);

  // Set up tab navigation
  setupTabNavigation();

  // Set up currency selector
  const currencySelect = document.getElementById('currency-select');
  currencySelect.value = currency;
  currencySelect.addEventListener('change', handleCurrencyChange);

  // Set up equity allocation slider
  const equityAllocationSlider = document.getElementById('equity-allocation-setting');
  const equityAllocationValue = document.getElementById('equity-allocation-value');
  const debtAllocationValue = document.getElementById('debt-allocation-value');
  equityAllocationSlider.value = equityAllocation;
  equityAllocationValue.textContent = `${equityAllocation}%`;
  debtAllocationValue.textContent = `${100 - equityAllocation}%`;
  updateRiskProfileLabel(equityAllocation);
  equityAllocationSlider.addEventListener('input', handleEquityAllocationChange);

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

  const arbitrageReturnSlider = document.getElementById('arbitrage-return-setting');
  const arbitrageReturnValue = document.getElementById('arbitrage-return-value');
  arbitrageReturnSlider.value = arbitrageReturn;
  arbitrageReturnValue.textContent = `${arbitrageReturn}%`;
  arbitrageReturnSlider.addEventListener('input', handleArbitrageReturnChange);

  // Set up EPF/NPS return rate sliders
  const epfReturnSlider = document.getElementById('epf-return-setting');
  const epfReturnValueEl = document.getElementById('epf-return-value');
  epfReturnSlider.value = epfReturn;
  epfReturnValueEl.textContent = `${epfReturn}%`;
  epfReturnSlider.addEventListener('input', handleEpfReturnChange);

  const npsReturnSlider = document.getElementById('nps-return-setting');
  const npsReturnValueEl = document.getElementById('nps-return-value');
  npsReturnSlider.value = npsReturn;
  npsReturnValueEl.textContent = `${npsReturn}%`;
  npsReturnSlider.addEventListener('input', handleNpsReturnChange);

  // Set up reset button
  const resetReturnsBtn = document.getElementById('reset-returns-btn');
  resetReturnsBtn.addEventListener('click', handleResetReturns);

  // Set up collapsible Asset Allocation section
  const toggleAllocationBtn = document.getElementById('toggle-allocation-btn');
  const allocationContent = document.getElementById('allocation-content');
  const allocationChevron = document.getElementById('allocation-chevron');
  const allocationSummary = document.getElementById('allocation-summary');
  toggleAllocationBtn.addEventListener('click', () => {
    const isHidden = allocationContent.classList.toggle('hidden');
    allocationChevron.style.transform = isHidden ? '' : 'rotate(180deg)';
    allocationSummary.classList.toggle('hidden', !isHidden);
  });
  updateAllocationSummary(equityAllocation);

  // Set up collapsible Expected Returns section
  const toggleReturnsBtn = document.getElementById('toggle-returns-btn');
  const returnsContent = document.getElementById('returns-content');
  const returnsChevron = document.getElementById('returns-chevron');
  const returnsSummary = document.getElementById('returns-summary');
  toggleReturnsBtn.addEventListener('click', () => {
    const isHidden = returnsContent.classList.toggle('hidden');
    returnsChevron.style.transform = isHidden ? '' : 'rotate(180deg)';
    returnsSummary.classList.toggle('hidden', !isHidden);
  });
  updateReturnsSummary(equityReturn, debtReturn, arbitrageReturn, epfReturn, npsReturn);

  // Initialize all modules
  const onDataChange = () => {
    refreshAllModules();
    updateEpfNpsVisibility();
    updateReturnsSummary(getEquityReturn(appData), getDebtReturn(appData), getArbitrageReturn(appData), getEpfReturn(appData), getNpsReturn(appData));
  };

  initCashflow(appData, currency, onDataChange);
  initAssets(appData, currency, onDataChange);
  initGoals(appData, currency, fundHouse, equityReturn, debtReturn, arbitrageReturn, onDataChange);
  initInvestmentPlan(appData, currency, fundHouse, equityAllocation, equityReturn, debtReturn, arbitrageReturn, epfReturn, npsReturn, onDataChange);

  // Show/hide EPF/NPS returns based on retirement goals
  updateEpfNpsVisibility();

  // Listen for storage changes from other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'financial-planner-data') {
      appData = loadData();
      refreshAllModules();
    }
  });

  // Listen for fund house changes from investment plan
  document.addEventListener('fundHouseChange', (e) => {
    const newFundHouse = e.detail.fundHouse;
    setFundHouse(appData, newFundHouse);
    updateGoalsFundHouse(newFundHouse);
    updateInvestmentPlanFundHouse(newFundHouse);
  });

  console.log('RupeeFolio initialized');
}

function handleCurrencyChange(e) {
  const newCurrency = e.target.value;
  setCurrency(appData, newCurrency);

  updateCashflowCurrency(newCurrency);
  updateAssetsCurrency(newCurrency);
  updateGoalsCurrency(newCurrency);
  updateInvestmentPlanCurrency(newCurrency);
}

function handleEquityAllocationChange(e) {
  const newEquityAllocation = parseInt(e.target.value);
  document.getElementById('equity-allocation-value').textContent = `${newEquityAllocation}%`;
  document.getElementById('debt-allocation-value').textContent = `${100 - newEquityAllocation}%`;
  updateRiskProfileLabel(newEquityAllocation);
  updateAllocationSummary(newEquityAllocation);
  setEquityAllocation(appData, newEquityAllocation);
  updateInvestmentPlanAllocation(newEquityAllocation);
}

function updateRiskProfileLabel(equityPercent) {
  const label = document.getElementById('risk-profile-label');
  let text, bgClass, textClass;

  if (equityPercent <= 40) {
    text = 'Conservative';
    bgClass = 'bg-green-100';
    textClass = 'text-green-700';
  } else if (equityPercent <= 60) {
    text = 'Reasonable';
    bgClass = 'bg-blue-100';
    textClass = 'text-blue-700';
  } else if (equityPercent <= 70) {
    text = 'Risky';
    bgClass = 'bg-orange-100';
    textClass = 'text-orange-700';
  } else {
    text = 'Very Risky';
    bgClass = 'bg-red-100';
    textClass = 'text-red-700';
  }

  label.textContent = text;
  label.className = `text-xs px-2 py-1 rounded-full ${bgClass} ${textClass}`;

  // Show/hide warning for risky profiles
  const warningLabel = document.getElementById('risk-warning-label');
  if (equityPercent > 60) {
    warningLabel.classList.remove('hidden');
  } else {
    warningLabel.classList.add('hidden');
  }
}

function handleEquityReturnChange(e) {
  const newEquityReturn = parseFloat(e.target.value);
  document.getElementById('equity-return-value').textContent = `${newEquityReturn}%`;
  setEquityReturn(appData, newEquityReturn);
  updateGoalsReturns(newEquityReturn, getDebtReturn(appData), getArbitrageReturn(appData));
  updateInvestmentPlanReturns(newEquityReturn, getDebtReturn(appData), getArbitrageReturn(appData), getEpfReturn(appData), getNpsReturn(appData));
  updateReturnsSummary(newEquityReturn, getDebtReturn(appData), getArbitrageReturn(appData), getEpfReturn(appData), getNpsReturn(appData));
}

function handleDebtReturnChange(e) {
  const newDebtReturn = parseFloat(e.target.value);
  document.getElementById('debt-return-value').textContent = `${newDebtReturn}%`;
  setDebtReturn(appData, newDebtReturn);
  updateGoalsReturns(getEquityReturn(appData), newDebtReturn, getArbitrageReturn(appData));
  updateInvestmentPlanReturns(getEquityReturn(appData), newDebtReturn, getArbitrageReturn(appData), getEpfReturn(appData), getNpsReturn(appData));
  updateReturnsSummary(getEquityReturn(appData), newDebtReturn, getArbitrageReturn(appData), getEpfReturn(appData), getNpsReturn(appData));
}

function handleArbitrageReturnChange(e) {
  const newArbitrageReturn = parseFloat(e.target.value);
  document.getElementById('arbitrage-return-value').textContent = `${newArbitrageReturn}%`;
  setArbitrageReturn(appData, newArbitrageReturn);
  updateGoalsReturns(getEquityReturn(appData), getDebtReturn(appData), newArbitrageReturn);
  updateInvestmentPlanReturns(getEquityReturn(appData), getDebtReturn(appData), newArbitrageReturn, getEpfReturn(appData), getNpsReturn(appData));
  updateReturnsSummary(getEquityReturn(appData), getDebtReturn(appData), newArbitrageReturn, getEpfReturn(appData), getNpsReturn(appData));
}

function handleEpfReturnChange(e) {
  const newEpfReturn = parseFloat(e.target.value);
  document.getElementById('epf-return-value').textContent = `${newEpfReturn}%`;
  setEpfReturn(appData, newEpfReturn);
  updateInvestmentPlanReturns(getEquityReturn(appData), getDebtReturn(appData), getArbitrageReturn(appData), newEpfReturn, getNpsReturn(appData));
  updateReturnsSummary(getEquityReturn(appData), getDebtReturn(appData), getArbitrageReturn(appData), newEpfReturn, getNpsReturn(appData));
}

function handleNpsReturnChange(e) {
  const newNpsReturn = parseFloat(e.target.value);
  document.getElementById('nps-return-value').textContent = `${newNpsReturn}%`;
  setNpsReturn(appData, newNpsReturn);
  updateInvestmentPlanReturns(getEquityReturn(appData), getDebtReturn(appData), getArbitrageReturn(appData), getEpfReturn(appData), newNpsReturn);
  updateReturnsSummary(getEquityReturn(appData), getDebtReturn(appData), getArbitrageReturn(appData), getEpfReturn(appData), newNpsReturn);
}

function handleResetReturns() {
  // Default values
  const defaults = {
    fundHouse: 'icici',
    equityReturn: 10,
    debtReturn: 5,
    arbitrageReturn: 6,
    epfReturn: 8,
    npsReturn: 9
  };

  // Reset Fund House
  const fundHouseSelect = document.getElementById('fund-house-plan-select');
  if (fundHouseSelect) fundHouseSelect.value = defaults.fundHouse;
  setFundHouse(appData, defaults.fundHouse);

  // Reset Equity Return
  document.getElementById('equity-return-setting').value = defaults.equityReturn;
  document.getElementById('equity-return-value').textContent = `${defaults.equityReturn}%`;
  setEquityReturn(appData, defaults.equityReturn);

  // Reset Debt Return
  document.getElementById('debt-return-setting').value = defaults.debtReturn;
  document.getElementById('debt-return-value').textContent = `${defaults.debtReturn}%`;
  setDebtReturn(appData, defaults.debtReturn);

  // Reset Arbitrage Return
  document.getElementById('arbitrage-return-setting').value = defaults.arbitrageReturn;
  document.getElementById('arbitrage-return-value').textContent = `${defaults.arbitrageReturn}%`;
  setArbitrageReturn(appData, defaults.arbitrageReturn);

  // Reset EPF Return
  document.getElementById('epf-return-setting').value = defaults.epfReturn;
  document.getElementById('epf-return-value').textContent = `${defaults.epfReturn}%`;
  setEpfReturn(appData, defaults.epfReturn);

  // Reset NPS Return
  document.getElementById('nps-return-setting').value = defaults.npsReturn;
  document.getElementById('nps-return-value').textContent = `${defaults.npsReturn}%`;
  setNpsReturn(appData, defaults.npsReturn);

  // Update modules
  updateGoalsFundHouse(defaults.fundHouse);
  updateGoalsReturns(defaults.equityReturn, defaults.debtReturn, defaults.arbitrageReturn);
  updateInvestmentPlanFundHouse(defaults.fundHouse);
  updateInvestmentPlanReturns(defaults.equityReturn, defaults.debtReturn, defaults.arbitrageReturn, defaults.epfReturn, defaults.npsReturn);
  updateReturnsSummary(defaults.equityReturn, defaults.debtReturn, defaults.arbitrageReturn, defaults.epfReturn, defaults.npsReturn);
}

function updateEpfNpsVisibility() {
  const hasRetirementGoal = appData.goals.some(g => g.goalType === 'retirement');
  const container = document.getElementById('epf-nps-returns-container');
  if (hasRetirementGoal) {
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
  }
}

function updateReturnsSummary(equity, debt, arbitrage, epf, nps) {
  const summary = document.getElementById('returns-summary');
  if (summary) {
    const hasRetirement = appData.goals.some(g => g.goalType === 'retirement');
    let text = `Equity ${equity}% | Debt ${debt}% | Arbitrage ${arbitrage}%`;
    if (hasRetirement && epf !== undefined && nps !== undefined) {
      text += ` | EPF ${epf}% | NPS ${nps}%`;
    }
    summary.textContent = text;
  }
}

function updateAllocationSummary(equityPercent) {
  const summary = document.getElementById('allocation-summary');
  if (summary) {
    summary.textContent = `Equity ${equityPercent}% | Debt ${100 - equityPercent}%`;
  }
}

function refreshAllModules() {
  const currency = getCurrency(appData);
  const fundHouse = getFundHouse(appData);
  refreshCashflow(appData);
  refreshAssets(appData);
  refreshGoals(appData);
  refreshInvestmentPlan(appData);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
