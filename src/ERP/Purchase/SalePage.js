import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

// Component imports
import AddButton from "../../components/Button/AddButton";
import SearchComponent from "../../components/Atoms/New Table/NewTable";
import TableData from "../../components/Atoms/TableData/TableData";
import CustomCheckbox from "../../components/Atoms/Checkbox/Checkbox";
import ToggleButton from "../../components/Atoms/ToggleButton/ToggleButton";
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import FilterSelect from "../../components/Atoms/FilterSelect/FilterSelect";
import NewButton from "../../components/Button/NewButton";
import { useDispatch, useSelector } from "react-redux";
import { getSaleOrderList } from "../../Redux/erpSlice";
import Pagination from "../../components/Pagination/Pagination";
import Loader from "../../components/Loader/Loader";
import { formatDateForDisplay } from "../../_helpers/globalFunctions";

// Constants
const INITIAL_FILTERS = {
  search: "",
};

const PAGE_SIZE = 10;

const TABLE_HEADINGS = [
  "Sr. No.",
  "Customer Name",
  "Phone Number",
  "Store Name",

  "Date",

  "Total",
  "Gst",
  "Grand Total",
  "Status",
  "Actions",
];

const SalePage = () => {
  const size = 10

  // State management
  const [selectedRow, setSelectedRow] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [pageNo, setPageNo] = useState(1);
  const [apiRes, setApiRes] = useState({ list: [], total: 0 });
  const [isRefresh,setIsRefresh] = useState(false)

  const navigate = useNavigate();

   
    const selector = useSelector((state) => state.erp);
    const dispatch = useDispatch();
  
    
    const fetchSaleOrderList = useCallback(async (searchKey = "") => {
      setLoading(true);
      try {
        const query = {
          page: pageNo,
          limit: size,
          searchKey
        };
        const response = await dispatch(getSaleOrderList(query));
       
        setApiRes(response?.payload?.data || { list: [], total: 0 });
  
      } catch (err) {
        toast.error("Failed to fetch products");
      } finally {
        setLoading(false);
      }
    }, [dispatch, pageNo, size]);
  
    useEffect(() => {
      fetchSaleOrderList();
    }, [size, pageNo, dispatch, isRefresh]);



  const handleAddNavigate = () => {
    navigate("/app/sale/form");
  };




  const handleSearchApply = async () => {
   await fetchSaleOrderList(filters.search)
  };

  const clearFilters = async () => {
    setIsRefresh(!isRefresh);
    setFilters({ search: "" });
    await fetchSaleOrderList("");
    setIsRefresh(!isRefresh);
  };

  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };
  
  const tableRows = useMemo(
    () =>
      apiRes?.list?.map((sale, index) => [
        <span key={`index-${sale._id}`}>
        {index + 1 + (pageNo - 1) * size}
      </span>,
        <span key={`invoice-${sale._id}`} className="capitalize">
          {sale?.customer_name || "N/A"}
        </span>,
        <span key={`invoice-${sale._id}`} className="capitalize">
        {sale?.phone_number || "N/A"}
      </span>,
 <span key={`invoice-${sale._id}`} className="capitalize">
        {sale?.store_id?.name || "N/A"}
      </span>,

        <span key={`date-${sale._id}`}>
          {formatDateForDisplay(sale?.order_date || "N/A")}
        </span>,
        
        <span key={`total-${sale._id}`}>
          {sale?.total_amount.toFixed(2) || "N/A"}
        </span>,
        <span key={`tax-${sale._id}`}>{sale.gst.toFixed(2) || "N/A"}</span>,
        
        <span key={`final-total-${sale._id}`}>
          {sale?.total_amount_gst.toFixed(2) || "N/A"}
        </span>,
        <span key={`status-${sale._id}`} className="capitalize">
          {sale?.status || "N/A"}
        </span>,
        <span key={`actions-${sale._id}`}>
        
            <ActionButtons
              showViewButton={true}
              // onEdit={() => handleEditProduct(sale?._id)}
              showLinkButton={false}
              showDeleteButton={false}
              showActivateAndDeActivate={false}
              showPrintButton={true}
              showPrintIcon={true}
              showEditButton={false}
              onView={()=>navigate(`/app/sale/view/${sale._id}`)}
              onPrint={()=>navigate(`/app/sale/sale-preview/${sale._id}`)}
              // onDelete={() => handleDelete(sale)}
            />
     
        </span>,
      ]),
    [apiRes, selectedRow]
  );

  // Render
  return (

    <>
    <Loader loading={loading}/>
    <div className="p-6 mx-auto overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="text-gray-500 text-sm font-semibold">
            Dashboard / Inventory /<span className="text-[#181c32]">Sale</span>
          </h3>
        </div>
        <div className="">
          <AddButton onClick={handleAddNavigate} />
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white">
        {/* Filters and Actions Section */}
        <section className="p-2 border-b flex md:gap-6 gap-3 items-center flex-wrap md:flex-nowrap justify-between">
          {/* Search Component */}
          <div className="md:w-2/3 w-full">
            <SearchComponent
              loading={loading}
              filters={filters}
              setFilters={setFilters}
              applyFilters={handleSearchApply}
              handleSearchRemove={clearFilters}
              mobailClassName="!gap-0"
            />
          </div>
        </section>

        {/* Table Section */}
        <section>
          <TableData
            tableHeadings={TABLE_HEADINGS}
            data={tableRows}
            showHeadingDiv={false}
            rowDataKey="_id"
            sortableColumns={[1, 2, 3]}
            isHeaderCheckbox={false}
            totalData={apiRes?.total}
          />

          {apiRes?.total > PAGE_SIZE && (
            <Pagination
              totalPages={Math.ceil(apiRes?.total / PAGE_SIZE)}
              currentPage={pageNo}
              onPageChange={onPageChange}
            />
          )}
        </section>
      </div>
    </div>
    </>
  );
};

export default SalePage;