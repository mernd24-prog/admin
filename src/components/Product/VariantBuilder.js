import React, { useState, useCallback, useRef, useEffect } from 'react';
import { uploadFile, uploadFileMulti } from '../../_helpers/globalFunctions';
import { toast } from 'sonner';
import useDropdownOptions from '../../hooks/useDropdownOptions';
import { FaImage, FaInfoCircle } from 'react-icons/fa';
import { MdDragIndicator, MdClose, MdAdd } from 'react-icons/md';

const MAX_VARIANT_IMAGES = 5;

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
 *  variants        - array of variant objects
 *  options         - array of option objects
 *  basePrice       - number
 *  baseMrp         - number
 *  platformOptions - array
 *  platformValues  - map { optionId -> [{name, valueCode, colorHex, imageUrl}] }
 *  onChange        - (variants) => void
 *  onOptionsChange - (options) => void
 *  onOptionSearch  - (query) => void
 *  onValueSearch   - (optionId, query) => void
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
  const productStatuses = useDropdownOptions('product-statuses');
  const [optionSearch, setOptionSearch] = useState('');
  const [showOptionDropdown, setShowOptionDropdown] = useState(false);
  const [activeOptionIdx, setActiveOptionIdx] = useState(null);
  const [expandedVariants, setExpandedVariants] = useState(new Set());
  const [uploadingVariants, setUploadingVariants] = useState(new Set());
  const optionSearchRef = useRef(null);
  const dragOptionIdx = useRef(null);
  const dragVariantIdx = useRef(null);
  const variantFileRefs = useRef({});

  useEffect(() => { onOptionSearch?.(optionSearch); }, [optionSearch, onOptionSearch]);

  // ── Step progress ───────────────────────────────────────────────────────────
  const step = options.length === 0 ? 1
    : options.some((o) => !(o.values || []).length) ? 2
    : variants.length === 0 ? 3
    : 4;

  // ── Option filtering ────────────────────────────────────────────────────────
  const existingNames = options.map((o) => o.name.toLowerCase());
  const filteredPlatformOptions = platformOptions.filter(
    (po) =>
      !existingNames.includes((po.name || '').toLowerCase()) &&
      (!optionSearch || (po.name || '').toLowerCase().includes(optionSearch.toLowerCase())),
  );

  // ── Add / remove / update options ───────────────────────────────────────────
  const addOptionFromPlatform = (po) => {
    onOptionsChange([...options, {
      name: po.name, platformOptionId: po._id || po.id,
      displayType: po.displayType || 'button',
      values: [], valueCodes: {}, required: false, sortOrder: options.length,
    }]);
    setOptionSearch(''); setShowOptionDropdown(false);
  };
  const removeOption = (idx) => onOptionsChange(options.filter((_, i) => i !== idx));
  const updateOption = (idx, field, value) =>
    onOptionsChange(options.map((o, i) => (i !== idx ? o : { ...o, [field]: value })));

  const addValueToOption = (optIdx, label, colorHex = '') => {
    const opt = options[optIdx];
    if (!label || (opt.values || []).includes(label)) return;
    const updatedValues = [...(opt.values || []), label];
    const updatedCodes = { ...(opt.valueCodes || {}) };
    if (colorHex) updatedCodes[label] = colorHex;
    onOptionsChange(options.map((o, i) => (i !== optIdx ? o : { ...o, values: updatedValues, valueCodes: updatedCodes })));
  };
  const removeValueFromOption = (optIdx, val) => {
    const opt = options[optIdx];
    const codes = { ...(opt.valueCodes || {}) };
    delete codes[val];
    onOptionsChange(options.map((o, i) => (i !== optIdx ? o : { ...o, values: (o.values || []).filter((v) => v !== val), valueCodes: codes })));
  };

  const getPlatformValuesForOption = (optIdx) => {
    const opt = options[optIdx];
    if (!opt?.platformOptionId) return [];
    return platformValues[opt.platformOptionId] || [];
  };

  // ── Option drag ─────────────────────────────────────────────────────────────
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

  // ── Combination generation ──────────────────────────────────────────────────
  const generateCombinations = useCallback(() => {
    if (!options.length || options.some((o) => !(o.values || []).length)) return;
    const cartesian = (axes) => {
      if (!axes.length) return [{}];
      const [head, ...tail] = axes;
      return head.values.flatMap((v) => cartesian(tail).map((c) => ({ [head.name.toLowerCase()]: v, ...c })));
    };
    const existingMap = new Map(variants.map((v) => [JSON.stringify(v.attributes), v]));
    onChange(cartesian(options).map((attributes, idx) => {
      const key = JSON.stringify(attributes);
      const existing = existingMap.get(key);
      if (existing) return existing;
      return { ...DEFAULT_VARIANT, sku: `SKU-${Date.now()}-${idx + 1}`, title: Object.values(attributes).join(' / '), attributes, price: basePrice, mrp: baseMrp, sortOrder: idx };
    }));
  }, [options, variants, basePrice, baseMrp, onChange]);

  // ── Variant editing ─────────────────────────────────────────────────────────
  const updateVariant = (idx, field, value) =>
    onChange(variants.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  const removeVariant = (idx) => {
    onChange(variants.filter((_, i) => i !== idx));
    setExpandedVariants((prev) => { const n = new Set(prev); n.delete(idx); return n; });
  };
  const duplicateVariant = (idx) => {
    const copy = { ...variants[idx], sku: `${variants[idx].sku || 'SKU'}-copy`, isDefault: false };
    const next = [...variants]; next.splice(idx + 1, 0, copy);
    onChange(next);
  };
  const setDefaultVariant = (idx) => onChange(variants.map((v, i) => ({ ...v, isDefault: i === idx })));
  const toggleExpandVariant = (idx) =>
    setExpandedVariants((prev) => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; });

  // ── Variant image upload (multi) ────────────────────────────────────────────
  const uploadVariantImages = async (idx, files) => {
    if (!files || !files.length) return;
    const current = variants[idx]?.images || [];
    const remaining = MAX_VARIANT_IMAGES - current.length;
    if (remaining <= 0) { toast.error(`Maximum ${MAX_VARIANT_IMAGES} images per variant`); return; }
    const filesArray = Array.from(files).slice(0, remaining);
    setUploadingVariants((prev) => new Set([...prev, idx]));
    try {
      const urls = await uploadFileMulti(filesArray, 'PRODUCT');
      updateVariant(idx, 'images', [...current, ...urls]);
      toast.success(`${urls.length} image${urls.length > 1 ? 's' : ''} uploaded`);
    } catch (err) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploadingVariants((prev) => { const n = new Set(prev); n.delete(idx); return n; });
    }
  };

  const removeVariantImage = (vIdx, imgIdx) =>
    updateVariant(vIdx, 'images', variants[vIdx].images.filter((_, i) => i !== imgIdx));

  const addVariantImageUrl = (idx, url) => {
    if (!url.trim()) return;
    const current = variants[idx]?.images || [];
    if (current.length >= MAX_VARIANT_IMAGES) { toast.error(`Maximum ${MAX_VARIANT_IMAGES} images per variant`); return; }
    updateVariant(idx, 'images', [...current, url.trim()]);
  };

  // ── Variant drag ─────────────────────────────────────────────────────────────
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

  // ── Bulk actions ─────────────────────────────────────────────────────────────
  const applyToAll = (field, value) => onChange(variants.map((v) => ({ ...v, [field]: value })));

  const totalCombinations = options.every((o) => (o.values || []).length > 0) && options.length
    ? options.reduce((acc, o) => acc * (o.values || []).length, 1)
    : 0;

  // ── Step guide labels ─────────────────────────────────────────────────────────
  const STEPS = [
    { n: 1, label: 'Add Options' },
    { n: 2, label: 'Select Values' },
    { n: 3, label: 'Generate Variants' },
    { n: 4, label: 'Prices & Images' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Step guide ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-0 mb-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.n}>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0" style={{ minWidth: 64 }}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0
                ${step > s.n ? 'bg-[var(--admin-success)] text-white' : step === s.n ? 'bg-[var(--admin-navy)] text-white' : 'bg-[var(--admin-canvas)] text-[var(--admin-muted)] border border-[var(--admin-line)]'}`}>
                {step > s.n ? '✓' : s.n}
              </div>
              <span className={`text-[10px] text-center leading-tight font-${step >= s.n ? '600' : '400'}
                ${step > s.n ? 'text-[var(--admin-success)]' : step === s.n ? 'text-[var(--admin-navy)]' : 'text-[var(--admin-muted)]'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mt-3 ${step > s.n ? 'bg-[var(--admin-success)]' : 'bg-[var(--admin-line)]'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── Option Axes ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-[var(--admin-ink)]">Variant Options</h4>
          <p className="text-xs text-[var(--admin-muted)]">Search from option masters · drag to reorder</p>
        </div>

        <div className="space-y-2">
          {options.map((option, optIdx) => {
            const pValues = getPlatformValuesForOption(optIdx);
            const selectedValues = new Set(option.values || []);
            return (
              <div key={optIdx} draggable
                onDragStart={() => handleOptionDragStart(optIdx)}
                onDragOver={(e) => handleOptionDragOver(e, optIdx)}
                onDragEnd={() => { dragOptionIdx.current = null; }}
                className="border border-[var(--admin-line)] rounded-lg p-3 bg-[var(--admin-surface-soft)] cursor-grab active:cursor-grabbing select-none"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <MdDragIndicator className="text-[var(--admin-muted)] text-base flex-shrink-0" />
                  <span className="text-sm font-semibold text-[var(--admin-ink)] flex-1 min-w-0">{option.name}</span>
                  <select
                    className="text-xs border border-[var(--admin-line)] rounded px-1.5 py-1 bg-white focus:outline-none focus:border-[var(--admin-blue)]"
                    value={option.displayType || 'button'}
                    onChange={(e) => updateOption(optIdx, 'displayType', e.target.value)}
                  >
                    {DISPLAY_TYPES.map((dt) => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-[var(--admin-muted)] cursor-pointer select-none whitespace-nowrap">
                    <input type="checkbox" className="w-3 h-3 accent-[var(--admin-navy)]" checked={Boolean(option.required)} onChange={(e) => updateOption(optIdx, 'required', e.target.checked)} />
                    Required
                  </label>
                  <button type="button" onClick={() => setActiveOptionIdx(activeOptionIdx === optIdx ? null : optIdx)} className="text-xs text-[var(--admin-blue)] hover:underline whitespace-nowrap">
                    {activeOptionIdx === optIdx ? 'Done' : '+ Values'}
                  </button>
                  <button type="button" onClick={() => removeOption(optIdx)} className="text-xs text-[var(--admin-danger)] hover:opacity-80">Remove</button>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(option.values || []).map((val) => {
                    const hex = option.valueCodes?.[val];
                    const pv = pValues.find((p) => p.name === val);
                    const displayHex = hex || pv?.colorHex || '';
                    return (
                      <span key={val} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-[var(--admin-line)] text-[var(--admin-ink)] text-xs rounded-full">
                        {option.displayType === 'color_swatch' && displayHex && (
                          <span className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" style={{ backgroundColor: displayHex }} />
                        )}
                        {option.displayType === 'thumbnail' && (pv?.imageUrl || option.valueCodes?.[val]) && (
                          <img src={pv?.imageUrl || option.valueCodes?.[val]} alt={val} className="w-4 h-4 rounded object-cover flex-shrink-0" />
                        )}
                        {val}
                        <button type="button" onClick={() => removeValueFromOption(optIdx, val)} className="hover:text-[var(--admin-danger)] leading-none text-[var(--admin-muted)]">×</button>
                      </span>
                    );
                  })}
                  {!(option.values || []).length && <span className="text-xs text-[var(--admin-muted)] italic">No values selected — click "+ Values" to add</span>}
                </div>

                {activeOptionIdx === optIdx && (
                  <div className="border-t border-[var(--admin-line)] pt-3 mt-1 space-y-3">
                    {pValues.length > 0 && (
                      <div>
                        <p className="text-[10px] text-[var(--admin-muted)] uppercase tracking-wide mb-1.5">Available values — click to toggle</p>
                        <div className="flex flex-wrap gap-1.5">
                          {pValues.map((pv) => {
                            const isSelected = selectedValues.has(pv.name);
                            return (
                              <button key={pv.name} type="button"
                                onClick={() => { if (isSelected) removeValueFromOption(optIdx, pv.name); else addValueToOption(optIdx, pv.name, pv.colorHex || ''); }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors ${isSelected ? 'bg-[var(--admin-gold)] text-[var(--admin-navy)] border-[var(--admin-gold)]' : 'bg-white text-[var(--admin-ink)] border-[var(--admin-line)] hover:border-[var(--admin-gold)]'}`}
                              >
                                {option.displayType === 'color_swatch' && pv.colorHex && (
                                  <span className="w-3 h-3 rounded-full border border-white/50 flex-shrink-0" style={{ backgroundColor: pv.colorHex }} />
                                )}
                                {option.displayType === 'thumbnail' && pv.imageUrl && (
                                  <img src={pv.imageUrl} alt={pv.name} className="w-4 h-4 rounded object-cover flex-shrink-0" />
                                )}
                                {pv.name}
                                {isSelected && <span className="leading-none font-bold">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {!pValues.length && (
                      <p className="text-xs text-[var(--admin-warning)] bg-[var(--admin-amber-soft)] border border-[var(--admin-warning)]/20 rounded px-3 py-2">
                        No active values found for this option master. Add values in Product Option Values first.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Search + add option */}
        <div className="relative mt-3" ref={optionSearchRef}>
          <input
            type="text"
            className="w-full border border-[var(--admin-line)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/20 focus:border-[var(--admin-blue)] bg-[var(--admin-field)]"
            placeholder="Search option master (Color, Size, RAM…)"
            value={optionSearch}
            onChange={(e) => { setOptionSearch(e.target.value); setShowOptionDropdown(true); }}
            onFocus={() => setShowOptionDropdown(true)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (filteredPlatformOptions.length === 1) addOptionFromPlatform(filteredPlatformOptions[0]); } }}
          />
          {showOptionDropdown && (filteredPlatformOptions.length > 0 || optionSearch.trim()) && (
            <div className="absolute z-30 w-full mt-1 bg-white border border-[var(--admin-line)] rounded-lg shadow-lg max-h-52 overflow-y-auto">
              {filteredPlatformOptions.map((po) => (
                <button key={po._id || po.id} type="button" onClick={() => addOptionFromPlatform(po)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-[var(--admin-surface-soft)] border-b border-[var(--admin-line)] last:border-0">
                  <span className="font-medium text-[var(--admin-ink)]">{po.name}</span>
                  <span className="text-xs text-[var(--admin-muted)] capitalize">{(po.displayType || 'button').replace('_', ' ')}</span>
                </button>
              ))}
              {optionSearch.trim() && !filteredPlatformOptions.length && (
                <div className="px-3 py-2 text-sm text-[var(--admin-muted)]">No active option master found.</div>
              )}
            </div>
          )}
          {showOptionDropdown && <div className="fixed inset-0 z-20" onClick={() => setShowOptionDropdown(false)} />}
        </div>

        {/* Generate button */}
        {totalCombinations > 0 && (
          <div className="mt-4 rounded-xl p-4 flex items-center justify-between gap-4" style={{ background: 'linear-gradient(135deg, var(--admin-navy), #2f2882)' }}>
            <div>
              <p className="text-white text-sm font-bold">✨ Generate {totalCombinations} Variant Combination{totalCombinations !== 1 ? 's' : ''}</p>
              <p className="text-white/60 text-xs mt-0.5">
                {options.map((o) => `${o.name} (${(o.values || []).length})`).join(' × ')}
              </p>
            </div>
            <button type="button" onClick={generateCombinations}
              className="flex-shrink-0 px-4 py-2 bg-[var(--admin-gold)] text-[var(--admin-navy)] text-sm font-bold rounded-lg hover:bg-[var(--admin-gold-dark)] transition-colors">
              Generate Now →
            </button>
          </div>
        )}
      </div>

      {/* ── Bulk Actions ─────────────────────────────────────────────────── */}
      {variants.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center p-3 bg-[var(--admin-surface-soft)] rounded-lg border border-[var(--admin-line)]">
          <span className="text-xs font-semibold text-[var(--admin-ink)]">Apply to all:</span>
          {[
            { field: 'price', label: 'Price ₹' },
            { field: 'mrp', label: 'MRP ₹' },
            { field: 'salePrice', label: 'Sale ₹' },
            { field: 'stock', label: 'Stock' },
            { field: 'gstRate', label: 'GST %' },
          ].map(({ field, label }) => (
            <div key={field} className="flex items-center gap-1">
              <input type="number" min={0} className="w-20 border border-[var(--admin-line)] rounded-md px-2 py-1 text-xs bg-white focus:outline-none focus:border-[var(--admin-blue)]" placeholder={label} onChange={(e) => applyToAll(field, Number(e.target.value))} />
              <span className="text-xs text-[var(--admin-muted)]">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Variants Table ───────────────────────────────────────────────── */}
      {variants.length > 0 && (
        <div className="space-y-1.5">
          <div className="hidden sm:grid gap-1 px-2 py-1 text-[10px] font-semibold text-[var(--admin-muted)] uppercase tracking-wide"
            style={{ gridTemplateColumns: '1.25rem 1rem 1fr 1.2fr 5.5rem 5.5rem 5.5rem 4.5rem 4rem 5rem auto' }}>
            <span /><span />
            <span>SKU</span><span>Variant</span>
            <span>Price ₹</span><span>MRP ₹</span><span>Sale ₹</span>
            <span>Stock</span><span>GST %</span><span>Status</span><span />
          </div>

          {variants.map((variant, idx) => {
            const imageCount = (variant.images || []).length;
            const hasImages = imageCount > 0;
            const isExpanded = expandedVariants.has(idx);
            const isUploading = uploadingVariants.has(idx);

            return (
              <div key={idx} draggable
                onDragStart={() => handleVariantDragStart(idx)}
                onDragOver={(e) => handleVariantDragOver(e, idx)}
                onDragEnd={() => { dragVariantIdx.current = null; }}
                className={`rounded-lg border transition-colors ${variant.isDefault ? 'border-[var(--admin-navy)] bg-[var(--admin-blue-soft)]' : !hasImages ? 'border-[var(--admin-warning)]/50 bg-[var(--admin-amber-soft)]/40' : 'border-[var(--admin-line)] bg-white hover:border-[var(--admin-line-strong)]'}`}
              >
                {/* Main row */}
                <div className="grid gap-1 items-center px-2 py-1.5"
                  style={{ gridTemplateColumns: '1.25rem 1rem 1fr 1.2fr 5.5rem 5.5rem 5.5rem 4.5rem 4rem 5rem auto' }}>
                  <MdDragIndicator className="text-[var(--admin-muted)] text-sm cursor-grab" />
                  <button type="button" title="Set as default" onClick={() => setDefaultVariant(idx)}
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${variant.isDefault ? 'bg-[var(--admin-navy)] border-[var(--admin-navy)]' : 'border-[var(--admin-line)] hover:border-[var(--admin-navy)]'}`}
                  />
                  <input type="text" className="border border-[var(--admin-line)] rounded px-1.5 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-[var(--admin-blue)] bg-white" value={variant.sku || ''} onChange={(e) => updateVariant(idx, 'sku', e.target.value)} placeholder="SKU" />
                  <span className="text-xs text-[var(--admin-ink)] truncate px-1">
                    {variant.attributes && Object.keys(variant.attributes).length ? Object.values(variant.attributes).join(' / ') : variant.title || '—'}
                  </span>
                  <input type="number" min={0} className="border border-[var(--admin-line)] rounded px-1.5 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-[var(--admin-blue)] bg-white" value={variant.price ?? ''} onChange={(e) => updateVariant(idx, 'price', Number(e.target.value))} placeholder="0" />
                  <input type="number" min={0} className="border border-[var(--admin-line)] rounded px-1.5 py-1 text-xs w-full bg-white" value={variant.mrp ?? ''} onChange={(e) => updateVariant(idx, 'mrp', Number(e.target.value))} placeholder="0" />
                  <input type="number" min={0} className="border border-[var(--admin-line)] rounded px-1.5 py-1 text-xs w-full bg-white" value={variant.salePrice ?? ''} onChange={(e) => updateVariant(idx, 'salePrice', Number(e.target.value))} placeholder="0" />
                  <input type="number" min={0} className="border border-[var(--admin-line)] rounded px-1.5 py-1 text-xs w-full bg-white" value={variant.stock ?? 0} onChange={(e) => updateVariant(idx, 'stock', Number(e.target.value))} />
                  <input type="number" min={0} max={100} className="border border-[var(--admin-line)] rounded px-1.5 py-1 text-xs w-full bg-white" value={variant.gstRate ?? 18} onChange={(e) => updateVariant(idx, 'gstRate', Number(e.target.value))} />
                  <select className="border border-[var(--admin-line)] rounded px-1 py-1 text-xs w-full bg-white" value={variant.status || 'active'} onChange={(e) => updateVariant(idx, 'status', e.target.value)}>
                    {productStatuses.options.filter((o) => ['active', 'inactive'].includes(o.value)).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Image button — gold if has images, amber warning if none */}
                    <button type="button" title={hasImages ? `${imageCount} image${imageCount > 1 ? 's' : ''}` : 'No images — click to add'} onClick={() => toggleExpandVariant(idx)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors font-semibold ${isExpanded
                        ? 'bg-[var(--admin-navy)] text-white border-[var(--admin-navy)]'
                        : hasImages
                          ? 'bg-[var(--admin-gold-soft)] text-[var(--admin-gold-dark)] border-[var(--admin-gold)]/40'
                          : 'bg-[var(--admin-amber-soft)] text-[var(--admin-warning)] border-[var(--admin-warning)]/40'}`}>
                      {hasImages ? `🖼 ${imageCount}` : '🖼 !'}
                    </button>
                    <button type="button" title="Duplicate" onClick={() => duplicateVariant(idx)} className="text-xs px-1.5 py-0.5 rounded border border-[var(--admin-line)] text-[var(--admin-muted)] hover:border-[var(--admin-navy)] hover:text-[var(--admin-navy)]">⧉</button>
                    <button type="button" onClick={() => removeVariant(idx)} className="text-[var(--admin-danger)] hover:opacity-70 text-sm leading-none">✕</button>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-[var(--admin-line)] px-3 py-3 space-y-4 bg-[var(--admin-surface-soft)] rounded-b-lg">
                    {/* Image section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-[var(--admin-muted)] uppercase tracking-wide font-semibold flex items-center gap-1.5">
                          <FaImage size={10} /> Variant Images ({imageCount}/{MAX_VARIANT_IMAGES})
                        </span>
                        {!hasImages && (
                          <span className="text-[10px] text-[var(--admin-warning)] bg-[var(--admin-amber-soft)] px-2 py-0.5 rounded-full border border-[var(--admin-warning)]/30 font-semibold">No images yet</span>
                        )}
                      </div>

                      <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-[var(--admin-blue-soft)] border border-[var(--admin-blue)]/20 mb-3">
                        <FaInfoCircle className="text-[var(--admin-blue)] mt-0.5 flex-shrink-0" size={11} />
                        <p className="text-xs text-[var(--admin-ink)]/75 leading-relaxed">
                          These images replace the product gallery when a customer selects the <strong>{variant.attributes ? Object.values(variant.attributes).join(' / ') : variant.title || 'this variant'}</strong>.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 items-start">
                        {(variant.images || []).map((img, imgIdx) => (
                          <div key={imgIdx} className="relative w-16 h-16 rounded border border-[var(--admin-line)] overflow-hidden group flex-shrink-0 bg-[var(--admin-surface-soft)]">
                            <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTIxIDMuMUgzQzIgMy4xIDEgNC4xIDEgNS4xdjEzLjhDMSAxOS45IDIgMjAuOSAzIDIwLjloMThDMjIgMjAuOSAyMyAxOS45IDIzIDE4LjlWNS4xQzIzIDQuMSAyMiAzLjEgMjEgMy4xem0tMSAxNS44SDR2LTJsMy0zIDMuNSAzLjUgNC41LTUuNSA1IDcuNXptMC05LjZjMCAuOC0uNyAxLjUtMS41IDEuNVM1LjQgMTAuMSA1LjQgOS4zcy43LTEuNSAxLjUtMS41IDEuNS43IDEuNSAxLjV6Ii8+PC9zdmc+'; }}
                            />
                            {imgIdx === 0 && (
                              <div className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[8px] font-bold px-1 rounded">Cover</div>
                            )}
                            <button type="button" onClick={() => removeVariantImage(idx, imgIdx)}
                              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[var(--admin-danger)] text-white text-[9px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                          </div>
                        ))}

                        {/* Upload slots */}
                        {imageCount < MAX_VARIANT_IMAGES && (
                          <label className={`w-16 h-16 rounded border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors flex-shrink-0 ${isUploading ? 'border-[var(--admin-line)] opacity-50 pointer-events-none' : 'border-[var(--admin-line)] hover:border-[var(--admin-gold)] text-[var(--admin-muted)] hover:text-[var(--admin-gold)]'}`}>
                            {isUploading ? <span className="text-[10px] text-[var(--admin-muted)]">⏳</span> : <><MdAdd size={20} /><span className="text-[9px] mt-0.5">Upload</span></>}
                            <input type="file" accept="image/*" multiple className="hidden"
                              onChange={(e) => uploadVariantImages(idx, e.target.files)} />
                          </label>
                        )}
                      </div>

                      {/* URL paste */}
                      {imageCount < MAX_VARIANT_IMAGES && (
                        <div className="flex gap-2 mt-2">
                          <input type="text" className="flex-1 border border-[var(--admin-line)] rounded px-2 py-1 text-xs focus:outline-none focus:border-[var(--admin-blue)] bg-white" placeholder="Or paste image URL and press Enter…"
                            onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { e.preventDefault(); addVariantImageUrl(idx, e.target.value); e.target.value = ''; } }} />
                        </div>
                      )}
                    </div>

                    {/* Extra fields */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <label className="flex flex-col gap-1"><span className="text-[10px] text-[var(--admin-muted)] uppercase tracking-wide">Barcode</span><input type="text" className="border border-[var(--admin-line)] rounded px-2 py-1 text-xs bg-white" value={variant.barcode || ''} onChange={(e) => updateVariant(idx, 'barcode', e.target.value)} placeholder="EAN/UPC" /></label>
                      <label className="flex flex-col gap-1"><span className="text-[10px] text-[var(--admin-muted)] uppercase tracking-wide">Weight (kg)</span><input type="number" min={0} className="border border-[var(--admin-line)] rounded px-2 py-1 text-xs bg-white" value={variant.weight || ''} onChange={(e) => updateVariant(idx, 'weight', Number(e.target.value))} /></label>
                      <label className="flex flex-col gap-1"><span className="text-[10px] text-[var(--admin-muted)] uppercase tracking-wide">Title Override</span><input type="text" className="border border-[var(--admin-line)] rounded px-2 py-1 text-xs bg-white" value={variant.title || ''} onChange={(e) => updateVariant(idx, 'title', e.target.value)} /></label>
                      <label className="flex flex-col gap-1"><span className="text-[10px] text-[var(--admin-muted)] uppercase tracking-wide">Sort Order</span><input type="number" min={0} className="border border-[var(--admin-line)] rounded px-2 py-1 text-xs bg-white" value={variant.sortOrder ?? idx} onChange={(e) => updateVariant(idx, 'sortOrder', Number(e.target.value))} /></label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add manually */}
      <button type="button" onClick={() => onChange([...variants, { ...DEFAULT_VARIANT, sku: `SKU-${Date.now()}`, price: basePrice, mrp: baseMrp }])}
        className="w-full py-2.5 border-2 border-dashed border-[var(--admin-line)] rounded-lg text-sm text-[var(--admin-muted)] hover:border-[var(--admin-navy)] hover:text-[var(--admin-navy)] transition-colors">
        + Add Variant Manually
      </button>

      {variants.length > 0 && (
        <p className="text-xs text-[var(--admin-muted)]">
          ● = default &nbsp;·&nbsp; ⠿ drag to reorder &nbsp;·&nbsp; 🖼 ! = no images uploaded &nbsp;·&nbsp; ⧉ duplicate &nbsp;·&nbsp; ✕ remove
        </p>
      )}
    </div>
  );
};

export default VariantBuilder;
