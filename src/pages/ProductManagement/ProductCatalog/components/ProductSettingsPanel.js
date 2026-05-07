
import Button from "../../../../components/Atoms/buttons/button";
import ToggleButton from "../../../../components/Atoms/ToggleButton/ToggleButton";

export default function ProductSettingsPanel({ handleSaveSubmit, formData, handleToggleProductSetting }) {

  return (
    <div className="flex flex-col w-auto gap-4">
      <div className="p-4 bg-white space-y-3">
        <Button className={`w-full bg-white text-black`} onClick={handleSaveSubmit}>Save</Button>
        <div className="flex items-center justify-between p-4 mb-4 border rounded">
          <span className="font-light text-gray-800">Activate it</span>
          <ToggleButton isToggle={formData?.isDisable} handleClick={() => handleToggleProductSetting('DISABLE')} />
        </div>
        <div className="flex items-center justify-between p-4 mb-4 border rounded">
          <span className="font-light text-gray-800">Approval status</span>
          <ToggleButton isToggle={formData?.isApproved} handleClick={() => handleToggleProductSetting('APPROVE')} />

        </div>
        <div className="flex items-center justify-between p-4 mb-4 border rounded">
          <span className="font-light text-gray-800">Prescription Required</span>
          <ToggleButton isToggle={formData?.prescription_required} handleClick={() => handleToggleProductSetting('prescription_required')} />

        </div>
      </div>
      <div className="relative p-4 bg-white">
        <div className="flex justify-between items-center">
          <span className="font-light text-gray-800">Mark as featured</span>
          <ToggleButton isToggle={formData?.markAsFeatured} handleClick={() => handleToggleProductSetting('FEATURED')} />
        </div>
        <span className="mt-1 text-xs text-gray-500">
          Mark this product as a featured product, and it will be displayed under the featured product list on the front end.
        </span>

      </div>

      <div className="relative p-4 bg-white">
        <div className="flex">
          <span className="font-light text-gray-800">
            Available for Cash on Delivery (COD) and Pay at Store
          </span>
          <ToggleButton isToggle={formData?.cod} handleClick={() => handleToggleProductSetting('COD')} />
        </div>
        <div>
          <span className="text-xs text-gray-500">
            Activate this if the product is available for COD and Pay at Store.
            <br />
            COD will work only if the fulfillment method is Shipping.
            <br />
            Pay at Store will work only if the fulfillment method is Pickup.
          </span>
        </div>
      </div>

    </div>
  );
}