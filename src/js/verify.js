const API_ENDPOINT = 'https://owuxtbskihhjgngswrrh.supabase.co/functions/v1/get-order';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const selectors = {
  form: 'verify-form',
  input: 'verify-input',
  submit: 'verify-submit',
  feedback: 'verify-feedback',
  resultsSection: 'verification-results',
  imageWrap: 'verify-image-wrap',
  image: 'verify-order-image',
  summaryTitle: 'verify-summary-title',
  partnerCode: 'verify-partner-code',
  partnerName: 'verify-partner-name',
  iso: 'verify-iso',
  orderNumber: 'verify-order-number',
  orderDate: 'verify-order-date',
  salesPerson: 'verify-sales-person',
  manager: 'verify-manager',
  paymentType: 'verify-payment-type',
  deliveredSummary: 'verify-delivered',
  externalEmployees: 'verify-external-employees',
  stoneName: 'verify-stone-name',
  deliveredQuantity: 'verify-delivered-quantity',
  purchasePrice: 'verify-purchase-price',
  marketPrice: 'verify-market-price',
  profitPerCarat: 'verify-profit-per-carat',
  totalProfit: 'verify-total-profit',
  totalProfitFooter: 'verify-total-profit-footer',
  assuranceTitle: 'verify-assurance-title',
  assuranceBody: 'verify-assurance-body',
};

const elements = Object.fromEntries(
  Object.entries(selectors).map(([key, id]) => [key, document.getElementById(id)]),
);

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(numeric);
}

function formatNumber(value, options = {}) {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(numeric);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function setFeedback(message, type = 'info') {
  if (!elements.feedback) return;
  elements.feedback.textContent = message ?? '';

  elements.feedback.classList.remove('text-red-600', 'text-[#0047C1]', 'text-green-600');
  if (!message) {
    return;
  }
  if (type === 'error') {
    elements.feedback.classList.add('text-red-600');
  } else if (type === 'success') {
    elements.feedback.classList.add('text-green-600');
  } else {
    elements.feedback.classList.add('text-[#0047C1]');
  }
}

function setLoading(isLoading) {
  if (!elements.submit) return;
  if (isLoading) {
    elements.submit.disabled = true;
    elements.submit.classList.add('opacity-70', 'cursor-not-allowed');
    elements.submit.textContent = 'Verifying…';
  } else {
    elements.submit.disabled = false;
    elements.submit.classList.remove('opacity-70', 'cursor-not-allowed');
    elements.submit.textContent = 'Verify Contract';
  }
}

function resetResults() {
  if (elements.resultsSection) {
    elements.resultsSection.classList.add('hidden');
  }
  if (elements.imageWrap) {
    elements.imageWrap.classList.add('hidden');
  }
  if (elements.assuranceTitle) {
    elements.assuranceTitle.textContent = 'Assurance Notes';
  }
  if (elements.assuranceBody) {
    elements.assuranceBody.textContent =
      'Submit a contract reference to review assurance notes tied to the dossier.';
  }
  setFeedback('');
}

function populateResults(order) {
  if (!elements.resultsSection) return;

  const setText = (el, value) => {
    if (!el) return;
    el.textContent = value;
  };

  setText(elements.partnerCode, order.partner_code ?? '—');
  setText(elements.partnerName, (order.partner_name ?? '—').toUpperCase());
  setText(elements.iso, order.iso ?? '—');
  setText(elements.orderNumber, order.order_number ?? '—');
  setText(elements.orderDate, formatDate(order.order_date));
  setText(elements.salesPerson, (order.sales_person ?? '—').toUpperCase());
  setText(elements.manager, (order.manager ?? '—').toUpperCase());
  setText(elements.paymentType, (order.payment_type ?? '—').toUpperCase());
  setText(elements.externalEmployees, formatNumber(order.external_employees, { maximumFractionDigits: 0 }));
  const deliveredDisplay = formatNumber(order.quantity_carat, { maximumFractionDigits: 2 });
  if (elements.deliveredSummary) {
    elements.deliveredSummary.textContent = deliveredDisplay !== '—' ? `${deliveredDisplay} carat` : deliveredDisplay;
  }

  const stoneName = order.stone_name ?? 'Gemstones';
  const summaryTitle =
    deliveredDisplay !== '—'
      ? `Distribution of ${deliveredDisplay} carat of ${stoneName}`
      : `Verification of ${stoneName} agreement`;
  setText(elements.summaryTitle, summaryTitle);

  setText(elements.stoneName, stoneName.toUpperCase());
  setText(elements.deliveredQuantity, deliveredDisplay);
  setText(elements.purchasePrice, formatCurrency(order.purchase_price));
  setText(elements.marketPrice, formatCurrency(order.market_selling_price));
  setText(elements.profitPerCarat, formatCurrency(order.profit_per_carat));
  setText(elements.totalProfit, formatCurrency(order.total_profit));
  setText(elements.totalProfitFooter, formatCurrency(order.total_profit));

  if (elements.assuranceTitle || elements.assuranceBody) {
    const partnerLabel = order.partner_name ? order.partner_name.trim() : 'our client';
    const stoneLabel = order.stone_name ? order.stone_name.trim() : 'these gemstones';
    const quantityLabel =
      deliveredDisplay !== '—' ? `${deliveredDisplay} carats` : 'this allocation';

    if (elements.assuranceTitle) {
      elements.assuranceTitle.textContent = `Assurance · ${partnerLabel}`;
    }
    if (elements.assuranceBody) {
      const consultEmailLink = document.createElement('a');
      consultEmailLink.href = 'mailto:consult@jlxgemstones.com';
      consultEmailLink.textContent = 'consult@jlxgemstones.com';
      consultEmailLink.className = 'underline text-white';

      const infoEmailLink = document.createElement('a');
      infoEmailLink.href = 'mailto:info@jlxgemstones.com';
      infoEmailLink.textContent = 'info@jlxgemstones.com';
      infoEmailLink.className = 'underline text-white';

      elements.assuranceBody.textContent = '';
      elements.assuranceBody.append(
        `This dossier confirms the audited distribution of ${quantityLabel} of ${stoneLabel}, reviewed under JLX Gemstones' compliance program. Market valuations align with our current oversight cycle. For clarification, contact our corporate desk at `,
        consultEmailLink,
        ' or ',
        infoEmailLink,
        '.',
      );
    }
  }

  if (elements.imageWrap && elements.image) {
    if (order.user_image_url) {
      elements.image.src = order.user_image_url;
      elements.image.alt = `${stoneName} contract image`;
      elements.imageWrap.classList.remove('hidden');
    } else {
      elements.image.src = '';
      elements.imageWrap.classList.add('hidden');
    }
  }

  elements.resultsSection.classList.remove('hidden');
  elements.resultsSection.classList.add('flex');
}

async function requestOrder(partnerCode) {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(SUPABASE_ANON_KEY
        ? {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          }
        : {}),
    },
    body: JSON.stringify({ partner_code: partnerCode }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    // ignore JSON parse issues, we'll handle below
  }

  if (!response.ok) {
    const message = payload?.error || `Verification failed (${response.status})`;
    throw new Error(message);
  }

  if (!payload?.order) {
    throw new Error('No order data returned.');
  }

  return payload.order;
}

function normalizePartnerCode(value) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-_]+/g, '');
}

function initVerifyForm() {
  const { form, input } = elements;
  if (!form || !input) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const rawCode = input.value ?? '';
    const partnerCode = normalizePartnerCode(rawCode);

    if (!partnerCode) {
      setFeedback('Please enter a contract reference.', 'error');
      return;
    }

    resetResults();
    setFeedback('Verifying contract…');
    setLoading(true);

    try {
      const order = await requestOrder(partnerCode);
      populateResults(order);
      setFeedback('Contract found. Scroll to review the dossier.', 'success');

      if (elements.resultsSection) {
        elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (error) {
      console.error('Verification error:', error);
      setFeedback(error.message ?? 'Unable to verify this contract.', 'error');
    } finally {
      setLoading(false);
    }
  });
}

resetResults();
setFeedback('Enter your contract reference to begin verification.');
initVerifyForm();
