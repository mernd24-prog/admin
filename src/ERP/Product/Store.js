import React, { useMemo, useState } from "react";
import AddButton from "../../components/Button/AddButton";
import TableData from "../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import CustomCheckbox from "../../components/Atoms/Checkbox/Checkbox";
import ToggleButton from "../../components/Atoms/ToggleButton/ToggleButton";
import SearchComponent from "../../components/Atoms/New Table/NewTable";

const dummyStores = [
  { id: 1, composition: "Cardiac", status: true },
  { id: 2, composition: "Cardiac", status: true },
  { id: 3, composition: "Cardiac", status: true },
  { id: 4, composition: "Cardiac", status: true },
  { id: 5, composition: "Cardiac", status: true },
];

const INITIAL_FILTERS = {
  search: "",
};

const ProductStorePage = () => {
  const [stores, setStores] = useState(dummyStores);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const handleToggleStatus = (id) => {
    setStores((prev) =>
      prev.map((store) =>
        store.id === id
          ? { ...store, status: !store.status }
          : store
      )
    );
  };

  const filteredStores = stores.filter((item) =>
    item.composition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tableHeadings = ["#", "Composition", "Status", "Actions"];

  const tableRows = useMemo(() => {
    return filteredStores.map((store, index) => ({
      columns: [
        <CustomCheckbox key={`checkbox-${store.id}`} />,
        <span key={`index-${store.id}`}>{index + 1}</span>,
        <span key={`composition-${store.id}`}>{store.composition}</span>,
        <ToggleButton
          key={`toggle-${store.id}`}
          isToggle={store.status}
          handleClick={() => handleToggleStatus(store.id)}
        />,
        <ActionButtons
          key={`actions-${store.id}`}
          showEditButton
          showViewButton
          showDeleteButton
          onEdit={() => console.log("Edit", store.id)}
          onView={() => console.log("View", store.id)}
          onDelete={() => console.log("Delete", store.id)}
        />,
      ],
    }));
  }, [filteredStores]);

  const handleAddNavigate = () => {
    console.log("Navigate to add new product form");
  };

  return (
    <div className="p-4 sm:p-6 mx-auto max-w-7xl overflow-auto">
      {/* Header */}
      <div className="flex flex-row justify-between items-center  gap-2 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Store</h1>
          <h3 className="text-sm text-gray-500 font-medium">
            <span >Dashboard</span> / Product /{" "}
            <span className="text-[#181c32]">Store</span>
          </h3>
        </div>
        <div className="flex items-center justify-between">
          <AddButton onClick={handleAddNavigate} text="Add New Product" />
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

export default ProductStorePage;