import { Purchases } from '@revenuecat/purchases-js';
import { callRpc, queryTable } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const RC_API_KEY = import.meta.env.VITE_RC_API_KEY;
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
    // Unlimited is turned on server-side via RevenueCat webhook - no client-side grant
    return { success: true, result };
  } catch (err) {
    if (err.errorCode === 1) return { success: false, cancelled: true };
    console.error('Purchase error:', err);
    return { success: false, error: err.message };
  }
}

// Unlimited exports ($2.99 one time) - RevenueCat product id, also mapped in the
// webhook Worker and fulfill_purchase. Change all three together.
export const UNLIMITED_PRODUCT_ID = 'ttf_unlimited';

export async function getExportStatus(userId) {
  if (!userId) return { credits: 0, unlimited: false };
  const { data, error } = await queryTable('profiles', 'credits,unlimited', { id: userId });
  if (!error && data && data[0]) return { credits: data[0].credits || 0, unlimited: !!data[0].unlimited };
  console.error('Error fetching export status:', error);
  return { credits: 0, unlimited: false };
}

export async function getCredits(userId) {
  if (!userId) return 0;
  const { data, error } = await queryTable('profiles', 'credits', { id: userId });
  if (!error && data && data[0]) return data[0].credits || 0;
  console.error('Error fetching credits:', error);
  return 0;
}

export async function addCredits(amount, userId, type = 'admin', metadata = {}) {
  if (!userId) return 0;
  const { data, error } = await callRpc('add_credits', {
    p_user_id: userId, p_amount: amount, p_type: type, p_metadata: metadata,
  });
  if (error) { console.error('Error adding credits:', error); return 0; }
  return data;
}

export async function useCredit(userId, metadata = {}) {
  if (!userId) return false;
  const { data, error } = await callRpc('spend_credit', {
    p_user_id: userId, p_metadata: metadata,
  });
  if (error) { console.error('Error spending credit:', error); return false; }
  return data;
}

export function hasCredits() {
  // Guest users always return false - must log in to have credits
  return false;
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
