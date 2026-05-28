import React, { useState, useEffect } from "react";
import AddButton from "../../../components/Button/AddButton";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import TableData from "../../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../../components/Atoms/TableActionButton/TableActionButton";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
// import Button from '../../../components/Atoms/buttons/button';
import { IoMdAddCircleOutline } from "react-icons/io";
// import { FiDelete } from 'react-icons/fi';
import { MdDelete } from "react-icons/md";

const apiRes = [{ id: 1, name: "VAT", isCombined: false, components: [] }];

function TaxStructure() {
  const [filters, setFilters] = useState({ search: "" });
  const [taxStructures, setTaxStructures] = useState(apiRes);
  const [modalState, setModalState] = useState({
    type: "",
    isOpen: false,
    data: null,
  });
  const [inputData, setInputData] = useState({
    name: "",
    isCombined: false,
    components: [""],
  });

  console.log(inputData);

  useEffect(() => {
    if (modalState.data) {
      setInputData({
        name: modalState.data.name,
        isCombined: modalState.data.isCombined,
        components:
          modalState.data.components.length > 0
            ? [...modalState.data.components]
            : [""],
      });
    } else {
      setInputData({
        name: "",
        isCombined: false,
        components: [""],
      });
    }
  }, [modalState.data]);

  const handleAction = (action, data = null) => {
    switch (action) {
      case "ADD":
        setModalState({ type: "Add", isOpen: true, data: null });
        break;
      case "EDIT":
        setModalState({ type: "Edit", isOpen: true, data });
        break;
      case "DELETE":
        setTaxStructures(taxStructures.filter((item) => item.id !== data.id));
        break;
      default:
        break;
    }
  };

  const closeModal = () => {
    setModalState({ type: "", isOpen: false, data: null });
  };

  const handleOnChange = (e) => {
    const { name, value } = e.target;
    setInputData({ ...inputData, [name]: value });
  };

  const handleToggle = () => {
    setInputData((prev) => ({
      ...prev,
      isCombined: !prev.isCombined,
      components: !prev.isCombined ? [""] : [],
    }));
  };

  const handleComponentChange = (index, value) => {
    const newComponents = [...inputData.components];
    newComponents[index] = value;
    setInputData({ ...inputData, components: newComponents });
  };

  const addComponent = () => {
    setInputData((prev) => ({
      ...prev,
      components: [...prev.components, ""],
    }));
  };

  const removeComponent = (index) => {
    if (inputData.components.length > 1) {
      const newComponents = [...inputData.components];
      newComponents.splice(index, 1);
      setInputData({ ...inputData, components: newComponents });
    }
  };

  const handleSubmit = () => {
    if (!inputData.name.trim()) return;

    const taxStructureData = {
      id: modalState.data?.id || Date.now(),
      name: inputData.name,
      isCombined: inputData.isCombined,
      components: inputData.isCombined
        ? inputData.components.filter((c) => c.trim())
        : [],
    };

    if (modalState.type === "Add") {
      setTaxStructures([...taxStructures, taxStructureData]);
    } else {
      setTaxStructures(
        taxStructures.map((item) =>
          item.id === taxStructureData.id ? taxStructureData : item,
        ),
      );
    }

    closeModal();
  };

  return (
    <div className="p-3 max-w-7xl mx-auto space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm">
          <span className="text-[#a1a5b7]">Home /</span> Tax Structure
        </h3>
        <AddButton onClick={() => handleAction("ADD")} />
      </div>
      <div className="bg-white">
        <div className="p-2 border-b">
          <SearchComponent filters={filters} setFilters={setFilters} />
        </div>

        <div>
          <TableData
            tableHeadings={[
              "Tax Structure Name",
              "Combined Tax Structure?",
              "Action",
            ]}
            data={taxStructures.map((ele) => [
              ele.name,
              ele.isCombined ? "Yes" : "No",
              <ActionButtons
                showEditButton
                showDeleteButton
                onEdit={() => handleAction("EDIT", ele)}
                onDelete={() => handleAction("DELETE", ele)}
              />,
            ])}
          />
        </div>
      </div>

      <DefaultModal
        title={
          modalState.type === "Add" ? "Add Tax Structure" : "Edit Tax Structure"
        }
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
      >
        <div className="p-3 space-y-4">
          <Input
            labelName="Tax Name"
            value={inputData.name}
            name="name"
            onChange={handleOnChange}
            required
          />

          <div className="  rounded space-y-4">
            <div className="flex justify-between items-center border p-3">
              <p className="font-medium text-sm">Combined Tax Structure</p>
              <ToggleButton
                isToggle={inputData.isCombined}
                handleClick={handleToggle}
              />
              {/* <input type='checkbox'
                checked={inputData.isCombined}
                onChange={handleToggle}
              /> */}
            </div>
            {inputData.isCombined && (
              <div className="space-y-3">
                <p className="font-medium">Tax Components</p>
                {inputData.components.map((component, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-3 items-center space-x-2"
                  >
                    <div className="col-span-2">
                      <Input
                        value={component}
                        onChange={(e) =>
                          handleComponentChange(index, e.target.value)
                        }
                        placeholder={`Title ${index + 1}`}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex justify-evenly items-center gap-4">
                      {index === inputData.components.length - 1 && (
                        <IoMdAddCircleOutline onClick={addComponent} />
                      )}
                      {inputData.components.length > 1 && (
                        <MdDelete onClick={() => removeComponent(index)} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DefaultModal>
    </div>
  );
}

export default TaxStructure;
