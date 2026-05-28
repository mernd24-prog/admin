/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import TableData from "../../../components/Atoms/TableData/TableData";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import Loader from "../../../components/Loader/Loader";
import Pagination from "../../../components/Pagination/Pagination";
import { getContentPages } from "../../../Redux/adminCoreSlice";

const PAGE_SIZE = 10;
const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const ProductEventWeightages = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.adminCore);
  const payload = selector?.contentPagesData?.data?.data || {};
  const list = payload?.list || [];
  const total = Number(payload?.total || 0);

  const [filters, setFilters] = useState({ search: "" });
  const [selectedRow, setSelectedRow] = useState([]);
  const [pageNo, setPageNo] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      await dispatch(
        getContentPages({
          page: pageNo,
          limit: PAGE_SIZE,
          q: filters.search || undefined,
          pageType: "product_event_weightage",
        }),
      ).unwrap();
    } catch (err) {
      toast.error(err?.message || err || "Failed to fetch event weightages");
    }
  }, [dispatch, filters.search, pageNo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tableRows = list.map((item) => [
    firstDefined(item?.metadata?.event, item?.title, "N/A"),
    firstDefined(item?.metadata?.weightage, "0.00"),
  ]);

  return (
    <>
      <Loader loading={selector.loading} />
      <div className="p-6 overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl mx-auto space-y-3">
        <h3 className="text-gray-500 text-sm font-semibold py-3">
          <Link to="/app/home">Home</Link> /{" "}
          <span className="text-[#181c32]">Product Event Weightages</span>
        </h3>
        <div className=" overflow-auto bg-white rounded-lg border border-[#E6E6E6]">
          <SearchComponent
            tableHeadings={["Event", "Weightage"]}
            data={tableRows}
            selectedRow={selectedRow}
            setSelectedRow={setSelectedRow}
            loading={selector.loading}
            filters={filters}
            setFilters={setFilters}
            isSearchShow={true}
            isActionButton={false}
            isStatusAction={false}
            isDelete={false}
            applyFilters={() => {
              setPageNo(1);
              fetchData();
            }}
            handleSearchRemove={() => {
              setFilters({ search: "" });
              setPageNo(1);
            }}
          />
          <TableData
            Heading="Product Event Weightages"
            tableHeadings={["Event", "Weightage"]}
            data={tableRows}
            showSearch={true}
            showFilter={false}
            showSummary={false}
            showAddButton={false}
            isHeaderCheckbox={false}
            totalData={total}
          />
        </div>
        {total > PAGE_SIZE && (
          <Pagination
            totalPages={Math.ceil(total / PAGE_SIZE)}
            currentPage={pageNo}
            onPageChange={setPageNo}
          />
        )}
      </div>
    </>
  );
};

export default ProductEventWeightages;
