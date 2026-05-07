import React, { useEffect, useState } from "react";
import Input from "../../../components/Atoms/Input/Input";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import TransparentButton from "../../../components/Atoms/buttons/TransParentButton";
import Loader from "../../../components/Loader/Loader";
import { useNavigate, useParams } from "react-router";
import {
  createInventory,
  editInventoryDetails,
  getBatchList,
  getInventoryDetailsById,
  getProductsList,
  getSupplierList,
} from "../../../Redux/erpSlice";
import { useDispatch } from "react-redux";
import { toast } from "sonner";

const CreateInventory = () => {
  const [formData, setFormData] = useState({
    supplier_id: "",
    product_id: "",
    batch_code: "",
    description: "",
    thumbnails: "",
    base_price: "",
    account_type: "",
    sale_price: "",
    purchase_price: "",
    avail_stock: "",
    min_stock: "",
    max_stock: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams(); 

  const [supplierOptions, setSupplierOptions] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [batchOptions, setBatchOptions] = useState([]);

  const dispatch = useDispatch();


  // 1. Fetch existing data if editing
  useEffect(() => {
    if (id) {
      (async () => {
        try {
          const response = await dispatch(getInventoryDetailsById({_id:id}));
          const data = response?.payload?.data;

          console.log(data)

          setFormData({
            ...data,
            supplier_id: {
              label: data?.supplier_id?.name,
              value: data?.supplier_id?._id,
            },
            product_id:  {
              label: data?.product_id?.name,
              value: data?.product_id?._id,
            },
            batch_code: { label: data?.batch_code?.batchCode, value: data?.batch_code?._id },
            account_type:{label:data?.account_type,value:data?.account_type}
          });
        } catch (err) {
          toast.error("Failed to fetch inventory");
        }
      })();
    }
  }, [id, dispatch]);


  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [suppliers, products, batches] = await Promise.all([
          dispatch(getSupplierList({ page: 1, limit: 9999, searchKey: "" })),
          dispatch(getProductsList({ page: null, limit: null, searchKey: null })),
          dispatch(getBatchList({ page: null, limit: null, searchKey: null })),
        ]);

        setSupplierOptions(
          suppliers?.payload?.data?.list?.map((s) => ({ label: s.name, value: s._id })) || []
        );
        setProductOptions(
          products?.payload?.data?.map((p) => ({ label: p.name, value: p._id })) || []
        );
        setBatchOptions(
          batches?.payload?.data?.list?.map((b) => ({ label: b.batchCode, value: b.id })) || []
        );
      } catch (error) {
        console.error("Dropdown data fetch error:", error);
      }
    };

    fetchDropdownData();
  }, [dispatch]);

  const accountOptions = [
    { label: 'Sale', value: 'sale' },
    { label: 'Purchase', value: 'purchase' }
  ]

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      "supplier_id",
      "product_id",
      "batch_code",
      "base_price",
      "account_type",
      "sale_price",
      "purchase_price",
      "avail_stock",
      "min_stock",
      "max_stock",
      "description"
    ];

    requiredFields.forEach((field) => {
      if (!formData[field]) newErrors[field] = "This field is required.";
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
  
    const payload = {
      // ...formData,
      supplier_id: formData.supplier_id?.value || "",
      product_id: formData.product_id?.value || "",
      batch_code: formData.batch_code?.value || "",
      description:formData.description || "",
      thumbnails:formData.thumbnails || "",
      account_type: formData.account_type?.value || "",
      base_price: Number(formData.base_price),
      sale_price: Number(formData.sale_price),
      purchase_price: Number(formData.purchase_price),
      avail_stock: Number(formData.avail_stock),
      min_stock: Number(formData.min_stock),
      max_stock: Number(formData.max_stock),
    };
  
    const resetFormData = () => {
      setFormData({
        supplier_id: "",
        product_id: "",
        batch_code: "",
        description: "",
        thumbnails: "",
        base_price: "",
        account_type: "",
        sale_price: "",
        purchase_price: "",
        avail_stock: "",
        min_stock: "",
        max_stock: "",
      });
    };
  
    try {
      setLoading(true);
  
      const action = id
        ? editInventoryDetails({ _id: id, ...payload })
        : createInventory(payload);
  
      const response = await dispatch(action); // FIXED: Was dispatch(createInventory(action))
  
      if (response?.payload) {
        toast.success(response.payload.message || "Inventory saved successfully");
        navigate("/app/inventory");
        resetFormData();
      } else {
        toast.error(response?.payload?.message || "Something went wrong");
        resetFormData();
      }
    } catch (error) {
      console.error("Submission failed:", error);
      toast.error("Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <>
      <Loader loading={loading} />
      <div className="relative min-h-screen p-4 mx-auto max-w-7xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{id ? "Edit": "Add"} Inventory</h1>
            <p className="text-sm text-gray-500">Dashboard / Inventory / Add</p>
          </div>
          <div className="flex gap-2">
            <TransparentButton label="Cancel" onClick={() => navigate("/app/inventory")} />
            <TransparentButton
              label="Save Inventory"
              onClick={handleSubmit}
              className="text-black !bg-white hover:!bg-white hover:!text-[#0A73CF]"
            />
          </div>
        </div>

        <div className="bg-white p-6 mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <FilterSelect
              name="supplier_id"
              label="Supplier"
              placeholder="Select Supplier"
              options={supplierOptions}
              value={formData.supplier_id}
              onChange={(val) => handleSelectChange("supplier_id", val)}
              error={errors?.supplier_id}
            />
            <FilterSelect
              name="product_id"
              label="Product"
              placeholder="Select Product"
              options={productOptions}
              value={formData.product_id}
              onChange={(val) => handleSelectChange("product_id", val)}
              error={errors?.product_id}
            />
            <FilterSelect
              name="batch_code"
              label="Batch"
              placeholder="Select Batch"
              options={batchOptions}
              value={formData.batch_code}
              onChange={(val) => handleSelectChange("batch_code", val)}
              error={errors?.batch_code}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              labelName="Thumbnail URL"
              name="thumbnails"
              value={formData.thumbnails}
              onChange={handleChange}
              error={errors?.thumbnails}
              placeholder="Enter Image URL"
            />
            <Input
              labelName="Base Price"
              name="base_price"
              value={formData.base_price}
              onChange={handleChange}
              error={errors?.base_price}
              placeholder="Enter Base Price"
              type="number"
            />
             <Input
              labelName="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              error={errors?.description}
              placeholder="Enter Description"
              type="text"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          
             <FilterSelect
              name="account_type"
              label="Account Type"
              placeholder="Select Account Type"
              options={accountOptions}
              value={formData.account_type}
              onChange={(val) => handleSelectChange("account_type", val)}
              error={errors?.account_type}
            />
            <Input
              labelName="Sale Price"
              name="sale_price"
              value={formData.sale_price}
              onChange={handleChange}
              error={errors?.sale_price}
              placeholder="Enter Sale Price"
              type="number"
            />
            <Input
              labelName="Purchase Price"
              name="purchase_price"
              value={formData.purchase_price}
              onChange={handleChange}
              error={errors?.purchase_price}
              placeholder="Enter Purchase Price"
              type="number"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              labelName="Available Stock"
              name="avail_stock"
              value={formData.avail_stock}
              onChange={handleChange}
              error={errors?.avail_stock}
              placeholder="Enter Available Stock"
              type="number"
            />
            <Input
              labelName="Minimum Stock"
              name="min_stock"
              value={formData.min_stock}
              onChange={handleChange}
              error={errors?.min_stock}
              placeholder="Enter Minimum Stock"
              type="number"
            />
            <Input
              labelName="Maximum Stock"
              name="max_stock"
              value={formData.max_stock}
              onChange={handleChange}
              error={errors?.max_stock}
              placeholder="Enter Maximum Stock"
              type="number"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateInventory;
