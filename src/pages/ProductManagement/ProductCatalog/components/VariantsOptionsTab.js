import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiMinusCircle } from 'react-icons/fi';
import { FaChevronDown, FaChevronUp, FaImage, FaInfoCircle } from 'react-icons/fa';
import { MdAdd, MdClose } from 'react-icons/md';
import FilterSelect from '../../../../components/Atoms/FilterSelect/FilterSelect';
import Input from '../../../../components/Atoms/Input/Input';
import Button from '../../../../components/Atoms/buttons/button';
import { uploadFileMulti } from '../../../../_helpers/globalFunctions';
import { toast } from 'sonner';

const MAX_VARIANT_IMAGES = 5;

const EMPTY_ROW = () => ({
  id: Date.now() + Math.random(),
  sku: '',
  type: null,
  remark: '',
  packaging: '',
  mrp: '',
  discount: '',
  salePrice: '',
  stock: '',
  images: [],
});

const calculateSalePrice = (mrp, discount) => {
  const m = parseFloat(mrp) || 0;
  const d = parseFloat(discount) || 0;
  if (m <= 0) return '';
  if (d <= 0) return m.toFixed(2);
  return (m - (m * d) / 100).toFixed(2);
};

export default function VariantsOptionsTab({
  options,
  setVariantRows,
  setFormData,
  platformOptions = [],
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [errors, setErrors] = useState({});
  const [variantRows, setLocalVariantRows] = useState([EMPTY_ROW()]);
  const [uploadingRows, setUploadingRows] = useState(new Set());
  const [expandedImages, setExpandedImages] = useState(new Set());
  const fileInputRefs = useRef({});

  // ── Seed from parent ────────────────────────────────────────────────────────
  useEffect(() => {
    if (options && Array.isArray(options) && options.length > 0) {
      const rows = options.map((o, i) => ({ id: o._id || Date.now() + i, ...o, images: o.images || [] }));
      setLocalVariantRows(rows);
      setVariantRows(rows);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync to parent ──────────────────────────────────────────────────────────
  const syncUp = useCallback((rows) => {
    setLocalVariantRows(rows);
    setVariantRows(rows);
    setFormData((prev) => ({ ...prev, options: rows }));
  }, [setVariantRows, setFormData]);

  // ── Field change ────────────────────────────────────────────────────────────
  const handleFieldChange = useCallback((index, fieldName, value) => {
    const updated = [...variantRows];
    updated[index] = { ...updated[index], [fieldName]: value };
    if (fieldName === 'mrp' || fieldName === 'discount') {
      const mrp = fieldName === 'mrp' ? value : updated[index].mrp;
      const disc = fieldName === 'discount' ? value : updated[index].discount;
      updated[index].salePrice = calculateSalePrice(mrp, disc);
    }
    syncUp(updated);
    setErrors((prev) => {
      const next = { ...prev };
      if (next[index]?.[fieldName]) {
        delete next[index][fieldName];
        if (!Object.keys(next[index]).length) delete next[index];
      }
      return next;
    });
  }, [variantRows, syncUp]);

  const handleOptionSelect = useCallback((index, selected) => {
    const updated = [...variantRows];
    updated[index] = { ...updated[index], type: selected?.value || null };
    syncUp(updated);
  }, [variantRows, syncUp]);

  // ── Row management ──────────────────────────────────────────────────────────
  const addRow = () => syncUp([...variantRows, EMPTY_ROW()]);

  const removeRow = useCallback((index) => {
    if (variantRows.length <= 1) return;
    const updated = variantRows.filter((_, i) => i !== index);
    syncUp(updated);
    setErrors((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        const ki = parseInt(k, 10);
        if (ki < index) next[ki] = prev[k];
        else if (ki > index) next[ki - 1] = prev[k];
      });
      return next;
    });
  }, [variantRows, syncUp]);

  // ── Image upload ────────────────────────────────────────────────────────────
  const uploadImages = async (index, files) => {
    if (!files || !files.length) return;
    const current = variantRows[index]?.images || [];
    const remaining = MAX_VARIANT_IMAGES - current.length;
    if (remaining <= 0) { toast.error(`Maximum ${MAX_VARIANT_IMAGES} images per variant`); return; }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploadingRows((prev) => new Set([...prev, index]));
    try {
      const urls = await uploadFileMulti(toUpload, 'PRODUCTS');
      const updated = [...variantRows];
      updated[index] = { ...updated[index], images: [...current, ...urls] };
      syncUp(updated);
      toast.success(`${urls.length} image${urls.length > 1 ? 's' : ''} added`);
    } catch (err) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploadingRows((prev) => { const n = new Set(prev); n.delete(index); return n; });
    }
  };

  const removeImage = (rowIdx, imgIdx) => {
    const updated = [...variantRows];
    updated[rowIdx] = { ...updated[rowIdx], images: updated[rowIdx].images.filter((_, i) => i !== imgIdx) };
    syncUp(updated);
  };

  const toggleImages = (index) =>
    setExpandedImages((prev) => { const n = new Set(prev); if (n.has(index)) n.delete(index); else n.add(index); return n; });

  const optionChoices = platformOptions.map((o) => ({ value: o.slug || o.name, label: o.name }));
  const getSelectedOption = (row) => {
    if (!row.type) return null;
    return optionChoices.find((o) => o.value === row.type || o.label === row.type) || null;
  };

  return (
    <div className="w-full bg-white">
      {/* Section header */}
      <div
        className="flex items-center justify-between pb-4 mb-5 cursor-pointer select-none border-b border-gray-100 hover:opacity-80 transition-opacity"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Simple Product Variants</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Add size / pack / style variants — each row is a separate purchasable option
          </p>
        </div>
        {isExpanded
          ? <FaChevronUp className="text-gray-400 text-sm flex-shrink-0" />
          : <FaChevronDown className="text-gray-400 text-sm flex-shrink-0" />}
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {/* Info banner */}
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[var(--admin-blue-soft)] border border-[var(--admin-blue)]/20 text-xs text-[var(--admin-ink)]/70">
            <FaInfoCircle className="text-[var(--admin-blue)] mt-0.5 flex-shrink-0" size={11} />
            <span>
              Each row is a variant of this simple product. Images per variant replace the main product gallery when the customer selects that option.
            </span>
          </div>

          {/* Variant rows */}
          <div className="space-y-3">
            {variantRows.map((row, index) => {
              const imageCount = (row.images || []).length;
              const hasImages = imageCount > 0;
              const isImagesOpen = expandedImages.has(index);
              const isUploading = uploadingRows.has(index);

              return (
                <div key={row.id || index}
                  className={`rounded-xl border overflow-hidden transition-colors ${!hasImages ? 'border-[var(--admin-warning)]/40' : 'border-[var(--admin-line)]'}`}>
                  {/* Row header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-[var(--admin-surface-soft)] border-b border-[var(--admin-line)]">
                    <span className="text-xs font-semibold text-[var(--admin-muted)]">Variant #{index + 1}</span>
                    <div className="flex items-center gap-2">
                      {/* Image toggle */}
                      <button type="button" onClick={() => toggleImages(index)}
                        className={`text-[10px] px-2 py-0.5 rounded border font-semibold flex items-center gap-1 transition-colors
                          ${isImagesOpen ? 'bg-[var(--admin-navy)] text-white border-[var(--admin-navy)]'
                          : hasImages ? 'bg-[var(--admin-gold-soft)] text-[var(--admin-gold-dark)] border-[var(--admin-gold)]/40'
                          : 'bg-[var(--admin-amber-soft)] text-[var(--admin-warning)] border-[var(--admin-warning)]/40'}`}>
                        <FaImage size={9} />
                        {hasImages ? `${imageCount} image${imageCount > 1 ? 's' : ''}` : 'No images'}
                      </button>
                      {variantRows.length > 1 && (
                        <button type="button" onClick={() => removeRow(index)}
                          className="p-1 text-[var(--admin-danger)] hover:bg-red-50 rounded-full transition-colors" aria-label="Remove variant">
                          <FiMinusCircle size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fields grid */}
                  <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <Input labelName="SKU" value={row.sku || ''} onChange={(e) => handleFieldChange(index, 'sku', e.target.value)} placeholder="e.g. SKU-RED-M" name={`sku_${index}`} />
                      </div>
                      <div>
                        <FilterSelect label="Option Type" options={optionChoices} value={getSelectedOption(row)}
                          onChange={(val) => handleOptionSelect(index, val)} placeholder="Select option" />
                        {errors[index]?.type && <p className="mt-1 text-xs text-[var(--admin-danger)]">{errors[index].type}</p>}
                      </div>
                      <div>
                        <Input labelName="Remark" value={row.remark || ''} onChange={(e) => handleFieldChange(index, 'remark', e.target.value)} placeholder="e.g. Limited edition" name={`remark_${index}`} />
                      </div>
                      <div>
                        <Input labelName="Packaging" value={row.packaging || ''} onChange={(e) => handleFieldChange(index, 'packaging', e.target.value)} placeholder="e.g. Box of 6" name={`packaging_${index}`} />
                      </div>
                      <div>
                        <Input labelName="MRP (₹) *" value={row.mrp || ''} onChange={(e) => handleFieldChange(index, 'mrp', e.target.value)} placeholder="0.00" name={`mrp_${index}`} type="number" />
                        {errors[index]?.mrp && <p className="mt-1 text-xs text-[var(--admin-danger)]">{errors[index].mrp}</p>}
                      </div>
                      <div>
                        <Input labelName="Discount (%)" value={row.discount || ''} onChange={(e) => handleFieldChange(index, 'discount', e.target.value)} placeholder="0" name={`discount_${index}`} type="number" />
                      </div>
                      <div>
                        <Input labelName="Sale Price (₹) *" value={row.salePrice || ''} onChange={(e) => handleFieldChange(index, 'salePrice', e.target.value)} placeholder="Auto-calculated" name={`salePrice_${index}`} type="number" disable />
                        <span className="text-[10px] text-[var(--admin-muted)] mt-0.5 block">Auto from MRP − Discount</span>
                      </div>
                      <div>
                        <Input labelName="Stock" value={row.stock || ''} onChange={(e) => handleFieldChange(index, 'stock', e.target.value)} placeholder="0" name={`stock_${index}`} type="number" />
                      </div>
                    </div>
                  </div>

                  {/* Image section */}
                  {isImagesOpen && (
                    <div className="border-t border-[var(--admin-line)] px-4 py-4 bg-[var(--admin-surface-soft)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-[var(--admin-muted)] uppercase tracking-wide flex items-center gap-1.5">
                          <FaImage size={10} /> Variant Images ({imageCount}/{MAX_VARIANT_IMAGES})
                        </span>
                      </div>

                      <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-[var(--admin-blue-soft)] border border-[var(--admin-blue)]/20">
                        <FaInfoCircle className="text-[var(--admin-blue)] mt-0.5 flex-shrink-0" size={11} />
                        <p className="text-xs text-[var(--admin-ink)]/70 leading-relaxed">
                          These images override the main product gallery when a customer selects this variant.
                          First image is the cover.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 items-start">
                        {(row.images || []).map((img, imgIdx) => (
                          <div key={imgIdx} className="relative w-16 h-16 rounded border border-[var(--admin-line)] overflow-hidden group flex-shrink-0 bg-white">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            {imgIdx === 0 && (
                              <div className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[7px] font-bold px-1 rounded">Cover</div>
                            )}
                            <button type="button" onClick={() => removeImage(index, imgIdx)}
                              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[var(--admin-danger)] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <MdClose size={9} />
                            </button>
                          </div>
                        ))}

                        {imageCount < MAX_VARIANT_IMAGES && (
                          <label className={`w-16 h-16 rounded border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors flex-shrink-0 ${isUploading ? 'opacity-50 pointer-events-none border-[var(--admin-line)]' : 'border-[var(--admin-line)] hover:border-[var(--admin-gold)] text-[var(--admin-muted)] hover:text-[var(--admin-gold)]'}`}>
                            {isUploading
                              ? <span className="text-xs">⏳</span>
                              : <><MdAdd size={20} /><span className="text-[9px] mt-0.5">Upload</span></>}
                            <input type="file" accept="image/*" multiple className="hidden"
                              onChange={(e) => uploadImages(index, e.target.files)} />
                          </label>
                        )}
                      </div>

                      {imageCount >= MAX_VARIANT_IMAGES && (
                        <p className="text-xs text-[var(--admin-muted)]">Maximum {MAX_VARIANT_IMAGES} images per variant reached.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add row */}
          <Button onClick={addRow} type="button" variant="secondary" className="!text-xs">
            <MdAdd size={15} /> Add Variant
          </Button>

          {/* Error summary */}
          {Object.keys(errors).length > 0 && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
              <h4 className="text-sm font-semibold text-[var(--admin-danger)] mb-2">Please fix:</h4>
              <ul className="text-xs text-[var(--admin-danger)] space-y-1">
                {Object.entries(errors).map(([key, error]) =>
                  typeof error === 'object'
                    ? Object.entries(error).map(([field, msg]) => <li key={`${key}-${field}`}>• Row {parseInt(key, 10) + 1}: {msg}</li>)
                    : <li key={key}>• {error}</li>,
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
