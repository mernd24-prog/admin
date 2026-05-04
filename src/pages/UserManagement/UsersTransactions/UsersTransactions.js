/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react'
import TableData from '../../../components/Atoms/TableData/TableData';
import AddEditTransactionModal from './components/AddEditTransactionModal';

const UsersTransactions = () => {
  const [apiRes, setApiRes] = useState([])
  const [isTransactionModalOpen,setIsTransactionModalOpen]=useState(false)

  const transactionData = [
    {
      tnx: "TN-0005418",
      name: "Tom Hanks (Tomhanks)",
      date: "14/02/2025 16:16",
      credit: "$0.00",
      debit: "$10,335.00",
      desc: "Order Placed #O6450151299",
      status: "Transaction Completed"
    },
    {
      tnx: "TN-0005418",
      name: "Tom Hanks (Tomhanks)",
      date: "14/02/2025 16:16",
      credit: "$0.00",
      debit: "$10,335.00",
      desc: "Order Placed #O6450151299",
      status: "Transaction Completed"
    }, {
      tnx: "TN-0005418",
      name: "Tom Hanks (Tomhanks)",
      date: "14/02/2025 16:16",
      credit: "$0.00",
      debit: "$10,335.00",
      desc: "Order Placed #O6450151299",
      status: "Transaction Completed"
    }, {
      tnx: "TN-0005418",
      name: "Tom Hanks (Tomhanks)",
      date: "14/02/2025 16:16",
      credit: "$0.00",
      debit: "$10,335.00",
      desc: "Order Placed #O6450151299",
      status: "Transaction Completed"
    }, {
      tnx: "TN-0005418",
      name: "Tom Hanks (Tomhanks)",
      date: "14/02/2025 16:16",
      credit: "$0.00",
      debit: "$10,335.00",
      desc: "Order Placed #O6450151299",
      status: "Transaction Completed"
    },

  ];

  useEffect(() => {
    setApiRes(transactionData)
  }, [])
  const tableHeadings = [
    "Transaction ID",
    "User's Name",
    "Date",
    "Credit",
    "Debit",
    "Description",
    "Status"
  ]

  const tableRows = apiRes?.map((ele, index) => {
    return [
      ele?.tnx,
      ele?.name,
      ele?.date,
      ele?.credit,
      ele?.debit,
      ele?.desc,
      <span className='p-1 bg-sky-100 text-sky-600'>
        {ele?.status}
      </span>

    ];
  });

  return (
    <>
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto'>
        <div className='p-4 overflow-auto overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]'>
          <TableData
            Heading='Users Transactions'
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            placeholder='Search by...'
            showFilter={false}
            showSummary={false}
            showAddButton={true}
            addButtonLabel="Add"
          onClickFunction={() => {
            setIsTransactionModalOpen(true);
          }}
          />
        </div>
      </div>

      <AddEditTransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSubmit={(data) => console.log('Transaction:', data)}
        users={[{ name: 'John Doe', email: 'john@example.com' }]}
      />
    </>
  )
}

export default UsersTransactions