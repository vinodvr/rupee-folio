// Tests for goals module - retirement estimate calculation
import { describe, it, expect, beforeEach } from 'vitest';
import { calculateRetirementEstimate, refreshData } from '../modules/goals.js';

// Set up minimal DOM for refreshData (calls renderGoalsList which needs #goals-list)
beforeEach(() => {
  document.body.innerHTML = '<div id="goals-list"></div>';
});

function setAppData(cashflow) {
  refreshData({
    goals: [],
    cashflow
  });
}

describe('calculateRetirementEstimate', () => {
  it('returns null when no cashflow data exists', () => {
    setAppData({ income: [], expenses: [] });
    expect(calculateRetirementEstimate()).toBeNull();
  });

  it('calculates estimate with typical cashflow data', () => {
    setAppData({
      income: [{ name: 'Salary', amount: 200000 }],
      expenses: [
        { category: 'Housing', name: 'Rent', amount: 50000 },
        { category: 'Food', name: 'Groceries', amount: 20000 },
        { category: 'Utilities', name: 'Bills', amount: 5000 },
        { category: 'EMIs/Loans', name: 'Home Loan', amount: 40000 }
      ]
    });

    const result = calculateRetirementEstimate();
    expect(result).not.toBeNull();

    // Non-EMI = 50000 + 20000 + 5000 = 75000
    expect(result.nonEmiExpenses).toBe(75000);
    expect(result.totalIncome).toBe(200000);

    // Healthcare = min(200000 * 0.05, 25000) = 10000, rounded to nearest 1000 = 10000
    expect(result.healthcare).toBe(10000);

    // Monthly retirement = 75000 * 0.70 + 10000 = 62500
    expect(result.monthlyRetirement).toBe(62500);

    // 3 retirement age estimates
    expect(result.estimates).toHaveLength(3);
    expect(result.estimates[0].age).toBe(45);
    expect(result.estimates[1].age).toBe(50);
    expect(result.estimates[2].age).toBe(55);

    // Age 45: 45 years in retirement, corpus = 62500 * 12 * 45 = 33,750,000 → rounds to 34,000,000
    expect(result.estimates[0].yearsInRetirement).toBe(45);
    expect(result.estimates[0].corpus).toBe(34000000);

    // Age 50: 40 years, corpus = 62500 * 12 * 40 = 30,000,000
    expect(result.estimates[1].yearsInRetirement).toBe(40);
    expect(result.estimates[1].corpus).toBe(30000000);

    // Age 55: 35 years, corpus = 62500 * 12 * 35 = 26,250,000 → rounds to 26,000,000
    expect(result.estimates[2].yearsInRetirement).toBe(35);
    expect(result.estimates[2].corpus).toBe(26000000);
  });

  it('caps healthcare at 25000', () => {
    setAppData({
      income: [{ name: 'Salary', amount: 1000000 }],
      expenses: [{ category: 'Food', name: 'Food', amount: 50000 }]
    });

    const result = calculateRetirementEstimate();
    // Healthcare = min(1000000 * 0.05, 25000) = min(50000, 25000) = 25000
    expect(result.healthcare).toBe(25000);
  });

  it('works with only income (no expenses)', () => {
    setAppData({
      income: [{ name: 'Salary', amount: 150000 }],
      expenses: []
    });

    const result = calculateRetirementEstimate();
    expect(result).not.toBeNull();
    expect(result.nonEmiExpenses).toBe(0);
    // Healthcare = min(150000 * 0.05, 25000) = 7500, rounded to 8000
    expect(result.healthcare).toBe(8000);
    // Monthly = 0 * 0.70 + 8000 = 8000
    expect(result.monthlyRetirement).toBe(8000);
  });

  it('works with only expenses (no income)', () => {
    setAppData({
      income: [],
      expenses: [{ category: 'Food', name: 'Food', amount: 30000 }]
    });

    const result = calculateRetirementEstimate();
    expect(result).not.toBeNull();
    expect(result.totalIncome).toBe(0);
    expect(result.healthcare).toBe(0);
    // Monthly = 30000 * 0.70 + 0 = 21000
    expect(result.monthlyRetirement).toBe(21000);
  });

  it('excludes all EMI categories from non-EMI expenses', () => {
    setAppData({
      income: [{ name: 'Salary', amount: 100000 }],
      expenses: [
        { category: 'EMIs/Loans', name: 'Home Loan', amount: 30000 },
        { category: 'EMIs/Loans', name: 'Car Loan', amount: 15000 },
        { category: 'Food', name: 'Food', amount: 20000 }
      ]
    });

    const result = calculateRetirementEstimate();
    // Non-EMI = 20000 only
    expect(result.nonEmiExpenses).toBe(20000);
  });

  it('rounds healthcare to nearest 1000', () => {
    setAppData({
      income: [{ name: 'Salary', amount: 130000 }],
      expenses: [{ category: 'Food', name: 'Food', amount: 10000 }]
    });

    const result = calculateRetirementEstimate();
    // Healthcare = min(130000 * 0.05, 25000) = 6500, rounded to nearest 1000 = 7000
    expect(result.healthcare).toBe(7000);
  });

  it('rounds corpus to nearest 10 Lakh (1,000,000)', () => {
    setAppData({
      income: [{ name: 'Salary', amount: 100000 }],
      expenses: [{ category: 'Food', name: 'Food', amount: 100000 }]
    });

    const result = calculateRetirementEstimate();
    // Non-EMI = 100000, healthcare = min(5000, 25000) = 5000
    // Monthly = 100000 * 0.70 + 5000 = 75000
    // Age 50: 75000 * 12 * 40 = 36,000,000 (exact)
    expect(result.estimates[1].corpus).toBe(36000000);
  });

  it('handles multiple income sources', () => {
    setAppData({
      income: [
        { name: 'Salary', amount: 100000 },
        { name: 'Freelance', amount: 50000 }
      ],
      expenses: [{ category: 'Food', name: 'Food', amount: 20000 }]
    });

    const result = calculateRetirementEstimate();
    expect(result.totalIncome).toBe(150000);
    // Healthcare = min(150000 * 0.05, 25000) = 7500, rounded = 8000
    expect(result.healthcare).toBe(8000);
  });
});
