import React from 'react'
import selectJson from '../../../_helpers/SelectJson.json'

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
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
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
                            className={`inline-flex items-center gap-2 text-sm ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        >
                            <input
                                type="checkbox"
                                name={`permission-${module}`}
                                id={`${module}-${option.value}`}
                                className="h-4 w-4 rounded border-[#082f91] accent-[#082f91] focus:ring-[#082f91]"
                                checked={isSelected}
                                onChange={() => {
                                    if (disabled) return;
                                    handlePermissionChange(option.value);
                                }}
                                disabled={disabled}
                            />
                            <span className={`${isSelected ? 'font-medium text-gray-800' : 'font-normal text-gray-600'}`}>
                                {option.label}
                            </span>
                        </label>
                    );
                })}
        </div>
    )
}

export default PermissionsSelector
