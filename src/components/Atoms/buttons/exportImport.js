import React from "react";
import { Download, Upload } from "lucide-react";
import { twMerge } from "tailwind-merge";

/**
 * Reusable Export Button with blue icon and admin-btn-secondary styling
 */
export const ExportButton = React.memo(
  ({
    type = "button",
    onClick,
    label = "Export",
    className = "",
    disabled = false,
    isDisable = false,
    loading = false,
    icon,
    showIcon = true,
    ...rest
  }) => {
    const isDisabled = disabled || isDisable || loading;

    return (
      <button
        type={type}
        onClick={onClick}
        disabled={isDisabled}
        className={twMerge(
          `admin-btn-secondary inline-flex items-center gap-1.5 ${className}`,
        )}
        {...rest}
      >
        {showIcon &&
          (icon || (
            <Download
              size={15}
              className="text-[var(--admin-blue)] shrink-0"
              aria-hidden="true"
            />
          ))}

        <span>{label}</span>
      </button>
    );
  },
);

ExportButton.displayName = "ExportButton";

/**
 * Reusable Import Button with blue icon and admin-btn-secondary styling
 */
export const ImportButton = React.memo(
  ({
    type = "button",
    onClick,
    label = "Import",
    loadingText = "Processing…",
    className = "",
    disabled = false,
    isDisable = false,
    loading = false,
    importing = false,
    icon,
    showIcon = true,
    ...rest
  }) => {
    const isLoading = loading || importing;
    const isDisabled = disabled || isDisable || isLoading;

    return (
      <button
        type={type}
        onClick={onClick}
        disabled={isDisabled}
        className={twMerge(
          `admin-btn-secondary inline-flex items-center gap-1.5 ${className}`,
        )}
        {...rest}
      >
        {showIcon &&
          (icon || (
            <Upload
              size={15}
              className="text-[var(--admin-blue)] shrink-0"
              aria-hidden="true"
            />
          ))}

        <span>{isLoading ? loadingText : label}</span>
      </button>
    );
  },
);

ImportButton.displayName = "ImportButton";

export default {
  ExportButton,
  ImportButton,
};
