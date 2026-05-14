import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import FilterSelect from '../../../components/Atoms/FilterSelect/FilterSelect';
import Input from '../../../components/Atoms/Input/Input';
import Button from '../../../components/Atoms/buttons/button';
import Loader from '../../../components/Loader/Loader';
import { useNavigate } from 'react-router-dom';
import { getCategoryAttributes, getList, updateCategoryAttributes } from '../../../Redux/productSlice';

const EMPTY_ATTRIBUTE = {
  key: '',
  label: '',
  type: 'text',
  required: false,
  options: '',
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

const toCategoryOptions = (categories = []) => {
  const options = [];

  const walkNested = (nodes = [], prefix = '') => {
    nodes.forEach((category) => {
      const key = category?.categoryKey || category?._id;
      if (!key) return;
      const name = category?.name || category?.title || category?.categoryKey;
      const label = prefix ? `${prefix} > ${name}` : name;
      options.push({ value: key, label, category });
      const children = category?.subcategories || category?.subCategories || [];
      if (Array.isArray(children) && children.length) {
        walkNested(children, label);
      }
    });
  };

  const hasNested = categories.some(
    (item) => Array.isArray(item?.subcategories) || Array.isArray(item?.subCategories),
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

const CategoryAttributes = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.product);
  const categories = useMemo(() => {
    const payload = selector?.getListData?.data?.data || {};
    if (Array.isArray(payload)) return payload;
    return payload?.list || payload?.items || [];
  }, [selector?.getListData?.data?.data]);
  const categoryOptions = useMemo(() => toCategoryOptions(categories), [categories]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [attributes, setAttributes] = useState([]);

  useEffect(() => {
    dispatch(getList({ limit: 100 }));
  }, [dispatch]);

  const handleSelectCategory = (option) => {
    setSelectedCategory(option);
    dispatch(getCategoryAttributes({ categoryKey: option?.value }))
      .unwrap()
      .then((res) => {
        const schema = res?.data?.attributeSchema || [];
        setAttributes(
          schema.map((item) => ({
            ...EMPTY_ATTRIBUTE,
            ...item,
            options: Array.isArray(item.options) ? item.options.join(', ') : '',
          })),
        );
      })
      .catch(() => {
        setAttributes([]);
      });
  };

  const updateAttribute = (index, field, value) => {
    setAttributes((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleSave = async () => {
    if (!selectedCategory?.value) {
      toast.error('Please select a category');
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
        options: String(item.options || '')
          .split(',')
          .map((option) => option.trim())
          .filter(Boolean),
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

    const invalidSelectAttributes = payload.filter(
      (item) => (item.type === 'select' || item.type === 'multi_select') && !item.options.length,
    );
    if (invalidSelectAttributes.length) {
      toast.error('Select/multi-select attributes must have at least one option.');
      return;
    }

    try {
      await dispatch(updateCategoryAttributes({
        categoryKey: selectedCategory.value,
        attributeSchema: payload,
      })).unwrap();
      toast.success('Category attributes updated');
      dispatch(getList({ limit: 100 }));
    } catch (error) {
      toast.error(error?.message || error || 'Failed to update category attributes');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Loader loading={selector.loading} />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Category Attributes</h1>
        <Button className="bg-white text-black" onClick={handleSave}>Save Attributes</Button>
      </div>
      <div className="bg-white border border-[#E6E6E6] p-4 space-y-5">
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-900">This schema controls which attributes appear in Product Catalog for this category.</p>
          <button type="button" className="mt-2 rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-700" onClick={() => navigate('/app/product-catalog')}>Open Product Catalog</button>
        </div>
        <FilterSelect
          label="Category"
          options={categoryOptions}
          value={selectedCategory}
          onChange={handleSelectCategory}
          placeholder="Select Category"
        />
        <div className="flex justify-end">
          <button
            type="button"
            className="px-3 py-2 rounded bg-[#3E4094] text-white text-sm"
            onClick={() => setAttributes((prev) => [...prev, { ...EMPTY_ATTRIBUTE }])}
          >
            Add Attribute
          </button>
        </div>
        <div className="space-y-4">
          {attributes.map((attribute, index) => (
            <div key={`${attribute.key}-${index}`} className="border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input labelName="Key" value={attribute.key} onChange={(e) => updateAttribute(index, 'key', e.target.value)} />
                <Input labelName="Label" value={attribute.label} onChange={(e) => updateAttribute(index, 'label', e.target.value)} />
                <FilterSelect
                  label="Type"
                  options={typeOptions}
                  value={typeOptions.find((item) => item.value === attribute.type)}
                  onChange={(option) => updateAttribute(index, 'type', option?.value || 'text')}
                />
                <Input labelName="Options (comma separated)" value={attribute.options} onChange={(e) => updateAttribute(index, 'options', e.target.value)} />
                <Input labelName="Unit" value={attribute.unit} onChange={(e) => updateAttribute(index, 'unit', e.target.value)} />
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                {['required', 'isVariantAttribute', 'isFilterable', 'isSearchable'].map((field) => (
                  <label key={field} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(attribute[field])}
                      onChange={(e) => updateAttribute(index, field, e.target.checked)}
                    />
                    <span>{field}</span>
                  </label>
                ))}
                <button
                  type="button"
                  className="ml-auto text-red-600"
                  onClick={() => setAttributes((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryAttributes;
