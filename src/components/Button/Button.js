import React from "react";

const Button = ({ label, onClick, isActive, className = "" }) => {
    return (
        <button type="button"
            className={`rounded-t-md text-center p-2 transition-colors duration-300 ${isActive ? 'bg-gradient-to-r from-[#855DF6] to-[#715EFE] text-black' : 'border-x-2 border-t-2'
                } hover:bg-blue-600 hover:text-black ${className}`}
            onClick={onClick}
        >
            {label}
        </button>
    );
};

export default Button;
