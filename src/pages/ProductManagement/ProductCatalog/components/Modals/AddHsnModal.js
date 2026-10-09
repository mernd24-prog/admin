import React, { useEffect } from "react";
import { useFormik } from "formik";
import { toast } from "sonner";

import FormInput from "../../../../../components/Atoms/FormInput/FormInput";
import DefaultModal from "../../../../../components/Atoms/Modal/DefaultRightSideModal";
import FormSection from "../../../../../components/Atoms/FormSection/FormSection";
import FormToggleRow from "../../../../../components/Atoms/FormToggleRow/FormToggleRow";
import { hsnValidationSchema } from "../../../../../_helpers/validationSchemas";

const INITIAL_VALUES = {
  code: "",
  description: "",
  IGST: "",
  CGST: "",
  SGST: "",
  additionalTax: "",
  isDisable: false,
};

/**
 * Shared HSN Code side-drawer used by both:
 *  - HSN Codes page   (Admin > Invoices & Taxation)
 *  - Add / Edit Product page (Product Catalog)
 *
 * Props
 * ─────────────────────────────────────────────────────
 * @param {boolean}  isOpen        - Controls drawer visibility
 * @param {function} resetForm     - Called when the drawer is closed
 * @param {function} handleSubmit  - Receives form values; should return a truthy value on success
 * @param {"add"|"edit"} [mode]    - "add" (default) or "edit"
 * @param {object}   [initialData] - Pre-fill values for edit mode
 * @param {boolean}  [showActive]  - Show the Active toggle row (default: false)
 */
const AddHsnModal = ({
  isOpen,
  resetForm,
  handleSubmit,
  mode = "add",
  initialData = null,
  showActive = false,
}) => {
  const isEditMode = mode === "edit";

  const formik = useFormik({
    initialValues: INITIAL_VALUES,
    validationSchema: hsnValidationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { resetForm: resetFormikForm }) => {
      try {
        const created = await handleSubmit(values);
        if (created) resetFormikForm();
      } catch (error) {
        console.error(
          `Failed to ${isEditMode ? "update" : "add"} HSN Code:`,
          error,
        );

        const errorMessage =
          error?.response?.data?.message ||
          error?.response?.data?.error?.message ||
          `Failed to ${isEditMode ? "update" : "add"} HSN Code. Please try again.`;

        toast.error(errorMessage);
      }
    },
  });

  /* ---------- Populate form when editing ---------- */
  useEffect(() => {
    if (isOpen && initialData && isEditMode) {
      formik.setValues({
        ...INITIAL_VALUES,
        _id: initialData._id || "",
        code: initialData.code || "",
        description: initialData.description || "",
        IGST: initialData.IGST ?? "",
        CGST: initialData.CGST ?? "",
        SGST: initialData.SGST ?? "",
        additionalTax: initialData.additionalTax ?? "",
        isDisable: initialData.isDisable || false,
      });
    }

    if (isOpen && !isEditMode) {
      formik.resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData, isEditMode]);

  const handleModalClose = () => {
    formik.resetForm();
    resetForm();
  };

  return (
    <div>
      <DefaultModal
        title={isEditMode ? "Edit HSN Code" : "Add HSN Code"}
        isOpen={isOpen}
        onClose={handleModalClose}
        onSubmit={formik.handleSubmit}
        submitButtonText={
          formik.isSubmitting
            ? "Saving..."
            : isEditMode
              ? "Save Changes"
              : "Create HSN Code"
        }
        closeButtonText="Cancel"
        isButtonView={true}
        loading={formik.isSubmitting}
      >
        <div className="space-y-5">
          {/* ==================== HSN Information ==================== */}
          <FormSection
            title="HSN Information"
            description="Enter the HSN code and tax details."
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
                placeholder="e.g. 84715000"
                disabled={isEditMode}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  label="IGST %"
                  name="IGST"
                  type="number"
                  value={formik.values.IGST}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.IGST && formik.errors.IGST}
                  required
                  placeholder="0.00"
                  min="0"
                  max="100"
                  step="0.01"
                />

                <FormInput
                  label="CGST %"
                  name="CGST"
                  type="number"
                  value={formik.values.CGST}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.CGST && formik.errors.CGST}
                  required
                  placeholder="0.00"
                  min="0"
                  max="100"
                  step="0.01"
                />

                <FormInput
                  label="SGST %"
                  name="SGST"
                  type="number"
                  value={formik.values.SGST}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.SGST && formik.errors.SGST}
                  required
                  placeholder="0.00"
                  min="0"
                  max="100"
                  step="0.01"
                />

                <FormInput
                  label="Additional Tax %"
                  name="additionalTax"
                  type="number"
                  value={formik.values.additionalTax}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.additionalTax && formik.errors.additionalTax
                  }
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <FormInput
                label="Description"
                name="description"
                type="textarea"
                value={formik.values.description}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.description && formik.errors.description}
                placeholder="Enter HSN code description"
                rows={3}
              />
            </div>
          </FormSection>

          {/* ==================== Active Toggle ==================== */}
          {showActive && (
            <FormToggleRow
              title="Active"
              description="Allow this HSN code to be used for products and tax calculations."
              isToggle={!formik.values.isDisable}
              handleClick={() =>
                formik.setFieldValue("isDisable", !formik.values.isDisable)
              }
            />
          )}
        </div>
      </DefaultModal>
    </div>
  );
};

export default AddHsnModal;
