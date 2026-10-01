
import { useState } from "react";
import Button from "../../../../components/Atoms/buttons/button";
import ToggleButton from "../../../../components/Atoms/ToggleButton/ToggleButton";

export default function ProductSettingsPanel({
  handleSaveSubmit,
  formData,
  handleToggleProductSetting,
  saving = false,
  canManageApproval = false,
  isEditMode = false,
  onApprove,
  onReject,
}) {
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const codEnabled =
    formData?.shipping?.codAvailable !== undefined
      ? Boolean(formData.shipping.codAvailable)
      : Boolean(formData?.cod);
  const freeShippingEnabled = Boolean(formData?.shipping?.freeShipping);

  return (
    <div className="flex flex-col gap-3">
      {/* Save */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <Button
          variant="primary"
          className="w-full !font-semibold"
          onClick={handleSaveSubmit}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Product'}
        </Button>
      </div>

      {/* Activation is intentionally separate from product moderation. */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-0 divide-y divide-gray-100">
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800">Active</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                Enable or disable an already approved product on the storefront.
              </p>
            </div>
            <div className="flex-shrink-0 mt-0.5">
              <ToggleButton
                isToggle={!formData?.isDisable}
                handleClick={() => handleToggleProductSetting('DISABLE')}
                disabled={formData?.approvalStatus !== "approved" && !formData?.isApproved}
              />
            </div>
        </div>
      </div>

      {canManageApproval && isEditMode && (
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Product Approval</p>
              <p className="mt-0.5 text-xs leading-snug text-gray-500">
                Status: <span className="font-semibold capitalize">{formData?.approvalStatus || "pending"}</span>
              </p>
            </div>
          </div>

          {formData?.approvalStatus !== "approved" && (
            <button
              type="button"
              disabled={saving}
              onClick={onApprove}
              className="mt-3 w-full rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              Approve Product
            </button>
          )}

          {formData?.approvalStatus !== "rejected" && (
            <button
              type="button"
              disabled={saving}
              onClick={() => setShowRejectReason((current) => !current)}
              className="mt-2 w-full rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Reject Product
            </button>
          )}

          {showRejectReason && (
            <div className="mt-3 space-y-2">
              <textarea
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Reason for rejection"
                rows={3}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-red-400"
              />
              <button
                type="button"
                disabled={saving || rejectionReason.trim().length < 2}
                onClick={() => onReject?.(rejectionReason.trim())}
                className="w-full rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          )}
        </div>
      )}

      {/* Featured */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800">Mark as Featured</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">
              Displayed in the featured product list on the storefront.
            </p>
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <ToggleButton isToggle={formData?.markAsFeatured} handleClick={() => handleToggleProductSetting('FEATURED')} />
          </div>
        </div>
      </div>

      {/* COD */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800">Cash on Delivery (COD)</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">
              Allow COD for this product. Checkout disables COD when this product-level setting is off.
            </p>
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <ToggleButton isToggle={codEnabled} handleClick={() => handleToggleProductSetting('COD')} />
          </div>
        </div>
      </div>

      {/* Free Shipping */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800">Free Shipping</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">
              Hide shipping profile selection and deliver this product without a shipping charge.
            </p>
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <ToggleButton isToggle={freeShippingEnabled} handleClick={() => handleToggleProductSetting('FREE_SHIPPING')} />
          </div>
        </div>
      </div>
    </div>
  );
}
