import React, { useMemo, useState } from "react";
import AddButton from "../../components/Button/AddButton";
import TableData from "../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import CustomCheckbox from "../../components/Atoms/Checkbox/Checkbox";
import ToggleButton from "../../components/Atoms/ToggleButton/ToggleButton";
import SearchComponent from "../../components/Atoms/New Table/NewTable";
import Input from "../../components/Atoms/Input/Input";
// import { Switch } from "@headlessui/react"; // Or your own toggle

// Constants
const INITIAL_FILTERS = {
  search: "",
};

const dummyBatches = [
  { id:1, venderName:"INV128709" , venderOutStanding:"₹34354",   status: true },
  { id:2, venderName:"INV128709" , venderOutStanding:"₹34354",   status: true },
  { id:3, venderName:"INV128709" , venderOutStanding:"₹34354",   status: true },
  { id:4, venderName:"INV128709" , venderOutStanding:"₹34354",   status: true },
  { id:5,  venderName:"INV128709" , venderOutStanding:"₹34354",   status: true },
];

const Ledger = () => {
  const [batches, setBatches] = useState(dummyBatches);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const handleToggleStatus = (id) => {
    setBatches((prev) =>
      prev.map((batch) =>
        batch.id === id ? { ...batch, status: !batch.status } : batch
      )
    );
  };

  const filteredBatches = batches?.filter((batch) =>
    batch?.batchNo?.includes(searchTerm)
  );

  const tableHeadings = [ "Vendor ID", "Vendor Name", "Vendor Outstanding", "Status","Actions"];

  const tableRows = useMemo(() => {
    return dummyBatches.map((batch, index) => ({
      columns: [
        <CustomCheckbox
        // key={`checkbox-${supplier._id}`}
        // checked={selectedRow.includes(supplier._id)}
        // onChange={(e) => handleRowCheckboxChange(e, supplier._id)}
        />,
      
        <span key={`batch-${batch.id}`}>{batch.id}</span>,
        <span key={`batch-${batch.id}`}>{batch.venderName}</span>,
        <span key={`batch-${batch.id}`}>{batch.venderOutStanding}</span>,
        <ToggleButton
        // key={`toggle-${supplier._id}`}
        // isToggle={!supplier?.isApproved}
        // handleClick={() => handleApproveToggle(supplier)}
        />,
        <ActionButtons
          key={`actions-${batch.id}`}
          showEditButton
          showViewButton
          showDeleteButton={false}
          onEdit={() => console.log("Edit", batch.id)}
          onView={() => console.log("View", batch.id)}
          onDelete={() => console.log("Delete", batch.id)}
        />,
      ],
    }));
  }, [filteredBatches]);

  const handleAddBatch = () => {
    // Open modal or navigate
  };

  const handleAddNavigate = () => {
    
  }

  return (
    <div className="p-4 sm:p-6 mx-auto max-w-7xl overflow-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Ledger</h1>
         
        </div>
       
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow-sm p-4 overflow-auto">
        {/* Filters and Actions Section */}
        <section className="p-2 border-b flex md:gap-6 gap-3 items-center flex-wrap md:flex-nowrap justify-between">
          {/* Search Component */}
          <div className="w-full">
            <SearchComponent
              tableHeadings={tableHeadings}
              data={tableRows}
              // selectedRow={selectedRow}
              // setSelectedRow={setSelectedRow}
              // loading={loading}
              filters={filters}
              setFilters={setFilters}
              isSearchShow={true}
              isActivationStatus={false}
              isApprovalOptions={false}
              isCategory={true}
              isProduct={true}
              isProductType={true}
              isUser={true}
              // applyFilters={handleSearchApply}
              // handleSearchRemove={clearFilters}
              isActionButton={true}
              isStatusAction={false}
              // handleAction={handleBulkAction}
              mobailClassName="!gap-0"
            />
          </div>


          {/* Date filter */}
          <div className="mb-5 w-full sm:max-w-[350px]">
            <Input type="date"/>
          </div>
        </section>

        <TableData
          tableHeadings={tableHeadings}
          data={tableRows.map((r) => r.columns)}
          isHeaderCheckbox
          showHeadingDiv={false}
        />
      </div>
    </div>
  );
};

export default Ledger;
