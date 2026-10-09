/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import {
  MdCode,
  MdAdd,
  MdEdit,
  MdDelete,
  MdCheckCircle,
  MdBlock,
} from "react-icons/md";

import {
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
  ConfirmModal,
} from "../../../components/Shared";

import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";

import {
  createHsn,
  getHsnList,
  updateHsn,
  enableDisableHsn,
  softDeleteHsn,
} from "../../../Redux/productSlice";

import AddHsnModal from "../../ProductManagement/ProductCatalog/components/Modals/AddHsnModal";

/* ==================== FILTER CONFIGURATION ==================== */

const FILTER_FIELDS = [
  {
    key: "isDisable",
    type: "select",
    label: "Status",
    width: "w-36",
    options: [
      { value: "", label: "All Status" },
      { value: "false", label: "Active" },
      { value: "true", label: "Inactive" },
    ],
  },
];

/* ==================== TABLE COLUMNS ==================== */

const COLUMNS = [
  {
    key: "code",
    label: "HSN Code",
    sortable: true,
    render: (v) => (
      <span className="font-mono font-semibold text-[var(--admin-navy)]">
        {v}
      </span>
    ),
  },
  {
    key: "IGST",
    label: "IGST %",
    render: (v) => <span className="text-sm">{v ?? "—"}%</span>,
  },
  {
    key: "CGST",
    label: "CGST %",
    render: (v) => <span className="text-sm">{v ?? "—"}%</span>,
  },
  {
    key: "SGST",
    label: "SGST %",
    render: (v) => <span className="text-sm">{v ?? "—"}%</span>,
  },
  {
    key: "additionalTax",
    label: "Additional %",
    render: (v) => <span className="text-sm">{v ?? 0}%</span>,
  },
  {
    key: "description",
    label: "Description",
    render: (v) => (
      <span className="text-sm text-gray-600 max-w-xs truncate block">
        {v || "—"}
      </span>
    ),
  },
  {
    key: "isDisable",
    label: "Status",
    render: (v) => <StatusBadge status={v ? "inactive" : "active"} dot />,
  },
];

/* ==================== COMPONENT ==================== */

const HsnCode = () => {
  const dispatch = useDispatch();

  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "code",
    defaultSortDir: "asc",
  });

  const [hsnList, setHsnList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isRefresh, setIsRefresh] = useState(false);

  // Dedicated status filter state
  const [statusFilter, setStatusFilter] = useState("");

  // Modal state
  const [modalMode, setModalMode] = useState(null); // null | "add" | "edit"
  const [editData, setEditData] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  /* ==================== STATUS FILTER HANDLER ==================== */

  const handleStatusFilterChange = useCallback(
    (key, value) => {
      // Support both (key, value) and direct value callbacks
      const selectedValue = value !== undefined ? value : key;

      setStatusFilter(
        selectedValue === null || selectedValue === undefined
          ? ""
          : String(selectedValue),
      );

      // Always start from the first page after filtering
      list.setPage(1);
    },
    [list.setPage],
  );

  /* ==================== CLEAR FILTERS ==================== */

  const handleClearFilters = useCallback(() => {
    setStatusFilter("");
    list.clearFilters();
    list.setPage(1);
  }, [list.clearFilters, list.setPage]);

  /* ==================== FETCH HSN LIST ==================== */

  const fetchList = useCallback(async () => {
    setLoading(true);

    try {
      const params = list.toQueryParams();

      const requestParams = {
        page: String(params.page || 1),
        size: String(params.limit || 20),
        keyWord: params.search || "",
      };

      // Only send the status parameter when a specific
      // status has been selected.
      // NOTE: toHsnListParams maps `active` → API; isDisable="false" means Active.
      if (statusFilter === "true") {
        requestParams.active = false; // Inactive → active: false
      } else if (statusFilter === "false") {
        requestParams.active = true; // Active   → active: true
      }

      const res = await dispatch(getHsnList(requestParams)).unwrap();

      const data = res?.data?.data || res?.data || {};

      const items = Array.isArray(data) ? data : data?.list || [];

      const totalCount = Number(data?.total ?? items.length);

      setHsnList(items);
      setTotal(totalCount);
    } catch (err) {
      toast.error(err?.message || "Failed to load HSN codes");
    } finally {
      setLoading(false);
    }
  }, [
    dispatch,
    list.page,
    list.pageSize,
    list.search,
    list.sortKey,
    list.sortDir,
    statusFilter,
    isRefresh,
  ]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  /* ==================== CLOSE MODAL ==================== */

  const closeModal = () => {
    setModalMode(null);
    setEditData(null);
  };

  /* ==================== CREATE / UPDATE ==================== */

  const handleHsnSubmit = async (values) => {
    const payload = {
      code: values.code.trim(),
      IGST: Number(values.IGST),
      CGST: Number(values.CGST),
      SGST: Number(values.SGST),
      additionalTax: Number(values.additionalTax || 0),
      description: values.description?.trim() || "",
      isDisable: values.isDisable,
    };

    try {
      let res;

      if (modalMode === "edit") {
        res = await dispatch(
          updateHsn({
            ...payload,
            _id: values._id,
          }),
        ).unwrap();
      } else {
        res = await dispatch(createHsn(payload)).unwrap();
      }

      if (res?.error) {
        toast.error(res.error);
        return false;
      }

      toast.success(
        res?.message ||
          `HSN code ${modalMode === "edit" ? "updated" : "created"}`,
      );

      closeModal();

      setIsRefresh((r) => !r);
      return true;
    } catch (err) {
      toast.error(err?.message || "Save failed");
      return false;
    }
  };

  /* ==================== ENABLE / DISABLE ==================== */

  const handleToggleStatus = useCallback(
    async (row) => {
      try {
        const res = await dispatch(
          enableDisableHsn({
            _id: [row._id],
            isDisable: !row.isDisable,
          }),
        ).unwrap();

        toast.success(res?.message || "Status updated");

        setIsRefresh((r) => !r);
      } catch (err) {
        toast.error(err?.message || "Failed to update status");
      }
    },
    [dispatch],
  );

  /* ==================== DELETE ==================== */

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      const res = await dispatch(
        softDeleteHsn({
          _id: [deleteTarget._id],
        }),
      ).unwrap();

      toast.success(res?.message || "HSN code deleted");

      setDeleteOpen(false);
      setDeleteTarget(null);

      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    }
  };

  /* ==================== ROW ACTIONS ==================== */

  const rowActions = useCallback(
    (row) => [
      {
        label: "Edit",
        icon: <MdEdit size={16} className="text-blue-600" />,
        onClick: () => {
          setEditData({
            _id: row._id,
            code: row.code || "",
            IGST: row.IGST ?? "",
            CGST: row.CGST ?? "",
            SGST: row.SGST ?? "",
            additionalTax: row.additionalTax ?? "0",
            description: row.description || "",
            isDisable: row.isDisable || false,
          });

          setModalMode("edit");
        },
      },
      {
        label: row.isDisable ? "Enable" : "Disable",
        icon: row.isDisable ? (
          <MdCheckCircle size={16} className="text-green-600" />
        ) : (
          <MdBlock size={16} className="text-amber-600" />
        ),
        onClick: () => handleToggleStatus(row),
        danger: !row.isDisable,
      },
      {
        label: "Delete",
        icon: <MdDelete size={16} className="text-red-600" />,
        onClick: () => {
          setDeleteTarget(row);
          setDeleteOpen(true);
        },
        danger: true,
      },
    ],
    [handleToggleStatus],
  );

  /* ==================== RENDER ==================== */

  return (
    <div>
      <PageHeader
        title="HSN Codes"
        subtitle="Manage Harmonized System Nomenclature codes and tax rates"
        breadcrumbs={[{ label: "Invoices & Taxation" }, { label: "HSN Codes" }]}
        actions={
          <PermissionGuard module="tax" action={ACTIONS.CREATE} hide>
            <button onClick={() => setModalMode("add")}>
              <MdAdd size={16} />
              Add HSN Code
            </button>
          </PermissionGuard>
        }
      />

      <DataTable
        columns={COLUMNS}
        data={hsnList}
        loading={loading}
        totalCount={total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onRefresh={fetchList}
        rowActions={rowActions}
        searchPlaceholder="Search HSN code or description…"
        emptyText="No HSN codes found."
        emptyIcon={<MdCode size={40} className="text-gray-200" />}
        requiredModule="tax"
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
            values={{
              ...list.filters,
              isDisable: statusFilter,
            }}
            onChange={handleStatusFilterChange}
            onClear={handleClearFilters}
            loading={loading}
            activeCount={statusFilter !== "" ? 1 : 0}
          />
        }
      />

      {/* ==================== ADD / EDIT HSN MODAL (Shared) ==================== */}

      <AddHsnModal
        isOpen={Boolean(modalMode)}
        resetForm={closeModal}
        handleSubmit={handleHsnSubmit}
        mode={modalMode || "add"}
        initialData={editData}
        showActive={true}
      />

      {/* ==================== DELETE CONFIRMATION ==================== */}

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete HSN Code"
        message={`Delete HSN code "${deleteTarget?.code}"? This cannot be undone.`}
        variant="danger"
        confirmText="Delete"
      />
    </div>
  );
};

export default HsnCode;
