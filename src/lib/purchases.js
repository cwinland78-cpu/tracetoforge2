import { Purchases } from '@revenuecat/purchases-js';
import { callRpc, queryTable } from './supabase';

const RC_API_KEY = import.meta.env.VITE_RC_API_KEY || 'rcb_qocDHLqCasYLKEOvPuyDacOrCFOt';
const CREDITS_KEY = 'ttf_credits';
const CUSTOMER_ID_KEY = 'ttf_customer_id';
const REDEEMED_PROMOS_KEY = 'ttf_redeemed_promos';

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
    // Credits are added server-side via webhook - no client-side addition needed
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

function getRedeemedPromosLocal() {
  try { return JSON.parse(localStorage.getItem(REDEEMED_PROMOS_KEY) || '[]'); }
  catch { return []; }
}

const PROMO_CODES = {
  JOELOVESTOM: { credits: 5, description: '5 free exports' },
  TESTER999: { credits: 5, description: '5 free exports' },
  KILLALUKE99: { credits: 99, description: '99 free exports' },
};

export async function redeemPromoCode(code, userId) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { success: false, error: 'Please enter a promo code' };

  if (userId) {
    const { data, error } = await callRpc('redeem_promo', {
      p_user_id: userId, p_code: normalized,
    });
    if (error) { console.error('Promo error:', error); return { success: false, error: 'Failed to redeem code' }; }
    return data;
  }

  const promo = PROMO_CODES[normalized];
  if (!promo) return { success: false, error: 'Invalid promo code' };
  const redeemed = getRedeemedPromosLocal();
  if (redeemed.includes(normalized)) return { success: false, error: 'This code has already been redeemed' };
  const newTotal = await addCredits(promo.credits, null);
  redeemed.push(normalized);
  localStorage.setItem(REDEEMED_PROMOS_KEY, JSON.stringify(redeemed));
  return { success: true, credits: promo.credits, total: newTotal, description: promo.description };
}
