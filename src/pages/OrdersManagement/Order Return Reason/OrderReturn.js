/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import moment from 'moment';
import { toast } from 'sonner';
import { useDispatch, useSelector } from 'react-redux';
import { ActionButtons, getStatusStyles } from '../../../components/Atoms/TableActionButton/TableActionButton';
import TableData from '../../../components/Atoms/TableData/TableData';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import Loader from '../../../components/Loader/Loader';
import Pagination from '../../../components/Pagination/Pagination';
import { getOrderList } from '../../../Redux/orderSlice';
import useDropdownOptions from '../../../hooks/useDropdownOptions';

const PAGE_SIZE = 10;

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const orderIdOf = (order = {}) => firstDefined(order._id, order.id, order.order_no, order.orderId);

const OrderReturn = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selector = useSelector((state) => state.order);

  const listPayload = selector?.getOrderListData?.data?.data || {};
  const list = listPayload?.list || [];
  const total = Number(listPayload?.total || 0);

  const [filters, setFilters] = useState({
    search: '',
    activationStatus: 'return_requested',
    dateFrom: '',
    dateTo: '',
  });
  const [selectedRow, setSelectedRow] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const orderStatuses = useDropdownOptions('order-statuses');

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      await dispatch(
        getOrderList({
          page: pageNo,
          limit: PAGE_SIZE,
          status: filters.activationStatus || 'return_requested',
          fromDate: filters.dateFrom || undefined,
          toDate: filters.dateTo || undefined,
          keyWord: filters.search || undefined,
        }),
      ).unwrap();
    } catch (err) {
      toast.error(err?.message || err || 'Failed to fetch return records');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, pageNo, filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleViewOrder = useCallback((order) => {
    const orderId = orderIdOf(order);
    if (!orderId) {
      toast.error('Order ID not found');
      return;
    }
    navigate(`/app/orders/view/${orderId}`);
  }, [navigate]);

  const handlePageChange = useCallback((newPageNo) => {
    setPageNo(newPageNo);
  }, []);

  const handleFilterChange = useCallback((field, option) => {
    setFilters((prev) => ({ ...prev, [field]: option?.value || '' }));
    setPageNo(1);
  }, []);

  const applyFilters = useCallback(() => {
    setPageNo(1);
    fetchOrders();
  }, [fetchOrders]);

  const handleSearchRemove = useCallback(() => {
    setFilters({
      search: '',
      activationStatus: 'return_requested',
      dateFrom: '',
      dateTo: '',
    });
    setPageNo(1);
  }, []);

  const tableHeadings = ['Order ID', 'Return Reason', 'Order Date & Time', 'Payment Status', 'Actions'];

  const tableRows = list.map((order) => {
    const paymentStatus = firstDefined(order?.paymentStatus, order?.status, 'N/A');
    const createdAt = firstDefined(order?.createdAt, order?.created_at);
    const reason = firstDefined(order?.returnReason, order?.return_reason, order?.reason, 'Not specified');

    return [
      <span className='capitalize'>{firstDefined(order?.order_no, order?.id, order?._id, 'N/A')}</span>,
      <span>{reason}</span>,
      <span>{createdAt ? moment(createdAt).format('DD-MM-YYYY HH:mm') : 'N/A'}</span>,
      <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusStyles({ status: paymentStatus })}`}>
        {paymentStatus}
      </span>,
      <ActionButtons
        showLinkButton={false}
        showDeleteButton={false}
        showViewButton={false}
        showEditButton={false}
        viewButton={true}
        onViewClick={() => handleViewOrder(order)}
      />,
    ];
  });

  return (
    <>
      <Loader loading={isLoading} />
      <div className="p-3 max-w-7xl mx-auto">
        <h3 className='text-gray-500 text-sm font-semibold py-6'>
          <Link to={`/app/home`}>Home</Link> / <span className='text-[#181c32]'>Order Return Reasons</span>
        </h3>
        <section className='bg-white p-2'>
          <SearchComponent
            tableHeadings={tableHeadings}
            data={tableRows}
            selectedRow={selectedRow}
            setSelectedRow={setSelectedRow}
            loading={isLoading}
            filters={filters}
            setFilters={setFilters}
            isSearchShow={true}
            isActivationStatus={true}
            isApprovalOptions={false}
            isProduct={false}
            isUser={false}
            isActionButton={false}
            isSearchDown={true}
            isStatusAction={false}
            isDelete={false}
            activationStatus={`Order Status`}
            dateFrom={true}
            dateTo={true}
            applyFilters={applyFilters}
            handleSearchRemove={handleSearchRemove}
            activationStatusOptions={orderStatuses.options}
            handleFilterChange={handleFilterChange}
          />
          <div className="bg-white border border-[#E6E6E6]">
            <TableData
              Heading="Order Return Reasons"
              tableHeadings={tableHeadings}
              data={tableRows}
              showSearch={true}
              placeholder="Search by order id or reason..."
              showFilter={false}
              showSummary={false}
              showAddButton={false}
              isHeaderCheckbox={false}
              totalData={total}
            />
          </div>
        </section>
        {total > PAGE_SIZE && (
          <Pagination
            totalPages={Math.ceil(total / PAGE_SIZE)}
            currentPage={pageNo}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </>
  );
};

export default OrderReturn;
