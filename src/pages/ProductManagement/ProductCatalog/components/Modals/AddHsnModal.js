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
  gstRate: "",
  cessRate: "",
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
        const gstRate = Number(values.gstRate || 0);
        const cessRate = Number(values.cessRate || 0);
        const created = await handleSubmit({
          ...values,
          gstRate,
          cessRate,
          // Keep legacy consumers working while all API calls use gstRate/cessRate.
          IGST: gstRate,
          CGST: gstRate / 2,
          SGST: gstRate / 2,
          additionalTax: cessRate,
        });
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
      const gstRate =
        initialData.gstRate ??
        initialData.IGST ??
        Number(initialData.CGST || 0) + Number(initialData.SGST || 0);
      const cessRate = initialData.cessRate ?? initialData.additionalTax ?? 0;

      formik.setValues({
        ...INITIAL_VALUES,
        _id: initialData._id || "",
        code: initialData.code || "",
        description: initialData.description || "",
        gstRate,
        cessRate,
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
                onChange={(event) => {
                  const digitsOnly = event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 8);
                  formik.setFieldValue("code", digitsOnly);
                }}
                onBlur={formik.handleBlur}
                error={formik.touched.code && formik.errors.code}
                required
                placeholder="e.g. 84715000"
                inputMode="numeric"
                disabled={isEditMode}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  label="GST Rate %"
                  name="gstRate"
                  type="number"
                  value={formik.values.gstRate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.gstRate && formik.errors.gstRate}
                  required
                  placeholder="0.00"
                  min="0"
                  max="100"
                  step="0.01"
                />

                <FormInput
                  label="Compensation Cess %"
                  name="cessRate"
                  type="number"
                  value={formik.values.cessRate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.cessRate && formik.errors.cessRate}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-gray-700">
                <p className="font-medium text-[var(--admin-navy)]">
                  Tax split preview
                </p>
                <p className="mt-1">
                  Inter-state: IGST {Number(formik.values.gstRate || 0)}%
                  <span className="mx-2 text-gray-300">|</span>
                  Intra-state: CGST{" "}
                  {Number(formik.values.gstRate || 0) / 2}% + SGST{" "}
                  {Number(formik.values.gstRate || 0) / 2}%
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  The applicable split is selected automatically from the place
                  of supply.
                </p>
              </div>
              <FormInput
                label="Description"
                name="description"
                type="textarea"
                minLength={3}
                maxLength={500}
                value={formik.values.description}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.description ? formik.errors.description : ""
                }
                placeholder="Enter HSN code description"
                rows={3}
                required
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
