import { HiOutlineExclamationCircle } from "react-icons/hi";
import Button from "../buttons/button";
import ButtonTransparent from "../ButtonTransparent/button";

const StatusPopup2 = ({ isOpen, onClose, onConfirm, heading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl text-center w-full max-w-md p-6">
        <div className="flex flex-col items-center justify-center mb-4">
          <div className="bg-red-100 text-red-600 rounded-full p-3 mb-3">
            <HiOutlineExclamationCircle size={48} />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">{heading}</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <ButtonTransparent onClick={onClose}>
            Cancel
          </ButtonTransparent>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StatusPopup2;
