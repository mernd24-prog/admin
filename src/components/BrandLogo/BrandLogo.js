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
        "mb-[26px] flex h-[155px] w-[210px] items-center justify-center rounded-[8px] border border-[#e6cda9] bg-[#f7f5f2] p-[10px] shadow-[0_7px_12px_rgba(78,53,23,0.16)] box-shadow: 4px 4px 8px 10px #0000001A",
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        className={twMerge(
          "h-full w-full rounded-[6px]  border border-[#eadbc8] object-contain object-center p-[6px]",
          imageClassName,
        )}
      />
    </div>
  );
};

export default BrandLogo;
