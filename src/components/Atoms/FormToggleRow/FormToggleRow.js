import React from "react";
import ToggleButton from "../ToggleButton/ToggleButton";

const FormToggleRow = ({
  title,
  description,
  isToggle,
  handleClick,
  disabled = false,
  loading = false,
  requiredModule,
  requiredAction,
  className = "",
}) => {
  return (
    <div className={`flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 ${className}`}>
      <div className="pr-3">
        {title && (
          <p className="text-sm font-medium text-gray-800">
            {title}
          </p>
        )}
        {description && (
          <p className="mt-0.5 text-xs text-gray-500">
            {description}
          </p>
        )}
      </div>

      <ToggleButton
        isToggle={isToggle}
        handleClick={handleClick}
        disabled={disabled}
        loading={loading}
        requiredModule={requiredModule}
        requiredAction={requiredAction}
      />
    </div>
  );
};

export default React.memo(FormToggleRow);
