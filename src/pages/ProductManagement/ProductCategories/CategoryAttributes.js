import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { MdArrowBack, MdAdd, MdDelete, MdEdit } from 'react-icons/md';
import FilterSelect from '../../../components/Atoms/FilterSelect/FilterSelect';
import Input from '../../../components/Atoms/Input/Input';
import Loader from '../../../components/Loader/Loader';
import { useNavigate } from 'react-router-dom';
import { getCategoryAttributes, getList, updateCategoryAttributes } from '../../../Redux/productSlice';
import { getPlatformOptions, getPlatformOptionValues } from '../../../Redux/adminCoreSlice';

const EMPTY_ATTRIBUTE = {
  key: '',
  label: '',
  type: 'text',
  required: false,
  options: [],
  platformOptionId: '',
  allowCustomOptions: false,
  customOptionsText: '',
  unit: '',
  isVariantAttribute: false,
  isFilterable: false,
  isSearchable: false,
};

const typeOptions = [
  'text',
  'number',
  'select',
  'multi_select',
  'boolean',
  'date',
].map((value) => ({ value, label: value.replace('_', ' ') }));

const CHECKBOX_FIELDS = [
  { key: 'required', label: 'Required' },
  { key: 'isVariantAttribute', label: 'Variant' },
  { key: 'isFilterable', label: 'Filterable' },
  { key: 'isSearchable', label: 'Searchable' },
];

const idOf = (record = {}) => record?._id || record?.id || '';
const valueName = (record = {}) => record.name || record.label || record.value || '';

const toCategoryOptions = (categories = []) => {
  const options = [];

  const walkNested = (nodes = [], prefix = '') => {
    nodes.forEach((category) => {
      const key = category?.categoryKey || category?._id;
      if (!key) return;
      const name = category?.name || category?.title || category?.categoryKey;
      const label = prefix ? `${prefix} > ${name}` : name;
      options.push({ value: key, label, category });
      const children = category?.children || category?.subcategories || category?.subCategories || [];
      if (Array.isArray(children) && children.length) {
        walkNested(children, label);
      }
    });
  };

  const hasNested = categories.some(
    (item) => Array.isArray(item?.children) || Array.isArray(item?.subcategories) || Array.isArray(item?.subCategories),
  );
  if (hasNested) {
    walkNested(categories);
    return options;
  }

  const byParent = new Map();
  categories.forEach((category) => {
    const parent = category?.parentKey ? String(category.parentKey) : '__root__';
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push(category);
  });

  const walkFlatTree = (parent = '__root__', prefix = '') => {
    (byParent.get(parent) || [])
      .sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0))
      .forEach((category) => {
        const key = category?.categoryKey || category?._id;
        if (!key) return;
        const name = category?.name || category?.title || category?.categoryKey;
        const label = prefix ? `${prefix} > ${name}` : name;
        options.push({ value: key, label, category });
        walkFlatTree(String(key), label);
      });
  };

  walkFlatTree();
  return options;
};

/* ─── Attribute Row (edit mode) ─────────────────────────────────────────── */
const AttributeRow = ({
  attribute,
  index,
  onUpdate,
  onRemove,
  platformOptionChoices,
  optionValues,
  onLoadOptionValues,
}) => (
  <div className="border border-gray-200 rounded-lg p-4 bg-white">
    <div className="flex items-start justify-between mb-3">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Attribute #{index + 1}
      </span>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
      >
        <MdDelete size={14} /> Remove
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Input
        labelName="Key"
        value={attribute.key}
        onChange={(e) => onUpdate(index, 'key', e.target.value)}
        placeholder="e.g. color"
      />
      <Input
        labelName="Label"
        value={attribute.label}
        onChange={(e) => onUpdate(index, 'label', e.target.value)}
        placeholder="e.g. Color"
      />
      <FilterSelect
        label="Type"
        options={typeOptions}
        value={typeOptions.find((item) => item.value === attribute.type)}
        onChange={(option) => {
          const nextType = option?.value || 'text';
          onUpdate(index, 'type', nextType);
          if (nextType !== 'select' && nextType !== 'multi_select') {
            onUpdate(index, 'platformOptionId', '');
            onUpdate(index, 'options', []);
            onUpdate(index, 'allowCustomOptions', false);
            onUpdate(index, 'customOptionsText', '');
          }
        }}
      />
      {(attribute.type === 'select' || attribute.type === 'multi_select') && (
        <>
          <FilterSelect
            label="Product Option Master"
            options={platformOptionChoices}
            value={platformOptionChoices.find((item) => item.value === attribute.platformOptionId) || null}
            onChange={(option) => {
              const optionId = option?.value || '';
              onUpdate(index, 'platformOptionId', optionId);
              onUpdate(index, 'options', []);
              if (optionId) onLoadOptionValues(optionId);
            }}
            placeholder="Select Size, Color, Storage..."
          />
          <div className="md:col-span-2">
            <FilterSelect
              label="Allowed Values"
              isMulti
              options={(optionValues[attribute.platformOptionId] || []).map((item) => ({
                value: valueName(item),
                label: valueName(item),
              }))}
              value={(optionValues[attribute.platformOptionId] || [])
                .filter((item) => (attribute.options || []).includes(valueName(item)))
                .map((item) => ({ value: valueName(item), label: valueName(item) }))}
              onChange={(selected) => onUpdate(index, 'options', (selected || []).map((item) => item.value))}
              placeholder={attribute.platformOptionId ? 'Search and select reusable values...' : 'Select an option master first'}
              isDisabled={!attribute.platformOptionId}
            />
            <label className="mt-2 flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(attribute.allowCustomOptions)}
                onChange={(e) => onUpdate(index, 'allowCustomOptions', e.target.checked)}
                className="w-3.5 h-3.5 accent-[var(--admin-blue)]"
              />
              Allow custom category-specific values
            </label>
            {attribute.allowCustomOptions && (
              <Input
                labelName="Custom Values (comma separated)"
                value={attribute.customOptionsText || ''}
                onChange={(e) => onUpdate(index, 'customOptionsText', e.target.value)}
                placeholder="Use only for exceptional values"
              />
            )}
          </div>
        </>
      )}
      {attribute.type === 'number' && (
        <Input
          labelName="Unit"
          value={attribute.unit}
          onChange={(e) => onUpdate(index, 'unit', e.target.value)}
          placeholder="e.g. kg, cm"
        />
      )}
    </div>

    <div className="mt-3 flex flex-wrap gap-4">
      {CHECKBOX_FIELDS.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={Boolean(attribute[key])}
            onChange={(e) => onUpdate(index, key, e.target.checked)}
            className="w-4 h-4 accent-[var(--admin-blue)] rounded"
          />
          {label}
        </label>
      ))}
    </div>
  </div>
);

/* ─── Category Listing Row ───────────────────────────────────────────────── */
const CategoryRow = ({ option, attrCount, onEdit, loadingKey }) => {
  const parts = option.label.split(' > ');
  const depth = parts.length - 1;
  const name = parts[parts.length - 1];
  const path = parts.slice(0, -1).join(' > ');

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div style={{ paddingLeft: `${depth * 16}px` }} className="flex items-center gap-2">
          {depth > 0 && <span className="text-gray-300 text-xs">└</span>}
          <div>
            <p className="text-sm font-medium text-gray-800 capitalize">{name}</p>
            {path && <p className="text-xs text-gray-400 mt-0.5">{path}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
          attrCount > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'
        }`}>
          {attrCount != null ? attrCount : '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => onEdit(option)}
          disabled={loadingKey === option.value}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--admin-blue)] border border-[var(--admin-blue)] rounded hover:bg-[var(--admin-blue)] hover:text-white transition-colors disabled:opacity-50"
        >
          <MdEdit size={13} />
          {loadingKey === option.value ? 'Loading…' : 'Edit Attributes'}
        </button>
      </td>
    </tr>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
const CategoryAttributesPanel = ({ embedded = false, initialCategory = null, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.product);
  const initialCategoryKey = initialCategory
    ? String(initialCategory.categoryKey || initialCategory._id || '')
    : '';
  const initialCategoryLabel =
    initialCategory?.name ||
    initialCategory?.title ||
    initialCategory?.categoryName ||
    initialCategory?.categoryKey ||
    '';
  const initialCategoryOption = useMemo(
    () =>
      initialCategoryKey
        ? {
            value: initialCategoryKey,
            label: initialCategoryLabel,
            category: initialCategory,
          }
        : null,
    [initialCategory, initialCategoryKey, initialCategoryLabel],
  );

  const categories = useMemo(() => {
    const payload = selector?.getListData?.data?.data || {};
    if (Array.isArray(payload)) return payload;
    return payload?.list || payload?.items || [];
  }, [selector?.getListData?.data?.data]);

  const categoryOptions = useMemo(() => toCategoryOptions(categories), [categories]);

  // view: 'list' | 'edit'
  const [view, setView] = useState(initialCategoryOption ? 'edit' : 'list');
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryOption);
  const [attributes, setAttributes] = useState([]);
  const [loadingKey, setLoadingKey] = useState(null);
  const [saving, setSaving] = useState(false);
  // Cache attribute counts per category key after first load
  const [attrCounts, setAttrCounts] = useState({});
  const [platformOptions, setPlatformOptions] = useState([]);
  const [optionValues, setOptionValues] = useState({});

  useEffect(() => {
    dispatch(getList({ tree: true, limit: 100 }));
    dispatch(getPlatformOptions({ limit: 100, active: true }))
      .unwrap()
      .then((res) => {
        const raw = res?.data;
        setPlatformOptions(Array.isArray(raw) ? raw : (raw?.list || raw?.items || []));
      })
      .catch(() => {});
  }, [dispatch]);

  const platformOptionChoices = useMemo(
    () => platformOptions.map((item) => ({ value: String(idOf(item)), label: item.name || item.slug || String(idOf(item)) })),
    [platformOptions],
  );

  const loadedInitialCategoryRef = useRef('');

  const loadOptionValues = useCallback((optionId) => {
    if (!optionId || optionValues[optionId]) return;
    dispatch(getPlatformOptionValues({ optionId, limit: 100, active: true }))
      .unwrap()
      .then((res) => {
        const raw = res?.data;
        setOptionValues((prev) => ({
          ...prev,
          [optionId]: Array.isArray(raw) ? raw : (raw?.list || raw?.items || []),
        }));
      })
      .catch(() => {});
  }, [dispatch, optionValues]);

  const openEditor = useCallback((option) => {
    setLoadingKey(option.value);
    dispatch(getCategoryAttributes({ categoryKey: option.value }))
      .unwrap()
      .then((res) => {
        const schema = res?.data?.attributeSchema || [];
        setAttributes(
          schema.map((item) => ({
            ...EMPTY_ATTRIBUTE,
            ...item,
            options: Array.isArray(item.options) ? item.options : String(item.options || '').split(',').map((o) => o.trim()).filter(Boolean),
          })),
        );
        schema.forEach((item) => {
          if (item.platformOptionId) loadOptionValues(item.platformOptionId);
        });
        setAttrCounts((prev) => ({ ...prev, [option.value]: schema.length }));
        setSelectedCategory(option);
        setView('edit');
      })
      .catch(() => {
        setAttributes([]);
        setSelectedCategory(option);
        setView('edit');
      })
      .finally(() => setLoadingKey(null));
  }, [dispatch, loadOptionValues]);

  useEffect(() => {
    loadedInitialCategoryRef.current = '';
  }, [initialCategoryKey]);

  useEffect(() => {
    if (!initialCategoryKey) return;
    const matchedOption =
      categoryOptions.find((option) => String(option.value) === initialCategoryKey) ||
      initialCategoryOption;
    if (!matchedOption?.value || loadedInitialCategoryRef.current === matchedOption.value) {
      return;
    }
    loadedInitialCategoryRef.current = matchedOption.value;
    openEditor(matchedOption);
  }, [categoryOptions, initialCategoryKey, initialCategoryOption, openEditor]);

  const handleBack = () => {
    if (embedded && initialCategoryKey) {
      onClose?.();
      return;
    }
    setView('list');
    setSelectedCategory(null);
    setAttributes([]);
  };

  const updateAttribute = (index, field, value) => {
    setAttributes((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const removeAttribute = (index) => {
    setAttributes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedCategory?.value) {
      toast.error('No category selected');
      return;
    }

    const keySet = new Set();
    const duplicateKeys = [];
    const payload = attributes
      .filter((item) => item.key && item.label)
      .map((item) => ({
        key: item.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        label: item.label.trim(),
        type: item.type,
        required: Boolean(item.required),
        platformOptionId: item.platformOptionId || '',
        options: [
          ...(Array.isArray(item.options) ? item.options : []),
          ...(item.allowCustomOptions
            ? String(item.customOptionsText || '')
              .split(',')
              .map((o) => o.trim())
              .filter(Boolean)
            : []),
        ],
        allowCustomOptions: Boolean(item.allowCustomOptions),
        unit: item.unit || null,
        isVariantAttribute: Boolean(item.isVariantAttribute),
        isFilterable: Boolean(item.isFilterable),
        isSearchable: Boolean(item.isSearchable),
      }));

    payload.forEach((item) => {
      if (keySet.has(item.key)) duplicateKeys.push(item.key);
      keySet.add(item.key);
    });
    if (duplicateKeys.length) {
      toast.error(`Duplicate attribute keys: ${duplicateKeys.join(', ')}`);
      return;
    }

    const invalidSelect = payload.filter(
      (item) => (item.type === 'select' || item.type === 'multi_select') && !item.platformOptionId && !item.options.length,
    );
    if (invalidSelect.length) {
      toast.error('Select / multi-select attributes must have at least one value (use an option master or add custom values).');
      return;
    }

    setSaving(true);
    try {
      await dispatch(
        updateCategoryAttributes({ categoryKey: selectedCategory.value, attributeSchema: payload }),
      ).unwrap();
      toast.success('Category attributes saved');
      setAttrCounts((prev) => ({ ...prev, [selectedCategory.value]: payload.length }));
      dispatch(getList({ tree: true, limit: 100 }));
    } catch (error) {
      toast.error(error?.message || 'Failed to save category attributes');
    } finally {
      setSaving(false);
    }
  };

  /* ── LIST VIEW ────────────────────────────────────────────────────────── */
  if (view === 'list') {
    return (
      <div className={`${embedded ? 'h-full overflow-y-auto p-5' : 'max-w-5xl mx-auto p-6'}`}>
        <Loader loading={selector.loading} />
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Category Attributes</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Configure which attributes appear in Product Catalog per category
            </p>
          </div>
          {embedded ? (
            <button
              type="button"
              className="text-xs text-gray-600 border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors"
              onClick={onClose}
            >
              Close
            </button>
          ) : (
            <button
              type="button"
              className="text-xs text-[var(--admin-blue)] border border-[var(--admin-blue)] px-3 py-1.5 rounded hover:bg-[var(--admin-blue)] hover:text-white transition-colors"
              onClick={() => navigate('/app/product-catalog')}
            >
              Open Product Catalog
            </button>
          )}
        </div>

        <div className="bg-white border border-[#E6E6E6] rounded-lg overflow-hidden">
          {categoryOptions.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              {selector.loading ? 'Loading categories…' : 'No categories found'}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Category
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">
                    Attributes
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryOptions.map((option) => (
                  <CategoryRow
                    key={option.value}
                    option={option}
                    attrCount={attrCounts[option.value]}
                    onEdit={openEditor}
                    loadingKey={loadingKey}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  /* ── EDIT VIEW ────────────────────────────────────────────────────────── */
  const categoryName = selectedCategory?.label?.split(' > ').pop() || selectedCategory?.label;
  const categoryPath = selectedCategory?.label?.split(' > ').slice(0, -1).join(' > ');

  return (
    <div className={`${embedded ? 'h-full overflow-y-auto p-5' : 'max-w-5xl mx-auto p-6'}`}>
      <Loader loading={selector.loading || saving} />

      {/* Header */}
      <div className="mb-5">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors"
        >
          <MdArrowBack size={16} /> {embedded ? 'Close Attributes' : 'Back to Categories'}
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 capitalize">{categoryName}</h1>
            {categoryPath && (
              <p className="text-xs text-gray-400 mt-0.5">{categoryPath}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-[var(--admin-blue)] text-white text-sm hover:bg-[#2f3070] transition-colors disabled:opacity-50"
              onClick={() => setAttributes((prev) => [...prev, { ...EMPTY_ATTRIBUTE }])}
            >
              <MdAdd size={15} /> Add Attribute
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Attributes'}
            </button>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-2">
        <span className="text-blue-500 mt-0.5">ℹ</span>
        <p className="text-xs text-blue-800">
          These attributes control which fields appear when adding/editing products under{' '}
          <strong>{categoryName}</strong>. Only filled attributes (key + label) will be saved.
        </p>
      </div>

      {/* Attribute editor */}
      {attributes.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg py-14 text-center">
          <p className="text-gray-400 text-sm mb-3">No attributes defined for this category yet.</p>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[var(--admin-blue)] text-white text-sm hover:bg-[#2f3070]"
            onClick={() => setAttributes([{ ...EMPTY_ATTRIBUTE }])}
          >
            <MdAdd size={15} /> Add First Attribute
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {attributes.map((attribute, index) => (
            <AttributeRow
              key={`attr-${index}`}
              attribute={attribute}
              index={index}
              onUpdate={updateAttribute}
              onRemove={removeAttribute}
              platformOptionChoices={platformOptionChoices}
              optionValues={optionValues}
              onLoadOptionValues={loadOptionValues}
            />
          ))}

          <button
            type="button"
            className="w-full border border-dashed border-[var(--admin-blue)] text-[var(--admin-blue)] rounded-lg py-3 text-sm hover:bg-[#f0f0ff] transition-colors flex items-center justify-center gap-1.5"
            onClick={() => setAttributes((prev) => [...prev, { ...EMPTY_ATTRIBUTE }])}
          >
            <MdAdd size={15} /> Add Another Attribute
          </button>
        </div>
      )}

      {/* Bottom save */}
      {attributes.length > 0 && (
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Attributes'}
          </button>
        </div>
      )}
    </div>
  );
};

const CategoryAttributes = () => <CategoryAttributesPanel />;

export { CategoryAttributesPanel };
export default CategoryAttributes;
