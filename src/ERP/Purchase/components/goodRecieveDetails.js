




import React, { useEffect, useState } from "react";
import { BsArrowLeft } from "react-icons/bs";
import { useNavigate, useParams } from "react-router";
import {
  receivedOrderList,
  purchaseOrderDetails,
} from "../../../Redux/erpSlice";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import Loader from "../../../components/Loader/Loader";
import { formatDateForDisplay } from "../../../_helpers/globalFunctions";
import './PurchaseDetails.css';

const PurchaseDetails = () => {
  const { id } = useParams();
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selector = useSelector((state) => state.erp);

  useEffect(() => {
    if (id) {
      setLoading(true);
      dispatch(receivedOrderList({ po_no: id }))
        .unwrap()
        .then((res) => {
            console.log(res.data);
          // Updated to match new JSON structure
          setPurchaseOrder(res.data.data.data[0]);
        })
        .catch(() => {
          toast.error("Failed to load purchase order details");
        })
        .finally(() => setLoading(false));
    }
  }, [id, dispatch]);

const formatExpDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "N/A";
  
  // MM/DD/YYYY format
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
};

  const getStatusDisplay = (status) => {
    const statusMap = {
      partial: {
        text: "Partial",
        className: "status-partial",
      },
      completed: {
        text: "Completed",
        className: "status-completed",
      },
      pending: {
        text: "Pending",
        className: "status-pending",
      },
      cancelled: {
        text: "Cancelled",
        className: "status-cancelled",
      },
    };

    return (
      statusMap[status] || {
        text: status || "Unknown",
        className: "status-unknown",
      }
    );
  };

  const handleBack = () => {
    navigate("/app/purchase");
  };

  const handlePrint = () => {
    window.print();
  };

  if (!purchaseOrder) return <div>No data found</div>;

  return (
    <>
      <Loader loading={selector.loading} />
    <div className="invoice-container" style={{ maxWidth: 1067 }}>

        <div className="invoice-header">
          <h4 className="invoice-title">Good Received Order Details</h4>
        </div>

        <div className="invoice-content">
          <div className="invoice-meta">
            <div className="meta-section">
              <h3>Order Information</h3>
              <div className="meta-row">
                <span className="meta-label">Purchase Order ID:</span>
                <span className="meta-value">{purchaseOrder?.purchase_order_id || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Is PO:</span>
                <span className="meta-value">{purchaseOrder?.is_po || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Order Date:</span>
                <span className="meta-value">{formatExpDate(purchaseOrder?.date)}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Total Amount:</span>
                <span className="meta-value">₹{purchaseOrder?.total_amount?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Total PO Qty:</span>
                <span className="meta-value">{purchaseOrder?.total_po_qty || 0}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Total Received Qty:</span>
                <span className="meta-value">{purchaseOrder?.total_received_qty || 0}</span>
              </div>
            </div>

            <div className="meta-section">
              <h3>Supplier & Store Details</h3>
              <div className="meta-row">
                <span className="meta-label">Supplier Name:</span>
                <span className="meta-value">{purchaseOrder?.supplier_info?.name || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Supplier Email:</span>
                <span className="meta-value">{purchaseOrder?.supplier_info?.email || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Supplier Phone:</span>
                <span className="meta-value">{purchaseOrder?.supplier_info?.phone || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Store Name:</span>
                <span className="meta-value">{purchaseOrder?.store_info?.name || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Store Email:</span>
                <span className="meta-value">{purchaseOrder?.store_info?.email || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Store Phone:</span>
                <span className="meta-value">{purchaseOrder?.store_info?.phone || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Store Address:</span>
                <span className="meta-value">{purchaseOrder?.store_info?.address || "N/A"}</span>
              </div>
            </div>
          </div>

          <div className="products-section">
            <h2 className="section-title">Received Products Details</h2>
            <table className="products-table">
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Product Name</th>
                  <th>Batch No.</th>
                  <th>Expiry Date</th>
                  <th>Type</th>
                  <th>Packaging</th>
                  <th>PO Qty</th>
                  <th>Received Qty</th>
                  <th>Return Qty</th>
                  <th>Pending Qty</th>
                  <th>Rate</th>
                  <th>Status</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrder?.received_data?.map((item, index) => {
                  const statusDisplay = getStatusDisplay(item?.status);
                  return (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="product-name">{item?.product_name || "N/A"}</div>
                      </td>
                      <td><span className="batch-code">{item?.batch_no || "N/A"}</span></td>
                      <td>{item?.expriy ? formatExpDate(item.expriy) : "N/A"}</td>
                      <td>
                        <span className={`type-${item?.type?.toLowerCase() || 'tablet'}`}>
                          {item?.type || "N/A"}
                        </span>
                      </td>
                      <td><span className="packaging">{item?.packaging || "N/A"}</span></td>
                      <td>{item?.po_qty ?? "N/A"}</td>
                      <td>{item?.received_qty ?? "N/A"}</td>
                      <td>{item?.return_qty ?? "N/A"}</td>
                      <td>{item?.pending_qty ?? "N/A"}</td>
                      <td><span className="price">₹{isNaN(item?.po_rate) ? "N/A" : item?.po_rate?.toFixed(2)}</span></td>
                      <td><span className={statusDisplay.className}>{statusDisplay.text}</span></td>
                      <td><span className="remark">{item?.remark || "N/A"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table><p class="text-xs text-gray-500 md:block hidden">View and manage all the seller's registered shops (stores) on the platform</p>

            <div className="total-records">
              Total Records: {purchaseOrder?.received_data?.length || 0}
            </div>
          </div>

          <div className="summary-section">
            <div className="summary-box">
              <div className="summary-row">
                <span className="summary-label">Total Amount:</span>
                <span className="summary-value">₹{purchaseOrder?.total_amount?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Total PO Quantity:</span>
                <span className="summary-value">{purchaseOrder?.total_po_qty || 0}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Total Received Quantity:</span>
                <span className="summary-value">{purchaseOrder?.total_received_qty || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PurchaseDetails;