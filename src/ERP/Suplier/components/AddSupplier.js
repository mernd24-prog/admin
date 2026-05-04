import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import Loader from "../../../components/Loader/Loader";
import TransparentButton from "../../../components/Atoms/buttons/TransParentButton";
import Input from "../../../components/Atoms/Input/Input";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import { useDispatch } from "react-redux";
import {
  createSupplier,
  editSupplireDetails,
  getSupplierDetails,
} from "../../../Redux/erpSlice";
import { toast } from "sonner";
import { getAllStoreList, getList, } from "../../../Redux/productSlice";


const AddSupplier = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminData = sessionStorage.getItem('EcomAdmin');
  const parsed = adminData ? JSON.parse(adminData) : "";
  const initialFormData = {
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    gst_number: "",
    drug_license_no: "",
    panNumber: "",
    tin_number: "",
    supplier_type: "",
    category_type: "",
    address_line1: "",
    address_line2: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    storeId: parsed.roleId === 9 ? parsed.storeId : "",
  };

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isRefresh, setIsRefresh] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [storeOptions, setStoreOptions] = useState([]);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [categories, store] = await Promise.all([
          dispatch(getList({ page: 1, limit: 9999, searchKey: "" })),
          dispatch(getAllStoreList()),
        ]);

        console.log(store);

        setCategoryOptions(
          categories?.payload?.data?.map((c) => ({
            label: c.name,
            value: c._id,
          })) || []
        );

        setStoreOptions(
          store?.payload?.data?.list?.map((s) => ({
            label: s.name,
            value: s._id,
          })) || []
        );
      } catch (error) {
        console.error("Dropdown data fetch error:", error);
      }
    };

    fetchDropdownData();
  }, [dispatch]);

  // if id here prefill all input

  useEffect(() => {
    if (id) {
      setLoading(true);
      dispatch(getSupplierDetails({ _id: id }))
        .unwrap()
        .then((res) => {
          const supplier = res.data;

          // Extract the actual store ID (handling both string and object cases)
          const storeIdValue = typeof supplier.storeId === 'object'
            ? supplier.storeId._id
            : supplier.storeId;



          console.log("storeIdValue", storeIdValue)


          setFormData({
            name: supplier.name,
            contact_person: supplier.contact_person,
            email: supplier.email,
            phone: supplier.phone,
            gst_number: supplier.gst_number,
            drug_license_no: supplier.drug_license_no,
            panNumber: supplier.bank_account_details?.pan_number || "",
            tin_number: supplier.tin_number,
            supplier_type: supplier.supplier_type,
            category_type: supplier.category_type, 
            address_line1: supplier.address_line1,
            address_line2: supplier.address_line2,
            bankName: supplier.bank_account_details?.bank_name || "",
            accountNumber: supplier.bank_account_details?.account_number || "",
            ifscCode: supplier.bank_account_details?.ifsc_code || "",
            storeId: storeIdValue || (parsed.roleId === 9 ? parsed.storeId : ""),
          });
        })
        .catch(() => {
          toast.error("Failed to fetch supplier details");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, dispatch, parsed.roleId, parsed.storeId]);

  // Validation rules
  const validationRules = {
    name: {
      required: true,
      minLength: 3,
      message: "Supplier name must be at least 3 characters",
    },
    contact_person: {
      required: true,
      minLength: 3,
      message: "Contact person name must be at least 3 characters",
    },
    email: {
      required: true,
      pattern: /\S+@\S+\.\S+/,
      message: "Valid email is required",
    },
    phone: {
      required: true,
      pattern: /^\d{10}$/,
      message: "Phone number must be 10 digits",
    },
    gst_number: {
      required: true,
      message: "GSTIN is required",
    },
    panNumber: {
      required: true,
      message: "PAN number is required",
    },
    address_line1: {
      required: true,
      message: "Address  is required",
    },
    address_line2: {
      required: true,
      message: "Address  is required",
    },
    drug_license_no: {
      required: true,
      message: "Drug License number is required",
    },
    bankName: {
      required: true,
      message: "Bank name is required",
    },
    accountNumber: {
      required: true,
      message: "Account number is required",
    },
    ifscCode: {
      required: true,
      message: "IFSC code is required",
    },
    tin_number: {
      required: true,
      message: "Tin number is required",
    },
    supplier_type: {
      required: true,
      message: "Supplier type is required",
    },
    category_type: {
      required: true,
      message: "Category Supplier is required",
    },
    storeId: {
      required: true,
      message: "Store is required",
    },
  };

  // Validation function
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach((field) => {
      const rule = validationRules[field];
      const value = formData[field];

      const strValue = typeof value === "string" ? value : String(value ?? "");

      if (rule.required && (!strValue || strValue.trim() === "")) {
        newErrors[field] = rule.message;
        isValid = false;
        return;
      }

      if (rule.minLength && strValue.trim().length < rule.minLength) {
        newErrors[field] = rule.message;
        isValid = false;
        return;
      }

      if (rule.pattern && !rule.pattern.test(strValue)) {
        newErrors[field] = rule.message;
        isValid = false;
        return;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    setLoading(true);
    e.preventDefault();

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Prepare data for API call
      const supplierData = {
        name: formData.name,
        contact_person: formData.contact_person,
        email: formData.email,
        phone: formData.phone,
        gst_number: formData.gst_number,
        drug_license_no: formData.drug_license_no,
        tin_number: formData.tin_number,
        supplier_type: formData.supplier_type,
        category_type: formData.category_type,
        storeId: formData.storeId,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,

        // Nest bank details here
        bank_account_details: {
          bank_name: formData.bankName,
          account_number: formData.accountNumber,
          pan_number: formData.panNumber,
          ifsc_code: formData.ifscCode,
        },

        // Fixed values
        role: "supplier",
        account_type: "sale",
      };

      const action = id
        ? editSupplireDetails({ _id: id, ...supplierData })
        : createSupplier(supplierData);

      // TODO: Replace with actual API call
      dispatch(action)
        .unwrap()
        .then((res) => {
          if (res.error) {
            setLoading(false);
            toast.error(res.error);
            return;
          }
          toast.success(res.message || "Supplier saved successfully");

          navigate("/app/supplier");
          setFormData(initialFormData);
          setIsRefresh(!isRefresh);
        })
        .catch((error) => {
          setLoading(false);
          console.error("Error supplier add:", error);
          toast.error(error || "Error in supplier add");
        });
    } catch (error) {
      setLoading(false);
      console.error("Error adding supplier:", error);
      toast.error("Error adding supplier");
    }
  };

  const handleChange = (e) => {
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

  // supplier type
  const supplierTypeOptions = [
    { label: "Individual", value: "individual" },
    { label: "Company", value: "company" },
    { label: "Partnership", value: "partnership" },
  ];

  const handleSelectChange = (selected) => {
    setFormData((prev) => ({
      ...prev,
      // supplier_id: selected?.value,
      storeId: selected?.value,
    }));
  };

  return (
    <>
      <Loader loading={loading} />
      <div className="relative min-h-screen p-4 mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-gray-500 text-sm font-semibold">
              Dashboard /{" "}
              <span className="text-[#181c32]">Supplier/ <span>{id ? formData?.name : "Add Supplier"}</span> </span>
            </h3>
          </div>

          <div className="flex gap-2">
            <TransparentButton
              label="Cancel"
              onClick={() => navigate("/app/supplier")}
            />
            <TransparentButton
              label="Save Supplier"
              onClick={handleSubmit}
              className="text-black !bg-white max-w-[170px] hover:!bg-white hover:!text-[#0A73CF]"
            />
          </div>
        </div>

        {/* Form */}
        <div className="p-2 space-y-6 md:p-6 bg-white mt-6">
          <p className="text-lg text-[#565656] font-medium">
            Basic Details
          </p>

          {/* Supplier Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              labelName="Supplier Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              error={errors?.name}
              placeholder="Supplier Name"
              className="!bg-black"
            />
            <Input
              labelName="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              error={errors?.email}
              placeholder="Email"
            />
            <Input
              labelName="Phone Number"
              type="number"
              maxLength="10"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              error={errors?.phone}
              placeholder="Phone Number"
            />


          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

            <Input
              labelName="GSTIN"
              name="gst_number"
              value={formData.gst_number}
              onChange={handleChange}
              required
              error={errors?.gst_number}
              placeholder="GSTIN"
            />
            <Input
              labelName="Drug License No."
              name="drug_license_no"
              value={formData.drug_license_no}
              onChange={handleChange}
              required
              error={errors?.drug_license_no}
              placeholder="Drug License No."
            />
            <Input
              labelName="Contact Person"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleChange}
              required
              error={errors?.contact_person}
              placeholder="Contact Person"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              labelName="Address Line 1"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              required
              error={errors?.address_line1}
              placeholder="Address Line 1"
            />
            <Input
              labelName="Address Line 2"
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
              error={errors?.address_line2}
              placeholder="Address Line 2"
            />
            <FilterSelect
              name="supplier_type"
              label="Supplier Type"
              value={supplierTypeOptions.find(
                (opt) => opt.value === formData.supplier_type
              )}
              onChange={(value) => {
                setFormData({ ...formData, supplier_type: value.value });
                setErrors({});
              }}
              placeholder="Select Supplier Type"
              options={supplierTypeOptions}
              error={errors?.supplier_type}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              labelName="TIN Number"
              name="tin_number"
              value={formData.tin_number}
              onChange={handleChange}
              required
              error={errors?.tin_number}
              placeholder="TIN Number"
            />
            <FilterSelect
              name="category_type"
              label="Category Supplier"
              value={categoryOptions.find(
                (opt) => opt.value === formData.category_type
              )}
              onChange={(value) => {
                setFormData({ ...formData, category_type: value.value });
                setErrors({});
              }}

              placeholder="Select Category"
              options={categoryOptions}
              error={errors?.category_type}
            />
            {parsed.roleId === 9 ? null : <FilterSelect
              name="store"
              label="Store"
              value={storeOptions.find((opt) => opt.value === formData.storeId)}
              onChange={handleSelectChange}
              placeholder="Select Store"
              options={storeOptions}
              error={errors?.storeId}
            />}

          </div>

          {/* Bank Details */}
          <div className="space-y-4">
            <p className="text-lg text-[#565656] font-medium">
              Bank Account Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Input
                labelName="Bank Name"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                required
                error={errors?.bankName}
                placeholder="Bank Name"
              />
              <Input
                labelName="Account Number"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
                required
                error={errors?.accountNumber}
                placeholder="Account Number"
              />
              <Input
                labelName="IFSC Code"
                name="ifscCode"
                value={formData.ifscCode}
                onChange={handleChange}
                required
                error={errors?.ifscCode}
                placeholder="IFSC Code"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Input
                labelName="PAN Number"
                name="panNumber"
                value={formData.panNumber}
                onChange={handleChange}
                required
                error={errors?.panNumber}
                placeholder="PAN Number"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddSupplier;
