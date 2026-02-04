// Unit tests for currency.js (Vitest)
import { describe, it, expect } from 'vitest';
import {
  currencyConfig,
  getCurrencyConfig,
  formatCurrency,
  formatNumber,
  getSymbol,
  getRecommendations,
  getFunds,
  getEquityLimits,
  getDebtLimits,
  constrainEquityReturn,
  constrainDebtReturn
} from '../modules/currency.js';

describe('Currency Configuration', () => {
  it('INR configuration exists', () => {
    expect(currencyConfig.INR).toBeDefined();
    expect(currencyConfig.INR.symbol).toBe('₹');
    expect(currencyConfig.INR.locale).toBe('en-IN');
  });

  it('getCurrencyConfig returns correct config', () => {
    const inrConfig = getCurrencyConfig('INR');
    expect(inrConfig.symbol).toBe('₹');
  });

  it('getCurrencyConfig defaults to INR for unknown currency', () => {
    const config = getCurrencyConfig('UNKNOWN');
    expect(config.symbol).toBe('₹');
  });
});

describe('INR Return Limits', () => {
  it('Equity return range is 8-13%', () => {
    const limits = getEquityLimits('INR');
    expect(limits.min).toBe(8);
    expect(limits.max).toBe(13);
    expect(limits.default).toBe(10);
  });

  it('Debt return range is 4-7%', () => {
    const limits = getDebtLimits('INR');
    expect(limits.min).toBe(4);
    expect(limits.max).toBe(7);
    expect(limits.default).toBe(5);
  });
});

describe('Return Constraints', () => {
  it('INR equity return clamped to min', () => {
    expect(constrainEquityReturn(5, 'INR')).toBe(8);
  });

  it('INR equity return clamped to max', () => {
    expect(constrainEquityReturn(20, 'INR')).toBe(13);
  });

  it('INR equity return unchanged when in range', () => {
    expect(constrainEquityReturn(11, 'INR')).toBe(11);
  });

  it('INR debt return clamped to min', () => {
    expect(constrainDebtReturn(1, 'INR')).toBe(4);
  });

  it('INR debt return clamped to max', () => {
    expect(constrainDebtReturn(10, 'INR')).toBe(7);
  });

  it('INR debt return unchanged when in range', () => {
    expect(constrainDebtReturn(5, 'INR')).toBe(5);
  });

  it('Constraint at exact boundary', () => {
    expect(constrainEquityReturn(8, 'INR')).toBe(8);
    expect(constrainEquityReturn(13, 'INR')).toBe(13);
  });
});

describe('Currency Symbols', () => {
  it('INR returns ₹', () => {
    expect(getSymbol('INR')).toBe('₹');
  });

  it('Unknown currency defaults to ₹', () => {
    expect(getSymbol('EUR')).toBe('₹');
  });
});

describe('Currency Formatting', () => {
  it('INR formats with Indian numbering', () => {
    const formatted = formatCurrency(1234567, 'INR');
    expect(formatted).toContain('₹');
    expect(formatted).toContain('12');
  });

  it('formatNumber without currency symbol', () => {
    const formatted = formatNumber(1000000, 'INR');
    expect(formatted).not.toContain('₹');
    expect(formatted).toContain('10');
  });

  it('Handles zero amount', () => {
    const formatted = formatCurrency(0, 'INR');
    expect(formatted).toContain('₹');
    expect(formatted).toContain('0');
  });

  it('Handles negative amount', () => {
    const formatted = formatCurrency(-50000, 'INR');
    expect(formatted).toContain('₹');
    expect(formatted.includes('-') || formatted.includes('(')).toBe(true);
  });

  it('Very large number formatting', () => {
    const formatted = formatCurrency(10000000000, 'INR');
    expect(formatted).toContain('₹');
  });

  it('Decimal amounts', () => {
    const formatted = formatCurrency(1234.56, 'INR');
    expect(formatted).toContain('₹');
  });
});

describe('Fund Recommendations', () => {
  it('INR has fund recommendations', () => {
    const funds = getFunds('INR');
    expect(funds).not.toBeNull();
    expect(funds.icici).toBeDefined();
    expect(funds.hdfc).toBeDefined();
  });

  it('ICICI fund names are correct', () => {
    const funds = getFunds('INR');
    expect(funds.icici.nifty50).toContain('ICICI');
    expect(funds.icici.nifty50).toContain('Nifty 50');
    expect(funds.icici.niftyNext50).toContain('Nifty Next 50');
    expect(funds.icici.moneyMarket).toContain('Money Market');
  });

  it('HDFC fund names are correct', () => {
    const funds = getFunds('INR');
    expect(funds.hdfc.nifty50).toContain('HDFC');
    expect(funds.hdfc.nifty50).toContain('Nifty 50');
  });

  it('ICICI has arbitrage fund', () => {
    const funds = getFunds('INR');
    expect(funds.icici.arbitrage).toContain('Arbitrage');
    expect(funds.icici.arbitrage).toContain('ICICI');
  });

  it('HDFC has arbitrage fund', () => {
    const funds = getFunds('INR');
    expect(funds.hdfc.arbitrage).toContain('Arbitrage');
    expect(funds.hdfc.arbitrage).toContain('HDFC');
  });

  it('INR has generic recommendations', () => {
    const recs = getRecommendations('INR');
    expect(recs.equity).toBeDefined();
    expect(recs.debt).toBeDefined();
    expect(recs.equity).toContain('Index');
  });
});
