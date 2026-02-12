// Main application initialization and event coordination
import { loadData, saveData, clearData, setCurrency, getCurrency, getFundHouse, setFundHouse, getEquityAllocation, setEquityAllocation, getEquityReturn, setEquityReturn, getDebtReturn, setDebtReturn, getArbitrageReturn, setArbitrageReturn, getEpfReturn, setEpfReturn, getNpsReturn, setNpsReturn, getEpfStepUp, setEpfStepUp, getNpsStepUp, setNpsStepUp, getInvestmentStepUp, setInvestmentStepUp } from './modules/storage.js';
import { initCashflow, updateCurrency as updateCashflowCurrency, refreshData as refreshCashflow } from './modules/cashflow.js';
import { initAssets, updateCurrency as updateAssetsCurrency, refreshData as refreshAssets } from './modules/assets.js';
import { initGoals, updateCurrency as updateGoalsCurrency, updateFundHouse as updateGoalsFundHouse, updateReturns as updateGoalsReturns, refreshData as refreshGoals } from './modules/goals.js';
import { initInvestmentPlan, updateCurrency as updateInvestmentPlanCurrency, updateFundHouse as updateInvestmentPlanFundHouse, updateAllocation as updateInvestmentPlanAllocation, updateReturns as updateInvestmentPlanReturns, updateStepUp as updateInvestmentPlanStepUp, refreshData as refreshInvestmentPlan } from './modules/investmentplan.js';
import { autoAssignAssets } from './modules/autoassign.js';
import { initWizard, openWizard, isDataEmpty } from './modules/wizard.js';

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
        { id: 'asset-epf-1', name: 'EPF - Self', category: 'EPF Corpus', value: 1500000 },
        { id: 'asset-epf-2', name: 'EPF - Spouse', category: 'EPF Corpus', value: 800000 },
        { id: 'asset-nps-1', name: 'NPS - Self', category: 'NPS Corpus', value: 500000 },
        { id: 'asset-gold-1', name: 'Jewellery', category: 'Physical Gold', value: 500000 },
        { id: 'asset-mf-1', name: 'Equity MFs', category: 'Equity Mutual Funds', value: 1500000 },
        { id: 'asset-mf-2', name: 'Debt MFs', category: 'Debt/Arbitrage Mutual Funds', value: 500000 }
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
        includeEpfNps: true,
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

// Tab order for navigation
const TAB_ORDER = ['home', 'cashflow', 'assets', 'goals', 'investmentplan'];
const TAB_LABELS = {
  home: 'Home',
  cashflow: 'Cash Flow',
  assets: 'Assets',
  goals: 'Goals',
  investmentplan: 'Plan'
};

// Helper: Set up a collapsible section
function setupCollapsible(toggleId, contentId, chevronId, summaryId) {
  const toggleBtn = document.getElementById(toggleId);
  const content = document.getElementById(contentId);
  const chevron = document.getElementById(chevronId);
  const summary = document.getElementById(summaryId);

  toggleBtn.addEventListener('click', () => {
    const isHidden = content.classList.toggle('hidden');
    chevron.style.transform = isHidden ? '' : 'rotate(180deg)';
    if (summary) summary.classList.toggle('hidden', !isHidden);
  });
}

// Helper: Initialize a slider with value display
function initSlider(sliderId, valueId, initialValue, handler, formatter = v => `${v}%`) {
  const slider = document.getElementById(sliderId);
  const valueEl = document.getElementById(valueId);
  slider.value = initialValue;
  valueEl.textContent = formatter(initialValue);
  slider.addEventListener('input', handler);
}

// Helper: Reset a slider to default value
function resetSlider(sliderId, valueId, value, setter, formatter = v => `${v}%`) {
  document.getElementById(sliderId).value = value;
  document.getElementById(valueId).textContent = formatter(value);
  setter(appData, value);
}

// Home tab setup
let switchToTabFn = null;

function setupHomeTab(switchToTab) {
  switchToTabFn = switchToTab;

  // Wire Quick Setup button - opens wizard
  document.getElementById('quick-setup-btn')?.addEventListener('click', () => {
    openWizard();
  });

  // Wire Enter My Data button - go directly to Cash Flow
  document.getElementById('enter-data-btn')?.addEventListener('click', () => {
    switchToTab('cashflow');
    history.replaceState(null, '', '#cashflow');
  });

  // Wire Continue Planning button
  document.getElementById('continue-planning-btn')?.addEventListener('click', () => {
    switchToTab('cashflow');
    history.replaceState(null, '', '#cashflow');
  });

  // Wire Clear Data button
  document.getElementById('clear-data-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      clearData();
      window.location.reload();
    }
  });
}

function updateHomeTabCTA() {
  const emptyState = document.getElementById('home-empty-state');
  const hasDataState = document.getElementById('home-has-data-state');

  if (!emptyState || !hasDataState) return;

  if (isDataEmpty(appData)) {
    // No data - show wizard CTA
    emptyState.classList.remove('hidden');
    hasDataState.classList.add('hidden');
  } else {
    // User has data - show continue message
    emptyState.classList.add('hidden');
    hasDataState.classList.remove('hidden');
  }
}

function setupTabNavigation() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  function getCurrentTabIndex() {
    const activeTab = document.querySelector('.tab-btn.active');
    if (!activeTab) return 0;
    const tabName = activeTab.id.replace('tab-', '');
    return TAB_ORDER.indexOf(tabName);
  }

  function updateBottomNav() {
    const currentIndex = getCurrentTabIndex();
    const bottomNav = document.getElementById('bottom-nav');
    const prevBtn = document.getElementById('nav-prev-btn');
    const nextBtn = document.getElementById('nav-next-btn');
    const prevLabel = document.getElementById('nav-prev-label');
    const nextLabel = document.getElementById('nav-next-label');
    const stepIndicator = document.getElementById('nav-step-indicator');

    // Hide bottom nav on Home tab
    if (currentIndex === 0) {
      bottomNav.classList.add('hidden');
      return;
    }
    bottomNav.classList.remove('hidden');

    // Update step indicator (exclude Home tab from count)
    stepIndicator.textContent = `Step ${currentIndex} of ${TAB_ORDER.length - 1}`;

    // Update previous button
    if (currentIndex === 1) {
      // On Cash Flow (first real step), hide prev button
      prevBtn.disabled = true;
      prevBtn.classList.add('opacity-0', 'pointer-events-none');
      prevLabel.textContent = 'Previous';
    } else {
      prevBtn.disabled = false;
      prevBtn.classList.remove('opacity-0', 'pointer-events-none');
      prevLabel.textContent = TAB_LABELS[TAB_ORDER[currentIndex - 1]];
    }

    // Update next button
    if (currentIndex === TAB_ORDER.length - 1) {
      nextBtn.disabled = true;
      nextBtn.classList.add('opacity-0', 'pointer-events-none');
      nextLabel.textContent = 'Next';
    } else {
      nextBtn.disabled = false;
      nextBtn.classList.remove('opacity-0', 'pointer-events-none');
      nextLabel.textContent = TAB_LABELS[TAB_ORDER[currentIndex + 1]];
    }
  }

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

    // Update bottom navigation
    updateBottomNav();

    // Scroll to top of page
    window.scrollTo(0, 0);
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.id.replace('tab-', '');

      // Update URL hash without scrolling
      history.replaceState(null, '', `#${tabName}`);

      switchToTab(tabName);
    });
  });

  // Bottom navigation event listeners
  document.getElementById('nav-prev-btn').addEventListener('click', () => {
    const currentIndex = getCurrentTabIndex();
    if (currentIndex > 0) {
      const prevTab = TAB_ORDER[currentIndex - 1];
      history.replaceState(null, '', `#${prevTab}`);
      switchToTab(prevTab);
    }
  });

  document.getElementById('nav-next-btn').addEventListener('click', () => {
    const currentIndex = getCurrentTabIndex();
    if (currentIndex < TAB_ORDER.length - 1) {
      const nextTab = TAB_ORDER[currentIndex + 1];
      history.replaceState(null, '', `#${nextTab}`);
      switchToTab(nextTab);
    }
  });

  // On page load, check for hash in URL
  const hash = window.location.hash.slice(1);
  if (hash && document.getElementById(`tab-${hash}`)) {
    switchToTab(hash);
  } else {
    // Initialize bottom nav for default tab
    updateBottomNav();
  }

  // Handle browser back/forward
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1);
    if (hash && document.getElementById(`tab-${hash}`)) {
      switchToTab(hash);
    }
  });

  // Return switchToTab for external use
  return { switchToTab };
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

  // Run auto-assign before any module renders (ensures fresh FV-aware allocations)
  autoAssignAssets(appData);

  const currency = getCurrency(appData);
  const fundHouse = getFundHouse(appData);
  const equityAllocation = getEquityAllocation(appData);
  const equityReturn = getEquityReturn(appData);
  const debtReturn = getDebtReturn(appData);
  const arbitrageReturn = getArbitrageReturn(appData);
  const epfReturn = getEpfReturn(appData);
  const npsReturn = getNpsReturn(appData);
  const epfStepUp = getEpfStepUp(appData);
  const npsStepUp = getNpsStepUp(appData);
  const investmentStepUp = getInvestmentStepUp(appData);

  // Set up tab navigation
  const { switchToTab } = setupTabNavigation();

  // Logo click navigates to Home tab
  document.getElementById('logo-btn')?.addEventListener('click', () => {
    history.replaceState(null, '', '#home');
    switchToTab('home');
  });

  // Set up Home tab CTA buttons
  setupHomeTab(switchToTab);

  // Set up currency selector
  const currencySelect = document.getElementById('currency-select');
  currencySelect.value = currency;
  currencySelect.addEventListener('change', handleCurrencyChange);

  // Set up equity allocation slider (special case: updates debt display too)
  initSlider('equity-allocation-setting', 'equity-allocation-value', equityAllocation, handleEquityAllocationChange);
  document.getElementById('debt-allocation-value').textContent = `${100 - equityAllocation}%`;
  updateRiskProfileLabel(equityAllocation);
  updateTaperingDisplay(equityAllocation);

  // Set up return rate sliders
  initSlider('equity-return-setting', 'equity-return-value', equityReturn, handleEquityReturnChange);
  initSlider('debt-return-setting', 'debt-return-value', debtReturn, handleDebtReturnChange);
  initSlider('arbitrage-return-setting', 'arbitrage-return-value', arbitrageReturn, handleArbitrageReturnChange);
  initSlider('epf-return-setting', 'epf-return-value', epfReturn, handleEpfReturnChange);
  initSlider('nps-return-setting', 'nps-return-value', npsReturn, handleNpsReturnChange);

  // Set up step-up sliders
  initSlider('epf-stepup-setting', 'epf-stepup-value', epfStepUp, handleEpfStepUpChange);
  initSlider('nps-stepup-setting', 'nps-stepup-value', npsStepUp, handleNpsStepUpChange);
  initSlider('investment-stepup-setting', 'investment-stepup-value', investmentStepUp, handleInvestmentStepUpChange);

  // Set up reset button
  document.getElementById('reset-returns-btn').addEventListener('click', handleResetReturns);

  // Set up collapsible sections
  setupCollapsible('toggle-allocation-btn', 'allocation-content', 'allocation-chevron', 'allocation-summary');
  setupCollapsible('toggle-returns-btn', 'returns-content', 'returns-chevron', 'returns-summary');
  setupCollapsible('toggle-existing-btn', 'existing-content', 'existing-chevron');

  // Initialize summaries
  updateAllocationSummary(equityAllocation);
  updateReturnsSummary(equityReturn, investmentStepUp);
  updateSettingsProfileLabel();

  // Initialize all modules
  const onDataChange = () => {
    refreshAllModules();
    updateEpfNpsVisibility();
  };

  // Initialize wizard with callback to merge generated data
  initWizard((generatedData) => {
    // Merge generated data with existing app data
    appData.cashflow.income = generatedData.cashflow.income;
    appData.cashflow.expenses = generatedData.cashflow.expenses;
    appData.assets.items = generatedData.assets.items;
    appData.liabilities.items = generatedData.liabilities.items;
    appData.goals = generatedData.goals;

    // Save and refresh
    saveData(appData);
    refreshAllModules();
    updateEpfNpsVisibility();
    updateHomeTabCTA();

    // Navigate to Cash Flow tab after wizard completes
    if (switchToTabFn) {
      switchToTabFn('cashflow');
      history.replaceState(null, '', '#cashflow');
    }
  });

  initCashflow(appData, currency, onDataChange);
  initAssets(appData, currency, onDataChange);
  initGoals(appData, currency, fundHouse, equityReturn, debtReturn, arbitrageReturn, onDataChange);
  initInvestmentPlan(appData, currency, fundHouse, equityAllocation, equityReturn, debtReturn, arbitrageReturn, epfReturn, npsReturn, epfStepUp, npsStepUp, investmentStepUp, onDataChange);

  // Show/hide EPF/NPS returns based on retirement goals
  updateEpfNpsVisibility();

  // Update Home tab CTA based on data state
  updateHomeTabCTA();

  // Listen for storage changes from other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'financial-planner-data') {
      appData = loadData();
      refreshAllModules();
      updateHomeTabCTA();
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
  updateTaperingDisplay(newEquityAllocation);
  setEquityAllocation(appData, newEquityAllocation);
  updateInvestmentPlanAllocation(newEquityAllocation);
}

function updateTaperingDisplay(equityPercent) {
  const taperInitial = document.getElementById('tapering-initial');
  const taperMidHigh = document.getElementById('tapering-mid-high');
  const taperMidLow = document.getElementById('tapering-mid-low');
  if (taperInitial) {
    const debtInitial = 100 - equityPercent;
    taperInitial.textContent = `${equityPercent}% equity (${debtInitial}% debt)`;
  }
  if (taperMidHigh) {
    const equityMidHigh = Math.floor(Math.min(equityPercent / 2, 40));
    const debtMidHigh = 100 - equityMidHigh;
    taperMidHigh.textContent = `${equityMidHigh}% equity (${debtMidHigh}% debt)`;
  }
  if (taperMidLow) {
    const equityMidLow = Math.floor(Math.min(equityPercent / 4, 20));
    const debtMidLow = 100 - equityMidLow;
    taperMidLow.textContent = `${equityMidLow}% equity (${debtMidLow}% debt)`;
  }
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

// Unified handler for return rate changes
function handleReturnChange(valueId, setter, updateGoals = true) {
  return (e) => {
    const newValue = parseFloat(e.target.value);
    document.getElementById(valueId).textContent = `${newValue}%`;
    setter(appData, newValue);

    const returns = {
      equity: getEquityReturn(appData),
      debt: getDebtReturn(appData),
      arbitrage: getArbitrageReturn(appData),
      epf: getEpfReturn(appData),
      nps: getNpsReturn(appData)
    };

    if (updateGoals) {
      updateGoalsReturns(returns.equity, returns.debt, returns.arbitrage);
    }
    updateInvestmentPlanReturns(returns.equity, returns.debt, returns.arbitrage, returns.epf, returns.nps);
    updateReturnsSummary(returns.equity, getInvestmentStepUp(appData));
    updateSettingsProfileLabel();
  };
}

const handleEquityReturnChange = handleReturnChange('equity-return-value', setEquityReturn);
const handleDebtReturnChange = handleReturnChange('debt-return-value', setDebtReturn);
const handleArbitrageReturnChange = handleReturnChange('arbitrage-return-value', setArbitrageReturn);
const handleEpfReturnChange = handleReturnChange('epf-return-value', setEpfReturn, false);
const handleNpsReturnChange = handleReturnChange('nps-return-value', setNpsReturn, false);

// Unified handler for step-up changes
function handleStepUpChange(valueId, setter) {
  return (e) => {
    const newValue = parseInt(e.target.value);
    document.getElementById(valueId).textContent = `${newValue}%`;
    setter(appData, newValue);

    const epfStep = getEpfStepUp(appData);
    const npsStep = getNpsStepUp(appData);
    const investment = getInvestmentStepUp(appData);
    updateReturnsSummary(getEquityReturn(appData), investment);
    updateSettingsProfileLabel();
    updateInvestmentPlanStepUp(epfStep, npsStep, investment);
  };
}

const handleEpfStepUpChange = handleStepUpChange('epf-stepup-value', setEpfStepUp);
const handleNpsStepUpChange = handleStepUpChange('nps-stepup-value', setNpsStepUp);
const handleInvestmentStepUpChange = handleStepUpChange('investment-stepup-value', setInvestmentStepUp);


function updateSettingsProfileLabel() {
  const label = document.getElementById('stepup-profile-label');
  if (!label) return;

  // Check if any slider is at its top 2 values
  // EPF and NPS excluded - ranges already conservative (5-8% and 7-10%)
  const sliderChecks = [
    { id: 'equity-return-setting', max: 13, getter: getEquityReturn },
    { id: 'debt-return-setting', max: 7, getter: getDebtReturn },
    { id: 'arbitrage-return-setting', max: 8, getter: getArbitrageReturn },
    { id: 'epf-stepup-setting', max: 10, getter: getEpfStepUp },
    { id: 'nps-stepup-setting', max: 10, getter: getNpsStepUp },
    { id: 'investment-stepup-setting', max: 10, getter: getInvestmentStepUp }
  ];

  const isAggressive = sliderChecks.some(config => {
    const slider = document.getElementById(config.id);
    const value = slider ? Number(slider.value) : config.getter(appData);
    const threshold = config.max - 1; // top 2 values
    return value >= threshold;
  });

  label.textContent = isAggressive ? 'Aggressive' : 'Reasonable';
  label.className = isAggressive
    ? 'text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700'
    : 'text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700';
}

function handleResetReturns() {
  // Default values
  const defaults = {
    fundHouse: 'icici',
    equityReturn: 10,
    debtReturn: 5,
    arbitrageReturn: 6,
    epfReturn: 8,
    npsReturn: 9,
    epfStepUp: 5,
    npsStepUp: 0,
    investmentStepUp: 5
  };

  // Reset Fund House
  const fundHouseSelect = document.getElementById('fund-house-plan-select');
  if (fundHouseSelect) fundHouseSelect.value = defaults.fundHouse;
  setFundHouse(appData, defaults.fundHouse);

  // Reset all sliders using helper
  resetSlider('equity-return-setting', 'equity-return-value', defaults.equityReturn, setEquityReturn);
  resetSlider('debt-return-setting', 'debt-return-value', defaults.debtReturn, setDebtReturn);
  resetSlider('arbitrage-return-setting', 'arbitrage-return-value', defaults.arbitrageReturn, setArbitrageReturn);
  resetSlider('epf-return-setting', 'epf-return-value', defaults.epfReturn, setEpfReturn);
  resetSlider('nps-return-setting', 'nps-return-value', defaults.npsReturn, setNpsReturn);
  resetSlider('epf-stepup-setting', 'epf-stepup-value', defaults.epfStepUp, setEpfStepUp);
  resetSlider('nps-stepup-setting', 'nps-stepup-value', defaults.npsStepUp, setNpsStepUp);
  resetSlider('investment-stepup-setting', 'investment-stepup-value', defaults.investmentStepUp, setInvestmentStepUp);

  // Update modules
  updateGoalsFundHouse(defaults.fundHouse);
  updateGoalsReturns(defaults.equityReturn, defaults.debtReturn, defaults.arbitrageReturn);
  updateInvestmentPlanFundHouse(defaults.fundHouse);
  updateInvestmentPlanReturns(defaults.equityReturn, defaults.debtReturn, defaults.arbitrageReturn, defaults.epfReturn, defaults.npsReturn);
  updateInvestmentPlanStepUp(defaults.epfStepUp, defaults.npsStepUp, defaults.investmentStepUp);

  // Update summaries
  updateReturnsSummary(defaults.equityReturn, defaults.investmentStepUp);
  updateSettingsProfileLabel();
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

function updateReturnsSummary(equityReturn, investmentStepUp) {
  const summary = document.getElementById('returns-summary');
  if (summary) {
    const textSpan = summary.querySelector('span');
    if (textSpan) textSpan.textContent = `Equity ${equityReturn}% | SIP Step-up ${investmentStepUp}%`;
  }
}

function updateAllocationSummary(equityPercent) {
  const summary = document.getElementById('allocation-summary');
  if (summary) {
    const textSpan = summary.querySelector('span');
    if (textSpan) textSpan.textContent = `Equity ${equityPercent}% | Debt ${100 - equityPercent}%`;
  }
}

function refreshAllModules() {
  const currency = getCurrency(appData);
  const fundHouse = getFundHouse(appData);
  refreshCashflow(appData);
  refreshAssets(appData);
  refreshGoals(appData);
  autoAssignAssets(appData);
  refreshInvestmentPlan(appData);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
