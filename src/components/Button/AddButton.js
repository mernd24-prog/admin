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
            className={`admin-btn-secondary group w-auto ${className}`} {...rest}>
            <IoMdAddCircleOutline />
            {labelName ? <span>{labelName}</span> : <span>Add</span>}
        </button>
    );
});

export default AddButton;
