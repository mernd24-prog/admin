import React from "react";
import { twMerge } from "tailwind-merge";
import { StatCardSkeletonLoader } from "../Loader/SkeletonLoader";

const SummaryCard = ({
  title,
  label,
  value,
  description,
  sub,
  icon,
  iconClassName = "",
  iconStyle,
  badge,
  footer,
  loading = false,
  onClick,
  className = "",
  titleClassName = "",
  valueClassName = "",
  descriptionClassName = "",
}) => {
  if (loading) {
    return <StatCardSkeletonLoader />;
  }

  const Component = onClick ? "button" : "div";
  const cardTitle = title || label;
  const cardDescription = description || sub;

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={twMerge(
        "group relative flex    h-full min-h-[98px] w-full overflow-hidden rounded-lg bg-gradient-to-br  from-white to-[var(--admin-gold-soft)]/45 p-3.5 text-left   transition duration-200  ",
        onClick
          ? "cursor-pointer focus:outline-none focus:ring2 focus:ring-[var(--admin-gold)] focus:ring-offset-2"
          : "",
        className,
      )}
    >
      <span className="absolute inset-y-0 left-0 w-[3px] bg-golden" />
      {icon && (
        <span
          className={twMerge(
            "absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md border border-[#ead8a9] bg-white text-[var(--admin-navy)] transition group-hover:bg-[var(--admin-gold-soft)]",
            iconClassName,
          )}
          style={iconStyle}
        >
          {icon}
        </span>
      )}

      <div
        className={`relative flex min-w-0 flex-1 flex-col ${
          icon ? "pr-11" : ""
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {cardTitle && (
            <p
              className={twMerge(
                "truncate text-[11px] font-bold text-[var(--admin-ink)]",
                titleClassName,
              )}
            >
              {cardTitle}
            </p>
          )}
          {badge && (
            <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--admin-muted)] shadow-sm">
              {badge}
            </span>
          )}
        </div>

        {value !== undefined && value !== null && (
          <p
            className={twMerge(
              "mt-1.5 truncate text-[20px] font-bold leading-6 text-[var(--admin-navy)]",
              valueClassName,
            )}
          >
            {value}
          </p>
        )}

        {cardDescription && (
          <div
            className={twMerge(
              "mt-2 text-[10.5px] font-medium text-[var(--admin-muted)]",
              descriptionClassName,
            )}
          >
            {cardDescription}
          </div>
        )}

        {footer && <div className="mt-auto pt-3">{footer}</div>}
      </div>
    </Component>
  );
};

export default SummaryCard;
