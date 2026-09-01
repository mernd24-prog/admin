import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdAdd, MdDelete, MdEdit, MdRefresh } from "react-icons/md";
import { ConfirmModal, DataTable, PageHeader, StatusBadge } from "../../../components/Shared";
import { createCollection, deleteCollection, listCollections, updateCollection } from "../../../Redux/collectionSlice";

const emptyForm = { name: "", slug: "", type: "custom", description: "", bannerImage: "", thumbnailImage: "", categoriesText: "", tagsText: "", sortOrder: 0, featured: false, active: true, startsAt: "", endsAt: "" };
const dateValue = (value) => value ? String(value).slice(0, 10) : "";

export default function Collections() {
  const dispatch = useDispatch();
  const { loading, listData } = useSelector((state) => state.collection);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const payload = listData?.data?.data ?? listData?.data ?? [];
  const rows = Array.isArray(payload) ? payload : payload?.items || payload?.list || [];

  const load = useCallback(() => dispatch(listCollections({ page: 1, limit: 200 })), [dispatch]);
  useEffect(() => { load(); }, [load]);

  const beginCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const beginEdit = (row) => {
    setEditing(row);
    setForm({ ...emptyForm, ...row, categoriesText: (row.categories || []).join(", "), tagsText: (row.tags || []).join(", "), startsAt: dateValue(row.startsAt), endsAt: dateValue(row.endsAt), active: row.active ?? row.isActive ?? true });
    setOpen(true);
  };
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return toast.error("Collection name is required");
    setSaving(true);
    try {
      const { categoriesText, tagsText, ...values } = form;
      const split = (text) => String(text || "").split(",").map((item) => item.trim()).filter(Boolean);
      const body = { ...values, categories: split(categoriesText), tags: split(tagsText), sortOrder: Number(form.sortOrder || 0), startsAt: form.startsAt || null, endsAt: form.endsAt || null };
      if (editing) await dispatch(updateCollection({ collectionId: editing._id || editing.slug, ...body })).unwrap();
      else await dispatch(createCollection(body)).unwrap();
      toast.success(editing ? "Collection updated" : "Collection created");
      setOpen(false);
      load();
    } catch (error) {
      toast.error(error?.message || "Unable to save collection");
    } finally { setSaving(false); }
  };
  const remove = async () => {
    try {
      await dispatch(deleteCollection({ collectionId: deleteTarget._id || deleteTarget.slug })).unwrap();
      toast.success("Collection deleted");
      setDeleteTarget(null);
      load();
    } catch (error) { toast.error(error?.message || "Collection is still assigned to products"); }
  };

  const columns = useMemo(() => [
    { key: "name", label: "Collection", render: (_, row) => <div className="flex items-center gap-3">{row.thumbnailImage ? <img src={row.thumbnailImage} alt="" className="h-10 w-14 rounded object-cover" /> : null}<div><strong>{row.name}</strong><div className="text-xs text-gray-500">{row.slug}</div></div></div> },
    { key: "type", label: "Type" },
    { key: "featured", label: "Featured", render: (value) => <StatusBadge status={value ? "active" : "inactive"} label={value ? "Featured" : "Standard"} /> },
    { key: "active", label: "Status", render: (_, row) => <StatusBadge status={(row.active ?? row.isActive) !== false ? "active" : "inactive"} dot /> },
    { key: "sortOrder", label: "Order" },
    { key: "actions", label: "Actions", render: (_, row) => <div className="flex gap-2"><button type="button" onClick={() => beginEdit(row)} className="rounded border p-2" title="Edit"><MdEdit /></button><button type="button" onClick={() => setDeleteTarget(row)} className="rounded border border-red-200 p-2 text-red-600" title="Delete"><MdDelete /></button></div> },
  ], []);

  return <div className="space-y-5">
    <PageHeader title="Collections" subtitle="Create curated product groups for customer discovery and homepage merchandising" breadcrumbs={[{ label: "Catalog Management" }, { label: "Collections" }]} actions={<div className="flex gap-2"><button type="button" onClick={load} className="admin-button-secondary"><MdRefresh /> Refresh</button><button type="button" onClick={beginCreate} className="admin-button-primary"><MdAdd /> New Collection</button></div>} />
    <DataTable data={rows} columns={columns} loading={loading} emptyMessage="No collections found" />
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}><form onSubmit={save} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl bg-white p-6 shadow-xl"><h2 className="text-lg font-semibold">{editing ? "Edit Collection" : "New Collection"}</h2><div className="grid gap-4 sm:grid-cols-2">
      <label className="admin-label">Name<input className="admin-input mt-1" value={form.name} onChange={set("name")} required /></label>
      <label className="admin-label">Slug<input className="admin-input mt-1" value={form.slug} onChange={set("slug")} placeholder="generated-from-name" /></label>
      <label className="admin-label">Type<input className="admin-input mt-1" value={form.type} onChange={set("type")} placeholder="seasonal, sale, custom" /></label>
      <label className="admin-label">Sort order<input type="number" min="0" className="admin-input mt-1" value={form.sortOrder} onChange={set("sortOrder")} /></label>
      <label className="admin-label sm:col-span-2">Description<textarea className="admin-input mt-1 min-h-20" value={form.description} onChange={set("description")} /></label>
      <label className="admin-label">Thumbnail URL<input className="admin-input mt-1" value={form.thumbnailImage} onChange={set("thumbnailImage")} /></label>
      <label className="admin-label">Banner URL<input className="admin-input mt-1" value={form.bannerImage} onChange={set("bannerImage")} /></label>
      <label className="admin-label">Category keys<input className="admin-input mt-1" value={form.categoriesText} onChange={set("categoriesText")} placeholder="electronics, fashion" /></label>
      <label className="admin-label">Tags<input className="admin-input mt-1" value={form.tagsText} onChange={set("tagsText")} placeholder="Summer, Trending" /></label>
      <label className="admin-label">Starts at<input type="date" className="admin-input mt-1" value={form.startsAt} onChange={set("startsAt")} /></label>
      <label className="admin-label">Ends at<input type="date" className="admin-input mt-1" value={form.endsAt} onChange={set("endsAt")} /></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={set("featured")} /> Featured on customer home</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={set("active")} /> Active</label>
    </div><div className="flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="admin-button-secondary">Cancel</button><button disabled={saving} className="admin-button-primary">{saving ? "Saving…" : "Save Collection"}</button></div></form></div>}
    <ConfirmModal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={remove} title="Delete Collection" message={`Delete “${deleteTarget?.name || "this collection"}”? Assigned collections cannot be deleted.`} />
  </div>;
}
