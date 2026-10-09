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
      "mt-5 rounded-[8px] border border-[#E9DEC4] bg-[#FFF4D6] p-4",
      className,
    )}
  >
    <p
      className={twMerge(
        "text-[11px] font-bold uppercase leading-[15px] text-[#1F1B5F]",
        titleClassName,
      )}
    >
      {title}
    </p>

    <p
      className={twMerge(
        "mt-2 text-[12px] font-normal leading-[18px] text-[#292638]",
        descriptionClassName,
      )}
    >
      {description}
    </p>

    <button
      type="button"
      onClick={onClick}
      className={twMerge(
        "mt-3 h-[32px] w-full rounded-[5px] bg-[#D6A323] text-[11px] font-semibold text-[#1F1B5F] transition-colors hover:bg-[#C4971F] focus:outline-none focus:ring-2 focus:ring-[#D6A323]/40",
        buttonClassName,
      )}
    >
      {buttonText}
    </button>
  </div>
);

export default NeedHelpCard;
