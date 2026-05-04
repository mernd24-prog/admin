import React, { useMemo, useState } from "react";
import AddButton from "../../components/Button/AddButton";
import TableData from "../../components/Atoms/TableData/TableData";
import { FaSearch } from "react-icons/fa";
import Input from "../../components/Atoms/Input/Input";
import SearchComponent from "../../components/Atoms/New Table/NewTable";
import ToggleButton from "../../components/Atoms/ToggleButton/ToggleButton";

const dummyStores = [
  {
    id: 1,
    shopName: "New Store",
    contactPerson: "Updated",
    address: "456 New Tech Street",
    mobile: "+91 9237890335",
    email: "store1@example.com",
    openingHours: "12:00 AM - 12:00 AM",
    createdOn: "5/21/2025",
    status: true,
  },
  {
    id: 2,
    shopName: "New Store",
    contactPerson: "Updated",
    address: "456 New Tech Street",
    mobile: "+91 9237890335",
    email: "store1@example.com",
    openingHours: "12:00 AM - 12:00 AM",
    createdOn: "5/21/2025",
    status: true,
  },
  // ...repeat similar objects for more rows
];

// Constants
const INITIAL_FILTERS = {
  search: "",
};

const StorePage = () => {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const TABLE_HEADINGS = [
    "#",
    "Shop Name",
    "Contact Person",
    "Address",
    "Mobile",
    "Email",
    "Opening Hours",
    "Created On",
    "Status",
  ];

  const tableRows = useMemo(
    () =>
      dummyStores
        .map((item, index) => [
          <span key={`index-${item.id}`}>{index + 1}</span>,
          <span key={`shop-${item.id}`}>{item.shopName}</span>,
          <span key={`contact-${item.id}`}>{item.contactPerson}</span>,
          <span key={`address-${item.id}`}>{item.address}</span>,
          <span key={`mobile-${item.id}`}>{item.mobile}</span>,
          <span key={`email-${item.id}`}>{item.email}</span>,
          <span key={`hours-${item.id}`}>{item.openingHours}</span>,
          <span key={`created-${item.id}`}>{item.createdOn}</span>,
          <ToggleButton
          // key={`toggle-${supplier._id}`}
          // isToggle={!supplier?.isApproved}
          // handleClick={() => handleApproveToggle(supplier)}
        />,
        ]),
    [search]
  );

  return (
    <div className="p-4  sm:p-6 mx-auto overflow-auto max-w-7xl">
      {/* Header */}
      <div className="flex flex-col  sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Store</h1>
        </div>

        {/*  Add */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <AddButton>Add New</AddButton>
        </div>
      </div>

      {/* search component */}
      <div className="w-full border-b flex items-center flex-wrap md:flex-nowrap justify-between">
        <div className="mt-[10px] w-full ">
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

      {/* Table */}
      <div className="bg-white rounded shadow-sm p-4 overflow-auto">
        <TableData
          tableHeadings={TABLE_HEADINGS}
          data={tableRows}
          showHeadingDiv={false}
          rowDataKey="id"
          sortableColumns={[]}
          isHeaderCheckbox={false}
        />
      </div>
    </div>
  );
};

export default StorePage;
