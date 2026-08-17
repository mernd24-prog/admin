import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdLocationCity } from "react-icons/md";

import { create, edit, enableDisableCity, getCityList } from "../../../Redux/citySlice";
import { getAllStateList } from "../../../Redux/stateSlice";
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
const MODULE = "cities";

const extractListPayload = (payload = {}) => {
  const d = payload?.data?.data || payload?.data || payload;
  const list = d?.list || d?.items || [];
  return { list: Array.isArray(list) ? list : [], total: Number(d?.total || list.length || 0) };
};

const INIT_FORM = { name: "", country_code: null, state_code: null, _id: null };

const validateCityForm = (data) => {
  const errors = {};
  if (!String(data.name || "").trim()) errors.name = "City name is required.";
  if (!data.country_code) errors.country_code = "Country is required.";
  if (!data.state_code)   errors.state_code   = "State is required.";
  return errors;
};

const ManageCity = () => {
  const dispatch = useDispatch();
  const list     = useListPage({ defaultPageSize: PAGE_SIZE, defaultSortKey: "name" });

  const countryListRaw = useSelector((s) => s?.country?.getAllCountryListData?.data?.data?.list || []);
  const stateListRaw   = useSelector((s) => s?.state?.getAllStateListData?.data?.data?.list || []);

  const countryOptions = countryListRaw.map((c) => ({ value: c._id, label: c.name }));
  const allStateOptions = stateListRaw.map((s) => ({
    value: s._id, label: s.name,
    countryId: s?.countryId?._id || s?.countryId || s?.country_code?._id || s?.country_code || null,
  }));

  const [apiRes,    setApiRes]    = useState({ list: [], total: 0 });
  const [loading,   setLoading]   = useState(false);
  const [formData,  setFormData]  = useState(INIT_FORM);
  const [errors,    setErrors]    = useState({});
  const [isEditMode,setIsEditMode]= useState(false);
  const [isFormOpen,setIsFormOpen]= useState(false);
  const [submitting,setSubmitting]= useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState("");

  // States filtered by selected country in the form
  const formStateOptions = formData.country_code
    ? allStateOptions.filter((s) => String(s.countryId) === String(formData.country_code))
    : [];

  // Filter fields (search + state)
  const FILTER_FIELDS = [
    { key: "search", type: "search", label: "Search", placeholder: "Search by name…", width: "w-52" },
    { key: "state",  type: "select", label: "State",  width: "w-44",
      options: allStateOptions.map((s) => ({ value: s.value, label: s.label })) },
  ];

  const COLUMNS = [
    { key: "name",    label: "City",    sortable: true, render: (v) => <span className="capitalize font-medium">{v}</span> },
    { key: "_country",label: "Country", render: (_, row) => row?.countryId?.name || row?.country_code?.name || row?.stateId?.countryId?.name || "—" },
    { key: "_state",  label: "State",   render: (_, row) => row?.stateId?.name || row?.state_code?.name || "—" },
    { key: "_status", label: "Status" },
    { key: "_actions",label: "Actions" },
  ];

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchCities = useCallback(() => {
    const p = list.toQueryParams();
    const query = {
      page:         p.page,
      size:         p.limit,
      keyWord:      p.search || "",
      searchFields: "name",
      populate:     "state_code:name",
      sortBy:       p.sortBy,
      sortOrder:    p.sortDir,
      stateId:      p.state || undefined,
    };
    setLoading(true);
    dispatch(getCityList(query))
      .then((res) => setApiRes(extractListPayload(res?.payload)))
      .catch(() => setApiRes({ list: [], total: 0 }))
      .finally(() => setLoading(false));
  }, [dispatch, list]);

  useEffect(() => {
    dispatch(getAllCountryList());
    dispatch(getAllStateList());
  }, [dispatch]);

  useEffect(() => {
    fetchCities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.page, list.pageSize, list.search, list.sortKey, list.sortDir, list.filters]);

  const isActive = (row) => row?.active !== undefined ? Boolean(row.active) : !row?.isDisable;

  const openAdd  = () => {
    if (submitting || statusLoadingId) return;
    setFormData(INIT_FORM); setErrors({}); setIsEditMode(false); setIsFormOpen(true);
  };
  const openEdit = (city) => {
    if (submitting || statusLoadingId) return;
    const stateId   = city.stateId?._id || city.state_code?._id;
    const matchSt   = allStateOptions.find((s) => String(s.value) === String(stateId));
    const countryId = city.countryId?._id || city.country_code?._id || city.stateId?.countryId?._id || matchSt?.countryId || null;
    setFormData({ name: city.name, country_code: countryId, state_code: stateId, _id: city._id });
    setErrors({}); setIsEditMode(true); setIsFormOpen(true);
  };
  const closeForm = (force = false) => {
    if (submitting && !force) return;
    setIsFormOpen(false); setFormData(INIT_FORM); setErrors({});
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const errs = validateCityForm(formData);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const payload = { name: formData.name.trim(), country_code: formData.country_code, state_code: formData.state_code };
    try {
      setSubmitting(true);
      if (isEditMode) {
        await dispatch(edit({ ...payload, _id: formData._id })).unwrap();
        toast.success("City updated successfully.");
      } else {
        await dispatch(create(payload)).unwrap();
        toast.success("City created successfully.");
      }
      closeForm(true);
      fetchCities();
    } catch (err) {
      toast.error(err?.message || "Failed to save city.");
      if (err?.errors) setErrors(err.errors);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle ─────────────────────────────────────────────────────────────────
  const handleToggle = async (city) => {
    const id = city?._id;
    if (!id || statusLoadingId) return;
    try {
      setStatusLoadingId(id);
      const res = await dispatch(enableDisableCity({ _id: [city._id], isDisable: isActive(city) })).unwrap();
      toast.success(res?.message || "Status updated.");
      fetchCities();
    } catch (err) { toast.error(err?.message || "Failed to update status."); }
    finally { setStatusLoadingId(""); }
  };

  // ── Bulk ───────────────────────────────────────────────────────────────────
  const handleBulkStatus = async (isDisable) => {
    if (!list.selectedKeys.length) return;
    setLoading(true);
    try {
      const res = await dispatch(enableDisableCity({ _id: list.selectedKeys, isDisable })).unwrap();
      toast.success(res?.message || "Bulk update complete.");
      list.clearSelection();
      fetchCities();
    } catch (err) { toast.error(err?.message || "Bulk update failed."); }
    finally { setLoading(false); }
  };

  const columns = COLUMNS.map((col) => {
    if (col.key === "_status") return { ...col, render: (_, row) => <StatusBadge status={isActive(row) ? "active" : "inactive"} dot /> };
    if (col.key === "_actions") return {
      ...col,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <ToggleButton
            isToggle={isActive(row)}
            handleClick={() => handleToggle(row)}
            requiredModule={MODULE}
            loading={statusLoadingId === row._id}
            disabled={Boolean(statusLoadingId) || submitting}
          />
          <ActionButtons onEdit={() => openEdit(row)} showLinkButton={false} showDeleteButton={false} requiredModule={MODULE} />
        </div>
      ),
    };
    return col;
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="City Management"
        subtitle="Manage cities available across supported states"
        breadcrumbs={[{ label: "Home" }, { label: "Settings", to: "/app/setting" }, { label: "Cities" }]}
        actions={
          <PermissionGuard module={MODULE} action="create" hide>
            <button
              onClick={openAdd}
              disabled={submitting || Boolean(statusLoadingId)}
              
            >
              + Add City
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
        emptyText="No cities found."
        emptyIcon={<MdLocationCity size={36} className="text-gray-200" />}
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
              { label: "Set Active",   action: "status_change", variant: "primary", onClick: () => handleBulkStatus(false) },
              { label: "Set Inactive", action: "status_change", variant: "warning", onClick: () => handleBulkStatus(true) },
            ]}
          />
        }
      />

      <DefaultModal
        title={isEditMode ? "Edit City" : "Add City"}
        isOpen={isFormOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        loading={submitting}
        submitButtonText={submitting ? "Saving..." : isEditMode ? "Update City" : "Create City"}
      >
        <div className="grid grid-cols-1 gap-4 p-3">
          <Input labelName="Name" type="text" name="name" value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            error={errors.name} required maxLength={100} disabled={submitting} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country <span className="text-red-500">*</span></label>
            <FilterSelect
              options={countryOptions}
              value={countryOptions.find((o) => o.value === formData.country_code) || null}
              onChange={(opt) => setFormData((p) => ({ ...p, country_code: opt?.value || null, state_code: null }))}
              isSearchable placeholder="Select Country"
              isDisabled={submitting}
            />
            {errors.country_code && <p className="mt-1 text-xs text-red-500">{errors.country_code}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State <span className="text-red-500">*</span></label>
            <FilterSelect
              options={formStateOptions}
              value={formStateOptions.find((o) => o.value === formData.state_code) || null}
              onChange={(opt) => setFormData((p) => ({ ...p, state_code: opt?.value || null }))}
              isSearchable placeholder="Select State"
              isDisabled={!formData.country_code || submitting}
            />
            {errors.state_code && <p className="mt-1 text-xs text-red-500">{errors.state_code}</p>}
          </div>
        </div>
      </DefaultModal>
    </div>
  );
};

export default ManageCity;
