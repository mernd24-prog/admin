import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { getProducts } from '../../Redux/productSlice';
import { getDefaultVariant, getPrimaryProductImage } from '../../_helpers/productMedia';

/**
 * Bundle / Combo product builder.
 *
 * Props:
 *  bundleItems    - array of { productId, sku, title, image, quantity, price }
 *  bundleDiscount - number (percentage off the sum of component prices)
 *  onChange       - (bundleItems: array) => void
 *  onDiscountChange - (discount: number) => void
 */
const BundleBuilder = ({ bundleItems = [], bundleDiscount = 0, onChange, onDiscountChange }) => {
  const dispatch = useDispatch();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const doSearch = useCallback(async () => {
    if (!search.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await dispatch(getProducts({ q: search.trim(), limit: 10, status: 'approved' })).unwrap();
      const docs = res?.data?.products || res?.data?.docs || [];
      setResults(docs.filter((p) => !bundleItems.some((bi) => bi.productId === (p._id || p.id))));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [search, dispatch, bundleItems]);

  useEffect(() => {
    const t = setTimeout(doSearch, 350);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  const addItem = (product) => {
    const id = product._id || product.id;
    if (bundleItems.some((bi) => bi.productId === id)) return;
    const defaultVariant = getDefaultVariant(product);
    onChange([
      ...bundleItems,
      {
        productId: id,
        sku: defaultVariant?.sku || product.sku || '',
        title: product.title || product.name || '',
        image: getPrimaryProductImage(product),
        quantity: 1,
        price: Number(defaultVariant?.price ?? defaultVariant?.salePrice ?? product.price ?? 0),
      },
    ]);
    setSearch('');
    setResults([]);
  };

  const removeItem = (productId) => {
    onChange(bundleItems.filter((bi) => bi.productId !== productId));
  };

  const updateQty = (productId, qty) => {
    onChange(bundleItems.map((bi) => bi.productId === productId ? { ...bi, quantity: Math.max(1, Number(qty)) } : bi));
  };

  const componentTotal = bundleItems.reduce((sum, bi) => sum + bi.price * bi.quantity, 0);
  const discountAmount = componentTotal * (bundleDiscount / 100);
  const bundlePrice = componentTotal - discountAmount;

  return (
    <div className="space-y-5">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <p className="text-xs text-orange-700 font-medium">Bundle / Combo Product</p>
        <p className="text-xs text-orange-600 mt-0.5">
          Search and add products to this bundle. Set quantities and a combo discount.
        </p>
      </div>

      {/* Product search */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Search &amp; Add Products</label>
        <div className="relative">
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
            placeholder="Search product by title or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searching && (
            <div className="absolute right-3 top-2.5">
              <div className="w-4 h-4 border-2 border-[var(--admin-blue)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {results.length > 0 && (
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-52 overflow-y-auto">
              {results.map((p) => (
                <button
                  key={p._id || p.id}
                  type="button"
                  onClick={() => addItem(p)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                >
                  {(p.images?.[0]?.url || p.images?.[0]) && (
                    <img
                      src={p.images?.[0]?.url || p.images?.[0]}
                      alt=""
                      className="w-8 h-8 object-cover rounded border border-gray-200 flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{p.title || p.name}</p>
                    <p className="text-xs text-gray-400">SKU: {p.sku || '—'} · ₹{p.price || 0}</p>
                  </div>
                  <span className="ml-auto text-xs text-[var(--admin-blue)] font-medium flex-shrink-0">+ Add</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bundle items list */}
      {bundleItems.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Bundle Items ({bundleItems.length})</p>
          <div className="space-y-2">
            {bundleItems.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                {item.image && (
                  <img
                    src={item.image}
                    alt=""
                    className="w-10 h-10 object-cover rounded border border-gray-200 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                  <p className="text-xs text-gray-400">₹{item.price} per unit</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <label className="text-xs text-gray-500">Qty:</label>
                  <input
                    type="number"
                    min={1}
                    className="w-14 border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--admin-blue)]"
                    value={item.quantity}
                    onChange={(e) => updateQty(item.productId, e.target.value)}
                  />
                </div>
                <p className="text-xs font-semibold text-gray-700 w-16 text-right flex-shrink-0">
                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                </p>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  className="text-red-400 hover:text-red-600 ml-1 flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Discount + pricing summary */}
          <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Component total:</span>
              <span className="text-sm font-medium text-gray-800">₹{componentTotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 flex-shrink-0">Bundle discount:</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="w-20 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
                  value={bundleDiscount}
                  onChange={(e) => onDiscountChange(Math.min(100, Math.max(0, Number(e.target.value))))}
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
              {bundleDiscount > 0 && (
                <span className="text-sm text-red-500 ml-auto">
                  −₹{discountAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-sm font-semibold text-gray-800">Bundle price:</span>
              <span className="text-base font-bold text-[var(--admin-blue)]">₹{bundlePrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            {bundleDiscount > 0 && (
              <p className="text-xs text-green-600">Customers save {bundleDiscount}% vs buying separately</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
          <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-sm">Search and add products to build your bundle</p>
        </div>
      )}
    </div>
  );
};

export default BundleBuilder;
