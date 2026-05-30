import React, { useEffect, useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { MdPublic } from "react-icons/md";

import {
  create,
  getCountryList,
  editCountry,
  enableDisableCountry,
} from "../../../Redux/CountrySlice";

import {
  DataTable,
  PageHeader,
  StatusBadge,
  FilterBar,
  BulkActionBar,
} from "../../../components/Shared";

import { useListPage } from "../../../hooks/useListPage";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ActionButtons } from "../../../components/Atoms/TableActionButton/TableActionButton";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import { validateValues } from "../../../_helpers/validation";

const PAGE_SIZE = 20;
const MODULE = "countries";

const FILTER_FIELDS = [
  { key: "search", type: "search", label: "Search", placeholder: "Search by name or code…", width: "w-56" },
  {
    key: "status",
    type: "select",
    label: "Status",
    width: "w-36",
    options: [
      { value: "active",   label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
];

const COLUMNS = [
  { key: "name",    label: "Country",    sortable: true, render: (v) => <span className="capitalize font-medium">{v}</span> },
  { key: "code",    label: "Code",       sortable: true, render: (v) => <span className="font-mono text-xs uppercase">{v}</span> },
  { key: "dialCode",label: "Dial Code"  },
  { key: "_status", label: "Status",     render: (_, row) => <StatusBadge status={row.active || !row.isDisable ? "active" : "inactive"} dot /> },
  { key: "_actions",label: "Actions" },
];

const extractListPayload = (payload = {}) => {
  const data = payload?.data || payload;
  const nested = data?.data || data;
  const list = nested?.list || nested?.items || [];
  return {
    list:  Array.isArray(list) ? list : [],
    total: Number(nested?.total || list.length || 0),
  };
};

const validateCountry = (data) =>
  validateValues(data, {
    name:     { label: "Country name", required: true, minLength: 3, maxLength: 100 },
    code:     { label: "Country code", required: true, minLength: 2, maxLength: 5 },
    dialCode: { label: "Dial code",    required: true, maxLength: 10 },
  });

const INIT_FORM = { name: "", code: "", dialCode: "", _id: undefined };

const ManageCountry = () => {
  const dispatch = useDispatch();
  const list     = useListPage({ defaultPageSize: PAGE_SIZE, defaultSortKey: "name" });

  const [apiRes,    setApiRes]    = useState({ list: [], total: 0 });
  const [loading,   setLoading]   = useState(false);
  const [formData,  setFormData]  = useState(INIT_FORM);
  const [errors,    setErrors]    = useState({});
  const [isEditMode,setIsEditMode]= useState(false);
  const [isFormOpen,setIsFormOpen]= useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchCountries = useCallback(() => {
    const params = list.toQueryParams();
    const query = {
      page:         params.page,
      size:         params.limit,
      keyWord:      params.search || params.filters?.search || "",
      searchFields: "name,code",
      sortBy:       params.sortBy,
      sortOrder:    params.sortDir === "asc" ? "asc" : "desc",
    };
    if (params.status && params.status !== "all") query.active = params.status === "active";

    setLoading(true);
    dispatch(getCountryList(query))
      .then((res) => setApiRes(extractListPayload(res?.payload)))
      .catch(() => setApiRes({ list: [], total: 0 }))
      .finally(() => setLoading(false));
  }, [dispatch, list]);

  useEffect(() => {
    fetchCountries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.page, list.pageSize, list.search, list.sortKey, list.sortDir, list.filters]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isActive = (row) =>
    row?.active !== undefined ? Boolean(row.active) : !row?.isDisable;

  const openAdd = () => {
    setFormData(INIT_FORM);
    setErrors({});
    setIsEditMode(false);
    setIsFormOpen(true);
  };

  const openEdit = (country) => {
    setFormData({ name: country.name, code: country.code, dialCode: country.dialCode, _id: country._id });
    setErrors({});
    setIsEditMode(true);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setFormData(INIT_FORM);
    setErrors({});
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateCountry(formData);
    if (Object.keys(validationErrors).length) { setErrors(validationErrors); return; }

    setLoading(true);
    dispatch(isEditMode ? editCountry(formData) : create(formData))
      .unwrap()
      .then(() => { fetchCountries(); closeForm(); })
      .catch((err) => { toast.error(err?.message || "Failed to save country."); })
      .finally(() => setLoading(false));
  };

  // ── Toggle status ──────────────────────────────────────────────────────────
  const handleToggle = async (country) => {
    try {
      const res = await dispatch(enableDisableCountry({ _id: [country._id], isDisable: isActive(country) })).unwrap();
      toast.success(res?.message || "Status updated.");
      fetchCountries();
    } catch (err) {
      toast.error(err?.message || "Failed to update status.");
    }
  };

  // ── Bulk actions ───────────────────────────────────────────────────────────
  const handleBulkStatus = async (isDisable) => {
    if (!list.selectedKeys.length) return;
    setLoading(true);
    try {
      const res = await dispatch(enableDisableCountry({ _id: list.selectedKeys, isDisable })).unwrap();
      toast.success(res?.message || "Bulk update complete.");
      list.clearSelection();
      fetchCountries();
    } catch (err) {
      toast.error(err?.message || "Bulk update failed.");
    } finally {
      setLoading(false);
    }
  };

  // ── Table columns with renderers ──────────────────────────────────────────
  const columns = COLUMNS.map((col) => {
    if (col.key === "_status") return { ...col, render: (_, row) => <StatusBadge status={isActive(row) ? "active" : "inactive"} dot /> };
    if (col.key === "_actions") return {
      ...col,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <ToggleButton isToggle={isActive(row)} handleClick={() => handleToggle(row)} requiredModule={MODULE} />
          <ActionButtons
            onEdit={() => openEdit(row)}
            showLinkButton={false}
            showDeleteButton={false}
            requiredModule={MODULE}
          />
        </div>
      ),
    };
    return col;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      <PageHeader
        title="Country Management"
        subtitle="Manage countries, codes and dial codes"
        breadcrumbs={[
          { label: "Home" },
          { label: "Settings", to: "/app/setting" },
          { label: "Countries" },
        ]}
        actions={
          <PermissionGuard module={MODULE} action="create" hide>
            <button onClick={openAdd} className="admin-btn-primary">
              + Add Country
            </button>
          </PermissionGuard>
        }
      />

      <DataTable
        columns={columns}
        data={apiRes.list}
        loading={loading}
        totalCount={apiRes.total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        selectable
        selectedKeys={list.selectedKeys}
        onSelectionChange={list.setSelectedKeys}
        rowKey="_id"
        requiredModule={MODULE}
        emptyText="No countries found."
        emptyIcon={<MdPublic size={36} className="text-gray-200" />}
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={loading}
            activeCount={list.activeFilterCount}
          />
        }
        bulkActionBar={
          <BulkActionBar
            selectedCount={list.selectedCount}
            totalCount={apiRes.list.length}
            onClear={list.clearSelection}
            module={MODULE}
            loading={loading}
            actions={[
              {
                label:   "Set Active",
                action:  "status_change",
                variant: "primary",
                onClick: () => handleBulkStatus(false),
              },
              {
                label:   "Set Inactive",
                action:  "status_change",
                variant: "warning",
                onClick: () => handleBulkStatus(true),
              },
            ]}
          />
        }
      />

      {/* Form modal */}
      <DefaultModal
        title={isEditMode ? "Edit Country" : "Add Country"}
        isOpen={isFormOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3">
          <div className="col-span-2">
            <Input labelName="Name" type="text" name="name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} error={errors.name} required maxLength={25} />
          </div>
          <Input labelName="Code" type="text" name="code" value={formData.code} onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))} error={errors.code} required maxLength={5} />
          <Input labelName="Dial Code" type="text" name="dialCode" value={formData.dialCode} onChange={(e) => setFormData((p) => ({ ...p, dialCode: e.target.value }))} error={errors.dialCode} required maxLength={10} />
        </div>
      </DefaultModal>
    </div>
  );
};

export default ManageCountry;
