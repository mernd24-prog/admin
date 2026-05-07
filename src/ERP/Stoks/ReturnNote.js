import React, { useMemo, useState } from "react";
import AddButton from "../../components/Button/AddButton";
import TableData from "../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import SearchComponent from "../../components/Atoms/New Table/NewTable";

const dummyData = [
  {
    id: 1,
    medicine: "Medicine H",
    supplier: "Loren Campbell",
    poNumber: "1242345",
    receivedCount: 15,
    acceptedCount: 10,
    returnedCount: 5,
    expiryDate: "11-05-2027",
    image: "https://via.placeholder.com/40",
    batchNo: "GH76372Y",
    hsnCode: "Generic H",
  },
  {
    id: 2,
    medicine: "Medicine H",
    supplier: "Aidan Smith",
    poNumber: "1242345",
    receivedCount: 15,
    acceptedCount: 10,
    returnedCount: 5,
    expiryDate: "11-05-2027",
    image: "https://via.placeholder.com/40",
    batchNo: "GH76372Y",
    hsnCode: "Generic H",
  },
  {
    id: 3,
    medicine: "Medicine H",
    supplier: "Steve Smith",
    poNumber: "1242345",
    receivedCount: 15,
    acceptedCount: 10,
    returnedCount: 5,
    expiryDate: "11-05-2027",
    image: "https://via.placeholder.com/40",
    batchNo: "GH76372Y",
    hsnCode: "Generic H",
  },
  {
    id: 4,
    medicine: "Medicine H",
    supplier: "Arnold Schneider",
    poNumber: "1242345",
    receivedCount: 15,
    acceptedCount: 10,
    returnedCount: 5,
    expiryDate: "07-06-2025",
    image: "https://via.placeholder.com/40",
    batchNo: "GH76372Y",
    hsnCode: "Generic H",
  },
  {
    id: 5,
    medicine: "Medicine H",
    supplier: "Petra Baechtin",
    poNumber: "1242345",
    receivedCount: 15,
    acceptedCount: 10,
    returnedCount: 5,
    expiryDate: "11-05-2027",
    image: "https://via.placeholder.com/40",
    batchNo: "GH76372Y",
    hsnCode: "Generic H",
  },
];


// Constants
const INITIAL_FILTERS = {
    search: "",
  };

const ReturnNote = () => {
 
  const [date, setDate] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const TABLE_HEADINGS = [
    "#",
    "Medicine",
    "Supplier",
    "PO No.",
    "Received Count",
    "Accepted Count",
    "Returned Count",
    "Expiry Date",
    "Actions",
  ];

  const tableRows = useMemo(
    () =>
      dummyData
        .map((item, index) => [
          <span key={`index-${item.id}`}>{index + 1}</span>,
          <div key={`medicine-${item.id}`} className="flex items-center gap-2">
            <img
              src={item.image}
              alt="medicine"
              className="w-10 h-10 rounded"
            />
            <div>
              <div className="font-medium text-sm">{item.medicine}</div>
              <div className="text-xs text-gray-500">
                Batch No: {item.batchNo}
              </div>
              <div className="text-xs text-gray-500">
                HSN Code: {item.hsnCode}
              </div>
            </div>
          </div>,
          <span key={`supplier-${item.id}`}>{item.supplier}</span>,
          <span key={`po-${item.id}`}>{item.poNumber}</span>,
          <span key={`received-${item.id}`}>{item.receivedCount}</span>,
          <span key={`accepted-${item.id}`}>{item.acceptedCount}</span>,
          <span key={`returned-${item.id}`}>{item.returnedCount}</span>,
          <span key={`expiry-${item.id}`}>{item.expiryDate}</span>,
          <ActionButtons
            key={`actions-${item.id}`}
            showViewButton={true}
            showEditButton={true}
            showDeleteButton={true}
            onEdit={() => {}}
          />,
        ]),
    []
  );

  return (
    <div className="p-4 sm:p-6 mx-auto overflow-auto max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold pl-3">Return Note</h1>
          <h3 className="text-sm text-gray-500 font-medium">
            Dashboard / Inventory /{" "}
            <span className="text-[#181c32]">Return Note</span>
          </h3>
        </div>
        <AddButton onClick={() => {}}>Add New Goods</AddButton>
      </div>

      {/* Filters */}
      <div className="w-full bg-white">
        <div className="p-2 border-b flex items-center flex-wrap md:flex-nowrap justify-between">
          <div className="mt-[10px]">
            <SearchComponent
              tableHeadings={TABLE_HEADINGS}
              data={tableRows}
              //   selectedRow={selectedRow}
              //   setSelectedRow={setSelectedRow}
              //   loading={loading}
              filters={filters}
              //   setFilters={setFilters}
              isSearchShow={true}
              isActivationStatus={false}
              isApprovalOptions={false}
              isCategory={true}
              isProduct={true}
              isProductType={true}
              isUser={true}
              //   applyFilters={handleSearchApply}
              //   handleSearchRemove={clearFilters}
              isActionButton={true}
              isStatusAction={false}
              // handleAction={handleBulkAction}
              // mobailClassName="!gap-0"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow-sm p-4 overflow-auto">
        <TableData
          tableHeadings={TABLE_HEADINGS}
          data={tableRows}
          showHeadingDiv={false}
          rowDataKey="id"
          sortableColumns={[1, 2, 3]}
          isHeaderCheckbox={false}
        />
      </div>
    </div>
  );
};

export default ReturnNote;
