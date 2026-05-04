import React, { useMemo, useState } from "react";
import AddButton from "../../components/Button/AddButton";
import TableData from "../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import CustomCheckbox from "../../components/Atoms/Checkbox/Checkbox";
import ToggleButton from "../../components/Atoms/ToggleButton/ToggleButton";
import SearchComponent from "../../components/Atoms/New Table/NewTable";

const dummyBrands = [
  { id: 1, brand: "Cardiac", status: true },
  { id: 2, brand: "Cardiac", status: true },
  { id: 3, brand: "Cardiac", status: true },
  { id: 4, brand: "Cardiac", status: true },
  { id: 5, brand: "Cardiac", status: true },
];

const INITIAL_FILTERS = {
  search: "",
};

const BrandPage = () => {
  const [brands, setBrands] = useState(dummyBrands);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const handleToggleStatus = (id) => {
    setBrands((prev) =>
      prev.map((brand) =>
        brand.id === id
          ? { ...brand, status: !brand.status }
          : brand
      )
    );
  };

  const filteredBrands = brands.filter((item) =>
    item.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tableHeadings = ["#", "Brand", "Status", "Actions"];

  const tableRows = useMemo(() => {
    return filteredBrands.map((brand, index) => ({
      columns: [
        <CustomCheckbox key={`checkbox-${brand.id}`} />,
        <span key={`index-${brand.id}`}>{index + 1}</span>,
        <span key={`brand-${brand.id}`}>{brand.brand}</span>,
        <ToggleButton
          key={`toggle-${brand.id}`}
          isToggle={brand.status}
          handleClick={() => handleToggleStatus(brand.id)}
        />,
        <ActionButtons
          key={`actions-${brand.id}`}
          showEditButton
          showViewButton
          showDeleteButton
          onEdit={() => console.log("Edit", brand.id)}
          onView={() => console.log("View", brand.id)}
          onDelete={() => console.log("Delete", brand.id)}
        />,
      ],
    }));
  }, [filteredBrands]);

  const handleAddNavigate = () => {
    console.log("Navigate to add new brand form");
  };

  return (
    <div className="p-4 sm:p-6 mx-auto max-w-7xl overflow-auto">
      {/* Header */}
      <div className="flex flex-row justify-between items-center gap-2 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Brand</h1>
          <h3 className="text-sm text-gray-500 font-medium">
            <span >Dashboard</span> / Product /{" "}
            <span className="text-[#181c32]">Brand</span>
          </h3>
        </div>
        <div className="flex items-center justify-between mb-4">
          <AddButton onClick={handleAddNavigate} text="Add New Brand" />
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

export default BrandPage;