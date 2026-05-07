import React, { useMemo, useState } from "react";
import AddButton from "../../components/Button/AddButton";
import TableData from "../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import CustomCheckbox from "../../components/Atoms/Checkbox/Checkbox";
import ToggleButton from "../../components/Atoms/ToggleButton/ToggleButton";
import SearchComponent from "../../components/Atoms/New Table/NewTable";

const dummyQtyheads = [
  { id: 1, medicineName: "Data", qtyhead: "Strip", status: true },
  { id: 2, medicineName: "Data", qtyhead: "Cardiac", status: true },
  { id: 3, medicineName: "Data", qtyhead: "Cardiac", status: true },
  { id: 4, medicineName: "Data", qtyhead: "Cardiac", status: true },
  { id: 5, medicineName: "Data", qtyhead: "Cardiac", status: true },
];

const INITIAL_FILTERS = {
  search: "",
};

const QtyheadPage = () => {
  const [qtyheads, setQtyheads] = useState(dummyQtyheads);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const handleToggleStatus = (id) => {
    setQtyheads((prev) =>
      prev.map((qtyhead) =>
        qtyhead.id === id
          ? { ...qtyhead, status: !qtyhead.status }
          : qtyhead
      )
    );
  };

  const filteredQtyheads = qtyheads.filter((item) =>
    item.medicineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.qtyhead.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tableHeadings = ["#", "Medicine Name", "Qtyhead", "Status", "Actions"];

  const tableRows = useMemo(() => {
    return filteredQtyheads.map((qtyhead, index) => ({
      columns: [
        <CustomCheckbox key={`checkbox-${qtyhead.id}`} />,
        <span key={`index-${qtyhead.id}`}>{index + 1}</span>,
        <span key={`medicine-${qtyhead.id}`}>{qtyhead.medicineName}</span>,
        <span key={`qtyhead-${qtyhead.id}`}>{qtyhead.qtyhead}</span>,
        <ToggleButton
          key={`toggle-${qtyhead.id}`}
          isToggle={qtyhead.status}
          handleClick={() => handleToggleStatus(qtyhead.id)}
        />,
        <ActionButtons
          key={`actions-${qtyhead.id}`}
          showEditButton
          showViewButton
          showDeleteButton
          onEdit={() => console.log("Edit", qtyhead.id)}
          onView={() => console.log("View", qtyhead.id)}
          onDelete={() => console.log("Delete", qtyhead.id)}
        />,
      ],
    }));
  }, [filteredQtyheads]);

  const handleAddNavigate = () => {
    console.log("Navigate to add new qtyhead form");
  };

  return (
    <div className="p-4 sm:p-6 mx-auto max-w-7xl overflow-auto">
      {/* Header */}
      <div className="flex flex-row justify-between  items-center gap-2 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Qtyhead</h1>
          <h3 className="text-sm text-gray-500 font-medium">
            <span >Dashboard</span> / Product /{" "}
            <span className="text-[#181c32]">Qtyhead</span>
          </h3>
        </div>
        <div className="">
          <AddButton onClick={handleAddNavigate} text="Add New Qtyhead" />
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

export default QtyheadPage;