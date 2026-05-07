import React, { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { saleOrderDetails } from "../../../Redux/erpSlice";
import Loader from "../../../components/Loader/Loader";

const SaleDetailPage = () => {
  const [saleOrder, setSaleOrder] = useState(null);
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selector = useSelector((state) => state.erp);

  useEffect(() => {
    if (id) {
      dispatch(saleOrderDetails({ _id: id }))
        .unwrap()
        .then((res) => setSaleOrder(res.data))
        .catch(() => toast.error("Failed to load sale order details"));
    }
  }, [id]);

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
      partial: { text: "Partial", className: "status-partial" },
      completed: { text: "Completed", className: "status-completed" },
      pending: { text: "Pending", className: "status-pending" },
      cancelled: { text: "Cancelled", className: "status-cancelled" },
    };
    return statusMap[status] || { text: "Unknown", className: "status-unknown" };
  };

  if (!saleOrder) return <Loader loading={true} />;

  const statusDisplay = getStatusDisplay(saleOrder.status);

  return (
    <>
      <Loader loading={selector.loading} />
      <div className="invoice-container">
        <div className="invoice-header">
          <h4 className="invoice-title">Sale Order Details</h4>
        </div>

        <div className="invoice-content">
          <div className="invoice-meta">
            <div className="meta-section">
              <h3>Order Information</h3>
              <div className="meta-row">
                <span className="meta-label">Invoice No:</span>
                <span className="meta-value">{saleOrder?.invoice_no || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">GST No:</span>
                <span className="meta-value">{saleOrder?.gstNumber || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">D.L. No:</span>
                <span className="meta-value">{saleOrder?.drugbusinessLicense || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Order Date:</span>
                <span className="meta-value">{formatExpDate(saleOrder?.order_date)}</span>
              </div>
              {/* <div className="meta-row">
                <span className="meta-label">Delivery Date:</span>
                <span className="meta-value">{formatExpDate(saleOrder?.delivery_date)}</span>
              </div> */}
              <div className="meta-row">
                <span className="meta-label">Status:</span>
                <span className={statusDisplay.className}>{statusDisplay.text}</span>
              </div>
            </div>

            <div className="meta-section">
              <h3>Business Details</h3>
              <div className="meta-row">
                <span className="meta-label">Customer Name:</span>
                <span className="meta-value">{saleOrder?.customer_name || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Phone Number:</span>
                <span className="meta-value">{saleOrder?.phone_number || "N/A"}</span>
              </div>
              {/* <div className="meta-row">
                <span className="meta-label">Shipping Address:</span>
                <span className="meta-value">{saleOrder?.shipping_address || "N/A"}</span>
              </div> */}
              <div className="meta-row">
                <span className="meta-label">Store Name:</span>
                <span className="meta-value">{saleOrder?.store_name || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Store Email:</span>
                <span className="meta-value">{saleOrder?.store_email || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Store Phone:</span>
                <span className="meta-value">{saleOrder?.store_phone || "N/A"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Store Contact Person:</span>
                <span className="meta-value">{saleOrder?.store_contact_person || "N/A"}</span>
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
                  <th>Batch</th>
                  <th>Exp.</th>
                  <th>Type</th>
                  <th>po Rate</th>
                  <th>QTY</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {saleOrder?.items?.map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{item?.product_name || "N/A"}</td>
                    <td>
                      {item?.hsnCode?.code || "N/A"}
                      <div className="hsn-details">
                        CGST: {item.hsnCode?.CGST ?? 0}% | SGST: {item.hsnCode?.SGST ?? 0}% | IGST: {item.hsnCode?.IGST ?? 0}%
                      </div>
                    </td>
                    <td>{item?.batch_code || "N/A"}</td>
                    <td>{item?.expiryDate ? formatExpDate(item.expiryDate) : "N/A"}</td>
                    <td>{item?.type || "N/A"}</td>
                    <td>{item?.po_rate || "N/A"}</td>
                    
                    <td>{item?.quantity ?? "N/A"}</td>
                    <td>₹{isNaN(item?.total) ? "N/A" : item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="total-records">
              Total Records: {saleOrder?.items?.length || 0}
            </div>
          </div>

          <div className="summary-section">
            <div className="summary-box">
               <div className="summary-row">
                <span className="summary-label">Total QTY:</span>
                <span className="summary-value">{saleOrder?.total_quantity || 0}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Subtotal:</span>
                <span className="summary-value">₹{saleOrder?.sub_total?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Tax Amount:</span>
                <span className="summary-value">₹{saleOrder?.gst?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Grand Total:</span>
                <span className="summary-value">₹{saleOrder?.total_amount_gst?.toFixed(2) || "0.00"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SaleDetailPage;




















//// this is  old code 



// import React, { useEffect, useState } from "react";
// import Button from "../../../components/Atoms/buttons/button";
// import TableData from "../../../components/Atoms/TableData/TableData";
// import { BsArrowLeft } from "react-icons/bs";
// import { FaPrint } from "react-icons/fa6";
// import { useNavigate, useParams } from "react-router";
// import { useDispatch } from "react-redux";
// import { toast } from "sonner";
// import { saleOrderDetails } from "../../../Redux/erpSlice";

// const SaleDetailPage = () => {
//   const size = 10;

//   const [saleOrder, setSaleOrder] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [pageNo, setPageNo] = useState(1);

//   const { id } = useParams();

//   const dispatch = useDispatch();

//   const navigate = useNavigate();

//   useEffect(() => {
//     if (id) {
//       dispatch(saleOrderDetails({ _id: id }))
//         .unwrap()
//         .then((res) => {
//           setSaleOrder(res.data);
//         })
//         .catch(() => {
//           toast.error("Failed to load sale order details");
//         })
//         .finally(() => setLoading(false));
//     }
//   }, [id]);

//   const formatExpDate = (dateStr) => {
//     if (!dateStr) return "N/A";
//     const date = new Date(dateStr);
//     if (isNaN(date.getTime())) return "N/A";
//     return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
//   };

//   const tableHeadings = [
//     "Sr. No.",
//     "PRODUCT NAME",
//     "Sh.Id",
//     "HSN",
//     "BATCH",
//     "EXP.",
//     "QTY",
//     "MRP",
//     "Disc%",
//     "Disc RS.",
//     "AMOUNT",
//   ];

//   const tableRows = saleOrder?.items?.map((item, index) => [
//     <span key={`sr-${index}`}>{index + 1}</span>,

//     <span key={`name-${index}`} className="block max-w-[120px] pb-2 truncate">
//       {item?.product_name || "N/A"}
//     </span>,

//     <span key={`rack-${index}`}>{item?.rack_no || "N/A"}</span>,

//     item?.hsnCode?.code ? (
//       <div
//         key={`hsn-${index}`}
//         className="flex flex-col text-left leading-tight text-xs"
//       >
//         <span className="font-medium">{item.hsnCode.code}</span>
//         <span className="text-[10px] text-gray-600">
//           CGST: {item.hsnCode.CGST ?? 0}% | SGST: {item.hsnCode.SGST ?? 0}% |
//           IGST: {item.hsnCode.IGST ?? 0}%
//         </span>
//       </div>
//     ) : (
//       "N/A"
//     ),

//     item?.batch_code || "N/A",
//     item?.expiryDate ? formatExpDate(item.expiryDate) : "N/A",
//     item?.quantity ?? "N/A",
//     isNaN(item?.sale_price) ? "N/A" : item?.sale_price?.toFixed(2),
//     item?.discount_percentage ?? "15.00",
//     isNaN(item?.discount_amount) ? "N/A" : item?.discount_amount?.toFixed(2),
//     isNaN(item?.final_price) ? "N/A" : item?.final_price?.toFixed(2),
//   ]);

//   return (
//     <div className="max-w-7xl mx-auto">
//       <div className=" overflow-hidden overflow-y-auto py-6">
//         <div className="flex justify-between items-center p-5 ">
//           <div>
//             <h3>
//               Dashboard / Inventory <b> / Sale</b>
//             </h3>
//           </div>
//           <div>
//             <Button
//               className="border-blue-600"
//               onClick={() => navigate("/app/sale")}
//             >
//               <span>
//                 <BsArrowLeft size={24} className="pr-1" />
//               </span>{" "}
//               Back
//             </Button>
//           </div>
//         </div>
//         <article className="bg-white mt-5 rounded-lg shadow-md p-4 sm:p-6 md:p-10">
//           {/* Summary Section */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
//             {/* Invoice Summary */}
//             <section className="space-y-4">
//               <dl className="grid grid-cols-1 gap-4 text-sm">
//                 <div className="flex justify-between">
//                   <dt className="font-semibold">Invoice Number:</dt>
//                   <dd className="text-gray-700">
//                     {saleOrder?.invoice_no || "N/A"}
//                   </dd>
//                 </div>
//                  <div className="flex justify-between">
//                   <dt className="font-semibold">Gst Number:</dt>
//                   <dd className="text-gray-700">
//                     {saleOrder?.gstNumber || "N/A"}
//                   </dd>
//                 </div>
//                  <div className="flex justify-between">
//                   <dt className="font-semibold">D.L.No. :</dt>
//                   <dd className="text-gray-700">
//                     {saleOrder?.drugbusinessLicense || "N/A"}
//                   </dd>
//                 </div>
//                 <div className="flex justify-between">
//                   <dt className="font-semibold">Customer:</dt>
//                   <dd className="text-gray-700">
//                     {saleOrder?.customer_name || "N/A"}
//                   </dd>
//                 </div>
//                 <div className="flex justify-between">
//                   <dt className="font-semibold">Phone Number:</dt>
//                   <dd className="text-gray-700">
//                     {saleOrder?.phone_number || "N/A"}
//                   </dd>
//                 </div>
//                 <div className="flex justify-between">
//                   <dt className="font-semibold">Order Date:</dt>
//                   <dd className="text-gray-700">
//                     {new Date(saleOrder?.order_date).toLocaleString("en-IN", {
//                       dateStyle: "medium",
//                     }) || "N/A"}
//                   </dd>
//                 </div>
//                 <div className="flex justify-between">
//                   <dt className="font-semibold">Delivery Date:</dt>
//                   <dd className="text-gray-700">
//                     {new Date(saleOrder?.delivery_date).toLocaleString(
//                       "en-IN",
//                       {
//                         dateStyle: "medium",
//                         // timeStyle: "short",
//                       }
//                     ) || "N/A"}
//                   </dd>
//                 </div>
//                 <div className="flex justify-between items-center">
//                   <dt className="font-semibold">Status:</dt>
//                   <dd>
//                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 select-none">
//                       {saleOrder?.status || "Pending"}
//                     </span>
//                   </dd>
//                 </div>
//               </dl>
//             </section>

//             {/* Payment Summary */}
//             <section className="space-y-4 md:text-right">
//               <dl className="grid grid-cols-1 gap-3 text-sm">
//                 <div className="flex justify-between md:justify-end gap-x-4">
//                   <dt className="font-semibold w-32 text-left md:text-right">
//                     Total:
//                   </dt>
//                   <dd className="text-gray-700 w-24 text-right">
//                     ₹{saleOrder?.sub_total ?? "0.00"}
//                   </dd>
//                 </div>
//                 <div className="flex justify-between md:justify-end gap-x-4">
//                   <dt className="font-semibold w-32 text-left md:text-right">
//                     Discount:
//                   </dt>
//                   <dd className="text-gray-700 w-24 text-right">
//                     ₹
//                     {isNaN(saleOrder?.total_discount_amount)
//                       ? "0.00"
//                       : Number(saleOrder?.total_discount_amount)?.toFixed(2)}
//                   </dd>
//                 </div>

//                 <div className="flex justify-between md:justify-end gap-x-4">
//                   <dt className="font-semibold w-32 text-left md:text-right">
//                     Grand Total:
//                   </dt>
//                   <dd className="text-gray-700 w-24 text-right">
//                     ₹
//                     {isNaN(saleOrder?.total_amount_gst)
//                       ? "0.00"
//                       : Number(saleOrder?.total_amount_gst)?.toFixed(2)}
//                   </dd>
//                 </div>
//               </dl>
//             </section>
//           </div>

//           {/* Medicine Table */}
//           <section className="mt-8 col-span-full overflow-x-auto">
//             <TableData tableHeadings={tableHeadings} data={tableRows} totalData={saleOrder?.items?.length}/>
//           </section>
//         </article>
//       </div>
//     </div>
//   );
// };

// export default SaleDetailPage;



//  <div>
//             <Button
//               className="border-blue-600"
//               onClick={() => navigate("/app/sale")}
//             >
//               <span>
//                 <BsArrowLeft size={24} className="pr-1" />
//               </span>{" "}
//               Back
//             </Button>
//           </div>