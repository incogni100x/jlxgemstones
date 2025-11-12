import { supabase } from './client.js';
import { clearAdminSession } from './session.js';

document.addEventListener('DOMContentLoaded', () => {
  const logoutButton = document.getElementById('logout-btn');
  if (!logoutButton) return;

  logoutButton.addEventListener('click', async () => {
    try {
      logoutButton.disabled = true;
      const originalText = logoutButton.textContent;
      logoutButton.textContent = 'Signing out...';

      await supabase.auth.signOut();
      clearAdminSession();

      window.location.href = '/admin-login';

      logoutButton.textContent = originalText;
    } catch (error) {
      console.error('Logout error:', error);
      clearAdminSession();
      window.location.href = '/admin-login';
    }
  });
});
