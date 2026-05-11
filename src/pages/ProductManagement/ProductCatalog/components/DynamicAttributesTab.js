import React from 'react';
import FilterSelect from '../../../../components/Atoms/FilterSelect/FilterSelect';
import Input from '../../../../components/Atoms/Input/Input';

const optionList = (field) =>
  (field.options || []).map((option) => ({ value: option, label: option }));

const DynamicAttributesTab = ({ attributeSchema = [], formData, setFormData, errors = {} }) => {
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
      <div className="bg-white border-t border-gray-100 p-4">
        <h3 className="text-lg font-medium text-gray-900">Category Attributes</h3>
        <p className="text-sm text-gray-500">Select a category to load product attributes.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-gray-100 p-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">Category Attributes</h3>
        <p className="text-sm text-gray-500">These fields are controlled by the selected category.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {attributeSchema.map((field) => {
          const value = attributes[field.key];
          const label = `${field.label || field.key}${field.unit ? ` (${field.unit})` : ''}`;

          if (field.type === 'select') {
            const options = optionList(field);
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
            const options = optionList(field);
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
              <label key={field.key} className="flex items-center gap-3 rounded border border-gray-200 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(event) => updateAttribute(field.key, event.target.checked)}
                />
                <span>{label}</span>
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
