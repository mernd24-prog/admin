import NewButton from "../Button/NewButton";
import ButtonTransparent from "../ButtonTransparent/button";

const StatusPopup = ({ isOpen, onClose, onConfirm, heading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#ffffff] p-6 rounded-[19px] shadow-lg text-center lg:w-[400px] w-11/12 mx-auto">
        <div className="flex items-center justify-center mb-4">
          <img src="/cross.png" alt="" />
        </div>
        <p className="text-[17px] font-[600] text-black mb-4">{heading}</p>
        <div className="flex justify-center gap-4">
          <ButtonTransparent
            onClick={onClose}>
            Cancel
          </ButtonTransparent>
          <NewButton 
            onClick={() => {
              onConfirm();
              onClose();
            }}>
            OK
          </NewButton>
        </div>
      </div>
    </div>
  );
};
export default StatusPopup