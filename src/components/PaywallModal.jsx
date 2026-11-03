import React, { useState, useEffect } from 'react';
import { getOfferings, purchasePackage, getExportStatus, redeemPromoCode, UNLIMITED_PRODUCT_ID } from '../lib/purchases';

export default function PaywallModal({ isOpen, onClose, onCreditsChanged, userId }) {
  const [offerings, setOfferings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState(null);
  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [currentCredits, setCurrentCredits] = useState(0);
  const [unlimited, setUnlimited] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadOfferings();
      loadCredits();
      setError(null);
      setPromoResult(null);
      setPromoCode('');
    }
  }, [isOpen]);

  async function loadCredits() {
    const s = await getExportStatus(userId || null);
    setCurrentCredits(s.credits);
    setUnlimited(s.unlimited);
  }

  async function loadOfferings() {
    setLoading(true);
    try {
      const current = await getOfferings(userId);
      setOfferings(current);
    } catch (err) {
      console.error('Failed to load offerings:', err);
    }
    setLoading(false);
  }

  async function handlePurchase(pkg) {
    setPurchasing(true);
    setError(null);
    try {
      const result = await purchasePackage(pkg, userId);
      if (result.success) {
        // Credits are granted server-side by the RevenueCat webhook (single
        // source of truth, deduped by event_id). Client-side granting was
        // removed Jul 2026: it silently failed in practice and would have
        // double-granted if it ever started working.
        // Google Ads conversion tracking
        const product = pkg.rcBillingProduct;
        const price = product?.currentPrice?.amountMicros
          ? product.currentPrice.amountMicros / 1000000
          : 2.99;
        if (typeof gtag === 'function') {
          gtag('event', 'conversion', {
            'send_to': 'AW-17969979491/ntR9CK31mv0bEOPA4PhC',
            'value': price,
            'currency': 'USD',
            'transaction_id': result.transactionId || ''
          });
        }
        // Poll briefly so the webhook has time to land before we refresh.
        // Stops early as soon as unlimited is on.
        let status = { credits: currentCredits, unlimited: false };
        for (let i = 0; i < 8; i++) {
          await new Promise(r => setTimeout(r, 1500));
          status = await getExportStatus(userId || null);
          if (status.unlimited) break;
        }
        onCreditsChanged?.(status.credits);
        onClose();
      } else if (result.cancelled) {
        // User cancelled
      } else {
        setError(result.error || 'Purchase failed. Please try again.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
    setPurchasing(false);
  }

  const [promoAttempts, setPromoAttempts] = useState(0);
  const [promoLocked, setPromoLocked] = useState(false);

  async function handleRedeemPromo() {
    if (promoLocked) {
      setPromoResult({ success: false, error: 'Too many attempts. Try again later.' });
      return;
    }
    if (promoAttempts >= 5) {
      setPromoLocked(true);
      setPromoResult({ success: false, error: 'Too many attempts. Try again later.' });
      setTimeout(() => { setPromoLocked(false); setPromoAttempts(0); }, 60 * 60 * 1000);
      return;
    }
    setPromoAttempts(a => a + 1);
    setPromoLoading(true);
    setPromoResult(null);
    const result = await redeemPromoCode(promoCode, userId || null);
    setPromoResult(result);
    if (result.success) {
      const total = result.total || 0;
      setCurrentCredits(total);
      onCreditsChanged?.(total);
      setPromoCode('');
      setPromoAttempts(0);
      setTimeout(() => onClose(), 2000);
    }
    setPromoLoading(false);
  }

  function handlePromoKeyDown(e) {
    if (e.key === 'Enter') handleRedeemPromo();
  }

  if (!isOpen) return null;

  const packages = offerings?.availablePackages || [];
  const unlimitedPkg = packages.find(p => (p.rcBillingProduct?.identifier || '') === UNLIMITED_PRODUCT_ID) || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full mx-4 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-5">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-white">Unlimited Exports</h2>
              <p className="text-orange-100 text-sm mt-1">
                One payment. Export as many files as you want.
              </p>
            </div>
            <button onClick={onClose} className="text-orange-200 hover:text-white text-2xl leading-none">
              &times;
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="text-center text-zinc-400 text-sm">
            {unlimited
              ? <span className="text-orange-400 font-bold">You have unlimited exports</span>
              : <>Free exports left: <span className="text-orange-400 font-bold">{currentCredits}</span></>}
          </div>

          {loading ? (
            <div className="text-center py-8 text-zinc-400">Loading options...</div>
          ) : (
            <>
              {(() => {
                const pkg = unlimitedPkg;
                const price = pkg?.rcBillingProduct?.currentPrice?.formattedPrice || '$2.99';
                return (
                  <div className="space-y-2">
                    <button
                      onClick={() => pkg && handlePurchase(pkg)}
                      disabled={purchasing || !pkg || unlimited}
                      className={`w-full text-left p-4 rounded-xl border border-orange-500 bg-orange-500/10 transition-all ${
                        purchasing || !pkg || unlimited ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-500/20 cursor-pointer'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-white text-lg">
                            Unlimited Exports
                            <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">FLASH SALE</span>
                          </div>
                          <div className="text-zinc-400 text-sm">STL, 3MF, SVG and DXF. One time, no subscription.</div>
                        </div>
                        <div className="text-orange-400 font-bold text-xl">{price}</div>
                      </div>
                    </button>
                    {!pkg && <div className="text-center text-zinc-500 text-xs">Payment system loading... Please try again.</div>}
                  </div>
                );
              })()}

              <div className="border-t border-zinc-700 pt-4">
                {!showPromo ? (
                  <button onClick={() => setShowPromo(true)} className="text-sm text-orange-400 hover:text-orange-300 underline underline-offset-2 w-full text-center">
                    Have a promo code?
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null); }}
                        onKeyDown={handlePromoKeyDown}
                        placeholder="Enter promo code"
                        className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-orange-500 uppercase tracking-wider"
                        autoFocus
                      />
                      <button
                        onClick={handleRedeemPromo}
                        disabled={!promoCode.trim() || promoLoading}
                        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        {promoLoading ? '...' : 'Redeem'}
                      </button>
                    </div>
                    {promoResult && (
                      <div className={`text-sm text-center py-1 ${promoResult.success ? 'text-green-400' : 'text-red-400'}`}>
                        {promoResult.success ? `${promoResult.credits} free exports added! (${promoResult.total} total)` : promoResult.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {error && <div className="text-red-400 text-sm text-center">{error}</div>}

          <div className="text-center text-zinc-500 text-xs space-y-1">
            <p>Editing and 3D preview are always free</p>
            <p>Yours for good. It never expires.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
