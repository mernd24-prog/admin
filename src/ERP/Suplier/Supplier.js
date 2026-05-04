/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

// Component imports
import AddButton from "../../components/Button/AddButton";
import SearchComponent from "../../components/Atoms/New Table/NewTable";
import TableData from "../../components/Atoms/TableData/TableData";
import ToggleButton from "../../components/Atoms/ToggleButton/ToggleButton";
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import NewButton from "../../components/Button/NewButton";
import { useDispatch, useSelector } from "react-redux";
import { approveDisapprove, getSupplierList } from "../../Redux/erpSlice";
import Loader from "../../components/Loader/Loader";
import Pagination from "../../components/Pagination/Pagination";
import { exportSupplierToCSV } from "../../_helpers/exportToCsv";

// Constants
const INITIAL_FILTERS = {
  search: "",
};


const TABLE_HEADINGS = [
  "#",
  "Supplier Name",
  "Contact Person",
  "Phone Number",
  "GSTIN",
  "Status",
  "Actions",
];



const Supplier = () => {
  const size = 10;

  // State management
  const [selectedRow, setSelectedRow] = useState([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [pageNo, setPageNo] = useState(1);
  const [isRefresh, setIsRefresh] = useState(false);
  const [apiRes, setApiRes] = useState([]);

  const navigate = useNavigate();

  const selector = useSelector((state) => state.erp);
  const dispatch = useDispatch();

  const fetchSupplierList = useCallback(async () => {
    // setLoading(true);
    try {
      const query = {
        page: pageNo,
        limit: size,
        searchKey: "",
      };
      const response = await dispatch(getSupplierList(query));
      console.log(response);

      // console.log(response)
      setApiRes(response?.payload?.data || { list: [], total: 0 });

      console.log(apiRes);
    } catch (err) {
      toast.error("Failed to fetch products");
    } finally {
      // setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, pageNo, size]);

  useEffect(() => {
    fetchSupplierList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, pageNo]);


  const handleApproveToggle = async (data) => {
    const apiPayload = {
      _id: data?._id,
      data: {
        isDisable: !data?.isDisable ? false : true
      }
    };
    try {
      const response = await dispatch(approveDisapprove(apiPayload)).unwrap();
      if (response.message) {
        toast.success(response.message || "Status Changed Successfull");
        setIsRefresh(!isRefresh);
        fetchSupplierList()
      } else {
        toast.info(response?.message || "Something went wrong");
      }
    } catch (error) {
      toast.error(error?.message || "An error occurred");
    }
  };

  // handle view
  const handleViewSupplier = (id) => {
    navigate(`/app/supplier/med-pharma/${id}`);
  };

  // handle edit
  const handleEditSupplier = (id) => {
    navigate(`/app/supplier/form/${id}`);
  };

  const allRowIds = useMemo(
    () => apiRes?.list?.map((supplier) => supplier._id),
    [apiRes]
  );

  const isAllRowsSelected = useMemo(
    () =>
      selectedRow.length === apiRes?.list?.length && apiRes?.list?.length > 0,
    [selectedRow.length, apiRes?.list?.length]
  );

  // Event handlers
  const handleAddNavigate = () => {
    navigate("/app/supplier/form");
  };

  // const handleRowCheckboxChange = (e, rowId) => {
  //   setSelectedRow((prev) =>
  //     e.target.checked ? [...prev, rowId] : prev.filter((id) => id !== rowId)
  //   );
  // };

  const handleHeaderCheckboxChange = (e) => {
    setSelectedRow(e.target.checked ? allRowIds : []);
  };

  const handleSearchApply = async () => {
    try {
      const query = {
        page: pageNo,
        limit: size,
        searchKey: filters?.search,
      };

      const response = await dispatch(getSupplierList(query));
      setApiRes(response?.payload?.data || { list: [], total: 0 });
    } catch (err) {
      toast.error("Failed to fetch suppliers");
      console.error("Search error:", err);
    } finally {
      // setLoading(false);
    }
  };

  const clearFilters = async () => {
    // setLoading(true);
    setFilters({ search: "" });

    try {
      const query = {
        page: pageNo,
        limit: size,
        searchKey: "",
      };

      const response = await dispatch(getSupplierList(query));
      setApiRes(response?.payload?.data || { list: [], total: 0 });
    } catch (err) {
      toast.error("Failed to fetch suppliers");
      console.error("Clear filters error:", err);
    } finally {
      // setLoading(false);
    }
  };

  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };

  // export funcnality

  const handleExportClick = () => {
    const query = {
      page: pageNo,
      limit: size,
      searchKey: "",
    };

    dispatch(getSupplierList(query))
      .unwrap()
      .then((res) => {
        if (res.error) {
          toast.error(res.message);
          return;
        }

        const supplierData = res?.data?.list;

        // console.log(supplierData)

        if (!supplierData || supplierData.length === 0) {
          toast.error("No suppliers to export");
          return;
        }

        const cleanedData = supplierData.map((supplier) => {
          const { _id, __v, ...rest } = supplier;
          return {
            Name: supplier?.name || "N/A",
            ContactPerson: supplier?.contact_person || "N/A",
            Phone: supplier?.phone || "N/A",
            GSTNumber: supplier?.gst_number || "N/A",
            Status: supplier?.isDisable ? "Disabled" : "Active",
            // ...rest,
          };
        });

        console.log(cleanedData);

        exportSupplierToCSV(cleanedData);
        toast.success("File Exported Successfully");
      })
      .catch((error) => {
        console.error("error", error);
        toast.error("Error in Exporting File");
      });
  };

  // Table row rendering
  const tableRows = useMemo(
    () =>
      apiRes?.list?.map((supplier, index) => [
        // <CustomCheckbox
        //   key={`checkbox-${supplier._id}`}
        //   checked={selectedRow.includes(supplier._id)}
        //   onChange={(e) => handleRowCheckboxChange(e, supplier._id)}
        // />,
        <span key={`index-${supplier._id}`}>
          {index + 1 + (pageNo - 1) * size}
        </span>,
        <span key={`name-${supplier._id}`} className="capitalize">
          {supplier?.name || "N/A"}
        </span>,
        <span key={`contact-${supplier._id}`}>
          {supplier?.contact_person || "N/A"}
        </span>,
        <span key={`phone-${supplier._id}`}>{supplier?.phone || "N/A"}</span>,
        <span key={`gstin-${supplier._id}`}>
          {supplier?.gst_number || "N/A"}
        </span>,
        // <span key={`balance-${supplier._id}`}>
        //   {supplier?.balance || "N/A"}
        // </span>,
        <ToggleButton
          key={`toggle-${supplier._id}`}
          isToggle={!supplier?.isDisable}
          handleClick={() => handleApproveToggle(supplier)}
        />,
        <span key={`actions-${supplier._id}`}>
          <ActionButtons
            showViewButton={true}
            onEdit={() => handleEditSupplier(supplier?._id)}
            showLinkButton={false}
            showDeleteButton={false}

            onView={() => handleViewSupplier(supplier?._id)}

          />
        </span>,
      ]),
    [apiRes, selectedRow]
  );

  // Render
  return (
    <>
      <Loader loading={selector.loading} />
      <div className="p-6 mx-auto overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>

            <h3 className="text-gray-500 text-sm font-semibold">
              Dashboard / <span className="text-[#181c32]">Supplier</span>
            </h3>
          </div>
          <div className="flex items-center justify-between mb-4">
            <AddButton onClick={handleAddNavigate} />
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white mb-2">
          {/* Filters and Actions Section */}
          <section className="p-2 border-b flex items-center flex-wrap md:flex-nowrap justify-between">
            {/* Search Component */}
            <div className="md:w-2/3 w-full">
              <SearchComponent
                loading={selector.loading}
                filters={filters}
                setFilters={setFilters}
                applyFilters={handleSearchApply}
                handleSearchRemove={clearFilters}
              />
            </div>

            {/* Export Button */}
            <div className="mb-4 w-full md:w-[300px]">
              <NewButton
                onClick={handleExportClick}
                className="bg-white !text-blue-500"
              >
                Export CSV
              </NewButton>
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
              handleHeaderCheckboxChange={handleHeaderCheckboxChange}
              totalData={apiRes?.total}
              allRowsSelected={isAllRowsSelected}
            />

          </section>
        </div>
        {apiRes?.total > size && (
          <Pagination
            totalPages={Math.ceil(apiRes?.total / size)}
            currentPage={pageNo}
            onPageChange={onPageChange}
          />
        )}
      </div>
    </>
  );
};

export default Supplier;
