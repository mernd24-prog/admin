import React from 'react'
import selectJson from '../../../_helpers/SelectJson.json'

const PermissionsSelector = ({ module, selected, availablePermissions = [], onChange }) => {
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
                {selectJson?.permissionOptions.filter((option) => available.has(option.value)).map((option) => {
                    const isSelected = selected.includes(option.value);
                    return (
                        <label
                            key={option.value}
                            htmlFor={`${module}-${option.value}`}
                            className={`
                                cursor-pointer flex items-center gap-2 px-4 py-2 transition-all duration-300 bg-[#f3f6f9]
                                ${isSelected ? `border-[#7256F8] ` : "border-gray-300 "}
                                hover:shadow-md rounded-md
                            `}
                        >
                            <input
                                type="checkbox"
                                name={`permission-${module}`}
                                id={`${module}-${option.value}`}
                                className="peer hidden"
                                checked={isSelected}
                                onChange={() => handlePermissionChange(option.value)}
                            />
                            <span
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                                    ${isSelected ? "border-[#7256F8]" : "border-gray-400"}
                                `}
                            >
                                {isSelected && <span className="w-2 h-2 bg-[#7256F8] rounded-full" />}
                            </span>
                            <span className="text-sm font-light">{option.label}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    )
}

export default PermissionsSelector
