const { v4: uuidv4 } = require("uuid");
const {
  Module,
  Permission,
  Role,
  RolePermission,
  UserPermission,
  UserRole,
  SuperAdmin,
} = require("../../../infrastructure/sequelize/models");
const { AppError } = require("../../../shared/errors/app-error");
const {
  sequelize,
} = require("../../../infrastructure/sequelize/sequelize-client");

class RbacRepository {
  // MODULES
  async createModule(moduleData) {
    const id = uuidv4();
    return Module.create({
      id,
      ...moduleData,
    });
  }

  async getModuleById(id) {
    return Module.findByPk(id, {
      include: [{ association: "permissions", separate: true }],
    });
  }

  async getModuleBySlug(slug) {
    return Module.findOne({
      where: { slug },
      include: [{ association: "permissions" }],
    });
  }

  async listModules(filters = {}) {
    const { active = true, limit = 100, offset = 0 } = filters;
    const where = active !== null ? { active } : {};

    const { count, rows } = await Module.findAndCountAll({
      where,
      include: [{ association: "permissions" }],
      limit,
      offset,
      order: [["order", "ASC"]],
    });

    return { items: rows, total: count };
  }

  async listPermissionManagementModules(filters = {}) {
    const { roleId, roleSlug, active = true } = filters;
    const moduleWhere = active !== null ? { active } : {};
    const permissionWhere = active !== null ? { active } : {};
    let role = null;
    let assignedPermissionIds = new Set();

    if (roleId || roleSlug) {
      role = await Role.findOne({
        where: roleId ? { id: roleId } : { slug: roleSlug },
        include: [
          {
            association: "rolePermissions",
            include: [{ association: "permission" }],
          },
        ],
      });

      if (!role) {
        throw new AppError("Role not found", 404);
      }

      assignedPermissionIds = new Set(
        (role.rolePermissions || [])
          .map(
            (rolePermission) =>
              rolePermission.permissionId || rolePermission.permission?.id,
          )
          .filter(Boolean),
      );
    }

    const modules = await Module.findAll({
      where: moduleWhere,
      include: [
        {
          association: "permissions",
          where: permissionWhere,
          required: false,
        },
      ],
      order: [["order", "ASC"]],
    });

    const items = modules.map((module) => {
      const plainModule = module.toJSON();
      const permissions = (plainModule.permissions || [])
        .sort((left, right) => {
          const actionCompare = String(left.action || "").localeCompare(
            String(right.action || ""),
          );
          return (
            actionCompare ||
            String(left.name || "").localeCompare(String(right.name || ""))
          );
        })
        .map((permission) => ({
          id: permission.id,
          moduleId: permission.moduleId,
          name: permission.name,
          slug: permission.slug,
          description: permission.description,
          action: permission.action,
          active: permission.active,
          assigned: assignedPermissionIds.has(permission.id),
        }));

      return {
        id: plainModule.id,
        name: plainModule.name,
        slug: plainModule.slug,
        description: plainModule.description,
        icon: plainModule.icon,
        order: plainModule.order,
        active: plainModule.active,
        permissions,
        assignedPermissionCount: permissions.filter(
          (permission) => permission.assigned,
        ).length,
      };
    });

    return {
      role: role
        ? {
            id: role.id,
            name: role.name,
            slug: role.slug,
            description: role.description,
            type: role.type,
            isSuperAdmin: role.isSuperAdmin,
            active: role.active,
          }
        : null,
      items,
      total: items.length,
      assignedPermissionIds: Array.from(assignedPermissionIds),
    };
  }

  async updateModule(id, updates) {
    const module = await Module.findByPk(id);
    if (!module) {
      throw new AppError("Module not found", 404);
    }
    return module.update(updates);
  }

  async deleteModule(id) {
    const module = await Module.findByPk(id);
    if (!module) {
      throw new AppError("Module not found", 404);
    }
    return module.destroy();
  }

  // PERMISSIONS
  async createPermission(permissionData) {
    const id = uuidv4();
    return Permission.create({
      id,
      ...permissionData,
    });
  }

  async getPermissionById(id) {
    return Permission.findByPk(id, {
      include: [{ association: "module" }],
    });
  }

  async getPermissionBySlug(slug) {
    return Permission.findOne({
      where: { slug },
      include: [{ association: "module" }],
    });
  }

  async listPermissions(filters = {}) {
    const { moduleId, active = true, limit = 100, offset = 0 } = filters;
    const where = {};

    if (moduleId) where.moduleId = moduleId;
    if (active !== null) where.active = active;

    const { count, rows } = await Permission.findAndCountAll({
      where,
      include: [{ association: "module" }],
      limit,
      offset,
    });

    return { items: rows, total: count };
  }

  async updatePermission(id, updates) {
    const permission = await Permission.findByPk(id);
    if (!permission) {
      throw new AppError("Permission not found", 404);
    }
    return permission.update(updates);
  }

  // ROLES
  async createRole(roleData) {
    const id = uuidv4();
    return Role.create({
      id,
      ...roleData,
    });
  }

  async getRoleById(id) {
    return Role.findByPk(id, {
      include: [
        {
          association: "rolePermissions",
          include: [{ association: "permission" }],
          separate: true,
        },
      ],
    });
  }

  async getRoleBySlug(slug) {
    return Role.findOne({
      where: { slug },
      include: [
        {
          association: "rolePermissions",
          include: [{ association: "permission" }],
          separate: true,
        },
      ],
    });
  }

  async listRoles(filters = {}) {
    const { active = true, limit = 100, offset = 0 } = filters;
    const where = active !== null ? { active } : {};

    const { count, rows } = await Role.findAndCountAll({
      where,
      include: [
        {
          association: "rolePermissions",
          include: [{ association: "permission" }],
        },
      ],
      limit,
      offset,
    });

    return { items: rows, total: count };
  }

  async updateRole(id, updates) {
    const role = await Role.findByPk(id);
    if (!role) {
      throw new AppError("Role not found", 404);
    }
    return role.update(updates);
  }

  // ROLE PERMISSIONS
  async assignPermissionToRole(roleId, permissionId) {
    const role = await Role.findByPk(roleId);
    if (!role) throw new AppError("Role not found", 404);

    const permission = await Permission.findByPk(permissionId);
    if (!permission) throw new AppError("Permission not found", 404);

    const existing = await RolePermission.findOne({
      where: { roleId, permissionId },
    });

    if (existing) {
      throw new AppError("Permission already assigned to role", 409);
    }

    return RolePermission.create({
      id: uuidv4(),
      roleId,
      permissionId,
    });
  }

  async removePermissionFromRole(roleId, permissionId) {
    const result = await RolePermission.destroy({
      where: { roleId, permissionId },
    });

    if (result === 0) {
      throw new AppError("Role-Permission association not found", 404);
    }

    return { deleted: true };
  }

  async getRolePermissions(roleId) {
    const role = await Role.findByPk(roleId);
    if (!role) throw new AppError("Role not found", 404);

    return RolePermission.findAll({
      where: { roleId },
      include: [
        { association: "permission", include: [{ association: "module" }] },
      ],
    });
  }

  // USER PERMISSIONS
  async assignPermissionToUser(userId, permissionId, grantedBy) {
    const permission = await Permission.findByPk(permissionId);
    if (!permission) throw new AppError("Permission not found", 404);

    const existing = await UserPermission.findOne({
      where: { userId, permissionId, revokedAt: null },
    });

    if (existing) {
      throw new AppError("Permission already assigned to user", 409);
    }

    return UserPermission.create({
      id: uuidv4(),
      userId,
      permissionId,
      grantedBy,
      grantedAt: new Date(),
    });
  }

  async removePermissionFromUser(userId, permissionId) {
    const userPermission = await UserPermission.findOne({
      where: { userId, permissionId, revokedAt: null },
    });

    if (!userPermission) {
      throw new AppError("User-Permission association not found", 404);
    }

    return userPermission.update({ revokedAt: new Date() });
  }

  async getUserPermissions(userId) {
    return UserPermission.findAll({
      where: { userId, revokedAt: null },
      include: [
        { association: "permission", include: [{ association: "module" }] },
      ],
    });
  }

  // USER ROLES
  async assignRoleToUser(userId, roleId, assignedBy) {
    const role = await Role.findByPk(roleId);
    if (!role) throw new AppError("Role not found", 404);

    const existing = await UserRole.findOne({
      where: { userId, roleId, revokedAt: null },
    });

    if (existing) {
      throw new AppError("Role already assigned to user", 409);
    }

    return UserRole.create({
      id: uuidv4(),
      userId,
      roleId,
      assignedBy,
      assignedAt: new Date(),
    });
  }

  async removeRoleFromUser(userId, roleId) {
    const userRole = await UserRole.findOne({
      where: { userId, roleId, revokedAt: null },
    });

    if (!userRole) {
      throw new AppError("User-Role association not found", 404);
    }

    return userRole.update({ revokedAt: new Date() });
  }

  async getUserRoles(userId) {
    return UserRole.findAll({
      where: { userId, revokedAt: null },
      include: [
        {
          association: "role",
          include: [
            {
              association: "rolePermissions",
              include: [{ association: "permission" }],
            },
          ],
        },
      ],
    });
  }

  async getUserEffectivePermissions(userId) {
    const query = `
      SELECT DISTINCT p.* FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      LEFT JOIN user_roles ur ON rp.role_id = ur.role_id
      LEFT JOIN user_permissions up ON p.id = up.permission_id
      WHERE (
        (ur.user_id = :userId AND ur.revoked_at IS NULL)
        OR (up.user_id = :userId AND up.revoked_at IS NULL)
      )
      AND p.active = true
      ORDER BY p.id
    `;

    return sequelize.query(query, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT,
      raw: true,
    });
  }

  // SUPER ADMIN
  async createSuperAdmin(superAdminData) {
    const id = uuidv4();
    return SuperAdmin.create({
      id,
      ...superAdminData,
    });
  }

  async getSuperAdminByUserId(userId) {
    return SuperAdmin.findOne({
      where: { userId },
    });
  }

  async getSuperAdminByEmail(email) {
    return SuperAdmin.findOne({
      where: { email },
    });
  }

  async listSuperAdmins(filters = {}) {
    const { isActive = true, limit = 100, offset = 0 } = filters;
    const where = isActive !== null ? { isActive } : {};

    const { count, rows } = await SuperAdmin.findAndCountAll({
      where,
      limit,
      offset,
    });

    return { items: rows, total: count };
  }

  async updateSuperAdmin(userId, updates) {
    const superAdmin = await SuperAdmin.findOne({
      where: { userId },
    });

    if (!superAdmin) {
      throw new AppError("Super admin not found", 404);
    }

    return superAdmin.update(updates);
  }

  async superAdminExists() {
    const count = await SuperAdmin.count();
    return count > 0;
  }
}

module.exports = { RbacRepository };
