import React, { useState } from "react";
import Loader from "../../../components/Loader/Loader";
import TransparentButton from "../../../components/Atoms/buttons/TransParentButton";
import NewButton from "../../../components/Button/NewButton";
import Input from "../../../components/Atoms/Input/Input";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import { useNavigate } from "react-router";

const AddNewProduct = () => {
  const initialFormData = {
    supplierName: "",
    medicineName: "",
    subCategory: "",
    instructions: "",
    brand: "",
    manufacturingDate: "",
    hsnCode: "",
    description: "",
    batch: "",
    category: "",
    composition: "",
    warning: "",
    qtyType: "",
    expiryDate: "",
    medicinePrice: "",
    warranty: "",
  };

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="relative min-h-screen p-4 mx-auto max-w-7xl">
      <Loader loading={loading} />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ">
        <div>
          <h1 className="text-xl font-bold">Add New Product</h1>
          <h3 className="text-gray-500 text-sm font-semibold">
            Dashboard /product{" "}
            <span className="text-[#181c32]">/Add New Product</span>
          </h3>
        </div>
      </div>

      {/* Form */}
      <div className="p-2 space-y-6 md:p-6 bg-white shadow-md rounded-md mt-6">
        {/* Supplier Info */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2  gap-4">
            <Input
              labelName="Supplier Name"
              name="supplierName"
              value={formData.supplierName}
              onChange={handleChange}
              required
              error={errors?.supplierName}
              placeholder="Supplier Name"
            />

            <FilterSelect
              name="batch"
              label="Batch"
              value={formData.batch}
              // onChange={(value) => setFormData({ ...formData, categorySupplier: value })}
              placeholder="Select Batch"
              // options={categoryOptions}
              // error={errors?.categorySupplier}
            />

            <Input
              labelName="Medicine Name"
              name="medicineName"
              value={formData.medicineName}
              onChange={handleChange}
              required
              error={errors?.medicineName}
              placeholder="Medicine Name"
            />

            <FilterSelect
              name="category"
              label="Category"
              value={formData.category}
              // onChange={(value) => setFormData({ ...formData, categorySupplier: value })}
              placeholder="Select Category"
              // options={categoryOptions}
              // error={errors?.categorySupplier}
            />
            <FilterSelect
              name="subCategory"
              label="Sub Category"
              value={formData.subCategory}
              // onChange={(value) => setFormData({ ...formData, categorySupplier: value })}
              placeholder="Select Sub Category"
              // options={categoryOptions}
              // error={errors?.categorySupplier}
            />
            <FilterSelect
              name="composition"
              label="Composition"
              value={formData.composition}
              // onChange={(value) => setFormData({ ...formData, categorySupplier: value })}
              placeholder="Select Composition"
              // options={categoryOptions}
              // error={errors?.categorySupplier}
            />

            <FilterSelect
              name="instructions"
              label="Instructions"
              value={formData.instructions}
              // onChange={(value) => setFormData({ ...formData, categorySupplier: value })}
              placeholder="Select Instructions"
              // options={categoryOptions}
              // error={errors?.categorySupplier}
            />

            <FilterSelect
              name="warning"
              label="Warning"
              value={formData.warning}
              // onChange={(value) => setFormData({ ...formData, categorySupplier: value })}
              placeholder="Select Warning"
              // options={categoryOptions}
              // error={errors?.categorySupplier}
            />

            <FilterSelect
              name="brand"
              label="Brand"
              value={formData.brand}
              // onChange={(value) => setFormData({ ...formData, categorySupplier: value })}
              placeholder="Select Brand"
              // options={categoryOptions}
              // error={errors?.categorySupplier}
            />

            <FilterSelect
              name="qtyType"
              label="Qty type"
              value={formData.qtyType}
              // onChange={(value) => setFormData({ ...formData, categorySupplier: value })}
              placeholder="Select Qty type"
              // options={categoryOptions}
              // error={errors?.categorySupplier}
            />

           

            <Input
              labelName="Manufacturing Date"
              name="manufacturingDate"
              type="date"
              value={formData.manufacturingDate}
              onChange={handleChange}
              required
              error={errors?.manufacturingDate}
              placeholder="Manufacturing Data"
            />

            <Input
              labelName="Expiry Date"
              name="expiryDate"
              type="date"
              value={formData.expiryDate}
              onChange={handleChange}
              required
              error={errors?.expiryDate}
              placeholder="Expiry Date"
            />

            <Input
              labelName="HSN Code"
              name="hsnCode"
              value={formData.hsnCode}
              onChange={handleChange}
              required
              error={errors?.hsnCode}
              placeholder="HSN Code"
            />

            <Input
              labelName="Medicine Price"
              name="medicinePrice"
              type="number"
              value={formData.medicinePrice}
              onChange={handleChange}
              required
              error={errors?.medicinePrice}
              placeholder="Medicine Price"
            />

            <Input
              labelName="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              error={errors?.description}
              placeholder="Description"
            />
            <Input
              labelName="Warranty"
              name="warranty"
              value={formData.warranty}
              onChange={handleChange}
              required
              error={errors?.warranty}
              placeholder="Warranty"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-4">
          <TransparentButton
            label="Cancel"
            onClick={() => navigate("/app/product")}
          />
          <TransparentButton label="Save Product" className="text-black !bg-white max-w-[170px]">
            Save Product
          </TransparentButton>
        </div>
      </div>
    </div>
  );
};

export default AddNewProduct;
