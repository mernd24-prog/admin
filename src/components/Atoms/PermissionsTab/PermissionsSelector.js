import React from 'react'
import selectJson from '../../../_helpers/SelectJson.json'

// Common permission chip color combination.
const PERMISSION_CHIP_COLORS = {
    selectedGradient: 'linear-gradient(90deg, #A26D27 0%, #CE9F2D 100%)',
    selectedBorder: 'border-[#CE9F2D]',
    defaultBorder: 'border-gray-300',
    hover: 'hover:border-[#CE9F2D] hover:bg-[#CE9F2D]/10',
};
const ORDERED_PERMISSION_VALUES = ['none', 'view', 'add', 'update', 'delete'];

const PermissionsSelector = ({ module, selected, availablePermissions = [], onChange, disabled = false }) => {
    const available = new Set(['none', ...availablePermissions]);
    
    const handlePermissionChange = (optionValue) => {
        if (optionValue === 'none') {
            // If "none" is clicked, only select "none" and uncheck all others
            onChange(['none']);
        } else {
            // If any other permission is clicked
            let newSelected;
            
            if (selected.includes(optionValue)) {
                // If clicking to uncheck this permission
                newSelected = selected.filter(perm => perm !== optionValue);
            } else {
                // If clicking to check this permission
                newSelected = [...selected.filter(perm => perm !== 'none'), optionValue];
            }
            
            // Remove "none" when any other permission is selected
            newSelected = newSelected.filter(perm => perm !== 'none');
            
            onChange(newSelected);
        }
    };

    return (
        <div>
            <div className="flex gap-3 flex-wrap">
                {selectJson?.permissionOptions
                    .filter((option) => ORDERED_PERMISSION_VALUES.includes(option.value))
                    .sort((a, b) => ORDERED_PERMISSION_VALUES.indexOf(a.value) - ORDERED_PERMISSION_VALUES.indexOf(b.value))
                    .filter((option) => available.has(option.value))
                    .map((option) => {
                    const isSelected = selected.includes(option.value);
                    return (
                        <label
                            key={option.value}
                            htmlFor={`${module}-${option.value}`}
                            className={`
                                flex items-center gap-2 px-4 py-2 transition-all duration-300 rounded-md border
                                ${isSelected
                                    ? `${PERMISSION_CHIP_COLORS.selectedBorder} text-[#8A5A1F]`
                                    : `${PERMISSION_CHIP_COLORS.defaultBorder} text-gray-600 bg-[#f3f6f9]`
                                }
                                ${PERMISSION_CHIP_COLORS.hover}
                                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
                            `}
                        >
                            <input
                                type="checkbox"
                                name={`permission-${module}`}
                                id={`${module}-${option.value}`}
                                className="peer hidden"
                                checked={isSelected}
                                onChange={() => {
                                    if (disabled) return;
                                    handlePermissionChange(option.value);
                                }}
                                disabled={disabled}
                            />
                            <span
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                                    ${isSelected ? 'border-[#CE9F2D]' : 'border-gray-400'}
                                `}
                            >
                                {isSelected && (
                                    <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ background: PERMISSION_CHIP_COLORS.selectedGradient }}
                                    />
                                )}
                            </span>
                            <span className={`text-sm font-light ${disabled ? 'text-gray-400' : ''}`}>
                                {option.label}
                            </span>
                        </label>
                    );
                })}
            </div>
        </div>
    )
}

export default PermissionsSelector
