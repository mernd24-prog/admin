import React, { useState, useCallback } from 'react';

const DEFAULT_VARIANT = {
  sku: '',
  title: '',
  price: '',
  mrp: '',
  salePrice: '',
  stock: 0,
  barcode: '',
  weight: '',
  status: 'active',
  isDefault: false,
  attributes: {},
  images: [],
};

/**
 * Production variant builder.
 *
 * Props:
 *  variants      - array of variant objects
 *  options       - array of option objects { name, values }
 *  basePrice     - number (default price for generated variants)
 *  baseMrp       - number
 *  onChange      - (variants: array) => void
 *  onOptionsChange - (options: array) => void
 */
const VariantBuilder = ({
  variants = [],
  options = [],
  basePrice = 0,
  baseMrp = 0,
  onChange,
  onOptionsChange,
}) => {
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');
  const [activeOptionIdx, setActiveOptionIdx] = useState(null);

  // ── Options (axes) management ─────────────────────────────────────────────

  const addOption = () => {
    if (!newOptionName.trim()) return;
    const existing = options.find((o) => o.name.toLowerCase() === newOptionName.trim().toLowerCase());
    if (existing) return;
    onOptionsChange([...options, { name: newOptionName.trim(), values: [], required: false, displayType: 'button' }]);
    setNewOptionName('');
  };

  const removeOption = (idx) => {
    const next = options.filter((_, i) => i !== idx);
    onOptionsChange(next);
  };

  const addValueToOption = (optionIdx) => {
    if (!newOptionValue.trim()) return;
    const next = options.map((opt, i) => {
      if (i !== optionIdx) return opt;
      if (opt.values.includes(newOptionValue.trim())) return opt;
      return { ...opt, values: [...opt.values, newOptionValue.trim()] };
    });
    onOptionsChange(next);
    setNewOptionValue('');
  };

  const removeValueFromOption = (optionIdx, val) => {
    const next = options.map((opt, i) => {
      if (i !== optionIdx) return opt;
      return { ...opt, values: opt.values.filter((v) => v !== val) };
    });
    onOptionsChange(next);
  };

  // ── Variant generation from option combinations ───────────────────────────

  const generateCombinations = useCallback(() => {
    if (!options.length || options.some((o) => !o.values.length)) return;

    const [first, ...rest] = options;
    const restCombinations = rest.length
      ? (function gen(opts) {
          if (!opts.length) return [{}];
          const [head, ...tail] = opts;
          return head.values.flatMap((v) => gen(tail).map((c) => ({ ...c, [head.name.toLowerCase()]: v })));
        })(rest)
      : [{}];

    const combinations = first.values.flatMap((v) =>
      restCombinations.map((c) => ({ [first.name.toLowerCase()]: v, ...c })),
    );

    const existingSkuMap = new Map(variants.map((v) => [JSON.stringify(v.attributes), v]));

    const generated = combinations.map((attributes, idx) => {
      const key = JSON.stringify(attributes);
      const existing = existingSkuMap.get(key);
      if (existing) return existing;

      const title = Object.values(attributes).join(' / ');
      return {
        ...DEFAULT_VARIANT,
        sku: `SKU-${Date.now()}-${idx + 1}`,
        title,
        attributes,
        price: basePrice,
        mrp: baseMrp,
        sortOrder: idx,
      };
    });

    onChange(generated);
  }, [options, variants, basePrice, baseMrp, onChange]);

  // ── Variant row editing ───────────────────────────────────────────────────

  const updateVariant = (idx, field, value) => {
    onChange(variants.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  };

  const removeVariant = (idx) => {
    onChange(variants.filter((_, i) => i !== idx));
  };

  const setDefaultVariant = (idx) => {
    onChange(variants.map((v, i) => ({ ...v, isDefault: i === idx })));
  };

  const addManualVariant = () => {
    onChange([
      ...variants,
      {
        ...DEFAULT_VARIANT,
        sku: `SKU-${Date.now()}`,
        price: basePrice,
        mrp: baseMrp,
      },
    ]);
  };

  // ── Bulk price/stock update ───────────────────────────────────────────────

  const applyToAll = (field, value) => {
    onChange(variants.map((v) => ({ ...v, [field]: value })));
  };

  const allHaveOptions = options.length > 0 && options.every((o) => o.values.length > 0);

  return (
    <div className="space-y-6">
      {/* Option axes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-800">Variant Options (Axes)</h4>
          <p className="text-xs text-gray-400">e.g. Color, Size, Storage</p>
        </div>

        <div className="space-y-3">
          {options.map((option, optIdx) => (
            <div key={optIdx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{option.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveOptionIdx(activeOptionIdx === optIdx ? null : optIdx)}
                    className="text-xs text-[#3E4094] hover:underline"
                  >
                    {activeOptionIdx === optIdx ? 'Done' : 'Add values'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeOption(optIdx)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {option.values.map((val) => (
                  <span
                    key={val}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-300 text-gray-700 text-xs rounded-full"
                  >
                    {val}
                    <button
                      type="button"
                      onClick={() => removeValueFromOption(optIdx, val)}
                      className="hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {!option.values.length && (
                  <span className="text-xs text-gray-400">No values yet</span>
                )}
              </div>
              {activeOptionIdx === optIdx && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#3E4094]"
                    placeholder={`Add ${option.name} value…`}
                    value={newOptionValue}
                    onChange={(e) => setNewOptionValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addValueToOption(optIdx); }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addValueToOption(optIdx)}
                    className="px-3 py-1 bg-[#3E4094] text-white text-xs rounded-md"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add new option axis */}
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4094]"
            placeholder="Option name (e.g. Color, Size)"
            value={newOptionName}
            onChange={(e) => setNewOptionName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
          />
          <button
            type="button"
            onClick={addOption}
            className="px-4 py-2 border border-[#3E4094] text-[#3E4094] text-sm rounded-md hover:bg-[#3E4094]/5"
          >
            + Add Option
          </button>
        </div>

        {allHaveOptions && (
          <button
            type="button"
            onClick={generateCombinations}
            className="mt-3 w-full py-2 bg-[#3E4094] text-white text-sm rounded-md hover:bg-[#2e3074] font-medium"
          >
            ✨ Generate Variant Combinations ({options.map((o) => o.values.length).reduce((a, b) => a * b, 1)} variants)
          </button>
        )}
      </div>

      {/* Bulk actions */}
      {variants.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-xs font-medium text-gray-600">Apply to all:</span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              className="w-24 border border-gray-300 rounded-md px-2 py-1 text-xs"
              placeholder="Price"
              onChange={(e) => applyToAll('price', Number(e.target.value))}
            />
            <span className="text-xs text-gray-400">price</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              className="w-24 border border-gray-300 rounded-md px-2 py-1 text-xs"
              placeholder="MRP"
              onChange={(e) => applyToAll('mrp', Number(e.target.value))}
            />
            <span className="text-xs text-gray-400">MRP</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              className="w-20 border border-gray-300 rounded-md px-2 py-1 text-xs"
              placeholder="Stock"
              onChange={(e) => applyToAll('stock', Number(e.target.value))}
            />
            <span className="text-xs text-gray-400">stock</span>
          </div>
        </div>
      )}

      {/* Variants table */}
      {variants.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-2 font-medium text-gray-600 w-4"></th>
                <th className="text-left p-2 font-medium text-gray-600">SKU *</th>
                <th className="text-left p-2 font-medium text-gray-600">Variant</th>
                <th className="text-left p-2 font-medium text-gray-600">Price ₹</th>
                <th className="text-left p-2 font-medium text-gray-600">MRP ₹</th>
                <th className="text-left p-2 font-medium text-gray-600">Stock</th>
                <th className="text-left p-2 font-medium text-gray-600">Barcode</th>
                <th className="text-left p-2 font-medium text-gray-600">Status</th>
                <th className="text-left p-2 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant, idx) => (
                <tr key={idx} className={`border-b ${variant.isDefault ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <td className="p-2">
                    <button
                      type="button"
                      title="Set as default"
                      onClick={() => setDefaultVariant(idx)}
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        variant.isDefault
                          ? 'bg-[#3E4094] border-[#3E4094]'
                          : 'border-gray-300 hover:border-[#3E4094]'
                      }`}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#3E4094]"
                      value={variant.sku || ''}
                      onChange={(e) => updateVariant(idx, 'sku', e.target.value)}
                      placeholder="SKU"
                    />
                  </td>
                  <td className="p-2 text-gray-600">
                    {variant.attributes
                      ? Object.values(variant.attributes).join(' / ')
                      : variant.title || '-'}
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      className="w-20 border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#3E4094]"
                      value={variant.price || ''}
                      onChange={(e) => updateVariant(idx, 'price', Number(e.target.value))}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      className="w-20 border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#3E4094]"
                      value={variant.mrp || ''}
                      onChange={(e) => updateVariant(idx, 'mrp', Number(e.target.value))}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      className="w-16 border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#3E4094]"
                      value={variant.stock ?? 0}
                      onChange={(e) => updateVariant(idx, 'stock', Number(e.target.value))}
                      min={0}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-24 border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#3E4094]"
                      value={variant.barcode || ''}
                      onChange={(e) => updateVariant(idx, 'barcode', e.target.value)}
                      placeholder="Barcode"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none"
                      value={variant.status || 'active'}
                      onChange={(e) => updateVariant(idx, 'status', e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() => removeVariant(idx)}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={addManualVariant}
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#3E4094] hover:text-[#3E4094] transition-colors"
      >
        + Add Variant Manually
      </button>

      {variants.length > 0 && (
        <p className="text-xs text-gray-400">
          ● = default variant shown to customers · Drag to reorder · Click × to remove
        </p>
      )}
    </div>
  );
};

export default VariantBuilder;
