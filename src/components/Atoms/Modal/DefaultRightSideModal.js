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
    width = "500px",
    loading = false,
    closeOnOutsideClick = true
}) => {
    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "auto";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || loading) return undefined;
        const closeOnEscape = (event) => event.key === "Escape" && onClose?.();
        document.addEventListener("keydown", closeOnEscape);
        return () => document.removeEventListener("keydown", closeOnEscape);
    }, [isOpen, loading, onClose]);

    return (
        <>
            <div
                className={`fixed inset-0 z-40 transition-all duration-300 ease-in-out 
                    ${isOpen ? "bg-[rgba(31,27,95,0.32)] backdrop-blur-sm p-0 m-0 top-0" : "bg-transparent backdrop-blur-0 pointer-events-none"}
                `}
                onClick={!loading && closeOnOutsideClick ? onClose : undefined}
            />
            <div
                className={`
                    fixed inset-0 md:inset-auto md:left-auto md:right-0 md:top-0 h-full w-full md:w-[var(--modal-width)] bg-white shadow-[var(--admin-shadow-strong)] z-50 text-sm
                    transform transition-transform duration-300 ease-in-out
                    ${isOpen ? "translate-x-0" : "translate-x-full"}
                `}
                style={{
                    "--modal-width": width,
                    ...(!isOpen ? { pointerEvents: "none" } : {}),
                }}
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <div className="admin-card-header flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
                    <h2 className={`text-lg font-semibold text-[var(--admin-ink)] ${titleClassName}`}>{title}</h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="text-gray-500 hover:text-gray-700 transition-colors duration-150 p-1"
                        aria-label="Close modal"
                    >
                        <RxCross2 size={20} className="sm:w-5 sm:h-5 w-4 h-4" />
                    </button>
                </div>

                <div className="h-[calc(100%-120px)] overflow-y-auto p-4 sm:p-6">{children}</div>

                {isButtonView && (
                    <div className="absolute bottom-0 left-0 right-0 bg-[var(--admin-surface-soft)] p-3 sm:p-4 flex justify-between items-center border-t border-[var(--admin-line)] gap-2">
                        <TransparentButton 
                            onClick={onClose} 
                            label={closeButtonText} 
                            className="flex-1 sm:flex-none"
                        />
                        <Button 
                            onClick={onSubmit}
                            loading={loading}
                            isDisable={loading}
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
