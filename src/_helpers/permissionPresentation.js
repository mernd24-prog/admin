// Filtering is presentation-only. Keep the complete assignment state for saves.
export const visiblePermissionRows = (rows, search = '') => {
  const query = search.trim().toLowerCase();
  return rows.filter(row => row.linked !== false &&
    [row.module, row.tab, row.id].some(value => String(value || '').toLowerCase().includes(query)));
};

export const configuredModuleActions = (module, allowedActions, normalizeAction) =>
  [...new Set((module.permissions || [])
    .filter(permission => permission.id && permission.active !== false)
    .map(permission => normalizeAction(permission.action))
    .filter(action => allowedActions.includes(action)))];
