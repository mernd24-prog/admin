import React, { useState } from "react";
import { MdAdd, MdRule } from "react-icons/md";
import { PageHeader, DataTable, ConfirmModal } from "../../../components/Shared";

const MOCK_DATA = [
  { id: 1, name: "All of world", categoryName: "Electronics", taxRate: "10%", taxStructureName: "Single Tax" },
];

const COLUMNS = [
  { key: "name", label: "Rule Name", sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: "categoryName", label: "Category", render: (v) => <span className="text-sm text-gray-600">{v}</span> },
  { key: "taxRate", label: "Tax Rate (%)", render: (v) => <span className="font-mono text-sm">{v}</span> },
  { key: "taxStructureName", label: "Tax Structure", render: (v) => <span className="text-sm text-gray-600">{v}</span> },
];

function TaxRules() {
  const [data, setData] = useState(MOCK_DATA);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", rate: "", country: "", state: "", taxStructures: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openAdd = () => { setEditing(null); setForm({ name: "", rate: "", country: "", state: "", taxStructures: "" }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editing) {
      setData((prev) => prev.map((item) => item.id === editing.id ? { ...item, name: form.name, taxRate: `${form.rate}%`, taxStructureName: form.taxStructures } : item));
    } else {
      setData((prev) => [...prev, { id: Date.now(), name: form.name, categoryName: "—", taxRate: `${form.rate}%`, taxStructureName: form.taxStructures }]);
    }
    closeModal();
  };

  const rowActions = (row) => [
    { label: "Edit", onClick: () => { setEditing(row); setForm({ name: row.name, rate: row.taxRate?.replace("%", "") || "", country: "", state: "", taxStructures: row.taxStructureName || "" }); setModalOpen(true); } },
    { label: "Delete", onClick: () => setDeleteTarget(row), danger: true },
  ];

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
      <PageHeader
        title="Tax Rules"
        subtitle="Define tax rules by region and category"
        breadcrumbs={[{ label: "Tax & Compliance" }, { label: "Tax Rules" }]}
        actions={
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-gold)] text-white text-sm rounded-lg hover:bg-[var(--admin-gold-dark)] transition-colors">
            <MdAdd size={16} /> Add Rule
          </button>
        }
      />

      <DataTable
        columns={COLUMNS}
        data={data}
        loading={false}
        totalCount={data.length}
        rowActions={rowActions}
        emptyText="No tax rules found."
        emptyIcon={<MdRule size={40} className="text-gray-200" />}
      />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-[var(--admin-navy)] mb-5">{editing ? "Edit Tax Rule" : "Add Tax Rule"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate (%)</label>
                <input type="text" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Structure</label>
                <input type="text" value={form.taxStructures} onChange={(e) => setForm((f) => ({ ...f, taxStructures: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]" />
              </div>
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
        title="Delete Tax Rule"
        message={`Delete rule "${deleteTarget?.name}"?`}
        variant="danger"
        confirmText="Delete"
      />
    </div>
  );
}

export default TaxRules;
