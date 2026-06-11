/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdCircle } from "react-icons/md";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  ConfirmModal,
} from "../../../components/Shared";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import {
  createContentPage,
  deleteContentPage,
  getContentPages,
  updateContentPage,
} from "../../../Redux/adminCoreSlice";
import { dropdownApi } from "../../../_helpers/dropdownApi";

const PAGE_TYPE = "order_status";

const extractList = (payload) => {
  const root = payload?.data?.data || payload?.data || payload || {};
  return root.list || root.items || root.rows || [];
};

const COLUMNS = [
  {
    key: "metadata.priority",
    label: "Priority",
    render: (_, row) => <span className="text-sm text-gray-500">{row?.metadata?.priority || "—"}</span>,
  },
  {
    key: "title",
    label: "Order Status Name",
    render: (v, row) => (
      <span className="font-medium text-gray-800">{v || row?.metadata?.name || row?.slug || "—"}</span>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (_, row) => (
      <StatusBadge status={row?.metadata?.active !== false ? "active" : "inactive"} dot />
    ),
  },
];

const OrderStatus = () => {
  const dispatch = useDispatch();
  const adminCoreSelector = useSelector((state) => state.adminCore);

  const [apiRes, setApiRes] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loading = isLoading || adminCoreSelector?.loading;

  const getSystemOrderStatuses = async () => {
    const options = await dropdownApi.getSystemOptions("order-statuses");
    return options.map((option, index) => ({
      slug: `order-status-${option.value.replace(/_/g, "-")}`,
      title: option.label,
      status: option.value,
      priority: index + 1,
    }));
  };

  const seedDefaultOrderStatuses = async (systemStatuses) => {
    await Promise.all(
      systemStatuses.map((status) =>
        dispatch(
          createContentPage({
            slug: status.slug,
            title: status.title,
            pageType: PAGE_TYPE,
            body: `${status.title} order status`,
            published: true,
            metadata: { name: status.title, status: status.status, priority: status.priority, active: true },
          })
        )
          .unwrap()
          .catch(() => null)
      )
    );
  };

  const loadOrderStatuses = async () => {
    try {
      setIsLoading(true);
      const systemStatuses = await getSystemOrderStatuses();
      const response = await dispatch(getContentPages({ pageType: PAGE_TYPE, limit: 100 })).unwrap();
      let list = extractList(response);
      if (!list.length) {
        await seedDefaultOrderStatuses(systemStatuses);
        const seededResponse = await dispatch(getContentPages({ pageType: PAGE_TYPE, limit: 100 })).unwrap();
        list = extractList(seededResponse);
      }
      setApiRes(
        list.length
          ? list
          : systemStatuses.map((s) => ({
              slug: s.slug,
              title: s.title,
              pageType: PAGE_TYPE,
              body: `${s.title} order status`,
              metadata: { name: s.title, status: s.status, priority: s.priority, active: true, isDefault: true },
            }))
      );
    } catch (error) {
      setApiRes([]);
      toast.error(error?.message || "Failed to load order statuses");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadOrderStatuses(); }, []);

  const handleToggleStatus = async (item) => {
    if (item?.metadata?.isDefault && !item?._id) return;
    try {
      await dispatch(
        updateContentPage({
          slug: item.slug,
          title: item.title,
          pageType: item.pageType || PAGE_TYPE,
          body: item.body || `${item.title || item.slug} order status`,
          metadata: { ...item.metadata, active: !(item?.metadata?.active ?? true) },
        })
      ).unwrap();
      toast.success("Status updated successfully");
      await loadOrderStatuses();
    } catch (error) {
      toast.error(error?.message || "Failed to update status");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.slug) return;
    try {
      await dispatch(deleteContentPage({ slug: deleteTarget.slug })).unwrap();
      toast.success("Order status deleted successfully");
      setDeleteTarget(null);
      await loadOrderStatuses();
    } catch (error) {
      toast.error(error?.message || "Failed to delete order status");
    }
  };

  const columnsWithToggle = [
    ...COLUMNS.slice(0, 2),
    {
      key: "active",
      label: "Active",
      render: (_, row) => (
        <ToggleButton
          isToggle={Boolean(row?.metadata?.active ?? true)}
          handleClick={row?.metadata?.isDefault && !row?._id ? undefined : () => handleToggleStatus(row)}
        />
      ),
    },
  ];

  const rowActions = (row) => {
    if (row?.metadata?.isDefault && !row?._id) return [];
    return [
      { label: "Delete", onClick: () => setDeleteTarget(row), danger: true },
    ];
  };

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
      <PageHeader
        title="Order Status"
        subtitle="Manage order workflow statuses"
        breadcrumbs={[{ label: "Orders Management" }, { label: "Order Status" }]}
      />

      <DataTable
        columns={columnsWithToggle}
        data={apiRes}
        loading={loading}
        totalCount={apiRes.length}
        rowActions={rowActions}
        searchPlaceholder="Search statuses…"
        emptyText="No order statuses found."
        emptyIcon={<MdCircle size={40} className="text-gray-200" />}
        requiredModule="orders"
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Order Status"
        message={`Delete order status "${deleteTarget?.title}"?`}
        variant="danger"
        confirmText="Delete"
      />
    </div>
  );
};

export default OrderStatus;
