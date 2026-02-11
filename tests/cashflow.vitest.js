// Tests for cashflow module - savings rate calculations
import { describe, it, expect } from 'vitest';
import { getSavingsRate, getSavingsRateLabel, shouldShowSavingsSuggestion } from '../modules/cashflow.js';

describe('Savings Rate Calculation', () => {
  describe('getSavingsRate', () => {
    it('returns 0 when income is 0', () => {
      expect(getSavingsRate(0, 0)).toBe(0);
    });

    it('returns 0 when income is negative', () => {
      expect(getSavingsRate(-1000, 500)).toBe(0);
    });

    it('calculates correct rate for positive values', () => {
      expect(getSavingsRate(100000, 60000)).toBe(60);
    });

    it('calculates correct rate when expenses exceed income', () => {
      expect(getSavingsRate(100000, -20000)).toBe(-20);
    });

    it('rounds to nearest integer', () => {
      expect(getSavingsRate(100000, 33333)).toBe(33);
      expect(getSavingsRate(100000, 33500)).toBe(34);
    });

    it('returns 100 when no expenses', () => {
      expect(getSavingsRate(100000, 100000)).toBe(100);
    });

    it('includes EPF/NPS in gross income and savings', () => {
      // In-hand 100K, net cashflow 40K, EPF/NPS 15K
      // Gross = 115K, total savings = 55K, rate = 55/115 = 47.8% → 48%
      expect(getSavingsRate(100000, 40000, 15000)).toBe(48);
    });

    it('returns unchanged rate when EPF/NPS is 0', () => {
      // In-hand 100K, net cashflow 60K, EPF/NPS 0
      // Gross = 100K, total savings = 60K, rate = 60%
      expect(getSavingsRate(100000, 60000, 0)).toBe(60);
    });

    it('handles case where only EPF/NPS makes savings positive', () => {
      // In-hand 100K, net cashflow -5K (expenses exceed income), EPF/NPS 20K
      // Gross = 120K, total savings = 15K, rate = 15/120 = 12.5% → 13%
      expect(getSavingsRate(100000, -5000, 20000)).toBe(13);
    });

    it('returns 0 when in-hand income is 0 but EPF/NPS is also 0', () => {
      expect(getSavingsRate(0, 0, 0)).toBe(0);
    });

    it('handles case where in-hand income is 0 but EPF/NPS exists', () => {
      // In-hand 0, net cashflow 0, EPF/NPS 10K
      // Gross = 10K, total savings = 10K, rate = 100%
      expect(getSavingsRate(0, 0, 10000)).toBe(100);
    });
  });

  describe('getSavingsRateLabel', () => {
    it('returns Excellent for >= 60%', () => {
      expect(getSavingsRateLabel(60)).toEqual({ label: 'Excellent', level: 'excellent' });
      expect(getSavingsRateLabel(75)).toEqual({ label: 'Excellent', level: 'excellent' });
      expect(getSavingsRateLabel(100)).toEqual({ label: 'Excellent', level: 'excellent' });
    });

    it('returns Good for 40-59%', () => {
      expect(getSavingsRateLabel(40)).toEqual({ label: 'Good', level: 'good' });
      expect(getSavingsRateLabel(50)).toEqual({ label: 'Good', level: 'good' });
      expect(getSavingsRateLabel(59)).toEqual({ label: 'Good', level: 'good' });
    });

    it('returns Reasonable for 30-39%', () => {
      expect(getSavingsRateLabel(30)).toEqual({ label: 'Reasonable', level: 'reasonable' });
      expect(getSavingsRateLabel(35)).toEqual({ label: 'Reasonable', level: 'reasonable' });
      expect(getSavingsRateLabel(39)).toEqual({ label: 'Reasonable', level: 'reasonable' });
    });

    it('returns Poor for < 30%', () => {
      expect(getSavingsRateLabel(29)).toEqual({ label: 'Poor', level: 'poor' });
      expect(getSavingsRateLabel(10)).toEqual({ label: 'Poor', level: 'poor' });
      expect(getSavingsRateLabel(0)).toEqual({ label: 'Poor', level: 'poor' });
      expect(getSavingsRateLabel(-10)).toEqual({ label: 'Poor', level: 'poor' });
    });

    it('handles boundary values correctly', () => {
      // 59 should be Good, 60 should be Excellent
      expect(getSavingsRateLabel(59).label).toBe('Good');
      expect(getSavingsRateLabel(60).label).toBe('Excellent');

      // 39 should be Reasonable, 40 should be Good
      expect(getSavingsRateLabel(39).label).toBe('Reasonable');
      expect(getSavingsRateLabel(40).label).toBe('Good');

      // 29 should be Poor, 30 should be Reasonable
      expect(getSavingsRateLabel(29).label).toBe('Poor');
      expect(getSavingsRateLabel(30).label).toBe('Reasonable');
    });
  });

  describe('shouldShowSavingsSuggestion', () => {
    it('returns false when income is 0', () => {
      expect(shouldShowSavingsSuggestion(0, 30)).toBe(false);
    });

    it('returns false when savings rate >= 40%', () => {
      expect(shouldShowSavingsSuggestion(100000, 40)).toBe(false);
      expect(shouldShowSavingsSuggestion(100000, 50)).toBe(false);
      expect(shouldShowSavingsSuggestion(100000, 60)).toBe(false);
    });

    it('returns true when savings rate < 40% and income > 0', () => {
      expect(shouldShowSavingsSuggestion(100000, 39)).toBe(true);
      expect(shouldShowSavingsSuggestion(100000, 30)).toBe(true);
      expect(shouldShowSavingsSuggestion(100000, 20)).toBe(true);
      expect(shouldShowSavingsSuggestion(100000, 0)).toBe(true);
    });

    it('returns true for negative savings rate', () => {
      expect(shouldShowSavingsSuggestion(100000, -10)).toBe(true);
    });

    it('handles boundary at 40% correctly', () => {
      expect(shouldShowSavingsSuggestion(100000, 39)).toBe(true);
      expect(shouldShowSavingsSuggestion(100000, 40)).toBe(false);
    });
  });
});
