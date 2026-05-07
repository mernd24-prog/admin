import React, { useMemo, useState } from "react";
import AddButton from "../../components/Button/AddButton";
import TableData from "../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import CustomCheckbox from "../../components/Atoms/Checkbox/Checkbox";
import ToggleButton from "../../components/Atoms/ToggleButton/ToggleButton";
import SearchComponent from "../../components/Atoms/New Table/NewTable";

const dummyWarnings = [
  { id: 1, composition: "Cardiac", status: true },
  { id: 2, composition: "Cardiac", status: true },
  { id: 3, composition: "Cardiac", status: true },
  { id: 4, composition: "Cardiac", status: true },
  { id: 5, composition: "Cardiac", status: true },
];

const INITIAL_FILTERS = {
  search: "",
};

const WarningPage = () => {
  const [warnings, setWarnings] = useState(dummyWarnings);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const handleToggleStatus = (id) => {
    setWarnings((prev) =>
      prev.map((warning) =>
        warning.id === id
          ? { ...warning, status: !warning.status }
          : warning
      )
    );
  };

  const filteredWarnings = warnings.filter((item) =>
    item.composition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tableHeadings = ["#", "Composition", "Status", "Actions"];

  const tableRows = useMemo(() => {
    return filteredWarnings.map((warning, index) => ({
      columns: [
        <CustomCheckbox key={`checkbox-${warning.id}`} />,
        <span key={`index-${warning.id}`}>{index + 1}</span>,
        <span key={`composition-${warning.id}`}>{warning.composition}</span>,
        <ToggleButton
          key={`toggle-${warning.id}`}
          isToggle={warning.status}
          handleClick={() => handleToggleStatus(warning.id)}
        />,
        <ActionButtons
          key={`actions-${warning.id}`}
          showEditButton
          showViewButton
          showDeleteButton
          onEdit={() => console.log("Edit", warning.id)}
          onView={() => console.log("View", warning.id)}
          onDelete={() => console.log("Delete", warning.id)}
        />,
      ],
    }));
  }, [filteredWarnings]);

  const handleAddNavigate = () => {
    console.log("Navigate to add new warning form");
  };

  return (
    <div className="p-4 sm:p-6 mx-auto max-w-7xl overflow-auto">
      {/* Header */}
      <div className="flex flex-row justify-between items-center gap-2 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Warning</h1>
          <h3 className="text-sm text-gray-500 font-medium">
            <span >Dashboard</span> / Product /{" "}
            <span className="text-[#181c32]">Warning</span>
          </h3>
        </div>
        <div className="">
          <AddButton onClick={handleAddNavigate} text="Add New Warning" />
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

export default WarningPage;