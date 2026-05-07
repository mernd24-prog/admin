import React, { useEffect } from "react";
import { RxCross2 } from "react-icons/rx";
import TransparentButton from "../buttons/TransParentButton";
import Button from "../buttons/button";

const DefaultModal = ({
    isOpen,
    onClose,
    onSubmit,
    children,
    isButtonView = true,
    submitButtonText = "Submit",
    closeButtonText = "Reset",
    title,
    titleClassName = '',
    width = "500px" // Added customizable width
}) => {
    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "auto";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [isOpen]);

    return (
        <>
            <div
                className={`fixed inset-0 z-40 transition-all duration-300 ease-in-out 
                    ${isOpen ? "bg-black bg-opacity-30 backdrop-blur-sm p-0 m-0 -top-3" : "bg-transparent backdrop-blur-0 pointer-events-none"}
                `}
                onClick={onClose}
            />
            <div
                className={`
                    fixed inset-0 md:inset-auto md:left-auto md:right-0 md:-top-3 h-full w-full md:w-[${width}] h-full  bg-white shadow-xl z-50 text-sm
                    transform transition-transform duration-300 ease-in-out
                    ${isOpen ? "translate-x-0" : "translate-x-full"}
                `}
                style={isOpen ? {} : { pointerEvents: "none" }}
            >
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                    <h2 className={`text-lg sm:text-xl font-semibold text-gray-800 ${titleClassName}`}>{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 transition-colors duration-150 p-1"
                        aria-label="Close modal"
                    >
                        <RxCross2 size={20} className="sm:w-5 sm:h-5 w-4 h-4" />
                    </button>
                </div>

                <div className="h-[calc(100%-120px)] overflow-y-auto p-4 sm:p-6">{children}</div>

                {isButtonView && (
                    <div className="absolute bottom-0 left-0 right-0 bg-white p-3 sm:p-4 flex justify-between items-center border-t border-gray-200 gap-2">
                        <TransparentButton 
                            onClick={onClose} 
                            label={closeButtonText} 
                            className="flex-1 sm:flex-none"
                        />
                        <Button 
                            onClick={onSubmit}
                            className="flex-1 sm:flex-none button-primary"
                        >
                            {submitButtonText}
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
};

export default DefaultModal;