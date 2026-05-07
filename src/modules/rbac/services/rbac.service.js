const { RbacRepository } = require("../repositories/rbac.repository");
const { AppError } = require("../../../shared/errors/app-error");
const { v4: uuidv4 } = require("uuid");

class RbacService {
  constructor({ rbacRepository = new RbacRepository() } = {}) {
    this.rbacRepository = rbacRepository;
  }

  // MODULE OPERATIONS
  async createModule(moduleData) {
    const existingModule = await this.rbacRepository.getModuleBySlug(
      moduleData.slug,
    );
    if (existingModule) {
      throw new AppError("Module with this slug already exists", 409);
    }

    return this.rbacRepository.createModule(moduleData);
  }

  async getModule(id) {
    const module = await this.rbacRepository.getModuleById(id);
    if (!module) {
      throw new AppError("Module not found", 404);
    }
    return module;
  }

  async listModules(filters) {
    return this.rbacRepository.listModules(filters);
  }

  async getPermissionManagementMatrix(filters = {}) {
    const matrix =
      await this.rbacRepository.listPermissionManagementModules(filters);
    const permissionCount = matrix.items.reduce(
      (total, module) => total + module.permissions.length,
      0,
    );
    const assignedPermissionCount = matrix.items.reduce(
      (total, module) => total + module.assignedPermissionCount,
      0,
    );

    return {
      role: matrix.role,
      modules: matrix.items,
      totals: {
        modules: matrix.total,
        permissions: permissionCount,
        assignedPermissions: assignedPermissionCount,
      },
      assignedPermissionIds: matrix.assignedPermissionIds,
    };
  }

  async updateModule(id, updates) {
    const module = await this.rbacRepository.getModuleById(id);
    if (!module) {
      throw new AppError("Module not found", 404);
    }

    // Check if slug is being updated and if it's unique
    if (updates.slug && updates.slug !== module.slug) {
      const existing = await this.rbacRepository.getModuleBySlug(updates.slug);
      if (existing) {
        throw new AppError("Module with this slug already exists", 409);
      }
    }

    return this.rbacRepository.updateModule(id, updates);
  }

  async deleteModule(id) {
    return this.rbacRepository.deleteModule(id);
  }

  // PERMISSION OPERATIONS
  async createPermission(permissionData) {
    const module = await this.rbacRepository.getModuleById(
      permissionData.moduleId,
    );
    if (!module) {
      throw new AppError("Module not found", 404);
    }

    const existingPermission = await this.rbacRepository.getPermissionBySlug(
      permissionData.slug,
    );
    if (existingPermission) {
      throw new AppError("Permission with this slug already exists", 409);
    }

    return this.rbacRepository.createPermission(permissionData);
  }

  async getPermission(id) {
    const permission = await this.rbacRepository.getPermissionById(id);
    if (!permission) {
      throw new AppError("Permission not found", 404);
    }
    return permission;
  }

  async listPermissions(filters) {
    return this.rbacRepository.listPermissions(filters);
  }

  async updatePermission(id, updates) {
    const permission = await this.rbacRepository.getPermissionById(id);
    if (!permission) {
      throw new AppError("Permission not found", 404);
    }

    if (updates.slug && updates.slug !== permission.slug) {
      const existing = await this.rbacRepository.getPermissionBySlug(
        updates.slug,
      );
      if (existing) {
        throw new AppError("Permission with this slug already exists", 409);
      }
    }

    return this.rbacRepository.updatePermission(id, updates);
  }

  // ROLE OPERATIONS
  async createRole(roleData) {
    const existingRole = await this.rbacRepository.getRoleBySlug(roleData.slug);
    if (existingRole) {
      throw new AppError("Role with this slug already exists", 409);
    }

    return this.rbacRepository.createRole(roleData);
  }

  async getRole(id) {
    const role = await this.rbacRepository.getRoleById(id);
    if (!role) {
      throw new AppError("Role not found", 404);
    }
    return role;
  }

  async listRoles(filters) {
    return this.rbacRepository.listRoles(filters);
  }

  async updateRole(id, updates) {
    const role = await this.rbacRepository.getRoleById(id);
    if (!role) {
      throw new AppError("Role not found", 404);
    }

    if (updates.slug && updates.slug !== role.slug) {
      const existing = await this.rbacRepository.getRoleBySlug(updates.slug);
      if (existing) {
        throw new AppError("Role with this slug already exists", 409);
      }
    }

    return this.rbacRepository.updateRole(id, updates);
  }

  // ROLE PERMISSION ASSIGNMENT
  async assignPermissionToRole(roleId, permissionId) {
    return this.rbacRepository.assignPermissionToRole(roleId, permissionId);
  }

  async removePermissionFromRole(roleId, permissionId) {
    return this.rbacRepository.removePermissionFromRole(roleId, permissionId);
  }

  async bulkAssignPermissionsToRole(roleId, permissionIds) {
    const results = [];
    const errors = [];

    for (const permissionId of permissionIds) {
      try {
        const result = await this.rbacRepository.assignPermissionToRole(
          roleId,
          permissionId,
        );
        results.push(result);
      } catch (error) {
        errors.push({ permissionId, error: error.message });
      }
    }

    return { assigned: results, errors };
  }

  async getRolePermissions(roleId) {
    return this.rbacRepository.getRolePermissions(roleId);
  }

  // USER PERMISSION ASSIGNMENT
  async assignPermissionToUser(userId, permissionId, grantedBy) {
    return this.rbacRepository.assignPermissionToUser(
      userId,
      permissionId,
      grantedBy,
    );
  }

  async removePermissionFromUser(userId, permissionId) {
    return this.rbacRepository.removePermissionFromUser(userId, permissionId);
  }

  async bulkAssignPermissionsToUser(userId, permissionIds, grantedBy) {
    const results = [];
    const errors = [];

    for (const permissionId of permissionIds) {
      try {
        const result = await this.rbacRepository.assignPermissionToUser(
          userId,
          permissionId,
          grantedBy,
        );
        results.push(result);
      } catch (error) {
        errors.push({ permissionId, error: error.message });
      }
    }

    return { assigned: results, errors };
  }

  async getUserPermissions(userId) {
    return this.rbacRepository.getUserPermissions(userId);
  }

  // USER ROLE ASSIGNMENT
  async assignRoleToUser(userId, roleId, assignedBy) {
    return this.rbacRepository.assignRoleToUser(userId, roleId, assignedBy);
  }

  async assignRoleToUserBySlug(userId, roleSlug, assignedBy, options = {}) {
    const { ignoreMissing = false, ignoreExisting = true } = options;
    const role = await this.rbacRepository.getRoleBySlug(roleSlug);

    if (!role) {
      if (ignoreMissing) {
        return null;
      }
      throw new AppError("Role not found", 404);
    }

    try {
      return await this.assignRoleToUser(userId, role.id, assignedBy);
    } catch (error) {
      if (
        ignoreExisting &&
        error instanceof AppError &&
        error.statusCode === 409
      ) {
        return null;
      }
      throw error;
    }
  }

  async removeRoleFromUser(userId, roleId) {
    return this.rbacRepository.removeRoleFromUser(userId, roleId);
  }

  async bulkAssignRolesToUser(userId, roleIds, assignedBy) {
    const results = [];
    const errors = [];

    for (const roleId of roleIds) {
      try {
        const result = await this.rbacRepository.assignRoleToUser(
          userId,
          roleId,
          assignedBy,
        );
        results.push(result);
      } catch (error) {
        errors.push({ roleId, error: error.message });
      }
    }

    return { assigned: results, errors };
  }

  async getUserRoles(userId) {
    return this.rbacRepository.getUserRoles(userId);
  }

  // GET EFFECTIVE PERMISSIONS
  async getUserEffectivePermissions(userId) {
    return this.rbacRepository.getUserEffectivePermissions(userId);
  }

  async userHasPermission(userId, permissionSlug) {
    const permissions = await this.getUserEffectivePermissions(userId);
    return permissions.some((p) => p.slug === permissionSlug);
  }

  async userHasRole(userId, roleSlug) {
    const roles = await this.rbacRepository.getUserRoles(userId);
    return roles.some((ur) => ur.role && ur.role.slug === roleSlug);
  }

  // SUPER ADMIN OPERATIONS
  async checkSuperAdminExists() {
    return this.rbacRepository.superAdminExists();
  }

  async getSuperAdminByUserId(userId) {
    return this.rbacRepository.getSuperAdminByUserId(userId);
  }

  async listSuperAdmins(filters) {
    return this.rbacRepository.listSuperAdmins(filters);
  }

  async updateSuperAdmin(userId, updates) {
    return this.rbacRepository.updateSuperAdmin(userId, updates);
  }
}

module.exports = { RbacService };
