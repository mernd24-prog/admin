import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  createRbacModule,
  deleteRbacModule,
  getRbacModules,
  reorderRbacModules,
  updateRbacModule,
  updateRbacModuleStatus,
} from "../../../Redux/adminCoreSlice";
import useDropdownOptions from "../../../hooks/useDropdownOptions";

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
  const [status, setStatus] = useState("");
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
  const modules = useMemo(() => payload.list || payload.items || [], [payload]);
  const loading = selector?.loading;

  const parentOptions = useMemo(
    () =>
      modules
        .filter((item) =>
          ["group", "module"].includes(item.moduleType || "module"),
        )
        .map((item) => ({
          value: idOf(item),
          label: item.moduleName || item.name,
        })),
    [modules],
  );

  const load = useCallback(() => {
    dispatch(
      getRbacModules({
        limit: 1000,
        includeInactive: true,
        ...(search ? { q: search } : {}),
        ...(status ? { status } : {}),
      }),
    );
  }, [dispatch, search, status]);

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

  const openEdit = (row) => {
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
  };

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

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete ${row.moduleName || row.name}?`)) return;
    try {
      await dispatch(deleteRbacModule({ id: idOf(row) })).unwrap();
      toast.success("Module deleted");
      load();
    } catch (error) {
      toast.error(error?.message || error || "Failed to delete module");
    }
  };

  const toggleStatus = async (row) => {
    const next = (row.status || "active") === "active" ? "inactive" : "active";
    try {
      await dispatch(
        updateRbacModuleStatus({ id: idOf(row), status: next }),
      ).unwrap();
      toast.success("Status updated");
      load();
    } catch (error) {
      toast.error(error?.message || error || "Failed to update status");
    }
  };

  const normalizeOrders = async () => {
    try {
      await dispatch(
        reorderRbacModules({
          modules: modules.map((item, index) => ({
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Module Management
          </h1>
          <p className="text-sm text-gray-500">
            Manage backend/admin modules, routes, sidebar visibility, and
            parent-child structure.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={normalizeOrders}
            className="px-3 py-2 text-sm rounded border border-gray-300 bg-white"
          >
            Normalize Order
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 text-sm rounded bg-[#3E4094] text-white"
          >
            Add Module
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search modules..."
          className="w-72 px-3 py-2 text-sm border border-gray-300 rounded-lg"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
        >
          <option value="">All statuses</option>
          {recordStatuses.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          className="px-4 py-2 text-sm rounded border border-[#3E4094] text-[#3E4094] bg-white"
        >
          Apply
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {[
                "Module",
                "Key",
                "Parent",
                "Route",
                "Type",
                "Order",
                "Sidebar",
                "Status",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && !modules.length ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-400">
                  Loading modules...
                </td>
              </tr>
            ) : modules.length ? (
              modules.map((row) => (
                <tr key={idOf(row)} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">
                      {row.moduleName || row.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {row.description || "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.moduleKey || row.slug}
                  </td>
                  <td className="px-4 py-3">
                    {row.parentModule?.moduleName || "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.routePath || "-"}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {row.moduleType || "module"}
                  </td>
                  <td className="px-4 py-3">{row.order}</td>
                  <td className="px-4 py-3">
                    {row.isVisibleInSidebar ? "Yes" : "No"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleStatus(row)}
                      className={`px-2 py-1 rounded-full text-xs ${row.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                    >
                      {row.status || "active"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(row)}
                        className="px-2 py-1 text-xs rounded border border-blue-200 text-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
                        className="px-2 py-1 text-xs rounded border border-red-200 text-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-400">
                  No modules found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
                  className="mt-1 w-full border rounded px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Module Key
                <input
                  value={form.moduleKey}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, moduleKey: e.target.value }))
                  }
                  className="mt-1 w-full border rounded px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Module Slug
                <input
                  value={form.moduleSlug}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, moduleSlug: e.target.value }))
                  }
                  className="mt-1 w-full border rounded px-3 py-2"
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
                  className="mt-1 w-full border rounded px-3 py-2"
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
                  className="mt-1 w-full border rounded px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Parent Module
                <select
                  value={form.parentModuleId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, parentModuleId: e.target.value }))
                  }
                  className="mt-1 w-full border rounded px-3 py-2"
                >
                  <option value="">No parent</option>
                  {parentOptions
                    .filter((item) => item.value !== idOf(editing || {}))
                    .map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm">
                Module Type
                <select
                  value={form.moduleType}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, moduleType: e.target.value }))
                  }
                  className="mt-1 w-full border rounded px-3 py-2"
                >
                  {moduleTypes.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Order
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, order: e.target.value }))
                  }
                  className="mt-1 w-full border rounded px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Status
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, status: e.target.value }))
                  }
                  className="mt-1 w-full border rounded px-3 py-2"
                >
                  {recordStatuses.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Permissions
                <input
                  value={form.permissionsText}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, permissionsText: e.target.value }))
                  }
                  placeholder="view, add, update"
                  className="mt-1 w-full border rounded px-3 py-2"
                />
              </label>
              <label className="md:col-span-2 text-sm">
                Description
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className="mt-1 w-full border rounded px-3 py-2"
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
              <button
                disabled={saving}
                onClick={handleSave}
                className="px-4 py-2 rounded bg-[#3E4094] text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
