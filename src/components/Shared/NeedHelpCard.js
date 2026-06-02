import React from "react";
import { twMerge } from "tailwind-merge";

const NeedHelpCard = ({
  title,
  description,
  buttonText,
  onClick,
  className = "",
  titleClassName = "",
  descriptionClassName = "",
  buttonClassName = "",
}) => (
  <div
    className={twMerge(
      "mt-8 rounded-[8px] border border-[var(--admin-line)] bg-[var(--admin-gold-soft)] p-4",
      className,
    )}
  >
    <p
      className={twMerge(
        "text-[14px] font-bold uppercase leading-[15px] tracking-[1px] text-[var(--admin-navy)]",
        titleClassName,
      )}
    >
      {title}
    </p>
    <p
      className={twMerge(
        "mt-2 text-[12px] font-normal leading-[19.5px] text-[var(--admin-ink)]",
        descriptionClassName,
      )}
    >
      {description}
    </p>
    <button
      type="button"
      onClick={onClick}
      className={twMerge(
        "mt-4 h-[32px] w-full rounded-[4px] bg-[var(--admin-gold)] text-[11px] font-bold text-[var(--admin-navy)] transition hover:bg-[var(--admin-gold-dark)]",
        buttonClassName,
      )}
    >
      {buttonText}
    </button>
  </div>
);

export default NeedHelpCard;
