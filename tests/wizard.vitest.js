import { describe, it, expect } from 'vitest';
import { numberToWords, WIZARD_STEPS, getRetirementAgeBounds } from '../modules/wizard.js';

describe('numberToWords', () => {
  describe('Basic numbers', () => {
    it('returns Zero for 0', () => {
      expect(numberToWords(0)).toBe('Zero');
    });

    it('handles single digits', () => {
      expect(numberToWords(1)).toBe('One');
      expect(numberToWords(5)).toBe('Five');
      expect(numberToWords(9)).toBe('Nine');
    });

    it('handles teens', () => {
      expect(numberToWords(10)).toBe('Ten');
      expect(numberToWords(11)).toBe('Eleven');
      expect(numberToWords(15)).toBe('Fifteen');
      expect(numberToWords(19)).toBe('Nineteen');
    });

    it('handles tens', () => {
      expect(numberToWords(20)).toBe('Twenty');
      expect(numberToWords(30)).toBe('Thirty');
      expect(numberToWords(50)).toBe('Fifty');
      expect(numberToWords(90)).toBe('Ninety');
    });

    it('handles two-digit numbers', () => {
      expect(numberToWords(21)).toBe('Twenty One');
      expect(numberToWords(42)).toBe('Forty Two');
      expect(numberToWords(99)).toBe('Ninety Nine');
    });
  });

  describe('Hundreds', () => {
    it('handles exact hundreds', () => {
      expect(numberToWords(100)).toBe('One Hundred');
      expect(numberToWords(500)).toBe('Five Hundred');
      expect(numberToWords(900)).toBe('Nine Hundred');
    });

    it('handles hundreds with remainder', () => {
      expect(numberToWords(101)).toBe('One Hundred One');
      expect(numberToWords(115)).toBe('One Hundred Fifteen');
      expect(numberToWords(250)).toBe('Two Hundred Fifty');
      expect(numberToWords(999)).toBe('Nine Hundred Ninety Nine');
    });
  });

  describe('Thousands (Indian numbering)', () => {
    it('handles exact thousands', () => {
      expect(numberToWords(1000)).toBe('One Thousand');
      expect(numberToWords(5000)).toBe('Five Thousand');
      expect(numberToWords(10000)).toBe('Ten Thousand');
      expect(numberToWords(50000)).toBe('Fifty Thousand');
    });

    it('handles thousands with remainder', () => {
      expect(numberToWords(1500)).toBe('One Thousand Five Hundred');
      expect(numberToWords(12345)).toBe('Twelve Thousand Three Hundred Forty Five');
      expect(numberToWords(99999)).toBe('Ninety Nine Thousand Nine Hundred Ninety Nine');
    });
  });

  describe('Lakhs (Indian numbering)', () => {
    it('handles exact lakhs', () => {
      expect(numberToWords(100000)).toBe('One Lakh');
      expect(numberToWords(500000)).toBe('Five Lakh');
      expect(numberToWords(1000000)).toBe('Ten Lakh');
    });

    it('handles lakhs with remainder', () => {
      expect(numberToWords(150000)).toBe('One Lakh Fifty Thousand');
      expect(numberToWords(250000)).toBe('Two Lakh Fifty Thousand');
      expect(numberToWords(1234567)).toBe('Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven');
    });

    it('handles common salary amounts', () => {
      expect(numberToWords(50000)).toBe('Fifty Thousand');
      expect(numberToWords(75000)).toBe('Seventy Five Thousand');
      expect(numberToWords(125000)).toBe('One Lakh Twenty Five Thousand');
      expect(numberToWords(200000)).toBe('Two Lakh');
    });
  });

  describe('Crores (Indian numbering)', () => {
    it('handles exact crores', () => {
      expect(numberToWords(10000000)).toBe('One Crore');
      expect(numberToWords(50000000)).toBe('Five Crore');
      expect(numberToWords(100000000)).toBe('Ten Crore');
    });

    it('handles crores with remainder', () => {
      expect(numberToWords(15000000)).toBe('One Crore Fifty Lakh');
      expect(numberToWords(12500000)).toBe('One Crore Twenty Five Lakh');
      expect(numberToWords(10000001)).toBe('One Crore One');
    });

    it('handles large amounts', () => {
      expect(numberToWords(25000000)).toBe('Two Crore Fifty Lakh');
      expect(numberToWords(99999999)).toBe('Nine Crore Ninety Nine Lakh Ninety Nine Thousand Nine Hundred Ninety Nine');
    });
  });

  describe('getRetirementAgeBounds', () => {
    it('age 30 → min 40, max 55, default 45', () => {
      expect(getRetirementAgeBounds(30)).toEqual({ min: 40, max: 55, defaultValue: 45 });
    });

    it('age 45 → min 46, max 55, default 50 (age+5=50)', () => {
      expect(getRetirementAgeBounds(45)).toEqual({ min: 46, max: 55, defaultValue: 50 });
    });

    it('age 50 → min 51, max 60, default 55 (age+5=55)', () => {
      expect(getRetirementAgeBounds(50)).toEqual({ min: 51, max: 60, defaultValue: 55 });
    });

    it('age 55 → min 56, max 65, default 60', () => {
      expect(getRetirementAgeBounds(55)).toEqual({ min: 56, max: 65, defaultValue: 60 });
    });

    it('age 60 → min 61, max 70, default 65 (upper end of age dropdown)', () => {
      expect(getRetirementAgeBounds(60)).toEqual({ min: 61, max: 70, defaultValue: 65 });
    });

    it('age 18 → min 40, max 55, default 45', () => {
      expect(getRetirementAgeBounds(18)).toEqual({ min: 40, max: 55, defaultValue: 45 });
    });

    it('age 39 → min 40, max 55, default 45 (age+5=44 < 45 floor)', () => {
      expect(getRetirementAgeBounds(39)).toEqual({ min: 40, max: 55, defaultValue: 45 });
    });

    it('default is always at least 5 years from age when range allows', () => {
      for (let age = 18; age <= 60; age++) {
        const { min, max, defaultValue } = getRetirementAgeBounds(age);
        expect(defaultValue).toBeGreaterThanOrEqual(min);
        expect(defaultValue).toBeLessThanOrEqual(max);
        // At least 5 years gap, unless the range is too small (max < age+5)
        if (age + 5 <= max) {
          expect(defaultValue).toBeGreaterThanOrEqual(age + 5);
        }
      }
    });
  });

  describe('Conditional step visibility', () => {
    const homeLoanStep = WIZARD_STEPS.find(s => s.id === 'homeLoan');

    it('home loan step is visible when housing is ownWithLoan', () => {
      expect(homeLoanStep.showIf({ housing: 'ownWithLoan' })).toBe(true);
    });

    it('home loan step is hidden when housing is renting', () => {
      expect(homeLoanStep.showIf({ housing: 'renting' })).toBe(false);
    });

    it('home loan step is hidden when housing is ownNoLoan', () => {
      expect(homeLoanStep.showIf({ housing: 'ownNoLoan' })).toBe(false);
    });

    it('home loan step is hidden when housing is rentingToBuy', () => {
      expect(homeLoanStep.showIf({ housing: 'rentingToBuy' })).toBe(false);
    });

    it('home loan step has two fields', () => {
      expect(homeLoanStep.fields).toHaveLength(2);
      expect(homeLoanStep.fields[0].field).toBe('homeLoanEmi');
      expect(homeLoanStep.fields[1].field).toBe('homeLoanOutstanding');
    });
  });

  describe('Edge cases', () => {
    it('returns empty string for null/undefined/NaN', () => {
      expect(numberToWords(null)).toBe('');
      expect(numberToWords(undefined)).toBe('');
      expect(numberToWords(NaN)).toBe('');
    });

    it('handles typical wizard input values', () => {
      // Monthly income range
      expect(numberToWords(20000)).toBe('Twenty Thousand');
      expect(numberToWords(2000000)).toBe('Twenty Lakh');

      // EPF/PPF corpus
      expect(numberToWords(5000000)).toBe('Fifty Lakh');

      // Equity MF / Stocks
      expect(numberToWords(10000000)).toBe('One Crore');
    });
  });
});
