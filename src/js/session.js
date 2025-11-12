import { supabase } from './client.js';

const STORAGE_KEYS = {
  loggedIn: 'adminLoggedIn',
  userEmail: 'adminUser',
  userId: 'adminUserId',
};

let activeSubmitButtons = new WeakMap();

export function persistAdminSession(session) {
  if (!session || !session.user) return;

  sessionStorage.setItem(STORAGE_KEYS.loggedIn, 'true');
  sessionStorage.setItem(STORAGE_KEYS.userEmail, session.user.email ?? '');
  sessionStorage.setItem(STORAGE_KEYS.userId, session.user.id ?? '');
}

export function clearAdminSession() {
  sessionStorage.removeItem(STORAGE_KEYS.loggedIn);
  sessionStorage.removeItem(STORAGE_KEYS.userEmail);
  sessionStorage.removeItem(STORAGE_KEYS.userId);
}

export function getStoredAdminUser() {
  const loggedIn = sessionStorage.getItem(STORAGE_KEYS.loggedIn) === 'true';
  if (!loggedIn) return null;

  return {
    email: sessionStorage.getItem(STORAGE_KEYS.userEmail) ?? '',
    id: sessionStorage.getItem(STORAGE_KEYS.userId) ?? '',
  };
}

export async function getSupabaseSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Supabase session error:', error);
    return null;
  }
  return data?.session ?? null;
}

export async function requireAdminAuth({ redirectTo = '/admin-login' } = {}) {
  const session = await getSupabaseSession();

  if (session?.user) {
    persistAdminSession(session);
    return session;
  }

  const stored = getStoredAdminUser();
  if (stored) {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Supabase getUser error:', error);
    }
    if (data?.user) {
      persistAdminSession({ user: data.user });
      return { user: data.user };
    }
  }

  clearAdminSession();

  if (redirectTo) {
    window.location.href = redirectTo;
  }

  return null;
}

export async function redirectIfAuthenticated(redirectTo = '/admin') {
  const session = await getSupabaseSession();

  if (session?.user) {
    persistAdminSession(session);
    if (redirectTo) {
      window.location.href = redirectTo;
    }
    return true;
  }

  const stored = getStoredAdminUser();
  if (stored && redirectTo) {
    window.location.href = redirectTo;
    return true;
  }

  return false;
}

export function setSessionLoading(buttonEl, loadingText = 'Loading...') {
  if (!buttonEl) return;

  activeSubmitButtons.set(buttonEl, buttonEl.textContent ?? '');
  buttonEl.disabled = true;
  buttonEl.textContent = loadingText;
  buttonEl.classList.add('opacity-70', 'cursor-not-allowed');
}

export function clearSessionLoading(buttonEl) {
  if (!buttonEl) return;

  const originalText = activeSubmitButtons.get(buttonEl);
  buttonEl.disabled = false;
  if (originalText !== undefined) {
    buttonEl.textContent = originalText;
    activeSubmitButtons.delete(buttonEl);
  }
  buttonEl.classList.remove('opacity-70', 'cursor-not-allowed');
}

export function getCurrentAdminEmail() {
  const stored = getStoredAdminUser();
  return stored?.email ?? '';
}
