/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

// Components
import AddButton from "../../components/Button/AddButton";
import TableData from "../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import SearchComponent from "../../components/Atoms/New Table/NewTable";
import Loader from "../../components/Loader/Loader";
import Pagination from "../../components/Pagination/Pagination";
import { getPurchaseOrderList } from "../../Redux/erpSlice";
import { Link } from "react-router-dom";
import moment from "moment";

const PAGE_SIZE = 10;

const Purchase = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.erp);

  const [filters, setFilters] = useState({ search: "" });
  const [apiRes, setApiRes] = useState({ list: [], total: 0 });
  const [pageNo, setPageNo] = useState(1);
  const [selectedRows] = useState([]);
  const [, setIsRefresh] = useState(false);

  const TABLE_HEADINGS = [
    "Shop Name",
    "PO No.",
    "Supplier",
    "PO Date",
    "Total",
    "GST",
    "Grand Total",
    "Status",
    "Good Receive",
    "Action",
  ];

  const handleAddNavigate = () => navigate("/app/purchase/form");

  const fetchPurchaseOrderList = useCallback(
    async (searchKey = "") => {
      try {
        const query = {
          page: pageNo,
          limit: PAGE_SIZE,
          searchKey,
        };

        const response = await dispatch(getPurchaseOrderList(query));
        setApiRes(response?.payload?.data || { list: [], total: 0 });
      } catch (err) {
        toast.error("Failed to fetch purchase orders");
        console.error("Fetch error:", err);
      }
    },
    [dispatch, pageNo]
  );

  const handleSearchApply = async () => {
    await fetchPurchaseOrderList(filters.search);
  };

  const clearFilters = async () => {
    setIsRefresh(true);
    setFilters({ search: "" });
    await fetchPurchaseOrderList("");
    setIsRefresh(false);
  };

  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };

  // const toggleRowSelection = (id) => {
  //   setSelectedRows((prev) =>
  //     prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
  //   );
  // };

  const tableRows = useMemo(() => {
    return apiRes.list.map((item, index) => {
      return [
        item?.store_id?.name,
        <span key={`order-${item._id}`} className="font-medium">
          {item.oder_id || "N/A"}
        </span>,
        <span key={`supplier-${item._id}`}>
          {item?.supplier_id?.name || "N/A"}
        </span>,
        <span key={`date-${item._id}`}>
          {moment(item.order_date).format("DD-MM-YYYY")}
        </span>,
        <span key={`total-${item._id}`}>
          ₹
          {typeof item.total_amount === "number"
            ? item.total_amount.toFixed(2)
            : "0.00"}
        </span>,
        <span key={`gst-${item._id}`}>
          ₹{typeof item.gst === "number" ? item.gst.toFixed(2) : "0.00"}
        </span>,
        <span key={`total_gst-${item._id}`} className="font-semibold">
          ₹
          {typeof item.total_amount === "number" && typeof item.gst === "number"
            ? (item.total_amount + item.gst).toFixed(2)
            : "0.00"}
        </span>,

        <span className={`capitalize`}> {item.status} </span>,

        <ActionButtons
          key={`actions-${item._id}`}
          showViewButton={item.status === "pending" ? false : true}
          onView={() =>
            navigate(`/app/purchase/goodrecieve-details/${item?.oder_id}`)
          }
          showEditButton={false}
          showDeleteButton={false}
        />,
        <ActionButtons
          key={`actions-${item._id}`}
          showViewButton
          showEditButton={item.status === "pending" ? true : false}
          showDeleteButton={false}
          onView={() => navigate(`/app/purchase/purchase-details/${item?._id}`)}
          onDelete={() => console.log("Delete", item._id)}
          showPrintIcon={true}
          onPrint={() =>
            navigate(`/app/purchase/purchase-preview/${item?._id}`)
          }
          onEdit={() => navigate(`/app/purchase/form/${item?._id}`)}
        />,
      ];
    });
  }, [apiRes.list, selectedRows, navigate]);

  useEffect(() => {
    fetchPurchaseOrderList();
  }, [pageNo, fetchPurchaseOrderList]);

  return (
    <>
      <Loader loading={loading} />
      <div className="p-4 sm:p-6 mx-auto overflow-auto max-w-7xl">
        <div className="flex flex-row justify-between items-center mb-4 gap-2">
          <div>
            <nav className="py-4">
              <ol className="flex items-center text-sm text-gray-500">
                <li className="transition-colors hover:text-blue-600">
                  <Link to="/app/home">Home</Link>
                </li>
                <li className="mx-2">/</li>
                <li className="font-medium text-blue-600">Purchase Order</li>
              </ol>
            </nav>
          </div>
          <AddButton onClick={handleAddNavigate}>Add New Purchase</AddButton>
        </div>

        <div className="bg-white rounded shadow-sm p-4 overflow-auto">
          <section className="border-b flex items-center flex-wrap md:gap-6 gap-3 md:flex-nowrap justify-between">
            <div className="md:w-2/3 w-full">
              <SearchComponent
                filters={filters}
                setFilters={setFilters}
                isSearchShow={true}
                applyFilters={handleSearchApply}
                handleSearchRemove={clearFilters}
                isActionButton={true}
              />
            </div>
          </section>

          <section>
            <TableData
              tableHeadings={TABLE_HEADINGS}
              data={tableRows}
              rowDataKey="_id"
              sortableColumns={[1, 2, 3]}
              totalData={apiRes.total}
            />
          </section>
        </div>
        <div className="mt-2">
          {apiRes.total > PAGE_SIZE && (
            <Pagination
              totalPages={Math.ceil(apiRes.total / PAGE_SIZE)}
              currentPage={pageNo}
              onPageChange={onPageChange}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default Purchase;
