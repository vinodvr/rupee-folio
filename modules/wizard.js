// Persona-Based Onboarding Wizard
// Step-by-step wizard to help new users populate financial data

import { formatCurrency } from './currency.js';
import { generatePersonaData } from './personaData.js';

let wizardCallback = null;
let currentStep = 0;
let answers = {};
let generatedData = null;

/**
 * Convert number to Indian English words
 */
export function numberToWords(num) {
  if (num === 0) return 'Zero';
  if (!num || isNaN(num)) return '';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertLessThanHundred(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }

  function convertLessThanThousand(n) {
    if (n < 100) return convertLessThanHundred(n);
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanHundred(n % 100) : '');
  }

  // Indian numbering: Crore (10^7), Lakh (10^5), Thousand (10^3)
  let result = '';

  if (num >= 10000000) {
    result += convertLessThanThousand(Math.floor(num / 10000000)) + ' Crore ';
    num %= 10000000;
  }

  if (num >= 100000) {
    result += convertLessThanHundred(Math.floor(num / 100000)) + ' Lakh ';
    num %= 100000;
  }

  if (num >= 1000) {
    result += convertLessThanHundred(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }

  if (num > 0) {
    result += convertLessThanThousand(num);
  }

  return result.trim();
}

// Wizard step definitions
const WIZARD_STEPS = [
  {
    id: 'age',
    title: 'How old are you?',
    subtitle: 'This helps us calculate your retirement timeline',
    type: 'dropdown',
    field: 'age',
    options: Array.from({ length: 43 }, (_, i) => ({
      value: 18 + i,
      label: `${18 + i} years`
    })),
    defaultValue: 30
  },
  {
    id: 'family',
    title: 'What\'s your family situation?',
    subtitle: 'This affects expense calculations',
    type: 'cards',
    field: 'family',
    options: [
      { value: 'single', label: 'Single', icon: 'person' },
      { value: 'married', label: 'Married (single income)', icon: 'couple' },
      { value: 'marriedDual', label: 'Married (dual income)', icon: 'couple-work' }
    ],
    defaultValue: 'single'
  },
  {
    id: 'kids',
    title: 'Do you have children?',
    subtitle: 'This helps plan for education expenses',
    type: 'cards',
    field: 'kids',
    options: [
      { value: 'none', label: 'No kids', icon: 'none' },
      { value: '1', label: '1 child', icon: 'one' },
      { value: '2+', label: '2+ children', icon: 'two' }
    ],
    defaultValue: 'none'
  },
  {
    id: 'housing',
    title: 'What\'s your housing situation?',
    subtitle: 'This affects your monthly expenses',
    type: 'cards',
    field: 'housing',
    options: [
      { value: 'renting', label: 'Renting', icon: 'rent' },
      { value: 'rentingToBuy', label: 'Renting (planning to buy)', icon: 'rent-buy' },
      { value: 'ownWithLoan', label: 'Own with home loan', icon: 'home-loan' },
      { value: 'ownNoLoan', label: 'Own (no loan)', icon: 'home' }
    ],
    defaultValue: 'renting'
  },
  {
    id: 'income',
    title: 'What\'s your monthly in-hand income?',
    subtitle: 'Total household income after tax and deductions',
    type: 'slider',
    field: 'monthlyIncome',
    min: 20000,
    max: 2000000,
    step: 10000,
    defaultValue: 100000,
    format: 'currency'
  },
  {
    id: 'otherEmi',
    title: 'Monthly EMIs?',
    subtitle: 'Home loan, car loan, personal loan, credit card, etc.',
    type: 'slider',
    field: 'otherEmi',
    min: 0,
    max: 500000,
    step: 5000,
    defaultValue: 0,
    format: 'currency'
  },
  {
    id: 'epf',
    title: 'What\'s your EPF corpus?',
    subtitle: 'Current balance in Employee Provident Fund',
    type: 'slider',
    field: 'epfCorpus',
    min: 0,
    max: 10000000,
    step: 100000,
    defaultValue: 0,
    format: 'currency'
  },
  {
    id: 'ppf',
    title: 'What\'s your PPF corpus?',
    subtitle: 'Current balance in Public Provident Fund',
    type: 'slider',
    field: 'ppfCorpus',
    min: 0,
    max: 10000000,
    step: 100000,
    defaultValue: 0,
    format: 'currency'
  },
  {
    id: 'nps',
    title: 'What\'s your NPS corpus?',
    subtitle: 'Current balance in National Pension System',
    type: 'slider',
    field: 'npsCorpus',
    min: 0,
    max: 10000000,
    step: 100000,
    defaultValue: 0,
    format: 'currency'
  },
  {
    id: 'savings',
    title: 'What\'s your Savings Account balance?',
    subtitle: 'Total balance across all savings accounts',
    type: 'slider',
    field: 'savingsBank',
    min: 0,
    max: 10000000,
    step: 100000,
    defaultValue: 0,
    format: 'currency'
  },
  {
    id: 'fds',
    title: 'What\'s your FDs & RDs balance?',
    subtitle: 'Total value of Fixed Deposits and Recurring Deposits',
    type: 'slider',
    field: 'fdsRds',
    min: 0,
    max: 10000000,
    step: 100000,
    defaultValue: 0,
    format: 'currency'
  },
  {
    id: 'debtMf',
    title: 'What\'s your Debt Mutual Funds value?',
    subtitle: 'Current value of debt and arbitrage fund investments',
    type: 'slider',
    field: 'debtMf',
    min: 0,
    max: 10000000,
    step: 100000,
    defaultValue: 0,
    format: 'currency'
  },
  {
    id: 'equityMf',
    title: 'What\'s your Equity Mutual Funds value?',
    subtitle: 'Current value of equity/hybrid mutual fund investments',
    type: 'slider',
    field: 'equityMf',
    min: 0,
    max: 50000000,
    step: 100000,
    defaultValue: 0,
    format: 'currency'
  },
  {
    id: 'stocks',
    title: 'What\'s your Direct Stocks value?',
    subtitle: 'Current value of directly held stocks',
    type: 'slider',
    field: 'directStocks',
    min: 0,
    max: 50000000,
    step: 100000,
    defaultValue: 0,
    format: 'currency'
  },
  {
    id: 'gold',
    title: 'What\'s your Physical Gold value?',
    subtitle: 'Current value of gold jewellery and coins',
    type: 'slider',
    field: 'physicalGold',
    min: 0,
    max: 10000000,
    step: 100000,
    defaultValue: 0,
    format: 'currency'
  },
  {
    id: 'review',
    title: 'Your Plan is Almost Ready!',
    subtitle: 'Review your data in each tab to ensure accurate calculations.',
    type: 'review',
    field: null
  }
];

/**
 * Initialize the wizard module
 */
export function initWizard(callback) {
  wizardCallback = callback;
}

/**
 * Open the wizard modal
 */
export function openWizard() {
  currentStep = 0;
  answers = {};
  generatedData = null;

  // Set default values
  WIZARD_STEPS.forEach(step => {
    if (step.field) {
      answers[step.field] = step.defaultValue;
    }
  });

  createWizardModal();
  renderCurrentStep();
}

/**
 * Create the wizard modal HTML
 */
function createWizardModal() {
  // Check if modal already exists
  let modal = document.getElementById('wizard-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'wizard-modal';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col wizard-modal-content">
      <!-- Progress bar -->
      <div class="h-1 bg-gray-200">
        <div id="wizard-progress" class="h-full bg-blue-600 transition-all duration-300" style="width: 0%"></div>
      </div>

      <!-- Header -->
      <div class="p-6 pb-2">
        <div class="flex items-center justify-between mb-2">
          <span id="wizard-step-indicator" class="text-sm text-gray-500">Step 1 of ${WIZARD_STEPS.length}</span>
          <button id="wizard-close-btn" class="text-gray-400 hover:text-gray-600 p-1">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <h2 id="wizard-title" class="text-2xl font-bold text-gray-800"></h2>
        <p id="wizard-subtitle" class="text-gray-500 mt-1"></p>
      </div>

      <!-- Content area -->
      <div id="wizard-content" class="flex-1 overflow-y-auto px-6 py-4"></div>

      <!-- Footer with navigation -->
      <div class="p-6 pt-4 border-t bg-gray-50 flex justify-between">
        <button id="wizard-back-btn" class="px-5 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors">
          Back
        </button>
        <button id="wizard-next-btn" class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          Next
        </button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  // Event listeners
  document.getElementById('wizard-close-btn').addEventListener('click', closeWizard);
  document.getElementById('wizard-back-btn').addEventListener('click', goBack);
  document.getElementById('wizard-next-btn').addEventListener('click', goNext);
}

/**
 * Render the current step
 */
function renderCurrentStep() {
  const step = WIZARD_STEPS[currentStep];
  const visibleSteps = getVisibleSteps();
  const visibleIndex = visibleSteps.findIndex(s => s.id === step.id);
  const totalVisible = visibleSteps.length;

  // Update progress
  const progress = ((visibleIndex + 1) / totalVisible) * 100;
  document.getElementById('wizard-progress').style.width = `${progress}%`;

  // Update header
  document.getElementById('wizard-step-indicator').textContent = `Step ${visibleIndex + 1} of ${totalVisible}`;
  document.getElementById('wizard-title').textContent = step.title;
  document.getElementById('wizard-subtitle').textContent = step.subtitle;

  // Update back button visibility
  const hasPrevStep = findPrevVisibleStep(currentStep) >= 0;
  document.getElementById('wizard-back-btn').style.visibility = hasPrevStep ? 'visible' : 'hidden';

  // Update next button text
  const nextBtn = document.getElementById('wizard-next-btn');
  if (step.type === 'review') {
    nextBtn.textContent = 'Continue';
  } else {
    nextBtn.textContent = 'Next';
  }

  // Render content based on type
  const content = document.getElementById('wizard-content');

  switch (step.type) {
    case 'dropdown':
      content.innerHTML = renderDropdown(step);
      break;
    case 'cards':
      content.innerHTML = renderCards(step);
      break;
    case 'slider':
      content.innerHTML = renderSlider(step);
      break;
    case 'review':
      content.innerHTML = renderReviewStep();
      break;
  }

  setupStepEventListeners(step);
}

/**
 * Render dropdown step
 */
function renderDropdown(step) {
  const currentValue = answers[step.field];

  return `
    <div class="flex justify-center py-8">
      <select id="wizard-input" class="text-2xl font-semibold px-6 py-4 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none cursor-pointer">
        ${step.options.map(opt => `
          <option value="${opt.value}" ${opt.value === currentValue ? 'selected' : ''}>
            ${opt.label}
          </option>
        `).join('')}
      </select>
    </div>
  `;
}

/**
 * Render card selection step
 */
function renderCards(step) {
  const currentValue = answers[step.field];

  const icons = {
    person: '<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>',
    couple: '<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>',
    'couple-work': '<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
    none: '<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>',
    one: '<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    two: '<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>',
    rent: '<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>',
    'rent-buy': '<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/></svg>',
    'home-loan': '<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>',
    home: '<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>'
  };

  return `
    <div class="grid grid-cols-1 gap-3 py-4">
      ${step.options.map(opt => `
        <button
          class="wizard-card flex items-center gap-4 p-4 border-2 rounded-xl text-left transition-all ${
            opt.value === currentValue
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }"
          data-value="${opt.value}"
        >
          <div class="text-${opt.value === currentValue ? 'blue-600' : 'gray-400'}">
            ${icons[opt.icon] || icons.person}
          </div>
          <span class="text-lg font-medium ${opt.value === currentValue ? 'text-blue-700' : 'text-gray-700'}">${opt.label}</span>
        </button>
      `).join('')}
    </div>
  `;
}

/**
 * Render slider step
 */
function renderSlider(step) {
  const currentValue = answers[step.field];
  const wordsText = currentValue > 0 ? numberToWords(currentValue) : '';

  return `
    <div class="py-8">
      <div class="text-center mb-8">
        <div class="flex items-center justify-center gap-2">
          <span class="text-2xl text-gray-400">₹</span>
          <input
            type="text"
            id="wizard-text-input"
            value="${currentValue.toLocaleString('en-IN')}"
            class="text-4xl font-bold text-blue-600 bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none text-center w-64"
            inputmode="numeric"
          >
        </div>
        <p id="wizard-words" class="text-sm text-gray-500 mt-2 h-6">${wordsText}</p>
      </div>
      <div class="px-4">
        <input
          type="range"
          id="wizard-input"
          min="${step.min}"
          max="${step.max}"
          step="${step.step}"
          value="${currentValue}"
          class="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer wizard-slider"
        >
        <div class="flex justify-between text-sm text-gray-500 mt-2">
          <span>${step.format === 'currency' ? formatCurrency(step.min, 'INR') : step.min.toLocaleString('en-IN')}</span>
          <span>${step.format === 'currency' ? formatCurrency(step.max, 'INR') : step.max.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render review step (final step before finishing wizard)
 */
function renderReviewStep() {
  return `
    <div>
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-sm text-amber-800">
        <strong>Your data is pre-filled with estimates.</strong> Edit each tab to match your actual finances — your projections are only as accurate as your inputs.
      </div>

      <div class="text-left space-y-3">
        <div class="flex gap-3 p-4 bg-gray-50 rounded-lg">
          <div class="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <h4 class="font-medium text-gray-800">Cash Flow</h4>
            <p class="text-sm text-gray-600 mt-1">Review your income, EPF/NPS deductions, and expenses</p>
          </div>
        </div>

        <div class="flex gap-3 p-4 bg-gray-50 rounded-lg">
          <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <div>
            <h4 class="font-medium text-gray-800">Assets</h4>
            <p class="text-sm text-gray-600 mt-1">Add any savings, FDs, equity, real estate, or other assets and liabilities (home loan, car loan)</p>
          </div>
        </div>

        <div class="flex gap-3 p-4 bg-gray-50 rounded-lg">
          <div class="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <div>
            <h4 class="font-medium text-gray-800">Goals</h4>
            <p class="text-sm text-gray-600 mt-1">Review goals — adjust amounts, dates, or add new ones</p>
          </div>
        </div>

        <div class="flex gap-3 p-4 bg-gray-50 rounded-lg">
          <div class="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/>
            </svg>
          </div>
          <div>
            <h4 class="font-medium text-gray-800">Plan</h4>
            <p class="text-sm text-gray-600 mt-1">Link existing investments to goals to reduce monthly SIP</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Setup event listeners for current step
 */
function setupStepEventListeners(step) {
  switch (step.type) {
    case 'dropdown':
      document.getElementById('wizard-input').addEventListener('change', (e) => {
        answers[step.field] = parseInt(e.target.value);
      });
      break;

    case 'cards':
      document.querySelectorAll('.wizard-card').forEach(card => {
        card.addEventListener('click', () => {
          answers[step.field] = card.dataset.value;
          renderCurrentStep(); // Re-render to show selection
        });
      });
      break;

    case 'slider':
      const slider = document.getElementById('wizard-input');
      const textInput = document.getElementById('wizard-text-input');
      const wordsDisplay = document.getElementById('wizard-words');

      // Slider changes update text input and words
      slider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        answers[step.field] = value;
        textInput.value = value.toLocaleString('en-IN');
        wordsDisplay.textContent = value > 0 ? numberToWords(value) : '';
      });

      // Text input changes update slider and words
      textInput.addEventListener('input', (e) => {
        // Remove non-numeric characters and parse
        const rawValue = e.target.value.replace(/[^0-9]/g, '');
        const value = parseInt(rawValue) || 0;
        answers[step.field] = value;

        // Update slider (clamp to slider range for visual)
        const clampedValue = Math.min(Math.max(value, step.min), step.max);
        slider.value = clampedValue;

        // Update words display
        wordsDisplay.textContent = value > 0 ? numberToWords(value) : '';
      });

      // Format on blur
      textInput.addEventListener('blur', (e) => {
        const rawValue = e.target.value.replace(/[^0-9]/g, '');
        const value = parseInt(rawValue) || 0;
        answers[step.field] = value;
        e.target.value = value.toLocaleString('en-IN');
      });

      // Select all on focus
      textInput.addEventListener('focus', (e) => {
        e.target.select();
      });
      break;
  }
}

/**
 * Check if a step should be shown based on showIf condition
 */
function isStepVisible(step) {
  if (!step.showIf) return true;
  return step.showIf(answers);
}

/**
 * Get all currently visible steps
 */
function getVisibleSteps() {
  return WIZARD_STEPS.filter(step => isStepVisible(step));
}

/**
 * Find the next visible step index
 */
function findNextVisibleStep(fromIndex) {
  for (let i = fromIndex + 1; i < WIZARD_STEPS.length; i++) {
    if (isStepVisible(WIZARD_STEPS[i])) {
      return i;
    }
  }
  return -1; // No more visible steps
}

/**
 * Find the previous visible step index
 */
function findPrevVisibleStep(fromIndex) {
  for (let i = fromIndex - 1; i >= 0; i--) {
    if (isStepVisible(WIZARD_STEPS[i])) {
      return i;
    }
  }
  return -1; // No previous visible steps
}

/**
 * Go to previous step
 */
function goBack() {
  const prevStep = findPrevVisibleStep(currentStep);
  if (prevStep >= 0) {
    currentStep = prevStep;
    renderCurrentStep();
  }
}

/**
 * Go to next step or finish
 */
function goNext() {
  const currentStepDef = WIZARD_STEPS[currentStep];

  // If we're on the review step, finish the wizard
  if (currentStepDef.type === 'review') {
    finishWizard();
    return;
  }

  const nextStep = findNextVisibleStep(currentStep);
  if (nextStep >= 0) {
    const nextStepDef = WIZARD_STEPS[nextStep];

    // Generate data right before showing review step
    if (nextStepDef.type === 'review') {
      generatedData = generatePersonaData(answers);
    }

    currentStep = nextStep;
    renderCurrentStep();
  } else {
    finishWizard();
  }
}

/**
 * Close the wizard
 */
function closeWizard() {
  const modal = document.getElementById('wizard-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * Finish the wizard and pass generated data to callback
 */
function finishWizard() {
  // Use pre-generated data if available (from review step), otherwise generate now
  const dataToUse = generatedData || generatePersonaData(answers);

  if (wizardCallback) {
    wizardCallback(dataToUse);
  }

  closeWizard();
}

/**
 * Check if app data is empty (for showing Quick Setup button)
 */
export function isDataEmpty(appData) {
  const hasIncome = appData.cashflow?.income?.length > 0;
  const hasExpenses = appData.cashflow?.expenses?.length > 0;
  const hasAssets = appData.assets?.items?.length > 0;
  const hasGoals = appData.goals?.length > 0;

  return !hasIncome && !hasExpenses && !hasAssets && !hasGoals;
}

/**
 * Create Quick Setup button HTML
 */
export function getQuickSetupButtonHTML() {
  return `
    <button id="quick-setup-btn" class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
      Quick Setup
    </button>
  `;
}
