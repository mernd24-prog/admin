import React, { useRef, useState, useEffect } from 'react';

const Dropdown = ({
    options,
    onSelect,
    triggerLabel = 'Menu',
    triggerClassName = 'px-4 py-2 w-auto bg-[#f3f6f9] border border-[#dee2e6] text-gray-700  hover:bg-gray-200 flex items-center gap-1',
    menuClassName = 'bg-white shadow-lg rounded-md',
    itemClassName = 'text-gray-700 hover:bg-gray-100',
    dividerClassName = 'border-gray-200',
    position = 'right',
    showDivider = true,
    selectedValue
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            // Changed event to event.target here
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (value) => {
        onSelect(value);
        setIsOpen(false);
    };

    return (
        <div className="relative inline-block " ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`transition-all duration-200 ${triggerClassName}`}
            >
                {triggerLabel} 
            </button>

            <div
                className={`absolute ${position === 'right' ? 'right-0' : 'left-0'} mt-1 w-48 z-50 transition-all duration-200 ${
                    isOpen
                        ? 'opacity-100 visible translate-y-0'
                        : 'opacity-0 invisible -translate-y-2'
                }`}
            >
                <div className={`py-1 ${menuClassName}`}>
                    {options.map((option, index) => (
                        <React.Fragment key={option.value}>
                            <button
                                onClick={() => handleSelect(option.value)}
                                className={`block w-full text-left px-4 py-2 transition-colors duration-200 ${itemClassName} ${
                                    selectedValue === option.value ? 'bg-gray-200 font-medium' : ''
                                }`}
                            >
                                <div className="flex items-center">
                                    {option.icon && <span className="mr-2">{option.icon}</span>}
                                    {option.label}
                                </div>
                            </button>

                            {showDivider && index < options.length - 1 && (
                                <div className={`border-t my-1 ${dividerClassName}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dropdown;