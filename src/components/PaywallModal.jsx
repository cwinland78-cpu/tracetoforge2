import React, { useState, useEffect } from 'react';
import { getOfferings, purchasePackage, getCredits, redeemPromoCode } from '../lib/purchases';
import { queryTable } from '../lib/supabase';

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
    if (userId) {
      try {
        const { data } = await queryTable('profiles', 'credits', { id: userId });
        if (data && data[0]) { setCurrentCredits(data[0].credits); return; }
      } catch (err) { console.error('PaywallModal credits error:', err); }
    }
    const val = parseInt(localStorage.getItem('ttf_credits') || '0', 10);
    setCurrentCredits(isNaN(val) ? 0 : val);
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
        // Google Ads conversion tracking
        const product = pkg.rcBillingProduct;
        const price = product?.currentPrice?.amountMicros
          ? product.currentPrice.amountMicros / 1000000
          : (product?.identifier?.includes('20') ? 34.99 : 9.99);
        if (typeof gtag === 'function') {
          gtag('event', 'conversion', {
            'send_to': 'AW-17969979491/ntR9CK31mv0bEOPA4PhC',
            'value': price,
            'currency': 'USD',
            'transaction_id': result.transactionId || ''
          });
        }
        const credits = await getCredits(userId || null);
        onCreditsChanged?.(credits);
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

  async function handleRedeemPromo() {
    setPromoLoading(true);
    setPromoResult(null);
    const result = await redeemPromoCode(promoCode, userId || null);
    setPromoResult(result);
    if (result.success) {
      const total = result.total || 0;
      setCurrentCredits(total);
      onCreditsChanged?.(total);
      setPromoCode('');
      setTimeout(() => onClose(), 2000);
    }
    setPromoLoading(false);
  }

  function handlePromoKeyDown(e) {
    if (e.key === 'Enter') handleRedeemPromo();
  }

  if (!isOpen) return null;

  const packages = offerings?.availablePackages || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full mx-4 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-5">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-white">Export Credits</h2>
              <p className="text-orange-100 text-sm mt-1">
                Purchase credits to download your STL files
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
            Current balance: <span className="text-orange-400 font-bold">{currentCredits} credits</span>
          </div>

          {loading ? (
            <div className="text-center py-8 text-zinc-400">Loading options...</div>
          ) : (
            <>
              <div className="space-y-3">
                {packages.length > 0 ? (
                  packages.map((pkg) => {
                    const product = pkg.rcBillingProduct;
                    const id = product?.identifier || '';
                    const is20 = id.includes('20');
                    const credits = is20 ? 20 : 5;
                    const price = product?.currentPrice?.formattedPrice || (is20 ? '$34.99' : '$9.99');
                    const perExport = is20 ? '$1.75' : '$2.00';
                    return (
                      <button
                        key={id}
                        onClick={() => handlePurchase(pkg)}
                        disabled={purchasing}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          is20 ? 'border-orange-500 bg-orange-500/10 hover:bg-orange-500/20' : 'border-zinc-600 bg-zinc-800 hover:bg-zinc-700'
                        } ${purchasing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-bold text-white text-lg">
                              {credits} Export Credits
                              {is20 && <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">BEST VALUE</span>}
                            </div>
                            <div className="text-zinc-400 text-sm">{perExport} per export</div>
                          </div>
                          <div className="text-right">
                            <div className="text-orange-400 font-bold text-xl">{price}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <>
                    <div className="w-full text-left p-4 rounded-xl border border-zinc-600 bg-zinc-800 opacity-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-white text-lg">5 Export Credits</div>
                          <div className="text-zinc-400 text-sm">$2.00 per export</div>
                        </div>
                        <div className="text-orange-400 font-bold text-xl">$9.99</div>
                      </div>
                    </div>
                    <div className="w-full text-left p-4 rounded-xl border border-orange-500 bg-orange-500/10 opacity-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-white text-lg">
                            20 Export Credits
                            <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">BEST VALUE</span>
                          </div>
                          <div className="text-zinc-400 text-sm">$1.75 per export</div>
                        </div>
                        <div className="text-orange-400 font-bold text-xl">$34.99</div>
                      </div>
                    </div>
                    <div className="text-center text-zinc-500 text-xs">Payment system loading... Please try again.</div>
                  </>
                )}
              </div>

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
                        {promoResult.success ? `${promoResult.credits} free credits added! (${promoResult.total} total)` : promoResult.error}
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
            <p>Credits never expire</p>
          </div>
        </div>
      </div>
    </div>
  );
}
