import React from 'react';
import { TextEditor } from '../../../../components/Atoms/FormInput/TextEditor';

const fields = [
  { key: 'salt_composition', label: 'Salt Composition' },
  { key: 'primary_use', label: 'Primary Use' },
  { key: 'salt_synonyms', label: 'Salt Synonyms' },
  { key: 'storage', label: 'Storage' },
  { key: 'introduction', label: 'Introduction' },
  { key: 'use_of', label: 'Use Of' },
  { key: 'benefits', label: 'Benefits' },
  { key: 'side_effect', label: 'Side Effect' },
  { key: 'how_to_use', label: 'How To Use' },
  { key: 'how_works', label: 'How It Works' },
  { key: 'safety_advise', label: 'Safety Advice' },
  { key: 'if_miss', label: 'If Missed' },
];

const ProductDetails = ({ formData, onChange, error }) => {
  const handleEditorChange = (field) => (content) => {
    onChange(field, content);
  };

  return (
    <div className="space-y-6">
      {fields.map(({ key, label }) => (
        <div key={key}>
          <label htmlFor={key} className="block mb-1 font-semibold text-gray-700">
            {label}
          </label>
          <TextEditor
            id={key}
            value={formData?.[key] || ''}
            onChange={handleEditorChange(key)}
            placeholder={label}
          />
          {error?.[key] && (
            <span className="text-xs text-red-500">{error[key]}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProductDetails;
