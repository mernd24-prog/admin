import React from 'react';

const PRODUCT_TYPES = [
  {
    value: 'simple',
    label: 'Simple Product',
    description: 'Single product with no variants. E.g. a book, pen, charger.',
    icon: '📦',
  },
  {
    value: 'variable',
    label: 'Variable Product',
    description: 'Has variants like size, color, storage. E.g. T-shirt, Mobile.',
    icon: '🎨',
  },
  {
    value: 'digital',
    label: 'Digital Product',
    description: 'Downloadable file, software license, course, or e-book.',
    icon: '💾',
  },
  {
    value: 'bundle',
    label: 'Bundle / Combo',
    description: 'A kit of multiple products sold together at a combo price.',
    icon: '🎁',
  },
  {
    value: 'subscription',
    label: 'Subscription',
    description: 'Recurring billing product with trial, monthly/yearly plans.',
    icon: '🔄',
  },
];

const ProductTypeSelector = ({ value, onChange, disabled = false }) => {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-3">
        Product Type <span className="text-red-500">*</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PRODUCT_TYPES.map((type) => {
          const selected = value === type.value;
          return (
            <button
              key={type.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(type.value)}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                selected
                  ? 'border-[#3E4094] bg-[#3E4094]/5'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="text-2xl flex-shrink-0">{type.icon}</span>
              <div>
                <p className={`text-sm font-semibold ${selected ? 'text-[#3E4094]' : 'text-gray-800'}`}>
                  {type.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
              </div>
              {selected && (
                <div className="ml-auto flex-shrink-0 w-4 h-4 rounded-full bg-[#3E4094] flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProductTypeSelector;
