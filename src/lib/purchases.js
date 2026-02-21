import { Purchases } from '@revenuecat/purchases-js';
import { callRpc, queryTable } from './supabase';

const SUPABASE_URL = 'https://pzmykycxmbzbrzkyotkc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bXlreWN4bWJ6YnJ6a3lvdGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjUxNjYsImV4cCI6MjA4NjE0MTE2Nn0.382YBaplfZJVl_ngKbGSpEPm1w3urlrxYAQFzRJW3z0';
const RC_API_KEY = import.meta.env.VITE_RC_API_KEY || 'rcb_qocDHLqCasYLKEOvPuyDacOrCFOt';
const CREDITS_KEY = 'ttf_credits';
const CUSTOMER_ID_KEY = 'ttf_customer_id';

let purchasesInstance = null;
let currentCustomerId = null;

function getCustomerId(userId) {
  // Use Supabase user ID if logged in, otherwise generate anonymous ID
  if (userId) return userId;
  let id = localStorage.getItem(CUSTOMER_ID_KEY);
  if (!id) {
    id = 'ttf_anon_' + crypto.randomUUID();
    localStorage.setItem(CUSTOMER_ID_KEY, id);
  }
  return id;
}

export async function initPurchases(userId) {
  const customerId = getCustomerId(userId);
  // Reinitialize if customer ID changed (e.g. user logged in)
  if (purchasesInstance && currentCustomerId === customerId) return purchasesInstance;
  try {
    purchasesInstance = Purchases.configure(RC_API_KEY, customerId);
    currentCustomerId = customerId;
    return purchasesInstance;
  } catch (err) {
    console.error('RevenueCat init error:', err);
    return null;
  }
}

export async function getOfferings(userId) {
  try {
    const purchases = await initPurchases(userId);
    if (!purchases) return null;
    const offerings = await purchases.getOfferings();
    return offerings.current;
  } catch (err) {
    console.error('Error fetching offerings:', err);
    return null;
  }
}

export async function purchasePackage(pkg, userId) {
  try {
    const purchases = await initPurchases(userId);
    if (!purchases) throw new Error('RevenueCat not initialized');
    const result = await purchases.purchase({ rcPackage: pkg });
    // Credits are added server-side via RevenueCat webhook - no client-side addition needed
    const productId = pkg.rcBillingProduct?.identifier || pkg.identifier || '';
    let creditsToAdd = 0;
    if (productId.includes('20')) creditsToAdd = 20;
    else if (productId.includes('5')) creditsToAdd = 5;
    return { success: true, credits: creditsToAdd, result };
  } catch (err) {
    if (err.errorCode === 1) return { success: false, cancelled: true };
    console.error('Purchase error:', err);
    return { success: false, error: err.message };
  }
}

export async function getCredits(userId) {
  if (userId) {
    const { data, error } = await queryTable('profiles', 'credits', { id: userId });
    if (!error && data && data[0]) return data[0].credits || 0;
    console.error('Error fetching credits:', error);
    return 0;
  }
  const val = parseInt(localStorage.getItem(CREDITS_KEY) || '0', 10);
  return isNaN(val) ? 0 : val;
}

export async function addCredits(amount, userId, type = 'admin', metadata = {}) {
  if (userId) {
    const { data, error } = await callRpc('add_credits', {
      p_user_id: userId, p_amount: amount, p_type: type, p_metadata: metadata,
    });
    if (error) { console.error('Error adding credits:', error); return 0; }
    return data;
  }
  const current = (parseInt(localStorage.getItem(CREDITS_KEY) || '0', 10) || 0) + amount;
  localStorage.setItem(CREDITS_KEY, String(current));
  return current;
}

export async function useCredit(userId, metadata = {}) {
  if (userId) {
    const { data, error } = await callRpc('spend_credit', {
      p_user_id: userId, p_metadata: metadata,
    });
    if (error) { console.error('Error spending credit:', error); return false; }
    return data;
  }
  const current = parseInt(localStorage.getItem(CREDITS_KEY) || '0', 10) || 0;
  if (current <= 0) return false;
  localStorage.setItem(CREDITS_KEY, String(current - 1));
  return true;
}

export function hasCredits() {
  const val = parseInt(localStorage.getItem(CREDITS_KEY) || '0', 10);
  return !isNaN(val) && val > 0;
}

export async function redeemPromoCode(code, userId) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { success: false, error: 'Please enter a promo code' };

  // Logged-in users: validate entirely server-side
  if (userId) {
    const { data, error } = await callRpc('redeem_promo', {
      p_user_id: userId, p_code: normalized,
    });
    if (error) { console.error('Promo error:', error); return { success: false, error: 'Failed to redeem code' }; }
    return data;
  }

  // Guest users: must log in to redeem promos
  return { success: false, error: 'Please create an account to redeem promo codes' };
}
