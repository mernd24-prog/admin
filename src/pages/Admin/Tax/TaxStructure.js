import React, { useEffect, useState } from "react";
import { MdAdd, MdAccountTree } from "react-icons/md";
import { IoMdAddCircleOutline } from "react-icons/io";
import { MdDelete } from "react-icons/md";
import { PageHeader, DataTable, ConfirmModal } from "../../../components/Shared";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";

const MOCK_DATA = [{ id: 1, name: "VAT", isCombined: false, components: [] }];

const COLUMNS = [
  { key: "name", label: "Tax Structure Name", sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: "isCombined", label: "Combined Structure?", render: (v) => <span className={`text-xs font-medium ${v ? "text-blue-600" : "text-gray-500"}`}>{v ? "Yes" : "No"}</span> },
];

const EMPTY_FORM = { name: "", isCombined: false, components: [""] };

function TaxStructure() {
  const [data, setData] = useState(MOCK_DATA);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        isCombined: editing.isCombined,
        components: editing.components?.length > 0 ? [...editing.components] : [""],
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editing]);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleToggle = () => {
    setForm((prev) => ({ ...prev, isCombined: !prev.isCombined, components: !prev.isCombined ? [""] : [] }));
  };

  const handleComponentChange = (index, value) => {
    const updated = [...form.components];
    updated[index] = value;
    setForm((f) => ({ ...f, components: updated }));
  };

  const addComponent = () => setForm((f) => ({ ...f, components: [...f.components, ""] }));
  const removeComponent = (index) => {
    if (form.components.length > 1) {
      setForm((f) => ({ ...f, components: f.components.filter((_, i) => i !== index) }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const record = {
      id: editing?.id || Date.now(),
      name: form.name,
      isCombined: form.isCombined,
      components: form.isCombined ? form.components.filter((c) => c.trim()) : [],
    };
    if (editing) {
      setData((prev) => prev.map((item) => item.id === editing.id ? record : item));
    } else {
      setData((prev) => [...prev, record]);
    }
    closeModal();
  };

  const rowActions = (row) => [
    { label: "Edit", onClick: () => { setEditing(row); setModalOpen(true); } },
    { label: "Delete", onClick: () => setDeleteTarget(row), danger: true },
  ];

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
      <PageHeader
        title="Tax Structures"
        subtitle="Define single or combined tax structures"
        breadcrumbs={[{ label: "Tax & Compliance" }, { label: "Tax Structures" }]}
        actions={
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-gold)] text-white text-sm rounded-lg hover:bg-[var(--admin-gold-dark)] transition-colors">
            <MdAdd size={16} /> Add Structure
          </button>
        }
      />

      <DataTable
        columns={COLUMNS}
        data={data}
        loading={false}
        totalCount={data.length}
        rowActions={rowActions}
        emptyText="No tax structures found."
        emptyIcon={<MdAccountTree size={40} className="text-gray-200" />}
      />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[var(--admin-navy)] mb-5">{editing ? "Edit Tax Structure" : "Add Tax Structure"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]" placeholder="e.g. VAT, GST" />
              </div>

              <div className="flex items-center justify-between border rounded-lg px-4 py-2.5">
                <span className="text-sm font-medium text-gray-700">Combined Tax Structure</span>
                <ToggleButton isToggle={form.isCombined} handleClick={handleToggle} />
              </div>

              {form.isCombined && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Tax Components</p>
                  {form.components.map((component, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={component}
                        onChange={(e) => handleComponentChange(index, e.target.value)}
                        placeholder={`Component ${index + 1}`}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                      />
                      {index === form.components.length - 1 && (
                        <button type="button" onClick={addComponent} className="text-[var(--admin-gold)] hover:opacity-70">
                          <IoMdAddCircleOutline size={20} />
                        </button>
                      )}
                      {form.components.length > 1 && (
                        <button type="button" onClick={() => removeComponent(index)} className="text-red-400 hover:text-red-600">
                          <MdDelete size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-5 py-2 text-sm rounded-lg bg-[var(--admin-gold)] text-white hover:bg-[var(--admin-gold-dark)] transition-colors">{editing ? "Save" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { setData((prev) => prev.filter((item) => item.id !== deleteTarget.id)); setDeleteTarget(null); }}
        title="Delete Tax Structure"
        message={`Delete structure "${deleteTarget?.name}"?`}
        variant="danger"
        confirmText="Delete"
      />
    </div>
  );
}

export default TaxStructure;
