import React from 'react';

const ACTION_ORDER = [
  'none',
  'view',
  'create',
  'update',
  'delete',
  'approve',
  'reject',
  'assign',
  'export',
  'import',
  'status_change',
  'restore',
  'bulk_action',
];

const ACTION_ALIASES = {
  add: 'create',
  edit: 'update',
  status: 'status_change',
  approval: 'approve',
  action: 'status_change',
  review: 'approve',
  manage: 'status_change',
};

const ACTION_LABELS = {
  none: 'None',
  view: 'View',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  approve: 'Approve',
  reject: 'Reject',
  assign: 'Assign',
  export: 'Export',
  import: 'Import',
  status_change: 'Status Change',
  restore: 'Restore',
  bulk_action: 'Bulk Action',
};

const normalizeAction = (value = '') => {
  const action = String(value || '').trim().toLowerCase();
  return ACTION_ALIASES[action] || action;
};

const formatActionLabel = (value = '') =>
  ACTION_LABELS[value] ||
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const PermissionsSelector = ({ module, selected, availablePermissions = [], onChange, disabled = false }) => {
    const selectedSet = new Set((selected || []).map(normalizeAction));
    const normalizedAvailable = Array.from(
        new Set(
            ['none', ...(availablePermissions || [])]
                .map(normalizeAction)
                .filter((permission) => permission && ACTION_ORDER.includes(permission)),
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
        } else if (optionValue === 'view' && selectedSet.has('view')) {
            // Removing view removes page access, so all action access goes too.
            onChange(['none']);
        } else {
            // If any other permission is clicked
            let newSelected;
            const normalizedSelected = Array.from(selectedSet);
            
            if (selectedSet.has(optionValue)) {
                // If clicking to uncheck this permission
                newSelected = normalizedSelected.filter(perm => perm !== optionValue);
            } else {
                // If clicking to check this permission
                newSelected = [...normalizedSelected.filter(perm => perm !== 'none'), optionValue];
            }
            
            // Remove "none" when any other permission is selected
            newSelected = newSelected.filter(perm => perm !== 'none');
            if (newSelected.length && !newSelected.includes('view')) {
                newSelected = ['view', ...newSelected];
            }
            
            onChange(newSelected);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {sortedPermissions
                    .filter((option) => available.has(option))
                    .map((option) => {
                    const isSelected = selectedSet.has(option);
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
