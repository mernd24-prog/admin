import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdMap } from "react-icons/md";

import { create, editState, enableDisableState, getStateList } from "../../../Redux/stateSlice";
import { getAllCountryList } from "../../../Redux/CountrySlice";

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
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";

const PAGE_SIZE = 20;
const MODULE = "states";

const extractListPayload = (payload = {}) => {
  const d = payload?.data?.data || payload?.data || payload;
  const list = d?.list || d?.items || [];
  return { list: Array.isArray(list) ? list : [], total: Number(d?.total || list.length || 0) };
};

const INIT_FORM = { name: "", country_code: null, _id: null };

const validateStateForm = (data) => {
  const errors = {};
  const name = String(data.name || "").trim();
  if (!name) errors.name = "State name is required.";
  else if (name.length < 2) errors.name = "State name must be at least 2 characters.";
  else if (name.length > 100) errors.name = "State name cannot exceed 100 characters.";
  if (!data.country_code) errors.country_code = "Country is required.";
  return errors;
};

const ManageState = () => {
  const dispatch  = useDispatch();
  const list      = useListPage({ defaultPageSize: PAGE_SIZE, defaultSortKey: "name" });

  const countryListRaw = useSelector((s) => s?.country?.getAllCountryListData?.data?.data?.list || []);
  const countryOptions = countryListRaw.map((c) => ({ value: c._id, label: c.name }));

  const [apiRes,    setApiRes]    = useState({ list: [], total: 0 });
  const [loading,   setLoading]   = useState(false);
  const [formData,  setFormData]  = useState(INIT_FORM);
  const [errors,    setErrors]    = useState({});
  const [isEditMode,setIsEditMode]= useState(false);
  const [isFormOpen,setIsFormOpen]= useState(false);
  const [submitting,setSubmitting]= useState(false);

  // ── Filter fields (search + country select) ────────────────────────────────
  const FILTER_FIELDS = [
    { key: "search",  type: "search", label: "Search", placeholder: "Search by name…", width: "w-52" },
    { key: "country", type: "select", label: "Country", width: "w-44",
      options: countryOptions.map((c) => ({ value: c.value, label: c.label })) },
  ];

  // ── Columns ────────────────────────────────────────────────────────────────
  const COLUMNS = [
    { key: "name",    label: "State Name", sortable: true, render: (v) => <span className="capitalize font-medium">{v}</span> },
    { key: "_country",label: "Country",    render: (_, row) => row?.countryId?.name || row?.country_code?.name || "—" },
    { key: "_status", label: "Status",     render: (_, row) => <StatusBadge status={isActive(row) ? "active" : "inactive"} dot /> },
    { key: "_actions",label: "Actions" },
  ];

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchStates = useCallback(() => {
    const p = list.toQueryParams();
    const query = {
      page:         p.page,
      size:         p.limit,
      keyWord:      p.search || "",
      searchFields: "name,code,country",
      populate:     "country_code:name",
      sortBy:       p.sortBy,
      sortOrder:    p.sortDir,
      countryId:    p.country || undefined,
    };
    setLoading(true);
    dispatch(getStateList(query))
      .then((res) => setApiRes(extractListPayload(res?.payload)))
      .catch(() => setApiRes({ list: [], total: 0 }))
      .finally(() => setLoading(false));
  }, [dispatch, list]);

  useEffect(() => {
    dispatch(getAllCountryList());
  }, [dispatch]);

  useEffect(() => {
    fetchStates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.page, list.pageSize, list.search, list.sortKey, list.sortDir, list.filters]);

  const isActive = (row) => row?.active !== undefined ? Boolean(row.active) : !row?.isDisable;

  const openAdd = () => { setFormData(INIT_FORM); setErrors({}); setIsEditMode(false); setIsFormOpen(true); };
  const openEdit = (state) => {
    setFormData({ name: state.name, country_code: state.countryId?._id || state.country_code?._id, _id: state._id });
    setErrors({}); setIsEditMode(true); setIsFormOpen(true);
  };
  const closeForm = () => { setIsFormOpen(false); setFormData(INIT_FORM); setErrors({}); setSubmitting(false); };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const errs = validateStateForm(formData);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    const payload = { name: formData.name.trim(), country_code: formData.country_code };
    try {
      if (isEditMode) {
        await dispatch(editState({ ...payload, _id: formData._id })).unwrap();
        toast.success("State updated successfully.");
      } else {
        await dispatch(create(payload)).unwrap();
        toast.success("State created successfully.");
      }
      closeForm();
      fetchStates();
    } catch (err) {
      toast.error(err?.message || "Failed to save state.");
      if (err?.errors) setErrors(err.errors);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle ─────────────────────────────────────────────────────────────────
  const handleToggle = async (state) => {
    try {
      const res = await dispatch(enableDisableState({ _id: [state._id], isDisable: isActive(state) })).unwrap();
      toast.success(res?.message || "Status updated.");
      fetchStates();
    } catch (err) { toast.error(err?.message || "Failed to update status."); }
  };

  // ── Bulk ───────────────────────────────────────────────────────────────────
  const handleBulkStatus = async (isDisable) => {
    if (!list.selectedKeys.length) return;
    setLoading(true);
    try {
      const res = await dispatch(enableDisableState({ _id: list.selectedKeys, isDisable })).unwrap();
      toast.success(res?.message || "Bulk update complete.");
      list.clearSelection();
      fetchStates();
    } catch (err) { toast.error(err?.message || "Bulk update failed."); }
    finally { setLoading(false); }
  };

  // ── Column renderers ────────────────────────────────────────────────────────
  const columns = COLUMNS.map((col) => {
    if (col.key === "_status") return { ...col, render: (_, row) => <StatusBadge status={isActive(row) ? "active" : "inactive"} dot /> };
    if (col.key === "_actions") return {
      ...col,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <ToggleButton isToggle={isActive(row)} handleClick={() => handleToggle(row)} requiredModule={MODULE} />
          <ActionButtons onEdit={() => openEdit(row)} showLinkButton={false} showDeleteButton={false} requiredModule={MODULE} />
        </div>
      ),
    };
    return col;
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="State Management"
        breadcrumbs={[{ label: "Home" }, { label: "Settings", to: "/app/setting" }, { label: "States" }]}
        actions={
          <PermissionGuard module={MODULE} action="create" hide>
            <button onClick={openAdd}>+ Add State</button>
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
        emptyText="No states found."
        emptyIcon={<MdMap size={36} className="text-gray-200" />}
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
              { label: "Set Active",   action: "status_change", variant: "primary",  onClick: () => handleBulkStatus(false) },
              { label: "Set Inactive", action: "status_change", variant: "warning", onClick: () => handleBulkStatus(true) },
            ]}
          />
        }
      />

      <DefaultModal
        title={isEditMode ? "Edit State" : "Add State"}
        isOpen={isFormOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
      >
        <div className="grid grid-cols-1 gap-4 p-3">
          <Input labelName="Name" type="text" name="name" value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            error={errors.name} required maxLength={100} disabled={submitting} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country <span className="text-red-500">*</span>
            </label>
            <FilterSelect
              options={countryOptions}
              value={countryOptions.find((o) => o.value === formData.country_code) || null}
              onChange={(opt) => setFormData((p) => ({ ...p, country_code: opt?.value || null }))}
              name="country_code"
              isSearchable
              placeholder="Select Country"
              isDisabled={submitting}
            />
            {errors.country_code && <p className="mt-1 text-xs text-red-500">{errors.country_code}</p>}
          </div>
        </div>
      </DefaultModal>
    </div>
  );
};

export default ManageState;
