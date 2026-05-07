# RBAC (Role-Based Access Control) Module

This module provides a comprehensive Role-Based Access Control (RBAC) system with permission management, role assignment, and super admin functionality.

## Features

- **Super Admin System**: One-time creation of super admin with full platform permissions
- **Module Management**: Organize permissions by modules
- **Permission Management**: Create, update, and manage permissions with actions (create, read, update, delete, manage)
- **Role Management**: Define roles and assign permissions to roles
- **User-Level Permissions**: Assign permissions directly to users or through roles
- **Effective Permissions**: Get the combined set of permissions a user has through roles and direct assignments
- **Permission Checking**: Verify if a user has specific permissions or roles

## Database Schema

### Tables

#### `modules`
Organizes permissions into logical modules (e.g., "Product Management", "User Management", "Admin Panel")

```sql
- id (UUID): Primary key
- name (VARCHAR): Module name
- slug (VARCHAR): Unique slug for module
- description (TEXT): Module description
- icon (VARCHAR): Icon identifier
- order (INTEGER): Display order
- active (BOOLEAN): Module status
- metadata (JSONB): Additional data
- created_at, updated_at (TIMESTAMP): Timestamps
```

#### `permissions`
Individual permissions that can be assigned to roles or users

```sql
- id (UUID): Primary key
- module_id (UUID): Reference to module
- name (VARCHAR): Permission name
- slug (VARCHAR): Unique slug within module
- description (TEXT): Permission description
- action (VARCHAR): Action type (create, read, update, delete, manage)
- active (BOOLEAN): Permission status
- metadata (JSONB): Additional data
- created_at, updated_at (TIMESTAMP): Timestamps
```

#### `roles`
Job roles or responsibilities in the system

```sql
- id (UUID): Primary key
- name (VARCHAR): Role name (must be unique)
- slug (VARCHAR): Unique slug for role
- description (TEXT): Role description
- type (VARCHAR): 'system' or 'custom'
- is_super_admin (BOOLEAN): Marks super admin role
- active (BOOLEAN): Role status
- metadata (JSONB): Additional data
- created_at, updated_at (TIMESTAMP): Timestamps
```

#### `role_permissions`
Junction table linking roles to permissions

```sql
- id (UUID): Primary key
- role_id (UUID): Reference to role
- permission_id (UUID): Reference to permission
- created_at (TIMESTAMP): When assigned
```

#### `user_permissions`
Direct permission assignments to users (bypass role assignments)

```sql
- id (UUID): Primary key
- user_id (VARCHAR): User identifier
- permission_id (UUID): Reference to permission
- granted_by (VARCHAR): Admin who granted permission
- granted_at (TIMESTAMP): When granted
- revoked_at (TIMESTAMP): When revoked (NULL if active)
- metadata (JSONB): Additional data
```

#### `user_roles`
Role assignments to users

```sql
- id (UUID): Primary key
- user_id (VARCHAR): User identifier
- role_id (UUID): Reference to role
- assigned_by (VARCHAR): Admin who assigned role
- assigned_at (TIMESTAMP): When assigned
- revoked_at (TIMESTAMP): When revoked (NULL if active)
- metadata (JSONB): Additional data
```

#### `super_admins`
List of super admin users

```sql
- id (UUID): Primary key
- user_id (VARCHAR): User identifier (unique)
- email (VARCHAR): Email (unique)
- full_name (VARCHAR): Full name
- is_active (BOOLEAN): Status
- created_at, updated_at (TIMESTAMP): Timestamps
```

## API Endpoints

### Modules

```
GET    /api/rbac/modules                 - List all modules
GET    /api/rbac/modules/:moduleId       - Get specific module
POST   /api/rbac/modules                 - Create module
PATCH  /api/rbac/modules/:moduleId       - Update module
DELETE /api/rbac/modules/:moduleId       - Delete module
```

### Permissions

```
GET    /api/rbac/permissions             - List permissions
GET    /api/rbac/permissions/:permissionId - Get permission
POST   /api/rbac/permissions             - Create permission
PATCH  /api/rbac/permissions/:permissionId - Update permission
```

### Roles

```
GET    /api/rbac/roles                   - List roles
GET    /api/rbac/roles/:roleId           - Get role
POST   /api/rbac/roles                   - Create role
PATCH  /api/rbac/roles/:roleId           - Update role
GET    /api/rbac/roles/:roleId/permissions - Get role permissions
POST   /api/rbac/roles/:roleId/permissions - Assign permission to role
DELETE /api/rbac/roles/:roleId/permissions - Remove permission from role
POST   /api/rbac/roles/:roleId/permissions/bulk - Bulk assign permissions
```

### User Permissions

```
GET    /api/rbac/users/:userId/permissions           - Get user permissions
GET    /api/rbac/users/:userId/permissions/effective - Get effective permissions
GET    /api/rbac/users/:userId/permissions/check     - Check permission (query: permissionSlug)
POST   /api/rbac/users/:userId/permissions           - Assign permission to user
DELETE /api/rbac/users/:userId/permissions           - Remove permission from user
POST   /api/rbac/users/:userId/permissions/bulk      - Bulk assign permissions
```

### User Roles

```
GET    /api/rbac/users/:userId/roles      - Get user roles
GET    /api/rbac/users/:userId/roles/check - Check role (query: roleSlug)
POST   /api/rbac/users/:userId/roles      - Assign role to user
DELETE /api/rbac/users/:userId/roles      - Remove role from user
POST   /api/rbac/users/:userId/roles/bulk - Bulk assign roles
```

## Setup and Initialization

### 1. Run Migrations

```bash
npm run migrate
```

This creates all necessary tables.

### 2. Create Super Admin (One-Time)

```bash
npm run create-super-admin
```

This script is interactive and:
- Checks if super admin already exists (fails if it does)
- Creates the super admin user
- Creates the super admin role (if it doesn't exist)
- Assigns all permissions to the super admin role
- Can only be run once per installation

**Important**: This script can ONLY be run once. Subsequent attempts will fail.

### 3. Seed Initial Modules and Permissions (Optional)

```bash
npm run seed-rbac
```

This populates the database with common modules and permissions.

## Usage Examples

### Get User's Effective Permissions

```bash
GET /api/rbac/users/user123/permissions/effective
```

Returns all permissions the user has through roles and direct assignments.

### Check if User Has Permission

```bash
GET /api/rbac/users/user123/permissions/check?permissionSlug=product:create
```

Returns: `{ hasPermission: true/false }`

### Assign Permission to User

```bash
POST /api/rbac/users/user123/permissions
Body: { "permissionId": "uuid" }
```

### Assign Role to User

```bash
POST /api/rbac/users/user123/roles
Body: { "roleId": "uuid" }
```

### Get User Roles

```bash
GET /api/rbac/users/user123/roles
```

### Create a New Role with Permissions

```bash
POST /api/rbac/roles
Body: {
  "name": "Product Manager",
  "slug": "product-manager",
  "description": "Manages product catalog",
  "type": "custom"
}
```

### Assign Permissions to Role

```bash
POST /api/rbac/roles/roleId/permissions
Body: { "permissionId": "permissionId" }
```

### Bulk Assign Permissions

```bash
POST /api/rbac/roles/roleId/permissions/bulk
Body: { "permissionIds": ["perm1", "perm2", "perm3"] }
```

## Service Methods

The `RbacService` provides these key methods:

```javascript
// Modules
createModule(moduleData)
getModule(id)
listModules(filters)
updateModule(id, updates)
deleteModule(id)

// Permissions
createPermission(permissionData)
getPermission(id)
listPermissions(filters)
updatePermission(id, updates)

// Roles
createRole(roleData)
getRole(id)
listRoles(filters)
updateRole(id, updates)
assignPermissionToRole(roleId, permissionId)
removePermissionFromRole(roleId, permissionId)
getRolePermissions(roleId)
bulkAssignPermissionsToRole(roleId, permissionIds)

// User Permissions
assignPermissionToUser(userId, permissionId, grantedBy)
removePermissionFromUser(userId, permissionId)
getUserPermissions(userId)
bulkAssignPermissionsToUser(userId, permissionIds, grantedBy)

// User Roles
assignRoleToUser(userId, roleId, assignedBy)
removeRoleFromUser(userId, roleId)
getUserRoles(userId)
bulkAssignRolesToUser(userId, roleIds, assignedBy)

// Effective Permissions
getUserEffectivePermissions(userId)
userHasPermission(userId, permissionSlug)
userHasRole(userId, roleSlug)

// Super Admin
checkSuperAdminExists()
getSuperAdminByUserId(userId)
listSuperAdmins(filters)
updateSuperAdmin(userId, updates)
```

## Best Practices

1. **Permission Naming**: Use dot notation for permission slugs (e.g., `product:create`, `user:read`)
2. **Role Naming**: Use clear, descriptive names (e.g., "Product Manager", "Content Reviewer")
3. **Module Organization**: Group related permissions into modules
4. **Super Admin Access**: Only create one super admin and protect the creation script
5. **Permission Revocation**: Use soft deletes (revokedAt field) for audit trails
6. **Bulk Operations**: Use bulk endpoints when assigning multiple permissions/roles

## Security Considerations

1. The super admin creation script can only run once and requires validation
2. All RBAC endpoints require authentication
3. Endpoints for creating/modifying roles and permissions require specific RBAC permissions
4. Revoked permissions are tracked with timestamps for audit trails
5. Permission changes are tracked with `assigned_by` and `granted_by` fields

## Error Codes

- `404`: Module, permission, role, or user not found
- `409`: Duplicate slug or permission already assigned
- `400`: Invalid request data
- `401`: Unauthorized
- `403`: Forbidden (insufficient permissions)

## Development

To use the RBAC service in your code:

```javascript
const { RbacService } = require("./modules/rbac/services/rbac.service");

const rbacService = new RbacService();

// Check if user has permission
const hasPermission = await rbacService.userHasPermission(userId, "product:create");

// Get all user permissions
const permissions = await rbacService.getUserEffectivePermissions(userId);
```
