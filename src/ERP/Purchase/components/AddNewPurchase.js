import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IoMdClose } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  getAllStoreList,
  getProductsForPurchase,
} from "../../../Redux/productSlice";
import Button from "../../../components/Atoms/buttons/button";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import {
  createPurchaseOrder,
  getSupplierList,
  purchaseOrderDetails,
  updatePurchaseOrderById,
} from "../../../Redux/erpSlice";
import { transformArray } from "../../../_helpers/globalFunctions";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import Input from "../../../components/Atoms/Input/Input";
import Loader from "../../../components/Loader/Loader";
import { useNavigate, useParams } from "react-router";
import ProductTableRow from "../../../components/Atoms/Cards/ProductCard";
import { Link } from "react-router-dom";
import Pagination from "../../../components/Pagination/Pagination";
const size = 10;
const OptimizedPurchaseOrder = ({ hiddenBreadCrumb }) => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiRes, setApiRes] = useState([]);
  const [filters, setFilters] = useState({ search: "" });
  const [, setIsRefresh] = useState(false);
  const [userData, setUserData] = useState({});
  const { id } = useParams();
  const [pageNo, setPageNo] = useState(1);
  const [, setPoData] = useState(null);
  console.log("selectedProducts", selectedProducts);
  const supplierOptions = transformArray(
    selector?.erp?.getSupplierListData?.data?.data || []
  );
  const formattedStoreOption = transformArray(
    selector?.product?.getAllStoreListData?.data?.data?.list || []
  );

  const storeListData =
    selector?.product?.getAllStoreListData?.data?.data?.list || [];

  const [formData, setFormData] = useState({
    supplier_id: "",
    store_id: "",
    shipping_address: "",
    delivery_date: "",
    items: [],
  });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const fetchProductsList = useCallback(
    async (store_id) => {
      setLoading(true);
      setApiRes([]);
      try {
        const query = {
          page: pageNo,
          size: size,
          keyWord: filters?.search,
          searchFields: "name",
          populate:
            "product_catalogs_id:images|product_image_id:images|category_id:name|option_id:options",
        };

        if (store_id) {
          query.query = JSON.stringify({ store_id: store_id });
        }
        const response = await dispatch(getProductsForPurchase(query));
        setApiRes(response?.payload?.data || { list: [], total: 0 });
      } catch (err) {
        toast.error("Failed to fetch products");
      } finally {
        setLoading(false);
      }
    },
    [dispatch, filters, pageNo]
  );

  useEffect(() => {
    if (userData.roleId === 9) {
      fetchProductsList(userData.storeId);
      setFormData((prev) => ({
        store_id: userData.storeId,
      }));
    } else {
      // fetchProductsList()
      dispatch(getAllStoreList());
    }
  }, [dispatch, fetchProductsList, userData]);

  useEffect(() => {
    const userDataString = sessionStorage.getItem("EcomAdmin");
    if (userDataString) {
      try {
        const parsedData = JSON.parse(userDataString);
        setUserData(parsedData);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  // Fetch suppliers when store is selected
  useEffect(() => {
    if (formData.store_id) {
      dispatch(getSupplierList({ store_id: formData.store_id }));
    }
  }, [dispatch, formData.store_id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const totals = useMemo(() => {
    const subtotal = selectedProducts.reduce(
      (sum, product) => sum + product.salePrice * product.quantity,
      0
    );
    const totalQuantity = selectedProducts.reduce(
      (sum, product) => sum + product.quantity,
      0
    );

    return { subtotal, totalQuantity };
  }, [selectedProducts]);

  const handleAddProduct = useCallback((product, selectedOption = null) => {
    const productKey = `${product._id}_${selectedOption?._id || "default"}`;
    const price = selectedOption?.salePrice || product.salePrice;

    const head_id =
      product.head_id || product.option_id?._id || selectedOption?._id;

    setSelectedProducts((prev) => {
      const existingIndex = prev.findIndex(
        (p) => p._id === product._id && p.uniqueKey === productKey
      );

      if (existingIndex !== -1) {
        // Update existing product quantity
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }

      return [
        ...prev,
        {
          ...product,
          selectedOption,
          salePrice: price,
          quantity: 1,
          uniqueKey: productKey,
          head_id: head_id,
        },
      ];
    });
  }, []);

  const handleRemoveProduct = useCallback((productId, optionId) => {
    setSelectedProducts((prev) =>
      prev.filter(
        (item) =>
          !(item._id === productId && item.selectedOption?._id === optionId)
      )
    );
  }, []);

  // const handleQuantityChange = useCallback(
  //   (productId, optionId, newQuantity) => {
  //     if (newQuantity !== "" && (isNaN(newQuantity) || newQuantity < 1)) return;

  //     setSelectedProducts((prev) =>
  //       prev.map((product) => {
  //         if (
  //           product._id === productId &&
  //           product.selectedOption?._id === optionId
  //         ) {
  //           return { ...product, quantity: newQuantity };
  //         }
  //         return product;
  //       })
  //     );
  //   },
  //   []
  // );

const handleQuantityChange = (productId, optionId, newQuantity) => {
  setSelectedProducts(prevProducts =>
    prevProducts.map(product => {
      if (product._id === productId && product.selectedOption?._id === optionId) {
        return {
          ...product,
          quantity: newQuantity < 1 ? 1 : newQuantity,
        };
      }
      return product;
    })
  );
};



  const validateForm = () => {
    console.log("Validating form data:");
    const newErrors = {};
    if (!formData.supplier_id) newErrors.supplier_id = "Supplier is required";
    if (!formData.store_id) newErrors.store_id = "Store is required";
    if (!formData.shipping_address)
      newErrors.shipping_address = "Shipping address is required";
    if (!formData.delivery_date)
      newErrors.delivery_date = "Delivery date is required";
    if (selectedProducts.length === 0)
      newErrors.products = "At least one product is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveOrder = async () => {
    console.log("Saving order with form data:", formData);
    if (selectedProducts.length === 0) {
      toast.error("Please add at least one product to the order");
      return;
    }
    if (!validateForm()) return;
    console.log("Saving order with form data:", formData);
    setLoading(true);
    try {
      const items =
        selectedProducts &&
        selectedProducts?.map((product) => {
          const option = product.selectedOption;
          const price = option?.salePrice || product.salePrice;
          const type = option?.type || "Unit";
          const packaging = option?.packaging || "";

          // Get head_id from the product's option_id or from selectedOption
          const head_id =
            product.head_id || option?._id || product.option_id?._id;

          return {
            product_id: product._id,
            quantity: product.quantity,
            type: type,
            price: price,
            calculation: `${product.quantity}${type.toLowerCase()}@${price}`,
            head_id: head_id, // Include head_id in the payload
            packaging: packaging,
          };
        });

      const orderPayload = {
        store_id: formData.store_id,
        supplier_id: formData.supplier_id,
        shipping_address: formData.shipping_address,
        delivery_date: formData.delivery_date,
        order_date: new Date().toISOString().split("T")[0],
        items: items,
      };

      if (id) {
        console.log(JSON.stringify({ _id: id, ...orderPayload }));
        await dispatch(
          updatePurchaseOrderById({ _id: id, ...orderPayload })
        ).unwrap();
        toast.success("Purchase order update successfully!");
      } else {
        await dispatch(createPurchaseOrder(orderPayload)).unwrap();
        toast.success("Purchase order created successfully!");
      }

      // Reset form
      setFormData({
        supplier_id: "",
        store_id: "",
        shipping_address: "",
        delivery_date: "",
        order_date: new Date().toISOString().split("T")[0],
        items: [],
      });

      setSelectedProducts([]);
      navigate("/app/purchase");
    } catch (error) {
      toast.error("Error creating purchase order");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierChange = (selected) => {
    setFormData((prev) => ({
      ...prev,
      supplier_id: selected?.value || "",
    }));
  };

  const handleStoreChange = (selected) => {
    const selectedStore = storeListData.find(
      (store) => store._id === selected?.value
    );

    setFormData((prev) => ({
      ...prev,
      store_id: selected?.value || "",
      shipping_address: selectedStore?.address || selectedStore?.location || "",
      supplier_id: "",
    }));
    setSelectedProducts([]);
    fetchProductsList(selected?.value || "");
    setErrors({});
  };

  const clearFilters = async () => {
    setIsRefresh(true);
    setFilters({ search: "" });
    await fetchProductsList("");
    setIsRefresh(false);
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      dispatch(purchaseOrderDetails({ _id: id }))
        .unwrap()
        .then((res) => {
          setFormData({
            supplier_id: res.data.supplier_id,
            store_id: res.data.store_id,
            shipping_address: res.data.shipping_address,
            delivery_date: res.data.delivery_date,
            items: [],
          });
          fetchProductsList(res.data.store_id);
          setPoData(res.data);
        })
        .catch(() => {
          toast.error("Failed to load purchase order details");
        })
        .finally(() => setLoading(false));
    }
  }, [id, dispatch, fetchProductsList]);

  useEffect(() => {
    if (id) {
      dispatch(purchaseOrderDetails({ _id: id }))
        .unwrap()
        .then((res) => {
          if (res && res.data?.purchaseOrderItems?.length > 0) {
            const items = res.data.purchaseOrderItems.map((item) => ({
              _id: item.product_id,
              name: item.product_name,
              quantity: Number(item.quantity) || 1, // ✅ enforce number
              selectedOption: {
                _id: item._id,
                type: item.type || "Unit",
                salePrice: item.price,
                packaging: item.description || "N/A",
              },
              salePrice: item.price, // fallback
            }));
            setSelectedProducts(items);
          } else {
            setSelectedProducts([]);
          }
        })
        .catch(() => {
          toast.error("Failed to load purchase order details");
        });
    }
  }, [id, dispatch]);
  const isInitialLoad = useRef(true);
useEffect(() => {
  if (id && isInitialLoad.current) {
    dispatch(purchaseOrderDetails({ _id: id }))
      .unwrap()
      .then((res) => {
        if (res?.data?.purchaseOrderItems?.length > 0) {
          const items = res.data.purchaseOrderItems.map(item => ({
            _id: item.product_id,
            name: item.product_name,
            quantity: Number(item.quantity) || 1,
            selectedOption: {
              _id: item._id,
              type: item.type || "Unit",
              salePrice: item.price,
              packaging: item.description || "N/A",
            },
            salePrice: item.price,
          }));
          setSelectedProducts(items);
        } else {
          setSelectedProducts([]);
        }
      })
      .catch(() => {
        toast.error("Failed to load purchase order details");
      })
      .finally(() => {
        isInitialLoad.current = false;
      });
  }
}, [id, dispatch]);

  const handlePageChange = useCallback((newPageNo) => {
    setPageNo(newPageNo);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 print:p-0">
      <Loader loading={loading} />
      <div className="max-w-[90%] mx-auto">
        <div className="mb-6">
          {!hiddenBreadCrumb && (
            <nav className="py-4">
              <ol className="flex items-center text-sm text-gray-500">
                <li className="transition-colors hover:text-blue-600">
                  <Link to="/app/home">Home</Link>
                </li>
                <li className="mx-2">/</li>
                <li className="transition-colors hover:text-blue-600">
                  <Link to="/app/purchase">Purchase Order</Link>
                </li>
                <li className="mx-2">/</li>
                <li className="font-medium text-blue-600">Form</li>
              </ol>
            </nav>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                  Products
                </h2>
                <SearchComponent
                  filters={filters}
                  setFilters={setFilters}
                  handleSearchRemove={clearFilters}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <tbody className="bg-white divide-y divide-gray-200">
                    {apiRes?.list?.length > 0 ? (
                      apiRes.list.map((product) => (
                        <ProductTableRow
                          key={product._id}
                          product={product}
                          onAdd={handleAddProduct}
                        />
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          {loading
                            ? "Loading products..."
                            : "No products found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {apiRes?.total > size && (
                  <Pagination
                    totalPages={Math.ceil(apiRes?.total / size)}
                    currentPage={pageNo}
                    onPageChange={handlePageChange}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4 h-fit">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
              Purchase Order Details
            </h2>

            {/* Form Fields */}
            <div className="space-y-4 mb-6">
              {userData.roleId !== 9 && (
                <FilterSelect
                  label="Store"
                  options={formattedStoreOption || []}
                  value={formattedStoreOption.find(
                    (opt) => opt.value === formData.store_id
                  )}
                  onChange={handleStoreChange}
                  error={errors?.store_id}
                  required
                />
              )}

              <FilterSelect
                label="Supplier"
                options={supplierOptions || []}
                value={
                  supplierOptions &&
                  supplierOptions?.find(
                    (opt) => opt.value === formData.supplier_id
                  )
                }
                onChange={handleSupplierChange}
                error={errors?.supplier_id}
                required
                disabled={!formData.store_id}
                placeholder={
                  !formData.store_id ? "Select store first" : "Select supplier"
                }
              />

              <FormInput
                type="textarea"
                name="shipping_address"
                label="Shipping Address"
                value={formData.shipping_address}
                onChange={handleInputChange}
                rows={3}
                error={errors?.shipping_address}
                required
              />

              <Input
                type="date"
                value={formData?.delivery_date}
                name="delivery_date"
                onChange={handleInputChange}
                labelName="Delivery Date"
                placeholder=""
                error={errors?.delivery_date}
                required
              />
            </div>

            {/* Selected Products */}
            {/* <div className='mb-6'>
              <div className='flex justify-between items-center mb-3'>
                <h3 className='font-medium text-gray-700'>Selected Products</h3>
                <span className={`text-sm ${selectedProducts.length > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                  {selectedProducts?.length} item{selectedProducts.length !== 1 ? 's' : ''}
                </span>
              </div>

              {selectedProducts?.length === 0 ? (
                <div className='bg-gray-50 p-4 rounded-lg text-center text-gray-500 text-sm'>
                  No products selected yet. Add products from the table above.
                </div>
              ) : (
                <div className='max-h-60 overflow-y-auto space-y-2'>
                  {selectedProducts?.map(product => {
                    const option = product.selectedOption
                    const price = option?.salePrice || product.salePrice
                    const total = price * product.quantity
                    const type = option?.type || 'Unit'
                    const packaging = option?.packaging || 'N/A'

                    return (
                      <div
                        key={`${product._id}_${option?._id || 'default'}`}
                        className='bg-gray-50 p-3 rounded-lg border border-gray-200'
                      >
                        <div className='flex justify-between items-start mb-2'>
                          <div className='flex-1'>
                            <h4 className='font-medium text-sm text-gray-800'>
                              {product.name}
                            </h4>
                            <div className='flex items-center gap-2 mt-1'>
                              <span className='text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded'>
                                {type}
                              </span>
                              <span className="text-xs text-gray-600">
                                ₹{price?.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Packaging: {packaging}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveProduct(product._id, option?._id)}
                            className='text-red-500 hover:text-red-700 p-1 transition-colors'
                            aria-label='Remove product'
                          >
                            <IoMdClose size={16} />
                          </button>
                        </div>

                        <div className='flex items-center justify-between mb-2'>
                          <div className='flex items-center gap-2'>
                            <button
                              onClick={() =>
                                handleQuantityChange(
                                  product._id,
                                  option?._id,
                                  product.quantity - 1
                                )
                              }
                              className='w-7 h-7 bg-gray-200 rounded text-sm hover:bg-gray-300 transition-colors flex items-center justify-center'
                              aria-label='Decrease quantity'
                            >
                              -
                            </button>
                            <input
                              type="number"
                              className="text-sm font-medium w-16 text-center border rounded px-2 py-1"
                              value={product.quantity}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  handleQuantityChange(product._id, option?._id, '');
                                } else {
                                  const newQuantity = parseInt(value);
                                  if (!isNaN(newQuantity)) {
                                    handleQuantityChange(product._id, option?._id, newQuantity);
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                const value = e.target.value.trim();
                                if (value === '' || isNaN(parseInt(value)) || parseInt(value) < 1) {
                                  handleQuantityChange(product._id, option?._id, 1);
                                }
                              }}
                              min="1"
                            />
                            <button
                              onClick={() => {
                                handleQuantityChange(
                                  product._id,
                                  option?._id,
                                  product.quantity + 1
                                )
                              }}
                              className='w-7 h-7 bg-gray-200 rounded text-sm hover:bg-gray-300 transition-colors flex items-center justify-center'
                              aria-label='Increase quantity'
                            >
                              +
                            </button>
                          </div>
                          <div className='text-sm font-medium text-gray-800'>
                            ₹{total?.toFixed(2)}
                          </div>
                        </div>

                        <div className='text-xs text-gray-600'>
                          <p>
                            Calculation: {product?.quantity}{type.toLowerCase()}@₹{price}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div> */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-700">Selected Products</h3>
                <span
                  className={`text-sm ${
                    selectedProducts.length > 0
                      ? "text-blue-600"
                      : "text-gray-500"
                  }`}
                >
                  {selectedProducts.length} item
                  {selectedProducts.length !== 1 ? "s" : ""}
                </span>
              </div>

              {selectedProducts.length === 0 ? (
                <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500 text-sm">
                  No products selected yet. Add products from the table above.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {selectedProducts.map((product) => {
                    const option = product.selectedOption;
                    const price = option?.salePrice || product.salePrice;
                    const total = price * product.quantity;
                    const type = option?.type || "Unit";
                    const packaging = option?.packaging || "N/A";

                    return (
                      <div
                        key={`${product._id}_${option?._id || "default"}`}
                        className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm text-gray-800">
                              {product.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                                {type}
                              </span>
                              <span className="text-xs text-gray-600">
                                ₹{price?.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Packaging: {packaging}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              handleRemoveProduct(product._id, option?._id)
                            }
                            className="text-red-500 hover:text-red-700 p-1 transition-colors"
                            aria-label="Remove product"
                          >
                            <IoMdClose size={16} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleQuantityChange(
                                  product._id,
                                  option?._id,
                                  product.quantity - 1
                                )
                              }
                              className="w-7 h-7 bg-gray-200 rounded text-sm hover:bg-gray-300 transition-colors flex items-center justify-center"
                              aria-label="Decrease quantity"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              className="text-sm font-medium w-16 text-center border rounded px-2 py-1"
                              value={product.quantity || 1}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "") {
                                  handleQuantityChange(
                                    product._id,
                                    option?._id,
                                    ""
                                  );
                                } else {
                                  const newQuantity = parseInt(value);
                                  if (!isNaN(newQuantity)) {
                                    handleQuantityChange(
                                      product._id,
                                      option?._id,
                                      newQuantity
                                    );
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                const value = e.target.value.trim();
                                if (
                                  value === "" ||
                                  isNaN(parseInt(value)) ||
                                  parseInt(value) < 1
                                ) {
                                  handleQuantityChange(
                                    product._id,
                                    option?._id,
                                    1
                                  );
                                }
                              }}
                              min="1"
                            />

                            <button
                              onClick={() =>
                                handleQuantityChange(
                                  product._id,
                                  option?._id,
                                  product.quantity + 1
                                )
                              }
                              className="w-7 h-7 bg-gray-200 rounded text-sm hover:bg-gray-300 transition-colors flex items-center justify-center"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          <div className="text-sm font-medium text-gray-800">
                            ₹{total?.toFixed(2)}
                          </div>
                        </div>

                        <div className="text-xs text-gray-600">
                          <p>
                            Calculation: {product?.quantity}
                            {type.toLowerCase()}@₹{price}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedProducts.length > 0 && (
              <div className="border-t pt-4 mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Items:</span>
                    <span className="font-medium">{totals.totalQuantity}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span className="text-gray-800">Total Amount:</span>
                    <span className="text-blue-600">
                      ₹{totals.subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleSaveOrder}
                // disabled={loading || selectedProducts?.length === 0}
                className="w-full"
              >
                {loading
                  ? "Creating Purchase Order..."
                  : id
                  ? "Update Purchase Order"
                  : "Add Purchase Order"}
              </Button>
            </div>

            {errors.products && (
              <p className="text-red-500 text-xs mt-2">{errors.products}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizedPurchaseOrder;
