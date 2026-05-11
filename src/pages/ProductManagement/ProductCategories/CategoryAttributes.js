import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import FilterSelect from '../../../components/Atoms/FilterSelect/FilterSelect';
import Input from '../../../components/Atoms/Input/Input';
import Button from '../../../components/Atoms/buttons/button';
import Loader from '../../../components/Loader/Loader';
import { getList, updateCategoryAttributes } from '../../../Redux/productSlice';

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

const toCategoryOptions = (categories = []) =>
  categories.map((category) => ({
    value: category._id,
    label: category.name || category.title || category.categoryKey,
    category,
  }));

const CategoryAttributes = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.product);
  const categories = useMemo(
    () => selector?.getListData?.data?.data?.list || [],
    [selector?.getListData?.data?.data?.list],
  );
  const categoryOptions = useMemo(() => toCategoryOptions(categories), [categories]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [attributes, setAttributes] = useState([]);

  useEffect(() => {
    dispatch(getList({ limit: 100 }));
  }, [dispatch]);

  const handleSelectCategory = (option) => {
    setSelectedCategory(option);
    setAttributes(
      (option?.category?.attributeSchema || []).map((item) => ({
        ...EMPTY_ATTRIBUTE,
        ...item,
        options: Array.isArray(item.options) ? item.options.join(', ') : '',
      })),
    );
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

    const payload = attributes
      .filter((item) => item.key && item.label)
      .map((item) => ({
        key: item.key.trim(),
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

    try {
      await dispatch(updateCategoryAttributes({
        categoryId: selectedCategory.value,
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
