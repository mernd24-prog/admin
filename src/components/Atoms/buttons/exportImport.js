import React from "react";
import { Download, Upload, RefreshCw } from "lucide-react";
import { twMerge } from "tailwind-merge";

/**
 * Reusable Export Button
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
              className="shrink-0 text-[var(--admin-blue)]"
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
 * Reusable Import Button
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
              className="shrink-0 text-[var(--admin-blue)]"
              aria-hidden="true"
            />
          ))}

        <span>{isLoading ? loadingText : label}</span>
      </button>
    );
  },
);

ImportButton.displayName = "ImportButton";

/**
 * Reusable Refresh Button
 */
export const RefreshButton = React.memo(
  ({
    type = "button",
    onClick,
    label = "Refresh",
    loadingText = "Refreshing…",
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
        aria-label={label}
        className={twMerge(
          `admin-btn-secondary inline-flex items-center gap-1.5 ${className}`,
        )}
        {...rest}
      >
        {showIcon &&
          (icon || (
            <RefreshCw
              size={15}
              className={twMerge(
                "shrink-0 text-[var(--admin-blue)]",
                loading && "animate-spin",
              )}
              aria-hidden="true"
            />
          ))}

        <span>{loading ? loadingText : label}</span>
      </button>
    );
  },
);

RefreshButton.displayName = "RefreshButton";

export default {
  ExportButton,
  ImportButton,
  RefreshButton,
};
