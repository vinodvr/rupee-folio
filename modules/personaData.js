// Persona-based data generation logic
// Generates realistic financial data based on wizard answers

import { generateId } from './storage.js';

// Expense percentages based on income (as % of in-hand income)
// With caps to prevent unrealistic amounts at higher incomes
const EXPENSE_CONFIG = {
  // Housing varies by type
  housing: {
    renting: { percent: 0.25, cap: 50000 },
    rentingToBuy: { percent: 0.25, cap: 50000 },
    ownWithLoan: { percent: 0.30, cap: null }, // EMI scales with home value, no cap
    ownNoLoan: { percent: 0, cap: 0 }
  },
  // Food varies by family size (capped at ₹20k)
  food: {
    single: { percent: 0.08, cap: 20000 },
    married: { percent: 0.10, cap: 20000 },
    marriedDual: { percent: 0.10, cap: 20000 },
    withKids1: { percent: 0.12, cap: 20000 },
    withKids2: { percent: 0.15, cap: 20000 }
  },
  // Fixed categories with caps
  utilities: { percent: 0.03, cap: 8000 },
  insurance: { percent: 0.02, cap: 6000 },
  entertainment: { percent: 0.05, cap: 12000 },
  shopping: { percent: 0.04, cap: 10000 },
  houseHelp: { percent: 0.03, cap: 10000 }
};

// EPF/NPS estimation (as % of in-hand income)
// In-hand is post-deduction, so we back-calculate what EPF might be
const EPF_PERCENTAGE = 0.06; // ~6% of in-hand
const NPS_PERCENTAGE = 0.05; // ~5% of in-hand if opted

// Home value multipliers based on income (annual in-hand * multiplier)
const HOME_VALUE_MULTIPLIER = 8; // 8x annual in-hand income

/**
 * Calculate expense amount with optional cap
 */
function calcExpense(income, config) {
  const raw = income * config.percent;
  const capped = config.cap ? Math.min(raw, config.cap) : raw;
  return Math.round(capped / 1000) * 1000;
}

/**
 * Calculate expenses based on persona
 */
function calculateExpenses(answers) {
  const income = answers.monthlyIncome;
  const expenses = [];

  // Housing (rent only - EMIs are handled separately)
  if (answers.housing === 'renting' || answers.housing === 'rentingToBuy') {
    expenses.push({
      id: generateId(),
      category: 'Housing',
      name: 'Rent',
      amount: calcExpense(income, EXPENSE_CONFIG.housing.renting)
    });
  }

  // Food - varies by family size
  let foodConfig = EXPENSE_CONFIG.food.single;
  if (answers.family === 'married' || answers.family === 'marriedDual') {
    foodConfig = answers.kids === 'none'
      ? EXPENSE_CONFIG.food.married
      : answers.kids === '1'
        ? EXPENSE_CONFIG.food.withKids1
        : EXPENSE_CONFIG.food.withKids2;
  }
  expenses.push({
    id: generateId(),
    category: 'Food',
    name: 'Groceries + Eating Out',
    amount: calcExpense(income, foodConfig)
  });

  // Utilities (capped at ₹8k)
  expenses.push({
    id: generateId(),
    category: 'Utilities',
    name: 'Electricity + Internet',
    amount: calcExpense(income, EXPENSE_CONFIG.utilities)
  });

  // Insurance (capped at ₹6k)
  expenses.push({
    id: generateId(),
    category: 'Health & Insurance',
    name: 'Health + Life Insurance',
    amount: calcExpense(income, EXPENSE_CONFIG.insurance)
  });

  // Entertainment (capped at ₹12k)
  expenses.push({
    id: generateId(),
    category: 'Lifestyle',
    name: 'OTT + Recreation',
    amount: calcExpense(income, EXPENSE_CONFIG.entertainment)
  });

  // Shopping
  expenses.push({
    id: generateId(),
    category: 'Lifestyle',
    name: 'Clothes + Misc',
    amount: calcExpense(income, EXPENSE_CONFIG.shopping)
  });

  // House Help (capped at ₹10k)
  expenses.push({
    id: generateId(),
    category: 'Household Help',
    name: 'House Help',
    amount: calcExpense(income, EXPENSE_CONFIG.houseHelp)
  });

  // Loan EMIs (if any)
  if (answers.otherEmi > 0) {
    expenses.push({
      id: generateId(),
      category: 'EMIs/Loans',
      name: 'Loan EMIs',
      amount: answers.otherEmi
    });
  }

  return expenses;
}

/**
 * Calculate income entries based on persona
 */
function calculateIncome(answers) {
  const income = [];
  const monthlyIncome = answers.monthlyIncome;

  // EPF contribution estimation (monthly)
  const epfMonthly = Math.round(monthlyIncome * EPF_PERCENTAGE / 1000) * 1000;
  // NPS contribution (5% if NPS corpus exists, meaning user contributes)
  const npsMonthly = answers.npsCorpus > 0
    ? Math.round(monthlyIncome * NPS_PERCENTAGE / 1000) * 1000
    : 0;

  if (answers.family === 'marriedDual') {
    // Dual income - split 60/40
    const selfIncome = Math.round(monthlyIncome * 0.6 / 1000) * 1000;
    const spouseIncome = monthlyIncome - selfIncome;

    income.push({
      id: generateId(),
      name: 'Salary - Self',
      amount: selfIncome,
      epf: Math.round(epfMonthly * 0.6 / 1000) * 1000,
      nps: Math.round(npsMonthly * 0.6 / 1000) * 1000
    });

    income.push({
      id: generateId(),
      name: 'Salary - Spouse',
      amount: spouseIncome,
      epf: Math.round(epfMonthly * 0.4 / 1000) * 1000,
      nps: Math.round(npsMonthly * 0.4 / 1000) * 1000
    });
  } else {
    // Single income
    const incomeName = answers.family === 'single' ? 'Salary' : 'Salary - Self';
    income.push({
      id: generateId(),
      name: incomeName,
      amount: monthlyIncome,
      epf: epfMonthly,
      nps: npsMonthly
    });
  }

  return income;
}

/**
 * Calculate assets based on persona
 */
function calculateAssets(answers) {
  const assets = [];

  // EPF Corpus
  if (answers.epfCorpus > 0) {
    assets.push({
      id: generateId(),
      name: 'EPF Corpus',
      category: 'EPF',
      value: answers.epfCorpus
    });
  }

  // NPS Corpus
  if (answers.npsCorpus > 0) {
    assets.push({
      id: generateId(),
      name: 'NPS Corpus',
      category: 'NPS',
      value: answers.npsCorpus
    });
  }

  // MF/Stocks
  if (answers.mfStocks > 0) {
    assets.push({
      id: generateId(),
      name: 'Mutual Funds & Stocks',
      category: 'Mutual Funds',
      value: answers.mfStocks
    });
  }

  return assets;
}

/**
 * Calculate liabilities based on persona
 */
function calculateLiabilities(answers) {
  const liabilities = [];

  if (answers.otherEmi > 0) {
    if (answers.housing === 'ownWithLoan') {
      // If owns with loan, assume most EMI is home loan
      // Estimate outstanding as roughly 100x EMI (rough approximation for 15yr loan at 9%)
      liabilities.push({
        id: generateId(),
        name: 'Home Loan',
        category: 'Home Loan',
        amount: answers.otherEmi * 100
      });
    } else {
      // Other loans - estimate outstanding as 36x EMI (3-year personal/car loan)
      liabilities.push({
        id: generateId(),
        name: 'Personal/Car Loan',
        category: 'Personal Loan',
        amount: answers.otherEmi * 36
      });
    }
  }

  return liabilities;
}

/**
 * Calculate goals based on persona
 */
function calculateGoals(answers, expenses) {
  const goals = [];
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Calculate monthly expenses excluding EMIs for retirement calculation
  const nonEmiExpenses = expenses
    .filter(e => e.category !== 'EMIs/Loans')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // 1. Emergency Fund (always)
  const emergencyAmount = totalExpenses * 6;
  const emergencyTarget = new Date(today);
  emergencyTarget.setFullYear(emergencyTarget.getFullYear() + 2);

  goals.push({
    id: generateId(),
    name: 'Emergency Fund',
    goalType: 'one-time',
    targetAmount: Math.round(emergencyAmount / 100000) * 100000, // Round to nearest lakh
    inflationRate: 0,
    targetDate: emergencyTarget.toISOString().split('T')[0],
    startDate: todayStr
  });

  // 2. Retirement (always) - FIRE at 50
  const retirementAge = 50;
  const currentAge = answers.age;
  const yearsToRetirement = retirementAge - currentAge;

  if (yearsToRetirement > 0) {
    // Calculate corpus in TODAY's value (goal system will handle inflation)
    // Corpus = monthly expenses × 12 months × 30 years in retirement
    const retirementCorpus = nonEmiExpenses * 12 * 30;
    // Round down to nearest 50 lakh
    const roundedCorpus = Math.floor(retirementCorpus / 5000000) * 5000000;

    const retirementTarget = new Date(today);
    retirementTarget.setFullYear(retirementTarget.getFullYear() + yearsToRetirement);

    goals.push({
      id: generateId(),
      name: 'Retirement (FIRE at 50)',
      goalType: 'retirement',
      targetAmount: Math.max(roundedCorpus, 10000000), // Minimum 1 Cr
      inflationRate: 6,
      targetDate: retirementTarget.toISOString().split('T')[0],
      startDate: todayStr,
      includeEpfNps: true
    });
  }

  // 3. Child Education (if kids)
  if (answers.kids !== 'none') {
    const numKids = answers.kids === '1' ? 1 : 2;
    const educationAmount = 3000000 * numKids; // 30L per child

    const educationTarget = new Date(today);
    educationTarget.setFullYear(educationTarget.getFullYear() + 18);

    goals.push({
      id: generateId(),
      name: `Child Education${numKids > 1 ? ' (2 kids)' : ''}`,
      goalType: 'one-time',
      targetAmount: educationAmount,
      inflationRate: 8, // Education inflation
      targetDate: educationTarget.toISOString().split('T')[0],
      startDate: todayStr
    });
  }

  // 4. Home Down Payment (if planning to buy)
  if (answers.housing === 'rentingToBuy') {
    // Home value = 8x annual in-hand income
    const annualIncome = answers.monthlyIncome * 12;
    const estimatedHomeValue = annualIncome * HOME_VALUE_MULTIPLIER;
    const downPayment = estimatedHomeValue * 0.20; // 20% down payment
    // Cap at ₹40 Lakhs
    const cappedDownPayment = Math.min(downPayment, 4000000);

    const homeTarget = new Date(today);
    homeTarget.setFullYear(homeTarget.getFullYear() + 5);

    goals.push({
      id: generateId(),
      name: 'Home Down Payment',
      goalType: 'one-time',
      targetAmount: Math.round(cappedDownPayment / 100000) * 100000, // Round to nearest lakh
      inflationRate: 6,
      targetDate: homeTarget.toISOString().split('T')[0],
      startDate: todayStr
    });
  }

  return goals;
}

/**
 * Generate complete financial data from wizard answers
 */
export function generatePersonaData(answers) {
  const expenses = calculateExpenses(answers);
  const income = calculateIncome(answers);
  const assets = calculateAssets(answers);
  const liabilities = calculateLiabilities(answers);
  const goals = calculateGoals(answers, expenses);

  return {
    cashflow: {
      income,
      expenses
    },
    assets: {
      items: assets
    },
    liabilities: {
      items: liabilities
    },
    goals
  };
}
