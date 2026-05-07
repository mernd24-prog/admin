const { successResponse } = require("../../../shared/http/response");
const { RbacService } = require("../services/rbac.service");

class RoleController {
  constructor({ rbacService = new RbacService() } = {}) {
    this.rbacService = rbacService;
  }

  listRoles = async (req, res) => {
    const result = await this.rbacService.listRoles(req.query);
    res.json(successResponse(result.items, { total: result.total }));
  };

  getRole = async (req, res) => {
    const role = await this.rbacService.getRole(req.params.roleId);
    res.json(successResponse(role));
  };

  createRole = async (req, res) => {
    const role = await this.rbacService.createRole(req.body);
    res.status(201).json(successResponse(role));
  };

  updateRole = async (req, res) => {
    const role = await this.rbacService.updateRole(req.params.roleId, req.body);
    res.json(successResponse(role));
  };

  getRolePermissions = async (req, res) => {
    const permissions = await this.rbacService.getRolePermissions(req.params.roleId);
    res.json(successResponse(permissions));
  };

  assignPermissionToRole = async (req, res) => {
    const { roleId } = req.params;
    const { permissionId } = req.body;

    const result = await this.rbacService.assignPermissionToRole(roleId, permissionId);
    res.status(201).json(successResponse(result));
  };

  removePermissionFromRole = async (req, res) => {
    const { roleId } = req.params;
    const { permissionId } = req.body;

    const result = await this.rbacService.removePermissionFromRole(roleId, permissionId);
    res.json(successResponse(result));
  };

  bulkAssignPermissions = async (req, res) => {
    const { roleId } = req.params;
    const { permissionIds } = req.body;

    const result = await this.rbacService.bulkAssignPermissionsToRole(roleId, permissionIds);
    res.json(successResponse(result));
  };
}

module.exports = { RoleController };
