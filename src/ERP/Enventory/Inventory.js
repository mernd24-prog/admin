/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import SearchComponent from "../../components/Atoms/New Table/NewTable";
import TableData from "../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import {
  getInventoryList,
} from "../../Redux/erpSlice";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import Pagination from "../../components/Pagination/Pagination";
import Loader from "../../components/Loader/Loader";
import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";
import Nodata from "../../components/Atoms/NoData/NoData";
import { TitleValue } from "../../components/Atoms/TitleValue/TitleValue";

const Inventory = () => {
  const INITIAL_FILTERS = {
    search: "",
  };
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [apiRes, setApiRes] = useState();
  const [pageNo, setPageNo] = useState(1);
  const size = 10;
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);
  const [headData, setHeadData] = useState([]);

  const selector = useSelector((state) => state.erp);

  // Remove these unused functions since we're removing the search button
  // const handleSearchApply = () => {};
  // const clearFilters = () => {};

  const fetchInventoryList = useCallback(async () => {
    try {
      const query = {
        page: pageNo,
        limit: size,
        search: filters.search, // Pass the search key directly
      };
      await dispatch(getInventoryList(query)).then((res) => {
        if (res) {
          setApiRes(res?.payload?.data?.data?.data);
        }
      });
    } catch (err) {
      toast.error("Failed to fetch inventory");
    }
  }, [dispatch, pageNo, size, filters.search]); // Add filters.search to dependencies

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPageNo(1); // Reset to first page when searching
      fetchInventoryList();
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [filters.search]); // Trigger when search changes

  useEffect(() => {
    fetchInventoryList();
  }, [pageNo]); // Fetch when page changes

  const TABLE_HEADINGS = [
    "Product Name",
    "Product NO",
    "Store Name",
    "Store Email",
    "Store Phone",
    "Store Contact Person",
    "Actions",
  ];

  const formatExpDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";

    // MM/DD/YY format
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`;
  };

  const tableRows = useMemo(
    () =>
      Array.isArray(apiRes) && apiRes?.map((inventory, index) => [
        inventory?.product_name,
        inventory?.product_no,
        inventory?.store_name,
        inventory?.store_email,
        inventory?.store_phone,
        inventory?.store_contact_person,
        <span key={`actions-${inventory._id}`}>
          <ActionButtons
            showViewButton={true}
            showLinkButton={false}
            showDeleteButton={false}
            showEditButton={false}
            onView={() => handleViewSupplier(inventory?._id)}
          />
        </span>,
      ]),
    [apiRes]
  );

  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };

  const handleViewSupplier = (id) => {
    const selectedInventory = apiRes.find(item => item._id === id);
    if (selectedInventory?.head?.length > 0) {
      setHeadData(selectedInventory.head);
      setShowModal(true);
    } else {
      toast.info("No head data available.");
    }
  };

  const clearSearch = () => {
    setFilters(INITIAL_FILTERS);
  };

  return (
    <>
      <Loader loading={selector.loading} />
      <div className="p-6 mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="flex justify-between">
          <div>
            <h1 className="md:text-[28px] text-xl font-medium">Inventory</h1>
            <h3 className="text-gray-500 text-sm font-semibold">
              Dashboard / <span className="text-[#181c32]">Inventory</span>
            </h3>
          </div>
        </div>

        <div className="bg-white">
          <section className="p-2 border-b flex items-center flex-wrap md:flex-nowrap justify-between">
            <div className="md:w-2/3 w-full">
              <SearchComponent
                filters={filters}
                setFilters={setFilters}
                isSearchShow={true}
                isActivationStatus={false}
                isApprovalOptions={false}
                isCategory={true}
                isProduct={true}
                isProductType={true}
                isUser={true}
                handleSearchRemove={clearSearch}
                isActionButton={false} // This removes the search button
                isStatusAction={false}
              // Remove applyFilters prop since we don't need the search button
              />
            </div>
          </section>

          <section>
            <TableData
              tableHeadings={TABLE_HEADINGS}
              data={tableRows}
              showHeadingDiv={false}
              isHeaderCheckbox={false}
              rowDataKey="_id"
              sortableColumns={[1, 2, 3]}
              totalData={apiRes?.length}
            />
          </section>

          {apiRes?.total > size && (
            <Pagination
              totalPages={Math.ceil(apiRes?.total / size)}
              currentPage={pageNo}
              totalData={apiRes?.total}
              onPageChange={onPageChange}
            />
          )}
        </div>
      </div>

      <DefaultModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Batch Details"
        size="md"
      >
        {Array.isArray(headData) && headData.length > 0 ? (
          <div className="space-y-4">
            {headData?.map((headItem, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 bg-gray-50 shadow-sm"
              >
                <div className="grid grid-cols-1  gap-3">
                  <TitleValue title="Type" value={headItem.type || "N/A"} />
                  <TitleValue title="Batch No" value={headItem.batch_no || "N/A"} />
                  <TitleValue title="Received Qty" value={headItem.received_qty || "N/A"} />
                  <TitleValue title="Net Qty" value={headItem.net_qty || "N/A"} />
                  <TitleValue title="Sell Qty" value={headItem.sell_qty || "N/A"} />
                  <TitleValue title="Price" value={headItem.price ? `₹${headItem.price}` : "N/A"} />
                  <TitleValue title="Expiry Date" value={formatExpDate(headItem.expriy) || "N/A"} />
                  <TitleValue title="Manufacture Date" value={formatExpDate(headItem.manufacture) || "N/A"} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Nodata message="No batch details available" />
          </div>
        )}
      </DefaultModal>

    </>
  );
};

export default Inventory;