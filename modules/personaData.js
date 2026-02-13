// Persona-based data generation logic
// Generates realistic financial data based on wizard answers

import { generateId } from './storage.js';

// Expense percentages based on income (as % of in-hand income)
// With caps to prevent unrealistic amounts at higher incomes
const EXPENSE_CONFIG = {
  housing: {
    renting: { percent: 0.25, cap: 150000 },
    rentingToBuy: { percent: 0.25, cap: 150000 },
    ownWithLoan: { percent: 0.30, cap: null },
    ownNoLoan: { percent: 0, cap: 0 }
  },
  groceries: {
    single: { percent: 0.06, cap: 35000 },
    married: { percent: 0.07, cap: 40000 },
    marriedDual: { percent: 0.07, cap: 40000 },
    withKids1: { percent: 0.08, cap: 50000 },
    withKids2: { percent: 0.10, cap: 55000 }
  },
  eatingOut: {
    single: { percent: 0.02, cap: 15000 },
    married: { percent: 0.03, cap: 20000 },
    marriedDual: { percent: 0.03, cap: 20000 },
    withKids1: { percent: 0.04, cap: 20000 },
    withKids2: { percent: 0.05, cap: 25000 }
  },
  utilities: { percent: 0.03, cap: 15000 },
  insurance: { percent: 0.03, cap: 30000 },
  entertainment: { percent: 0.05, cap: 30000 },
  shopping: { percent: 0.05, cap: 30000 },
  houseHelp: { percent: 0.03, cap: 20000 }
};

// EPF/NPS estimation (as % of in-hand income)
// In-hand is post-deduction, so we back-calculate what EPF might be
const EPF_PERCENTAGE = 0.06; // ~6% of in-hand
const NPS_PERCENTAGE = 0.05; // ~5% of in-hand if opted

// Retirement expense adjustments
const RETIREMENT_EXPENSE_RATIO = 0.70;   // 70% of current non-EMI expenses
const HEALTHCARE_PERCENT = 0.05;          // 5% of income
const HEALTHCARE_CAP = 25000;             // Capped at ₹25K/month
const LIFE_EXPECTANCY = 90;

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
      name: 'Rent + Maintenance',
      amount: calcExpense(income, EXPENSE_CONFIG.housing.renting)
    });
  }

  // Food - varies by family size (split into groceries + eating out)
  let familyKey = 'single';
  if (answers.family === 'married' || answers.family === 'marriedDual') {
    familyKey = answers.kids === 'none'
      ? 'married'
      : answers.kids === '1'
        ? 'withKids1'
        : 'withKids2';
  }
  expenses.push({
    id: generateId(),
    category: 'Food',
    name: 'Groceries + Vegetables',
    amount: calcExpense(income, EXPENSE_CONFIG.groceries[familyKey])
  });
  expenses.push({
    id: generateId(),
    category: 'Food',
    name: 'Eating Out + Partying',
    amount: calcExpense(income, EXPENSE_CONFIG.eatingOut[familyKey])
  });

  // Utilities
  expenses.push({
    id: generateId(),
    category: 'Utilities',
    name: 'Electricity + Mobile + Internet',
    amount: calcExpense(income, EXPENSE_CONFIG.utilities)
  });

  // Insurance
  expenses.push({
    id: generateId(),
    category: 'Health & Insurance',
    name: 'Health + Life Premiums',
    amount: calcExpense(income, EXPENSE_CONFIG.insurance)
  });

  // Entertainment
  expenses.push({
    id: generateId(),
    category: 'Lifestyle',
    name: 'Subscriptions + Entertainment',
    amount: calcExpense(income, EXPENSE_CONFIG.entertainment)
  });

  // Shopping
  expenses.push({
    id: generateId(),
    category: 'Lifestyle',
    name: 'Shopping + Personal Care',
    amount: calcExpense(income, EXPENSE_CONFIG.shopping)
  });

  // House Help
  expenses.push({
    id: generateId(),
    category: 'Household Help',
    name: 'Maid + Cook',
    amount: calcExpense(income, EXPENSE_CONFIG.houseHelp)
  });

  // Home Loan EMI (if any)
  if (answers.homeLoanEmi > 0) {
    expenses.push({
      id: generateId(),
      category: 'EMIs/Loans',
      name: 'Home Loan EMI',
      amount: answers.homeLoanEmi
    });
  }

  // Other Loan EMIs (if any)
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

  // Determine income name based on family situation
  let incomeName = 'Salary';
  if (answers.family === 'marriedDual') {
    incomeName = 'Salary - Self & Spouse';
  } else if (answers.family === 'married') {
    incomeName = 'Salary - Self';
  }

  income.push({
    id: generateId(),
    name: incomeName,
    amount: monthlyIncome,
    epf: epfMonthly,
    nps: npsMonthly
  });

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
      name: 'EPF Balance',
      category: 'EPF Corpus',
      value: answers.epfCorpus
    });
  }

  // PPF Corpus
  if (answers.ppfCorpus > 0) {
    assets.push({
      id: generateId(),
      name: 'PPF Balance',
      category: 'PPF Corpus',
      value: answers.ppfCorpus
    });
  }

  // NPS Corpus
  if (answers.npsCorpus > 0) {
    assets.push({
      id: generateId(),
      name: 'NPS Balance',
      category: 'NPS Corpus',
      value: answers.npsCorpus
    });
  }

  // Savings Bank
  if (answers.savingsBank > 0) {
    assets.push({
      id: generateId(),
      name: 'Savings Account',
      category: 'Savings Bank',
      value: answers.savingsBank
    });
  }

  // FDs & RDs
  if (answers.fdsRds > 0) {
    assets.push({
      id: generateId(),
      name: 'Fixed & Recurring Deposits',
      category: 'FDs & RDs',
      value: answers.fdsRds
    });
  }

  // Debt Mutual Funds
  if (answers.debtMf > 0) {
    assets.push({
      id: generateId(),
      name: 'Debt Mutual Funds',
      category: 'Debt/Arbitrage Mutual Funds',
      value: answers.debtMf
    });
  }

  // Equity Mutual Funds
  if (answers.equityMf > 0) {
    assets.push({
      id: generateId(),
      name: 'Equity Mutual Funds',
      category: 'Equity Mutual Funds',
      value: answers.equityMf
    });
  }

  // Direct Stocks
  if (answers.directStocks > 0) {
    assets.push({
      id: generateId(),
      name: 'Direct Stocks',
      category: 'Stocks',
      value: answers.directStocks
    });
  }

  // Physical Gold
  if (answers.physicalGold > 0) {
    assets.push({
      id: generateId(),
      name: 'Gold Jewellery & Coins',
      category: 'Physical Gold',
      value: answers.physicalGold
    });
  }

  // Legacy support: mfStocks field (for old wizard data)
  if (answers.mfStocks > 0 && !answers.equityMf) {
    assets.push({
      id: generateId(),
      name: 'Mutual Funds & Stocks',
      category: 'Equity Mutual Funds',
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

  if (answers.homeLoanOutstanding > 0) {
    liabilities.push({
      id: generateId(),
      name: 'Home Loan',
      category: 'Home Loan',
      amount: answers.homeLoanOutstanding
    });
  }

  if (answers.otherEmi > 0) {
    liabilities.push({
      id: generateId(),
      name: 'Personal/Car Loan',
      category: 'Personal Loan',
      amount: answers.otherEmi * 36
    });
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

  // 2. Financial Independence goal
  const retirementAge = answers.retirementAge || 50;
  const yearsToRetirement = retirementAge - answers.age;

  if (yearsToRetirement > 0) {
    const healthcareBudget = Math.min(
      Math.round(answers.monthlyIncome * HEALTHCARE_PERCENT / 1000) * 1000,
      HEALTHCARE_CAP
    );
    const retirementMonthlyExpenses = Math.round(
      nonEmiExpenses * RETIREMENT_EXPENSE_RATIO + healthcareBudget
    );
    const yearsInRetirement = LIFE_EXPECTANCY - retirementAge;
    const retirementCorpus = retirementMonthlyExpenses * 12 * yearsInRetirement;
    const roundedCorpus = Math.floor(retirementCorpus / 1000000) * 1000000;

    const retirementTarget = new Date(today);
    retirementTarget.setFullYear(retirementTarget.getFullYear() + yearsToRetirement);

    goals.push({
      id: generateId(),
      name: 'Financial Independence',
      goalType: 'retirement',
      targetAmount: Math.max(roundedCorpus, 10000000),
      inflationRate: 6,
      targetDate: retirementTarget.toISOString().split('T')[0],
      startDate: todayStr,
      includeEpfNps: true
    });
  }

  // 3. Child Education (if kids)
  if (answers.kids !== 'none') {
    const parentAgeAtFirstChild = Math.min(30, answers.age);
    const estimatedChildAge = answers.age - parentAgeAtFirstChild;
    const yearsToEducation = 18 - estimatedChildAge;

    if (yearsToEducation > 0) {
      const numKids = answers.kids === '1' ? 1 : 2;
      const educationAmount = 3000000 * numKids; // 30L per child

      const educationTarget = new Date(today);
      educationTarget.setFullYear(educationTarget.getFullYear() + yearsToEducation);

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
