/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import TableData from '../../../components/Atoms/TableData/TableData';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import { deleteContentPage, getContentPages, updateContentPage } from '../../../Redux/adminCoreSlice';

const PAGE_TYPE = 'order_status';

const extractList = (payload) => {
  const root = payload?.data?.data || payload?.data || {};
  return root.list || root.items || root.rows || [];
};

const OrderStatus = () => {
  const dispatch = useDispatch();
  const adminCoreSelector = useSelector((state) => state.adminCore);

  const [apiRes, setApiRes] = useState([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedRow, setSelectedRow] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const loadOrderStatuses = async () => {
    try {
      const response = await dispatch(getContentPages({ pageType: PAGE_TYPE, limit: 200 })).unwrap();
      setApiRes(extractList(response));
    } catch (error) {
      toast.error(error?.message || 'Failed to load order statuses');
    }
  };

  useEffect(() => {
    loadOrderStatuses();
  }, []);

  const loading = adminCoreSelector?.contentPagesData?.loading;

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
        <ToggleButton isOn={Boolean(item?.metadata?.active ?? true)} toggle={() => handleToggleStatus(item)} />
      </span>,
      <span key={`action-${rowId}`}>
        <ActionButtons
          onDelete={() => {
            setSelectedRecord(item);
            setShowDeleteConfirmation(true);
          }}
          showLinkButton={false}
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
            isLoading={loading}
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
