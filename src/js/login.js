// Admin login with Supabase authentication
import { supabase } from './client.js';
import {
  persistAdminSession,
  redirectIfAuthenticated,
  setSessionLoading,
  clearSessionLoading,
} from './session.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  
  if (!loginForm) return;

  // Check if already logged in
  redirectIfAuthenticated('/admin');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('username').value; // email field
    const password = document.getElementById('password').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }

    try {
      // Disable button during login
      setSessionLoading(submitBtn, 'Signing in...');
      
      // Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;
      
      if (data?.session && data?.user) {
        persistAdminSession(data.session);
      } else if (data?.user) {
        persistAdminSession({ user: data.user });
      }

      window.location.href = '/admin';
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed: ' + error.message);
      clearSessionLoading(submitBtn);
    }
  });
});
