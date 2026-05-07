import { RxCross2 } from "react-icons/rx";

const missingInfoData = [
  ["Product active", "Yes", "Yes"],
  ["Product approved", "Yes", "Yes"],
  ["Product deleted", "No", "Yes"],
  ["Product category active", "Yes", "Yes"],
  ["Product category deleted", "No", "Yes"],
  ["Product category status", "Yes", "Yes"],
  ["Tax category active", "Yes", "Yes"],
  ["Tax category deleted", "No", "Yes"],
  ["Brand active", "Yes", "Yes"],
  ["Brand deleted", "No", "Yes"],
  ["Seller deleted", "No", "Yes"],
  ["Seller active", "Yes", "Yes"],
  ["Seller verified", "Yes", "Yes"],
  ["Shop active", "Yes", "Yes"],
  ["Shop display status", "Yes", "Yes"],
  ["Shop country active", "Yes", "Yes"],
  ["Shop state active", "Yes", "Yes"],
];

const ProductMissingInfo = ({ missingOpen, togglePanel, title = "Product's missing information" }) => {
  return (
    <div className="font-sans">
      <div
        className={`fixed top-0 right-0 h-full w-[450px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-auto border-l border-gray-200 z-50 ${missingOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button onClick={togglePanel} className="text-gray-500 hover:text-gray-700">
            <RxCross2 size={22} />
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          <div className="grid grid-cols-3 gap-4 px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100">
            <div>Field</div>
            <div>Status</div>
            <div>Valid</div>
          </div>

          {missingInfoData.map(([title, status, valid], index) => (
            <div
              key={index}
              className={`grid grid-cols-3 gap-4 px-6 py-3 text-sm items-center ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
            >
              <div className="text-gray-800">{title}</div>
              <div className="text-gray-600">{status}</div>
              <div className={`font-medium ${valid === "Yes" ? "text-teal-600" : "text-red-500"}`}>
                {valid}
              </div>
            </div>
          ))}
        </div>
      </div>

      {missingOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-30"
          onClick={togglePanel}
        ></div>
      )}
    </div>
  );
}
export default ProductMissingInfo;