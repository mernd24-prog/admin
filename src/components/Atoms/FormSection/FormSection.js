import React from "react";

const FormSection = ({
  title,
  description,
  children,
  className = "",
  headerClassName = "",
}) => {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 ${className}`}>
      {(title || description) && (
        <div className={`mb-4 ${headerClassName}`}>
          {title && (
            <h3 className="text-sm font-semibold text-[#1E293B]">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-xs text-gray-500">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default React.memo(FormSection);
