import React from 'react';
import FilterSelect from '../../../../components/Atoms/FilterSelect/FilterSelect';
import Input from '../../../../components/Atoms/Input/Input';

const valueName = (record = {}) => record.name || record.label || record.value || '';

const optionList = (field, optionValues = {}) => {
  if (field.platformOptionId && optionValues[field.platformOptionId]) {
    const allowed = new Set(field.options || []);
    return optionValues[field.platformOptionId]
      .filter((item) => item.active !== false)
      .filter((item) => !allowed.size || allowed.has(valueName(item)))
      .map((item) => ({
        value: valueName(item),
        label: valueName(item),
        item,
      }));
  }
  return (field.options || []).map((option) => ({ value: option, label: option }));
};

const DynamicAttributesTab = ({ attributeSchema = [], formData, setFormData, errors = {}, optionValues = {} }) => {
  const attributes = formData?.attributes || {};

  const updateAttribute = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      attributes: {
        ...(prev.attributes || {}),
        [key]: value,
      },
    }));
  };

  if (!attributeSchema.length) {
    return (
      <div className="bg-white">
        <div className="pb-4 mb-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Category Attributes</h3>
          <p className="text-sm text-gray-500 mt-0.5">Select a category to load product attributes.</p>
        </div>
        <p className="text-sm text-gray-400 italic">No attributes found for the selected category.</p>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="pb-4 mb-5 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Category Attributes</h3>
        <p className="text-sm text-gray-500 mt-0.5">These fields are controlled by the selected category.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
        {attributeSchema.map((field) => {
          const value = attributes[field.key];
          const label = `${field.label || field.key}${field.unit ? ` (${field.unit})` : ''}`;

          if (field.type === 'select') {
            const options = optionList(field, optionValues);
            return (
              <FilterSelect
                key={field.key}
                label={label}
                required={field.required}
                options={options}
                value={options.find((item) => item.value === value) || null}
                onChange={(selected) => updateAttribute(field.key, selected?.value || '')}
                error={errors?.attributes?.[field.key]}
              />
            );
          }

          if (field.type === 'multi_select') {
            const options = optionList(field, optionValues);
            const selectedValues = Array.isArray(value) ? value : [];
            return (
              <FilterSelect
                key={field.key}
                label={label}
                required={field.required}
                isMulti
                options={options}
                value={options.filter((item) => selectedValues.includes(item.value))}
                onChange={(selected) => updateAttribute(field.key, (selected || []).map((item) => item.value))}
                error={errors?.attributes?.[field.key]}
              />
            );
          }

          if (field.type === 'boolean') {
            return (
              <label key={field.key} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[var(--admin-blue)] flex-shrink-0"
                  checked={Boolean(value)}
                  onChange={(event) => updateAttribute(field.key, event.target.checked)}
                />
                <span className="text-gray-700 font-medium">{label}</span>
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
            );
          }

          return (
            <Input
              key={field.key}
              labelName={label}
              name={`attribute_${field.key}`}
              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              value={value || ''}
              onChange={(event) => updateAttribute(field.key, event.target.value)}
              required={field.required}
              error={errors?.attributes?.[field.key]}
            />
          );
        })}
      </div>
    </div>
  );
};

export default DynamicAttributesTab;
