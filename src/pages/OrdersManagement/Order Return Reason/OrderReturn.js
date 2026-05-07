/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import TableData from '../../../components/Atoms/TableData/TableData';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import ImageViewer from '../../../components/ImageViewer/ImageViewer';
import { useNavigate } from 'react-router-dom';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import Button from '../../../components/Atoms/buttons/button';
import { IoMdAddCircleOutline } from 'react-icons/io';

const OrderReturn = () => {
  const navigate = useNavigate();
  const [apiRes, setApiRes] = useState([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedRow, setSelectedRow] = useState([])
  const [loading] = useState(false)
  const [filters, setFilters] = useState({
    search: ""
  })

  // const handleImageClick = (imageUrl) => {
  //   setSelectedImage(imageUrl);
  // };

  const dummy = [
    {
      id: "O6450151299-1",
      image: "https://demo.yo-kart.com/image/user/21/MINITHUMB/1?t=1606880703",
      title: "I am not able to contact the seller",
      email: "tom@dummyid.com",
      date: "14/02/2025 16:16",
      amt: "$10,335.00",
      sta: "Paid"
    },

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
    "Reason Title", "Actions"
  ];

  const tableRows = apiRes?.map((ele) => {
    // const statusStyle = getStatusStyles({ status: ele.sta });
    const isSelected = selectedRow.includes(ele._id);

    return [
      <input
        key={`checkbox-${ele._id}`}
        type="checkbox"
        checked={isSelected}
        onChange={(e) => handleRowCheckboxChange(e, ele._id)}
        className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
      />,
      ele?.title,
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
        <header className='flex justify-between place-items-center'>
          <h3 className='text-gray-500 text-sm font-semibold py-6'>Home / <span className='text-[#181c32]'>Order Return Reasons </span></h3>
          <Button className={` border-2 border-[#0073cf] text-[#0073cf] bg-transparent rounded-[1px] transition-colors duration-150 hover:bg-[#0073cf] hover:text-black`}>
            <IoMdAddCircleOutline />
            Add
          </Button>
        </header>
        <section className='bg-white p-2'>
          <SearchComponent
            tableHeadings={tableHeadings}
            data={tableRows}
            selectedRow={selectedRow}
            setSelectedRow={setSelectedRow}
            loading={loading}
            filters={filters}
            setFilters={setFilters}
            isSearchShow={false}
            isActivationStatus={true}
            isApprovalOptions={false}
            isProduct={false}
            isUser={true}
            isActionButton={true}
            isSearchDown={false}
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

export default OrderReturn;