import React, { useState } from 'react';
import { RxCross2 } from 'react-icons/rx';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';
import FormSubmitButton from '../../../../components/Atoms/FormButton/FormSubmitButton';

const toggleOptions = [
  "activate",
  "approval",
  "updateLanguages",
  "featured",
  "cashOnDelivery"
];

const toggleLabels = {
  activate: "Track & subtract quantities of inventory",
  approval: "Send Alert When Inventory Level is Low",
  featured: "Use shop return and cancellation age policy",
  cashOnDelivery: "Publish inventory",
  updateLanguages: "Update other languages data"
};

const SellerInventorySetup = ({ setFormData, formData, InventorySetupOpen, togglePanel }) => {
  const [settings, setSettings] = useState({
    activate: true,
    approval: false,
    updateLanguages: false,
    featured: false,
    cashOnDelivery: false
  });

  const handleToggle = (setting) => {
    setSettings(prev => ({ ...prev, [setting]: !prev[setting] }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // const handleSubmit = () => {
  //   const combinedData = {
  //     ...formData,
  //     ...settings
  //   };
  //   console.log("Submitting form data:", combinedData);
  //   // Submit the data to an API here
  // };

  const renderToggle = (key) => (
    <div key={key} className="flex items-center justify-between p-4 mb-4 border rounded">
      <span className="font-medium text-black">{toggleLabels[key]}</span>
      <button
        className={`w-12 h-6 rounded-full relative ${settings[key] ? 'bg-blue-500' : 'bg-gray-600'}`}
        onClick={() => handleToggle(key)}
      >
        <span className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-all ${settings[key] ? 'right-1' : 'left-1'}`}>
          {settings[key] && (
            <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none">
              <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </button>
    </div>
  );

  const formFields = [
    { label: "User*", name: "user", type: "text" },
    { label: "Title*", name: "title", type: "text" },
    { label: "URL keyword", name: "urlKeyword", type: "text" },
    { label: "Cost price [$]*", name: "costPrice", type: "number" },
    { label: "Selling price [$]*", name: "sellingPrice", type: "number" },
    { label: "Available quantity*", name: "availableQty", type: "number" },
    { label: "Product SKU*", name: "sku", type: "text" },
    { label: "Minimum purchase quantity*", name: "minPurchaseQty", type: "number" },
    { label: "Product condition*", name: "productCondition", type: "select", options: ['New', 'Used', 'Refurbished'] },
    { label: "Available for COD", name: "codAvailable", type: "select", options: ['Yes', 'No'] },
    { label: "Fulfillment method*", name: "fulfillmentMethod", type: "select", options: ['Ship Only', 'Pick Up Only', 'Ship & Pick Up'] },
    { label: "Date available*", name: "availableDate", type: "date" },
    { label: "Product order return period (days)*", name: "returnPeriod", type: "number" },
    { label: "Product order cancellation period (days)*", name: "cancelPeriod", type: "number" },
    { label: "Any extra comment for buyer", name: "comments", type: "textarea" }
  ];

  return (
    <div className="font-sans">
      <div
        className={`fixed top-0 right-0 h-full w-[500px] bg-white text-black shadow-xl transform transition-transform duration-300 ease-in-out overflow-auto border-l z-50 ${InventorySetupOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-black">Product's Edit</h2>
          <button onClick={togglePanel} className="text-gray-900">
            <RxCross2 size={22} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          {formFields.map(({ label, name, type, options }) => (
            <FormInput
              key={name}
              label={label}
              name={name}
              value={formData[name]}
              onChange={handleChange}
              type={type}
              options={options}
            />
          ))}
        </div>

        <div className="p-4">
          {toggleOptions.map(renderToggle)}
        </div>

        <div className="p-4">
          <FormSubmitButton buttonLabel="Submit" />
        </div>
      </div>
    </div>
  );
};

export default SellerInventorySetup;
