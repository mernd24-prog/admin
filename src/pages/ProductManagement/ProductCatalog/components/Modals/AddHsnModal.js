import React from "react";
import { useFormik } from "formik";
import { toast } from "sonner";

import FormInput from "../../../../../components/Atoms/FormInput/FormInput";
import DefaultModal from "../../../../../components/Atoms/Modal/DefaultRightSideModal";
import FormSection from "../../../../../components/Atoms/FormSection/FormSection";
import { hsnValidationSchema } from "../../../../../_helpers/validationSchemas";

const INITIAL_VALUES = {
  code: "",
  description: "",
  IGST: "",
  CGST: "",
  SGST: "",
  additionalTax: "",
};

const AddHsnModal = ({
  isOpen,
  resetForm,
  handleSubmit,
}) => {
  const formik = useFormik({
    initialValues: INITIAL_VALUES,
    validationSchema: hsnValidationSchema,
    onSubmit: async (values, { resetForm: resetFormikForm }) => {
      try {
        const created = await handleSubmit(values);
        if (created) resetFormikForm();
      } catch (error) {
        console.error("Failed to add HSN Code:", error);

        const errorMessage =
          error?.response?.data?.message ||
          error?.response?.data?.error?.message ||
          "Failed to add HSN Code. Please try again.";

        toast.error(errorMessage);
      }
    },
  });

  const handleModalClose = () => {
    formik.resetForm();
    resetForm();
  };

  return (
    <div>
      <DefaultModal
        title="Add HSN Code"
        isOpen={isOpen}
        onClose={handleModalClose}
        onSubmit={formik.handleSubmit}
        submitButtonText={formik.isSubmitting ? "Creating..." : "Create"}
        closeButtonText="Cancel"
        isButtonView={true}
        loading={formik.isSubmitting}
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
                value={formik.values.code}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.code && formik.errors.code}
                required
                placeholder="e.g., 49012"
              />

              <FormInput
                type="textarea"
                value={formik.values.description}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                name="description"
                label="Description"
                placeholder="Enter HSN code description..."
                error={formik.touched.description && formik.errors.description}
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
                value={formik.values.IGST}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.IGST && formik.errors.IGST}
                required
                placeholder="Enter IGST rate"
                min="0"
                max="100"
                step="0.01"
              />

              <FormInput
                label="CGST (%)"
                name="CGST"
                type="number"
                value={formik.values.CGST}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.CGST && formik.errors.CGST}
                required
                placeholder="Enter CGST rate"
                min="0"
                max="100"
                step="0.01"
              />

              <FormInput
                label="SGST (%)"
                name="SGST"
                type="number"
                value={formik.values.SGST}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.SGST && formik.errors.SGST}
                required
                placeholder="Enter SGST rate"
                min="0"
                max="100"
                step="0.01"
              />

              <FormInput
                label="Additional Tax (%)"
                name="additionalTax"
                type="number"
                value={formik.values.additionalTax}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.additionalTax && formik.errors.additionalTax
                }
                required
                placeholder="Enter additional tax"
                min="0"
                max="100"
                step="0.01"
              />
            </div>
          </FormSection>
        </div>
      </DefaultModal>
    </div>
  );
};

export default AddHsnModal;
