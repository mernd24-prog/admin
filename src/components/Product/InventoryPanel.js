import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { adjustProductInventory } from '../../Redux/productSlice';

const Badge = ({ label, color }) => {
  const colors = {
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>
      {label}
    </span>
  );
};

const stockBadge = (qty, reorderLevel) => {
  if (qty <= 0) return <Badge label="Out of Stock" color="red" />;
  if (qty <= reorderLevel) return <Badge label="Low Stock" color="yellow" />;
  return <Badge label="In Stock" color="green" />;
};

/**
 * Inventory panel for a product — displays stock by variant and allows adjustments.
 *
 * Props:
 *  product       - full product object (with variants, inventorySettings)
 *  onAdjust      - optional callback after adjustment (productId, result) => void
 *  readOnly      - boolean, hide adjustment controls
 */
const InventoryPanel = ({ product = {}, onAdjust, readOnly = false }) => {
  const dispatch = useDispatch();
  const { adjustProductInventoryData } = useSelector((s) => s.product);
  const saving = adjustProductInventoryData?.loading;

  const [form, setForm] = useState({ variantSku: '', adjustment: 0, reason: '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const productId = product._id || product.id;
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const hasVariants = variants.length > 0;
  const reorderLevel = product.inventorySettings?.reorderLevel ?? 5;

  const rootStock = product.stock ?? product.availableStock ?? 0;

  const handleAdjust = async () => {
    if (!productId) return;
    if (!form.adjustment || form.adjustment === 0) {
      setError('Adjustment quantity cannot be zero.');
      return;
    }
    setError('');
    setSuccess('');
    try {
      const payload = {
        productId,
        adjustment: Number(form.adjustment),
        reason: form.reason,
        ...(form.variantSku ? { variantSku: form.variantSku } : {}),
      };
      const res = await dispatch(adjustProductInventory(payload)).unwrap();
      setSuccess(`Stock updated. New balance: ${res?.data?.availableStock ?? res?.data?.balance ?? '—'}`);
      setForm({ variantSku: '', adjustment: 0, reason: '' });
      onAdjust?.(productId, res);
    } catch (e) {
      setError(e?.message || 'Failed to adjust inventory.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Root stock (for simple / no-variant products) */}
      {!hasVariants && (
        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-700">Available Stock</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{rootStock.toLocaleString('en-IN')}</p>
          </div>
          <div className="text-right space-y-1">
            {stockBadge(rootStock, reorderLevel)}
            <p className="text-xs text-gray-400">Reorder at: {reorderLevel}</p>
          </div>
        </div>
      )}

      {/* Variants stock table */}
      {hasVariants && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-2 font-medium text-gray-600 text-xs">Variant</th>
                <th className="text-left p-2 font-medium text-gray-600 text-xs">SKU</th>
                <th className="text-right p-2 font-medium text-gray-600 text-xs">Stock</th>
                <th className="text-right p-2 font-medium text-gray-600 text-xs">Reserved</th>
                <th className="text-left p-2 font-medium text-gray-600 text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => {
                const label = v.attributes
                  ? Object.values(v.attributes).join(' / ')
                  : v.title || v.sku;
                const stock = v.stock ?? 0;
                const reserved = v.reservedStock ?? 0;
                return (
                  <tr key={v.sku || v._id} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-gray-700">{label}</td>
                    <td className="p-2 text-gray-500 font-mono text-xs">{v.sku || '—'}</td>
                    <td className="p-2 text-right font-semibold text-gray-800">{stock.toLocaleString('en-IN')}</td>
                    <td className="p-2 text-right text-gray-500">{reserved.toLocaleString('en-IN')}</td>
                    <td className="p-2">{stockBadge(stock, reorderLevel)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Inventory settings summary */}
      {product.inventorySettings && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { label: 'Reorder Level', value: product.inventorySettings.reorderLevel ?? 5 },
            { label: 'Reorder Qty', value: product.inventorySettings.reorderQty ?? 10 },
            { label: 'Max Stock', value: product.inventorySettings.maxStock ?? '∞' },
            { label: 'Backorder', value: product.inventorySettings.allowBackorder ? 'Allowed' : 'Not allowed' },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Adjustment form */}
      {!readOnly && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <p className="text-sm font-semibold text-gray-800">Adjust Stock</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {hasVariants && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Variant SKU</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
                  value={form.variantSku}
                  onChange={(e) => setForm((f) => ({ ...f, variantSku: e.target.value }))}
                >
                  <option value="">All variants / root</option>
                  {variants.map((v) => (
                    <option key={v.sku} value={v.sku}>
                      {v.attributes ? Object.values(v.attributes).join(' / ') : v.title} — {v.sku}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">
                Quantity{' '}
                <span className="text-gray-400 font-normal">(positive = add, negative = remove)</span>
              </label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
                placeholder="e.g. +50 or -10"
                value={form.adjustment || ''}
                onChange={(e) => setForm((f) => ({ ...f, adjustment: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Reason (optional)</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
              placeholder="e.g. Physical stock count, Damaged goods, Restock…"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          {success && <p className="text-xs text-green-600">{success}</p>}

          <button
            type="button"
            onClick={handleAdjust}
            disabled={saving}
            className="px-4 py-2 bg-[var(--admin-blue)] text-white text-sm rounded-md hover:bg-[#2e3074] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Apply Adjustment'}
          </button>
        </div>
      )}
    </div>
  );
};

export default InventoryPanel;
