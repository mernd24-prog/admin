import React, { useState, useCallback, useRef, useEffect } from "react";
import { uploadFileMulti } from "../../_helpers/globalFunctions";
import { toast } from "sonner";
import useDropdownOptions from "../../hooks/useDropdownOptions";
import { MdDragIndicator, MdAdd } from "react-icons/md";
import { FaInfoCircle } from "react-icons/fa";
import FilterSelect from "../Atoms/FilterSelect/FilterSelect";

const MAX_VARIANT_IMAGES = 5;

const sanitizeDecimalInput = (value, { max = null, decimals = 2 } = {}) => {
  let next = String(value ?? "")
    .replace(/[^0-9.]/g, "")
    .replace(/(\..*)\./g, "$1");

  if (next.startsWith(".")) {
    next = `0${next}`;
  }

  const [whole = "", decimal = ""] = next.split(".");

  next =
    next.includes(".") && decimals > 0
      ? `${whole}.${decimal.slice(0, decimals)}`
      : whole;

  if (next === "") return "";

  if (max !== null && Number(next) > max) {
    return String(max);
  }

  return next;
};

const blockInvalidNumberKeys = (event) => {
  if (["e", "E", "+", "-", "_", "?", "*", " "].includes(event.key)) {
    event.preventDefault();
  }
};

const DISPLAY_TYPES = [
  { value: "button", label: "Button" },
  { value: "dropdown", label: "Dropdown" },
  { value: "color_swatch", label: "Color Swatch" },
  { value: "radio", label: "Radio" },
  { value: "thumbnail", label: "Thumbnail" },
];

const DEFAULT_VARIANT = {
  sku: "",
  title: "",
  price: "",
  mrp: "",
  salePrice: "",
  gstRate: 18,
  stock: 0,
  barcode: "",
  weight: "",
  status: "active",
  isDefault: false,
  attributes: {},
  images: [],
};

const FieldLabel = ({ children }) => (
  <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
    {children}
  </span>
);

const SmallInput = ({ className = "", error = "", ...props }) => (
  <input
    className={`w-full rounded-md border bg-white px-2 py-1.5 text-xs text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-1 ${error ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-gray-200 focus:border-[var(--admin-blue)] focus:ring-[var(--admin-blue)]/20"} ${className}`}
    aria-invalid={Boolean(error)}
    {...props}
  />
);

const VariantBuilder = ({
  variants = [],
  options = [],
  platformOptions = [],
  platformValues = {},
  onChange,
  onOptionsChange,
  onOptionSearch,
  errors = {},
  onClearError,
}) => {
  const productStatuses = useDropdownOptions("product-statuses");
  const [optionSearch, setOptionSearch] = useState("");
  const [showOptionDropdown, setShowOptionDropdown] = useState(false);
  const [activeOptionIdx, setActiveOptionIdx] = useState(null);
  const [expandedVariants, setExpandedVariants] = useState(new Set());
  const [uploadingVariants, setUploadingVariants] = useState(new Set());
  const [bulkValues, setBulkValues] = useState({});
  const optionSearchRef = useRef(null);
  const dragOptionIdx = useRef(null);
  const dragVariantIdx = useRef(null);

  useEffect(() => {
    onOptionSearch?.(optionSearch);
  }, [optionSearch, onOptionSearch]);

  const step =
    options.length === 0
      ? 1
      : options.some((o) => !(o.values || []).length)
        ? 2
        : variants.length === 0
          ? 3
          : 4;

  const existingNames = options.map((o) => o.name.toLowerCase());
  const filteredPlatformOptions = platformOptions.filter(
    (po) =>
      !existingNames.includes((po.name || "").toLowerCase()) &&
      (!optionSearch ||
        (po.name || "").toLowerCase().includes(optionSearch.toLowerCase())),
  );

  const addOptionFromPlatform = (po) => {
    onOptionsChange([
      ...options,
      {
        name: po.name,
        platformOptionId: po._id || po.id,
        displayType: po.displayType || "button",
        values: [],
        valueCodes: {},
        required: false,
        sortOrder: options.length,
      },
    ]);
    setOptionSearch("");
    setShowOptionDropdown(false);
  };
  const removeOption = (idx) =>
    onOptionsChange(options.filter((_, i) => i !== idx));
  const updateOption = (idx, field, value) =>
    onOptionsChange(
      options.map((o, i) => (i !== idx ? o : { ...o, [field]: value })),
    );

  const addValueToOption = (optIdx, label, colorHex = "") => {
    const opt = options[optIdx];
    if (!label || (opt.values || []).includes(label)) return;
    const updatedValues = [...(opt.values || []), label];
    const updatedCodes = { ...(opt.valueCodes || {}) };
    if (colorHex) updatedCodes[label] = colorHex;
    onOptionsChange(
      options.map((o, i) =>
        i !== optIdx
          ? o
          : { ...o, values: updatedValues, valueCodes: updatedCodes },
      ),
    );
  };
  const removeValueFromOption = (optIdx, val) => {
    const opt = options[optIdx];
    const codes = { ...(opt.valueCodes || {}) };
    delete codes[val];
    onOptionsChange(
      options.map((o, i) =>
        i !== optIdx
          ? o
          : {
              ...o,
              values: (o.values || []).filter((v) => v !== val),
              valueCodes: codes,
            },
      ),
    );
  };

  const getPlatformValuesForOption = (optIdx) => {
    const opt = options[optIdx];
    if (!opt?.platformOptionId) return [];
    return platformValues[opt.platformOptionId] || [];
  };

  const handleOptionDragStart = (idx) => {
    dragOptionIdx.current = idx;
  };
  const handleOptionDragOver = (e, idx) => {
    e.preventDefault();
    if (dragOptionIdx.current === null || dragOptionIdx.current === idx) return;
    const next = [...options];
    const [d] = next.splice(dragOptionIdx.current, 1);
    next.splice(idx, 0, d);
    dragOptionIdx.current = idx;
    onOptionsChange(next.map((o, i) => ({ ...o, sortOrder: i })));
  };

  const generateCombinations = useCallback(() => {
    if (!options.length || options.some((o) => !(o.values || []).length))
      return;
    const cartesian = (axes) => {
      if (!axes.length) return [{}];
      const [head, ...tail] = axes;
      return head.values.flatMap((v) =>
        cartesian(tail).map((c) => ({ [head.name.toLowerCase()]: v, ...c })),
      );
    };
    const existingMap = new Map(
      variants.map((v) => [JSON.stringify(v.attributes), v]),
    );
    onChange(
      cartesian(options).map((attributes, idx) => {
        const key = JSON.stringify(attributes);
        const existing = existingMap.get(key);
        if (existing) return existing;
        return {
          ...DEFAULT_VARIANT,
          sku: `SKU-${Date.now()}-${idx + 1}`,
          title: Object.values(attributes).join(" / "),
          attributes,
          isDefault: idx === 0,
          sortOrder: idx,
        };
      }),
    );
  }, [options, variants, onChange]);

  const updateVariant = (idx, field, value) => {
    setExpandedVariants((previous) => {
      const next = new Set(previous);
      next.add(idx);
      return next;
    });
    onClearError?.(idx, field);
    onChange(
      variants.map((v, i) => (i === idx ? { ...v, [field]: value } : v)),
    );
  };
  const removeVariant = (idx) => {
    onChange(variants.filter((_, i) => i !== idx));
    setExpandedVariants((prev) => {
      const n = new Set(prev);
      n.delete(idx);
      return n;
    });
  };
  const duplicateVariant = (idx) => {
    const copy = {
      ...variants[idx],
      sku: `${variants[idx].sku || "SKU"}-copy`,
      isDefault: false,
    };
    const next = [...variants];
    next.splice(idx + 1, 0, copy);
    onChange(next);
  };
  const setDefaultVariant = (idx) =>
    onChange(variants.map((v, i) => ({ ...v, isDefault: i === idx })));
  const toggleExpand = (idx) =>
    setExpandedVariants((prev) => {
      const n = new Set(prev);
      if (n.has(idx)) n.delete(idx);
      else n.add(idx);
      return n;
    });

  const uploadVariantImages = async (idx, files) => {
    if (!files || !files.length) return;
    const current = variants[idx]?.images || [];
    const remaining = MAX_VARIANT_IMAGES - current.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_VARIANT_IMAGES} images per variant`);
      return;
    }
    const filesArray = Array.from(files).slice(0, remaining);
    setUploadingVariants((prev) => new Set([...prev, idx]));
    try {
      const urls = await uploadFileMulti(filesArray, "PRODUCT");
      updateVariant(idx, "images", [...current, ...urls]);
      toast.success(
        `${urls.length} image${urls.length > 1 ? "s" : ""} uploaded`,
      );
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploadingVariants((prev) => {
        const n = new Set(prev);
        n.delete(idx);
        return n;
      });
    }
  };
  const removeVariantImage = (vIdx, imgIdx) =>
    updateVariant(
      vIdx,
      "images",
      variants[vIdx].images.filter((_, i) => i !== imgIdx),
    );
  // const addVariantImageUrl = (idx, url) => {
  //   if (!url.trim()) return;
  //   const current = variants[idx]?.images || [];
  //   if (current.length >= MAX_VARIANT_IMAGES) { toast.error(`Maximum ${MAX_VARIANT_IMAGES} images per variant`); return; }
  //   updateVariant(idx, 'images', [...current, url.trim()]);
  // };

  const handleVariantDragStart = (idx) => {
    dragVariantIdx.current = idx;
  };
  const handleVariantDragOver = (e, idx) => {
    e.preventDefault();
    if (dragVariantIdx.current === null || dragVariantIdx.current === idx)
      return;
    const next = [...variants];
    const [d] = next.splice(dragVariantIdx.current, 1);
    next.splice(idx, 0, d);
    dragVariantIdx.current = idx;
    onChange(next.map((v, i) => ({ ...v, sortOrder: i })));
  };

  const applyToAll = (field, value) => {
    if (value === "" || value === undefined) return;
    onChange(variants.map((v) => ({ ...v, [field]: Number(value) })));
    toast.success(`Applied to all ${variants.length} variants`);
  };

  const totalCombinations =
    options.every((o) => (o.values || []).length > 0) && options.length
      ? options.reduce((acc, o) => acc * (o.values || []).length, 1)
      : 0;

  const STEPS = [
    { n: 1, label: "Add Options" },
    { n: 2, label: "Pick Values" },
    { n: 3, label: "Generate" },
    { n: 4, label: "Edit Prices" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Step Guide ──────────────────────────────────────────────── */}
      <div className="flex items-center">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.n}>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${
                  step > s.n
                    ? "bg-emerald-500 text-white"
                    : step === s.n
                      ? "bg-[var(--admin-blue)] text-white ring-4 ring-[var(--admin-blue)]/20"
                      : "bg-gray-100 text-gray-400 border border-gray-200"
                }`}
              >
                {step > s.n ? "✓" : s.n}
              </div>
              <span
                className={`text-[10px] font-medium text-center whitespace-nowrap
                ${step > s.n ? "text-emerald-600" : step === s.n ? "text-[var(--admin-blue)]" : "text-gray-400"}`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 mb-4 transition-colors ${step > s.n ? "bg-emerald-400" : "bg-gray-200"}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── Option Axes ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">Variant Options</p>
          <p className="text-xs text-gray-400">Drag to reorder</p>
        </div>

        {options.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center">
            <p className="text-sm font-medium text-gray-500">
              No options added yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Search and add an option below (Color, Size, RAM…)
            </p>
          </div>
        )}

        {options.map((option, optIdx) => {
          const pValues = getPlatformValuesForOption(optIdx);
          const selectedValues = new Set(option.values || []);
          const isOpen = activeOptionIdx === optIdx;
          return (
            <div
              key={optIdx}
              draggable
              onDragStart={() => handleOptionDragStart(optIdx)}
              onDragOver={(e) => handleOptionDragOver(e, optIdx)}
              onDragEnd={() => {
                dragOptionIdx.current = null;
              }}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden"
            >
              {/* Option header */}
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2.5">
                <MdDragIndicator className="text-gray-300 text-lg flex-shrink-0 cursor-grab" />
                <span className="text-sm font-semibold text-gray-800 flex-1 min-w-0">
                  {option.name}
                </span>
                <div className="ml-auto flex h-8 shrink-0 items-stretch overflow-hidden rounded-md border border-gray-200 bg-white">
                  <select
                    className="h-full min-w-[116px] border-0 bg-white px-2 text-xs text-gray-700 outline-none focus:ring-0"
                    value={option.displayType || "button"}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      updateOption(optIdx, "displayType", e.target.value)
                    }
                  >
                    {DISPLAY_TYPES.map((dt) => (
                      <option key={dt.value} value={dt.value}>
                        {dt.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex h-full cursor-pointer items-center gap-1.5 whitespace-nowrap border-l border-gray-200 px-2.5 text-xs text-gray-600 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-[var(--admin-blue)]"
                      checked={Boolean(option.required)}
                      onChange={(e) =>
                        updateOption(optIdx, "required", e.target.checked)
                      }
                    />
                    Required
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveOptionIdx(isOpen ? null : optIdx)}
                    className="inline-flex h-full items-center whitespace-nowrap border-l border-gray-200 px-2.5 text-xs font-medium leading-none text-[var(--admin-blue)] hover:bg-blue-50"
                  >
                    {isOpen ? "Done" : "+ Values"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeOption(optIdx)}
                    className="inline-flex h-full items-center whitespace-nowrap border-l border-gray-200 px-2.5 text-xs font-medium leading-none text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Selected values */}
              <div className="px-3 py-2.5 flex flex-wrap gap-1.5 min-h-[40px]">
                {(option.values || []).map((val) => {
                  const hex = option.valueCodes?.[val];
                  const pv = pValues.find((p) => p.name === val);
                  const displayHex = hex || pv?.colorHex || "";
                  return (
                    <span
                      key={val}
                      className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-gray-100 border border-gray-200 text-gray-700 text-xs rounded-full"
                    >
                      {option.displayType === "color_swatch" && displayHex && (
                        <span
                          className="w-3 h-3 rounded-full border border-white/50 flex-shrink-0"
                          style={{ backgroundColor: displayHex }}
                        />
                      )}
                      {val}
                      <button
                        type="button"
                        onClick={() => removeValueFromOption(optIdx, val)}
                        className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-500 text-gray-400 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                {!(option.values || []).length && (
                  <span className="text-xs text-gray-400 italic">
                    No values selected — click &quot;+ Values&quot;
                  </span>
                )}
              </div>

              {/* Value picker panel */}
              {isOpen && (
                <div className="border-t border-gray-100 px-3 py-3 bg-blue-50/50 space-y-3">
                  {pValues.length > 0 ? (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        Click values to toggle
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {pValues.map((pv) => {
                          const isSelected = selectedValues.has(pv.name);
                          return (
                            <button
                              key={pv.name}
                              type="button"
                              onClick={() => {
                                if (isSelected)
                                  removeValueFromOption(optIdx, pv.name);
                                else
                                  addValueToOption(
                                    optIdx,
                                    pv.name,
                                    pv.colorHex || "",
                                  );
                              }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border font-medium transition-all
                                ${
                                  isSelected
                                    ? "bg-[var(--admin-blue)] text-white border-[var(--admin-blue)] shadow-sm"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-[var(--admin-blue)] hover:text-[var(--admin-blue)]"
                                }`}
                            >
                              {option.displayType === "color_swatch" &&
                                pv.colorHex && (
                                  <span
                                    className="w-3 h-3 rounded-full border border-white/40 flex-shrink-0"
                                    style={{ backgroundColor: pv.colorHex }}
                                  />
                                )}
                              {pv.name}
                              {isSelected && (
                                <span className="text-[10px]">✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      No values found for this option. Add values in Product
                      Option Values first.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Search & add option */}
        <div className="relative" ref={optionSearchRef}>
          <div className="flex items-center gap-2 rounded-lg border bg-[var(--admin-field)] px-3 py-2 transition-all focus-within:border-[var(--admin-gold)] focus-within:ring-[var(--admin-gold)]/15">
            <MdAdd className="text-gray-800 flex-shrink-0" size={18} />
            <input
              type="text"
              className="product-variant-search-input min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-gray-800 shadow-none placeholder:text-gray-500 focus:border-0 focus:outline-none focus:ring-0"
              placeholder="Search option master (Color, Size, RAM…)"
              value={optionSearch}
              onChange={(e) => {
                setOptionSearch(e.target.value);
                setShowOptionDropdown(true);
              }}
              onFocus={() => setShowOptionDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filteredPlatformOptions.length === 1)
                    addOptionFromPlatform(filteredPlatformOptions[0]);
                }
              }}
            />
          </div>
          {showOptionDropdown &&
            (filteredPlatformOptions.length > 0 || optionSearch.trim()) && (
              <div className="absolute z-30 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                {filteredPlatformOptions.map((po) => (
                  <button
                    key={po._id || po.id}
                    type="button"
                    onClick={() => addOptionFromPlatform(po)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                  >
                    <span className="font-medium text-gray-800">{po.name}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                      {(po.displayType || "button").replace("_", " ")}
                    </span>
                  </button>
                ))}
                {optionSearch.trim() && !filteredPlatformOptions.length && (
                  <div className="px-4 py-3 text-sm text-gray-400 text-center">
                    No matching option found
                  </div>
                )}
              </div>
            )}
          {showOptionDropdown && (
            <div
              className="fixed inset-0 z-20"
              onClick={() => setShowOptionDropdown(false)}
            />
          )}
        </div>

        {/* Generate CTA */}
        {totalCombinations > 0 && (
          <div
            className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{ background: "linear-gradient(135deg, #1e3a8a, #2f2882)" }}
          >
            <div>
              <p className="text-white text-sm font-bold">
                Generate {totalCombinations} Variant Combination
                {totalCombinations !== 1 ? "s" : ""}
              </p>
              <p className="text-white/60 text-xs mt-0.5">
                {options
                  .map((o) => `${o.name} (${(o.values || []).length})`)
                  .join(" × ")}
              </p>
            </div>
            <button
              type="button"
              onClick={generateCombinations}
              className="flex-shrink-0 px-5 py-2 bg-yellow-400 text-blue-900 text-sm font-bold rounded-lg hover:bg-yellow-300 transition-colors whitespace-nowrap"
            >
              Generate →
            </button>
          </div>
        )}
      </div>

      {/* ── Bulk Actions ──────────────────────────────────────────────── */}
      {variants.length > 0 && (
        <div className="w-full rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-gray-800">
              Apply to All Variants
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Update the same value for all variants at once.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {[
              { field: "price", label: "Price (₹)", placeholder: "0" },
              { field: "mrp", label: "MRP (₹)", placeholder: "0" },
              { field: "salePrice", label: "Sale Price (₹)", placeholder: "0" },
              // { field: "gstRate", label: "GST (%)", placeholder: "18" },
            ].map(({ field, label, placeholder }) => (
              <div key={field} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {label}
                </label>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <SmallInput
                      type="text"
                      inputMode="decimal"
                      placeholder={placeholder}
                      value={bulkValues[field] ?? ""}
                      onChange={(e) => {
                        const nextValue = sanitizeDecimalInput(e.target.value, {
                          max: field === "gstRate" ? 100 : null,
                          decimals: 2,
                        });

                        setBulkValues((prev) => ({
                          ...prev,
                          [field]: nextValue,
                        }));
                      }}
                      onKeyDown={(e) => {
                        blockInvalidNumberKeys(e);

                        if (e.key === "Enter") {
                          applyToAll(field, bulkValues[field]);

                          setBulkValues((prev) => ({
                            ...prev,
                            [field]: "",
                          }));
                        }
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      applyToAll(field, bulkValues[field]);
                      setBulkValues((prev) => ({
                        ...prev,
                        [field]: "",
                      }));
                    }}
                    className="flex-shrink-0 rounded-md border border-[var(--admin-gold)] bg-[var(--admin-gold-soft)]/40 px-2.5 py-1 text-sm font-semibold text-[var(--admin-gold-dark)] transition-colors hover:bg-[var(--admin-gold)] hover:text-[var(--admin-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--admin-gold)]"
                  >
                    Set
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs text-gray-500">
            Type a value and click <strong>Set</strong> or press{" "}
            <strong>Enter</strong> to apply it to all variants.
          </p>
        </div>
      )}

      {/* ── Variant Cards ──────────────────────────────────────────────── */}
      {variants.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">
              {variants.length} Variant{variants.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-gray-400">
              Drag to reorder · click row to expand
            </p>
          </div>

          {variants.map((variant, idx) => {
            const imageCount = (variant.images || []).length;
            const hasImages = imageCount > 0;
            const variantErrors =
              errors && typeof errors === "object" ? errors[idx] || {} : {};
            const hasVariantErrors = Object.keys(variantErrors).length > 0;
            const isExpanded = expandedVariants.has(idx) || hasVariantErrors;
            const isUploading = uploadingVariants.has(idx);
            const variantLabel =
              variant.attributes && Object.keys(variant.attributes).length
                ? Object.values(variant.attributes).join(" / ")
                : variant.title || `Variant ${idx + 1}`;

            return (
              <div
                key={idx}
                draggable
                onDragStart={() => handleVariantDragStart(idx)}
                onDragOver={(e) => handleVariantDragOver(e, idx)}
                onDragEnd={() => {
                  dragVariantIdx.current = null;
                }}
                className={`overflow-hidden rounded-xl border transition-colors
                  ${variant.isDefault ? "border-[var(--admin-gold)] bg-[var(--admin-gold-soft)]/15" : "border-[var(--admin-field-line)] bg-white hover:border-[var(--admin-line-strong)]"}`}
              >
                {/* Collapsed row */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
                  onClick={() => toggleExpand(idx)}
                >
                  <MdDragIndicator
                    className="text-gray-300 flex-shrink-0 cursor-grab text-base"
                    onClick={(e) => e.stopPropagation()}
                  />

                  {/* Default radio */}
                  <button
                    type="button"
                    title="Set as default"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDefaultVariant(idx);
                    }}
                    className={`h-4 w-4 flex-shrink-0 rounded-full border-2 transition-colors
                      ${variant.isDefault ? "border-[var(--admin-gold)] bg-[var(--admin-gold)]" : "border-[var(--admin-line-strong)] hover:border-[var(--admin-gold)]"}`}
                  />

                  {/* Variant label */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {variantLabel}
                    </p>
                    {variant.sku && (
                      <p className="text-xs text-gray-400 truncate">
                        SKU: {variant.sku}
                      </p>
                    )}
                  </div>

                  {/* Quick stats */}
                  <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                        Price
                      </p>
                      <p className="text-xs font-semibold text-gray-700">
                        ₹{variant.price ?? "—"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                        Stock
                      </p>
                      <p className="text-xs font-semibold text-gray-700">
                        {variant.stock ?? "—"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                        Status
                      </p>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                        ${variant.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
                      >
                        {variant.status || "active"}
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                        Images
                      </p>
                      <p
                        className={`text-xs font-semibold ${hasImages ? "text-[var(--admin-blue)]" : "text-amber-500"}`}
                      >
                        {hasImages
                          ? `${imageCount}/${MAX_VARIANT_IMAGES}`
                          : "None"}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-1 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      title="Duplicate"
                      onClick={() => duplicateVariant(idx)}
                      className="rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                    >
                      ⧉
                    </button>
                    <button
                      type="button"
                      onClick={() => removeVariant(idx)}
                      className="rounded border border-transparent px-1 py-0.5 text-sm text-red-400 hover:text-red-600 transition-colors"
                    >
                      ✕
                    </button>
                    <span
                      className={`text-gray-300 text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    >
                      ▾
                    </span>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-5">
                    {/* Core fields grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <FieldLabel>SKU</FieldLabel>
                        <SmallInput
                          name={`variants.${idx}.sku`}
                          data-error-field={
                            variantErrors.sku ? "variants" : undefined
                          }
                          error={variantErrors.sku}
                          value={variant.sku || ""}
                          onChange={(e) =>
                            updateVariant(idx, "sku", e.target.value)
                          }
                          placeholder="SKU"
                        />
                        {variantErrors.sku && (
                          <p className="text-[10px] text-red-600" role="alert">
                            {variantErrors.sku}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <FieldLabel>Price (₹)</FieldLabel>
                        <SmallInput
                          name={`variants.${idx}.price`}
                          data-error-field={
                            variantErrors.price ? "variants" : undefined
                          }
                          error={variantErrors.price}
                          type="text"
                          inputMode="decimal"
                          value={variant.price ?? ""}
                          onKeyDown={blockInvalidNumberKeys}
                          onChange={(e) => {
                            const nextValue = sanitizeDecimalInput(
                              e.target.value,
                              {
                                decimals: 2,
                              },
                            );

                            updateVariant(
                              idx,
                              "price",
                              nextValue === "" ? "" : Number(nextValue),
                            );
                          }}
                          placeholder=""
                        />
                        {variantErrors.price && (
                          <p className="text-[10px] text-red-600" role="alert">
                            {variantErrors.price}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <FieldLabel>MRP (₹)</FieldLabel>
                        <SmallInput
                          name={`variants.${idx}.mrp`}
                          data-error-field={
                            variantErrors.mrp ? "variants" : undefined
                          }
                          error={variantErrors.mrp}
                          type="text"
                          inputMode="decimal"
                          value={variant.mrp ?? ""}
                          onKeyDown={blockInvalidNumberKeys}
                          onChange={(e) => {
                            const nextValue = sanitizeDecimalInput(
                              e.target.value,
                              {
                                decimals: 2,
                              },
                            );

                            updateVariant(
                              idx,
                              "mrp",
                              nextValue === "" ? "" : Number(nextValue),
                            );
                          }}
                          placeholder=""
                        />
                        {variantErrors.mrp && (
                          <p className="text-[10px] text-red-600" role="alert">
                            {variantErrors.mrp}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <FieldLabel>Sale Price (₹)</FieldLabel>
                        <SmallInput
                          name={`variants.${idx}.salePrice`}
                          data-error-field={
                            variantErrors.salePrice ? "variants" : undefined
                          }
                          error={variantErrors.salePrice}
                          type="text"
                          inputMode="decimal"
                          value={variant.salePrice ?? ""}
                          onKeyDown={blockInvalidNumberKeys}
                          onChange={(e) => {
                            const nextValue = sanitizeDecimalInput(
                              e.target.value,
                              {
                                decimals: 2,
                              },
                            );

                            updateVariant(
                              idx,
                              "salePrice",
                              nextValue === "" ? "" : Number(nextValue),
                            );
                          }}
                          placeholder=""
                        />
                        {variantErrors.salePrice && (
                          <p className="text-[10px] text-red-600" role="alert">
                            {variantErrors.salePrice}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <FieldLabel>Stock</FieldLabel>
                        <SmallInput
                          type="number"
                          min={0}
                          value={variant.stock ?? ""}
                          onChange={(e) =>
                            updateVariant(
                              idx,
                              "stock",
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                            )
                          }
                        />
                        <p className="text-[10px] text-gray-400">
                          Managed in Inventory later too.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <FieldLabel>Status</FieldLabel>
                        <FilterSelect
                          options={productStatuses.options.filter((o) =>
                            ["active", "inactive"].includes(o.value),
                          )}
                          value={
                            productStatuses.options.find(
                              (o) => o.value === (variant.status || "active"),
                            ) || null
                          }
                          onChange={(selected) =>
                            updateVariant(
                              idx,
                              "status",
                              selected?.value || "active",
                            )
                          }
                          isSearchable={false}
                          placeholder="Select status"
                        />
                      </div>
                      {/* <div className="space-y-1">
                        <FieldLabel>Barcode (EAN/UPC)</FieldLabel>
                        <SmallInput value={variant.barcode || ''} onChange={(e) => updateVariant(idx, 'barcode', e.target.value)} placeholder="Optional" />
                      </div> */}

                      <div className="space-y-1">
                        <FieldLabel>Title Override</FieldLabel>
                        <SmallInput
                          value={variant.title || ""}
                          onChange={(e) =>
                            updateVariant(idx, "title", e.target.value)
                          }
                          placeholder="Auto from attributes"
                        />
                      </div>
                      <div className="space-y-1">
                        <FieldLabel>Sort Order</FieldLabel>
                        <SmallInput
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={variant.sortOrder ?? ""}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, "");
                            updateVariant(
                              idx,
                              "sortOrder",
                              digitsOnly === "" ? "" : Number(digitsOnly),
                            );
                          }}
                        />
                      </div>
                    </div>

                    {/* Images section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-gray-700">
                          Variant Images
                        </p>
                        <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">
                          {imageCount}/{MAX_VARIANT_IMAGES}
                        </span>
                        {!hasImages && (
                          <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full font-semibold">
                            No images
                          </span>
                        )}
                      </div>

                      {hasImages && (
                        <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                          <FaInfoCircle
                            className="text-blue-400 flex-shrink-0"
                            size={11}
                          />
                          <p className="text-xs text-blue-700">
                            These images replace the product gallery for{" "}
                            <strong>{variantLabel}</strong>.
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {(variant.images || []).map((img, imgIdx) => (
                          <div
                            key={imgIdx}
                            className="relative w-16 h-16 rounded-lg border border-gray-200 overflow-hidden group flex-shrink-0 bg-gray-100"
                          >
                            <img
                              src={img}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src =
                                  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTIxIDNIM0MyIDMgMSA0IDEgNXYxNGMwIDEgMSAyIDIgMmgxOGMxIDAgMi0xIDItMlY1YzAtMS0xLTItMi0yem0tMSAxNUg0di0ybDMtMyAzLjUgMy41IDQuNS01LjUgNSA3LjV6bTAtOS42YzAgLjgtLjcgMS41LTEuNSAxLjVTNS40IDkuMiA1LjQgOC40IDYuMSA2LjkgNi45IDYuOXMxLjUuNyAxLjUgMS41eiIvPjwvc3ZnPg==";
                              }}
                            />
                            {imgIdx === 0 && (
                              <div className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[8px] font-bold px-1 rounded">
                                Cover
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeVariantImage(idx, imgIdx)}
                              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                        {imageCount < MAX_VARIANT_IMAGES && (
                          <label
                            className={`w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 cursor-pointer flex-shrink-0 transition-colors
                            ${isUploading ? "border-gray-200 opacity-50 pointer-events-none" : "border-gray-200 hover:border-[var(--admin-blue)] text-gray-300 hover:text-[var(--admin-blue)]"}`}
                          >
                            {isUploading ? (
                              <span className="text-[10px] text-gray-400">
                                ⏳
                              </span>
                            ) : (
                              <>
                                <MdAdd size={20} />
                                <span className="text-[9px]">Upload</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) =>
                                uploadVariantImages(idx, e.target.files)
                              }
                            />
                          </label>
                        )}
                      </div>

                      {/* {imageCount < MAX_VARIANT_IMAGES && (
                        <div className="flex gap-2">
                          <SmallInput
                            type="text"
                            placeholder="Or paste image URL and press Enter…"
                            onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { e.preventDefault(); addVariantImageUrl(idx, e.target.value); e.target.value = ''; } }}
                          />
                        </div>
                      )} */}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add manually */}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...variants,
            {
              ...DEFAULT_VARIANT,
              sku: `SKU-${Date.now()}`,
              isDefault: variants.length === 0,
              sortOrder: variants.length,
            },
          ])
        }
        className="w-full py-3 border-2 border-dashed border-black/25 rounded-xl text-sm text-gray-800   transition-colors font-medium"
      >
        + Add Variant Manually
      </button>

      {variants.length > 0 && (
        <p className="text-[11px] text-gray-400 text-center">
          ● = default &nbsp;·&nbsp; ⠿ drag to reorder &nbsp;·&nbsp; ⧉ duplicate
          &nbsp;·&nbsp; ✕ remove
        </p>
      )}
    </div>
  );
};

export default VariantBuilder;
