import React from "react";

const StatCard = ({ icon: Icon, iconClassName = "", label, value, loading }) => {
  return (
    <div className="bg-white shadow-[0_2px_6px_rgba(20,20,20,0.16)] border-[#e7e7e7] bg-gradient-to-br from-[#FFFFFF] to-[#F4F1ED] rounded-xl border shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        {Icon && (
          <span
            className={`flex items-center justify-center w-9 h-9 rounded-lg ${iconClassName}`}
          >
            <Icon size={18} />
          </span>
        )}
      </div>
      <div className="text-xl md:text-3xl font-inter font-bold text-[#042586]">
        {loading ? (
          <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
        ) : (
          (value ?? 0)
        )}
      </div>
      <div className="text-sm md:text-lg font-inter font-semibold text-[#182D5099]/60">
        {label}
      </div>
    </div>
  );
};

export default StatCard;
