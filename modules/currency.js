// Currency configuration with historical return limits (post-tax)
// Currently only supports INR
export const currencyConfig = {
  INR: {
    symbol: '₹',
    locale: 'en-IN',
    equity: {
      min: 8,
      max: 13,
      default: 10,
      labels: { '8-9': 'Conservative', '10-11': 'Realistic', '12-13': 'Optimistic' }
    },
    debt: {
      min: 4,
      max: 7,
      default: 5,
      labels: { '4': 'Conservative', '5-6': 'Realistic', '7': 'Optimistic' }
    },
    recommendations: {
      equity: 'Nifty 50 / Nifty Total Market Index Fund',
      debt: 'Money Market / Liquid Funds'
    }
  }
};

export function getCurrencyConfig(currency) {
  return currencyConfig[currency] || currencyConfig.INR;
}

export function formatCurrency(amount, currency) {
  const config = getCurrencyConfig(currency);
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatNumber(amount, currency) {
  const config = getCurrencyConfig(currency);
  return new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function getSymbol(currency) {
  return getCurrencyConfig(currency).symbol;
}

export function formatCompact(amount, currency) {
  const symbol = getSymbol(currency);
  const fmt = (n) => parseFloat(n.toFixed(2)).toString();
  if (amount >= 10000000) return `${symbol}${fmt(amount / 10000000)} Crore`;
  if (amount >= 100000) return `${symbol}${fmt(amount / 100000)} Lakhs`;
  if (amount >= 1000) return `${symbol}${fmt(amount / 1000)}K`;
  return `${symbol}${amount}`;
}

export function getRecommendations(currency) {
  return getCurrencyConfig(currency).recommendations;
}

export function getEquityLimits(currency) {
  return getCurrencyConfig(currency).equity;
}

export function getDebtLimits(currency) {
  return getCurrencyConfig(currency).debt;
}

/**
 * Parse a currency input value (strips commas) and returns a number.
 * Returns NaN for empty/invalid input to preserve existing validation.
 */
export function parseCurrencyInput(value) {
  if (typeof value === 'number') return value;
  const stripped = String(value).replace(/,/g, '').trim();
  if (stripped === '') return NaN;
  return parseFloat(stripped);
}

/**
 * Wire up a text input for live Indian comma formatting + words display.
 * Expects input type="text" with inputmode="numeric".
 */
export function setupCurrencyInput(inputEl, wordsEl, numberToWordsFn, curr) {
  inputEl.addEventListener('input', () => {
    const raw = inputEl.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      inputEl.value = '';
      wordsEl.textContent = '';
      return;
    }
    const num = parseInt(raw) || 0;
    const cursorPos = inputEl.selectionStart;
    const oldLen = inputEl.value.length;
    inputEl.value = formatNumber(num, curr);
    const newLen = inputEl.value.length;
    const newCursor = Math.max(0, cursorPos + (newLen - oldLen));
    inputEl.setSelectionRange(newCursor, newCursor);
    wordsEl.textContent = num > 0 ? numberToWordsFn(num) : '';
  });
  // Initialize words for pre-populated values
  const initNum = parseFloat(inputEl.value.replace(/,/g, '')) || 0;
  if (initNum > 0) {
    wordsEl.textContent = numberToWordsFn(initNum);
  }
}

// Constrain return value to currency limits
export function constrainEquityReturn(value, currency) {
  const limits = getEquityLimits(currency);
  return Math.min(Math.max(value, limits.min), limits.max);
}

export function constrainDebtReturn(value, currency) {
  const limits = getDebtLimits(currency);
  return Math.min(Math.max(value, limits.min), limits.max);
}
