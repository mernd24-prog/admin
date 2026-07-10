
import Button from "../../../../components/Atoms/buttons/button";
import ToggleButton from "../../../../components/Atoms/ToggleButton/ToggleButton";

export default function ProductSettingsPanel({ handleSaveSubmit, formData, handleToggleProductSetting, saving = false }) {
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
          className="w-full !font-semibold"
          onClick={handleSaveSubmit}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Product'}
        </Button>
      </div>

      {/* Status toggles */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-0 divide-y divide-gray-100">
        {[
          { label: 'Active', desc: 'Make this product visible on the storefront.', key: 'DISABLE', value: !formData?.isDisable },
          { label: 'Approved', desc: 'Mark this product as approved for sale.', key: 'APPROVE', value: formData?.isApproved },
        ].map(({ label, desc, key, value }) => (
          <div key={key} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">{desc}</p>
            </div>
            <div className="flex-shrink-0 mt-0.5">
              <ToggleButton isToggle={value} handleClick={() => handleToggleProductSetting(key)} />
            </div>
          </div>
        ))}
      </div>

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
