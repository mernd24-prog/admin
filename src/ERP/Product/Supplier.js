import React, { useMemo, useState,useEffect} from "react";
import AddButton from "../../components/Button/AddButton";
import TableData from "../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import CustomCheckbox from "../../components/Atoms/Checkbox/Checkbox";
import ToggleButton from "../../components/Atoms/ToggleButton/ToggleButton";
import SearchComponent from "../../components/Atoms/New Table/NewTable";
import { useDispatch } from "react-redux";
import { getSupplierList } from "../../Redux/erpSlice";

const dummySuppliers = [
  { id: 1, composition: "Cardiac", status: true },
  { id: 2, composition: "Cardiac", status: true },
  { id: 3, composition: "Cardiac", status: true },
  { id: 4, composition: "Cardiac", status: true },
  { id: 5, composition: "Cardiac", status: true },
];

const INITIAL_FILTERS = {
  search: "",
};

const ProductSupplierPage = () => {
  const [suppliers, setSuppliers] = useState(dummySuppliers);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [isRefresh,setIsRefresh] = useState(false)
  const [pageNo,setPageNo] = useState(1)
  const size = 10


  const dispatch = useDispatch()

  const handleToggleStatus = (id) => {
    setSuppliers((prev) =>
      prev.map((supplier) =>
        supplier.id === id
          ? { ...supplier, status: !supplier.status }
          : supplier
      )
    );
  };

  // get all supplier data
  useEffect(() => {
    const reqData = {
      page: pageNo.toString(),
      size: size.toString(),
      keyWord: filters.search,
      searchFields: "period",
      select: "period isDisable",
    };
    dispatch(getSupplierList(reqData));
  }, [size, pageNo, dispatch, isRefresh]);

 

  const tableHeadings = ["#", "Composition", "Status", "Actions"];

  const tableRows = useMemo(() => {
    return suppliers.map((supplier, index) => ({
      columns: [
        <CustomCheckbox key={`checkbox-${supplier.id}`} />,
        <span key={`index-${supplier.id}`}>{index + 1}</span>,
        <span key={`composition-${supplier.id}`}>{supplier.composition}</span>,
        <ToggleButton
          key={`toggle-${supplier.id}`}
          isToggle={supplier.status}
          handleClick={() => handleToggleStatus(supplier.id)}
        />,
        <ActionButtons
          key={`actions-${supplier.id}`}
          showEditButton
          showViewButton
          showDeleteButton
          onEdit={() => console.log("Edit", supplier.id)}
          onView={() => console.log("View", supplier.id)}
          onDelete={() => console.log("Delete", supplier.id)}
        />,
      ],
    }));
  }, []);

  const handleAddNavigate = () => {
    console.log("Navigate to add new instruction form");
  };

 

  return (
    <div className="p-4 sm:p-6 mx-auto max-w-7xl overflow-auto">
      {/* Header */}
      <div className="flex flex-row justify-between items-center  gap-2 mb-4">
        <div>
        
          <h3 className="text-sm text-gray-500 font-medium">
            <span>Dashboard</span> / Product /{" "}
            <span className="text-[#181c32]">Supplier</span>
          </h3>
        </div>
        <div className="flex items-center justify-between mb-4">
          <AddButton onClick={handleAddNavigate} text="Add New Instruction" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow-sm p-4 overflow-auto">
        {/* Filters and Actions Section */}
        <section className="p-2 border-b flex  items-center flex-wrap md:flex-nowrap justify-between">
          {/* Search Component */}
          <div className="w-full">
            <SearchComponent
              filters={filters}
              setFilters={setFilters}
              isSearchShow={true}
              isActionButton={true}
              isStatusAction={true}
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

export default ProductSupplierPage;
