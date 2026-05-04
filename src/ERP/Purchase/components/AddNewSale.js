import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { IoMdCall, IoMdCart, IoMdHome, IoMdPersonAdd, IoMdSearch } from "react-icons/io";
import TableData from "../../../components/Atoms/TableData/TableData";
import { useDispatch, useSelector } from "react-redux";
import { getAllStoreList } from "../../../Redux/productSlice";
import { createSaleOrder, getInventoryList } from "../../../Redux/erpSlice";
import Input from "../../../components/Atoms/Input/Input";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import Button from "../../../components/Atoms/buttons/button";
import { useRef } from "react";
import moment from "moment";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {  FaStore } from "react-icons/fa";
import Modal from "../../../components/DefaultModal/DefaultModal";
import { TitleValue } from "../../../components/Atoms/TitleValue/TitleValue";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import { CiUser } from "react-icons/ci";

const OptimizedSellerOrder = () => {
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [stockList, setStockList] = useState([]);
  const [cart, setCart] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const invoiceRef = useRef();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: "", phone_number: "", description: "", shipping_address: "", delivery_date: "",
  });
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [isAddModalOpen, setIsOpenAddModal] = useState(false);
  const dispatch = useDispatch();
  const selector = useSelector((state) => state);
  const stores = selector?.product?.getAllStoreListData?.data?.data?.list || [];

  useEffect(() => {
    dispatch(getAllStoreList());
  }, [dispatch]);

  useEffect(() => {
    if (!selectedStoreId) return;
    const data = {
      page: 1,
      limit: 100,
      store_id: selectedStoreId,
    };

    const fetchStockList = async () => {
      try {
        const response = await dispatch(getInventoryList(data));
        if (response?.payload?.data?.data?.data) {
          setStockList(response?.payload?.data?.data?.data);
        } else {
          setStockList([]);
        }
      } catch (error) {
        console.error("Error fetching stock list:", error);
        setStockList([]);
      }
    };

    fetchStockList();
  }, [selectedStoreId, dispatch]);

  const addToCart = (rowId, maxQty = 1000) => {
    if (maxQty === 0) {
      toast.warning("Product is out of stock");
      return;
    }
    const check = cartItems?.find((item) => item.rowId === rowId);
    if (check) {
      if (check.qty >= maxQty) {
        toast.warning("Maximum quantity reached for this product");
        return;
      }
    }
    setCart((prev) => ({
      ...prev,
      [rowId]: (prev[rowId] || 0) + 1,
    }));
    toast.success("Product added to cart");
  };

  const formatExpDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const filteredStockList = useMemo(() => {
    if (!searchTerm) return stockList;
    return stockList?.filter((item) => {
      const productName = item.product_name?.toLowerCase() || "";
      const productNo = item.product_no?.toLowerCase() || "";
      const batchNos =
        item.head?.map((h) => h.batch_no?.toLowerCase() || "").join(" ") || "";
      const types =
        item.head?.map((h) => h.type?.toLowerCase() || "").join(" ") || "";

      const term = searchTerm.toLowerCase();
      return (
        productName.includes(term) ||
        productNo.includes(term) ||
        batchNos.includes(term) ||
        types.includes(term)
      );
    });
  }, [stockList, searchTerm]);

  const getCartItems = () => {
    let items = [];
    filteredStockList.forEach((item) => {
      item.head.forEach((headItem, index) => {
        const rowId = `${item._id}_${headItem.batch_id}_${index}`;
        if (cart[rowId] >= 0) {
          items.push({
            ...item,
            headItem,
            rowId,
            qty: cart[rowId],
          });
        }
      });
    });
    return items;
  };

  const getTotalAmount = () => {
    return getCartItems().reduce(
      (total, item) => total + item.headItem.price * item.qty,
      0
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.customer_name.trim()) {
      newErrors.customer_name = "Customer name is required";
    }
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone_number)) {
      newErrors.phone_number = "Invalid phone number";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!selectedStoreId) {
      newErrors.store = "Store selection is required";
    }
    if (getCartItems().length === 0) {
      newErrors.cart = "Please add items to cart";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveOrder = async () => {
    if (!validateForm()) return;

    const cartItems = getCartItems();
    const itemsPayload = cartItems.map((item) => ({
      product_id: item.product_id,
      quantity: item.qty,
      type: item.headItem.type,
      po_rate: item.headItem.price,
      batch_id: item.headItem.batch_id,
    }));

    const payload = {
      customer_name: formData.customer_name,
      phone_number: formData.phone_number,
      description: formData.description,
      store_id: selectedStoreId,
      shipping_address: formData.shipping_address,
      delivery_date: formData.delivery_date,
      items: itemsPayload,
    };

    try {
      const response = await dispatch(createSaleOrder(payload));
      if (response?.payload?.message) {
        toast.success("Order created successfully!", {
          description: "Your order has been placed and is being processed.",
          duration: 4000,
        });

        setFormData({
          customer_name: "",
          phone_number: "",
          description: "",
          shipping_address: "",
          delivery_date: "",
        });
        setCart({});
        navigate("/app/sale");
      } else {
        toast.error("Failed to create order", {
          description: "Please check your details and try again.",
          duration: 4000,
        });
      }
    } catch (error) {
      toast.error("Failed to create order", {
        description: "Please check your details and try again.",
        duration: 4000,
      });
      console.error("Error creating order:", error);
    }
  };

  const handleRemoveProduct = (rowId) => {
    setCart((prev) => {
      const newCart = { ...prev };
      delete newCart[rowId];
      return newCart;
    });
  };

  const handlePrint = async () => {
    if (!invoiceRef.current) return;

    const input = invoiceRef.current;

    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-export.pdf`);
    } catch (error) {
      toast.error("Error generating PDF");
      console.error("PDF export error:", error);
    }
  };

  const handleClose = () => {
    setIsOpenAddModal(false);
  };

  const handleOpenModal = () => {
    setIsOpenAddModal(true);
  };

  const selectedStore = stores?.find((store) => store._id === selectedStoreId);
  const cartItems = getCartItems();
  const cartTotal = getTotalAmount();



  const invoiceTableHeadings = [
    "PRODUCT NAME",
    "Product No",
    "BATCH",
    "TYPE",
    "EXPIRY Date",
    "QTY",
    "PACKAGING",
    "Total",
  ];

  const productTableData = useMemo(() => {
    return filteredStockList.flatMap((item) =>
      item.head.map((headItem, index) => ({
        productName: item.product_name || "N/A",
        productNo: item.product_no || "N/A",
        type: headItem.type || "N/A",
        packaging: headItem.packaging || "N/A",
        batchNo: headItem.batch_no || "N/A",
        manufacture: headItem.manufacture ? formatExpDate(headItem.manufacture) : "N/A",
        expiry: headItem.expriy ? formatExpDate(headItem.expriy) : "N/A",
        stock: headItem.net_qty,
        price: headItem.price,
        rowId: `${item._id}_${headItem.batch_id}_${index}`,
        maxQty: headItem.net_qty
      }))
    );
  }, [filteredStockList]);


  // const tableRows =
  //   productTableData?.map((product) => [
  //     <span key={`name-${product._id}`} className="font-medium capitalize">
  //       {product.productName}
  //     </span>,
  //     <div className="text-sm text-gray-900">
  //       <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
  //         {product.type}
  //       </span>
  //       {product.packaging && (
  //         <p className=" text-xs text-gray-600 pt-2">
  //           {product.packaging}
  //         </p>
  //       )}
  //     </div>,
  //     <td className="px-4 py-4 whitespace-nowrap">
  //       <div className="text-sm text-gray-900">{product.batchNo}</div>
  //       <div className="text-xs text-gray-500">
  //         EXP: {product.expiry}
  //       </div>
  //     </td>,
  //     <span> {product.stock}   </span>,
  //     <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
  //       ₹{product.price}
  //     </td>,
  //     <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
  //       <button
  //         onClick={() => addToCart(product.rowId, product.maxQty)}
  //         disabled={product.stock === 0}
  //         className={`px-3 py-1 rounded-md text-sm font-medium ${product.stock === 0
  //           ? "bg-gray-100 text-gray-400 cursor-not-allowed"
  //           : "bg-blue-600 text-black hover:bg-blue-700"
  //           }`}
  //       >
  //         {product.stock === 0 ? "Out of Stock" : "Add"}
  //       </button>
  //     </td>

  //   ])




  const renderProductTable = () => {
    return (
      <div className="overflow-x-auto">
        {/* <TableData tableHeadings={["Product",
          "Details",
          "Batch",
          "Stock",
          "Price",
          "Action"]} data={tableRows}/> */}
        <table className="min-w-full divide-y divide-gray-200">

          <tbody className="bg-white divide-y divide-gray-200">
            {productTableData.map((product, index) => (
              <tr key={index}>
                <td className="px-4 py-4 whitespace-nowrap">
                  {product.productName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                      {product.type}
                    </span>
                    {product.packaging && (
                      <p className=" text-xs text-gray-600 pt-2">
                        {product.packaging}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{product.batchNo}</div>
                  <div className="text-xs text-gray-500">
                    EXP: {product.expiry}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.stock === 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {product.stock}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  ₹{product.price}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => addToCart(product.rowId, product.maxQty)}
                    disabled={product.stock === 0}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${product.stock === 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-black hover:bg-blue-700"
                      }`}
                  >
                    {product.stock === 0 ? "Out of Stock" : "Add"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCartItems = () => {
    return cartItems.map((item) => (
      <tr key={item.rowId}>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">
                {item.product_name}
              </div>
              <div className="text-sm text-gray-500">
                {item.product_no}
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
            {item.headItem.type}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {item.headItem.batch_no}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <input
            type="number"
            min="1"
            max={item.headItem.net_qty}
            value={item.qty}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "") {
                setCart((prev) => ({
                  ...prev,
                  [item.rowId]: "",
                }));
              } else {
                const qty = parseInt(value);
                if (!isNaN(qty) && qty >= 1) {
                  if (qty <= item.headItem.net_qty) {
                    setCart((prev) => ({
                      ...prev,
                      [item.rowId]: qty,
                    }));
                  } else {
                    toast.warning(
                      `Maximum available quantity is ${item.headItem.net_qty}`
                    );
                  }
                }
              }
            }}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ₹{item.headItem.price}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ₹{(item.headItem.price * item.qty).toFixed(2)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button
            onClick={() => handleRemoveProduct(item.rowId)}
            className="text-red-600 hover:text-red-900"
          >
            Remove
          </button>
        </td>
      </tr>
    ));
  };

  const renderInvoiceTable = () => {
    return cartItems.map((item, index) => [
      <span key={`name-${index}`} className="block max-w-[120px] pb-2 truncate font-semibold text-blue-600">
        {item?.product_name || "N/A"}
      </span>,
      <span key={`no-${index}`} className="block max-w-[120px] pb-2 truncate font-semibold text-blue-600">
        {item?.product_no || "N/A"}
      </span>,
      item?.headItem?.batch_no || "N/A",
      item?.headItem?.type ? (
        <span className="text-green-600 px-2 py-1 rounded text-xs font-semibold">
          {item?.headItem?.type}
        </span>
      ) : (
        "N/A"
      ),
      item?.headItem?.expriy || "N/A",
      <span key={`qty-${index}`} className="font-semibold">
        {item?.qty ?? "N/A"}
      </span>,
      item?.headItem?.packaging || "N/A",
      <span key={`price-${index}`} className="font-semibold">
        {item?.headItem?.price * item?.qty || 0.0}
      </span>,
    ]);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Pharmacy Sales
              </h1>
              <p className="text-sm text-gray-600">
                Manage product sales and orders
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <select
                  value={selectedStoreId || ""}
                  onChange={(e) => setSelectedStoreId(e.target.value || null)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">Select Store</option>
                  {stores.map((store) => (
                    <option key={store._id} value={store._id}>
                      {store.userName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {selectedStore ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Column - Products and Cart */}
              <div className="lg:col-span-3 space-y-6">
                {/* Store Info */}
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">
                        {selectedStore.name}
                      </h2>
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <IoMdPersonAdd className="mr-1" size={14} />
                        <span className="mr-3">
                          {selectedStore.contact_person}
                        </span>
                        <IoMdCall className="mr-1" size={14} />
                        <span>{selectedStore.phone}</span>
                      </div>
                    </div>
                    <div className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {stockList.length} products available
                    </div>
                  </div>
                </div>

                {/* Cart Summary */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <IoMdCart className="mr-2" size={18} />
                      Billing Summary ({cartItems.length} items)
                    </h3>
                    <button
                      className="bg-blue-600 text-black px-4 py-2 rounded-md text-sm font-medium"
                      onClick={handleOpenModal}
                    >
                      Add Items
                    </button>
                  </div>
                  {cartItems?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {renderCartItems()}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan="5" className="px-6 py-4 text-sm text-gray-600">
                              {cartItems.length} item{cartItems.length !== 1 ? "s" : ""}
                            </td>
                            <td colSpan="2" className="px-6 py-4 text-right text-lg font-semibold text-gray-800">
                              Total: ₹{cartTotal.toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                        <IoMdCart className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        Empty cart
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Add products to your cart to begin an order.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Order Form */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow sticky top-6">
                  <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Customer Detail
                    </h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <Input
                      labelName="Customer Name"
                      name="customer_name"
                      value={formData?.customer_name}
                      onChange={handleInputChange}
                      required
                      error={errors?.customer_name}
                      placeholder="Full name"
                      className="text-sm"
                    />
                    <Input
                      labelName="Phone Number"
                      name="phone_number"
                      type="tel"
                      value={formData?.phone_number}
                      onChange={handleInputChange}
                      required
                      error={errors?.phone_number}
                      placeholder="10-digit number"
                      className="text-sm"
                    />
                    <FormInput
                      label="Description"
                      name="description"
                      type="text"
                      value={formData?.description}
                      onChange={handleInputChange}
                      required
                      error={errors?.description}
                      className="text-sm"
                      placeholder="Any special instructions"
                    />
                  </div>
                  <div className="p-4 border-t bg-gray-50">
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Subtotal:</span>
                        <span>₹{cartTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium text-gray-800">
                        <span>Total:</span>
                        <span>₹{cartTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    <Button
                      onClick={handleSaveOrder}
                      className="w-full justify-center"
                    >
                      Add Order
                    </Button>
                    {cartItems.length === 0 && (
                      <p className="mt-2 text-sm text-red-600 text-center">
                        {errors.cart}
                      </p>
                    )}
                    &nbsp;
                    <Button
                      className="w-full justify-center"
                      onClick={() => setIsOpen(true)}
                      disabled={cartItems.length === 0}
                    >
                      Preview Order
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <IoMdHome className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                No store selected
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Please select a store from the dropdown above to view products.
              </p>
            </div>
          )}
        </main>


        <DefaultModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`View Order`} submitButtonText='Print Invoice' onSubmit={handlePrint}
          closeButtonText="Close">

          <div className="" ref={invoiceRef}>
            <div className="">
              <div className="flex justify-between items-center max-w-6xl mx-auto">
                <div className="hidden md:block text-right">
                  <p className="text-xs text-gray-500">
                    {moment(new Date()).format("DD MMM YYYY")}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 gap-6 mb-8">
                {/* Store Details Card */}
                <div className="border-b">
                  <div className="flex items-center mb-3">
                    <div className="bg-blue-100 p-2 rounded-full mr-3">
                      <FaStore className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Store Details</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <TitleValue value={selectedStore?.name || "N/A"} title="Name" />
                    <TitleValue value={selectedStore?.phone || "N/A"} title="Phone" />
                    <TitleValue value={selectedStore?.contact_person || "N/A"} title="Contact Person" />
                    <TitleValue value={selectedStore?.address || "N/A"} title="Address" />
                  </div>
                </div>
                <div className="border-b">
                  <div className="flex items-center mb-3">
                    <div className="bg-purple-100 p-2 rounded-full mr-3">
                      <CiUser className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Customer Details</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <TitleValue value={formData?.customer_name || "N/A"} title="Name" />
                    <TitleValue value={formData?.phone_number || "N/A"} title="Phone" />
                    <TitleValue value={formData?.description || "N/A"} title="Description" />
                    <TitleValue value={moment(formData.order_date).format("DD MMM YYYY") || "N/A"} title="Date" />

                  </div>
                </div>
              </div>

              <div className="bg-red-50 border-l-4 border-red-400 p-3 mb-4">
                <p className="text-red-700 text-xs">
                  <strong>⚠️ Medical Notice:</strong> All medicines
                  require proper prescription verification before
                  dispensing.
                </p>
              </div>

              <div className="mb-4">
                <TableData
                  tableHeadings={invoiceTableHeadings}
                  data={renderInvoiceTable()}
                  totalData={cartItems?.length || 0}
                />
              </div>

              <div className="grid grid-cols-1 gap-5">
                <div className="border border-orange-200 bg-orange-50 rounded-lg p-3">
                  <h3 className="text-orange-600 font-semibold text-sm mb-2">
                    📜 Terms & Conditions
                  </h3>
                  <ul className="space-y-2 text-xs text-orange-800">
                    {[
                      "✓ Check batch number & expiry date before delivery",
                      "✓ Consult doctor before using any medicine",
                      "✓ Cold storage items non-returnable once sold",
                      "✓ All prices inclusive of applicable taxes",
                      "✓ Disputes subject to local jurisdiction only",
                      "✓ Returns accepted within 7 days with original packaging",
                    ].map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">{item.split('✓')[0]}</span>
                        <span>{item.split('✓')[1]}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-green-700">
                        Sub Total:
                      </span>
                      <span className="font-semibold text-green-800">
                        ₹{cartTotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t-2 border-green-400 pt-2 mt-2">
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-green-800">
                          Final Amount:
                        </span>
                        <span className="text-green-800">
                          ₹{cartTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

         
          </div>

        </DefaultModal>


        {/* Add Items Modal */}
        <Modal
          isOpen={isAddModalOpen}
          transparentButtonClassName="w-1/3"
          buttonClassName="w-1/3"
          modalClassName=""
          childrenClassName="space-y-3 overflow-hidden h-[70vh]"
          closeModal={handleClose}
          onSubmit={""}
          heading="Add Menu Item to Order"
          closeButton={true}
        >
          <div className="relative max-w-md px-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IoMdSearch className="text-gray-400" size={18} />
            </div>
            <input
              type="text"
              placeholder="Search products by name, batch, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {renderProductTable()}
          </div>

          <div className="bg-white rounded-lg shadow mt-4">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <IoMdCart className="mr-2" size={18} />
                Order Summary ({cartItems.length} items)
              </h3>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {cartItems.length} item{cartItems.length !== 1 ? "s" : ""}
                </span>
                <span className="text-lg font-semibold text-gray-800">
                  Total: ₹{cartTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

export default OptimizedSellerOrder;