import React from "react";
import { twMerge } from "tailwind-merge";

const BrandLogo = ({
  src = "/logo.png",
  alt = "Sam Global",
  className = "",
  imageClassName = "",
}) => {
  return (
    <div
      className={twMerge(
        "mb-[20px] flex h-[112px]  w-[210px] items-center justify-center rounded-[8px] border border-[var(--admin-gold)]/45 bg-white p-[8px] shadow-[0_6px_16px_rgba(31,27,95,0.08)]",
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        className={twMerge(
          "h-full w-full rounded-[6px] border border-[var(--admin-gold)]/20 object-contain object-center p-[6px] ",
          imageClassName,
        )}
      />
    </div>
  );
};

export default BrandLogo;
