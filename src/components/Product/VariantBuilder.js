import React, { useState, useCallback, useRef, useEffect } from 'react';
import { uploadFile } from '../../_helpers/globalFunctions';
import { toast } from 'sonner';

const DISPLAY_TYPES = [
  { value: 'button', label: 'Button' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'color_swatch', label: 'Color Swatch' },
  { value: 'radio', label: 'Radio' },
  { value: 'thumbnail', label: 'Thumbnail' },
];

const DEFAULT_VARIANT = {
  sku: '', title: '', price: '', mrp: '', salePrice: '', gstRate: 18,
  stock: 0, barcode: '', weight: '', status: 'active', isDefault: false,
  attributes: {}, images: [],
};

/**
 * Props:
 *  variants          - array of variant objects
 *  options           - array of option objects { name, values, valueCodes, displayType, required, sortOrder }
 *  basePrice         - number
 *  baseMrp           - number
 *  platformOptions   - array of platform options from API { _id, name, displayType }
 *  platformValues    - map { optionId -> [{name, valueCode, colorHex, imageUrl}] }
 *  onChange          - (variants) => void
 *  onOptionsChange   - (options) => void
 *  onOptionSearch    - (query) => void   (called when user types in option search)
 *  onValueSearch     - (optionId, query) => void
 */
const VariantBuilder = ({
  variants = [],
  options = [],
  basePrice = 0,
  baseMrp = 0,
  platformOptions = [],
  platformValues = {},
  onChange,
  onOptionsChange,
  onOptionSearch,
  onValueSearch,
}) => {
  const [optionSearch, setOptionSearch] = useState('');
  const [showOptionDropdown, setShowOptionDropdown] = useState(false);
  const [activeOptionIdx, setActiveOptionIdx] = useState(null);
  const [valueInputs, setValueInputs] = useState({});    // { optIdx: string }
  const [expandedVariants, setExpandedVariants] = useState(new Set());
  const [uploadingVariant, setUploadingVariant] = useState(null);
  const optionSearchRef = useRef(null);
  const dragOptionIdx = useRef(null);
  const dragVariantIdx = useRef(null);

  // Notify parent when option search changes
  useEffect(() => {
    onOptionSearch?.(optionSearch);
  }, [optionSearch, onOptionSearch]);

  // Filter platform options for dropdown (exclude already-added ones)
  const existingNames = options.map((o) => o.name.toLowerCase());
  const filteredPlatformOptions = platformOptions.filter(
    (po) =>
      !existingNames.includes((po.name || '').toLowerCase()) &&
      (!optionSearch || (po.name || '').toLowerCase().includes(optionSearch.toLowerCase())),
  );

  // ── Add option from platform or custom ─────────────────────────────────

  const addOptionFromPlatform = (po) => {
    onOptionsChange([
      ...options,
      {
        name: po.name,
        platformOptionId: po._id || po.id,
        displayType: po.displayType || 'button',
        values: [],
        valueCodes: {},
        required: false,
        sortOrder: options.length,
      },
    ]);
    setOptionSearch('');
    setShowOptionDropdown(false);
  };

  const addCustomOption = () => {
    const name = optionSearch.trim();
    if (!name) return;
    if (options.some((o) => o.name.toLowerCase() === name.toLowerCase())) return;
    onOptionsChange([
      ...options,
      { name, displayType: 'button', values: [], valueCodes: {}, required: false, sortOrder: options.length },
    ]);
    setOptionSearch('');
    setShowOptionDropdown(false);
  };

  const removeOption = (idx) => onOptionsChange(options.filter((_, i) => i !== idx));

  const updateOption = (idx, field, value) =>
    onOptionsChange(options.map((o, i) => (i !== idx ? o : { ...o, [field]: value })));

  // ── Add values ──────────────────────────────────────────────────────────

  const addValueToOption = (optIdx, label, colorHex = '') => {
    const opt = options[optIdx];
    if (!label || (opt.values || []).includes(label)) return;
    const updatedValues = [...(opt.values || []), label];
    const updatedCodes = { ...(opt.valueCodes || {}) };
    if (colorHex) updatedCodes[label] = colorHex;
    onOptionsChange(options.map((o, i) => (i !== optIdx ? o : { ...o, values: updatedValues, valueCodes: updatedCodes })));
    setValueInputs((prev) => ({ ...prev, [optIdx]: '' }));
  };

  const removeValueFromOption = (optIdx, val) => {
    const opt = options[optIdx];
    const codes = { ...(opt.valueCodes || {}) };
    delete codes[val];
    onOptionsChange(options.map((o, i) => (i !== optIdx ? o : { ...o, values: (o.values || []).filter((v) => v !== val), valueCodes: codes })));
  };

  // Get platform values for an option
  const getPlatformValuesForOption = (optIdx) => {
    const opt = options[optIdx];
    if (!opt?.platformOptionId) return [];
    return platformValues[opt.platformOptionId] || [];
  };

  // ── Option drag-to-reorder ──────────────────────────────────────────────

  const handleOptionDragStart = (idx) => { dragOptionIdx.current = idx; };
  const handleOptionDragOver = (e, idx) => {
    e.preventDefault();
    if (dragOptionIdx.current === null || dragOptionIdx.current === idx) return;
    const next = [...options];
    const [d] = next.splice(dragOptionIdx.current, 1);
    next.splice(idx, 0, d);
    dragOptionIdx.current = idx;
    onOptionsChange(next.map((o, i) => ({ ...o, sortOrder: i })));
  };

  // ── Combination generation ──────────────────────────────────────────────

  const generateCombinations = useCallback(() => {
    if (!options.length || options.some((o) => !(o.values || []).length)) return;
    const cartesian = (axes) => {
      if (!axes.length) return [{}];
      const [head, ...tail] = axes;
      return head.values.flatMap((v) => cartesian(tail).map((c) => ({ [head.name.toLowerCase()]: v, ...c })));
    };
    const existingMap = new Map(variants.map((v) => [JSON.stringify(v.attributes), v]));
    onChange(
      cartesian(options).map((attributes, idx) => {
        const key = JSON.stringify(attributes);
        const existing = existingMap.get(key);
        if (existing) return existing;
        return { ...DEFAULT_VARIANT, sku: `SKU-${Date.now()}-${idx + 1}`, title: Object.values(attributes).join(' / '), attributes, price: basePrice, mrp: baseMrp, sortOrder: idx };
      }),
    );
  }, [options, variants, basePrice, baseMrp, onChange]);

  // ── Variant editing ─────────────────────────────────────────────────────

  const updateVariant = (idx, field, value) =>
    onChange(variants.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));

  const removeVariant = (idx) => {
    onChange(variants.filter((_, i) => i !== idx));
    setExpandedVariants((prev) => { const n = new Set(prev); n.delete(idx); return n; });
  };

  const duplicateVariant = (idx) => {
    const copy = { ...variants[idx], sku: `${variants[idx].sku || 'SKU'}-copy`, isDefault: false };
    const next = [...variants];
    next.splice(idx + 1, 0, copy);
    onChange(next);
  };

  const setDefaultVariant = (idx) => onChange(variants.map((v, i) => ({ ...v, isDefault: i === idx })));

  const toggleExpandVariant = (idx) =>
    setExpandedVariants((prev) => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; });

  const uploadVariantImage = async (idx, file) => {
    if (!file) return;
    setUploadingVariant(idx);
    try {
      const url = await uploadFile(file, 'PRODUCT');
      updateVariant(idx, 'images', [...(variants[idx].images || []), url]);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploadingVariant(null);
    }
  };

  const removeVariantImage = (vIdx, imgIdx) =>
    updateVariant(vIdx, 'images', variants[vIdx].images.filter((_, i) => i !== imgIdx));

  // ── Variant drag-to-reorder ─────────────────────────────────────────────

  const handleVariantDragStart = (idx) => { dragVariantIdx.current = idx; };
  const handleVariantDragOver = (e, idx) => {
    e.preventDefault();
    if (dragVariantIdx.current === null || dragVariantIdx.current === idx) return;
    const next = [...variants];
    const [d] = next.splice(dragVariantIdx.current, 1);
    next.splice(idx, 0, d);
    dragVariantIdx.current = idx;
    onChange(next.map((v, i) => ({ ...v, sortOrder: i })));
  };

  // ── Bulk actions ────────────────────────────────────────────────────────

  const applyToAll = (field, value) => onChange(variants.map((v) => ({ ...v, [field]: value })));

  const totalCombinations = options.every((o) => (o.values || []).length > 0) && options.length
    ? options.reduce((acc, o) => acc * (o.values || []).length, 1)
    : 0;

  return (
    <div className="space-y-6">

      {/* ── Option Axes ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-800">Variant Options</h4>
          <p className="text-xs text-gray-400">Search or type to add · Drag to reorder</p>
        </div>

        {/* Option rows */}
        <div className="space-y-2">
          {options.map((option, optIdx) => {
            const pValues = getPlatformValuesForOption(optIdx);
            const selectedValues = new Set(option.values || []);

            return (
              <div
                key={optIdx}
                draggable
                onDragStart={() => handleOptionDragStart(optIdx)}
                onDragOver={(e) => handleOptionDragOver(e, optIdx)}
                onDragEnd={() => { dragOptionIdx.current = null; }}
                className="border border-gray-200 rounded-lg p-3 bg-gray-50 cursor-grab active:cursor-grabbing select-none"
              >
                {/* Header row */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-gray-300 text-sm leading-none">⠿</span>
                  <span className="text-sm font-semibold text-gray-700 flex-1 min-w-0">{option.name}</span>

                  {/* Display type */}
                  <select
                    className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white focus:outline-none"
                    value={option.displayType || 'button'}
                    onChange={(e) => updateOption(optIdx, 'displayType', e.target.value)}
                  >
                    {DISPLAY_TYPES.map((dt) => (
                      <option key={dt.value} value={dt.value}>{dt.label}</option>
                    ))}
                  </select>

                  {/* Required */}
                  <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none whitespace-nowrap">
                    <input type="checkbox" className="w-3 h-3 accent-[#3E4094]" checked={Boolean(option.required)} onChange={(e) => updateOption(optIdx, 'required', e.target.checked)} />
                    Required
                  </label>

                  <button type="button" onClick={() => setActiveOptionIdx(activeOptionIdx === optIdx ? null : optIdx)} className="text-xs text-[#3E4094] hover:underline whitespace-nowrap">
                    {activeOptionIdx === optIdx ? 'Done' : '+ Values'}
                  </button>
                  <button type="button" onClick={() => removeOption(optIdx)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                </div>

                {/* Selected value chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(option.values || []).map((val) => {
                    const hex = option.valueCodes?.[val];
                    const pv = pValues.find((p) => p.name === val);
                    const displayHex = hex || pv?.colorHex || '';
                    return (
                      <span key={val} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-gray-300 text-gray-700 text-xs rounded-full">
                        {option.displayType === 'color_swatch' && displayHex && (
                          <span className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" style={{ backgroundColor: displayHex }} />
                        )}
                        {option.displayType === 'thumbnail' && (pv?.imageUrl || option.valueCodes?.[val]) && (
                          <img src={pv?.imageUrl || option.valueCodes?.[val]} alt={val} className="w-4 h-4 rounded object-cover flex-shrink-0" />
                        )}
                        {val}
                        <button type="button" onClick={() => removeValueFromOption(optIdx, val)} className="hover:text-red-500 leading-none">×</button>
                      </span>
                    );
                  })}
                  {!(option.values || []).length && <span className="text-xs text-gray-400 italic">No values selected</span>}
                </div>

                {/* Value selector panel */}
                {activeOptionIdx === optIdx && (
                  <div className="border-t border-gray-200 pt-3 mt-1 space-y-3">
                    {/* Platform values as clickable chips */}
                    {pValues.length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Available values — click to select</p>
                        <div className="flex flex-wrap gap-1.5">
                          {pValues.map((pv) => {
                            const isSelected = selectedValues.has(pv.name);
                            return (
                              <button
                                key={pv.name}
                                type="button"
                                onClick={() => {
                                  if (isSelected) removeValueFromOption(optIdx, pv.name);
                                  else addValueToOption(optIdx, pv.name, pv.colorHex || '');
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors ${
                                  isSelected
                                    ? 'bg-[#3E4094] text-white border-[#3E4094]'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-[#3E4094]'
                                }`}
                              >
                                {option.displayType === 'color_swatch' && pv.colorHex && (
                                  <span className="w-3 h-3 rounded-full border border-white/50 flex-shrink-0" style={{ backgroundColor: pv.colorHex }} />
                                )}
                                {option.displayType === 'thumbnail' && pv.imageUrl && (
                                  <img src={pv.imageUrl} alt={pv.name} className="w-4 h-4 rounded object-cover flex-shrink-0" />
                                )}
                                {pv.name}
                                {isSelected && <span className="leading-none">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Custom value input */}
                    <div>
                      {pValues.length > 0 && (
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Or add a custom value</p>
                      )}
                      <div className="flex gap-2 items-center">
                        {option.displayType === 'color_swatch' && (
                          <input
                            type="color"
                            className="w-8 h-7 rounded border border-gray-300 cursor-pointer p-0.5"
                            defaultValue="#000000"
                            id={`colorpicker-${optIdx}`}
                          />
                        )}
                        <input
                          type="text"
                          className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#3E4094]"
                          placeholder={`Custom ${option.name} value…`}
                          value={valueInputs[optIdx] || ''}
                          onChange={(e) => setValueInputs((prev) => ({ ...prev, [optIdx]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const colorEl = document.getElementById(`colorpicker-${optIdx}`);
                              const hex = option.displayType === 'color_swatch' && colorEl ? colorEl.value : '';
                              addValueToOption(optIdx, (valueInputs[optIdx] || '').trim(), hex);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const colorEl = document.getElementById(`colorpicker-${optIdx}`);
                            const hex = option.displayType === 'color_swatch' && colorEl ? colorEl.value : '';
                            addValueToOption(optIdx, (valueInputs[optIdx] || '').trim(), hex);
                          }}
                          className="px-3 py-1 bg-[#3E4094] text-white text-xs rounded-md whitespace-nowrap"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add option — searchable input */}
        <div className="relative mt-3" ref={optionSearchRef}>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4094]"
              placeholder="Search or type attribute name (Color, Size, RAM…)"
              value={optionSearch}
              onChange={(e) => { setOptionSearch(e.target.value); setShowOptionDropdown(true); }}
              onFocus={() => setShowOptionDropdown(true)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (filteredPlatformOptions.length === 1) addOptionFromPlatform(filteredPlatformOptions[0]); else if (!filteredPlatformOptions.length && optionSearch.trim()) addCustomOption(); } }}
            />
            {optionSearch.trim() && !filteredPlatformOptions.some((p) => p.name.toLowerCase() === optionSearch.toLowerCase()) && (
              <button
                type="button"
                onClick={addCustomOption}
                className="px-4 py-2 border border-[#3E4094] text-[#3E4094] text-sm rounded-md hover:bg-[#3E4094]/5 whitespace-nowrap"
              >
                + Custom
              </button>
            )}
          </div>

          {/* Dropdown */}
          {showOptionDropdown && (filteredPlatformOptions.length > 0 || optionSearch.trim()) && (
            <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
              {filteredPlatformOptions.map((po) => (
                <button
                  key={po._id || po.id}
                  type="button"
                  onClick={() => addOptionFromPlatform(po)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium text-gray-800">{po.name}</span>
                  <span className="text-xs text-gray-400 capitalize">{(po.displayType || 'button').replace('_', ' ')}</span>
                </button>
              ))}
              {optionSearch.trim() && !filteredPlatformOptions.some((p) => p.name.toLowerCase() === optionSearch.toLowerCase()) && (
                <button
                  type="button"
                  onClick={addCustomOption}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#3E4094] hover:bg-indigo-50 font-medium"
                >
                  <span>+</span>
                  <span>Add "{optionSearch.trim()}" as custom attribute</span>
                </button>
              )}
            </div>
          )}

          {/* Click outside to close */}
          {showOptionDropdown && (
            <div className="fixed inset-0 z-20" onClick={() => setShowOptionDropdown(false)} />
          )}
        </div>

        {totalCombinations > 0 && (
          <button
            type="button"
            onClick={generateCombinations}
            className="mt-3 w-full py-2 bg-[#3E4094] text-white text-sm rounded-md hover:bg-[#2e3074] font-medium"
          >
            ✨ Generate {totalCombinations} Variant Combination{totalCombinations !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* ── Bulk Actions ─────────────────────────────────────────────────── */}
      {variants.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-xs font-semibold text-gray-600">Apply to all:</span>
          {[
            { field: 'price', label: 'Price ₹' },
            { field: 'mrp', label: 'MRP ₹' },
            { field: 'salePrice', label: 'Sale ₹' },
            { field: 'stock', label: 'Stock' },
            { field: 'gstRate', label: 'GST %' },
          ].map(({ field, label }) => (
            <div key={field} className="flex items-center gap-1">
              <input type="number" min={0} className="w-20 border border-gray-300 rounded-md px-2 py-1 text-xs" placeholder={label} onChange={(e) => applyToAll(field, Number(e.target.value))} />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Variants Table ───────────────────────────────────────────────── */}
      {variants.length > 0 && (
        <div className="space-y-1">
          <div className="hidden sm:grid gap-1 px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide"
            style={{ gridTemplateColumns: '1.25rem 1rem 1fr 1.2fr 5.5rem 5.5rem 5.5rem 4.5rem 4rem 5rem auto' }}>
            <span /><span />
            <span>SKU</span><span>Variant</span>
            <span>Price ₹</span><span>MRP ₹</span><span>Sale ₹</span>
            <span>Stock</span><span>GST %</span><span>Status</span><span />
          </div>

          {variants.map((variant, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => handleVariantDragStart(idx)}
              onDragOver={(e) => handleVariantDragOver(e, idx)}
              onDragEnd={() => { dragVariantIdx.current = null; }}
              className={`rounded-lg border transition-colors ${variant.isDefault ? 'border-[#3E4094] bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <div className="grid gap-1 items-center px-2 py-1.5"
                style={{ gridTemplateColumns: '1.25rem 1rem 1fr 1.2fr 5.5rem 5.5rem 5.5rem 4.5rem 4rem 5rem auto' }}>
                <span className="text-gray-300 text-xs cursor-grab leading-none">⠿</span>
                <button type="button" title="Set as default" onClick={() => setDefaultVariant(idx)}
                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${variant.isDefault ? 'bg-[#3E4094] border-[#3E4094]' : 'border-gray-300 hover:border-[#3E4094]'}`}
                />
                <input type="text" className="border border-gray-300 rounded px-1.5 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-[#3E4094]" value={variant.sku || ''} onChange={(e) => updateVariant(idx, 'sku', e.target.value)} placeholder="SKU" />
                <span className="text-xs text-gray-600 truncate px-1">
                  {variant.attributes && Object.keys(variant.attributes).length ? Object.values(variant.attributes).join(' / ') : variant.title || '—'}
                </span>
                <input type="number" min={0} className="border border-gray-300 rounded px-1.5 py-1 text-xs w-full" value={variant.price ?? ''} onChange={(e) => updateVariant(idx, 'price', Number(e.target.value))} placeholder="0" />
                <input type="number" min={0} className="border border-gray-300 rounded px-1.5 py-1 text-xs w-full" value={variant.mrp ?? ''} onChange={(e) => updateVariant(idx, 'mrp', Number(e.target.value))} placeholder="0" />
                <input type="number" min={0} className="border border-gray-300 rounded px-1.5 py-1 text-xs w-full" value={variant.salePrice ?? ''} onChange={(e) => updateVariant(idx, 'salePrice', Number(e.target.value))} placeholder="0" />
                <input type="number" min={0} className="border border-gray-300 rounded px-1.5 py-1 text-xs w-full" value={variant.stock ?? 0} onChange={(e) => updateVariant(idx, 'stock', Number(e.target.value))} />
                <input type="number" min={0} max={100} className="border border-gray-300 rounded px-1.5 py-1 text-xs w-full" value={variant.gstRate ?? 18} onChange={(e) => updateVariant(idx, 'gstRate', Number(e.target.value))} />
                <select className="border border-gray-300 rounded px-1 py-1 text-xs w-full" value={variant.status || 'active'} onChange={(e) => updateVariant(idx, 'status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="out_of_stock">OOS</option>
                </select>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button type="button" title="Manage images" onClick={() => toggleExpandVariant(idx)}
                    className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${expandedVariants.has(idx) ? 'bg-[#3E4094] text-white border-[#3E4094]' : 'border-gray-300 text-gray-500 hover:border-[#3E4094]'}`}>
                    🖼{(variant.images || []).length > 0 ? ` ${variant.images.length}` : ''}
                  </button>
                  <button type="button" title="Duplicate" onClick={() => duplicateVariant(idx)} className="text-xs px-1.5 py-0.5 rounded border border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-500">⧉</button>
                  <button type="button" onClick={() => removeVariant(idx)} className="text-red-400 hover:text-red-600 text-sm leading-none">✕</button>
                </div>
              </div>

              {/* Expanded panel */}
              {expandedVariants.has(idx) && (
                <div className="border-t border-gray-100 px-3 py-3 space-y-3 bg-gray-50 rounded-b-lg">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <label className="flex flex-col gap-1"><span className="text-[10px] text-gray-400 uppercase">Barcode</span><input type="text" className="border border-gray-300 rounded px-2 py-1 text-xs" value={variant.barcode || ''} onChange={(e) => updateVariant(idx, 'barcode', e.target.value)} placeholder="EAN/UPC" /></label>
                    <label className="flex flex-col gap-1"><span className="text-[10px] text-gray-400 uppercase">Weight (kg)</span><input type="number" min={0} className="border border-gray-300 rounded px-2 py-1 text-xs" value={variant.weight || ''} onChange={(e) => updateVariant(idx, 'weight', Number(e.target.value))} /></label>
                    <label className="flex flex-col gap-1"><span className="text-[10px] text-gray-400 uppercase">Title override</span><input type="text" className="border border-gray-300 rounded px-2 py-1 text-xs" value={variant.title || ''} onChange={(e) => updateVariant(idx, 'title', e.target.value)} /></label>
                    <label className="flex flex-col gap-1"><span className="text-[10px] text-gray-400 uppercase">Sort Order</span><input type="number" min={0} className="border border-gray-300 rounded px-2 py-1 text-xs" value={variant.sortOrder ?? idx} onChange={(e) => updateVariant(idx, 'sortOrder', Number(e.target.value))} /></label>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase block mb-2">Variant Images</span>
                    <div className="flex flex-wrap gap-2 items-start">
                      {(variant.images || []).map((img, imgIdx) => (
                        <div key={imgIdx} className="relative w-16 h-16 rounded border border-gray-300 overflow-hidden group flex-shrink-0">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeVariantImage(idx, imgIdx)}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                        </div>
                      ))}
                      <label className={`w-16 h-16 rounded border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#3E4094] text-gray-400 hover:text-[#3E4094] flex-shrink-0 ${uploadingVariant === idx ? 'opacity-50 pointer-events-none' : ''}`}>
                        <span className="text-xl leading-none">{uploadingVariant === idx ? '⏳' : '+'}</span>
                        <span className="text-[9px] mt-0.5">Upload</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadVariantImage(idx, e.target.files[0])} />
                      </label>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <input type="text" className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#3E4094]" placeholder="Or paste image URL and press Enter…"
                        onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { e.preventDefault(); updateVariant(idx, 'images', [...(variant.images || []), e.target.value.trim()]); e.target.value = ''; } }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={() => onChange([...variants, { ...DEFAULT_VARIANT, sku: `SKU-${Date.now()}`, price: basePrice, mrp: baseMrp }])}
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#3E4094] hover:text-[#3E4094] transition-colors">
        + Add Variant Manually
      </button>

      {variants.length > 0 && (
        <p className="text-xs text-gray-400">● = default · ⠿ drag to reorder · ⧉ duplicate · 🖼 images · ✕ remove</p>
      )}
    </div>
  );
};

export default VariantBuilder;
