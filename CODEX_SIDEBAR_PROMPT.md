# Codex Prompt: Sidebar Fixes for Admin Panel

## File Location
`Admin/src/components/Sidebar/Sidebar.js`

## **Direct Prompt for Codex:**

```
TASK: Fix three critical issues in Sidebar.js:

1. **Add Timeout Cleanup** 
   In the useEffect that handles visibleSubItems animation delays, add proper cleanup.
   Collect all setTimeout IDs in an array, then return a cleanup function that clears them.
   This prevents memory leaks when component unmounts or tabs switch rapidly.

2. **Remove ESLint Disable** 
   Remove `/* eslint-disable react-hooks/exhaustive-deps */` from the top of the file.
   Fix individual useEffect dependencies to ensure no stale closures or missing deps.

3. **Fix Reload State Persistence** 
   Save sidebar expanded state to sessionStorage when toggle is clicked, so after page reload:
   - Sidebar maintains its expanded/collapsed state
   - Animation state doesn't reset unexpectedly
   - User experience is consistent across page refreshes

Expected Results:
✅ Smooth sidebar animations with no console warnings
✅ No memory leaks from running timeouts
✅ Sidebar state persists after page reload
✅ Fast, clean tab switching
```

## Code Changes (Copy-Paste Ready):

### Part 1: Add Timeout Cleanup in useEffect (~line 208)
Replace the useEffect for visibleSubItems with this:

```javascript
useEffect(() => {
  if (activeTab && isExpanded) {
    const timeoutIds = [];
    setVisibleSubItems(prev => ({ ...prev, [activeTab]: 0 }));
    
    const subItemsCount = getSidebarData().find(item => item.label === activeTab)?.subItems.length || 0;
    const delays = Array.from({ length: subItemsCount }, (_, i) => i * 100);
    
    delays.forEach((delay, index) => {
      const timeoutId = setTimeout(() => {
        setVisibleSubItems(prev => ({ 
          ...prev, 
          [activeTab]: Math.max(prev[activeTab] || 0, index + 1) 
        }));
      }, delay);
      timeoutIds.push(timeoutId);
    });

    // Cleanup: Clear all timeouts on unmount or dependency change
    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }
}, [activeTab, isExpanded]);
```

### Part 2: Remove ESLint Disable
Delete line 1: `/* eslint-disable react-hooks/exhaustive-deps */`

### Part 3: Save State on Toggle
In `handleMenuClick` function, add sessionStorage save:

```javascript
const handleMenuClick = () => {
  const newState = !isPermanentlyOpen;
  setHasPermanentOpen(newState);
  setIsPermanentlyOpen(newState);
  setIsExpanded(newState);
  if (newState) {
    setNavbarOpen(true);
  }
  sessionStorage.setItem('sidebarPermanentState', JSON.stringify(newState));
  sessionStorage.setItem('sidebarExpandedState', JSON.stringify(newState));
};
```

## Testing Checklist:
- [ ] Open admin panel - sidebar loads with correct state
- [ ] Click tabs - smooth animations with no console errors
- [ ] Refresh page - sidebar state persists
- [ ] Check DevTools - no ESLint warnings
- [ ] Memory tab - no timeout leaks
- [ ] Rapid tab switching - no broken animations

---

## ADDITIONAL TASK: RBAC Management Module Fix + Bulk Permission Assignment

### Problem 1: Edit Functionality Not Working in RBAC Management
**File to fix:** `Admin/src/pages/RBACManagement/` or similar RBAC component
**Issue:** Users cannot edit/update permissions for modules
**Task:**
- Check if edit button/form handlers are properly connected to Redux or API calls
- Verify API endpoint is being called correctly
- Ensure form state is being updated before submission
- Add console logs to debug where the request fails

### Problem 2: Add Bulk Permission Assignment Feature
**Requirement:** Allow users to grant/revoke permissions for multiple modules at once instead of one by one.

**Implementation Steps:**

1. **Add Bulk Selection UI:**
   - Add checkboxes next to each module permission
   - Add "Select All" checkbox at the top
   - Add "Apply Permissions" and "Clear Permissions" buttons

2. **Create Bulk Update Handler:**
```javascript
const handleBulkPermissionUpdate = async (selectedModules, action) => {
  // action = 'grant' or 'revoke'
  const payload = {
    modules: selectedModules,
    action: action, // 'grant' or 'revoke'
    targetUserId: currentUserId,
    updatedBy: loggedInUserId,
    timestamp: new Date().toISOString()
  };
  
  try {
    const response = await updateBulkModulePermissions(payload);
    if (response.success) {
      showNotification('Permissions updated successfully');
      refetchPermissions();
    }
  } catch (error) {
    showNotification('Error updating permissions: ' + error.message, 'error');
  }
};
```

3. **Add Bulk Action Buttons:**
```jsx
<div className="bulk-actions">
  <button 
    onClick={() => handleBulkPermissionUpdate(selectedModules, 'grant')}
    disabled={selectedModules.length === 0}
  >
    Grant Selected Permissions ({selectedModules.length})
  </button>
  
  <button 
    onClick={() => handleBulkPermissionUpdate(selectedModules, 'revoke')}
    disabled={selectedModules.length === 0}
  >
    Revoke Selected Permissions ({selectedModules.length})
  </button>
  
  <button onClick={() => setSelectedModules([])}>
    Clear Selection
  </button>
</div>
```

4. **Update Backend API:**
   - Create new endpoint: `POST /api/rbac/bulk-update-permissions`
   - Accept array of module IDs and action type
   - Return updated permission list
   - Add audit logging for bulk changes

5. **Add Confirmation Modal:**
```javascript
const showBulkConfirmation = (selectedCount, action) => {
  return confirm(
    `Are you sure you want to ${action} permissions for ${selectedCount} module(s)? This action cannot be undone.`
  );
};
```

### Codex Prompt for RBAC Management Fixes:

```
TASK 1: Fix Edit Functionality in RBAC Management
- Find the RBAC Management component (likely in pages/RBACManagement or similar)
- Check if the edit button/form is properly connected to Redux actions or API
- Verify the permission update API endpoint is called correctly
- Ensure form data is properly serialized before sending
- Add error handling and success notifications
- Test: Edit a permission and verify it saves and reflects on page reload

TASK 2: Implement Bulk Permission Assignment Feature
- Add checkboxes to select multiple modules at once
- Add "Select All / Deselect All" functionality
- Create "Grant Selected Permissions" button (counts selected items)
- Create "Revoke Selected Permissions" button
- Implement bulk update handler that sends selected module IDs to backend
- Add confirmation modal before applying bulk changes
- Show success/error notifications after update
- Refresh permission list after bulk operation completes
- Test: Select 5 modules and grant/revoke in one action

TASK 3: Backend Support for Bulk Operations
- Create new API endpoint: POST /api/rbac/bulk-update-permissions
- Accept payload: { modules: [], action: 'grant'|'revoke', targetUserId, updatedBy }
- Validate all modules exist and current user has permission to modify them
- Update database records atomically
- Log all changes to audit trail
- Return updated permission list
- Handle errors gracefully
```

### UI Wireframe for Bulk Assignment:

```
┌─────────────────────────────────────────────────┐
│ RBAC Management - Bulk Permission Control       │
├─────────────────────────────────────────────────┤
│ [✓] Select All                                  │
├─────────────────────────────────────────────────┤
│ [✓] Products Module          - Edit             │
│ [✓] Orders Module            - Edit             │
│ [ ] Users Module             - Edit             │
│ [✓] Settings Module          - Edit             │
│ [✓] Analytics Module         - Edit             │
├─────────────────────────────────────────────────┤
│ Selected: 4 modules                             │
│                                                 │
│ [Grant Selected] [Revoke Selected] [Clear]      │
└─────────────────────────────────────────────────┘
```

## Final Testing:
- [ ] Single permission edit works
- [ ] Bulk select functionality works
- [ ] Grant/Revoke bulk operations succeed
- [ ] Permissions persist after page reload
- [ ] Confirmation modal shows before bulk update
- [ ] Audit logs record all changes
- [ ] Error notifications appear on failure
- [ ] UI disables buttons when no modules selected
