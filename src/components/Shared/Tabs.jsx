// components/Shared/Tabs.jsx

import React from "react";

const Tabs = ({ tabs = [], activeTab, onChange }) => {
  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--admin-navy)]/10 bg-[var(--admin-blue-soft)] p-1.5">
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange?.(tab.value)}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none ${
              isActive
                ? "bg-[var(--admin-navy)] text-white shadow-sm ring-1 ring-[var(--admin-navy-dark)]"
                : "bg-transparent text-[var(--admin-navy)] hover:bg-white hover:text-[var(--admin-navy-dark)]"
            }`}
          >
            {tab.label}

            {tab.count !== undefined && (
              <span
                className={`ml-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "border border-[var(--admin-navy)]/15 bg-white text-[var(--admin-navy)] shadow-xs"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;