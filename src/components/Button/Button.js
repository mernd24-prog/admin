import React from "react";

const Button = ({ label, onClick, isActive, className = "" }) => {
    return (
        <button type="button"
            className={`rounded-t-md border px-4 py-2 text-center text-sm font-medium transition-colors duration-300 ${isActive ? 'border-[#082f91] bg-[#082f91] text-white' : 'border-[#e4dfd9] text-[#082f91]'
                } hover:bg-[#eef2ff] ${className}`}
            onClick={onClick}
        >
            {label}
        </button>
    );
};

export default Button;
