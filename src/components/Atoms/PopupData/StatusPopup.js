import Button from "../buttons/button";
import ButtonTransparent from "../ButtonTransparent/button";
import { GrUpdate } from "react-icons/gr";

const StatusPopup = ({ isOpen, onClose, onConfirm, heading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-[#ffffff] p-6 rounded-[19px] shadow-lg text-center lg:w-[400px] w-11/12 mx-auto">
        <div className="flex items-center justify-center mb-4">
          {/* <img src="/Img/statusImg.png" alt="Alert" /> */}
          <GrUpdate size={70} />
        </div>
        <p className="text-[17px] font-[600] text-black mb-4">{heading}</p>
        <div className="grid grid-cols-2  gap-4 ">
          <ButtonTransparent onClick={onClose}>Cancel</ButtonTransparent>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
};
export default StatusPopup;
