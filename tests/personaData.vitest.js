// Tests for persona-based data generation
import { describe, it, expect } from 'vitest';
import { generatePersonaData } from '../modules/personaData.js';

describe('Persona Data Generation', () => {
  describe('Income Generation', () => {
    it('generates single income entry for single person', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 500000,
        npsCorpus: 0,
        mfStocks: 0
      });

      expect(data.cashflow.income).toHaveLength(1);
      expect(data.cashflow.income[0].name).toBe('Salary');
      expect(data.cashflow.income[0].amount).toBe(100000);
    });

    it('generates two income entries for dual income household', () => {
      const data = generatePersonaData({
        age: 35,
        family: 'marriedDual',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 200000,
        otherEmi: 0,
        epfCorpus: 1000000,
        npsCorpus: 500000,
        mfStocks: 0
      });

      expect(data.cashflow.income).toHaveLength(2);
      expect(data.cashflow.income[0].name).toBe('Salary - Self');
      expect(data.cashflow.income[1].name).toBe('Salary - Spouse');
      // Total should equal monthly income
      const total = data.cashflow.income.reduce((sum, i) => sum + i.amount, 0);
      expect(total).toBe(200000);
    });

    it('includes EPF contribution when income exists', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 500000,
        npsCorpus: 0,
        mfStocks: 0
      });

      expect(data.cashflow.income[0].epf).toBeGreaterThan(0);
    });

    it('includes NPS contribution when NPS corpus exists', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 500000,
        npsCorpus: 200000,
        mfStocks: 0
      });

      expect(data.cashflow.income[0].nps).toBeGreaterThan(0);
    });

    it('has zero NPS contribution when no NPS corpus', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 500000,
        npsCorpus: 0,
        mfStocks: 0
      });

      expect(data.cashflow.income[0].nps).toBe(0);
    });
  });

  describe('Expense Generation', () => {
    it('generates rent expense for renting housing', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const rent = data.cashflow.expenses.find(e => e.name === 'Rent');
      expect(rent).toBeDefined();
      expect(rent.category).toBe('Housing');
    });

    it('generates loan EMI expense when EMI is provided', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'ownWithLoan',
        monthlyIncome: 100000,
        otherEmi: 30000,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const emi = data.cashflow.expenses.find(e => e.name === 'Loan EMIs');
      expect(emi).toBeDefined();
      expect(emi.category).toBe('EMIs/Loans');
      expect(emi.amount).toBe(30000);
    });

    it('generates no housing expense for owning without loan', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'ownNoLoan',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const rent = data.cashflow.expenses.find(e => e.name === 'Rent');
      const emi = data.cashflow.expenses.find(e => e.name === 'Home Loan EMI');
      expect(rent).toBeUndefined();
      expect(emi).toBeUndefined();
    });

    it('generates loan EMI expense when EMI is provided', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 15000,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const loanEmi = data.cashflow.expenses.find(e => e.name === 'Loan EMIs');
      expect(loanEmi).toBeDefined();
      expect(loanEmi.amount).toBe(15000);
    });

    it('generates standard expense categories', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const categories = data.cashflow.expenses.map(e => e.category);
      expect(categories).toContain('Food');
      expect(categories).toContain('Utilities');
      expect(categories).toContain('Health & Insurance');
      expect(categories).toContain('Lifestyle');
      expect(categories).toContain('Household Help');
    });
  });

  describe('Asset Generation', () => {
    it('creates EPF asset when corpus provided', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 500000,
        npsCorpus: 0,
        mfStocks: 0
      });

      const epf = data.assets.items.find(a => a.category === 'EPF');
      expect(epf).toBeDefined();
      expect(epf.value).toBe(500000);
    });

    it('creates NPS asset when corpus provided', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 300000,
        mfStocks: 0
      });

      const nps = data.assets.items.find(a => a.category === 'NPS');
      expect(nps).toBeDefined();
      expect(nps.value).toBe(300000);
    });

    it('creates MF asset when MF/stocks provided', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 1000000
      });

      const mf = data.assets.items.find(a => a.category === 'Mutual Funds');
      expect(mf).toBeDefined();
      expect(mf.value).toBe(1000000);
    });

    it('creates no assets when all corpus values are zero', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      expect(data.assets.items).toHaveLength(0);
    });
  });

  describe('Liability Generation', () => {
    it('creates home loan liability when owning with loan', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'ownWithLoan',
        monthlyIncome: 100000,
        otherEmi: 30000,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const homeLoan = data.liabilities.items.find(l => l.category === 'Home Loan');
      expect(homeLoan).toBeDefined();
      // Outstanding = EMI × 100 (approximation for 15yr loan)
      expect(homeLoan.amount).toBe(30000 * 100);
    });

    it('creates personal loan liability when EMI provided', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 15000,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const personalLoan = data.liabilities.items.find(l => l.category === 'Personal Loan');
      expect(personalLoan).toBeDefined();
      // Should be roughly 36x EMI (3-year loan)
      expect(personalLoan.amount).toBe(15000 * 36);
    });
  });

  describe('Goal Generation', () => {
    it('always generates emergency fund goal', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const emergency = data.goals.find(g => g.name === 'Emergency Fund');
      expect(emergency).toBeDefined();
      expect(emergency.goalType).toBe('one-time');
    });

    it('always generates retirement goal for users under 50', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const retirement = data.goals.find(g => g.goalType === 'retirement');
      expect(retirement).toBeDefined();
      expect(retirement.includeEpfNps).toBe(true);
    });

    it('generates child education goal when kids exist', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'married',
        kids: '1',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const education = data.goals.find(g => g.name.includes('Child Education'));
      expect(education).toBeDefined();
      expect(education.targetAmount).toBe(3000000); // 30L per child
      expect(education.inflationRate).toBe(8); // Education inflation
    });

    it('generates child education goal for 2+ kids', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'married',
        kids: '2+',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const education = data.goals.find(g => g.name.includes('Child Education'));
      expect(education).toBeDefined();
      expect(education.targetAmount).toBe(6000000); // 30L x 2
    });

    it('generates home down payment goal when planning to buy', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'rentingToBuy',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const homeGoal = data.goals.find(g => g.name === 'Home Down Payment');
      expect(homeGoal).toBeDefined();
      expect(homeGoal.inflationRate).toBe(6);
    });

    it('does not generate home down payment goal when already owning', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'ownWithLoan',
        monthlyIncome: 100000,
        otherEmi: 30000,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const homeGoal = data.goals.find(g => g.name === 'Home Down Payment');
      expect(homeGoal).toBeUndefined();
    });

    it('does not generate child education goal when no kids', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const education = data.goals.find(g => g.name.includes('Child Education'));
      expect(education).toBeUndefined();
    });
  });

  describe('Retirement Corpus Calculation', () => {
    it('calculates retirement corpus based on non-EMI expenses', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const retirement = data.goals.find(g => g.goalType === 'retirement');
      expect(retirement).toBeDefined();
      // Should be a reasonable corpus amount (at least 1 Cr)
      expect(retirement.targetAmount).toBeGreaterThanOrEqual(10000000);
    });

    it('rounds retirement corpus to nearest 50 lakh', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const retirement = data.goals.find(g => g.goalType === 'retirement');
      // Should be divisible by 50 lakh (5000000)
      expect(retirement.targetAmount % 5000000).toBe(0);
    });
  });
});
