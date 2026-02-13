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

    it('generates single combined income entry for dual income household', () => {
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

      expect(data.cashflow.income).toHaveLength(1);
      expect(data.cashflow.income[0].name).toBe('Salary - Self & Spouse');
      expect(data.cashflow.income[0].amount).toBe(200000);
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

      const rent = data.cashflow.expenses.find(e => e.name === 'Rent + Maintenance');
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

      const rent = data.cashflow.expenses.find(e => e.name === 'Rent + Maintenance');
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
    const baseAnswers = {
      age: 30,
      family: 'single',
      kids: 'none',
      housing: 'renting',
      monthlyIncome: 100000,
      otherEmi: 0,
      epfCorpus: 0,
      ppfCorpus: 0,
      npsCorpus: 0,
      fdsRds: 0,
      equityMf: 0,
      directStocks: 0,
      physicalGold: 0
    };

    it('creates EPF asset when corpus provided', () => {
      const data = generatePersonaData({ ...baseAnswers, epfCorpus: 500000 });
      const epf = data.assets.items.find(a => a.category === 'EPF Corpus');
      expect(epf).toBeDefined();
      expect(epf.value).toBe(500000);
    });

    it('creates PPF asset when corpus provided', () => {
      const data = generatePersonaData({ ...baseAnswers, ppfCorpus: 400000 });
      const ppf = data.assets.items.find(a => a.category === 'PPF Corpus');
      expect(ppf).toBeDefined();
      expect(ppf.value).toBe(400000);
    });

    it('creates NPS asset when corpus provided', () => {
      const data = generatePersonaData({ ...baseAnswers, npsCorpus: 300000 });
      const nps = data.assets.items.find(a => a.category === 'NPS Corpus');
      expect(nps).toBeDefined();
      expect(nps.value).toBe(300000);
    });

    it('creates FDs & RDs asset when provided', () => {
      const data = generatePersonaData({ ...baseAnswers, fdsRds: 200000 });
      const fds = data.assets.items.find(a => a.category === 'FDs & RDs');
      expect(fds).toBeDefined();
      expect(fds.value).toBe(200000);
    });

    it('creates Equity MF asset when provided', () => {
      const data = generatePersonaData({ ...baseAnswers, equityMf: 1000000 });
      const mf = data.assets.items.find(a => a.category === 'Equity Mutual Funds');
      expect(mf).toBeDefined();
      expect(mf.value).toBe(1000000);
    });

    it('creates Direct Stocks asset when provided', () => {
      const data = generatePersonaData({ ...baseAnswers, directStocks: 500000 });
      const stocks = data.assets.items.find(a => a.category === 'Stocks');
      expect(stocks).toBeDefined();
      expect(stocks.value).toBe(500000);
    });

    it('creates Physical Gold asset when provided', () => {
      const data = generatePersonaData({ ...baseAnswers, physicalGold: 300000 });
      const gold = data.assets.items.find(a => a.category === 'Physical Gold');
      expect(gold).toBeDefined();
      expect(gold.value).toBe(300000);
    });

    it('creates no assets when all corpus values are zero', () => {
      const data = generatePersonaData(baseAnswers);
      expect(data.assets.items).toHaveLength(0);
    });

    it('supports legacy mfStocks field', () => {
      const data = generatePersonaData({ ...baseAnswers, mfStocks: 800000 });
      const mf = data.assets.items.find(a => a.category === 'Equity Mutual Funds');
      expect(mf).toBeDefined();
      expect(mf.value).toBe(800000);
    });
  });

  describe('Liability Generation', () => {
    it('creates home loan liability from outstanding balance', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'ownWithLoan',
        monthlyIncome: 100000,
        homeLoanEmi: 30000,
        homeLoanOutstanding: 3000000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const homeLoan = data.liabilities.items.find(l => l.category === 'Home Loan');
      expect(homeLoan).toBeDefined();
      expect(homeLoan.amount).toBe(3000000);
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

    it('creates separate home loan and personal loan liabilities', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'ownWithLoan',
        monthlyIncome: 150000,
        homeLoanEmi: 40000,
        homeLoanOutstanding: 4000000,
        otherEmi: 10000,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const homeLoan = data.liabilities.items.find(l => l.category === 'Home Loan');
      const personalLoan = data.liabilities.items.find(l => l.category === 'Personal Loan');
      expect(homeLoan).toBeDefined();
      expect(homeLoan.amount).toBe(4000000);
      expect(personalLoan).toBeDefined();
      expect(personalLoan.amount).toBe(10000 * 36);
    });

    it('creates Home Loan EMI expense in cashflow', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'ownWithLoan',
        monthlyIncome: 100000,
        homeLoanEmi: 25000,
        homeLoanOutstanding: 2500000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const hlEmi = data.cashflow.expenses.find(e => e.name === 'Home Loan EMI');
      expect(hlEmi).toBeDefined();
      expect(hlEmi.category).toBe('EMIs/Loans');
      expect(hlEmi.amount).toBe(25000);
    });

    it('creates separate Home Loan EMI and Loan EMIs expenses', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'ownWithLoan',
        monthlyIncome: 150000,
        homeLoanEmi: 40000,
        homeLoanOutstanding: 4000000,
        otherEmi: 10000,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const hlEmi = data.cashflow.expenses.find(e => e.name === 'Home Loan EMI');
      const loanEmi = data.cashflow.expenses.find(e => e.name === 'Loan EMIs');
      expect(hlEmi).toBeDefined();
      expect(hlEmi.amount).toBe(40000);
      expect(loanEmi).toBeDefined();
      expect(loanEmi.amount).toBe(10000);
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

    it('always generates FI goal for users under default retirement age', () => {
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
      expect(retirement.name).toBe('Financial Independence');
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
      // Age 30: first child at 30, child age 0, 18 years to education
      const expectedYear = new Date().getFullYear() + 18;
      expect(education.targetDate).toContain(String(expectedYear));
    });

    it('sets education target based on estimated child age for older parent', () => {
      const data = generatePersonaData({
        age: 40,
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
      // Age 40: first child at 30, child age 10, 8 years to education
      const expectedYear = new Date().getFullYear() + 8;
      expect(education.targetDate).toContain(String(expectedYear));
    });

    it('skips education goal when child is already college-age', () => {
      const data = generatePersonaData({
        age: 50,
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
      expect(education).toBeUndefined();
    });

    it('sets education target 18 years out for young parent', () => {
      const data = generatePersonaData({
        age: 25,
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
      // Age 25: first child at 25 (min(30, 25)), child age 0, 18 years to education
      const expectedYear = new Date().getFullYear() + 18;
      expect(education.targetDate).toContain(String(expectedYear));
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
    it('calculates retirement corpus using 70% expenses + healthcare', () => {
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
      // nonEmiExpenses=52000 (groceries 6K + eatingOut 2K + utilities 3K + insurance 3K + entertainment 5K + shopping 5K + houseHelp 3K + rent 25K)
      // corpus=41400*12*40=19,872,000 → rounded to 19,000,000
      expect(retirement.targetAmount).toBe(19000000);
    });

    it('rounds retirement corpus to nearest 10 lakh', () => {
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
      expect(retirement.targetAmount % 1000000).toBe(0);
    });

    it('uses retirementAge from answers for goal name and target date', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0,
        retirementAge: 45
      });

      const retirement = data.goals.find(g => g.goalType === 'retirement');
      expect(retirement.name).toBe('Financial Independence');

      // Target date should be 15 years from now (45 - 30)
      const expectedYear = new Date().getFullYear() + 15;
      expect(retirement.targetDate).toContain(String(expectedYear));
    });

    it('defaults retirementAge to 50 when not provided', () => {
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
      expect(retirement.name).toBe('Financial Independence');

      const expectedYear = new Date().getFullYear() + 20;
      expect(retirement.targetDate).toContain(String(expectedYear));
    });

    it('high income produces proportionally higher corpus than low income', () => {
      const lowIncome = generatePersonaData({
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

      const highIncome = generatePersonaData({
        age: 30,
        family: 'married',
        kids: '1',
        housing: 'renting',
        monthlyIncome: 500000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      const lowCorpus = lowIncome.goals.find(g => g.goalType === 'retirement').targetAmount;
      const highCorpus = highIncome.goals.find(g => g.goalType === 'retirement').targetAmount;

      // ₹5L earner should have significantly higher corpus than ₹1L earner
      expect(highCorpus).toBeGreaterThan(lowCorpus * 2);
    });

    it('caps healthcare budget at ₹25K regardless of income', () => {
      const data = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'ownNoLoan',
        monthlyIncome: 2000000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0
      });

      // At ₹20L income: 5% = ₹1L, but capped at ₹25K
      // nonEmiExpenses: groceries 35K + eatingOut 15K + utilities 15K + insurance 30K + entertainment 30K + shopping 30K + houseHelp 20K = 175K
      // retMonthly = round(175000*0.7 + 25000) = round(122500 + 25000) = 147500
      // corpus = 147500 * 12 * 40 = 70,800,000 → rounded to 70,000,000
      const retirement = data.goals.find(g => g.goalType === 'retirement');
      expect(retirement.targetAmount).toBe(70000000);
    });

    it('uses longer retirement duration with earlier FI age', () => {
      const earlyFI = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0,
        retirementAge: 40
      });

      const lateFI = generatePersonaData({
        age: 30,
        family: 'single',
        kids: 'none',
        housing: 'renting',
        monthlyIncome: 100000,
        otherEmi: 0,
        epfCorpus: 0,
        npsCorpus: 0,
        mfStocks: 0,
        retirementAge: 55
      });

      const earlyCorpus = earlyFI.goals.find(g => g.goalType === 'retirement').targetAmount;
      const lateCorpus = lateFI.goals.find(g => g.goalType === 'retirement').targetAmount;

      // Earlier FI = more years in retirement = larger corpus needed
      expect(earlyCorpus).toBeGreaterThan(lateCorpus);
    });
  });
});
