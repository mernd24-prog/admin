/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useCallback, useMemo } from "react";
import { FaChevronDown, FaChevronLeft, FaChevronUp, FaFile } from "react-icons/fa6";
import { IoEyeOutline } from 'react-icons/io5';
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router";
import {
  assignOrder, getDeliveryStaffForOrder, getOrderInfo, getProductInfo, orderCancel, updateOrderStatus
} from "../../../../Redux/orderSlice";
import { toast } from "sonner";
import moment from "moment";
import FilterSelect from "../../../../components/Atoms/FilterSelect/FilterSelect";
import { TitleValue2, TitleValue } from "../../../../components/Atoms/TitleValue/TitleValue";
import Loader from "../../../../components/Loader/Loader";
import DefaultModal from "../../../../components/Atoms/Modal/DefaultRightSideModal";
import selectJson from '../../../../_helpers/SelectJson.json';
import Input from "../../../../components/Atoms/Input/Input";
import { getProfile } from "../../../../Redux/userSlice";
import { transformArray } from "../../../../_helpers/globalFunctions";
const MINIMUM_CANCEL_REASON_LENGTH = 10;
const DESCRIPTION_WORD_LIMIT = 20;

const initialFormData = {
  order_id: "",
  status: "",
  cancelReason: "",
  store_id: "",
  staff_id: ""
};

const money = (value) => Number(value || 0);

const normalizeAddress = (address = {}) => ({
  house_flat_floor: address.line1 || "N/A",
  apartment_area_road: address.line2 || "",
  delivery_instructions: address.deliveryInstructions || "",
  phone: address.phone || "",
  location: {
    address_string: {
      fullAddress: [address.line1, address.line2, address.city, address.state, address.postalCode, address.country]
        .filter(Boolean)
        .join(", "),
      city: address.city || "",
      state: address.state || "",
      pincode: address.postalCode || "",
      country: address.country || "",
    },
  },
});

const normalizeOrderDetail = (order = {}) => {
  const orderId = order._id || order.id;
  const items = Array.isArray(order.items) ? order.items : [];

  return {
    ...order,
    allOrders: [
      {
        _id: orderId,
        status: order.status,
        store_id: { _id: order.seller_id || "", name: "Platform" },
        items: items.map((item) => ({
          ...item,
          _id: item._id || item.id,
          quantity: item.quantity || 0,
          total: money(item.total || item.line_total),
          product_id:
            typeof item.product_id === "object"
              ? item.product_id
              : {
                  _id: item.product_id,
                  name: item.product_id || "Product",
                  description: "",
                },
        })),
      },
    ],
    orderSummary: {
      createAt: order.createdAt || order.created_at,
      cartTotal: money(order.subtotalAmount || order.subtotal_amount),
      taxCharges: money(order.taxAmount || order.tax_amount),
      discountAmount: money(order.discountAmount || order.discount_amount),
      netAmount: money(order.totalAmount || order.total_amount),
    },
    contactInformation: {
      email: order.buyerEmail || "",
      phone: order.buyerPhone || "",
    },
    deliveryAddress: normalizeAddress(order.shippingAddress || order.shipping_address),
    orderPayment: {
      paymentDate: order.updatedAt || order.updated_at || order.createdAt || order.created_at,
      paymentDetails: { transactionId: order.payment_id || orderId },
      paymentMethod: order.paymentProvider || "N/A",
      amount: money(order.payableAmount || order.payable_amount || order.totalAmount || order.total_amount),
      paymentStatus: order.paymentStatus || order.status || "N/A",
    },
  };
};

const OrderSummary = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();

  // State management
  const [state, setState] = useState({
    selectedSeller: "",
    isExpanded: true,
    orderInfo: null,
    storeOptions: [],
    isLoading: false,
    viewDetails: false,
    viewData: null,
    statusModal: false,
    userData: {},
    deliveryStaff: []
  });

  const [formData, setFormData] = useState(initialFormData);

  // Memoized values
  const canModifyOrder = useMemo(() => {
    return state.userData?.role_id === 3 || state.userData?.role_id === 9;
  }, [state.userData?.role_id]);

  const allStoresOption = useMemo(() => [
    { label: "All Stores", value: "" }
  ], []);

  // Error handler utility
  const handleError = useCallback((error, defaultMessage = "An error occurred") => {
    const errorMessage = error?.message || error || defaultMessage;
    toast.error(errorMessage);
    console.error("Error:", error);
  }, []);

  // Loading state management
  const setLoading = useCallback((loading) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  // Fetch order information
  const fetchOrderInfo = useCallback(async () => {
    if (!id) {
      handleError(null, "Order ID is required");
      return;
    }

    try {
      setLoading(true);
      const apiPayload = {
        order_no: id,
        store_id: state.selectedSeller,
      };

      const res = await dispatch(getOrderInfo(apiPayload)).unwrap();

      if (!res?.data) {
        throw new Error("Invalid response format");
      }

      const normalizedOrder = normalizeOrderDetail(res.data);
      const options = normalizedOrder.allOrders?.map(store => ({
        label: store.store_id?.name || "Unknown Store",
        value: store.store_id?._id || ""
      })) || [];

      setState(prev => ({
        ...prev,
        storeOptions: [...allStoresOption, ...options],
        orderInfo: normalizedOrder
      }));
    } catch (error) {
      handleError(error, "Failed to fetch order information");
    } finally {
      setLoading(false);
    }
  }, [id, state.selectedSeller, dispatch, handleError, setLoading, allStoresOption]);

  const fetchUserData = useCallback(async () => {
    try {
      const res = await dispatch(getProfile()).unwrap();
      if (res?.data) {
        setState(prev => ({ ...prev, userData: res.data }));
      }
    } catch (error) {
      handleError(error, "Failed to fetch user profile");
    }
  }, [dispatch, handleError]);

  // Handle product details view
  const handleDetails = useCallback(async (data) => {
    if (!data?.product_id?._id) {
      handleError(null, "Product ID is required");
      return;
    }

    try {
      setLoading(true);
      const res = await dispatch(getProductInfo({
        product_id: data.product_id._id
      })).unwrap();

      if (res?.data) {
        setState(prev => ({
          ...prev,
          viewData: res.data,
          viewDetails: true
        }));
      }
    } catch (error) {
      handleError(error, "Failed to fetch product details");
    } finally {
      setLoading(false);
    }
  }, [dispatch, handleError, setLoading]);

  const validateFormData = useCallback(() => {
    if (!formData.order_id) {
      toast.error("Order ID is required");
      return false;
    }

    if (!formData.status) {
      toast.error("Status is required");
      return false;
    }

    if (formData.status === "cancelled") {
      if (!formData.cancelReason || formData.cancelReason.trim().length < MINIMUM_CANCEL_REASON_LENGTH) {
        toast.error(`Please provide a valid cancellation reason (at least ${MINIMUM_CANCEL_REASON_LENGTH} characters)`);
        return false;
      }
    }

    if (formData.status === "out_for_shipping" && !formData.staff_id) {
      toast.error("Please select delivery staff");
      return false;
    }

    return true;
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    if (!validateFormData()) return;

    try {
      setLoading(true);
      let res;

      switch (formData.status) {
        case "cancelled":
          const cancellationPayload = {
            order_id: formData.order_id,
            cancelledBy: "store",
            cancelReason: formData.cancelReason || "Order cancelled by admin"
          };
          res = await dispatch(orderCancel(cancellationPayload)).unwrap();
          break;

        case "out_for_shipping":
          const assignPayload = {
            storeId: formData.store_id,
            orderId: formData.order_id,
            staffId: formData.staff_id
          };
          res = await dispatch(assignOrder(assignPayload)).unwrap();
          break;

        default:
          res = await dispatch(updateOrderStatus(formData)).unwrap();
          break;
      }

      toast.success(res?.message || "Order updated successfully");
      setState(prev => ({ ...prev, statusModal: false }));
      setFormData(initialFormData);
      await fetchOrderInfo();
    } catch (error) {
      handleError(error, "Failed to update order");
    } finally {
      setLoading(false);
    }
  }, [formData, validateFormData, dispatch, handleError, setLoading, fetchOrderInfo]);

  const handleSelectChange = useCallback(async (data) => {
    if (!data?.value) return;

    setFormData(prev => ({ ...prev, status: data.value }));

    if (data.value === "out_for_shipping" && formData.store_id) {
      try {
        const res = await dispatch(getDeliveryStaffForOrder({
          storeId: formData.store_id
        })).unwrap();

        const staffOptions = transformArray(res?.data || []);
        setState(prev => ({ ...prev, deliveryStaff: staffOptions }));
      } catch (error) {
        handleError(error, "Failed to fetch delivery staff");
        setState(prev => ({ ...prev, deliveryStaff: [] }));
      }
    }
  }, [formData.store_id, dispatch, handleError]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleStaffOnChange = useCallback((data) => {
    setFormData(prev => ({ ...prev, staff_id: data?.value || "" }));
  }, []);

  const handleStoreChange = useCallback((value) => {
    setState(prev => ({ ...prev, selectedSeller: value?.value || "" }));
  }, []);

  // Handle modal close
  const handleCloseModal = useCallback((modalType) => {
    setState(prev => ({ ...prev, [modalType]: false }));
    if (modalType === 'statusModal') {
      setFormData(initialFormData);
    }
  }, []);

  // Handle status modal open
  const handleStatusModalOpen = useCallback((order) => {
    if (!order?._id) {
      handleError(null, "Invalid order data");
      return;
    }

    setFormData({
      ...initialFormData,
      order_id: order._id,
      store_id: order.store_id?._id || ""
    });
    setState(prev => ({ ...prev, statusModal: true }));
  }, [handleError]);

  // Format description with word limit
  const formatDescription = useCallback((description) => {
    if (!description) return "";

    const words = description.split(' ');
    if (words.length > DESCRIPTION_WORD_LIMIT) {
      return words.slice(0, DESCRIPTION_WORD_LIMIT).join(' ') + '...';
    }
    return description;
  }, []);

  // Effects
  useEffect(() => {
    fetchOrderInfo();
    fetchUserData();
  }, [fetchOrderInfo, fetchUserData]);

  // Render helpers
  const renderOrderItems = useCallback((order) => (
    <div key={order._id}>
      <div className="py-3 flex justify-start gap-3 items-center">
        <span className="px-3 py-1 text-sm text-teal-500 rounded-full bg-teal-50">
          {order.store_id?.name || "Unknown Store"}
        </span>
        <div className="flex col-span-1 space-x-2">
          {canModifyOrder && (
            <button
              className="text-gray-500 hover:text-gray-700 transition-colors"
              onClick={() => handleStatusModalOpen(order)}
              aria-label="Update order status"
            >
              <FaFile size={18} />
            </button>
          )}
        </div>
      </div>
      {order.items?.map((item) => (
        <div key={item._id} className="grid items-center grid-cols-11 py-4 border-b">
          <div className="flex items-center col-span-4">
            <div>
              <div className="font-medium">{item?.product_id?.name || "Unknown Product"}</div>
              <div className="text-xs text-gray-500 truncate text-wrap break-words">
                {formatDescription(item?.product_id?.description)}
              </div>
            </div>
          </div>
          <div className="col-span-2">
            <span className="px-2 py-1 text-xs text-teal-500 rounded-full bg-teal-50">
              {order.store_id?.name || "Unknown Store"}
            </span>
          </div>
          <div className="col-span-2">
            <span className="px-2 py-1 text-xs text-blue-500 rounded-full bg-blue-50">
              {order.status || "Unknown"}
            </span>
          </div>
          <div className="col-span-1 text-center">{item.quantity || 0}</div>
          <div className="col-span-2 font-medium">₹ {(item.total || 0).toFixed(2)}</div>
          <button
            className="text-gray-500 hover:text-gray-700 transition-colors"
            onClick={() => handleDetails(item)}
            aria-label="View product details"
          >
            <IoEyeOutline size={18} />
          </button>
        </div>
      ))}
    </div>
  ), [canModifyOrder, formatDescription, handleDetails, handleStatusModalOpen]);

  const renderPaymentTable = useCallback(() => (
    <div className="p-2 bg-white">
      <table className="min-w-full text-left text-sm mt-6">
        <thead className="text-gray-700">
          <tr className="border-b">
            <th className="px-3 py-2">Added On</th>
            <th className="px-3 py-2">Transaction ID</th>
            <th className="px-3 py-2">Payment Method</th>
            <th className="px-3 py-2">Amount</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-3 py-2">
              {state.orderInfo?.orderPayment?.paymentDate
                ? moment(state.orderInfo.orderPayment.paymentDate).format('DD-MMM-YYYY')
                : 'N/A'
              }
            </td>
            <td className="px-3 py-2">
              {state.orderInfo?.orderPayment?.paymentDetails?.transactionId || 'N/A'}
            </td>
            <td className="px-3 py-2">
              {state.orderInfo?.orderPayment?.paymentMethod || 'N/A'}
            </td>
            <td className="px-3 py-2">
              ₹ {(state.orderInfo?.orderPayment?.amount || 0).toFixed(2)}
            </td>
            <td className="px-3 py-2">
              {state.orderInfo?.orderPayment?.paymentStatus || 'N/A'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  ), [state.orderInfo]);

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">Invalid Order ID</h2>
          <button
            onClick={() => navigate('/app/orders')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100">
      <Loader loading={state.isLoading} />

      <div className="flex flex-col gap-4 mx-auto max-w-7xl lg:flex-row">
        {/* Main Content */}
        <div className="flex-grow p-4">
          {/* Header */}
          <div className="flex items-center p-2 bg-white">
            <button
              className="mr-2 text-blue-500 hover:text-blue-700 transition-colors"
              onClick={() => navigate('/app/orders')}
              aria-label="Go back to orders"
            >
              <FaChevronLeft size={20} />
            </button>
            <h1 className="text-lg font-medium">Order #{id}</h1>
            <div className="relative ml-auto">
              <FilterSelect
                options={state.storeOptions}
                placeholder="Store"
                value={state.storeOptions.find(opt => opt.value === state.selectedSeller)}
                onChange={handleStoreChange}
              />
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white p-2 mb-8">
            <div className="grid grid-cols-12 py-3 text-sm font-medium text-gray-600 border-b">
              <div className="col-span-4">Items summary</div>
              <div className="col-span-2">Fulfilled by</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Quantity</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-1">Actions</div>
            </div>

            {state.orderInfo?.allOrders?.length > 0 ? (
              state.orderInfo.allOrders.map(renderOrderItems)
            ) : (
              <div className="py-8 text-center text-gray-500">
                No orders found
              </div>
            )}
          </div>

          {/* Payment Information */}
          {state.orderInfo?.orderPayment && renderPaymentTable()}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-1/2 space-y-4">
          {/* Order Summary */}
          <div className="bg-white shadow-sm">
            <div className="flex items-center border-b p-3">
              <FaFile className="mr-2" size={18} />
              <h2 className="text-[1.1rem] pt-2">Order Summary</h2>
            </div>
            <div className="p-6 space-y-4">
              <TitleValue
                title="Order Date"
                value={state.orderInfo?.orderSummary?.createAt
                  ? moment(state.orderInfo.orderSummary.createAt).format('DD MMM YYYY')
                  : 'N/A'
                }
              />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>₹{(state.orderInfo?.orderSummary?.cartTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span>₹{(state.orderInfo?.orderSummary?.taxCharges || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="text-green-600">-₹{(state.orderInfo?.orderSummary?.discountAmount || 0).toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 mt-1 flex justify-between font-medium">
                  <span className="text-gray-700">Total:</span>
                  <span className="text-gray-900">₹{(state.orderInfo?.orderSummary?.netAmount || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white shadow-sm">
            <h2 className="text-[1.1rem] pt-2 border-b p-4">Contact Information</h2>
            <div className="p-3">
              <p className="text-sm text-gray-600">Email/Phone no</p>
              <p>
                {state.orderInfo?.contactInformation?.phone && (
                  <span>{state.orderInfo.contactInformation.phone}</span>
                )}
                {state.orderInfo?.contactInformation?.phone &&
                  state.orderInfo?.contactInformation?.email && <br />}
                {state.orderInfo?.contactInformation?.email && (
                  <span>{state.orderInfo.contactInformation.email}</span>
                )}
                {!state.orderInfo?.contactInformation?.phone &&
                  !state.orderInfo?.contactInformation?.email && (
                    <span className="text-gray-500">N/A</span>
                  )}
              </p>
            </div>
          </div>

          <div className="relative p-2 bg-white shadow-sm">
            <div className="flex items-center justify-between p-2 border-b">
              <h2 className="text-[1.1rem]">Delivery Address</h2>
              <button
                onClick={() => setState(prev => ({ ...prev, isExpanded: !prev.isExpanded }))}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label={state.isExpanded ? "Collapse address" : "Expand address"}
              >
                {state.isExpanded ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            </div>
            {state.isExpanded && (
              <div className="space-y-6 pt-4">
                <TitleValue
                  title="House/Flat/Floor"
                  value={state.orderInfo?.deliveryAddress?.house_flat_floor || 'N/A'}
                />
                <TitleValue
                  title="Apartment/Area/Road"
                  value={state.orderInfo?.deliveryAddress?.apartment_area_road || 'N/A'}
                />
                <TitleValue
                  title="Delivery Instructions"
                  value={state.orderInfo?.deliveryAddress?.delivery_instructions || 'N/A'}
                />
                <TitleValue
                  title="Phone"
                  value={state.orderInfo?.deliveryAddress?.country_code?.dialCode &&
                    state.orderInfo?.deliveryAddress?.phone
                    ? `+${state.orderInfo.deliveryAddress.country_code.dialCode} ${state.orderInfo.deliveryAddress.phone}`
                    : 'N/A'
                  }
                />
                <TitleValue2
                  title="Full Address"
                  value={state.orderInfo?.deliveryAddress?.location?.address_string?.fullAddress || 'N/A'}
                />
                <div className="grid grid-cols-2">
                  <TitleValue2
                    title="City"
                    value={state.orderInfo?.deliveryAddress?.location?.address_string?.city || 'N/A'}
                  />
                  <TitleValue2
                    title="State"
                    value={state.orderInfo?.deliveryAddress?.location?.address_string?.state || 'Rajasthan'}
                  />
                </div>
                <div className="grid grid-cols-2">
                  <TitleValue2
                    title="Zip"
                    value={state.orderInfo?.deliveryAddress?.location?.address_string?.pincode || 'N/A'}
                  />
                  <TitleValue2
                    title="Country"
                    value={state.orderInfo?.deliveryAddress?.location?.address_string?.country || 'N/A'}
                  />
                </div>


              </div>
            )}
          </div>
        </div>
      </div>

      <DefaultModal
        isOpen={state.viewDetails}
        onClose={() => handleCloseModal('viewDetails')}
        title={state.viewData?.name || 'Product Details'}
      >
      <div className="p-3">
          <div className="flex mb-6">
         
            
            <div className=" ">
              <h3 className="text-lg font-semibold mb-2">{state.viewData?.name}</h3>
              <p className="text-gray-600 mb-4">{state.viewData?.description}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <TitleValue2 
                  title="Store" 
                  value={state.viewData?.store_id?.name || 'N/A'} 
                  className="text-sm"
                />
                <TitleValue2 
                  title="Category" 
                  value={state.viewData?.category?.name || 'N/A'} 
                  className="text-sm"
                />
                <TitleValue2 
                  title="Brand" 
                  value={state.viewData?.brand?.name || 'N/A'} 
                  className="text-sm"
                />
                <TitleValue2 
                  title="Unit" 
                  value={state.viewData?.qty_head_id?.name || 'N/A'} 
                  className="text-sm"
                />
                <TitleValue2 
                  title="Base Price" 
                  value={`₹${state.viewData?.basePrice || 0}`} 
                  className="text-sm"
                />
                <TitleValue2 
                  title="Sale Price" 
                  value={`₹${state.viewData?.salePrice || 0}`} 
                  className="text-sm"
                />
                <TitleValue2 
                  title="Discount" 
                  value={`${state.viewData?.discount || 0}%`} 
                  className="text-sm"
                />
                <TitleValue2 
                  title="Prescription Required" 
                  value={state.viewData?.prescription_required ? 'Yes' : 'No'} 
                  className="text-sm"
                />
              </div>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Tax Information</h4>
            <div className="grid grid-cols-3 gap-4">
              <TitleValue2 
                title="HSN Code" 
                value={state.viewData?.hsn_code?.code || 'N/A'} 
                className="text-sm"
              />
              <TitleValue2 
                title="IGST" 
                value={`${state.viewData?.hsn_code?.IGST || 0}%`} 
                className="text-sm"
              />
              <TitleValue2 
                title="CGST" 
                value={`${state.viewData?.hsn_code?.CGST || 0}%`} 
                className="text-sm"
              />
              <TitleValue2 
                title="SGST" 
                value={`${state.viewData?.hsn_code?.SGST || 0}%`} 
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </DefaultModal>

      <DefaultModal
        isOpen={state.statusModal}
        onClose={() => handleCloseModal('statusModal')}
        title="Order Status Change"
        onSubmit={handleSubmit}
      >
        <div className="space
      {/* Product Details Modal */}-y-4">
          <FilterSelect
            options={selectJson?.ORDER_STATUS || []}
            value={selectJson?.ORDER_STATUS?.find(opt => opt.value === formData.status)}
            onChange={handleSelectChange}
            label="Status"
            placeholder="Select Status"
          />

          {formData.status === "cancelled" && (
            <Input
              type="textarea"
              labelName="Reason"
              value={formData.cancelReason}
              onChange={handleInputChange}
              name="cancelReason"
              placeholder="Enter cancellation reason (minimum 10 characters)"
              maxLength={1000}
              minLength={MINIMUM_CANCEL_REASON_LENGTH}
              required={true}
            />
          )}

          {formData.status === "out_for_shipping" && (
            <FilterSelect
              options={state.deliveryStaff}
              label="Delivery Staff"
              placeholder="Select delivery staff"
              onChange={handleStaffOnChange}
              value={state.deliveryStaff.find(opt => opt.value === formData.staff_id)}
            />
          )}
        </div>
      </DefaultModal>
    </div>
  );
};

export default OrderSummary;
