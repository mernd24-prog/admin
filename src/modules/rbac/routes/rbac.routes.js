const express = require("express");
const { ModuleController } = require("../controllers/module.controller");
const {
  PermissionController,
} = require("../controllers/permission.controller");
const { RoleController } = require("../controllers/role.controller");
const {
  PermissionAssignmentController,
} = require("../controllers/permission-assignment.controller");
const { authenticate } = require("../../../shared/middleware/authenticate");
const {
  authorize,
  authorizePermission,
} = require("../../../shared/middleware/authorize");
const { asyncHandler } = require("../../../shared/middleware/async-handler");
const {
  validateRequest,
} = require("../../../shared/middleware/validate-request");
const {
  createModuleSchema,
  updateModuleSchema,
  listModulesSchema,
  permissionManagementSchema,
  moduleParamSchema,
  createPermissionSchema,
  updatePermissionSchema,
  listPermissionsSchema,
  permissionParamSchema,
  createRoleSchema,
  updateRoleSchema,
  listRolesSchema,
  roleParamSchema,
  assignPermissionSchema,
  removePermissionSchema,
  bulkAssignPermissionsSchema,
  userPermissionParamSchema,
  assignRoleSchema,
  removeRoleSchema,
  bulkAssignRolesSchema,
  checkPermissionSchema,
  checkRoleSchema,
} = require("../validation/rbac.validation");

const rbacRoutes = express.Router();

const moduleController = new ModuleController();
const permissionController = new PermissionController();
const roleController = new RoleController();
const permissionAssignmentController = new PermissionAssignmentController();

// Apply authentication to all RBAC routes
rbacRoutes.use(authenticate);

// MODULES ROUTES
rbacRoutes.get(
  "/permission-management/modules",
  validateRequest(permissionManagementSchema),
  asyncHandler(moduleController.permissionManagement),
);

rbacRoutes.get(
  "/modules",
  validateRequest(listModulesSchema),
  asyncHandler(moduleController.listModules),
);

rbacRoutes.get(
  "/modules/:moduleId",
  validateRequest(moduleParamSchema),
  asyncHandler(moduleController.getModule),
);

rbacRoutes.post(
  "/modules",
  authorizePermission("rbac:module:create"),
  validateRequest(createModuleSchema),
  asyncHandler(moduleController.createModule),
);

rbacRoutes.patch(
  "/modules/:moduleId",
  validateRequest({ ...moduleParamSchema, body: updateModuleSchema.body }),
  authorizePermission("rbac:module:update"),
  asyncHandler(moduleController.updateModule),
);

rbacRoutes.delete(
  "/modules/:moduleId",
  validateRequest(moduleParamSchema),
  authorizePermission("rbac:module:delete"),
  asyncHandler(moduleController.deleteModule),
);

// PERMISSIONS ROUTES
rbacRoutes.get(
  "/permissions",
  validateRequest(listPermissionsSchema),
  asyncHandler(permissionController.listPermissions),
);

rbacRoutes.get(
  "/permissions/:permissionId",
  validateRequest(permissionParamSchema),
  asyncHandler(permissionController.getPermission),
);

rbacRoutes.post(
  "/permissions",
  authorizePermission("rbac:permission:create"),
  validateRequest(createPermissionSchema),
  asyncHandler(permissionController.createPermission),
);

rbacRoutes.patch(
  "/permissions/:permissionId",
  validateRequest({
    ...permissionParamSchema,
    body: updatePermissionSchema.body,
  }),
  authorizePermission("rbac:permission:update"),
  asyncHandler(permissionController.updatePermission),
);

// ROLES ROUTES
rbacRoutes.get(
  "/roles",
  validateRequest(listRolesSchema),
  asyncHandler(roleController.listRoles),
);

rbacRoutes.get(
  "/roles/:roleId",
  validateRequest(roleParamSchema),
  asyncHandler(roleController.getRole),
);

rbacRoutes.post(
  "/roles",
  authorizePermission("rbac:role:create"),
  validateRequest(createRoleSchema),
  asyncHandler(roleController.createRole),
);

rbacRoutes.patch(
  "/roles/:roleId",
  validateRequest({ ...roleParamSchema, body: updateRoleSchema.body }),
  authorizePermission("rbac:role:update"),
  asyncHandler(roleController.updateRole),
);

rbacRoutes.get(
  "/roles/:roleId/permissions",
  validateRequest(roleParamSchema),
  asyncHandler(roleController.getRolePermissions),
);

rbacRoutes.post(
  "/roles/:roleId/permissions",
  validateRequest({ ...roleParamSchema, body: assignPermissionSchema.body }),
  authorizePermission("rbac:role:assign-permission"),
  asyncHandler(roleController.assignPermissionToRole),
);

rbacRoutes.delete(
  "/roles/:roleId/permissions",
  validateRequest({ ...roleParamSchema, body: removePermissionSchema.body }),
  authorizePermission("rbac:role:remove-permission"),
  asyncHandler(roleController.removePermissionFromRole),
);

rbacRoutes.post(
  "/roles/:roleId/permissions/bulk",
  validateRequest({
    ...roleParamSchema,
    body: bulkAssignPermissionsSchema.body,
  }),
  authorizePermission("rbac:role:assign-permission"),
  asyncHandler(roleController.bulkAssignPermissions),
);

// USER PERMISSIONS ROUTES
rbacRoutes.get(
  "/users/:userId/permissions",
  validateRequest(userPermissionParamSchema),
  authorizePermission("rbac:user:view-permissions"),
  asyncHandler(permissionAssignmentController.getUserPermissions),
);

rbacRoutes.get(
  "/users/:userId/permissions/effective",
  validateRequest(userPermissionParamSchema),
  authorizePermission("rbac:user:view-permissions"),
  asyncHandler(permissionAssignmentController.getUserEffectivePermissions),
);

rbacRoutes.get(
  "/users/:userId/permissions/check",
  validateRequest({
    ...userPermissionParamSchema,
    query: checkPermissionSchema.query,
  }),
  asyncHandler(permissionAssignmentController.checkUserPermission),
);

rbacRoutes.post(
  "/users/:userId/permissions",
  validateRequest({
    ...userPermissionParamSchema,
    body: assignPermissionSchema.body,
  }),
  authorizePermission("rbac:user:assign-permission"),
  asyncHandler(permissionAssignmentController.assignPermissionToUser),
);

rbacRoutes.delete(
  "/users/:userId/permissions",
  validateRequest({
    ...userPermissionParamSchema,
    body: removePermissionSchema.body,
  }),
  authorizePermission("rbac:user:remove-permission"),
  asyncHandler(permissionAssignmentController.removePermissionFromUser),
);

rbacRoutes.post(
  "/users/:userId/permissions/bulk",
  validateRequest({
    ...userPermissionParamSchema,
    body: bulkAssignPermissionsSchema.body,
  }),
  authorizePermission("rbac:user:assign-permission"),
  asyncHandler(permissionAssignmentController.bulkAssignPermissionsToUser),
);

// USER ROLES ROUTES
rbacRoutes.get(
  "/users/:userId/roles",
  validateRequest(userPermissionParamSchema),
  authorizePermission("rbac:user:view-roles"),
  asyncHandler(permissionAssignmentController.getUserRoles),
);

rbacRoutes.get(
  "/users/:userId/roles/check",
  validateRequest({
    ...userPermissionParamSchema,
    query: checkRoleSchema.query,
  }),
  asyncHandler(permissionAssignmentController.checkUserRole),
);

rbacRoutes.post(
  "/users/:userId/roles",
  validateRequest({
    ...userPermissionParamSchema,
    body: assignRoleSchema.body,
  }),
  authorizePermission("rbac:user:assign-role"),
  asyncHandler(permissionAssignmentController.assignRoleToUser),
);

rbacRoutes.delete(
  "/users/:userId/roles",
  validateRequest({
    ...userPermissionParamSchema,
    body: removeRoleSchema.body,
  }),
  authorizePermission("rbac:user:remove-role"),
  asyncHandler(permissionAssignmentController.removeRoleFromUser),
);

rbacRoutes.post(
  "/users/:userId/roles/bulk",
  validateRequest({
    ...userPermissionParamSchema,
    body: bulkAssignRolesSchema.body,
  }),
  authorizePermission("rbac:user:assign-role"),
  asyncHandler(permissionAssignmentController.bulkAssignRolesToUser),
);

module.exports = { rbacRoutes };
