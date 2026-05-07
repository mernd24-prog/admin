import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { MdFileDownload, MdSearch } from "react-icons/md";

// Component imports
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import Button from "../../components/Atoms/buttons/button";
import SupplierOverview from "./components/SupplierOverview";
import TableData from "../../components/Atoms/TableData/TableData";
import { getSupplierDetails } from "../../Redux/erpSlice";
import { useDispatch, useSelector } from "react-redux";
import Loader from "../../components/Loader/Loader";
import Pagination from "../../components/Pagination/Pagination";

// Icons for tabs
import {
  FiHome,
  FiShoppingBag,
  FiPackage,
  FiCreditCard,
} from "react-icons/fi";

// Constants
const INITIAL_FILTERS = {
  search: "",
};

const TAB_CONFIG = [
  {
    id: "overview",
    title: "Overview",
    description: "Supplier summary and details",
    icon: <FiHome size={18} />
  },
  {
    id: "purchase_orders",
    title: "Purchase Orders",
    description: "View all purchase orders",
    icon: <FiShoppingBag size={18} />
  },
  {
    id: "products_supplied",
    title: "Products",
    description: "Products supplied by vendor",
    icon: <FiPackage size={18} />
  },
  {
    id: "ledger",
    title: "Ledger",
    description: "Payment and transaction history",
    icon: <FiCreditCard size={18} />
  },
];

const TABLE_HEADINGS = {
  orders: ["Order ID", "Date", "Total", "Status", "Invoice"],
  products: ["Product Name", "Brand", "Batch No.", "Expiry", "Stock", "Actions"],
  payments: ["Payment Date", "Debit", "Credit", "Balance"],
};

const MedPharma = () => {
  const size = 10;
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.erp);
  const { id } = useParams();

  // URL and state management
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromURL = searchParams.get("tab") || "overview";

  // State variables
  const [activeTab, setActiveTab] = useState(tabFromURL);
  const [, setSelectedRow] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [apiRes, setApiRes] = useState([]);
  const [pageNo, setPageNo] = useState(1);
  const [isRefresh] = useState(false);

  const shouldShowPagination = activeTab !== "overview";

  const fetchTabsData = useCallback(
    async (currentTab) => {
      if (currentTab === "overview") {
        return;
      }

      setLoading(true);
      try {
        const query = {
          _id: id,
          page: pageNo,
          limit: size,
          tabType: currentTab,
        };
        const response = await dispatch(getSupplierDetails(query));
        setApiRes(response?.payload?.data || []);
      } catch (err) {
        console.error("Error fetching data:", err);
        toast.error("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    },
    [dispatch, pageNo, size, id]
  );

  // Effects
  useEffect(() => {
    fetchTabsData(activeTab);
  }, [fetchTabsData, activeTab, isRefresh]);

  useEffect(() => {
    const currentTab = searchParams.get("tab") || "overview";
    if (currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [searchParams, activeTab]);

  // Event handlers
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("tab", tab);
    setSearchParams(newSearchParams);
    setSelectedRow([]);
    setPageNo(1);
  };

  const handlePrint = (item) => {
    console.log("Printing:", item);
    toast.success(`Printing ${item.orderId || item.productName}`);
  };

  // const handleRowCheckboxChange = (e, itemId) => {
  //   if (e.target.checked) {
  //     setSelectedRow((prev) => [...prev, itemId]);
  //   } else {
  //     setSelectedRow((prev) => prev.filter((id) => id !== itemId));
  //   }
  // };

  function formatDate(timestamp, format = "DD-MM-YYYY") {
    if (!timestamp) return "N/A";

    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");

    if (format === "YYYY-MM-DD") {
      return `${year}-${month}-${day}`;
    } else if (format === "DD-MM-YYYY") {
      return `${day}-${month}-${year}`;
    }
    return date.toDateString();
  }

  // Table row generators
  const generateOrderRows = () => {
    return apiRes?.list?.map((order) => [
      <span key={`orderId-${order._id}`} className="font-medium text-blue-600">
        {order.oder_id}
      </span>,
      <span key={`date-${order._id}`}>{formatDate(order.date)}</span>,
      <span key={`total-${order._id}`} className="font-medium">
        ₹{order.total_amount?.toLocaleString() || "0"}
      </span>,
      <span key={`status-${order._id}`}>
        <span className={`px-2 py-1 rounded-full text-xs ${order.status === "Delivered"
          ? "bg-green-100 text-green-800"
          : "bg-yellow-100 text-yellow-800"
          }`}>
          {order.status || "Pending"}
        </span>
      </span>,
      <ActionButtons
        key={`actions-${order._id}`}
        showPrint={true}
        onPrint={() => handlePrint(order)}
        showDeleteButton={false}
        showEditButton={false}
      />,
    ]);
  };

  const generateProductRows = () => {
    return apiRes?.list?.map((product) => [

      <span key={`name-${product._id}`} className="font-medium">
        {product.productName || "N/A"}
      </span>,
      <span key={`brand-${product._id}`}>{product.brand_name || "N/A"}</span>,
      <span key={`batchNo-${product._id}`}>{product.batch_name || "N/A"}</span>,
      <span
        key={`expiry-${product._id}`}
        className={new Date(product.expiry_date) < new Date() ? "text-red-500" : "text-green-500"}
      >
        {formatDate(product.expiry_date)}
      </span>,
      <span key={`stock-${product._id}`} className="font-medium">
        {product.received_qty || "0"}
      </span>,
      <ActionButtons
        key={`actions-${product._id}`}
        showViewButton={true}
        showPrint={true}
        onPrint={() => handlePrint(product)}
      />,
    ]);
  };

  const generatePaymentRows = () => {
    return apiRes?.list?.map((payment) => [

      <span key={`date-${payment.id}`}>{formatDate(payment.entry_date)}</span>,
      <span key={`debit-${payment.id}`} className="text-red-500">
        ₹{payment.debit?.toLocaleString() || "0"}
      </span>,
      <span key={`credit-${payment.id}`} className="text-green-500">
        ₹{payment.credit?.toLocaleString() || "0"}
      </span>,
      <span key={`balance-${payment.id}`} className="font-medium">
        ₹{payment.balance?.toLocaleString() || "0"}
      </span>,
    ]);
  };

  const shouldShowSearch = [
    "purchase_orders",
    "products_supplied",
    "ledger",
    "documents",
  ].includes(activeTab);

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <SupplierOverview />;

      case "purchase_orders":
        return (
          <TableData
            tableHeadings={TABLE_HEADINGS.orders}
            data={generateOrderRows()}
            isHeaderCheckbox={false}
            loading={loading}
            emptyMessage="No purchase orders found"
            totalData={apiRes?.total}
          />
        );

      case "products_supplied":
        return (
          <TableData
            tableHeadings={TABLE_HEADINGS.products}
            data={generateProductRows()}
            isHeaderCheckbox={false}
            loading={loading}
            emptyMessage="No products found"
            totalData={apiRes?.total}
          />
        );

      case "ledger":
        return (
          <TableData
            tableHeadings={TABLE_HEADINGS.payments}
            data={generatePaymentRows()}
            isHeaderCheckbox={false}
            loading={loading}
            emptyMessage="No ledger entries found"
            totalData={apiRes?.total}
          />
        );

      default:
        return <div className="p-4 text-gray-500">Select a tab to view data</div>;
    }
  };

  const handleSearchApply = async () => {
    try {
      const query = {
        page: 1,
        limit: size,
        searchKey: filters?.search,
        _id: id,
        tabType: activeTab
      };

      const response = await dispatch(getSupplierDetails(query));
      setApiRes(response?.payload?.data || { list: [], total: 0 });
      setPageNo(1);
    } catch (err) {
      toast.error("Failed to fetch data");
      console.error("Search error:", err);
    }
  };

  const clearFilters = async () => {
    setFilters({ search: "" });
    try {
      const query = {
        page: 1,
        limit: size,
        searchKey: "",
        _id: id,
        tabType: activeTab
      };

      const response = await dispatch(getSupplierDetails(query));
      setApiRes(response?.payload?.data || { list: [], total: 0 });
      setPageNo(1);
    } catch (err) {
      toast.error("Failed to fetch data");
      console.error("Clear filters error:", err);
    }
  };

  const handlePageChange = (newPage) => {
    setPageNo(newPage);
  };

  return (
    <>
      <Loader loading={selector?.loading} />
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <nav className="flex mt-2" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-2">
                <li className="inline-flex items-center">
                  <Link to="/app/supplier" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600">
                    Suppliers
                  </Link>
                </li>
                <li aria-current="page">
                  <div className="flex items-center">
                    <span className="mx-1 text-gray-400">/</span>
                    <span className="ml-1 text-sm font-medium text-gray-900 md:ml-2">Details</span>
                  </div>
                </li>
              </ol>
            </nav>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white  border border-gray-200 overflow-hidden">
              <nav className="divide-y divide-gray-100">
                {TAB_CONFIG.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full text-left p-4 transition-all duration-200 flex items-start gap-3
                      ${activeTab === tab.id
                        ? 'bg-white text-black'
                        : 'hover:bg-gray-50 text-gray-700 hover:text-[#0A73CF]'
                      }`}
                  >
                    <div className={`p-1.5 rounded-lg ${activeTab === tab.id ? 'text-black' : 'bg-gray-100 text-gray-500'}`}>
                      {tab.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tab.title}</p>
                      <p className={`text-xs mt-1 ${activeTab === tab.id ? "text-gray-200" : 'text-gray-500'}`}>
                        {tab.description}
                      </p>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="flex-1 bg-white border border-gray-200 overflow-hidden">
            <div className="p-4 md:p-6">
              {shouldShowSearch && (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MdSearch className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Search..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchApply()}
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button
                      onClick={handleSearchApply}
                      className="px-4 py-2 bg-blue-600 text-black rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Search
                    </Button>
                    <Button
                      onClick={clearFilters}
                      className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Clear
                    </Button>
                    <Button
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <MdFileDownload />
                      Export
                    </Button>
                  </div>
                </div>
              )}
              {renderTabContent()}

            </div>
          </div>
        </div>
        {
          apiRes?.size > size && (
            shouldShowPagination && (
              <div className="mt-6">
                <Pagination
                  currentPage={pageNo}
                  totalPages={apiRes?.totalPages || 1}
                  totalItems={apiRes?.totalCount || 0}
                  onPageChange={handlePageChange}
                />
              </div>
            )
          )
        }
      </div>
    </>
  );
};

export default MedPharma;