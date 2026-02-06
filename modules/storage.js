// LocalStorage wrapper for Financial Planner
const STORAGE_KEY = 'financial-planner-data';

const defaultData = {
  settings: {
    currency: 'INR',
    fundHouse: 'icici',
    equityAllocation: 60,
    equityReturn: 10,
    debtReturn: 5,
    arbitrageReturn: 6,
    epfReturn: 8,
    npsReturn: 9,
    epfNpsStepUp: 5,
    investmentStepUp: 5
  },
  cashflow: {
    income: [],
    expenses: []
  },
  assets: {
    items: []
  },
  liabilities: {
    items: []
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
      const result = {
        settings: { ...defaultData.settings, ...data.settings },
        cashflow: {
          income: data.cashflow?.income || [],
          expenses: data.cashflow?.expenses || []
        },
        assets: {
          items: data.assets?.items || []
        },
        liabilities: {
          items: data.liabilities?.items || []
        },
        goals: data.goals || []
      };

      // Migration: Move EPF/NPS corpus from income entries to assets
      let migrated = false;
      result.cashflow.income.forEach(income => {
        if (income.epfCorpus && income.epfCorpus > 0) {
          // Check if EPF asset already exists for this source
          const existingEpf = result.assets.items.find(a =>
            a.category === 'EPF' && a.name === `EPF - ${income.name}`
          );
          if (!existingEpf) {
            result.assets.items.push({
              id: generateId(),
              name: `EPF - ${income.name}`,
              category: 'EPF',
              value: income.epfCorpus
            });
            migrated = true;
          }
          delete income.epfCorpus;
        }
        if (income.npsCorpus && income.npsCorpus > 0) {
          // Check if NPS asset already exists for this source
          const existingNps = result.assets.items.find(a =>
            a.category === 'NPS' && a.name === `NPS - ${income.name}`
          );
          if (!existingNps) {
            result.assets.items.push({
              id: generateId(),
              name: `NPS - ${income.name}`,
              category: 'NPS',
              value: income.npsCorpus
            });
            migrated = true;
          }
          delete income.npsCorpus;
        }
      });

      // Migration: Strip deprecated fields from goals (unified portfolio)
      result.goals.forEach(goal => {
        const deprecatedFields = ['investments', 'initialLumpsum', 'equityPercent', 'debtPercent', 'annualStepUp'];
        deprecatedFields.forEach(field => {
          if (goal.hasOwnProperty(field)) {
            delete goal[field];
            migrated = true;
          }
        });
      });

      // Migration: Add linkedAssets array to goals that don't have it
      result.goals.forEach(goal => {
        if (!goal.linkedAssets) {
          goal.linkedAssets = [];
          migrated = true;
        }
      });

      // Migration: Clean up orphaned linkedAssets references (assets that no longer exist)
      const assetIds = new Set(result.assets.items.map(a => a.id));
      result.goals.forEach(goal => {
        if (goal.linkedAssets && goal.linkedAssets.length > 0) {
          const originalLength = goal.linkedAssets.length;
          goal.linkedAssets = goal.linkedAssets.filter(la => assetIds.has(la.assetId));
          if (goal.linkedAssets.length !== originalLength) {
            migrated = true;
          }
        }
      });

      // Save if migration occurred
      if (migrated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      }

      return result;
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

export function getEquityAllocation(data) {
  return data.settings?.equityAllocation ?? 60;
}

export function setEquityAllocation(data, value) {
  data.settings.equityAllocation = value;
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

export function getArbitrageReturn(data) {
  return data.settings?.arbitrageReturn ?? 6;
}

export function setArbitrageReturn(data, value) {
  data.settings.arbitrageReturn = value;
  saveData(data);
  return data;
}

export function getEpfReturn(data) {
  return data.settings?.epfReturn ?? 8;
}

export function setEpfReturn(data, value) {
  data.settings.epfReturn = value;
  saveData(data);
  return data;
}

export function getNpsReturn(data) {
  return data.settings?.npsReturn ?? 9;
}

export function setNpsReturn(data, value) {
  data.settings.npsReturn = value;
  saveData(data);
  return data;
}

export function getEpfNpsStepUp(data) {
  return data.settings?.epfNpsStepUp ?? 5;
}

export function setEpfNpsStepUp(data, value) {
  data.settings.epfNpsStepUp = value;
  saveData(data);
  return data;
}

export function getInvestmentStepUp(data) {
  return data.settings?.investmentStepUp ?? 5;
}

export function setInvestmentStepUp(data, value) {
  data.settings.investmentStepUp = value;
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
  goal.startDate = goal.startDate || new Date().toISOString().split('T')[0];
  // Simplified schema for unified portfolio - no per-goal allocation or investments
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

// Assets helpers
export function addAsset(data, asset) {
  asset.id = asset.id || generateId();
  data.assets.items.push(asset);
  saveData(data);
  return data;
}

export function updateAsset(data, id, updates) {
  const index = data.assets.items.findIndex(a => a.id === id);
  if (index !== -1) {
    const oldValue = data.assets.items[index].value || 0;
    data.assets.items[index] = { ...data.assets.items[index], ...updates };

    // If asset value decreased, adjust linked amounts proportionally
    if (updates.value !== undefined && updates.value < oldValue) {
      const newValue = updates.value;

      // Calculate total allocated to this asset across all goals
      let totalAllocated = 0;
      data.goals.forEach(goal => {
        if (goal.linkedAssets) {
          goal.linkedAssets.forEach(la => {
            if (la.assetId === id) {
              totalAllocated += la.amount || 0;
            }
          });
        }
      });

      // If over-allocated, reduce proportionally
      if (totalAllocated > newValue) {
        const ratio = newValue / totalAllocated;
        data.goals.forEach(goal => {
          if (goal.linkedAssets) {
            goal.linkedAssets.forEach(la => {
              if (la.assetId === id) {
                la.amount = Math.round(la.amount * ratio);
              }
            });
          }
        });
      }
    }

    saveData(data);
  }
  return data;
}

export function deleteAsset(data, id) {
  data.assets.items = data.assets.items.filter(a => a.id !== id);
  // Clean up any linked asset references in goals
  data.goals.forEach(goal => {
    if (goal.linkedAssets && goal.linkedAssets.length > 0) {
      goal.linkedAssets = goal.linkedAssets.filter(la => la.assetId !== id);
    }
  });
  saveData(data);
  return data;
}

// Liabilities helpers
export function addLiability(data, liability) {
  liability.id = liability.id || generateId();
  data.liabilities.items.push(liability);
  saveData(data);
  return data;
}

export function updateLiability(data, id, updates) {
  const index = data.liabilities.items.findIndex(l => l.id === id);
  if (index !== -1) {
    data.liabilities.items[index] = { ...data.liabilities.items[index], ...updates };
    saveData(data);
  }
  return data;
}

export function deleteLiability(data, id) {
  data.liabilities.items = data.liabilities.items.filter(l => l.id !== id);
  saveData(data);
  return data;
}

// Linked Assets helpers
export function linkAssetToGoal(data, goalId, assetId, amount) {
  const goal = data.goals.find(g => g.id === goalId);
  if (!goal) return data;

  // Initialize linkedAssets if needed
  if (!goal.linkedAssets) {
    goal.linkedAssets = [];
  }

  // Check if already linked, update amount if so
  const existing = goal.linkedAssets.find(la => la.assetId === assetId);
  if (existing) {
    existing.amount = amount;
  } else {
    goal.linkedAssets.push({ assetId, amount });
  }

  saveData(data);
  return data;
}

export function unlinkAssetFromGoal(data, goalId, assetId) {
  const goal = data.goals.find(g => g.id === goalId);
  if (!goal || !goal.linkedAssets) return data;

  goal.linkedAssets = goal.linkedAssets.filter(la => la.assetId !== assetId);
  saveData(data);
  return data;
}

export function updateLinkedAssetAmount(data, goalId, assetId, newAmount) {
  const goal = data.goals.find(g => g.id === goalId);
  if (!goal || !goal.linkedAssets) return data;

  const linked = goal.linkedAssets.find(la => la.assetId === assetId);
  if (linked) {
    linked.amount = newAmount;
    saveData(data);
  }
  return data;
}

// Clean up linked asset references when an asset is deleted
export function cleanupLinkedAssetsOnAssetDelete(data, assetId) {
  let modified = false;
  data.goals.forEach(goal => {
    if (goal.linkedAssets && goal.linkedAssets.length > 0) {
      const originalLength = goal.linkedAssets.length;
      goal.linkedAssets = goal.linkedAssets.filter(la => la.assetId !== assetId);
      if (goal.linkedAssets.length !== originalLength) {
        modified = true;
      }
    }
  });
  if (modified) {
    saveData(data);
  }
  return data;
}
