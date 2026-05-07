const { successResponse } = require("../../../shared/http/response");
const { RbacService } = require("../services/rbac.service");

class PermissionAssignmentController {
  constructor({ rbacService = new RbacService() } = {}) {
    this.rbacService = rbacService;
  }

  // USER PERMISSIONS
  getUserPermissions = async (req, res) => {
    const { userId } = req.params;
    const permissions = await this.rbacService.getUserPermissions(userId);
    res.json(successResponse(permissions));
  };

  assignPermissionToUser = async (req, res) => {
    const { userId } = req.params;
    const { permissionId } = req.body;
    const grantedBy = req.auth?.sub;

    const result = await this.rbacService.assignPermissionToUser(
      userId,
      permissionId,
      grantedBy,
    );
    res.status(201).json(successResponse(result));
  };

  removePermissionFromUser = async (req, res) => {
    const { userId } = req.params;
    const { permissionId } = req.body;

    const result = await this.rbacService.removePermissionFromUser(
      userId,
      permissionId,
    );
    res.json(successResponse(result));
  };

  bulkAssignPermissionsToUser = async (req, res) => {
    const { userId } = req.params;
    const { permissionIds } = req.body;
    const grantedBy = req.auth?.sub;

    const result = await this.rbacService.bulkAssignPermissionsToUser(
      userId,
      permissionIds,
      grantedBy,
    );
    res.json(successResponse(result));
  };

  getUserEffectivePermissions = async (req, res) => {
    const { userId } = req.params;
    const permissions =
      await this.rbacService.getUserEffectivePermissions(userId);
    res.json(successResponse(permissions));
  };

  // USER ROLES
  getUserRoles = async (req, res) => {
    const { userId } = req.params;
    const roles = await this.rbacService.getUserRoles(userId);
    res.json(successResponse(roles));
  };

  assignRoleToUser = async (req, res) => {
    const { userId } = req.params;
    const { roleId } = req.body;
    const assignedBy = req.auth?.sub;

    const result = await this.rbacService.assignRoleToUser(
      userId,
      roleId,
      assignedBy,
    );
    res.status(201).json(successResponse(result));
  };

  removeRoleFromUser = async (req, res) => {
    const { userId } = req.params;
    const { roleId } = req.body;

    const result = await this.rbacService.removeRoleFromUser(userId, roleId);
    res.json(successResponse(result));
  };

  bulkAssignRolesToUser = async (req, res) => {
    const { userId } = req.params;
    const { roleIds } = req.body;
    const assignedBy = req.auth?.sub;

    const result = await this.rbacService.bulkAssignRolesToUser(
      userId,
      roleIds,
      assignedBy,
    );
    res.json(successResponse(result));
  };

  // CHECK PERMISSIONS
  checkUserPermission = async (req, res) => {
    const { userId } = req.params;
    const { permissionSlug } = req.query;

    const hasPermission = await this.rbacService.userHasPermission(
      userId,
      permissionSlug,
    );
    res.json(successResponse({ hasPermission }));
  };

  checkUserRole = async (req, res) => {
    const { userId } = req.params;
    const { roleSlug } = req.query;

    const hasRole = await this.rbacService.userHasRole(userId, roleSlug);
    res.json(successResponse({ hasRole }));
  };
}

module.exports = { PermissionAssignmentController };
