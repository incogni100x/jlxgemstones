import { supabase } from './client.js';
import {
  requireAdminAuth,
  clearAdminSession,
  setSessionLoading,
  clearSessionLoading,
} from './session.js';

const TABLE_NAME = 'team_roles';
const EDGE_FUNCTION_URL = 'https://owuxtbskihhjgngswrrh.supabase.co/functions/v1/role-create';
const ORDER_FUNCTION_URL = 'https://owuxtbskihhjgngswrrh.supabase.co/functions/v1/create-order';
const ORDERS_TABLE = 'orders';

let rolesCache = [];
let currentEditingId = null;
let ordersCache = [];
let currentOrderId = null;

function renderEmptyState(container) {
  container.innerHTML = `
    <div class="border border-dashed border-slate-300 rounded-lg bg-slate-50 p-8 text-center text-slate-500">
      No roles have been added yet. Use the form above to create your first entry.
    </div>
  `;
}

function escapeHtml(value) {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderRoles(container, records) {
  if (!records || records.length === 0) {
    renderEmptyState(container);
    return;
  }

  rolesCache = records;

  container.innerHTML = records
    .map(
      (role) => `
        <article class="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row" data-role-id="${escapeHtml(role.id)}">
          <img src="${escapeHtml(role.image_url ?? '')}" alt="${escapeHtml(role.member_name ?? role.role_title ?? 'Role image')}" class="h-40 w-full rounded-md border border-slate-200 bg-slate-50 object-cover sm:w-40" onerror="this.src='https://via.placeholder.com/160x160?text=Image'" />
          <div class="flex-1">
            <h3 class="text-xl font-semibold text-slate-900">${escapeHtml(role.member_name ?? role.role_title ?? 'Untitled Role')}</h3>
            <p class="mt-1 text-sm font-medium text-primary">${escapeHtml(role.member_role ?? role.created_by_email ?? 'Specialist')}</p>
            <p class="mt-3 text-sm leading-relaxed text-slate-600 whitespace-pre-line">${escapeHtml(role.member_description ?? role.role_description ?? '')}</p>
            <div class="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>Created ${new Date(role.created_at ?? Date.now()).toLocaleString()}</span>
              <div class="flex items-center gap-2">
                <button type="button" class="edit-role-btn inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100" data-role-id="${escapeHtml(role.id)}">
                  Edit
                </button>
                <button type="button" class="delete-role-btn inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50" data-role-id="${escapeHtml(role.id)}">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </article>
      `,
    )
    .join('');
}

async function fetchRoles(container) {
  const loadingEl = document.getElementById('roles-loading-state');
  if (loadingEl) loadingEl.classList.remove('hidden');

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('created_at', { ascending: false });

  if (loadingEl) loadingEl.classList.add('hidden');

  if (error) {
    console.error('Failed to load roles:', error);
    container.innerHTML = `
      <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Unable to fetch roles at the moment. Please try again later.
      </div>
    `;
    return;
  }

  renderRoles(container, data ?? []);
}

async function handleRoleFormSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitBtn = document.getElementById('role-submit-btn');
  const memberName = form.memberName.value.trim();
  const memberRole = form.memberRole.value.trim();
  const memberDescription = form.memberDescription.value.trim();
  const fileInput = form.roleImage;
  const file = fileInput?.files?.[0] ?? null;
  const roleIdInput = document.getElementById('roleId');
  const statusEl = document.getElementById('role-form-status');

  const isEditing = Boolean(roleIdInput?.value);

  if (!memberName || !memberRole || !memberDescription) {
    statusEl.textContent = 'Please fill in name, role, and description.';
    statusEl.className = 'text-sm text-red-600';
    return;
  }

  if (!isEditing && !file) {
    statusEl.textContent = 'Please select an image before uploading.';
    statusEl.className = 'text-sm text-red-600';
    return;
  }

  try {
    setSessionLoading(submitBtn, isEditing ? 'Updating…' : 'Saving…');
    statusEl.textContent = '';

    if (isEditing) {
      await updateRole(roleIdInput.value, {
        member_name: memberName,
        member_role: memberRole,
        member_description: memberDescription,
      });
    } else {
      await createRoleViaEdge({
        memberName,
        memberRole,
        memberDescription,
        file,
      });
    }

    form.reset();
    if (roleIdInput) roleIdInput.value = '';
    exitEditMode();
    statusEl.textContent = isEditing ? 'Role updated successfully!' : 'Role added successfully!';
    statusEl.className = 'text-sm text-green-600';

    const rolesContainer = document.getElementById('roles-container');
    if (rolesContainer) {
      await fetchRoles(rolesContainer);
    }
  } catch (error) {
    console.error('Failed to save role:', error);
    statusEl.textContent = error.message ?? 'Something went wrong.';
    statusEl.className = 'text-sm text-red-600';
  } finally {
    clearSessionLoading(submitBtn);
  }
}

async function createRoleViaEdge({ memberName, memberRole, memberDescription, file }) {
  if (!file) throw new Error('Image file is required');

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('Authentication required. Please log in again.');
  }

  const formData = new FormData();
  formData.append('memberName', memberName);
  formData.append('memberRole', memberRole);
  formData.append('memberDescription', memberDescription);
  formData.append('file', file, file.name);

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let message = `Upload failed (${response.status})`;
    try {
      const payload = await response.json();
      if (payload?.error) {
        message = payload.error;
      }
    } catch (error) {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  return response.json();
}

function initLogoutButton() {
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async () => {
    try {
      logoutBtn.disabled = true;
      logoutBtn.textContent = 'Signing out…';
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAdminSession();
      window.location.href = '/admin-login';
    }
  });
}

function enterEditMode(role) {
  const form = document.getElementById('role-form');
  if (!form) return;

  currentEditingId = role.id;
  form.memberName.value = role.member_name ?? role.role_title ?? '';
  form.memberRole.value = role.member_role ?? role.created_by_email ?? '';
  form.memberDescription.value = role.member_description ?? role.role_description ?? '';

  const roleIdInput = document.getElementById('roleId');
  if (roleIdInput) roleIdInput.value = role.id;

  const submitBtn = document.getElementById('role-submit-btn');
  if (submitBtn) submitBtn.textContent = 'Update role';

  const cancelBtn = document.getElementById('cancel-edit-btn');
  if (cancelBtn) cancelBtn.classList.remove('hidden');

  const statusEl = document.getElementById('role-form-status');
  if (statusEl) {
    statusEl.textContent = 'Editing existing team member. Save changes or cancel to exit.';
    statusEl.className = 'text-sm text-primary';
  }
}

function exitEditMode() {
  const form = document.getElementById('role-form');
  if (!form) return;

  form.reset();
  const roleIdInput = document.getElementById('roleId');
  if (roleIdInput) roleIdInput.value = '';

  const submitBtn = document.getElementById('role-submit-btn');
  if (submitBtn) submitBtn.textContent = 'Save role';

  const cancelBtn = document.getElementById('cancel-edit-btn');
  if (cancelBtn) cancelBtn.classList.add('hidden');

  const statusEl = document.getElementById('role-form-status');
  if (statusEl) {
    statusEl.textContent = '';
    statusEl.className = 'text-sm text-slate-500';
  }

  currentEditingId = null;
}

async function updateRole(id, payload) {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update(payload)
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

async function deleteRole(id) {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

function initTabs() {
  const tabButtons = Array.from(document.querySelectorAll('.tab-button'));
  const panels = Array.from(document.querySelectorAll('[data-tab-panel]'));
  if (tabButtons.length === 0 || panels.length === 0) return;

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.tabTarget;
      tabButtons.forEach((btn) => {
        btn.classList.toggle('active', btn === button);
        if (btn.classList.contains('active')) {
          btn.classList.add('text-primary', 'border-primary');
          btn.classList.remove('text-slate-500');
        } else {
          btn.classList.remove('text-primary', 'border-primary');
          btn.classList.add('text-slate-500');
        }
      });

      panels.forEach((panel) => {
        const isActive = panel.dataset.tabPanel === target;
        panel.classList.toggle('hidden', !isActive);
      });
    });
  });
}

// Contract form handlers
function calculateContractProfit() {
  const quantityInput = document.getElementById('contractDelivered');
  const purchaseInput = document.getElementById('contractPurchasePrice');
  const marketInput = document.getElementById('contractMarketPrice');
  const profitPerCaratInput = document.getElementById('contractProfitPerCarat');
  const totalProfitInput = document.getElementById('contractTotalProfit');

  if (!quantityInput || !purchaseInput || !marketInput || !profitPerCaratInput || !totalProfitInput) return;

  const quantity = parseFloat(quantityInput.value.replace(/,/g, '')) || 0;
  const purchasePrice = parseFloat(purchaseInput.value.replace(/,/g, '')) || 0;
  const marketPrice = parseFloat(marketInput.value.replace(/,/g, '')) || 0;

  if (quantity > 0 && purchasePrice > 0 && marketPrice > 0) {
    const profitPerCarat = marketPrice - purchasePrice;
    const totalProfit = profitPerCarat * quantity;

    profitPerCaratInput.value = `$${profitPerCarat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    totalProfitInput.value = `$${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else {
    profitPerCaratInput.value = '';
    totalProfitInput.value = '';
  }
}

const sanitizeNumberString = (value) => (value ?? '').toString().replace(/,/g, '').trim();

function formatNumber(value, options = {}) {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  }).format(numeric);
}

function renderOrders(container, records) {
  if (!records || records.length === 0) {
    container.innerHTML = `
      <div class="border border-dashed border-slate-300 rounded-lg bg-slate-50 p-8 text-center text-slate-500">
        No orders yet. Create one using the form above.
      </div>
    `;
    return;
  }

  ordersCache = records;

  container.innerHTML = records
    .map(
      (order) => `
        <article class="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" data-order-id="${order.id}">
          <header class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="text-xs uppercase tracking-[0.22em] text-slate-400">${order.order_number ?? ''}</p>
              <h3 class="text-lg font-semibold text-slate-900">${order.partner_name ?? '—'}</h3>
              <p class="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-primary">
                Delivered ${formatNumber(order.quantity_carat)} ct
              </p>
            </div>
            <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">${order.partner_code ?? '—'}</span>
          </header>

          <dl class="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <dt class="font-medium text-slate-700">Order date</dt>
              <dd>${order.order_date ?? '—'}</dd>
            </div>
            <div>
              <dt class="font-medium text-slate-700">Payment type</dt>
              <dd>${order.payment_type ?? '—'}</dd>
            </div>
            <div>
              <dt class="font-medium text-slate-700">Quantity (ct)</dt>
              <dd>${order.quantity_carat ?? '—'}</dd>
            </div>
            <div>
              <dt class="font-medium text-slate-700">Purchase price</dt>
              <dd>${order.purchase_price ?? '—'}</dd>
            </div>
            <div>
              <dt class="font-medium text-slate-700">Market price</dt>
              <dd>${order.market_selling_price ?? '—'}</dd>
            </div>
            <div>
              <dt class="font-medium text-slate-700">Sales person</dt>
              <dd>${order.sales_person ?? '—'}</dd>
            </div>
            <div>
              <dt class="font-medium text-slate-700">Manager</dt>
              <dd>${order.manager ?? '—'}</dd>
            </div>
          </dl>

          ${order.user_image_url ? `<img src="${order.user_image_url}" alt="${order.partner_name ?? 'Partner'} image" class="h-24 w-24 rounded-md border border-slate-200 object-cover" />` : ''}

          <div class="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-400">
            <span>Updated ${order.updated_at ? new Date(order.updated_at).toLocaleString() : '—'}</span>
            <button type="button" class="edit-order-btn inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100" data-order-id="${order.id}">
              Edit
            </button>
          </div>
        </article>
      `,
    )
    .join('');
}

async function fetchOrders(container) {
  const loadingEl = document.getElementById('orders-loading-state');
  try {
    if (loadingEl) loadingEl.classList.remove('hidden');

    const { data, error } = await supabase
      .from(ORDERS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    renderOrders(container, data ?? []);
  } catch (error) {
    console.error('Failed to load orders:', error);
    container.innerHTML = `
      <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Unable to fetch orders. Please try again later.
      </div>
    `;
  } finally {
    if (loadingEl) loadingEl.classList.add('hidden');
  }
}

function enterContractEditMode(order) {
  const form = document.getElementById('contract-form');
  if (!form) return;

  currentOrderId = order.id;
  const orderIdInput = document.getElementById('contractOrderId');
  if (orderIdInput) orderIdInput.value = order.id;

  form.contractDate.value = order.order_date ?? '';
  form.contractPartnerName.value = order.partner_name ?? '';
  form.contractISO.value = order.iso ?? '';
  form.contractSalesPerson.value = order.sales_person ?? '';
  form.contractManager.value = order.manager ?? '';
  form.contractPaymentType.value = order.payment_type ?? '';
  form.contractDelivered.value = order.quantity_carat ?? '';
  form.contractExternalEmployees.value = order.external_employees ?? '';
  form.contractStoneName.value = order.stone_name ?? '';
  form.contractPurchasePrice.value = order.purchase_price ?? '';
  form.contractMarketPrice.value = order.market_selling_price ?? '';

  const partnerCodeWrap = document.getElementById('contractPartnerCodeWrap');
  const partnerCodeValue = document.getElementById('contractPartnerCodeValue');
  if (partnerCodeWrap && partnerCodeValue) {
    partnerCodeValue.textContent = order.partner_code ?? '—';
    partnerCodeWrap.classList.remove('hidden');
  }

  const submitBtn = document.getElementById('contract-submit-btn');
  if (submitBtn) submitBtn.textContent = 'Update contract';

  const statusEl = document.getElementById('contract-form-status');
  if (statusEl) {
    statusEl.textContent = 'Editing existing contract. Save changes or clear the form to exit edit mode.';
    statusEl.className = 'text-sm text-primary';
  }
}

function exitContractEditMode() {
  const form = document.getElementById('contract-form');
  if (!form) return;

  currentOrderId = null;
  const orderIdInput = document.getElementById('contractOrderId');
  if (orderIdInput) orderIdInput.value = '';

  form.reset();
  const profitFields = ['contractProfitPerCarat', 'contractTotalProfit'];
  profitFields.forEach((id) => {
    const field = document.getElementById(id);
    if (field) field.value = '';
  });

  const partnerCodeWrap = document.getElementById('contractPartnerCodeWrap');
  if (partnerCodeWrap) partnerCodeWrap.classList.add('hidden');

  const submitBtn = document.getElementById('contract-submit-btn');
  if (submitBtn) submitBtn.textContent = 'Save contract';

  const statusEl = document.getElementById('contract-form-status');
  if (statusEl) {
    statusEl.textContent = '';
    statusEl.className = 'text-sm text-slate-500';
  }
}

function initContractForm() {
  const form = document.getElementById('contract-form');
  const resetBtn = document.getElementById('contract-reset-btn');

  if (!form) return;

  // Auto-calculate profit on input
  const quantityInput = document.getElementById('contractDelivered');
  const purchaseInput = document.getElementById('contractPurchasePrice');
  const marketInput = document.getElementById('contractMarketPrice');

  if (quantityInput) quantityInput.addEventListener('input', calculateContractProfit);
  if (purchaseInput) purchaseInput.addEventListener('input', calculateContractProfit);
  if (marketInput) marketInput.addEventListener('input', calculateContractProfit);

  // Form submission
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const statusEl = document.getElementById('contract-form-status');
    const submitBtn = form.querySelector('button[type="submit"]');
    const orderIdInput = document.getElementById('contractOrderId');
    const isEditing = Boolean(orderIdInput?.value);

    try {
      setSessionLoading(submitBtn, isEditing ? 'Updating…' : 'Creating order…');
      statusEl.textContent = '';

      if (isEditing) {
        const updatePayload = {
          order_date: form.contractDate.value,
          partner_name: form.contractPartnerName.value.trim(),
          iso: form.contractISO.value.trim(),
          sales_person: form.contractSalesPerson.value.trim(),
          manager: form.contractManager.value.trim(),
          payment_type: form.contractPaymentType.value,
          external_employees: parseInt(sanitizeNumberString(form.contractExternalEmployees.value), 10) || 0,
          stone_name: form.contractStoneName.value.trim(),
          quantity_carat: parseFloat(sanitizeNumberString(form.contractDelivered.value)) || 0,
          purchase_price: parseFloat(sanitizeNumberString(form.contractPurchasePrice.value)) || 0,
          market_selling_price: parseFloat(sanitizeNumberString(form.contractMarketPrice.value)) || 0,
        };

        const { data, error } = await supabase
          .from(ORDERS_TABLE)
          .update(updatePayload)
          .eq('id', orderIdInput.value)
          .select()
          .maybeSingle();

        if (error) {
          throw error;
        }

        statusEl.textContent = 'Contract updated successfully!';
        statusEl.className = 'text-sm text-green-600';

        const ordersContainer = document.getElementById('orders-container');
        if (ordersContainer) {
          await fetchOrders(ordersContainer);
        }

        exitContractEditMode();
        return;
      }

      // Create new order via edge function
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Authentication required. Please log in again.');
      }

      const formData = new FormData();
      formData.append('order_date', form.contractDate.value);
      formData.append('partner_name', form.contractPartnerName.value.trim());

      const iso = form.contractISO.value.trim();
      if (iso) {
        formData.append('iso', iso);
      }

      formData.append('sales_person', form.contractSalesPerson.value.trim());
      formData.append('manager', form.contractManager.value.trim());
      formData.append('payment_type', form.contractPaymentType.value);
      formData.append('external_employees', sanitizeNumberString(form.contractExternalEmployees.value));
      formData.append('stone_name', form.contractStoneName.value.trim());
      formData.append('quantity_carat', sanitizeNumberString(form.contractDelivered.value));
      formData.append('purchase_price', sanitizeNumberString(form.contractPurchasePrice.value));
      formData.append('market_selling_price', sanitizeNumberString(form.contractMarketPrice.value));

      const imageFile = form.contractImage.files?.[0];
      if (imageFile) {
        formData.append('user_image', imageFile, imageFile.name);
      }

      const profitPerCarat = form.contractProfitPerCarat.value.trim();
      if (profitPerCarat) {
        formData.append('profit_preview', profitPerCarat);
      }

      const totalProfit = form.contractTotalProfit.value.trim();
      if (totalProfit) {
        formData.append('total_profit_preview', totalProfit);
      }

      const response = await fetch(ORDER_FUNCTION_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      let result = null;
      try {
        result = await response.json();
      } catch (parseError) {
        // Ignore JSON parse issues; we'll surface a generic message below.
      }

      if (!response.ok) {
        const message = result?.error || `Order creation failed (${response.status})`;
        throw new Error(message);
      }

      const partnerCodeResponse = result?.order?.partner_code ?? '';
      statusEl.textContent = partnerCodeResponse
        ? `Contract created successfully! Partner code ${partnerCodeResponse}`
        : 'Contract created successfully!';
      statusEl.className = 'text-sm text-green-600';

      form.reset();
      const profitFields = ['contractProfitPerCarat', 'contractTotalProfit'];
      profitFields.forEach((id) => {
        const field = document.getElementById(id);
        if (field) field.value = '';
      });

      const partnerCodeWrap = document.getElementById('contractPartnerCodeWrap');
      if (partnerCodeWrap) partnerCodeWrap.classList.add('hidden');

      showContractSuccessOverlay(partnerCodeResponse);

      const ordersContainer = document.getElementById('orders-container');
      if (ordersContainer) {
        await fetchOrders(ordersContainer);
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      statusEl.textContent = error.message ?? 'Unable to create order.';
      statusEl.className = 'text-sm text-red-600';
    } finally {
      clearSessionLoading(submitBtn);
    }
  });

  // Reset button
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      exitContractEditMode();
    });
  }
}

function initTabDefault() {
  const firstButton = document.querySelector('.tab-button');
  if (firstButton) {
    firstButton.click();
  }
}

function showContractSuccessOverlay(partnerCode) {
  const overlay = document.getElementById('contract-success-overlay');
  const codeEl = document.getElementById('contract-success-partner');

  if (!overlay || !codeEl) return;

  codeEl.textContent = partnerCode || '—';
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
}

function initContractSuccessOverlay() {
  const overlay = document.getElementById('contract-success-overlay');
  const closeBtn = document.getElementById('contract-success-close');
  const copyBtn = document.getElementById('contract-success-copy');
  const codeEl = document.getElementById('contract-success-partner');

  const hideOverlay = () => {
    if (!overlay) return;
    overlay.classList.remove('flex');
    overlay.classList.add('hidden');
  };

  if (closeBtn) {
    closeBtn.addEventListener('click', hideOverlay);
  }

  if (overlay) {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        hideOverlay();
      }
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const code = codeEl?.textContent?.trim();
      if (!code || code === '—') return;
      navigator.clipboard.writeText(code).catch((error) => {
        console.error('Copy failed:', error);
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAdminAuth({ redirectTo: '/admin-login' });
  if (!session?.user) return;

  const emailEl = document.getElementById('admin-user-email');
  if (emailEl) {
    emailEl.textContent = session.user.email ?? 'Unknown admin';
  }

  initLogoutButton();
  initTabs();
  initTabDefault();
  initContractForm();
  initContractSuccessOverlay();

  const roleForm = document.getElementById('role-form');
  if (roleForm) {
    roleForm.addEventListener('submit', handleRoleFormSubmit);
  }

  const rolesContainer = document.getElementById('roles-container');
  if (rolesContainer) {
    await fetchRoles(rolesContainer);

    rolesContainer.addEventListener('click', async (event) => {
      const editBtn = event.target.closest('.edit-role-btn');
      const deleteBtn = event.target.closest('.delete-role-btn');

      if (editBtn) {
        const { roleId } = editBtn.dataset;
        const role = rolesCache.find((item) => item.id === roleId);
        if (role) {
          enterEditMode(role);
        }
        return;
      }

      if (deleteBtn) {
        const { roleId } = deleteBtn.dataset;
        if (!roleId) return;

        const confirmed = window.confirm('Delete this team member? This action cannot be undone.');
        if (!confirmed) return;

        try {
          await deleteRole(roleId);
          if (rolesContainer) {
            await fetchRoles(rolesContainer);
          }
        } catch (error) {
          console.error('Failed to delete role:', error);
          alert(error.message ?? 'Unable to delete role.');
        }
      }
    });
  }

  const cancelBtn = document.getElementById('cancel-edit-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      exitEditMode();
    });
  }

  const ordersContainer = document.getElementById('orders-container');
  if (ordersContainer) {
    await fetchOrders(ordersContainer);

    ordersContainer.addEventListener('click', (event) => {
      const editBtn = event.target.closest('.edit-order-btn');
      if (editBtn) {
        const orderId = editBtn.dataset.orderId;
        const order = ordersCache.find((record) => `${record.id}` === orderId);
        if (order) {
          enterContractEditMode(order);
        }
      }
    });
  }
});


