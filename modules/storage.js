// LocalStorage wrapper for Financial Planner
const STORAGE_KEY = 'financial-planner-data';

const defaultData = {
  settings: {
    currency: 'INR',
    fundHouse: 'icici',
    equityReturn: 10,
    debtReturn: 5
  },
  cashflow: {
    income: [],
    expenses: []
  },
  goals: []
};

export function generateId() {
  return crypto.randomUUID();
}

export function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // Merge with defaults to handle schema updates
      return {
        settings: { ...defaultData.settings, ...data.settings },
        cashflow: {
          income: data.cashflow?.income || [],
          expenses: data.cashflow?.expenses || []
        },
        goals: data.goals || []
      };
    }
  } catch (e) {
    console.error('Error loading data:', e);
  }
  return JSON.parse(JSON.stringify(defaultData));
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Error saving data:', e);
    return false;
  }
}

export function clearData() {
  localStorage.removeItem(STORAGE_KEY);
  return JSON.parse(JSON.stringify(defaultData));
}

// Settings helpers
export function getCurrency(data) {
  return data.settings?.currency || 'INR';
}

export function setCurrency(data, currency) {
  data.settings.currency = currency;
  saveData(data);
  return data;
}

export function getFundHouse(data) {
  return data.settings?.fundHouse || 'icici';
}

export function setFundHouse(data, fundHouse) {
  data.settings.fundHouse = fundHouse;
  saveData(data);
  return data;
}

export function getEquityReturn(data) {
  return data.settings?.equityReturn ?? 10;
}

export function setEquityReturn(data, value) {
  data.settings.equityReturn = value;
  saveData(data);
  return data;
}

export function getDebtReturn(data) {
  return data.settings?.debtReturn ?? 5;
}

export function setDebtReturn(data, value) {
  data.settings.debtReturn = value;
  saveData(data);
  return data;
}

// Cashflow helpers
export function addIncome(data, income) {
  income.id = income.id || generateId();
  data.cashflow.income.push(income);
  saveData(data);
  return data;
}

export function updateIncome(data, id, updates) {
  const index = data.cashflow.income.findIndex(i => i.id === id);
  if (index !== -1) {
    data.cashflow.income[index] = { ...data.cashflow.income[index], ...updates };
    saveData(data);
  }
  return data;
}

export function deleteIncome(data, id) {
  data.cashflow.income = data.cashflow.income.filter(i => i.id !== id);
  saveData(data);
  return data;
}

export function addExpense(data, expense) {
  expense.id = expense.id || generateId();
  data.cashflow.expenses.push(expense);
  saveData(data);
  return data;
}

export function updateExpense(data, id, updates) {
  const index = data.cashflow.expenses.findIndex(e => e.id === id);
  if (index !== -1) {
    data.cashflow.expenses[index] = { ...data.cashflow.expenses[index], ...updates };
    saveData(data);
  }
  return data;
}

export function deleteExpense(data, id) {
  data.cashflow.expenses = data.cashflow.expenses.filter(e => e.id !== id);
  saveData(data);
  return data;
}

// Goals helpers
export function addGoal(data, goal) {
  goal.id = goal.id || generateId();
  goal.investments = goal.investments || [];
  goal.startDate = goal.startDate || new Date().toISOString().split('T')[0];
  data.goals.push(goal);
  saveData(data);
  return data;
}

export function updateGoal(data, id, updates) {
  const index = data.goals.findIndex(g => g.id === id);
  if (index !== -1) {
    data.goals[index] = { ...data.goals[index], ...updates };
    saveData(data);
  }
  return data;
}

export function deleteGoal(data, id) {
  data.goals = data.goals.filter(g => g.id !== id);
  saveData(data);
  return data;
}

// Investment tracking helpers
export function addInvestment(data, goalId, investment) {
  const goal = data.goals.find(g => g.id === goalId);
  if (goal) {
    investment.id = investment.id || generateId();
    investment.date = investment.date || new Date().toISOString().split('T')[0];
    goal.investments = goal.investments || [];
    goal.investments.push(investment);
    saveData(data);
  }
  return data;
}

export function deleteInvestment(data, goalId, investmentId) {
  const goal = data.goals.find(g => g.id === goalId);
  if (goal && goal.investments) {
    goal.investments = goal.investments.filter(i => i.id !== investmentId);
    saveData(data);
  }
  return data;
}
