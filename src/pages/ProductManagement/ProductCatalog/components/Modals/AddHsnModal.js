import React from "react";
import { toast } from "sonner";

import FormInput from "../../../../../components/Atoms/FormInput/FormInput";
import Input from "../../../../../components/Atoms/Input/Input";
import DefaultModal from "../../../../../components/Atoms/Modal/DefaultRightSideModal";
import FormSection from "../../../../../components/Atoms/FormSection/FormSection";

const AddHsnModal = ({
  isOpen,
  resetForm,
  handleSubmit,
  formData,
  handleInputChange,
  errors,
}) => {
  const handleModalSubmit = async (e) => {
    e?.preventDefault();

    try {
      await handleSubmit(e);
    } catch (error) {
      console.error("Failed to add HSN Code:", error);

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        "Failed to add HSN Code. Please try again.";

      toast.error(errorMessage);
    }
  };

  return (
    <div>
      <DefaultModal
        title="Add HSN Code"
        isOpen={isOpen}
        onClose={resetForm}
        onSubmit={handleModalSubmit}
        submitButtonText="Create"
        closeButtonText="Cancel"
        isButtonView={true}
      >
        <div className="space-y-5">
          {/* ==================== HSN Information ==================== */}
          <FormSection
            title="HSN Information"
            description="Enter the HSN code and its basic details."
          >
            <div className="space-y-4">
              <FormInput
                label="HSN Code"
                name="code"
                type="text"
                value={formData.code}
                onChange={handleInputChange}
                error={errors.code}
                required
                placeholder="e.g., 49012"
              />

              <FormInput
                type="textarea"
                value={formData?.description}
                onChange={handleInputChange}
                name="description"
                label="Description"
                placeholder="Enter HSN code description..."
                error={errors?.description}
                required
              />
            </div>
          </FormSection>

          {/* ==================== Tax Rates ==================== */}
          <FormSection
            title="Tax Rates"
            description="Enter the applicable tax rates for this HSN code."
          >
            <div className="space-y-4">
              <FormInput
                label="IGST (%)"
                name="IGST"
                type="number"
                value={formData.IGST}
                onChange={handleInputChange}
                error={errors.IGST}
                required
                placeholder="Enter IGST rate"
              />

              <FormInput
                label="CGST (%)"
                name="CGST"
                type="number"
                value={formData.CGST}
                onChange={handleInputChange}
                error={errors.CGST}
                required
                placeholder="Enter CGST rate"
              />

              <FormInput
                label="SGST (%)"
                name="SGST"
                type="number"
                value={formData.SGST}
                onChange={handleInputChange}
                error={errors.SGST}
                required
                placeholder="Enter SGST rate"
              />

              <FormInput
                label="Additional Tax (%)"
                name="additionalTax"
                type="number"
                value={formData.additionalTax}
                onChange={handleInputChange}
                error={errors.additionalTax}
                required
                placeholder="Enter additional tax"
              />
            </div>
          </FormSection>
        </div>
      </DefaultModal>
    </div>
  );
};

export default AddHsnModal;
