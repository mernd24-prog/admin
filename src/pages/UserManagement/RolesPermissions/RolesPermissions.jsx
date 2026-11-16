import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MdSecurity,
  MdAdd,
  MdEdit,
  MdCheck,
  MdExpandMore,
  MdExpandLess,
  MdLock,
  MdRefresh,
} from "react-icons/md";
import { PageHeader } from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { usePermission, ACTIONS } from "../../../_helpers/usePermission";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { toast } from "sonner";

/* ─── Constants ──────────────────────────────────────────────────────────── */

const ACTION_ALIASES = {
  add: "create",
  edit: "update",
  status: "status_change",
  approval: "approve",
  action: "status_change",
  review: "approve",
  manage: "status_change",
};
const ACTION_LABELS = {
  status_change: "Status",
  create: "Add",
  update: "Edit",
  delete: "Delete",
  approve: "Approve",
  reject: "Reject",
  export: "Export",
  import: "Import",
  assign: "Assign",
  view: "View",
};

const normalizeAction = (a = "") => {
  const v = String(a).trim().toLowerCase();
  return ACTION_ALIASES[v] || v;
};

/* ─── Permission Matrix ──────────────────────────────────────────────────── */
const PermissionMatrix = ({
  modules = [],
  matrixState = {},
  permissionMap = {},
  actionOrder = [],
  onChange,
  readOnly = false,
}) => {
  const [expanded, setExpanded] = useState(true);

  const visibleActions = useMemo(() => {
    const used = new Set();
    modules.forEach((mod) => {
      (mod.permissions || []).forEach((p) => {
        const n = normalizeAction(p.action);
        if (p.id && p.active !== false && n) used.add(n);
      });
    });
    return [
      ...actionOrder.filter((action) => used.has(action)),
      ...[...used].filter((action) => !actionOrder.includes(action)),
    ];
  }, [modules, actionOrder]);

  const showBulkActions =
    !readOnly &&
    modules.some((module) =>
      (module.permissions || []).some(
        (permission) =>
          permission.id &&
          permission.active !== false &&
          permission.assignable !== false,
      ),
    );

  const toggleAll = (modSlug, checked) => {
    visibleActions.forEach((action) => {
      const perm = permissionMap[modSlug]?.[action];
      if (perm && perm.assignable !== false)
        onChange?.(perm.id, checked, modSlug, action);
    });
  };

  const allChecked = (modSlug) => {
    const assignable = Object.values(permissionMap[modSlug] || {}).filter(
      (permission) =>
        permission.id &&
        permission.active !== false &&
        permission.assignable !== false,
    );
    return (
      assignable.length > 0 &&
      assignable.every((permission) => matrixState[permission.id] === true)
    );
  };

  if (!modules.length) {
    return (
      <div className="bg-white rounded-xl border border-[var(--admin-line)] shadow-sm p-10 text-center">
        <MdSecurity
          size={40}
          className="mx-auto mb-3 text-[var(--admin-line)]"
        />
        <p className="text-sm text-gray-400 font-medium">
          No permission modules are available for this role.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--admin-line)] shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3 border-b border-[var(--admin-line)] hover:bg-[var(--admin-surface-soft)] transition-colors"
        onClick={() => setExpanded((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">
            Permission Matrix
          </span>
          <span className="text-xs text-gray-400">
            ({modules.length} modules, {visibleActions.length} actions)
          </span>
        </div>
        {expanded ? (
          <MdExpandLess size={18} className="text-gray-400" />
        ) : (
          <MdExpandMore size={18} className="text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--admin-surface-soft)] border-b border-[var(--admin-line)]">
                <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide w-44 sticky left-0 bg-[var(--admin-surface-soft)]">
                  Module
                </th>
                {visibleActions.map((a) => (
                  <th
                    key={a}
                    className="px-3 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {ACTION_LABELS[a] || a.replace("_", " ")}
                  </th>
                ))}
                {showBulkActions && (
                  <th className="px-3 py-2.5 text-center text-gray-400 font-semibold uppercase tracking-wide w-12">
                    All
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f7efde]">
              {modules.map((mod) => (
                <tr
                  key={mod.id || mod.slug}
                  className="hover:bg-[var(--admin-surface-soft)]/60 transition-colors"
                >
                  <td className="px-4 py-2.5 sticky left-0 bg-white">
                    <span className="font-medium text-gray-700 text-xs">
                      {mod.moduleName || mod.name}
                      {mod.configured === false && (
                        <span className="block text-gray-400">
                          Unconfigured · no assignable permissions
                        </span>
                      )}
                    </span>
                    <span className="block text-[10px] text-gray-400 font-mono">
                      {mod.presentation?.group || mod.moduleKey || mod.slug}
                    </span>
                  </td>
                  {visibleActions.map((action) => {
                    const perm =
                      permissionMap[mod.slug || mod.moduleKey]?.[action];
                    const isChecked = perm
                      ? (matrixState[perm.id] ?? perm.assigned ?? false)
                      : false;
                    return (
                      <td key={action} className="px-3 py-2.5 text-center">
                        {perm ? (
                          <input
                            type="checkbox"
                            aria-label={`${mod.moduleName || mod.name || mod.slug} ${ACTION_LABELS[action] || action}`}
                            checked={isChecked}
                            disabled={readOnly || perm.assignable === false}
                            onChange={(e) =>
                              onChange?.(
                                perm.id,
                                e.target.checked,
                                mod.slug || mod.moduleKey,
                                action,
                              )
                            }
                            className="w-4 h-4 accent-[var(--admin-blue)] cursor-pointer disabled:cursor-default rounded"
                          />
                        ) : (
                          <span className="text-gray-200">—</span>
                        )}
                      </td>
                    );
                  })}
                  {showBulkActions && (
                    <td className="px-3 py-2.5 text-center">
                      {mod.configured !== false &&
                      (mod.permissions || []).some(
                        (permission) =>
                          permission.id &&
                          permission.active !== false &&
                          permission.assignable !== false,
                      ) ? (
                        <input
                          type="checkbox"
                          checked={allChecked(mod.slug || mod.moduleKey)}
                          disabled={
                            mod.configured === false ||
                            !(mod.permissions || []).some(
                              (permission) => permission.assignable !== false,
                            )
                          }
                          onChange={(e) =>
                            toggleAll(
                              mod.slug || mod.moduleKey,
                              e.target.checked,
                            )
                          }
                          className="w-4 h-4 accent-[var(--admin-gold)] cursor-pointer rounded"
                          aria-label={`${mod.moduleName || mod.name || mod.slug} all assignable actions`}
                          title="Toggle all assignable actions"
                        />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ─── Create / Edit Role Modal ───────────────────────────────────────────── */
const RoleModal = ({ role, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: role?.name || "",
    slug: role?.slug || "",
    description: role?.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const autoSlug = (name) =>
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.slug.trim()) e.slug = "Slug is required";
    else if (!/^[a-z0-9-]+$/.test(form.slug))
      e.slug = "Lowercase letters, numbers and hyphens only";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      if (role?.id) {
        await axiosProvider.patch(`/rbac/roles/${role.id}`, form);
        toast.success("Role updated");
      } else {
        await axiosProvider.post("/rbac/roles", form);
        toast.success("Role created");
      }
      await onSave?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  const isStandard = Boolean(role?.id && role.type !== "custom");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-[var(--admin-line)]">
        <div className="px-6 py-4 border-b border-[var(--admin-line)] bg-[var(--admin-surface-soft)] rounded-t-2xl">
          <h3 className="text-sm font-semibold text-gray-800">
            {role?.id ? "Edit Role" : "Create Custom Role"}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {role?.id
              ? "Update role name and description"
              : "A custom role lets you group a reusable set of permissions"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Role Name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => {
                const n = e.target.value;
                setForm((p) => ({
                  ...p,
                  name: n,
                  ...(!role?.id ? { slug: autoSlug(n) } : {}),
                }));
                setErrors((p) => ({ ...p, name: undefined }));
              }}
              className={`w-full border ${errors.name ? "border-red-300" : "border-[var(--admin-line)]"} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/30`}
              placeholder="e.g. Content Manager"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              value={form.slug}
              onChange={(e) => {
                setForm((p) => ({ ...p, slug: e.target.value }));
                setErrors((p) => ({ ...p, slug: undefined }));
              }}
              disabled={isStandard}
              className={`w-full border ${errors.slug ? "border-red-300" : "border-[var(--admin-line)]"} rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/30 disabled:bg-[var(--admin-surface-soft)] disabled:text-gray-400`}
              placeholder="content-manager"
            />
            {errors.slug && (
              <p className="text-red-500 text-xs mt-1">{errors.slug}</p>
            )}
            {isStandard && (
              <p className="text-[10px] text-amber-500 mt-1">
                System role slug — cannot be changed
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              rows={2}
              className="w-full border border-[var(--admin-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/30 resize-none"
              placeholder="What this role is for"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--admin-line)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-[var(--admin-blue)] rounded-lg hover:bg-[#2d3070] disabled:opacity-50"
            >
              {saving ? "Saving…" : role?.id ? "Update Role" : "Create Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Save Confirm ───────────────────────────────────────────────────────── */
const SaveConfirmModal = ({ onConfirm, onCancel, changedCount, saving }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-[var(--admin-line)]">
      <div className="px-6 py-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[var(--admin-blue)]/10 flex items-center justify-center shrink-0">
            <MdLock size={20} className="text-[var(--admin-blue)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Save Role Permissions
            </h3>
            <p className="text-xs text-gray-400">
              This affects every user assigned to this role
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {changedCount > 0
            ? `${changedCount} permission${changedCount !== 1 ? "s" : ""} changed. All users with this role will have their sessions refreshed.`
            : "Save the current permission matrix for this role?"}
        </p>
      </div>
      <div className="px-6 pb-5 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
        >
          Cancel
        </button>
        <button
          disabled={saving}
          onClick={onConfirm}
          className="px-5 py-2 text-sm font-medium text-white bg-[var(--admin-blue)] rounded-lg hover:bg-[#2d3070]"
        >
          Save
        </button>
      </div>
    </div>
  </div>
);

/* ─── Main Component ─────────────────────────────────────────────────────── */
const RolesPermissions = () => {
  const { isSuperAdmin, can } = usePermission();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [matrixState, setMatrixState] = useState({});
  const [originalState, setOriginalState] = useState({});
  const [permissionMap, setPermissionMap] = useState({});
  const [matrixModules, setMatrixModules] = useState([]);
  const [matrixActions, setMatrixActions] = useState([]);
  const [permLoading, setPermLoading] = useState(false);
  const [matrixCanManageRole, setMatrixCanManageRole] = useState(false);
  const [rolesError, setRolesError] = useState("");
  const [permissionsError, setPermissionsError] = useState("");
  const selectionRequest = useRef(0);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setRolesError("");
    try {
      const res = await axiosProvider.get("/rbac/roles", {
        params: { includeInactive: true, limit: 1000 },
      });
      const saved = Array.isArray(res.data?.data)
        ? res.data.data.filter((role) => role.id)
        : [];
      setRoles(saved);
      return saved;
    } catch {
      setRolesError("Unable to load roles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const selectRole = async (role, reload = false) => {
    if (!role.id || (saving && !reload)) return;
    const request = ++selectionRequest.current;
    setShowSaveConfirm(false);
    setPermissionsError("");
    setMatrixCanManageRole(false);
    setMatrixModules([]);
    setMatrixState({});
    setOriginalState({});
    setPermissionMap({});
    setSelected(role);
    setPermLoading(true);
    try {
      const res = await axiosProvider.get(
        "/rbac/permission-management/modules",
        {
          params: { roleId: role.id },
        },
      );
      if (request !== selectionRequest.current) return;
      setMatrixCanManageRole(res.data?.data?.canManageRole === true);
      const mods = res.data?.data?.modules || [];
      setMatrixActions(
        Array.isArray(res.data?.data?.actions) ? res.data.data.actions : [],
      );
      const map = {};
      const state = {};

      mods.forEach((mod) => {
        const key = mod.slug || mod.moduleKey;
        map[key] = {};
        const canonical = {};
        const assignedBy = {};
        (mod.permissions || []).forEach((p) => {
          const action = normalizeAction(p.action);
          if (!p.id || p.active === false || !action) return;
          assignedBy[action] = assignedBy[action] || Boolean(p.assigned);
          if (!canonical[action] || p.action === action)
            canonical[action] = { ...p, action };
        });
        Object.entries(canonical).forEach(([action, p]) => {
          const assigned = Boolean(p.assigned) || Boolean(assignedBy[action]);
          map[key][action] = { ...p, assigned };
          state[p.id] = assigned;
        });
      });

      setMatrixModules(mods.filter(module => module.presentation?.linked !== false));
      setMatrixState(state);
      setOriginalState(state);
      setPermissionMap(map);
    } catch {
      if (request !== selectionRequest.current) return;
      setPermissionsError("Unable to load this role's permissions.");
      setMatrixModules([]);
      setMatrixState({});
      setOriginalState({});
      setPermissionMap({});
    } finally {
      if (request === selectionRequest.current) setPermLoading(false);
    }
  };

  const handlePermChange = (permissionId, checked, moduleSlug, action) => {
    if (
      !canEdit ||
      saving ||
      permLoading ||
      permissionMap[moduleSlug]?.[action]?.assignable === false
    )
      return;
    setMatrixState((prev) => {
      const next = { ...prev, [permissionId]: checked };
      const modulePerm = permissionMap[moduleSlug] || {};
      if (checked && action !== "view" && modulePerm.view?.id)
        next[modulePerm.view.id] = true;
      if (!checked && action === "view")
        Object.values(modulePerm).forEach((p) => {
          if (p?.id) next[p.id] = false;
        });
      return next;
    });
  };

  const changedCount = useMemo(
    () =>
      Object.keys(matrixState).filter(
        (id) => matrixState[id] !== originalState[id],
      ).length,
    [matrixState, originalState],
  );

  const savePermissions = async () => {
    if (
      !selected?.id ||
      !canEdit ||
      saving ||
      permLoading ||
      changedCount === 0
    )
      return;
    setSaving(true);
    setShowSaveConfirm(false);
    try {
      const permissionIds = Object.entries(matrixState)
        .filter(([, v]) => v)
        .map(([id]) => id);
      await axiosProvider.put(`/rbac/roles/${selected.id}/permissions`, {
        permissionIds,
      });
      toast.success("Permissions saved — affected user sessions will refresh");
      await selectRole(selected, true);
    } catch (err) {
      toast.error(
        err?.response?.data?.error?.message || "Failed to save permissions",
      );
    } finally {
      setSaving(false);
    }
  };

  const canEdit = Boolean(
    selected?.id &&
    !selected.isSuperAdmin &&
    !permissionsError &&
    matrixCanManageRole &&
    can("rbac", ACTIONS.ASSIGN) &&
    matrixModules.some((module) =>
      (module.permissions || []).some(
        (permission) =>
          permission.id &&
          permission.active !== false &&
          permission.assignable !== false,
      ),
    ),
  );
  const isSelectedRole = (role) => selected?.id === role.id;

  const assignedCount = useMemo(
    () => Object.values(matrixState).filter(Boolean).length,
    [matrixState],
  );

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Manage saved roles and their default permissions"
        breadcrumbs={[
          { label: "Users & Access" },
          { label: "Roles & Permissions" },
        ]}
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadRoles}
              disabled={loading || saving}
            >
              <MdRefresh /> Refresh roles
            </button>
            <PermissionGuard module="rbac" action={ACTIONS.CREATE}>
              <button type="button" onClick={() => setModal("create")}>
                <MdAdd /> Create role
              </button>
            </PermissionGuard>
          </div>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-[var(--admin-line)] overflow-hidden">
          <h3 className="px-4 py-3 font-semibold border-b">
            Roles ({roles.length})
          </h3>
          {loading ? (
            <p className="p-4 text-sm text-gray-500">Loading roles…</p>
          ) : rolesError ? (
            <p className="p-4 text-sm text-red-600" role="alert">
              {rolesError}
            </p>
          ) : !roles.length ? (
            <p className="p-4 text-sm text-gray-500">No saved roles found.</p>
          ) : (
            <ul className="divide-y">
              {roles.map((role) => (
                <li
                  key={role.id}
                  className={`flex items-center px-3 py-2 ${isSelectedRole(role) ? "bg-[var(--admin-blue-soft)]" : ""}`}
                >
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => selectRole(role)}
                    aria-pressed={Boolean(isSelectedRole(role))}
                    className="flex-1 text-left min-w-0 py-1"
                  >
                    <span className="block text-sm font-medium">
                      {role.name || role.slug}
                    </span>
                    <span className="text-xs text-gray-500">
                      {role.type}
                      {role.active === false ? " · Inactive" : ""}
                    </span>
                  </button>
                  {isSelectedRole(role) && <MdCheck aria-hidden="true" />}
                  {can("rbac", ACTIONS.UPDATE) &&
                    (isSuperAdmin || role.type === "custom") &&
                    !role.isSuperAdmin && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setModal(role)}
                        title={`Edit ${role.name || role.slug}`}
                        className="p-2"
                      >
                        <MdEdit />
                      </button>
                    )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="lg:col-span-3 space-y-4">
          {!selected ? (
            <p className="admin-card p-6 text-sm text-gray-500">
              Select a saved role to view its permissions.
            </p>
          ) : (
            <>
              <div className="admin-card p-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    {selected.name || selected.slug}
                  </h3>
                  {selected.description && (
                    <p className="text-sm text-gray-500">
                      {selected.description}
                    </p>
                  )}
                  {!permLoading &&
                    !permissionsError &&
                    !selected.isSuperAdmin && (
                      <p className="text-xs text-gray-500 mt-1">
                        {assignedCount} permissions assigned to this role
                      </p>
                    )}
                </div>
                {canEdit && !permLoading && (
                  <div className="flex gap-2">
                    {changedCount > 0 && (
                      <span className="text-xs self-center">
                        {changedCount} unsaved changes
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={saving || !changedCount}
                      onClick={() => selectRole(selected)}
                      className="admin-btn-secondary"
                    >
                      Discard changes
                    </button>
                    <button
                      type="button"
                      disabled={saving || !changedCount}
                      onClick={() => setShowSaveConfirm(true)}
                      className="admin-btn-primary"
                    >
                      {saving ? "Saving…" : "Save permissions"}
                    </button>
                  </div>
                )}
              </div>
              {permLoading ? (
                <p className="admin-card p-5 text-sm">Loading permissions…</p>
              ) : permissionsError ? (
                <div className="admin-card p-5">
                  <p role="alert" className="text-red-600">
                    {permissionsError}
                  </p>
                  <button
                    type="button"
                    onClick={() => selectRole(selected)}
                    className="admin-btn-secondary mt-3"
                  >
                    Retry permissions
                  </button>
                </div>
              ) : selected.isSuperAdmin ? (
                <p className="admin-card p-5 text-sm">
                  This role has the system super-admin bypass. Its permissions
                  cannot be edited here.
                </p>
              ) : (
                <PermissionMatrix
                  modules={matrixModules}
                  matrixState={matrixState}
                  permissionMap={permissionMap}
                  actionOrder={matrixActions}
                  onChange={handlePermChange}
                  readOnly={!canEdit || saving}
                />
              )}
            </>
          )}
        </div>
      </div>
      {modal && (
        <RoleModal
          role={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSave={async () => {
            const saved = await loadRoles();
            const updated =
              modal?.id === selected?.id
                ? saved?.find((role) => role.id === selected?.id)
                : null;
            if (updated) await selectRole(updated);
          }}
        />
      )}
      {showSaveConfirm && canEdit && (
        <SaveConfirmModal
          changedCount={changedCount}
          onCancel={() => setShowSaveConfirm(false)}
          onConfirm={savePermissions}
          saving={saving}
        />
      )}
    </div>
  );
};

export default RolesPermissions;
