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
      "mt-8 rounded-[8px] border border-[#0425861F] bg-[#E49E1C1A] p-4",
      className,
    )}
  >
    <p
      className={twMerge(
        "text-[14px] font-bold uppercase leading-[15px] tracking-[1px] text-[#042586]",
        titleClassName,
      )}
    >
      {title}
    </p>
    <p
      className={twMerge(
        "mt-2 text-[12px] font-normal leading-[19.5px] text-[#042586]",
        descriptionClassName,
      )}
    >
      {description}
    </p>
    <button
      type="button"
      onClick={onClick}
      className={twMerge(
        "mt-4 h-[32px] w-full rounded-[4px] bg-[#042586] text-[11px] font-bold text-white transition hover:bg-[#062779]",
        buttonClassName,
      )}
    >
      {buttonText}
    </button>
  </div>
);

export default NeedHelpCard;
