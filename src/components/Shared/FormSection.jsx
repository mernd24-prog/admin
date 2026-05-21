import React, { useState } from 'react';
import { MdExpandMore, MdExpandLess } from 'react-icons/md';

/**
 * FormSection
 *
 * A card-style grouping for form fields with an optional collapsible toggle.
 *
 * Props:
 *   title       {string}
 *   subtitle    {string}
 *   icon        {React.ReactNode}
 *   collapsible {boolean}
 *   defaultOpen {boolean}  — only relevant when collapsible=true
 *   required    {boolean}  — shows a red dot on the title
 *   children    {React.ReactNode}
 *   className   {string}
 */
const FormSection = ({
  title,
  subtitle,
  icon,
  collapsible = false,
  defaultOpen = true,
  required = false,
  children,
  className = '',
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between px-5 py-4 border-b border-gray-100 ${collapsible ? 'cursor-pointer select-none hover:bg-gray-50' : ''}`}
        onClick={collapsible ? () => setOpen((o) => !o) : undefined}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#F0F0F3] text-[#989AFF]">
              {icon}
            </span>
          )}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              {title}
              {required && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" title="Required" />}
            </h3>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {collapsible && (
          <span className="text-gray-400">
            {open ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
          </span>
        )}
      </div>

      {/* Body */}
      {(!collapsible || open) && (
        <div className="px-5 py-4">{children}</div>
      )}
    </div>
  );
};

export default FormSection;
