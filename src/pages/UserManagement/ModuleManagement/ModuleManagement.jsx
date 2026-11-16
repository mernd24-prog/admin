import { axiosPrivate } from "../../../_helpers/axiosProvider";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdEdit, MdViewModule } from "react-icons/md";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
} from "../../../components/Shared";
import {
  getRbacModules,
  updateRbacModule,
  updateRbacModuleStatus,
  createRbacPermission,
  updateRbacPermission,
} from "../../../Redux/adminCoreSlice";
import { usePermission, ACTIONS } from "../../../_helpers/usePermission";
import OrangeButton from "../../../components/Atoms/buttons/OrangeButton";

const panels = {
  platform: "Admin",
  seller: "Seller",
  both: "Admin and Seller",
  none: "No sidebar",
};
const FILTERS = [
  {
    key: "panel",
    type: "select",
    label: "Available to",
    options: [
      { value: "platform", label: "Admin" },
      { value: "seller", label: "Seller" },
    ],
  },
  {
    key: "visibility",
    type: "select",
    label: "Sidebar",
    options: [
      { value: "visible", label: "Shown" },
      { value: "hidden", label: "Hidden" },
      { value: "none", label: "No sidebar entry" },
    ],
  },
];
const getRows = (data) => {
  const payload =
    data?.data?.data ||
    data?.data?.normalized?.data ||
    data?.normalized?.data ||
    data?.data ||
    {};
  return Array.isArray(payload) ? payload : payload.list || payload.items || [];
};
const entriesOf = (row) => row.navigationEntries || [];
const isShown = (entry) =>
  entry.configured !== false &&
  entry.active !== false &&
  entry.isVisibleInSidebar !== false;

export default function ModuleManagement() {
  const dispatch = useDispatch();
  const { can } = usePermission();
  const state = useSelector((state) => state.adminCore);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState([]);
  const [rolesError, setRolesError] = useState("");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [form, setForm] = useState({});
  const load = useCallback(
    () =>
      dispatch(
        getRbacModules({
          scope: "backend",
          includeNavigation: true,
          includeInactive: true,
          limit: 1000,
        }),
      ),
    [dispatch],
  );
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!editing) return;
    let active = true;
    setRolesError("");
    axiosPrivate
      .get("/rbac/roles", { params: { includeInactive: true, limit: 1000 } })
      .then((response) => {
        if (active)
          setRoles(
            (response.data?.data || []).filter(
              (role) => role.id && role.type === "system",
            ),
          );
      })
      .catch(() => {
        if (active)
          setRolesError(
            "Unable to load account roles. Existing restrictions will be preserved.",
          );
      });
    return () => {
      active = false;
    };
  }, [editing]);
  const rows = useMemo(
    () => getRows(state?.rbacModulesData),
    [state?.rbacModulesData],
  );
  const data = useMemo(
    () =>
      rows.filter((row) => {
        if (row.presentation?.linked === false) return false;
        if (filters.group && row.presentation?.group !== filters.group)
          return false;
        if (
          search.trim() &&
          !`${row.moduleName || row.name} ${row.description || ""}`
            .toLowerCase()
            .includes(search.trim().toLowerCase())
        )
          return false;
        if (
          filters.panel &&
          (row.presentation?.panel || row.panel) !== filters.panel &&
          (row.presentation?.panel || row.panel) !== "both"
        )
          return false;
        const entries = entriesOf(row);
        if (filters.visibility === "none" && entries.length) return false;
        if (filters.visibility === "visible" && !entries.some(isShown))
          return false;
        if (
          filters.visibility === "hidden" &&
          (!entries.length || entries.some(isShown))
        )
          return false;
        return true;
      }),
    [rows, search, filters],
  );
  const selectEntry = (entry) => {
    setSelectedEntry(entry);
    setForm({
      moduleName: entry.moduleName || entry.name || "",
      order: entry.order || 0,
      isVisibleInSidebar: entry.isVisibleInSidebar !== false,
      allowedRoles: entry.allowedRoles || entry.metadata?.allowedRoles || [],
    });
  };
  const edit = (row) => {
    setEditing(row);
    selectEntry(
      entriesOf(row).find((entry) => entry.id && entry.configured !== false),
    );
  };
  const close = () => {
    if (!saving) {
      setEditing(null);
      setSelectedEntry(null);
    }
  };
  const save = async (event) => {
    event.preventDefault();
    if (!selectedEntry?.id || !can("rbac", ACTIONS.UPDATE)) return;
    if (!form.moduleName.trim()) return toast.error("Menu label is required");
    if (!Number.isInteger(Number(form.order)) || Number(form.order) < 0)
      return toast.error("Position must be a whole number of zero or more");
    setSaving(true);
    try {
      await dispatch(
        updateRbacModule({
          id: selectedEntry.id,
          moduleName: form.moduleName.trim(),
          order: Number(form.order),
          isVisibleInSidebar: form.isVisibleInSidebar,
          allowedRoles: form.allowedRoles,
        }),
      ).unwrap();
      toast.success("Sidebar updated");
      setEditing(null);
      setSelectedEntry(null);
      load();
    } catch (error) {
      toast.error(error?.message || "Unable to update sidebar");
    } finally {
      setSaving(false);
    }
  };
  const columns = [
    {
      key: "featureGroup",
      label: "Feature",
      render: (_, row) => row.presentation?.group || "—",
    },
    {
      key: "moduleName",
      label: "Module",
      sortable: true,
      render: (name, row) => (
        <div>
          <p className="font-medium text-gray-800">{name || row.name}</p>
          <p className="text-xs text-gray-500 whitespace-normal">
            {row.description}
          </p>
        </div>
      ),
    },
    {
      key: "panel",
      label: "Available to",
      render: (value, row) => panels[row.presentation?.panel || value] || "—",
    },
    {
      key: "navigationEntries",
      label: "Linked pages / menus",
      render: (_, row) =>
        entriesOf(row).length ? (
          <div className="space-y-1">
            {entriesOf(row).map((entry) => (
              <p key={entry.id || entry.moduleSlug} className="text-sm">
                {entry.moduleName || entry.name}{" "}
                <span className="text-xs text-gray-500">
                  ({panels[entry.panel] || "Admin"} ·{" "}
                  {entry.configured === false
                    ? "Not configured"
                    : isShown(entry)
                      ? "Shown"
                      : "Hidden"}
                  )
                </span>
              </p>
            ))}
          </div>
        ) : row.presentation?.links?.length ? (
          <div className="space-y-1">
            {row.presentation.links.map((link) => (
              <p key={`${link.path}:${link.name}`} className="text-sm">
                {link.name}
                <span className="block text-xs text-gray-500">
                  Inside linked page
                </span>
              </p>
            ))}
          </div>
        ) : (
          <span className="text-gray-500">No sidebar entry</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (status, row) => (
        <StatusBadge
          status={
            row.configured === false
              ? "unconfigured"
              : status || (row.active === false ? "inactive" : "active")
          }
          dot
        />
      ),
    },
  ];
  return (
    <div className="space-y-4">
      <PageHeader
        title="Module Management"
        subtitle="Find application modules and manage their sidebar menus. Assign access from User Permissions."
        breadcrumbs={[
          { label: "User Management" },
          { label: "Module Management" },
        ]}
      />
      {state?.rbacModulesData?.error && (
        <div role="alert" className="text-red-600">
          Unable to load modules. <button onClick={load}>Retry</button>
        </div>
      )}
      <DataTable
        columns={columns}
        data={data}
        rowKey="moduleSlug"
        loading={!!state?.loading}
        totalCount={data.length}
        onSearch={setSearch}
        searchPlaceholder="Search modules..."
        emptyText="No modules found."
        emptyIcon={<MdViewModule size={40} />}
        rowActions={(row) =>
          can("rbac", ACTIONS.UPDATE) &&
          entriesOf(row).some((entry) => entry.id && entry.configured !== false)
            ? [
                {
                  label: "Edit Sidebar",
                  icon: <MdEdit size={16} />,
                  onClick: () => edit(row),
                },
              ]
            : []
        }
        filterBar={
          <FilterBar
            filters={[
              {
                key: "group",
                type: "select",
                label: "Feature",
                options: [
                  ...new Set(
                    rows
                      .filter((row) => row.presentation?.linked !== false)
                      .map((row) => row.presentation?.group)
                      .filter(Boolean),
                  ),
                ].map((group) => ({ value: group, label: group })),
              },
              ...FILTERS,
            ]}
            values={filters}
            onChange={(key, value) =>
              setFilters((previous) => ({ ...previous, [key]: value }))
            }
            onClear={() => setFilters({})}
            activeCount={Object.values(filters).filter(Boolean).length}
          />
        }
      />
      {editing && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={save}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sidebar-editor-title"
            className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl space-y-4"
          >
            <h2 id="sidebar-editor-title" className="text-lg font-semibold">
              {editing.moduleName || editing.name} — Sidebar
            </h2>
            <label className="block text-sm">
              Menu
              <select
                className="admin-input mt-1 w-full"
                value={selectedEntry?.id || ""}
                disabled={saving}
                onChange={(event) =>
                  selectEntry(
                    entriesOf(editing).find(
                      (entry) => entry.id === event.target.value,
                    ),
                  )
                }
              >
                {entriesOf(editing)
                  .filter((entry) => entry.id && entry.configured !== false)
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.moduleName || entry.name} (
                      {panels[entry.panel] || "Admin"})
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm">
              Menu label
              <input
                className="admin-input mt-1 w-full"
                value={form.moduleName}
                disabled={saving}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    moduleName: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="block text-sm">
              Position
              <input
                type="number"
                min="0"
                step="1"
                className="admin-input mt-1 w-full"
                value={form.order}
                disabled={saving}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    order: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isVisibleInSidebar}
                disabled={saving}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    isVisibleInSidebar: event.target.checked,
                  }))
                }
              />
              Show in sidebar
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                Visible for account roles
              </legend>
              <p className="text-xs text-gray-500">
                An empty selection allows any account role that has the required
                permission.
              </p>
              {rolesError && (
                <p role="alert" className="text-xs text-red-600">
                  {rolesError}
                </p>
              )}
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    disabled={saving}
                    checked={form.allowedRoles.includes(role.slug)}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        allowedRoles: event.target.checked
                          ? [...previous.allowedRoles, role.slug]
                          : previous.allowedRoles.filter(
                              (slug) => slug !== role.slug,
                            ),
                      }))
                    }
                  />
                  {role.name || role.slug}
                </label>
              ))}
              {form.allowedRoles.length > 0 && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    setForm((previous) => ({ ...previous, allowedRoles: [] }))
                  }
                >
                  Remove role restriction
                </button>
              )}
              {form.allowedRoles
                .filter((slug) => !roles.some((role) => role.slug === slug))
                .map((slug) => (
                  <p key={slug} className="text-xs">
                    Saved restriction: {slug}
                  </p>
                ))}
            </fieldset>
            <div className="rounded border p-3 text-sm space-y-2">
              <p>
                Required access:{" "}
                <strong>{editing.moduleName || editing.name} → View</strong>
              </p>
              <p className="text-xs">
                Permission key:{" "}
                <code>
                  {(editing.permissions || []).find(
                    (permission) =>
                      permission.action === "view" &&
                      permission.active !== false,
                  )?.slug || `${editing.moduleSlug || editing.slug}:view`}
                </code>
              </p>
              {!(editing.permissions || []).some(
                (permission) =>
                  permission.id &&
                  permission.action === "view" &&
                  permission.active !== false,
              ) && (
                <div className="space-y-2">
                  <p className="text-xs text-amber-700">
                    No active View permission is saved for this module. It
                    cannot be assigned until configured.
                  </p>
                  {editing.id && can("rbac", ACTIONS.CREATE) && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const response = await axiosPrivate.get(
                            `/rbac/modules/${editing.id}`,
                          );
                          const module = response.data?.data;
                          if (!module?.slug)
                            throw new Error(
                              "Unable to resolve the saved module",
                            );
                          const existingView = (module.permissions || []).find(
                            (permission) => permission.action === "view",
                          );
                          if (existingView?.id) {
                            if (!can("rbac", ACTIONS.UPDATE))
                              throw new Error(
                                "Permission update access is required",
                              );
                            await dispatch(
                              updateRbacPermission({
                                id: existingView.id,
                                active: true,
                              }),
                            ).unwrap();
                          } else {
                            await dispatch(
                              createRbacPermission({
                                moduleId: editing.id,
                                name: `View ${module.moduleName || module.name}`,
                                slug: `${module.slug}:view`,
                                action: "view",
                              }),
                            ).unwrap();
                          }
                          toast.success(
                            "View permission configured. Assign it through user permissions.",
                          );
                          setEditing(null);
                          load();
                        } catch (error) {
                          toast.error(
                            error?.message ||
                              "Unable to configure View permission",
                          );
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      Configure View Permission
                    </button>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-500">
                Assign this from Admin Users → Assign Permissions. Sidebar
                visibility does not grant module access.
              </p>
              <p className="text-xs">
                Menu status:{" "}
                {selectedEntry?.status ||
                  (selectedEntry?.active === false ? "inactive" : "active")}
              </p>
              {selectedEntry?.active === false &&
                can("rbac", ACTIONS.STATUS_CHANGE) && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true);
                      try {
                        await dispatch(
                          updateRbacModuleStatus({
                            id: selectedEntry.id,
                            status: "active",
                          }),
                        ).unwrap();
                        toast.success("Menu activated");
                        setEditing(null);
                        load();
                      } catch (error) {
                        toast.error(
                          error?.message || "Unable to activate menu",
                        );
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    Activate Menu
                  </button>
                )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={saving}
                className="px-4 py-2 rounded border"
              >
                Cancel
              </button>
              <OrangeButton type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Sidebar"}
              </OrangeButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
