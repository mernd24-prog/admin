import React, { useMemo, useState } from "react";
import AddButton from "../../components/Button/AddButton";
import TableData from "../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import CustomCheckbox from "../../components/Atoms/Checkbox/Checkbox";
import ToggleButton from "../../components/Atoms/ToggleButton/ToggleButton";
import SearchComponent from "../../components/Atoms/New Table/NewTable";

const dummyCategories = [
  { id: 1, category: "Cardiac", status: true },
  { id: 2, category: "Cardiac", status: true },
  { id: 3, category: "Cardiac", status: true },
  { id: 4, category: "Cardiac", status: true },
  { id: 5, category: "Cardiac", status: true },
];

const INITIAL_FILTERS = {
  search: "",
};

const CategoryPage = () => {
  const [categories, setCategories] = useState(dummyCategories);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const handleToggleStatus = (id) => {
    setCategories((prev) =>
      prev.map((category) =>
        category.id === id
          ? { ...category, status: !category.status }
          : category
      )
    );
  };

  const filteredCategories = categories.filter((item) =>
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tableHeadings = ["#", "Category", "Status", "Actions"];

  const tableRows = useMemo(() => {
    return filteredCategories.map((cat, index) => ({
      columns: [
        <CustomCheckbox key={`checkbox-${cat.id}`} />,
        <span key={`index-${cat.id}`}>{index + 1}</span>,
        <span key={`category-${cat.id}`}>{cat.category}</span>,
        <ToggleButton
          key={`toggle-${cat.id}`}
          isToggle={cat.status}
          handleClick={() => handleToggleStatus(cat.id)}
        />,
        <ActionButtons
          key={`actions-${cat.id}`}
          showEditButton
          showViewButton
          showDeleteButton
          onEdit={() => console.log("Edit", cat.id)}
          onView={() => console.log("View", cat.id)}
          onDelete={() => console.log("Delete", cat.id)}
        />,
      ],
    }));
  }, [filteredCategories]);

  const handleAddNavigate = () => {
    console.log("Navigate to add new category form");
  };

  return (
    <div className="p-4 sm:p-6 mx-auto max-w-7xl overflow-auto">
      {/* Header */}
      <div className="flex flex-row justify-between items-center gap-2 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Category</h1>
          <h3 className="text-sm text-gray-500 font-medium">
            <span >Dashboard</span> / Product /{" "}
            <span className="text-[#181c32]">Category</span>
          </h3>
        </div>
        <div className="">
          <AddButton onClick={handleAddNavigate} />
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

export default CategoryPage;
