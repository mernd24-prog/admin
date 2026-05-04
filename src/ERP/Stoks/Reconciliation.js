import React, { useMemo, useState } from "react";
import AddButton from "../../components/Button/AddButton";
import TableData from "../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../components/Atoms/TableActionButton/TableActionButton";
import { FaSearch } from "react-icons/fa";
import SearchComponent from "../../components/Atoms/New Table/NewTable";
import DefaultMiddleModal from "../../components/Atoms/Modal/DefaultMiddleModal ";
import FormInput from "../../components/Atoms/FormInput/FormInput";
import Input from "../../components/Atoms/Input/Input";

const dummyData = [
  {
    id: 1,
    medicine: "Medicine #1",
    supplier: "Loren Campbell",
    category: "Cardiac",
    systemCount: 15,
    actualCount: 18,
    difference: 3,
    reason: "Lost and Found",
    image: "https://via.placeholder.com/40",
  },
  {
    id: 2,
    medicine: "Medicine #1",
    supplier: "Aidan Smith",
    category: "Cardiac",
    systemCount: 15,
    actualCount: 9,
    difference: 6,
    reason: "Sent to scrap",
    image: "https://via.placeholder.com/40",
  },
  {
    id: 3,
    medicine: "Medicine #1",
    supplier: "Steve Smith",
    category: "Cardiac",
    systemCount: 15,
    actualCount: 10,
    difference: 5,
    reason: "Lost and Found",
    image: "https://via.placeholder.com/40",
  },
  {
    id: 4,
    medicine: "Medicine #1",
    supplier: "Preeti Schneider",
    category: "Cardiac",
    systemCount: 15,
    actualCount: 18,
    difference: 3,
    reason: "Lost and Found",
    image: "https://via.placeholder.com/40",
  },
  {
    id: 5,
    medicine: "Medicine #1",
    supplier: "Preo Mudaliar",
    category: "Cardiac",
    systemCount: 15,
    actualCount: 18,
    difference: 3,
    reason: "Lost and Found",
    image: "https://via.placeholder.com/40",
  },
];

// Constants
const INITIAL_FILTERS = {
  search: "",
};

const Reconciliation = () => {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [date, setDate] = useState("");
  const [isUpdateOpenModal, setIsUpdateOpenModal] = useState(false);

  const TABLE_HEADINGS = [
    "#",
    "Medicine",
    "Supplier",
    "Category",
    "System count",
    "Actual Count",
    "Difference",
    "Reason for Difference",
    "Actions",
  ];

  const tableRows = useMemo(
    () =>
      dummyData
        .filter((item) =>
          item.medicine.toLowerCase().includes(search.toLowerCase())
        )
        .map((item, index) => [
          <span key={`index-${item.id}`}>{index + 1}</span>,
          <div key={`medicine-${item.id}`} className="flex items-center gap-2">
            <img
              src={item.image}
              alt="medicine"
              className="w-10 h-10 rounded"
            />
            <div>
              <div className="font-medium text-sm">{item.medicine}</div>
              <div className="text-xs text-gray-500">HSN Code: 12345678</div>
              <div className="text-xs text-gray-500">
                MRP: ₹50 Code: Generic
              </div>
            </div>
          </div>,
          <span key={`supplier-${item.id}`}>{item.supplier}</span>,
          <span key={`category-${item.id}`}>{item.category}</span>,
          <span key={`sys-${item.id}`}>{item.systemCount}</span>,
          <span key={`actual-${item.id}`}>{item.actualCount}</span>,
          <span key={`diff-${item.id}`}>{item.difference}</span>,
          <span key={`reason-${item.id}`}>{item.reason}</span>,
          <ActionButtons
            key={`actions-${item.id}`}
            showViewButton={true}
            showEditButton={true}
            showDeleteButton={true}
            onEdit={() => setIsUpdateOpenModal(true)}
          />,
        ]),
    [search]
  );

  const handleAddNavigate = () => {
    // navigation logic here
  };

  const closeUpdateModal = () => {
    setIsUpdateOpenModal(false);
    // setPasswordForm({
    //   password: '',
    //   confirmPassword: ''
    // });
    // setPasswordErrors({
    //   password: '',
    //   confirmPassword: ''
    // });
  };

  return (
    <div className="p-4 sm:p-6 mx-auto overflow-auto max-w-7xl">
      {/* Header */}
      <div className="flex flex-row justify-between items-center mb-4 gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Reconciliation</h1>
          <h3 className="text-sm text-gray-500 font-medium">
            Dashboard / Inventory /{" "}
            <span className="text-[#181c32]">Reconciliation</span>
          </h3>
        </div>
        <AddButton onClick={handleAddNavigate}>Add New Goods</AddButton>
      </div>

      {/* Filters */}

      {/* Table */}
      <div className="bg-white rounded shadow-sm p-4 overflow-auto">
        <div className="p-2 border-b flex gap-2 items-center flex-wrap sm:flex-nowrap justify-between">
          {/* search component */}
          <div className="mt-[10px] w-2/3 flex items-center">
            <SearchComponent
              tableHeadings={TABLE_HEADINGS}
              data={tableRows}
              //   selectedRow={selectedRow}
              //   setSelectedRow={setSelectedRow}
              //   loading={loading}
              filters={filters}
              //   setFilters={setFilters}
              isSearchShow={true}
              isActivationStatus={false}
              isApprovalOptions={false}
              isCategory={true}
              isProduct={true}
              isProductType={true}
              isUser={true}
              //   applyFilters={handleSearchApply}
              //   handleSearchRemove={clearFilters}
              isActionButton={true}
              isStatusAction={false}
              // handleAction={handleBulkAction}
              // mobailClassName="!gap-0"
            />
          </div>

          {/* date input */}
          <div className="w-1/3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded-md px-4 py-2 text-sm w-full"
            />
          </div>
        </div>
        <TableData
          tableHeadings={TABLE_HEADINGS}
          data={tableRows}
          showHeadingDiv={false}
          rowDataKey="id"
          sortableColumns={[1, 2, 3]}
          isHeaderCheckbox={false}
        />
      </div>

      {/* Update popup */}
      {isUpdateOpenModal && (
        <DefaultMiddleModal
          isOpen={isUpdateOpenModal}
          onClose={closeUpdateModal}
          // onSubmit={handleSubmitUpdatePassword}
          isButtonView={true}
          submitButtonText="Submit"
          closeButtonText="Cancel"
          title="Stock Update"
          buttonsClassName="!relative"
        >
          <div className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Input
                labelName="Medicine Name"
                name="medicineName"
                type="text"
                placeholder="Medicine Name"
                required
              />
              <Input
                labelName="Category"
                name="category"
                type="text"
                placeholder="Category"
                required
              />
            </div>

            <div className="mb-4">
              <Input
                labelName="System Count"
                name="systemCount"
                type="number"
                placeholder="System Count"
                required
              />
            </div>

            <div className="mb-4">
              <Input
                labelName="Actual Count"
                name="actualCount"
                type="number"
                placeholder="Actual Count"
                required
              />
            </div>

            <div className="mb-4">
              <Input
                labelName="Reason for Difference"
                name="reason"
                type="text"
                placeholder="Reason for difference"
                required
              />
            </div>
          </div>
        </DefaultMiddleModal>
      )}
    </div>
  );
};

export default Reconciliation;
