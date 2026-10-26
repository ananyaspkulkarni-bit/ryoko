import { describe, it, expect } from 'vitest';
import {
  formatINR,
  convertUsdToInr,
  convertInrToUsd,
  formatUsdWithInr,
  USD_TO_INR_RATE,
} from '../lib/currency';
import { itineraryPlanningEngine } from '../services/itineraryPlanningEngine';

describe('Shared Currency Formatting & INR Conversion', () => {
  describe('formatINR', () => {
    it('formats numbers in Indian numbering system with rupee symbol', () => {
      expect(formatINR(0)).toBe('₹0');
      expect(formatINR(500)).toBe('₹500');
      expect(formatINR(25000)).toBe('₹25,000');
      // Indian numbering system formats 100,000 as 1,00,000
      const formattedLakh = formatINR(100000);
      expect(formattedLakh).toMatch(/₹1,00,000|₹\s*1,00,000/);
    });

    it('handles null, undefined, and NaN gracefully', () => {
      expect(formatINR(null)).toBe('₹0');
      expect(formatINR(undefined)).toBe('₹0');
      expect(formatINR(NaN)).toBe('₹0');
    });

    it('rounds amounts by default without ugly decimals', () => {
      expect(formatINR(1234.56)).toBe('₹1,235');
      expect(formatINR(1234.12)).toBe('₹1,234');
    });
  });

  describe('USD / INR Conversions', () => {
    it('uses the standard benchmark rate of 1 USD = 83 INR', () => {
      expect(USD_TO_INR_RATE).toBe(83);
    });

    it('converts USD to INR accurately', () => {
      expect(convertUsdToInr(100)).toBe(8300);
      expect(convertUsdToInr(22)).toBe(1826); // Louvre entrance $22
      expect(convertUsdToInr(0)).toBe(0);
      expect(convertUsdToInr(null)).toBe(0);
    });

    it('converts INR to USD accurately', () => {
      expect(convertInrToUsd(8300)).toBe(100);
      expect(convertInrToUsd(25000)).toBe(Math.round(25000 / 83));
      expect(convertInrToUsd(0)).toBe(0);
      expect(convertInrToUsd(null)).toBe(0);
    });

    it('formats dual-currency labels honestly', () => {
      const dual = formatUsdWithInr(480);
      expect(dual).toContain('₹39,840');
      expect(dual).toContain('~$480 USD');
    });
  });

  describe('Budget Filtering & Planning Engine Consistency', () => {
    it('preserves mathematical consistency when converting INR budget to USD engine input', () => {
      const inrBudget = 25000;
      const usdBudget = convertInrToUsd(inrBudget);

      // Plan 1 day in Paris for 1 traveller
      const plan = itineraryPlanningEngine.planTrip({
        destinationId: 'paris',
        days: 1,
        travelers: 1,
        budget: usdBudget,
        pace: 'balanced',
        travelStyle: 'culture',
        startDate: '2026-06-01',
      });

      expect(plan).toBeDefined();
      expect(plan.hasVerifiedActivities).toBe(true);
      expect(plan.totalEstimatedCost).toBeLessThanOrEqual(usdBudget);

      // Incurred cost converted to INR should be within the original INR budget
      const incurredInr = convertUsdToInr(plan.totalEstimatedCost);
      expect(incurredInr).toBeLessThanOrEqual(inrBudget);
      expect(formatINR(incurredInr)).toContain('₹');
    });
  });
});
