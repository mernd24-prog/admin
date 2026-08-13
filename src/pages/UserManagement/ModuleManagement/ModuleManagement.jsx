import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdCheckCircle,
  MdBlock,
  MdViewModule,
  MdSort,
  MdClose,
} from "react-icons/md";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
} from "../../../components/Shared";
import {
  createRbacModule,
  deleteRbacModule,
  getRbacModules,
  reorderRbacModules,
  updateRbacModule,
  updateRbacModuleStatus,
} from "../../../Redux/adminCoreSlice";
import useDropdownOptions from "../../../hooks/useDropdownOptions";
import OrangeButton from "../../../components/Atoms/buttons/OrangeButton";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";

const emptyForm = {
  moduleName: "",
  moduleKey: "",
  moduleSlug: "",
  description: "",
  icon: "",
  routePath: "",
  parentModuleId: "",
  moduleType: "page",
  order: 0,
  status: "active",
  isVisibleInSidebar: true,
  permissionsText: "view",
};

const FILTER_FIELDS = [
  {
    key: "status",
    type: "select",
    label: "Status",
    width: "w-36",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
];

const getPayload = (sliceData = {}) => {
  const payload =
    sliceData?.data?.data ||
    sliceData?.data?.normalized?.data ||
    sliceData?.normalized?.data ||
    sliceData?.data ||
    {};
  return Array.isArray(payload)
    ? { list: payload, total: payload.length }
    : payload;
};

const idOf = (item = {}) => item.id || item._id || "";
const slugify = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function ModuleManagement() {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.adminCore);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const recordStatuses = useDropdownOptions("record-statuses");
  const moduleTypes = useDropdownOptions("module-types");

  const payload = useMemo(
    () => getPayload(selector?.rbacModulesData),
    [selector?.rbacModulesData],
  );
  const rawModules = useMemo(
    () => payload.list || payload.items || [],
    [payload],
  );
  const loading =
    !!selector?.loading ||
    (!selector?.rbacModulesData?.data && !selector?.rbacModulesData?.error);

  const modules = useMemo(() => {
    let result = rawModules;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (m) =>
          (m.moduleName || m.name || "").toLowerCase().includes(q) ||
          (m.moduleKey || m.slug || "").toLowerCase().includes(q) ||
          (m.routePath || "").toLowerCase().includes(q),
      );
    }
    if (filters.status) {
      result = result.filter((m) => (m.status || "active") === filters.status);
    }
    return result;
  }, [rawModules, search, filters]);

  const parentOptions = useMemo(
    () =>
      rawModules
        .filter((item) =>
          ["group", "module"].includes(item.moduleType || "module"),
        )
        .map((item) => ({
          value: idOf(item),
          label: item.moduleName || item.name,
        })),
    [rawModules],
  );

  const load = useCallback(() => {
    dispatch(
      getRbacModules({
        limit: 1000,
        includeInactive: true,
      }),
    );
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const getPermissionsText = (row) => {
    const mp = row.modulePermissions;
    if (Array.isArray(mp) && mp.every((p) => typeof p === "string"))
      return mp.join(", ");
    const perms = row.permissions;
    if (Array.isArray(perms) && perms.length) {
      const actions = perms
        .map((p) => (typeof p === "string" ? p : p.action))
        .filter(Boolean);
      if (actions.length) return actions.join(", ");
    }
    return "view";
  };

  const openEdit = useCallback((row) => {
    setEditing(row);
    setForm({
      moduleName: row.moduleName || row.name || "",
      moduleKey: row.moduleKey || row.slug || "",
      moduleSlug: row.moduleSlug || row.slug || "",
      description: row.description || "",
      icon: row.icon || "",
      routePath: row.routePath || "",
      parentModuleId: row.parentModuleId || (row.parentModule?.id ?? ""),
      moduleType: row.moduleType || "page",
      order: row.order || 0,
      status: row.status || (row.active === false ? "inactive" : "active"),
      isVisibleInSidebar: row.isVisibleInSidebar !== false,
      permissionsText: getPermissionsText(row),
    });
    setModalOpen(true);
  }, []);

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const updateName = (value) => {
    const key = slugify(value);
    setForm((prev) => ({
      ...prev,
      moduleName: value,
      moduleKey: prev.moduleKey || key,
      moduleSlug: prev.moduleSlug || key,
    }));
  };

  const toBody = () => ({
    moduleName: form.moduleName.trim(),
    moduleKey: slugify(form.moduleKey || form.moduleName),
    moduleSlug: slugify(form.moduleSlug || form.moduleKey || form.moduleName),
    description: form.description,
    icon: form.icon,
    routePath: form.routePath,
    parentModuleId: form.parentModuleId || null,
    moduleType: form.moduleType,
    order: Number(form.order || 0),
    status: form.status,
    isVisibleInSidebar: Boolean(form.isVisibleInSidebar),
    modulePermissions: String(form.permissionsText || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  });

  const handleSave = async () => {
    if (!form.moduleName.trim()) return toast.error("Module name is required");
    const key = slugify(form.moduleKey || form.moduleName);
    if (!key) return toast.error("Module key is required");
    if (
      form.isVisibleInSidebar &&
      form.moduleType !== "group" &&
      !form.routePath.trim()
    ) {
      return toast.error(
        "Route path is required for sidebar-visible modules (or set type to 'group')",
      );
    }
    setSaving(true);
    try {
      if (editing) {
        await dispatch(
          updateRbacModule({ id: idOf(editing), ...toBody() }),
        ).unwrap();
        toast.success("Module updated");
      } else {
        await dispatch(createRbacModule(toBody())).unwrap();
        toast.success("Module created");
      }
      closeModal();
      load();
    } catch (error) {
      toast.error(error?.message || error || "Failed to save module");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback(
    async (row) => {
      if (!window.confirm(`Delete ${row.moduleName || row.name}?`)) return;
      try {
        await dispatch(deleteRbacModule({ id: idOf(row) })).unwrap();
        toast.success("Module deleted");
        load();
      } catch (error) {
        toast.error(error?.message || error || "Failed to delete module");
      }
    },
    [dispatch, load],
  );

  const toggleStatus = useCallback(
    async (row) => {
      const next =
        (row.status || "active") === "active" ? "inactive" : "active";
      try {
        await dispatch(
          updateRbacModuleStatus({ id: idOf(row), status: next }),
        ).unwrap();
        toast.success("Status updated");
        load();
      } catch (error) {
        toast.error(error?.message || error || "Failed to update status");
      }
    },
    [dispatch, load],
  );

  const normalizeOrders = async () => {
    try {
      await dispatch(
        reorderRbacModules({
          modules: rawModules.map((item, index) => ({
            id: idOf(item),
            order: (index + 1) * 10,
          })),
        }),
      ).unwrap();
      toast.success("Module order normalized");
      load();
    } catch (error) {
      toast.error(error?.message || error || "Failed to reorder modules");
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "moduleName",
        label: "Module",
        sortable: true,
        render: (value, row) => (
          <div>
            <p className="font-medium text-gray-800">{value || row.name}</p>
            {row.description && (
              <p className="text-xs text-gray-400 truncate max-w-xs">
                {row.description}
              </p>
            )}
          </div>
        ),
      },
      {
        key: "moduleKey",
        label: "Key",
        sortable: true,
        render: (value, row) => (
          <span className="font-mono text-xs text-gray-600">
            {value || row.slug || "—"}
          </span>
        ),
      },
      {
        key: "parentModule",
        label: "Parent",
        render: (_, row) => (
          <span className="text-sm text-gray-600">
            {row.parentModule?.moduleName || row.parentModule?.name || "—"}
          </span>
        ),
      },
      {
        key: "routePath",
        label: "Route",
        render: (value) => (
          <span className="font-mono text-xs text-gray-600">
            {value || "—"}
          </span>
        ),
      },
      {
        key: "moduleType",
        label: "Type",
        render: (value) => (
          <span className="capitalize text-xs text-gray-600">
            {value || "module"}
          </span>
        ),
      },
      {
        key: "order",
        label: "Order",
        sortable: true,
        render: (value) => <span className="text-xs font-mono">{value}</span>,
      },
      {
        key: "isVisibleInSidebar",
        label: "Sidebar",
        render: (value) => (
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${value !== false ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"}`}
          >
            {value !== false ? "Yes" : "No"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (value, row) => (
          <button
            type="button"
            onClick={() => toggleStatus(row)}
            title="Click to toggle status"
          >
            <StatusBadge
              status={value || (row.active === false ? "inactive" : "active")}
              dot
            />
          </button>
        ),
      },
    ],
    [toggleStatus],
  );

  const rowActions = useCallback(
    (row) => [
      {
        label: "Edit Module",
        icon: <MdEdit size={16} className="text-amber-600" />,
        onClick: () => openEdit(row),
      },
      {
        label:
          (row.status || "active") === "active"
            ? "Deactivate Module"
            : "Activate Module",
        icon:
          (row.status || "active") === "active" ? (
            <MdBlock size={16} className="text-amber-600" />
          ) : (
            <MdCheckCircle size={16} className="text-green-600" />
          ),
        onClick: () => toggleStatus(row),
      },
      {
        label: "Delete Module",
        icon: <MdDelete size={16} className="text-red-600" />,
        onClick: () => handleDelete(row),
        danger: true,
      },
    ],
    [openEdit, toggleStatus, handleDelete],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Module Management"
        subtitle="Manage backend/admin modules, routes, sidebar visibility, and parent-child structure"
        breadcrumbs={[
          { label: "User Management" },
          { label: "Module Management" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={normalizeOrders}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              <MdSort size={16} /> Normalize Order
            </button>
            <OrangeButton onClick={openCreate}>
              <MdAdd size={16} /> Add Module
            </OrangeButton>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={modules}
        loading={loading}
        totalCount={modules.length}
        onSearch={(val) => setSearch(val)}
        rowActions={rowActions}
        searchPlaceholder="Search modules by name, key, or route..."
        emptyText="No modules found."
        emptyIcon={<MdViewModule size={40} className="text-gray-200" />}
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
            values={filters}
            onChange={(key, val) =>
              setFilters((prev) => ({ ...prev, [key]: val }))
            }
            onClear={() => setFilters({})}
            loading={loading}
            activeCount={
              Object.keys(filters).filter((k) => Boolean(filters[k])).length
            }
          />
        }
      />

      {modalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl bg-white rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editing ? "Edit Module" : "Create Module"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-700"
              >
                X
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm">
                Module Name
                <input
                  value={form.moduleName}
                  onChange={(e) => updateName(e.target.value)}
                  className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--admin-blue)]"
                />
              </label>
              <label className="text-sm">
                Module Key
                <input
                  value={form.moduleKey}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, moduleKey: e.target.value }))
                  }
                  className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--admin-blue)]"
                />
              </label>
              <label className="text-sm">
                Module Slug
                <input
                  value={form.moduleSlug}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, moduleSlug: e.target.value }))
                  }
                  className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--admin-blue)]"
                />
              </label>
              <label className="text-sm">
                Icon
                <input
                  value={form.icon}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, icon: e.target.value }))
                  }
                  placeholder="MdViewModule"
                  className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--admin-blue)]"
                />
              </label>
              <label className="text-sm">
                Route Path
                <input
                  value={form.routePath}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, routePath: e.target.value }))
                  }
                  placeholder="/app/module-management"
                  className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--admin-blue)]"
                />
              </label>
              <FilterSelect
                label="Parent Module"
                name="parentModuleId"
                inputId="parentModuleId"
                placeholder="Select Parent Module"
                isClearable
                isSearchable
                options={[
                  {
                    value: "",
                    label: "No parent",
                  },
                  ...parentOptions.filter(
                    (item) => item.value !== idOf(editing || {}),
                  ),
                ]}
                value={
                  [
                    {
                      value: "",
                      label: "No parent",
                    },
                    ...parentOptions.filter(
                      (item) => item.value !== idOf(editing || {}),
                    ),
                  ].find((option) => option.value === form.parentModuleId) ||
                  null
                }
                onChange={(selectedOption) =>
                  setForm((p) => ({
                    ...p,
                    parentModuleId: selectedOption?.value || "",
                  }))
                }
              />
              <FilterSelect
                label="Module Type"
                name="moduleType"
                inputId="moduleType"
                placeholder="Select Module Type"
                options={moduleTypes.options}
                value={
                  moduleTypes.options.find(
                    (option) => option.value === form.moduleType,
                  ) || null
                }
                onChange={(selectedOption) =>
                  setForm((p) => ({
                    ...p,
                    moduleType: selectedOption?.value || "",
                  }))
                }
                isSearchable={false}
                isClearable={false}
              />
              <label className="text-sm">
                Order
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, order: e.target.value }))
                  }
                  className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--admin-blue)]"
                />
              </label>
              <FilterSelect
                label="Status"
                name="status"
                inputId="status"
                placeholder="Select Status"
                options={recordStatuses.options}
                value={
                  recordStatuses.options.find(
                    (option) => option.value === form.status,
                  ) || null
                }
                onChange={(selectedOption) =>
                  setForm((p) => ({
                    ...p,
                    status: selectedOption?.value || "",
                  }))
                }
                isSearchable={false}
                isClearable={false}
              />
              <label className="text-sm">
                Permissions
                <input
                  value={form.permissionsText}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, permissionsText: e.target.value }))
                  }
                  placeholder="view, add, update"
                  className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--admin-blue)]"
                />
              </label>
              <label className="md:col-span-2 text-sm">
                Description
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--admin-blue)]"
                  rows={3}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isVisibleInSidebar}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      isVisibleInSidebar: e.target.checked,
                    }))
                  }
                />
                Visible in sidebar
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={closeModal} className="px-4 py-2 rounded border">
                Cancel
              </button>
              <OrangeButton disabled={saving} onClick={handleSave}>
                {saving ? "Saving..." : "Save"}
              </OrangeButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
