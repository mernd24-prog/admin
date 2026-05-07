/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { ActionButtons, getStatusStyles } from '../../../components/Atoms/TableActionButton/TableActionButton';
import TableData from '../../../components/Atoms/TableData/TableData';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import ImageViewer from '../../../components/ImageViewer/ImageViewer';
import { useNavigate } from 'react-router-dom';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';

const SubscriptionOrders = () => {
  const navigate = useNavigate();
  const [apiRes, setApiRes] = useState([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedRow, setSelectedRow] = useState([])
  const [loading] = useState(false)
  const [filters, setFilters] = useState({
    search: ""
  })

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  const dummy = [
    {
      id: "O6721742856-1",
      image: "https://demo.yo-kart.com/image/user/21/MINITHUMB/1?t=1606880703",
      name: "PawanDZ",
      email: "pawan1985chd@dummyid.com",
      date: "09/07/2024 14:24",
      amt: "$150.00",
      sta: "Pending"
    },
    {
      id: "O6721742856-2",
      image: "https://demo.yo-kart.com/image/user/23/MINITHUMB/2?t=1606880803",
      name: "AliceW",
      email: "alice@dummyid.com",
      date: "10/07/2024 10:30",
      amt: "$200.00",
      sta: "Paid"
    },
    {
      id: "O6721742856-3",
      image: "https://demo.yo-kart.com/image/user/24/MINITHUMB/3?t=1606880903",
      name: "JohnDoe",
      email: "john@dummyid.com",
      date: "11/07/2024 08:15",
      amt: "$100.00",
      sta: "Pending"
    },
    {
      id: "O6721742856-4",
      image: "https://demo.yo-kart.com/image/user/25/MINITHUMB/4?t=1606881003",
      name: "SaraK",
      email: "sara@dummyid.com",
      date: "12/07/2024 12:45",
      amt: "$175.00",
      sta: "Paid"
    },
    {
      id: "O6721742856-5",
      image: "https://demo.yo-kart.com/image/user/26/MINITHUMB/5?t=1606881103",
      name: "MikeP",
      email: "mike@dummyid.com",
      date: "13/07/2024 09:00",
      amt: "$130.00",
      sta: "Pending"
    }
  ];

  const handleViewOrders = () => {
    navigate("/app/view-subscription-orders");
  };

  useEffect(() => {
    setApiRes(dummy);
  }, []);

  const tableHeadings = [
    "Order ID",
    "Buyer",
    "Order's Date & Time",
    "Amount",
    "Payment Status",
    "Actions"
  ];
  const handleRowCheckboxChange = (e, rowId) => {
    console.log(e.target.checked, rowId)
    if (e.target.checked) {
      setSelectedRow(prev => {
        return [...prev, rowId];
      });
    } else {
      setSelectedRow(prev => {
        return prev.filter(id => id !== rowId);
      });
    }
  };


  const tableRows = apiRes?.map((ele) => {
    const statusStyle = getStatusStyles({ status: ele.sta });
    const isSelected = selectedRow.includes(ele._id);
    return [
      <input
        key={`checkbox-${ele._id}`}
        type="checkbox"
        checked={isSelected}
        onChange={(e) => handleRowCheckboxChange(e, ele._id)}
        className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
      />,
      ele?.id,
      <span className="flex items-center space-x-2 cursor-pointer" onClick={() => handleImageClick(ele?.image)}>
        <img src={ele?.image} alt="User" className="object-cover w-12 h-12 border rounded-full" />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{ele?.name}</span>
          <span className="text-sm text-gray-500">{ele?.email}</span>
        </div>
      </span>,
      ele?.date,
      ele?.amt,
      <span className={`px-2 py-1 rounded text-sm font-medium ${statusStyle}`}>
        {ele.sta}
      </span>,
      <span>
        <ActionButtons
          onDelete={() => setShowDeleteConfirmation(true)}
          showLinkButton={false}
          showViewButton={true}
          showWarningButton={false}
          showEditButton={false}
          onView={handleViewOrders}
        />
      </span>
    ];
  });

  return (
    <>
      <div className="p-3 overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl mx-auto">
        <h3 className='text-gray-500 text-sm font-semibold py-6'>Home / <span className='text-[#181c32]'>Subscription Orders</span></h3>

        <div className="p-4 overflow-auto bg-white ">
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
            isApprovalOptions={true}
            isProduct={false}
            isUser={true}
            isActionButton={true}
            isSearchDown={true}
            isStatusAction={false}
            userLable={`Buyer`}
            isDelete={true}
            activationStatus={`Payment Status`} approvalStatus={`Order Status`}
            dateFrom={true} dateTo={true} orderFrom={true} orderTo={true}

          />
          <TableData
            Heading="Subscription Orders"
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            placeholder="Search by..."
            showFilter={false}
            showSummary={false}
            showAddButton={false}
            isHeaderCheckbox={true}
          />
        </div>
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

export default SubscriptionOrders;
