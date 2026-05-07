import React, { useState } from 'react';
// import AddButton from '../../../components/Button/AddButton';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import TableData from '../../../components/Atoms/TableData/TableData';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import DefaultModal from '../../../components/Atoms/Modal/DefaultRightSideModal';
import Input from '../../../components/Atoms/Input/Input';
// import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import CustomCheckbox from '../../../components/Atoms/Checkbox/Checkbox';
import FilterSelect from '../../../components/Atoms/FilterSelect/FilterSelect';

const apiRes = [{ id: 1, name: 'All of world', categoryName: "Electronics", taxRate: "10%", taxStracructreName: "Single Tax", isDisable: false, }];

function TaxRules() {
    const [filters, setFilters] = useState({ search: "" });
    const [taxStructures, setTaxStructures] = useState(apiRes);
    const [modalState, setModalState] = useState({
        type: "",
        isOpen: false,
        data: null,
    });
    const [inputData, setInputData] = useState({
        name: "", rate: '', country: "", state: "", taxStructures: ""
    });



    const handleAction = (action, data = null) => {
        switch (action) {
            case "ADD":
                setModalState({ type: "Add", isOpen: true, data: null });
                break;
            case "EDIT":
                setModalState({ type: "Edit", isOpen: true, data });
                break;
            case "DELETE":
                setTaxStructures(taxStructures.filter(item => item.id !== data.id));
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

    // const handleToggle = () => {
    //     setInputData(prev => ({
    //         ...prev,
    //         isDisable: !prev.isDisable,
    //     }));
    // };



    const handleSubmit = () => {
        if (!inputData.name.trim()) return;

        const taxStructureData = {
            id: modalState.data?.id || Date.now(),
            name: inputData.name,
            isDisable: inputData.isCombined,
        };

        if (modalState.type === "Add") {
            console.log(taxStructureData)
        } else {

        }
        closeModal();
    };

    return (
        <div className='p-3 max-w-7xl mx-auto space-y-3'>
            <div className='flex justify-between items-center'>
                <h3 className='font-semibold text-sm'>
                    <span className='text-[#a1a5b7]'>Home /</span> Tax Rules
                </h3>
            </div>
            <div className='bg-white'>
                <div className='p-2 border-b'>
                    <SearchComponent filters={filters} setFilters={setFilters} />
                </div>

                <div>
                    <TableData
                        tableHeadings={['Category Name', 'Category Name', 'Tax Rate (%)', 'Tax Structure Name', 'Action']}
                        data={taxStructures.map((ele) => [
                            <CustomCheckbox />,
                            ele.name,
                            ele?.categoryName, ele?.taxRate,
                            ele?.taxStracructreName,
                            <ActionButtons
                                showEditButton
                                showDeleteButton
                                onEdit={() => handleAction('EDIT', ele)}
                                onDelete={() => handleAction('DELETE', ele)}
                            />
                        ])}
                        isHeaderCheckbox={true}
                    />
                </div>
            </div>

            <DefaultModal
                title={modalState.type === "Add" ? "Add Tax Tax category rule setup" : "Tax category rule setup"}
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onSubmit={handleSubmit}
            >
                <div className='p-3 grid md:grid-cols-2 grid-cols-1 items-center gap-4'>
                    <Input labelName="Rule Name" value={inputData.name} name="name" onChange={handleOnChange} required />
                    <Input labelName="Rate" value={inputData.rate} name="rate" onChange={handleOnChange} required />
                    <div className='col-span-2'>
                        <FilterSelect label={`Country`} />
                    </div>
                    <div className='col-span-2'>
                        <FilterSelect label={`State`} />
                    </div>
                    <div className='col-span-2'>
                        <FilterSelect label={`Select tax structure*`} />
                    </div>

                </div>
            </DefaultModal>
        </div>
    );
}

export default TaxRules;