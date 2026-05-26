/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useCallback, useMemo } from "react";
import { FaChevronDown, FaChevronLeft, FaChevronUp, FaFile } from "react-icons/fa6";
import { IoEyeOutline } from 'react-icons/io5';
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router";
import { getOrderInfo, getProductInfo, orderCancel, updateOrderStatus } from "../../../../Redux/orderSlice";
import { toast } from "sonner";
import moment from "moment";
import FilterSelect from "../../../../components/Atoms/FilterSelect/FilterSelect";
import { TitleValue2, TitleValue } from "../../../../components/Atoms/TitleValue/TitleValue";
import Loader from "../../../../components/Loader/Loader";
import DefaultModal from "../../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../../components/Atoms/Input/Input";
import { getProfile } from "../../../../Redux/userSlice";
import useDropdownOptions from "../../../../hooks/useDropdownOptions";

const MINIMUM_CANCEL_REASON_LENGTH = 10;
const DESCRIPTION_WORD_LIMIT = 20;

const initialFormData = {
  order_id: "",
  status: "",
  cancelReason: "",
  store_id: "",
};

const money = (value) => Number(value || 0);
const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");

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
  const orderId = firstDefined(order._id, order.id, order.orderId);
  const items = Array.isArray(order.items) ? order.items : [];
  const sellerId = firstDefined(order.seller_id, order.sellerId, order.store_id);
  const sellerName = firstDefined(order.sellerName, order.store_name, "Platform");

  return {
    ...order,
    allOrders: [
      {
        _id: orderId,
        status: order.status,
        store_id: { _id: sellerId || "", name: sellerName },
        items: items.map((item) => ({
          ...item,
          _id: firstDefined(item._id, item.id),
          quantity: Number(item.quantity || 0),
          total: money(firstDefined(item.total, item.line_total)),
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
      createAt: firstDefined(order.createdAt, order.created_at),
      cartTotal: money(firstDefined(order.subtotalAmount, order.subtotal_amount)),
      taxCharges: money(firstDefined(order.taxAmount, order.tax_amount)),
      discountAmount: money(firstDefined(order.discountAmount, order.discount_amount)),
      netAmount: money(firstDefined(order.totalAmount, order.total_amount)),
    },
    contactInformation: {
      email: firstDefined(order.buyerEmail, order.user_id?.email, ""),
      phone: firstDefined(order.buyerPhone, order.user_id?.phone, ""),
    },
    deliveryAddress: normalizeAddress(firstDefined(order.shippingAddress, order.shipping_address, {})),
    orderPayment: {
      paymentDate: firstDefined(order.updatedAt, order.updated_at, order.createdAt, order.created_at),
      paymentDetails: { transactionId: firstDefined(order.payment_id, order.transactionId, orderId) },
      paymentMethod: firstDefined(order.paymentProvider, order.provider, "N/A"),
      amount: money(firstDefined(order.payableAmount, order.payable_amount, order.totalAmount, order.total_amount)),
      paymentStatus: firstDefined(order.paymentStatus, order.status, "N/A"),
    },
  };
};

const OrderSummary = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const orderStatuses = useDropdownOptions("order-statuses");

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
  });

  const [formData, setFormData] = useState(initialFormData);

  const canModifyOrder = useMemo(() => {
    return [3, 9].includes(Number(state.userData?.role_id || state.userData?.roleId));
  }, [state.userData?.role_id, state.userData?.roleId]);

  const allStoresOption = useMemo(() => [{ label: "All Stores", value: "" }], []);

  const handleError = useCallback((error, defaultMessage = "An error occurred") => {
    const errorMessage = error?.message || error || defaultMessage;
    toast.error(errorMessage);
  }, []);

  const setLoading = useCallback((loading) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const fetchOrderInfo = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await dispatch(getOrderInfo({ order_no: id })).unwrap();
      if (!res?.data) throw new Error("Invalid response format");

      const normalizedOrder = normalizeOrderDetail(res.data);
      const options = normalizedOrder.allOrders?.map((store) => ({
        label: store.store_id?.name || "Unknown Store",
        value: store.store_id?._id || "",
      })) || [];

      setState(prev => ({
        ...prev,
        storeOptions: [...allStoresOption, ...options],
        orderInfo: normalizedOrder,
      }));
    } catch (error) {
      handleError(error, "Failed to fetch order information");
    } finally {
      setLoading(false);
    }
  }, [id, dispatch, handleError, setLoading, allStoresOption]);

  const fetchUserData = useCallback(async () => {
    try {
      const res = await dispatch(getProfile()).unwrap();
      if (res?.data) setState(prev => ({ ...prev, userData: res.data }));
    } catch (error) {
      handleError(error, "Failed to fetch user profile");
    }
  }, [dispatch, handleError]);

  const handleDetails = useCallback(async (item) => {
    const productId = firstDefined(item?.product_id?._id, item?.product_id, item?.productId);
    if (!productId) return;
    try {
      setLoading(true);
      const res = await dispatch(getProductInfo({ product_id: productId })).unwrap();
      if (res?.data) setState(prev => ({ ...prev, viewData: res.data, viewDetails: true }));
    } catch (error) {
      handleError(error, "Failed to fetch product details");
    } finally {
      setLoading(false);
    }
  }, [dispatch, handleError, setLoading]);

  const validateFormData = useCallback(() => {
    if (!formData.order_id) return false;
    if (!formData.status) {
      toast.error("Status is required");
      return false;
    }
    if (formData.status === "cancelled" && (!formData.cancelReason || formData.cancelReason.trim().length < MINIMUM_CANCEL_REASON_LENGTH)) {
      toast.error(`Please provide a valid cancellation reason (at least ${MINIMUM_CANCEL_REASON_LENGTH} characters)`);
      return false;
    }
    return true;
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    if (!validateFormData()) return;
    try {
      setLoading(true);
      let res;
      if (formData.status === "cancelled") {
        res = await dispatch(orderCancel({
          order_id: formData.order_id,
          cancelledBy: "admin",
          cancelReason: formData.cancelReason || "Order cancelled by admin",
        })).unwrap();
      } else {
        res = await dispatch(updateOrderStatus({
          order_id: formData.order_id,
          status: formData.status,
        })).unwrap();
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
  }, [dispatch, formData, fetchOrderInfo, handleError, setLoading, validateFormData]);

  const handleSelectChange = useCallback((option) => {
    setFormData(prev => ({ ...prev, status: option?.value || "" }));
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleStatusModalOpen = useCallback((order) => {
    const orderId = firstDefined(order?._id, order?.id);
    if (!orderId) return;
    setFormData({ ...initialFormData, order_id: orderId, store_id: order?.store_id?._id || "" });
    setState(prev => ({ ...prev, statusModal: true }));
  }, []);

  const formatDescription = useCallback((description) => {
    if (!description) return "";
    const words = description.split(' ');
    return words.length > DESCRIPTION_WORD_LIMIT ? `${words.slice(0, DESCRIPTION_WORD_LIMIT).join(' ')}...` : description;
  }, []);

  useEffect(() => {
    fetchOrderInfo();
    fetchUserData();
  }, [fetchOrderInfo, fetchUserData]);

  const renderOrderItems = useCallback((order) => (
    <div key={order._id}>
      <div className="py-3 flex justify-start gap-3 items-center">
        <span className="px-3 py-1 text-sm text-teal-500 rounded-full bg-teal-50">{order.store_id?.name || "Unknown Store"}</span>
        {canModifyOrder && (
          <button className="text-gray-500 hover:text-gray-700 transition-colors" onClick={() => handleStatusModalOpen(order)} aria-label="Update order status">
            <FaFile size={18} />
          </button>
        )}
      </div>
      {order.items?.map((item) => (
        <div key={item._id} className="grid items-center grid-cols-11 py-4 border-b">
          <div className="flex items-center col-span-4">
            <div>
              <div className="font-medium">{item?.product_id?.name || "Unknown Product"}</div>
              <div className="text-xs text-gray-500 truncate text-wrap break-words">{formatDescription(item?.product_id?.description)}</div>
            </div>
          </div>
          <div className="col-span-2"><span className="px-2 py-1 text-xs text-teal-500 rounded-full bg-teal-50">{order.store_id?.name || "Unknown Store"}</span></div>
          <div className="col-span-2"><span className="px-2 py-1 text-xs text-blue-500 rounded-full bg-blue-50">{order.status || "Unknown"}</span></div>
          <div className="col-span-1 text-center">{item.quantity || 0}</div>
          <div className="col-span-2 font-medium">₹ {(item.total || 0).toFixed(2)}</div>
          <button className="text-gray-500 hover:text-gray-700 transition-colors" onClick={() => handleDetails(item)} aria-label="View product details">
            <IoEyeOutline size={18} />
          </button>
        </div>
      ))}
    </div>
  ), [canModifyOrder, formatDescription, handleDetails, handleStatusModalOpen]);

  if (!id) {
    return <div className="min-h-screen flex items-center justify-center text-xl font-semibold text-gray-700">Invalid Order ID</div>;
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100">
      <Loader loading={state.isLoading} />
      <div className="flex flex-col gap-4 mx-auto max-w-7xl lg:flex-row">
        <div className="flex-grow p-4">
          <div className="flex items-center p-2 bg-white">
            <button className="mr-2 text-blue-500 hover:text-blue-700 transition-colors" onClick={() => navigate('/app/orders')} aria-label="Go back to orders">
              <FaChevronLeft size={20} />
            </button>
            <h1 className="text-lg font-medium">Order #{id}</h1>
            <div className="relative ml-auto">
              <FilterSelect
                options={state.storeOptions}
                placeholder="Store"
                value={state.storeOptions.find(opt => opt.value === state.selectedSeller) || null}
                onChange={(value) => setState(prev => ({ ...prev, selectedSeller: value?.value || "" }))}
              />
            </div>
          </div>
          <div className="bg-white p-2 mb-8">
            <div className="grid grid-cols-12 py-3 text-sm font-medium text-gray-600 border-b">
              <div className="col-span-4">Items summary</div>
              <div className="col-span-2">Fulfilled by</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Quantity</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-1">Actions</div>
            </div>
            {state.orderInfo?.allOrders?.length > 0 ? state.orderInfo.allOrders.map(renderOrderItems) : <div className="py-8 text-center text-gray-500">No orders found</div>}
          </div>
        </div>

        <div className="w-full lg:w-1/2 space-y-4">
          <div className="bg-white shadow-sm">
            <div className="flex items-center border-b p-3">
              <FaFile className="mr-2" size={18} />
              <h2 className="text-[1.1rem] pt-2">Order Summary</h2>
            </div>
            <div className="p-6 space-y-2">
              <TitleValue title="Order Date" value={state.orderInfo?.orderSummary?.createAt ? moment(state.orderInfo.orderSummary.createAt).format('DD MMM YYYY') : 'N/A'} />
              <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal:</span><span>₹{(state.orderInfo?.orderSummary?.cartTotal || 0).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Tax:</span><span>₹{(state.orderInfo?.orderSummary?.taxCharges || 0).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Discount:</span><span className="text-green-600">-₹{(state.orderInfo?.orderSummary?.discountAmount || 0).toFixed(2)}</span></div>
              <div className="border-t pt-2 mt-1 flex justify-between font-medium"><span className="text-gray-700">Total:</span><span className="text-gray-900">₹{(state.orderInfo?.orderSummary?.netAmount || 0).toFixed(2)}</span></div>
            </div>
          </div>

          <div className="relative p-2 bg-white shadow-sm">
            <div className="flex items-center justify-between p-2 border-b">
              <h2 className="text-[1.1rem]">Delivery Address</h2>
              <button onClick={() => setState(prev => ({ ...prev, isExpanded: !prev.isExpanded }))} className="text-gray-500 hover:text-gray-700 transition-colors" aria-label={state.isExpanded ? "Collapse address" : "Expand address"}>
                {state.isExpanded ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            </div>
            {state.isExpanded && (
              <div className="space-y-4 pt-4">
                <TitleValue title="House/Flat/Floor" value={state.orderInfo?.deliveryAddress?.house_flat_floor || 'N/A'} />
                <TitleValue title="Apartment/Area/Road" value={state.orderInfo?.deliveryAddress?.apartment_area_road || 'N/A'} />
                <TitleValue title="Delivery Instructions" value={state.orderInfo?.deliveryAddress?.delivery_instructions || 'N/A'} />
                <TitleValue title="Phone" value={state.orderInfo?.deliveryAddress?.phone || 'N/A'} />
                <TitleValue2 title="Full Address" value={state.orderInfo?.deliveryAddress?.location?.address_string?.fullAddress || 'N/A'} />
              </div>
            )}
          </div>
        </div>
      </div>

      <DefaultModal isOpen={state.viewDetails} onClose={() => setState(prev => ({ ...prev, viewDetails: false }))} title={state.viewData?.name || 'Product Details'}>
        <div className="p-3">
          <h3 className="text-lg font-semibold mb-2">{state.viewData?.name || state.viewData?.title || 'N/A'}</h3>
          <p className="text-gray-600 mb-4">{state.viewData?.description || 'N/A'}</p>
          <div className="grid grid-cols-2 gap-4">
            <TitleValue2 title="Category" value={state.viewData?.category?.name || state.viewData?.category || 'N/A'} className="text-sm" />
            <TitleValue2 title="Brand" value={state.viewData?.brand?.name || state.viewData?.brand || 'N/A'} className="text-sm" />
            <TitleValue2 title="Price" value={`₹${state.viewData?.price || state.viewData?.salePrice || 0}`} className="text-sm" />
            <TitleValue2 title="MRP" value={`₹${state.viewData?.mrp || 0}`} className="text-sm" />
          </div>
        </div>
      </DefaultModal>

      <DefaultModal isOpen={state.statusModal} onClose={() => setState(prev => ({ ...prev, statusModal: false }))} title="Order Status Change" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <FilterSelect
            options={orderStatuses.options}
            value={orderStatuses.options.find((opt) => opt.value === formData.status) || null}
            onChange={handleSelectChange}
            label="Status"
            placeholder="Select Status"
            isLoading={orderStatuses.loading}
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
        </div>
      </DefaultModal>
    </div>
  );
};

export default OrderSummary;
