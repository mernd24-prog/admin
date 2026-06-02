import React from "react";

const Button = ({ label, onClick, isActive, className = "" }) => {
    return (
        <button type="button"
            className={`rounded-t-md border px-4 py-2 text-center text-sm font-medium transition-colors duration-300 ${isActive ? 'border-[var(--admin-navy)] bg-[var(--admin-navy)] text-white' : 'border-[var(--admin-line)] text-[var(--admin-ink)]'
                } hover:bg-[var(--admin-blue-soft)] ${className}`}
            onClick={onClick}
        >
            {label}
        </button>
    );
};

export default Button;
