import React from "react";

/**
 * OrangeButton – admin-gold themed action button.
 *
 * Uses the `admin-btn-primary` class from the design system,
 * which renders the brand gold background with navy text.
 *
 * Props
 * ─────────────────────────────────────────────────────────────
 * @param {React.ReactNode}  children   - Button label / icon + text
 * @param {"button"|"submit"|"reset"} type - HTML button type (default "button")
 * @param {Function}  onClick    - Click handler
 * @param {boolean}   disabled   - Disabled state
 * @param {string}    className  - Extra classes to merge
 * @param {object}    rest       - Any other native button props
 */
const OrangeButton = ({
  children,
  type = "button",
  onClick,
  disabled = false,
  className = "",
  ...rest
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`admin-btn-primary inline-flex items-center gap-2 ${className}`}
    {...rest}
  >
    {children}
  </button>
);

export default OrangeButton;
