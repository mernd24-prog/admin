/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { ActionButtons, getStatusStyles } from '../../../components/Atoms/TableActionButton/TableActionButton';
import TableData from '../../../components/Atoms/TableData/TableData';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import ImageViewer from '../../../components/ImageViewer/ImageViewer';
import { useNavigate } from 'react-router-dom';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';

const GiftCardOrder = () => {
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
      id: "O6450151299-1",
      image: "https://demo.yo-kart.com/image/user/21/MINITHUMB/1?t=1606880703",
      name: "Tom Hanks(Tomhanks)",
      email: "tom@dummyid.com",
      date: "14/02/2025 16:16",
      amt: "$10,335.00",
      sta: "Paid"
    },
    {
      id: "O6450151299-2",
      image: "https://demo.yo-kart.com/image/user/21/MINITHUMB/1?t=1606880703",
      name: "Emma Watson(emmawatson)",
      email: "emma@dummyid.com",
      date: "15/02/2025 12:10",
      amt: "$9,200.00",
      sta: "Paid"
    }
  ];

  const handleViewOrders = () => {
    navigate("/app/view-orders");
  };

  useEffect(() => {
    setApiRes(dummy);
  }, []);

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



  const tableHeadings = [
    "Order ID", "Buyer", "Receiver name", "Receiver email", "Order's Date & Time", "Amount", "Payment Status", "Actions"
  ];

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
          onView={handleViewOrders}
          showEditButton={false}
        />
      </span>
    ];
  });

  return (
    <>
      <div className="p-3 overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl mx-auto">
        <h3 className='text-gray-500 text-sm font-semibold py-6'>Home / <span className='text-[#181c32]'>Gift Card Orders</span></h3>
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
            isActionButton={true}
            isSearchDown={true}
            isStatusAction={false}
            userLabel={`Buyer`}
            isDelete={true}
            activationStatus={`Payment Status`} approvalStatus={`Order Status`}
            dateFrom={true} dateTo={true} orderFrom={true} orderTo={true}

          />
          <div className=" bg-white border border-[#E6E6E6]">
            <TableData
              Heading="Orders"
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
        </section>

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

export default GiftCardOrder;