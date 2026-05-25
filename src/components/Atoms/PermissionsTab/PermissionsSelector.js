import React from 'react';

const ACTION_ORDER = [
  'none',
  'view',
  'create',
  'add',
  'edit',
  'update',
  'delete',
  'approve',
  'approval',
  'reject',
  'assign',
  'export',
  'import',
  'status_change',
  'status',
  'restore',
  'bulk_action',
  'action',
];

const ACTION_LABELS = {
  none: 'None',
  view: 'View',
  create: 'Create',
  add: 'Add',
  edit: 'Edit',
  update: 'Update',
  delete: 'Delete',
  approve: 'Approve',
  approval: 'Approval',
  reject: 'Reject',
  assign: 'Assign',
  export: 'Export',
  import: 'Import',
  status_change: 'Status Change',
  status: 'Status',
  restore: 'Restore',
  bulk_action: 'Bulk Action',
  action: 'Action',
};

const formatActionLabel = (value = '') =>
  ACTION_LABELS[value] ||
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const PermissionsSelector = ({ module, selected, availablePermissions = [], onChange, disabled = false }) => {
    const normalizedAvailable = Array.from(
        new Set(
            ['none', ...(availablePermissions || [])]
                .map((permission) => String(permission || '').trim().toLowerCase())
                .filter(Boolean),
        ),
    );
    const available = new Set(normalizedAvailable);
    const sortedPermissions = normalizedAvailable.sort((left, right) => {
        const leftIndex = ACTION_ORDER.indexOf(left);
        const rightIndex = ACTION_ORDER.indexOf(right);
        const safeLeft = leftIndex === -1 ? ACTION_ORDER.length : leftIndex;
        const safeRight = rightIndex === -1 ? ACTION_ORDER.length : rightIndex;
        if (safeLeft !== safeRight) return safeLeft - safeRight;
        return left.localeCompare(right);
    });
    
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
                {sortedPermissions
                    .filter((option) => available.has(option))
                    .map((option) => {
                    const isSelected = selected.includes(option);
                    return (
                        <label
                            key={option}
                            htmlFor={`${module}-${option}`}
                            className={`inline-flex items-center gap-2 text-sm ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        >
                            <input
                                type="checkbox"
                                name={`permission-${module}`}
                                id={`${module}-${option}`}
                                className="h-4 w-4 rounded border-[#082f91] accent-[#082f91] focus:ring-[#082f91]"
                                checked={isSelected}
                                onChange={() => {
                                    if (disabled) return;
                                    handlePermissionChange(option);
                                }}
                                disabled={disabled}
                            />
                            <span className={`${isSelected ? 'font-medium text-gray-800' : 'font-normal text-gray-600'}`}>
                                {formatActionLabel(option)}
                            </span>
                        </label>
                    );
                })}
        </div>
    )
}

export default PermissionsSelector;
