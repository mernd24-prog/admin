import React from "react";
import { IoMdAddCircleOutline } from "react-icons/io";

const AddButton = React.memo(({
    type = "button",
    onClick,
    children = "Button",
    className = "",
    style = {},
    isDisable = false, labelName,
    ...rest
}) => {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isDisable}
            className={`button-outline-primary
            inline-flex items-center cursor-pointer gap-1.5 px-5 h-10 text-sm leading-6 font-normal border-2     transition-colors duration-150
            group w-auto ${className}`} {...rest}>
            <IoMdAddCircleOutline />
            {labelName ? <span>{labelName}</span> : <span>Add</span>}
        </button>
    );
});

export default AddButton;
