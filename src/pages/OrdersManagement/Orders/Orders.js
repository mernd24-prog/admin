/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import TableData from '../../../components/Atoms/TableData/TableData';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import ImageViewer from '../../../components/ImageViewer/ImageViewer';
import { Link, useNavigate } from 'react-router-dom';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import { getOrderList } from '../../../Redux/orderSlice';
import { toast } from 'sonner';
import { useDispatch, useSelector } from 'react-redux';
import Loader from '../../../components/Loader/Loader';
import Pagination from '../../../components/Pagination/Pagination';
import moment from 'moment';
import selectJson from '../../../_helpers/SelectJson.json'
import { getAllUserList } from '../../../Redux/userManagementSlice';

const Orders = () => {
  const dispatch = useDispatch()
  const selector = useSelector(state => state.order)
  const user = useSelector(state => state)
  const { getOrderListData: { data: { data: { list = [], total = 0 } = {} } = {} } = {} } = selector || {};

  const navigate = useNavigate();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedRow, setSelectedRow] = useState([])
  const [loading] = useState(false)
  const [filters, setFilters] = useState({
    search: "", activationStatus: '', dateFrom: "", dateTo: "", orderTo: "", orderFrom: "", sellerName: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [pageNo, setPageNo] = useState(1)
  const size = 10

  const transformUserData = (user) => {
    try {
      return user?.user?.getAllUserListData?.data?.data?.list?.map((user) => ({
        value: user?._id || '',
        label: `${user?.email || 'No email'} - ${user?.phone || 'No phone'}`
      })) || [];
    } catch (error) {
      console.error('Error transforming user data:', error);
      return [];
    }
  };

  const userListData = transformUserData(user)

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true);

        const query = {};
        if (filters?.activationStatus) {
          query.paymentStatus = filters.activationStatus;
        }
        if (filters?.dateFrom) {
          query.fromDate = filters.dateFrom;
        }
        if (filters?.dateTo) {
          query.toDate = filters.dateTo;
        }
        if (filters?.orderFrom) {
          query.orderFrom = filters.orderFrom;
        }
        if (filters?.orderTo) {
          query.orderTo = filters.orderTo;
        }
        if (filters?.sellerName) {
          query.user_id = filters.sellerName;
        }


        const apiPayload = {
          size: size,
          page: pageNo,
          select: "order_no, user_id, totalAmount, paymentStatus, updatedAt, createdAt,status",
          populate: "user_id:email,full_name,country_code,phone,user_image|user_id.country_code:dialCode,name",
          keyWord: filters?.search || "",
          query: JSON.stringify(query)
        };

        await dispatch(getOrderList(apiPayload)).unwrap();
      } catch (err) {
        toast.error('Failed to fetch product reviews. Please try again.');
        console.error('Review fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const apiPayload = {
      searchFields: "email,phone",
      select: ""
    }

    fetchReviews();
    dispatch(getAllUserList(apiPayload))

  }, [dispatch, pageNo, filters]);


  const handleViewOrders = (order) => {

    navigate(`/app/orders/view/${order._id || order.id || order.order_no}`,);

  };


  const handlePageChange = useCallback((newPageNo) => {
    setPageNo(newPageNo)
  }, [])

  const tableHeadings = [
    "Order ID",
    "Buyer",
    "Order's Date & Time",
    "Amount",
    "Payment Status",
    "Action"
  ];

  const tableRows = list?.map((ele) => [

    <span className='capitalize'>{ele?.order_no || ele?.id}</span>,
    <p>
      {typeof ele?.user_id === "object" ? (
        <>
          {ele?.user_id?.phone && <span>{ele.user_id.phone}</span>}
          {ele?.user_id?.phone && ele?.user_id?.email && <br />}
          {ele?.user_id?.email && <span>{ele.user_id.email}</span>}
        </>
      ) : (
        <span>{ele?.buyerId || ele?.buyer_id || ele?.user_id || "N/A"}</span>
      )}
    </p>
    ,
    <span>{ele?.createdAt ? moment(ele.createdAt).format('DD-MM-YYYY') : "N/A"}</span>,
    ele?.totalAmount ?? ele?.total_amount ?? 0,
    <span className='capitalize'>{ele?.paymentStatus || ele?.status || "N/A"}</span>,
    <ActionButtons
      showLinkButton={false}
      showDeleteButton={false}
      showViewButton={false}
      showEditButton={false}
      viewButton={true}
      onViewClick={() => handleViewOrders(ele)}

    />
  ]);

  const applyFilters = async () => {

    try {
      setIsLoading(true);
      const apiPayload = {
        size: size,
        page: pageNo,
        select: "order_no, user_id, totalAmount, paymentStatus, updatedAt, createdAt",
        searchFields: "order_no",
        populate: "user_id:email,full_name,country_code,phone,user_image|user_id.country_code:dialCode,name",
        keyWord: filters?.search
      };
      await dispatch(getOrderList(apiPayload)).unwrap();
    } catch (err) {
      toast.error('Failed to fetch product reviews. Please try again.');
      console.error('Review fetch error:', err);
    } finally {
      setIsLoading(false);
    }

  }

  const handleSearchRemove = async () => {
    setFilters({ search: "" })
    try {
      setIsLoading(true);
      const apiPayload = {
        size: size,
        page: pageNo,
        select: "order_no, user_id, totalAmount, paymentStatus, updatedAt, createdAt",
        populate: "user_id:email,full_name,country_code,phone,user_image|user_id.country_code:dialCode,name",
        keyWord: ""
      };
      await dispatch(getOrderList(apiPayload)).unwrap();
    } catch (err) {
      toast.error('Failed to fetch product reviews. Please try again.');
      console.error('Review fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleFilterChange = (field, value) => {
    console.log("react select filter:", field, value)
    setFilters(prev => ({
      ...prev,
      [field]: value.value
    }));
  }

  console.warn(filters)

  return (
    <>
      <Loader loading={isLoading} />
      <div className="p-3 max-w-7xl mx-auto">
        <h3 className='text-gray-500 text-sm font-semibold py-6'><Link to={`/app/home`}>Home</Link> / <span className='text-[#181c32]'>Order</span></h3>
        <section className='bg-white p-2'>
          <SearchComponent
            tableHeadings={tableHeadings}
            data={tableRows}
            selectedRow={selectedRow}
            setSelectedRow={setSelectedRow}
            loading={loading}
            filters={filters}
            setFilters={setFilters}
            isSearchShow={true}
            isActivationStatus={true}
            isApprovalOptions={false}
            isProduct={false}
            isUser={true}
            isActionButton={false}
            isSearchDown={true}
            isStatusAction={false}
            userLable={`Buyer`}
            userOptions={userListData || []}
            isDelete={false}
            activationStatus={`Payment Status`}
            approvalStatus={`Order Status`}
            dateFrom={true}
            dateTo={true}
            orderFrom={true}
            orderTo={true}
            applyFilters={applyFilters}
            handleSearchRemove={handleSearchRemove}
            approvalOptions={selectJson?.ORDER_STATUS}
            activationStatusOptions={selectJson?.PAYMENT_STATUS}
            handleFilterChange={handleFilterChange}
          />
          <div className="bg-white">
            <TableData
              Heading="Orders"
              tableHeadings={tableHeadings}
              data={tableRows}
              showSearch={true}
              placeholder="Search by..."
              showFilter={false}
              showSummary={false}
              showAddButton={false}
              isHeaderCheckbox={false}
              totalData={total}
            />
          </div>
        </section>
        {total > size && (
          <Pagination
            totalPages={Math.ceil(total / size)}
            currentPage={pageNo}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      <DeletePopup
        isDeleteModalOpen={showDeleteConfirmation}
        closeDeleteModal={() => setShowDeleteConfirmation(false)}
        DeleteHeading="Are you sure you want to delete?"
      />

      <ImageViewer
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </>
  );
};

export default Orders;
