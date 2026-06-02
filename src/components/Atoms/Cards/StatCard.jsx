import React from "react";

const StatCard = ({ icon: Icon, iconClassName = "", label, value, loading }) => {
  return (
    <div className="admin-card p-4">
      <div className="flex items-center justify-between mb-3">
        {Icon && (
          <span
            className={`flex items-center justify-center w-9 h-9 rounded-lg ${iconClassName}`}
          >
            <Icon size={18} />
          </span>
        )}
      </div>
        <div className="text-xl md:text-2xl font-inter font-bold text-[var(--admin-navy)]">
        {loading ? (
          <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
        ) : (
          (value ?? 0)
        )}
      </div>
      <div className="text-sm font-inter font-semibold text-[var(--admin-muted)]">
        {label}
      </div>
    </div>
  );
};

export default StatCard;
