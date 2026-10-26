/**
 * Shared Currency Formatting & Conversion Utilities for Ryoko.
 *
 * Implements standard Indian Rupee (INR / ₹) display formatting using Intl.NumberFormat
 * with locale 'en-IN'. Provides transparent benchmark exchange conversion for mock/external
 * travel data stored in USD so numeric semantics and units remain honest and consistent.
 */

/**
 * Standard benchmark indicative exchange rate for travel cost conversions.
 * 1 USD = 83 INR (standard benchmark).
 */
export const USD_TO_INR_RATE = 83;

/**
 * Formats a numeric amount in Indian Rupees (INR) using Indian numbering system.
 * Example: 25000 -> "₹25,000", 120000 -> "₹1,20,000"
 */
export function formatINR(
  amount: number | undefined | null,
  options: { maximumFractionDigits?: number } = {}
): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  }).format(Math.round(amount));
}

/**
 * Converts a USD amount to INR using the benchmark exchange rate.
 */
export function convertUsdToInr(usdAmount: number | undefined | null): number {
  if (typeof usdAmount !== 'number' || isNaN(usdAmount)) {
    return 0;
  }
  return Math.round(usdAmount * USD_TO_INR_RATE);
}

/**
 * Converts an INR amount to USD using the benchmark exchange rate.
 */
export function convertInrToUsd(inrAmount: number | undefined | null): number {
  if (typeof inrAmount !== 'number' || isNaN(inrAmount)) {
    return 0;
  }
  return Math.round(inrAmount / USD_TO_INR_RATE);
}

/**
 * Formats a USD amount as primary INR with the original USD estimate clearly indicated.
 * Example: 480 -> "₹39,840 (~$480 USD)"
 */
export function formatUsdWithInr(usdAmount: number | undefined | null): string {
  if (typeof usdAmount !== 'number' || isNaN(usdAmount)) {
    return '₹0';
  }
  const inr = convertUsdToInr(usdAmount);
  return `${formatINR(inr)} (~$${usdAmount} USD)`;
}
