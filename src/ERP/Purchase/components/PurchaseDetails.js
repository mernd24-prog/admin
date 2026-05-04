import React, { useEffect, useState } from "react";
import { BsArrowLeft } from "react-icons/bs";
import { useNavigate, useParams } from "react-router";
import {
  getPurchaseOrderList,
  purchaseOrderDetails,
} from "../../../Redux/erpSlice";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import Loader from "../../../components/Loader/Loader";
import { formatDateForDisplay } from "../../../_helpers/globalFunctions";
import './PurchaseDetails.css'; // We'll create this CSS file

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
      dispatch(purchaseOrderDetails({ _id: id }))
        .unwrap()
        .then((res) => {
          setPurchaseOrder(res.data);
        })
        .catch(() => {
          toast.error("Failed to load purchase order details");
        })
        .finally(() => setLoading(false));
    }
  }, [id, dispatch]);

// Update the formatExpDate function to show full date
const formatExpDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "N/A";
  
  // For order/delivery dates, show full date (DD/MM/YYYY)
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
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

  const statusDisplay = getStatusDisplay(purchaseOrder?.status);

  return (
    <>
      <Loader loading={selector.loading} />
      <div className="invoice-container">
        <div className="invoice-header">
          <h4 className="invoice-title">Purchase Order Details</h4>
        </div>

        <div className="invoice-content">
          <div className="invoice-meta">
            <div className="meta-section">
              <h3>Order Information</h3>
              <div className="meta-row">
                <span className="meta-label">PO Bill Invoice No:</span>
                <span className="meta-value">{purchaseOrder?.invoice_no || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">GST No:</span>
                <span className="meta-value">{purchaseOrder?.supplier_gst || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">D.L.No:</span>
                <span className="meta-value">{purchaseOrder?.drug_license_no || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Order Date:</span>
                <span className="meta-value">{formatExpDate(purchaseOrder?.order_date)}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Delivery Date:</span>
                <span className="meta-value">{formatExpDate(purchaseOrder?.delivery_date)}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Status:</span>
                <span className={statusDisplay.className}>{statusDisplay.text}</span>
              </div>
            </div>

            <div className="meta-section">
              <h3>Business Details</h3>
              <div className="meta-row">
                <span className="meta-label">Supplier Name:</span>
                <span className="meta-value">{purchaseOrder?.supplier_name || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Supplier Email:</span>
                <span className="meta-value">{purchaseOrder?.supplier_email || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Supplier Number:</span>
                <span className="meta-value">{purchaseOrder?.supplier_phone || "N/A"}</span>
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
                <span className="meta-label">Store Number:</span>
                <span className="meta-value">{purchaseOrder?.store_info?.phone || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Shipping Address:</span>
                <span className="meta-value text-wrap break-words truncate max-w-52">{purchaseOrder?.shipping_address || "N/A"}</span>
              </div>
            </div>
          </div>

          <div className="products-section">
            <h2 className="section-title">Product Details</h2>
            <table className="products-table">
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Product Name</th>
                  <th>HSN</th>
                  {/* <th>Batch</th>
                  <th>Exp.</th> */}
                  <th>Type</th>
                  <th>Calculation</th>
                  <th>QTY</th>
                  <th>MRP</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrder?.purchaseOrderItems?.map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="product-name">{item?.product_name || "N/A"}</div>
                    </td>
                    <td>
                      <div>{item?.HsnCode?.code || "N/A"}</div>
                      {item?.HsnCode && (
                        <div className="hsn-details">
                          CGST: {item.HsnCode.CGST ?? 0}% | SGST: {item.HsnCode.SGST ?? 0}% | IGST: {item.HsnCode.IGST ?? 0}%
                        </div>
                      )}
                    </td>
                    {/* <td><span className="batch-code">{item?.Batch || "N/A"}</span></td>
                    <td>{item?.expiryDate ? formatExpDate(item.expiryDate) : "N/A"}</td> */}
                    <td>
                      <span className={`type-${item?.type?.toLowerCase() || 'strip'}`}>
                        {item?.type || "N/A"}
                      </span>
                    </td>
                    <td><span className="calculation">{item?.calculation || "N/A"}</span></td>
                    <td>{item?.quantity ?? "N/A"}</td>
                    <td><span className="price">₹{isNaN(item?.price) ? "N/A" : item?.price?.toFixed(2)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="total-records">
              Total Records: {purchaseOrder?.purchaseOrderItems?.length || 0}
            </div>
          </div>


 


          <div className="summary-section">
            <div className="summary-box">
               <div className="summary-row">
                
               <span className="summary-label">Total Quantity:</span>
                <span className="summary-value">{purchaseOrder?.total_quantity?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="summary-row">
                
                <span className="summary-label">Subtotal:</span>
                <span className="summary-value">₹{purchaseOrder?.sub_total?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Tax Amount:</span>
                <span className="summary-value">₹{purchaseOrder?.total_tax?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Grand Total:</span>
                <span className="summary-value">₹{purchaseOrder?.total_amount?.toFixed(2) || "0.00"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

   
    </>
  );
};

export default PurchaseDetails;