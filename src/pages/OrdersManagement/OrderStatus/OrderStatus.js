/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react'
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import TableData from '../../../components/Atoms/TableData/TableData';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';


const OrderStatus = () => {
  const [apiRes, setApiRes] = useState([])
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [selectedRow, setSelectedRow] = useState([])

  const transactionData = [
    {
      osp: "1",
      osn: "Payment Pending",
      action: "",
      st: ""
    },
    {
      osp: "2",
      osn: "Payment Pending",
      action: "",
      st: ""
    },
    {
      osp: "2",
      osn: "Payment Pending",
      action: "",
      st: ""
    },
    {
      osp: "2",
      osn: "Payment Pending",
      action: "",
      st: ""
    },
    {
      osp: "1",
      osn: "Payment Pending",
      action: "",
      st: ""
    },

  ];

  useEffect(() => {
    setApiRes(transactionData)
  }, [])

  const tableHeadings = [
   <div className="flex items-center gap-2">
      <input
        type="checkbox"
        className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
      />
      <span>Order status priority</span>
    </div>,
    "Order Status Name",
    "Status",
    "Action"
  ]
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
  const tableRows = apiRes?.map((ele, index) => {
    const isSelected = selectedRow.includes(ele._id);
    return [
      <span className="inline-flex items-center gap-x-5">
        <input
          key={`checkbox-${ele._id}`}
          type="checkbox"
          checked={isSelected}
          onChange={(e) => handleRowCheckboxChange(e, ele._id)}
          className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out mr-2"
        />
        {ele?.osp}
      </span>,

      ele?.osn,
      <span>
        <ToggleButton />
      </span>,
      <span>
        <ActionButtons onDelete={() => setShowDeleteConfirmation(true)} showLinkButton={false} />
      </span>
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
            placeholder='Search by...'
            showFilter={false}
            showSummary={false}
            showAddButton={false}
          />
        </div>
      </div>
      <DeletePopup
        isDeleteModalOpen={showDeleteConfirmation}
        closeDeleteModal={() => setShowDeleteConfirmation(false)}
        // confirmDelete={confirmDelete}
        DeleteHeading={'Are you sure you want to delete?'}
      />
    </>
  )
}

export default OrderStatus