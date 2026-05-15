/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import TableData from '../../../components/Atoms/TableData/TableData';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import { createContentPage, deleteContentPage, getContentPages, updateContentPage } from '../../../Redux/adminCoreSlice';

const PAGE_TYPE = 'order_status';

const extractList = (payload) => {
  const root = payload?.data?.data || payload?.data || payload || {};
  return root.list || root.items || root.rows || [];
};

const toStatusRow = (status) => ({
  slug: status.slug,
  title: status.title,
  pageType: PAGE_TYPE,
  body: `${status.title} order status`,
  metadata: {
    name: status.title,
    status: status.status,
    priority: status.priority,
    active: true,
    isDefault: true,
  },
});

const DEFAULT_ORDER_STATUSES = [
  { slug: 'order-status-pending-payment', title: 'Pending Payment', status: 'pending_payment', priority: 1 },
  { slug: 'order-status-payment-failed', title: 'Payment Failed', status: 'payment_failed', priority: 2 },
  { slug: 'order-status-confirmed', title: 'Confirmed', status: 'confirmed', priority: 3 },
  { slug: 'order-status-packed', title: 'Packed', status: 'packed', priority: 4 },
  { slug: 'order-status-shipped', title: 'Shipped', status: 'shipped', priority: 5 },
  { slug: 'order-status-delivered', title: 'Delivered', status: 'delivered', priority: 6 },
  { slug: 'order-status-return-requested', title: 'Return Requested', status: 'return_requested', priority: 7 },
  { slug: 'order-status-returned', title: 'Returned', status: 'returned', priority: 8 },
  { slug: 'order-status-cancelled', title: 'Cancelled', status: 'cancelled', priority: 9 },
  { slug: 'order-status-fulfilled', title: 'Fulfilled', status: 'fulfilled', priority: 10 },
];

const OrderStatus = () => {
  const dispatch = useDispatch();
  const adminCoreSelector = useSelector((state) => state.adminCore);

  const [apiRes, setApiRes] = useState([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedRow, setSelectedRow] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const seedDefaultOrderStatuses = async () => {
    await Promise.all(DEFAULT_ORDER_STATUSES.map((status) =>
      dispatch(createContentPage({
        slug: status.slug,
        title: status.title,
        pageType: PAGE_TYPE,
        body: `${status.title} order status`,
        published: true,
        metadata: {
          name: status.title,
          status: status.status,
          priority: status.priority,
          active: true,
        },
      })).unwrap().catch(() => null),
    ));
  };

  const loadOrderStatuses = async () => {
    try {
      setIsLoading(true);
      const response = await dispatch(getContentPages({ pageType: PAGE_TYPE, limit: 100 })).unwrap();
      let list = extractList(response);
      if (!list.length) {
        await seedDefaultOrderStatuses();
        const seededResponse = await dispatch(getContentPages({ pageType: PAGE_TYPE, limit: 100 })).unwrap();
        list = extractList(seededResponse);
      }
      setApiRes(list.length ? list : DEFAULT_ORDER_STATUSES.map(toStatusRow));
    } catch (error) {
      setApiRes(DEFAULT_ORDER_STATUSES.map(toStatusRow));
      toast.error(error?.message || error || 'Failed to load order statuses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrderStatuses();
  }, []);

  const loading = isLoading || adminCoreSelector?.loading;

  const tableHeadings = useMemo(() => ([
    <div className="flex items-center gap-2" key="order-status-priority-header">
      <input
        type="checkbox"
        className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
      />
      <span>Order status priority</span>
    </div>,
    'Order Status Name',
    'Status',
    'Action',
  ]), []);

  const handleRowCheckboxChange = (e, rowId) => {
    if (e.target.checked) {
      setSelectedRow((prev) => [...prev, rowId]);
      return;
    }
    setSelectedRow((prev) => prev.filter((id) => id !== rowId));
  };

  const handleToggleStatus = async (item) => {
    try {
      const currentMetadata = item?.metadata || {};
      await dispatch(updateContentPage({
        slug: item.slug,
        title: item.title,
        pageType: item.pageType || PAGE_TYPE,
        body: item.body || `${item.title || item.slug} order status`,
        metadata: {
          ...currentMetadata,
          active: !(currentMetadata.active ?? true),
        },
      })).unwrap();
      await loadOrderStatuses();
      toast.success('Status updated successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to update status');
    }
  };

  const confirmDelete = async () => {
    if (!selectedRecord?.slug) return;
    try {
      await dispatch(deleteContentPage({ slug: selectedRecord.slug })).unwrap();
      toast.success('Order status deleted successfully');
      setShowDeleteConfirmation(false);
      setSelectedRecord(null);
      await loadOrderStatuses();
    } catch (error) {
      toast.error(error?.message || 'Failed to delete order status');
    }
  };

  const tableRows = apiRes?.map((item) => {
    const rowId = item?._id || item?.slug;
    const isSelected = selectedRow.includes(rowId);
    const statusPriority = item?.metadata?.priority || item?.metadata?.order || '-';
    const statusName = item?.title || item?.metadata?.name || item?.slug || '-';
    const isDefaultFallback = item?.metadata?.isDefault && !item?._id;

    return [
      <span className="inline-flex items-center gap-x-5" key={`priority-${rowId}`}>
        <input
          key={`checkbox-${rowId}`}
          type="checkbox"
          checked={isSelected}
          onChange={(e) => handleRowCheckboxChange(e, rowId)}
          className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out mr-2"
        />
        {statusPriority}
      </span>,
      statusName,
      <span key={`status-${rowId}`}>
        <ToggleButton isToggle={Boolean(item?.metadata?.active ?? true)} handleClick={isDefaultFallback ? undefined : () => handleToggleStatus(item)} />
      </span>,
      <span key={`action-${rowId}`}>
        <ActionButtons
          onDelete={() => {
            setSelectedRecord(item);
            setShowDeleteConfirmation(true);
          }}
          showLinkButton={false}
          showDeleteButton={!isDefaultFallback}
        />
      </span>,
    ];
  });

  return (
    <>
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto'>
        <div className='p-4 overflow-auto overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]'>
          <TableData
            Heading="Order Status"
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            placeholder='Search by status...'
            showFilter={false}
            showSummary={false}
            showAddButton={false}
            loading={loading}
            totalData={tableRows.length}
          />
        </div>
      </div>
      <DeletePopup
        isDeleteModalOpen={showDeleteConfirmation}
        closeDeleteModal={() => {
          setShowDeleteConfirmation(false);
          setSelectedRecord(null);
        }}
        confirmDelete={confirmDelete}
        DeleteHeading={'Are you sure you want to delete?'}
      />
    </>
  )
}

export default OrderStatus
