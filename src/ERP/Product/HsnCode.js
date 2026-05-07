import React, { useMemo, useState } from "react";
import AddButton from "../../components/Button/AddButton";
import TableData from "../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import CustomCheckbox from "../../components/Atoms/Checkbox/Checkbox";
import ToggleButton from "../../components/Atoms/ToggleButton/ToggleButton";
import SearchComponent from "../../components/Atoms/New Table/NewTable";

const dummyWarranties = [
  { id: 1, medicineName: "Data", warranty: "Strip", status: true },
  { id: 2, medicineName: "Data", warranty: "Cardiac", status: true },
  { id: 3, medicineName: "Data", warranty: "Cardiac", status: true },
  { id: 4, medicineName: "Data", warranty: "Cardiac", status: true },
  { id: 5, medicineName: "Data", warranty: "Cardiac", status: true },
];

const INITIAL_FILTERS = {
  search: "",
};

const HsnCodePage = () => {
  const [warranties, setWarranties] = useState(dummyWarranties);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const handleToggleStatus = (id) => {
    setWarranties((prev) =>
      prev.map((warranty) =>
        warranty.id === id
          ? { ...warranty, status: !warranty.status }
          : warranty
      )
    );
  };

  const filteredWarranties = warranties.filter((item) =>
    item.medicineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.warranty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tableHeadings = ["#", "Medicine Name", "Warranty", "Status", "Actions"];

  const tableRows = useMemo(() => {
    return filteredWarranties.map((warranty, index) => ({
      columns: [
        <CustomCheckbox key={`checkbox-${warranty.id}`} />,
        <span key={`index-${warranty.id}`}>{index + 1}</span>,
        <span key={`medicine-${warranty.id}`}>{warranty.medicineName}</span>,
        <span key={`warranty-${warranty.id}`}>{warranty.warranty}</span>,
        <ToggleButton
          key={`toggle-${warranty.id}`}
          isToggle={warranty.status}
          handleClick={() => handleToggleStatus(warranty.id)}
        />,
        <ActionButtons
          key={`actions-${warranty.id}`}
          showEditButton
          showViewButton
          showDeleteButton
          onEdit={() => console.log("Edit", warranty.id)}
          onView={() => console.log("View", warranty.id)}
          onDelete={() => console.log("Delete", warranty.id)}
        />,
      ],
    }));
  }, [filteredWarranties]);

  const handleAddNavigate = () => {
    console.log("Navigate to add new warranty form");
  };

  return (
    <div className="p-4 sm:p-6 mx-auto max-w-7xl overflow-auto">
      {/* Header */}
      <div className="flex flex-row justify-between items-center gap-2 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">HSN Code</h1>
          <h3 className="text-sm text-gray-500 font-medium">
            <span className="">Dashboard</span> / Product /{" "}
            <span className="text-[#181c32]">HSN Code</span>
          </h3>
        </div>
        <div className="">
          <AddButton onClick={handleAddNavigate} text="Add New Warranty" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow-sm p-4 overflow-auto">
        {/* Filters and Actions Section */}
        <section className="p-2 border-b flex  items-center flex-wrap md:flex-nowrap justify-between">
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
              isStatusAction={true}
              // handleAction={handleBulkAction}
              // mobailClassName="!gap-0"
            />
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

export default HsnCodePage;