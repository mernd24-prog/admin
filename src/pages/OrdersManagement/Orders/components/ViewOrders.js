/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaChevronLeft, FaFile, FaRegNoteSticky } from "react-icons/fa6";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import moment from "moment";
import { addOrderNote, getOrderInfo, orderCancel, updateOrderStatus } from "../../../../Redux/orderSlice";
import { getProfile } from "../../../../Redux/userSlice";
import Loader from "../../../../components/Loader/Loader";
import DefaultModal from "../../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../../components/Atoms/Input/Input";
import FilterSelect from "../../../../components/Atoms/FilterSelect/FilterSelect";
import PermissionGuard from "../../../../components/Atoms/PermissionGuard/PermissionGuard";
import { TitleValue, TitleValue2 } from "../../../../components/Atoms/TitleValue/TitleValue";

const MINIMUM_CANCEL_REASON_LENGTH = 10;

const STATUS_OPTIONS = [
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "fulfilled",
  "return_requested",
  "returned",
  "cancelled",
].map((status) => ({ value: status, label: status.replace(/_/g, " ") }));

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const money = (value) => Number(value || 0);

const percent = (value) => `${Number(value || 0).toFixed(2).replace(/\.00$/, "")}%`;

const displayStatus = (value = "") =>
  String(value || "N/A").replace(/_/g, " ");

const normalizeJson = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
};

const getOrderId = (order = {}) => firstDefined(order.id, order._id, order.orderId, order.order_no);

const formatMoney = (value) => `₹ ${money(value).toFixed(2)}`;

const getItemKey = (item = {}) => firstDefined(item.id, item._id, `${item.product_id}-${item.variant_sku}`);

const getItemTaxLabel = (tax = {}, item = {}) => {
  const gstRate = firstDefined(tax.gstRate, item.gst_rate, item.gstRate, 0);
  const cessRate = firstDefined(tax.cessRate, item.cess_rate, item.cessRate, 0);
  const mode = firstDefined(tax.taxMode, tax.tax_mode, "N/A");
  const cessText = money(cessRate) > 0 ? ` + Cess ${percent(cessRate)}` : "";
  return `${percent(gstRate)} GST${cessText} · ${displayStatus(mode)}`;
};

const getOrderTaxRates = (taxBreakup = {}, items = []) => {
  const sourceItems = Array.isArray(taxBreakup.items) && taxBreakup.items.length
    ? taxBreakup.items
    : items.map((item) => normalizeJson(firstDefined(item.tax_breakup, item.taxBreakup), {}));
  const rates = sourceItems
    .map((taxItem, index) => firstDefined(taxItem.gstRate, items[index]?.gst_rate, items[index]?.gstRate))
    .filter((rate) => rate !== undefined && rate !== null && rate !== "")
    .map((rate) => Number(rate || 0));
  return [...new Set(rates)].sort((a, b) => a - b);
};

const groupItemsBySeller = (items = []) =>
  items.reduce((groups, item) => {
    const sellerId = firstDefined(item.seller_id, item.sellerId, "platform");
    const sellerSnapshot = normalizeJson(firstDefined(item.seller_snapshot, item.sellerSnapshot), {});
    const sellerName = firstDefined(sellerSnapshot.name, sellerSnapshot.sellerName, sellerId);
    if (!groups[sellerId]) {
      groups[sellerId] = { sellerId, sellerName, items: [] };
    }
    groups[sellerId].items.push(item);
    return groups;
  }, {});

const buildSellerSettlements = (items = []) =>
  Object.values(groupItemsBySeller(items)).map((group) => {
    const totals = group.items.reduce(
      (acc, item) => {
        const itemTax = normalizeJson(firstDefined(item.tax_breakup, item.taxBreakup), {});
        const pricing = normalizeJson(firstDefined(item.pricing_snapshot, item.pricingSnapshot), {});
        const lineTotal = money(firstDefined(item.line_total, item.lineTotal));
        const taxableAmount = money(firstDefined(itemTax.taxableAmount, itemTax.taxable_amount, lineTotal - money(firstDefined(item.discount_amount, item.discountAmount))));
        const taxAmount = money(firstDefined(item.tax_amount, item.taxAmount, itemTax.taxAmount, itemTax.tax_amount));
        const platformFee = money(firstDefined(item.platform_fee_amount, item.platformFeeAmount, pricing.platformFeeAmount));
        const commissionFee = money(firstDefined(pricing.commissionFee, pricing.commission_fee, platformFee));
        const fixedFee = money(firstDefined(pricing.fixedFee, pricing.fixed_fee));
        const closingFee = money(firstDefined(pricing.closingFee, pricing.closing_fee));
        const commissionPercent = money(firstDefined(pricing.commissionPercent, pricing.commission_percent));

        acc.grossSales += lineTotal;
        acc.taxableSales += taxableAmount;
        acc.taxCollected += taxAmount;
        acc.platformFee += platformFee;
        acc.commissionFee += commissionFee;
        acc.fixedFee += fixedFee;
        acc.closingFee += closingFee;
        if (commissionPercent > 0) acc.commissionRates.add(commissionPercent);
        return acc;
      },
      {
        grossSales: 0,
        taxableSales: 0,
        taxCollected: 0,
        platformFee: 0,
        commissionFee: 0,
        fixedFee: 0,
        closingFee: 0,
        commissionRates: new Set(),
      },
    );

    return {
      ...group,
      ...totals,
      commissionRates: [...totals.commissionRates].sort((a, b) => a - b),
      sellerPayout: Math.max(0, Number((totals.taxableSales - totals.platformFee).toFixed(2))),
    };
  });

const OrderSummary = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();

  const [state, setState] = useState({
    orderInfo: null,
    isLoading: false,
    statusModal: false,
    noteModal: false,
    userData: {},
  });
  const [formData, setFormData] = useState({ status: "", reason: "", note: "" });
  const [noteData, setNoteData] = useState({ note: "", visibility: "internal" });

  const setLoading = useCallback((loading) => {
    setState((prev) => ({ ...prev, isLoading: loading }));
  }, []);

  const handleError = useCallback((error, defaultMessage = "An error occurred") => {
    toast.error(error?.message || error || defaultMessage);
  }, []);

  const fetchOrderInfo = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await dispatch(getOrderInfo({ orderId: id })).unwrap();
      if (!res?.data) throw new Error("Invalid order response");
      setState((prev) => ({ ...prev, orderInfo: res.data }));
    } catch (error) {
      handleError(error, "Failed to fetch order information");
    } finally {
      setLoading(false);
    }
  }, [id, dispatch, handleError, setLoading]);

  const fetchUserData = useCallback(async () => {
    try {
      const res = await dispatch(getProfile()).unwrap();
      if (res?.data) setState((prev) => ({ ...prev, userData: res.data }));
    } catch {
      setState((prev) => ({ ...prev, userData: {} }));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchOrderInfo();
    fetchUserData();
  }, [fetchOrderInfo, fetchUserData]);

  const order = state.orderInfo || {};
  const orderId = getOrderId(order);
  const orderNumber = firstDefined(order.order_number, order.orderNumber, order.order_no, orderId);
  const shippingAddress = normalizeJson(firstDefined(order.shipping_address, order.shippingAddress), {});
  const taxBreakup = normalizeJson(firstDefined(order.tax_breakup, order.taxBreakup), {});
  const summary = order.summary || {};
  const taxIncludedAmount = money(firstDefined(summary.taxIncludedAmount, taxBreakup.taxIncludedAmount));
  const taxPayableAmount = money(firstDefined(summary.taxPayableAmount, taxBreakup.taxPayableAmount));
  const customerTotalAmount = money(firstDefined(summary.customerTotalAmount, order.total_amount, order.totalAmount));
  const customerPayableAmount = money(firstDefined(summary.customerPayableAmount, order.payable_amount, order.payableAmount, order.total_amount));
  const items = Array.isArray(order.items) ? order.items : [];
  const sellerGroups = useMemo(() => Object.values(groupItemsBySeller(items)), [items]);
  const sellerSettlements = useMemo(() => buildSellerSettlements(items), [items]);
  const orderTaxRates = useMemo(() => getOrderTaxRates(taxBreakup, items), [taxBreakup, items]);
  const timeline = Array.isArray(order.timeline) ? order.timeline : [];
  const notes = Array.isArray(order.notes) ? order.notes : [];

  const handleStatusSubmit = useCallback(async () => {
    if (!formData.status) {
      toast.error("Status is required");
      return;
    }
    if (formData.status === "cancelled" && formData.reason.trim().length < MINIMUM_CANCEL_REASON_LENGTH) {
      toast.error(`Please provide a cancellation reason with at least ${MINIMUM_CANCEL_REASON_LENGTH} characters`);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        orderId,
        status: formData.status,
        reason: formData.reason,
        note: formData.note,
      };
      const res = formData.status === "cancelled"
        ? await dispatch(orderCancel({ orderId, reason: formData.reason })).unwrap()
        : await dispatch(updateOrderStatus(payload)).unwrap();
      toast.success(res?.message || "Order updated successfully");
      setState((prev) => ({ ...prev, statusModal: false }));
      setFormData({ status: "", reason: "", note: "" });
      await fetchOrderInfo();
    } catch (error) {
      handleError(error, "Failed to update order");
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchOrderInfo, formData, handleError, orderId, setLoading]);

  const handleNoteSubmit = useCallback(async () => {
    if (!noteData.note.trim()) {
      toast.error("Note is required");
      return;
    }

    try {
      setLoading(true);
      await dispatch(addOrderNote({ orderId, ...noteData })).unwrap();
      toast.success("Note added successfully");
      setState((prev) => ({ ...prev, noteModal: false }));
      setNoteData({ note: "", visibility: "internal" });
      await fetchOrderInfo();
    } catch (error) {
      handleError(error, "Failed to add order note");
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchOrderInfo, handleError, noteData, orderId, setLoading]);

  if (!id) {
    return <div className="min-h-screen flex items-center justify-center text-xl font-semibold text-gray-700">Invalid Order ID</div>;
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100">
      <Loader loading={state.isLoading} />

      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex items-center gap-3 bg-white p-3">
          <button className="text-blue-500 hover:text-blue-700" onClick={() => navigate("/app/orders")} aria-label="Go back to orders">
            <FaChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-medium">Order #{orderNumber}</h1>
            <p className="text-xs text-gray-500">{orderId}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <PermissionGuard module="orders" action="update" hide>
              <button className="border px-3 py-2 rounded text-sm" onClick={() => setState((prev) => ({ ...prev, noteModal: true }))}>
                <FaRegNoteSticky className="inline mr-2" /> Note
              </button>
            </PermissionGuard>
            <PermissionGuard module="orders" action="status_change" hide>
              <button className="bg-[#181c32] text-white px-3 py-2 rounded text-sm" onClick={() => setState((prev) => ({ ...prev, statusModal: true }))}>
                <FaFile className="inline mr-2" /> Status
              </button>
            </PermissionGuard>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="lg:col-span-2 bg-white p-4">
            <h2 className="font-medium mb-3">Items By Seller</h2>
            {sellerGroups.length ? sellerGroups.map((group) => (
              <div key={group.sellerId} className="border-t py-3">
                <div className="text-sm font-medium text-teal-600 mb-2">{group.sellerName}</div>
                {group.items.map((item) => {
                  const itemTax = normalizeJson(firstDefined(item.tax_breakup, item.taxBreakup), {});
                  const productSnapshot = normalizeJson(firstDefined(item.product_snapshot, item.productSnapshot), {});
                  const productTitle = firstDefined(item.product_title, item.productTitle, productSnapshot.title, item.product_id, "Product");
                  return (
                    <div key={getItemKey(item)} className="grid grid-cols-12 gap-2 py-3 border-b text-sm">
                      <div className="col-span-5">
                        <div className="font-medium">{productTitle}</div>
                        <div className="text-xs text-gray-500">
                          SKU: {firstDefined(item.variant_sku, item.product_sku, productSnapshot.sku, "N/A")} · HSN: {firstDefined(item.hsn_code, productSnapshot.hsnCode, "N/A")}
                        </div>
                      </div>
                      <div className="col-span-2 capitalize">{displayStatus(order.status)}</div>
                      <div className="col-span-1 text-center">{Number(item.quantity || 0)}</div>
                      <div className="col-span-2">₹ {money(firstDefined(item.unit_price, item.unitPrice)).toFixed(2)}</div>
                      <div className="col-span-2">
                        <div>₹ {money(firstDefined(item.line_total, item.lineTotal)).toFixed(2)}</div>
                        <div className="text-xs text-gray-500">
                          Tax {formatMoney(firstDefined(item.tax_amount, item.taxAmount, itemTax.taxAmount))} ({getItemTaxLabel(itemTax, item)})
                        </div>
                        <div className="text-xs text-gray-500">
                          Taxable {formatMoney(firstDefined(itemTax.taxableAmount, itemTax.taxable_amount, item.line_total, item.lineTotal))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )) : <div className="py-8 text-center text-gray-500">No items found</div>}
          </section>

          <aside className="space-y-4">
            <section className="bg-white p-4">
              <h2 className="font-medium mb-3">Order Summary</h2>
              <TitleValue title="Order Date" value={order.created_at ? moment(order.created_at).format("DD MMM YYYY HH:mm") : "N/A"} />
              <TitleValue title="Status" value={displayStatus(order.status)} />
              <TitleValue title="Payment" value={displayStatus(firstDefined(order.payment_status, order.paymentStatus))} />
              <TitleValue title="Payment Method" value={displayStatus(firstDefined(order.payment_provider, order.paymentProvider))} />
              <TitleValue title="Delivery" value={displayStatus(firstDefined(order.delivery_status, order.deliveryStatus))} />
              <div className="border-t pt-3 mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>₹ {money(firstDefined(order.subtotal_amount, order.subtotalAmount)).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span className="text-green-600">-₹ {money(firstDefined(order.discount_amount, order.discountAmount)).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>GST payable by customer</span><span>₹ {taxPayableAmount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>GST included in items</span><span>₹ {taxIncludedAmount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Platform fees deducted from seller</span><span>₹ {money(firstDefined(order.platform_fee_amount, order.platformFeeAmount)).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>COD Charge</span><span>₹ {money(firstDefined(order.cod_charge_amount, order.codChargeAmount)).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Wallet</span><span>-₹ {money(firstDefined(order.wallet_discount_amount, order.walletDiscountAmount)).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Customer total</span><span>₹ {customerTotalAmount.toFixed(2)}</span></div>
                <div className="flex justify-between font-medium border-t pt-2"><span>Customer payable</span><span>₹ {customerPayableAmount.toFixed(2)}</span></div>
              </div>
            </section>

            <section className="bg-white p-4">
              <h2 className="font-medium mb-3">Tax Breakup</h2>
              <TitleValue title="Taxable" value={formatMoney(taxBreakup.taxableAmount)} />
              <TitleValue title="GST Rate" value={orderTaxRates.length ? orderTaxRates.map(percent).join(", ") : "N/A"} />
              <TitleValue title={`CGST ${money(taxBreakup.cgstAmount) > 0 && orderTaxRates.length === 1 ? percent(orderTaxRates[0] / 2) : ""}`} value={formatMoney(taxBreakup.cgstAmount)} />
              <TitleValue title={`SGST ${money(taxBreakup.sgstAmount) > 0 && orderTaxRates.length === 1 ? percent(orderTaxRates[0] / 2) : ""}`} value={formatMoney(taxBreakup.sgstAmount)} />
              <TitleValue title={`IGST ${money(taxBreakup.igstAmount) > 0 ? orderTaxRates.map(percent).join(", ") : ""}`} value={formatMoney(taxBreakup.igstAmount)} />
              <TitleValue title="Cess" value={formatMoney(taxBreakup.cessAmount)} />
              <TitleValue title="Total Tax" value={formatMoney(firstDefined(order.tax_amount, order.taxAmount, taxBreakup.totalTaxAmount))} />
              <TitleValue title="Tax Added To Payable" value={formatMoney(taxPayableAmount)} />
              <TitleValue title="Tax Included In Price" value={formatMoney(taxIncludedAmount)} />
              <TitleValue title="Mode" value={displayStatus(taxBreakup.taxMode)} />
              {Array.isArray(taxBreakup.items) && taxBreakup.items.length > 0 && (
                <div className="mt-3 border-t pt-3 space-y-2">
                  {taxBreakup.items.map((taxItem, index) => {
                    const orderItem = items[index] || {};
                    const productSnapshot = normalizeJson(firstDefined(orderItem.product_snapshot, orderItem.productSnapshot), {});
                    const productTitle = firstDefined(orderItem.product_title, orderItem.productTitle, productSnapshot.title, taxItem.productId, `Item ${index + 1}`);
                    return (
                      <div key={`${taxItem.productId || "tax"}-${index}`} className="text-xs text-gray-600">
                        <div className="font-medium text-gray-700">{productTitle}</div>
                        <div className="flex justify-between gap-2">
                          <span>{getItemTaxLabel(taxItem, orderItem)}</span>
                          <span>{formatMoney(money(taxItem.taxAmount) + money(taxItem.cessAmount))}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>Taxable base</span>
                          <span>{formatMoney(taxItem.taxableAmount)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="bg-white p-4">
              <h2 className="font-medium mb-3">Buyer & Shipping</h2>
              <TitleValue title="Buyer" value={firstDefined(order.buyer_id, order.buyerId, "N/A")} />
              <TitleValue2 title="Address" value={[shippingAddress.line1, shippingAddress.line2, shippingAddress.city, shippingAddress.state, shippingAddress.postalCode, shippingAddress.country].filter(Boolean).join(", ") || "N/A"} />
            </section>
          </aside>
        </div>

        <section className="bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="font-medium">Seller Commission & Payout</h2>
              <p className="text-xs text-gray-500 mt-1">
                Admin flow: keep tax in the tax ledger, cut platform fees/commission, then pay seller the net product amount.
              </p>
            </div>
          </div>
          {sellerSettlements.length ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {sellerSettlements.map((seller) => (
                <div key={seller.sellerId} className="border p-3 text-sm">
                  <div className="flex justify-between gap-2 mb-3">
                    <div>
                      <div className="font-medium text-teal-600">{seller.sellerName}</div>
                      <div className="text-xs text-gray-500">{seller.sellerId}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatMoney(seller.sellerPayout)}</div>
                      <div className="text-xs text-gray-500">seller payout</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>Taxable product sales</span><span>{formatMoney(seller.taxableSales)}</span></div>
                    <div className="flex justify-between"><span>Tax to maintain</span><span>{formatMoney(seller.taxCollected)}</span></div>
                    <div className="flex justify-between">
                      <span>Platform commission</span>
                      <span>
                        -{formatMoney(seller.commissionFee)}
                        {seller.commissionRates.length ? ` (${seller.commissionRates.map(percent).join(", ")})` : ""}
                      </span>
                    </div>
                    <div className="flex justify-between"><span>Fixed/closing fees</span><span>-{formatMoney(seller.fixedFee + seller.closingFee)}</span></div>
                    <div className="flex justify-between font-medium border-t pt-2"><span>Net seller payout</span><span>{formatMoney(seller.sellerPayout)}</span></div>
                  </div>
                  <div className="mt-3 bg-gray-50 p-2 text-xs text-gray-600">
                    Formula: Seller payout = taxable product sales - platform commission - fixed/closing fees. Tax is shown separately so admin can maintain GST liability before settlement.
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-gray-500">No seller settlement data found</div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="bg-white p-4">
            <h2 className="font-medium mb-3">Timeline</h2>
            {timeline.length ? timeline.map((entry) => (
              <div key={entry.id} className="border-l pl-3 pb-4 text-sm">
                <div className="font-medium capitalize">{displayStatus(entry.to_status || entry.toStatus)}</div>
                <div className="text-gray-500">{entry.created_at ? moment(entry.created_at).format("DD MMM YYYY HH:mm") : "N/A"} · {entry.actor_role || "system"}</div>
                {entry.reason && <div className="text-gray-600 mt-1">{entry.reason}</div>}
              </div>
            )) : <div className="text-sm text-gray-500">No timeline yet</div>}
          </section>

          <section className="bg-white p-4">
            <h2 className="font-medium mb-3">Notes</h2>
            {notes.length ? notes.map((note) => (
              <div key={note.id} className="border-b py-3 text-sm">
                <div className="text-gray-700">{note.note}</div>
                <div className="text-xs text-gray-500 mt-1">{note.actor_role || "system"} · {note.visibility} · {note.created_at ? moment(note.created_at).format("DD MMM YYYY HH:mm") : "N/A"}</div>
              </div>
            )) : <div className="text-sm text-gray-500">No notes yet</div>}
          </section>
        </div>
      </div>

      <DefaultModal isOpen={state.statusModal} onClose={() => setState((prev) => ({ ...prev, statusModal: false }))} title="Order Status Change" onSubmit={handleStatusSubmit}>
        <div className="space-y-4">
          <FilterSelect
            options={STATUS_OPTIONS}
            value={STATUS_OPTIONS.find((opt) => opt.value === formData.status) || null}
            onChange={(option) => setFormData((prev) => ({ ...prev, status: option?.value || "" }))}
            label="Status"
            placeholder="Select Status"
          />
          <Input type="textarea" labelName="Reason" value={formData.reason} onChange={(event) => setFormData((prev) => ({ ...prev, reason: event.target.value }))} name="reason" placeholder="Reason or operational note" maxLength={1000} />
          <Input type="textarea" labelName="Internal Note" value={formData.note} onChange={(event) => setFormData((prev) => ({ ...prev, note: event.target.value }))} name="note" placeholder="Optional internal note" maxLength={1000} />
        </div>
      </DefaultModal>

      <DefaultModal isOpen={state.noteModal} onClose={() => setState((prev) => ({ ...prev, noteModal: false }))} title="Add Order Note" onSubmit={handleNoteSubmit}>
        <div className="space-y-4">
          <select className="border rounded px-3 py-2 text-sm w-full" value={noteData.visibility} onChange={(event) => setNoteData((prev) => ({ ...prev, visibility: event.target.value }))}>
            <option value="internal">Internal</option>
            <option value="seller">Seller visible</option>
            <option value="buyer">Buyer visible</option>
          </select>
          <Input type="textarea" labelName="Note" value={noteData.note} onChange={(event) => setNoteData((prev) => ({ ...prev, note: event.target.value }))} name="note" placeholder="Enter order note" maxLength={2000} required={true} />
        </div>
      </DefaultModal>
    </div>
  );
};

export default OrderSummary;
