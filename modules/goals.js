// Goals CRUD and UI with investment calculations
import { addGoal, updateGoal, deleteGoal, saveData } from './storage.js';
import {
  formatCurrency,
  getSymbol,
  getRecommendations,
  getFunds,
  getEquityLimits,
  getDebtLimits,
  constrainEquityReturn,
  constrainDebtReturn
} from './currency.js';
import {
  calculateGoalProjections,
  getYearsRemaining,
  getCategoryDisplay,
  getMaxEquity,
  constrainEquityAllocation,
  wasShortTermAtStart,
  calculateRetirementProjectionsWithEpfNps
} from './calculator.js';
import { showAddInvestmentModal, showInvestmentHistory } from './investments.js';
import { getRetirementContributions } from './cashflow.js';

let appData = null;
let currency = 'INR';
let fundHouse = 'icici';
let onDataChange = null;

function formatTimeline(years) {
  const totalMonths = Math.round(years * 12);
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;

  if (y === 0) return `${m} month${m !== 1 ? 's' : ''}`;
  if (m === 0) return `${y} year${y !== 1 ? 's' : ''}`;
  return `${y}y ${m}m`;
}

function generateYearlyProjections(goal, projections) {
  const years = Math.round(projections.years);
  if (years <= 0) return [];

  const stepUpRate = (goal.annualStepUp || 0) / 100;
  const startingSIP = projections.monthlySIP;
  const isRetirement = goal.goalType === 'retirement';

  let currentCorpus = projections.totalInvested;
  let currentSIP = startingSIP;
  const yearlyData = [];

  // EPF/NPS tracking for retirement goals
  const hasEpfNps = isRetirement && projections.epfNps;
  let epfNpsCorpus = hasEpfNps ? projections.epfNps.totalCorpus : 0;
  let currentMonthlyEpf = hasEpfNps ? projections.epfNps.monthlyEpf : 0;
  let currentMonthlyNps = hasEpfNps ? projections.epfNps.monthlyNps : 0;
  const epfNpsStepUpEnabled = hasEpfNps && projections.epfNps.stepUpEnabled;
  const epfMonthlyRate = 8 / 100 / 12;  // EPF at 8%
  const npsMonthlyRate = 10 / 100 / 12; // NPS at 10%

  // Split initial corpus for separate tracking
  let epfCorpus = hasEpfNps ? projections.epfNps.epfCorpus : 0;
  let npsCorpus = hasEpfNps ? projections.epfNps.npsCorpus : 0;

  // Calculate max equity for each year based on years remaining and goal type
  function getMaxEquityForYear(yearsRemaining) {
    if (isRetirement) {
      // Retirement goals: gradual reduction to 30% minimum
      if (yearsRemaining >= 10) return 70;
      if (yearsRemaining >= 8) return 60;
      if (yearsRemaining >= 6) return 50;
      if (yearsRemaining >= 4) return 40;
      if (yearsRemaining >= 2) return 35;
      return 30;
    } else {
      // One-time goals: start earlier, slower taper to 0%
      if (yearsRemaining >= 10) return 70;
      if (yearsRemaining >= 8) return 60;
      if (yearsRemaining >= 6) return 50;
      if (yearsRemaining >= 4) return 30;
      if (yearsRemaining >= 3) return 15;
      return 0;
    }
  }

  for (let year = 1; year <= years; year++) {
    const yearsRemaining = years - year;

    // Get the expected return for THIS year based on current allocation
    const maxEquity = getMaxEquityForYear(years - year + 1); // Current year's max equity
    const recommendedEquity = Math.min(goal.equityPercent, maxEquity);
    const recommendedDebt = 100 - recommendedEquity;
    const expectedReturn = (recommendedEquity / 100 * goal.equityReturn) + (recommendedDebt / 100 * goal.debtReturn);
    const monthlyRate = expectedReturn / 100 / 12;

    // Compound existing corpus for 12 months using THIS year's return rate
    for (let month = 0; month < 12; month++) {
      currentCorpus = currentCorpus * (1 + monthlyRate) + currentSIP;

      // Compound EPF/NPS separately
      if (hasEpfNps) {
        epfCorpus = epfCorpus * (1 + epfMonthlyRate) + currentMonthlyEpf;
        npsCorpus = npsCorpus * (1 + npsMonthlyRate) + currentMonthlyNps;
      }
    }

    // Get max equity for END of year (years remaining after this year)
    const endOfYearMaxEquity = getMaxEquityForYear(yearsRemaining);
    const endOfYearRecommendedEquity = Math.min(goal.equityPercent, endOfYearMaxEquity);
    const endOfYearExpectedReturn = (endOfYearRecommendedEquity / 100 * goal.equityReturn) + ((100 - endOfYearRecommendedEquity) / 100 * goal.debtReturn);

    const rowData = {
      year,
      yearsRemaining,
      corpus: Math.round(currentCorpus),
      sip: Math.round(currentSIP),
      maxEquity: endOfYearMaxEquity,
      recommendedEquity: endOfYearRecommendedEquity,
      expectedReturn: endOfYearExpectedReturn
    };

    // Add EPF/NPS corpus for retirement goals
    if (hasEpfNps) {
      rowData.epfNpsCorpus = Math.round(epfCorpus + npsCorpus);
      rowData.totalCorpus = Math.round(currentCorpus + epfCorpus + npsCorpus);
    }

    yearlyData.push(rowData);

    // Step up SIP for next year
    currentSIP *= (1 + stepUpRate);

    // Step up EPF/NPS for next year if enabled
    if (epfNpsStepUpEnabled) {
      currentMonthlyEpf *= (1 + stepUpRate);
      currentMonthlyNps *= (1 + stepUpRate);
    }
  }

  return yearlyData;
}

function renderProjectionsTable(goal, projections) {
  const yearlyData = generateYearlyProjections(goal, projections);

  if (yearlyData.length === 0) {
    return '<p class="text-sm text-gray-500 italic">Goal timeline too short for projections</p>';
  }

  // For long timelines, show key milestones instead of every year
  let displayData = yearlyData;
  if (yearlyData.length > 10) {
    const milestones = [0, 2, 4]; // First 3 years
    const lastYears = yearlyData.length - 3;
    // Add years at 3-year intervals in between
    for (let i = 6; i < lastYears; i += 3) {
      milestones.push(i);
    }
    // Add last 3 years
    milestones.push(yearlyData.length - 3, yearlyData.length - 2, yearlyData.length - 1);
    displayData = milestones.filter(i => i >= 0 && i < yearlyData.length).map(i => yearlyData[i]);
  }

  const targetYear = new Date().getFullYear();
  const isRetirement = goal.goalType === 'retirement';
  const hasEpfNps = isRetirement && projections.epfNps;

  let glidePathExplanation = isRetirement
    ? `<p><strong>Retirement Glide Path:</strong> Equity reduces gradually but maintains 30% at retirement for ongoing growth during withdrawals.</p>
       <p class="mt-1">8+ years: up to 70% | 3-8 years: up to 40% | At retirement: 30% equity minimum</p>`
    : `<p><strong>Glide Path:</strong> Equity moves to 0% two years before goal to protect accumulated gains.</p>
       <p class="mt-1">8+ years: up to 70% equity | 3-8 years: up to 40% | 2 years before goal: 0% equity (100% debt)</p>`;

  // Add EPF/NPS return rates note for retirement goals
  if (hasEpfNps) {
    glidePathExplanation += `
      <p class="mt-2 text-purple-600"><strong>EPF/NPS Returns:</strong> EPF @ 8% p.a. | NPS @ 10% p.a.</p>`;
  }

  return `
    <div class="mb-4">
      <details class="group">
        <summary class="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800 list-none flex items-center gap-1">
          <svg class="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
          View Growth & Glide Path Projections
        </summary>
        <div class="mt-3 overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="bg-gray-100">
                <th class="px-3 py-2 text-left font-medium text-gray-600">Year</th>
                <th class="px-3 py-2 text-left font-medium text-gray-600">Years Left</th>
                <th class="px-3 py-2 text-right font-medium text-gray-600">Monthly SIP</th>
                <th class="px-3 py-2 text-right font-medium text-gray-600">SIP Corpus</th>
                ${hasEpfNps ? '<th class="px-3 py-2 text-right font-medium text-purple-600">EPF+NPS</th>' : ''}
                ${hasEpfNps ? '<th class="px-3 py-2 text-right font-medium text-gray-600">Total</th>' : ''}
                <th class="px-3 py-2 text-center font-medium text-gray-600">Max Equity</th>
                <th class="px-3 py-2 text-center font-medium text-gray-600">Exp. Return</th>
                <th class="px-3 py-2 text-center font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              ${displayData.map((row, idx) => {
                const prevMaxEquity = idx > 0 ? displayData[idx - 1].maxEquity : 70;
                const needsRebalance = row.maxEquity < prevMaxEquity;
                const currentExceedsMax = goal.equityPercent > row.maxEquity;
                const calendarYear = targetYear + row.year;

                let actionText = '';
                if (needsRebalance) {
                  actionText = `<span class="text-orange-600">Reduce Equity to ${row.maxEquity}%</span>`;
                } else if (currentExceedsMax) {
                  actionText = `<span class="text-orange-600">Equity should be ${row.maxEquity}%</span>`;
                } else {
                  actionText = '<span class="text-green-600">Maintain</span>';
                }

                return `
                  <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${row.yearsRemaining <= 3 ? 'text-orange-700' : ''}">
                    <td class="px-3 py-2 border-t">${calendarYear}</td>
                    <td class="px-3 py-2 border-t">${row.yearsRemaining}y</td>
                    <td class="px-3 py-2 border-t text-right">${formatCurrency(row.sip, currency)}</td>
                    <td class="px-3 py-2 border-t text-right font-medium">${formatCurrency(row.corpus, currency)}</td>
                    ${hasEpfNps ? `<td class="px-3 py-2 border-t text-right font-medium text-purple-600">${formatCurrency(row.epfNpsCorpus, currency)}</td>` : ''}
                    ${hasEpfNps ? `<td class="px-3 py-2 border-t text-right font-bold">${formatCurrency(row.totalCorpus, currency)}</td>` : ''}
                    <td class="px-3 py-2 border-t text-center">
                      <span class="px-2 py-0.5 rounded text-xs ${row.maxEquity <= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">
                        ${row.maxEquity}%
                      </span>
                    </td>
                    <td class="px-3 py-2 border-t text-center">
                      <span class="text-blue-600 font-medium">${row.expectedReturn.toFixed(1)}%</span>
                    </td>
                    <td class="px-3 py-2 border-t text-center text-xs">
                      ${actionText}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <div class="mt-2 text-xs text-gray-500">
            ${glidePathExplanation}
          </div>
        </div>
      </details>
    </div>
  `;
}

export function initGoals(data, curr, fh, onChange) {
  appData = data;
  currency = curr;
  fundHouse = fh || 'icici';
  onDataChange = onChange;
  renderGoalsList();
  updateTotalSummary();
  setupEventListeners();
}

export function updateFundHouse(fh) {
  fundHouse = fh;
  renderGoalsList();
}

export function updateCurrency(curr) {
  currency = curr;
  // Update goal return rates to fit new currency limits
  appData.goals.forEach(goal => {
    goal.equityReturn = constrainEquityReturn(goal.equityReturn, currency);
    goal.debtReturn = constrainDebtReturn(goal.debtReturn, currency);
  });
  renderGoalsList();
  updateTotalSummary();
}

export function refreshData(data) {
  appData = data;
  renderGoalsList();
  updateTotalSummary();
}

function setupEventListeners() {
  document.getElementById('add-goal-btn')?.addEventListener('click', () => showAddGoalModal(null));
  document.getElementById('review-plan-btn')?.addEventListener('click', showPlanReview);
}

function showAddGoalModal(editGoal = null) {
  // Handle case where event object is passed instead of goal
  if (editGoal instanceof Event || (editGoal && !editGoal.id)) {
    editGoal = null;
  }

  const modal = document.getElementById('goal-modal');
  const content = document.getElementById('goal-modal-content');
  const isEdit = editGoal !== null;

  const equityLimits = getEquityLimits(currency);
  const debtLimits = getDebtLimits(currency);

  // Calculate default target date (10 years from now)
  const defaultDate = new Date();
  defaultDate.setFullYear(defaultDate.getFullYear() + 10);
  const defaultDateStr = defaultDate.toISOString().split('T')[0];

  const goal = isEdit ? editGoal : {
    name: '',
    goalType: 'one-time',
    targetAmount: '',
    inflationRate: 6,
    targetDate: defaultDateStr,
    equityPercent: 60,
    debtPercent: 40,
    equityReturn: equityLimits.default,
    debtReturn: debtLimits.default,
    annualStepUp: 5,
    initialLumpsum: 0
  };

  const maxEquity = getMaxEquity(goal.targetDate, goal.goalType || 'one-time');
  const constrainedEquity = Math.min(goal.equityPercent, maxEquity);

  content.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <h3 class="text-xl font-semibold mb-6">${isEdit ? 'Edit Goal' : 'Add New Goal'}</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Goal Name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Goal Name</label>
          <input type="text" id="goal-name" value="${goal.name}" placeholder="e.g., Child Education, Retirement"
            class="w-full px-3 py-2 border rounded-lg">
        </div>

        <!-- Goal Type -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Goal Type</label>
          <select id="goal-type" class="w-full px-3 py-2 border rounded-lg">
            <option value="one-time" ${(goal.goalType || 'one-time') === 'one-time' ? 'selected' : ''}>One-time (e.g., Education, House)</option>
            <option value="retirement" ${goal.goalType === 'retirement' ? 'selected' : ''}>Retirement (ongoing withdrawals)</option>
          </select>
          <p class="text-xs text-gray-500 mt-1">Retirement goals maintain 30% equity at goal date</p>
        </div>

        <!-- Target Amount -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Target Amount (today's value)</label>
          <div class="relative">
            <span class="absolute left-3 top-2 text-gray-500">${getSymbol(currency)}</span>
            <input type="number" id="goal-amount" value="${goal.targetAmount}" placeholder="e.g., 5000000"
              class="w-full pl-8 pr-3 py-2 border rounded-lg">
          </div>
        </div>

        <!-- Inflation Rate -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Inflation Rate (%)</label>
          <input type="number" id="goal-inflation" value="${goal.inflationRate}" min="0" max="15" step="0.5"
            class="w-full px-3 py-2 border rounded-lg">
          <p class="text-xs text-gray-500 mt-1">Education: 6-8%, General: 4-5%</p>
        </div>

        <!-- Target Date -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
          <input type="date" id="goal-date" value="${goal.targetDate}"
            class="w-full px-3 py-2 border rounded-lg">
        </div>

        <!-- Initial Lumpsum -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Initial Lumpsum (existing investment)</label>
          <div class="relative">
            <span class="absolute left-3 top-2 text-gray-500">${getSymbol(currency)}</span>
            <input type="number" id="goal-lumpsum" value="${goal.initialLumpsum || ''}" placeholder="0"
              class="w-full pl-8 pr-3 py-2 border rounded-lg">
          </div>
        </div>

        <!-- Asset Allocation -->
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Asset Allocation
            <span id="max-equity-badge" class="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
              Max Equity: ${maxEquity}%
            </span>
          </label>
          <div class="flex items-center gap-4">
            <div class="flex-1">
              <input type="range" id="goal-equity" min="0" max="${maxEquity}" value="${constrainedEquity}"
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">
            </div>
            <div class="text-sm font-medium w-32 text-right">
              <span id="equity-display">${constrainedEquity}</span>% Equity /
              <span id="debt-display">${100 - constrainedEquity}</span>% Debt
            </div>
          </div>
        </div>

        <!-- Expected Returns -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Equity Return (post-tax)
          </label>
          <div class="flex items-center gap-2">
            <input type="range" id="goal-equity-return" min="${equityLimits.min}" max="${equityLimits.max}" step="1"
              value="${goal.equityReturn}" class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">
            <span id="equity-return-display" class="text-sm font-medium w-12">${goal.equityReturn}%</span>
          </div>
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>8-9% Conservative</span>
            <span id="equity-return-label" class="font-medium text-blue-600">${goal.equityReturn <= 9 ? 'Conservative' : goal.equityReturn >= 12 ? 'Optimistic' : 'Realistic'}</span>
            <span>12-13% Optimistic</span>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Debt Return (post-tax)
            <span class="text-xs text-gray-500">${debtLimits.min}-${debtLimits.max}%</span>
          </label>
          <div class="flex items-center gap-2">
            <input type="range" id="goal-debt-return" min="${debtLimits.min}" max="${debtLimits.max}" step="1"
              value="${goal.debtReturn}" class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">
            <span id="debt-return-display" class="text-sm font-medium w-12">${goal.debtReturn}%</span>
          </div>
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>4% Conservative</span>
            <span id="debt-return-label" class="font-medium text-blue-600">${goal.debtReturn <= 4 ? 'Conservative' : goal.debtReturn >= 7 ? 'Optimistic' : 'Realistic'}</span>
            <span>7% Optimistic</span>
          </div>
        </div>

        <!-- Annual Step-Up -->
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Annual SIP Step-Up</label>
          <div class="flex items-center gap-2">
            <input type="range" id="goal-stepup" min="0" max="10" step="1" value="${goal.annualStepUp}"
              class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">
            <span id="stepup-display" class="text-sm font-medium w-12">${goal.annualStepUp}%</span>
          </div>
          <p class="text-xs text-gray-500 mt-1">SIP increases by this % every year</p>
        </div>

        <!-- EPF/NPS Step-Up (Retirement only) -->
        <div id="epf-nps-stepup-container" class="md:col-span-2 ${(goal.goalType || 'one-time') === 'retirement' ? '' : 'hidden'}">
          <div class="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" id="goal-epf-nps-stepup" ${goal.epfNpsStepUp ? 'checked' : ''}
                class="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500">
              <div>
                <span class="text-sm font-medium text-purple-800">EPF/NPS contributions grow with salary</span>
                <p class="text-xs text-purple-600">Increase EPF/NPS by the same step-up rate as SIP annually</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
        <button id="cancel-goal-btn" class="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
        <button id="save-goal-btn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          ${isEdit ? 'Update Goal' : 'Create Goal'}
        </button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  // Setup range slider updates
  const equitySlider = document.getElementById('goal-equity');
  const equityReturnSlider = document.getElementById('goal-equity-return');
  const debtReturnSlider = document.getElementById('goal-debt-return');
  const stepupSlider = document.getElementById('goal-stepup');
  const dateInput = document.getElementById('goal-date');
  const goalTypeSelect = document.getElementById('goal-type');

  // Helper to update max equity and retirement options based on date and goal type
  function updateMaxEquity() {
    const newMaxEquity = getMaxEquity(dateInput.value, goalTypeSelect.value);
    equitySlider.max = newMaxEquity;
    if (parseInt(equitySlider.value) > newMaxEquity) {
      equitySlider.value = newMaxEquity;
      document.getElementById('equity-display').textContent = newMaxEquity;
      document.getElementById('debt-display').textContent = 100 - newMaxEquity;
    }
    const typeLabel = goalTypeSelect.value === 'retirement' ? ' (Retirement)' : '';
    document.getElementById('max-equity-badge').textContent = `Max Equity: ${newMaxEquity}%${typeLabel}`;

    // Show/hide EPF/NPS step-up option for retirement goals
    const epfNpsContainer = document.getElementById('epf-nps-stepup-container');
    if (goalTypeSelect.value === 'retirement') {
      epfNpsContainer.classList.remove('hidden');
    } else {
      epfNpsContainer.classList.add('hidden');
    }
  }

  equitySlider.addEventListener('input', () => {
    const val = parseInt(equitySlider.value);
    document.getElementById('equity-display').textContent = val;
    document.getElementById('debt-display').textContent = 100 - val;
  });

  equityReturnSlider.addEventListener('input', () => {
    const val = parseFloat(equityReturnSlider.value);
    document.getElementById('equity-return-display').textContent = val + '%';
    const label = val <= 9 ? 'Conservative' : val >= 12 ? 'Optimistic' : 'Realistic';
    document.getElementById('equity-return-label').textContent = label;
  });

  debtReturnSlider.addEventListener('input', () => {
    const val = parseFloat(debtReturnSlider.value);
    document.getElementById('debt-return-display').textContent = val + '%';
    const label = val <= 4 ? 'Conservative' : val >= 7 ? 'Optimistic' : 'Realistic';
    document.getElementById('debt-return-label').textContent = label;
  });

  stepupSlider.addEventListener('input', () => {
    document.getElementById('stepup-display').textContent = stepupSlider.value + '%';
  });

  // Update max equity when date or goal type changes
  dateInput.addEventListener('change', updateMaxEquity);
  goalTypeSelect.addEventListener('change', updateMaxEquity);

  // Cancel button
  document.getElementById('cancel-goal-btn').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  // Save button
  document.getElementById('save-goal-btn').addEventListener('click', () => {
    const name = document.getElementById('goal-name').value.trim();
    const goalType = document.getElementById('goal-type').value;
    const targetAmount = parseFloat(document.getElementById('goal-amount').value);
    const inflationRate = parseFloat(document.getElementById('goal-inflation').value);
    const targetDate = document.getElementById('goal-date').value;
    const equityPercent = parseInt(document.getElementById('goal-equity').value);
    const debtPercent = 100 - equityPercent;
    const equityReturn = parseFloat(document.getElementById('goal-equity-return').value);
    const debtReturn = parseFloat(document.getElementById('goal-debt-return').value);
    const annualStepUp = parseInt(document.getElementById('goal-stepup').value);
    const initialLumpsum = parseFloat(document.getElementById('goal-lumpsum').value) || 0;
    const epfNpsStepUp = goalType === 'retirement' ? document.getElementById('goal-epf-nps-stepup').checked : false;

    if (!name) {
      alert('Please enter a goal name');
      return;
    }
    if (isNaN(targetAmount) || targetAmount <= 0) {
      alert('Please enter a valid target amount');
      return;
    }
    if (!targetDate) {
      alert('Please select a target date');
      return;
    }

    const goalData = {
      name,
      goalType,
      targetAmount,
      inflationRate,
      targetDate,
      equityPercent,
      debtPercent,
      equityReturn,
      debtReturn,
      annualStepUp,
      initialLumpsum,
      epfNpsStepUp
    };

    if (isEdit) {
      updateGoal(appData, goal.id, goalData);
    } else {
      goalData.startDate = new Date().toISOString().split('T')[0];
      goalData.investments = [];
      addGoal(appData, goalData);
    }

    modal.classList.add('hidden');
    renderGoalsList();
    updateTotalSummary();
    if (onDataChange) onDataChange();
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
}

function renderGoalsList() {
  const container = document.getElementById('goals-list');
  if (!container) return;

  if (appData.goals.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
        </svg>
        <p class="text-lg mb-2">No financial goals yet</p>
        <p class="text-sm">Click "Add Goal" to start planning your financial future</p>
      </div>
    `;
    return;
  }

  container.innerHTML = appData.goals.map(goal => renderGoalCard(goal)).join('');

  // Add event listeners for goal actions
  container.querySelectorAll('.edit-goal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const goal = appData.goals.find(g => g.id === btn.dataset.id);
      if (goal) showAddGoalModal(goal);
    });
  });

  container.querySelectorAll('.delete-goal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this goal? This cannot be undone.')) {
        deleteGoal(appData, btn.dataset.id);
        renderGoalsList();
        updateTotalSummary();
        if (onDataChange) onDataChange();
      }
    });
  });

  container.querySelectorAll('.add-investment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showAddInvestmentModal(btn.dataset.id);
    });
  });

  container.querySelectorAll('.history-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showInvestmentHistory(btn.dataset.id);
    });
  });

  container.querySelectorAll('.investment-count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showInvestmentHistory(btn.dataset.id);
    });
  });

  container.querySelectorAll('.move-up-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      moveGoal(btn.dataset.id, -1);
    });
  });

  container.querySelectorAll('.move-down-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      moveGoal(btn.dataset.id, 1);
    });
  });
}

function moveGoal(goalId, direction) {
  const index = appData.goals.findIndex(g => g.id === goalId);
  if (index === -1) return;

  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= appData.goals.length) return;

  // Swap goals
  const temp = appData.goals[index];
  appData.goals[index] = appData.goals[newIndex];
  appData.goals[newIndex] = temp;

  // Save and re-render
  saveData(appData);
  renderGoalsList();
  if (onDataChange) onDataChange();
}

function renderGoalCard(goal) {
  // For retirement goals, get EPF/NPS adjusted projections
  const retirementContributions = goal.goalType === 'retirement' ? getRetirementContributions() : null;
  const projections = goal.goalType === 'retirement' && retirementContributions
    ? calculateRetirementProjectionsWithEpfNps(goal, retirementContributions)
    : calculateGoalProjections(goal);
  const recommendations = getRecommendations(currency);
  const funds = getFunds(currency);

  // Check if this goal started as short-term (for arbitrage fund recommendation)
  const useArbitrage = wasShortTermAtStart(goal);

  // Calculate SIP split
  const monthlySIP = projections.monthlySIP;
  const equityAmount = monthlySIP * (goal.equityPercent / 100);
  const debtAmount = monthlySIP * (goal.debtPercent / 100);
  const nifty50Amount = equityAmount * 0.70;
  const niftyNext50Amount = equityAmount * 0.30;
  const moneyMarketAmount = debtAmount;

  const categoryColors = {
    long: 'bg-green-100 text-green-800',
    mid: 'bg-yellow-100 text-yellow-800',
    short: 'bg-red-100 text-red-800'
  };

  return `
    <div class="bg-white border rounded-lg p-5 mb-4 shadow-sm hover:shadow-md transition-shadow">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div>
          <h3 class="text-lg font-semibold">${goal.name}</h3>
          <div class="flex gap-1 mt-1">
            <span class="inline-block px-2 py-0.5 text-xs font-medium rounded ${categoryColors[projections.category]}">
              ${getCategoryDisplay(projections.category)}
            </span>
            ${goal.goalType === 'retirement' ? '<span class="inline-block px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800">Retirement</span>' : ''}
          </div>
        </div>
        <div class="text-right">
          <div class="text-xl font-bold">${formatCurrency(goal.targetAmount, currency)}</div>
          <div class="text-sm text-gray-500">Target (today's value)</div>
        </div>
      </div>

      ${projections.needsRebalance ? `
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div class="flex items-center gap-2 text-yellow-800">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <span class="font-medium">Rebalancing recommended</span>
          </div>
          <p class="text-sm text-yellow-700 mt-1">
            Current equity (${goal.equityPercent}%) exceeds max for this time horizon (${projections.maxEquity}%)
          </p>
        </div>
      ` : ''}

      <!-- Goal Details Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
        <div>
          <div class="text-gray-500">Timeline</div>
          <div class="font-medium">${formatTimeline(projections.years)}</div>
        </div>
        <div>
          <div class="text-gray-500">Inflation</div>
          <div class="font-medium">${goal.inflationRate}%</div>
        </div>
        <div>
          <div class="text-gray-500">Allocation</div>
          <div class="font-medium">${goal.equityPercent}% / ${goal.debtPercent}%</div>
          <div class="text-xs text-gray-400">max ${projections.maxEquity}% equity</div>
        </div>
        <div>
          <div class="text-gray-500">Effective XIRR</div>
          <div class="font-medium text-blue-600">${projections.effectiveXIRR.toFixed(1)}%</div>
          <div class="text-xs text-gray-400">with glide path</div>
        </div>
      </div>

      <hr class="my-4">

      <!-- Projections -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
        <div>
          <div class="text-gray-500">Total Invested</div>
          <div class="font-medium">${formatCurrency(projections.totalInvested, currency)}</div>
          <button class="investment-count-btn text-xs text-blue-500 hover:text-blue-700 hover:underline" data-id="${goal.id}">${projections.investmentCount} investment(s)</button>
        </div>
        <div>
          <div class="text-gray-500">Future Value Needed</div>
          <div class="font-medium">${formatCurrency(projections.inflationAdjustedTarget, currency)}</div>
        </div>
        <div>
          <div class="text-gray-500">Gap to Cover</div>
          <div class="font-medium">${formatCurrency(projections.gapAmount, currency)}</div>
        </div>
        <div>
          <div class="text-gray-500">Additional Monthly SIP</div>
          <div class="font-bold text-blue-600 text-lg">${formatCurrency(Math.round(projections.monthlySIP), currency)}</div>
          ${goal.annualStepUp > 0 ? `<div class="text-xs text-gray-400">+${goal.annualStepUp}%/year</div>` : ''}
        </div>
      </div>

      ${projections.epfNps ? `
      <!-- EPF/NPS Automatic Contributions -->
      <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
        <h4 class="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Automatic Retirement Contributions (EPF/NPS)
        </h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div class="text-purple-600">Monthly EPF</div>
            <div class="font-medium">${formatCurrency(projections.epfNps.monthlyEpf, currency)}</div>
            <div class="text-xs text-purple-500">@ ${projections.epfNps.epfReturn}% return${projections.epfNps.stepUpEnabled ? ` +${projections.epfNps.stepUpRate}%/yr` : ''}</div>
          </div>
          <div>
            <div class="text-purple-600">Monthly NPS</div>
            <div class="font-medium">${formatCurrency(projections.epfNps.monthlyNps, currency)}</div>
            <div class="text-xs text-purple-500">@ ${projections.epfNps.npsReturn}% return${projections.epfNps.stepUpEnabled ? ` +${projections.epfNps.stepUpRate}%/yr` : ''}</div>
          </div>
          <div>
            <div class="text-purple-600">Current EPF+NPS Corpus</div>
            <div class="font-medium">${formatCurrency(projections.epfNps.totalCorpus, currency)}</div>
          </div>
          <div>
            <div class="text-purple-600">EPF+NPS at Retirement</div>
            <div class="font-bold text-purple-700">${formatCurrency(Math.round(projections.epfNps.totalEpfNpsFV), currency)}</div>
            ${projections.epfNps.stepUpEnabled ? `<div class="text-xs text-purple-500">with salary growth</div>` : ''}
          </div>
        </div>
        <div class="mt-3 pt-2 border-t border-purple-200 text-xs text-purple-600">
          EPF/NPS contributions are already happening from your salary.${projections.epfNps.stepUpEnabled ? ` Contributions assumed to grow ${projections.epfNps.stepUpRate}% annually with salary.` : ' Contributions assumed flat (edit goal to enable salary growth).'} The "Additional Monthly SIP" above is what you need to invest separately.
        </div>
      </div>
      ` : ''}

      <hr class="my-4">

      <!-- Year-by-Year Projections -->
      ${renderProjectionsTable(goal, projections)}

      <hr class="my-4">

      <!-- SIP Split & Fund Recommendations -->
      <div class="mb-4">
        <details class="group">
          <summary class="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800 list-none flex items-center gap-1">
            <svg class="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
            View Fund Recommendations & SIP Split
          </summary>
          <div class="mt-3 bg-gray-50 rounded-lg p-3">
            ${funds && funds[fundHouse] ? `
              <div class="space-y-2 text-sm">
                ${equityAmount > 0 ? `
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600 flex-1">${funds[fundHouse].nifty50}</span>
                    <span class="font-medium text-green-600 ml-2">${formatCurrency(Math.round(nifty50Amount), currency)}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600 flex-1">${funds[fundHouse].niftyNext50}</span>
                    <span class="font-medium text-green-600 ml-2">${formatCurrency(Math.round(niftyNext50Amount), currency)}</span>
                  </div>
                ` : ''}
                ${debtAmount > 0 ? `
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600 flex-1">${useArbitrage ? funds[fundHouse].arbitrage : funds[fundHouse].moneyMarket}</span>
                    <span class="font-medium text-blue-600 ml-2">${formatCurrency(Math.round(moneyMarketAmount), currency)}</span>
                  </div>
                  ${useArbitrage ? `
                    <div class="text-xs text-purple-600 mt-1">
                      Arbitrage fund recommended for short-term goals (low risk + equity taxation benefit)
                    </div>
                  ` : ''}
                ` : ''}
                <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-300">
                  <span class="text-gray-700 font-medium flex-1">Total</span>
                  <span class="font-bold text-gray-800 ml-2">${formatCurrency(Math.round(monthlySIP), currency)}</span>
                </div>
              </div>
              <div class="mt-3 pt-2 border-t text-xs text-gray-500">
                Equity: 70% Nifty 50 + 30% Nifty Next 50 | Debt: ${useArbitrage ? 'Equity Arbitrage' : 'Money Market'}
              </div>
            ` : `
              <div class="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span class="text-gray-500">Equity:</span>
                  <span class="ml-1">${recommendations.equity}</span>
                </div>
                <div>
                  <span class="text-gray-500">Debt:</span>
                  <span class="ml-1">${recommendations.debt}</span>
                </div>
              </div>
            `}
          </div>
        </details>
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex gap-1 mr-2">
          <button class="move-up-btn p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            data-id="${goal.id}" title="Move up">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
            </svg>
          </button>
          <button class="move-down-btn p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            data-id="${goal.id}" title="Move down">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        </div>
        <button class="add-investment-btn px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
          data-id="${goal.id}">
          + Add Investment
        </button>
        <button class="history-btn px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          data-id="${goal.id}">
          History
        </button>
        <button class="edit-goal-btn px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          data-id="${goal.id}">
          Edit
        </button>
        <button class="delete-goal-btn px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          data-id="${goal.id}">
          Delete
        </button>
      </div>
    </div>
  `;
}

function updateTotalSummary() {
  const totalSIPElement = document.getElementById('total-monthly-sip');
  const availableElement = document.getElementById('available-from-cashflow');
  const gapElement = document.getElementById('investment-gap');

  if (!totalSIPElement) return;

  let totalSIP = 0;
  appData.goals.forEach(goal => {
    const projections = calculateGoalProjections(goal);
    totalSIP += projections.monthlySIP;
  });

  totalSIPElement.textContent = formatCurrency(Math.round(totalSIP), currency);

  // Get cashflow data if available
  const totalIncome = appData.cashflow.income.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = appData.cashflow.expenses.reduce((sum, e) => sum + e.amount, 0);
  const netCashflow = Math.max(0, totalIncome - totalExpenses);

  availableElement.textContent = formatCurrency(netCashflow, currency);

  const gap = totalSIP - netCashflow;
  gapElement.textContent = formatCurrency(Math.abs(gap), currency);

  if (gap > 0) {
    gapElement.classList.remove('text-green-600');
    gapElement.classList.add('text-red-600');
    document.getElementById('gap-label').textContent = 'Shortfall:';
  } else {
    gapElement.classList.remove('text-red-600');
    gapElement.classList.add('text-green-600');
    document.getElementById('gap-label').textContent = 'Surplus:';
  }
}

export function getTotalMonthlySIP() {
  let total = 0;
  appData.goals.forEach(goal => {
    const projections = calculateGoalProjections(goal);
    total += projections.monthlySIP;
  });
  return total;
}

function showPlanReview() {
  if (appData.goals.length === 0) {
    alert('No goals to review. Add some goals first.');
    return;
  }

  const modal = document.getElementById('goal-modal');
  const content = document.getElementById('goal-modal-content');

  // Calculate overall metrics
  const totalIncome = appData.cashflow.income.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = appData.cashflow.expenses.reduce((sum, e) => sum + e.amount, 0);
  const netCashflow = totalIncome - totalExpenses;
  const availableForInvestment = Math.max(0, netCashflow);

  let totalSIP = 0;
  const goalAnalyses = appData.goals.map(goal => {
    const p = calculateGoalProjections(goal);
    totalSIP += p.monthlySIP;
    return analyzeGoal(goal, p, availableForInvestment);
  });

  const overallAffordable = totalSIP <= availableForInvestment;
  const affordabilityRatio = availableForInvestment > 0 ? (totalSIP / availableForInvestment * 100) : 0;

  content.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
      <h3 class="text-xl font-semibold mb-4">Plan Review & Analysis</h3>

      <!-- Overall Summary -->
      <div class="mb-6 p-4 rounded-lg ${overallAffordable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
        <h4 class="font-semibold mb-2 ${overallAffordable ? 'text-green-800' : 'text-red-800'}">
          ${overallAffordable ? 'Plan is Achievable' : 'Plan Needs Adjustment'}
        </h4>
        <div class="text-sm space-y-1 ${overallAffordable ? 'text-green-700' : 'text-red-700'}">
          <p>Monthly cash flow available: <strong>${formatCurrency(availableForInvestment, currency)}</strong></p>
          <p>Total SIP required: <strong>${formatCurrency(Math.round(totalSIP), currency)}</strong></p>
          <p>Utilization: <strong>${affordabilityRatio.toFixed(0)}%</strong> of available cash flow</p>
          ${!overallAffordable ? `<p class="mt-2">Shortfall: <strong>${formatCurrency(Math.round(totalSIP - availableForInvestment), currency)}</strong> per month</p>` : ''}
        </div>
      </div>

      <!-- Individual Goal Analysis -->
      <h4 class="font-semibold mb-3">Goal-by-Goal Analysis</h4>
      <div class="space-y-4">
        ${goalAnalyses.map(analysis => `
          <div class="border rounded-lg p-4 ${analysis.isAchievable ? 'border-green-200' : 'border-yellow-200'}">
            <div class="flex items-start justify-between mb-2">
              <h5 class="font-semibold">${analysis.goalName}</h5>
              <span class="px-2 py-0.5 text-xs rounded ${analysis.isAchievable ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                ${analysis.isAchievable ? 'On Track' : 'Review Needed'}
              </span>
            </div>

            <div class="text-sm text-gray-600 mb-3">
              <p>Target: ${formatCurrency(analysis.targetAmount, currency)} in ${formatTimeline(analysis.years)}</p>
              <p>Future value needed: ${formatCurrency(Math.round(analysis.futureValue), currency)} (with ${analysis.inflation}% inflation)</p>
              <p>Monthly SIP: ${formatCurrency(Math.round(analysis.monthlySIP), currency)}${analysis.stepUp > 0 ? ` (increasing ${analysis.stepUp}%/year)` : ''}</p>
            </div>

            <div class="bg-gray-50 rounded p-3 text-sm">
              <p class="font-medium mb-2">Analysis:</p>
              <ul class="list-disc list-inside space-y-1 text-gray-700">
                ${analysis.reasons.map(r => `<li>${r}</li>`).join('')}
              </ul>
            </div>
          </div>
        `).join('')}
      </div>

      ${!overallAffordable ? `
        <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 class="font-semibold text-blue-800 mb-2">Suggestions to Make Plan Achievable</h4>
          <ul class="list-disc list-inside text-sm text-blue-700 space-y-1">
            <li>Increase income or reduce expenses to improve cash flow</li>
            <li>Extend goal timelines to reduce monthly SIP amounts</li>
            <li>Reduce target amounts or prioritize fewer goals</li>
            <li>Increase annual step-up percentage if you expect income growth</li>
            <li>Add lumpsum investments when possible (bonuses, windfalls)</li>
          </ul>
        </div>
      ` : ''}

      <div class="flex justify-end mt-6 pt-4 border-t">
        <button id="close-review-btn" class="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  document.getElementById('close-review-btn').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
}

function analyzeGoal(goal, projections, availableCashflow) {
  const reasons = [];
  let isAchievable = true;

  // Check timeline appropriateness
  if (projections.years >= 8) {
    reasons.push(`Long-term goal (${formatTimeline(projections.years)}): Equity allocation of ${goal.equityPercent}% is appropriate for wealth building over time.`);
  } else if (projections.years >= 3) {
    reasons.push(`Mid-term goal (${formatTimeline(projections.years)}): Moderate equity allocation of ${goal.equityPercent}% balances growth and stability.`);
  } else {
    reasons.push(`Short-term goal (${formatTimeline(projections.years)}): Conservative allocation recommended. Current equity at ${goal.equityPercent}%.`);
    if (goal.equityPercent > projections.maxEquity) {
      isAchievable = false;
      reasons.push(`Warning: Equity allocation exceeds recommended ${projections.maxEquity}% for this timeline.`);
    }
  }

  // Check return assumptions (using effective XIRR which accounts for glide path)
  const effectiveReturn = projections.effectiveXIRR;
  if (effectiveReturn > 10) {
    reasons.push(`Effective XIRR of ${effectiveReturn.toFixed(1)}% (with glide path) is optimistic. Consider using conservative estimates.`);
  } else if (effectiveReturn >= 7) {
    reasons.push(`Effective XIRR of ${effectiveReturn.toFixed(1)}% (with glide path) is reasonable for a balanced portfolio.`);
  } else {
    reasons.push(`Effective XIRR of ${effectiveReturn.toFixed(1)}% (with glide path) is conservative, providing a safety margin.`);
  }

  // Check inflation assumption
  if (goal.inflationRate >= 7) {
    reasons.push(`Inflation assumption of ${goal.inflationRate}% accounts for high-inflation categories like education/healthcare.`);
  } else if (goal.inflationRate >= 5) {
    reasons.push(`Inflation assumption of ${goal.inflationRate}% is reasonable for general goals.`);
  } else {
    reasons.push(`Inflation assumption of ${goal.inflationRate}% is conservative.`);
  }

  // Check step-up strategy
  if (goal.annualStepUp > 0) {
    reasons.push(`Annual step-up of ${goal.annualStepUp}% reduces initial burden, assuming income grows over time.`);
  } else {
    reasons.push(`No annual step-up: SIP remains constant. Consider adding step-up if income growth is expected.`);
  }

  // Check corpus progress
  if (projections.currentCorpus > 0) {
    const corpusPercent = (projections.corpusFV / projections.inflationAdjustedTarget * 100).toFixed(0);
    reasons.push(`Current investments will cover ${corpusPercent}% of the goal at maturity.`);
  }

  // Check affordability relative to total cashflow
  if (availableCashflow > 0) {
    const sipPercent = (projections.monthlySIP / availableCashflow * 100);
    if (sipPercent > 50) {
      reasons.push(`This goal requires ${sipPercent.toFixed(0)}% of available cash flow - consider if other goals are impacted.`);
    }
  }

  return {
    goalName: goal.name,
    targetAmount: goal.targetAmount,
    futureValue: projections.inflationAdjustedTarget,
    years: projections.years,
    monthlySIP: projections.monthlySIP,
    inflation: goal.inflationRate,
    stepUp: goal.annualStepUp,
    isAchievable,
    reasons
  };
}
