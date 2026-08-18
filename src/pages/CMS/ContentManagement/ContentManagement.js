/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { MdAdd, MdDelete, MdEdit, MdVisibility } from "react-icons/md";

import { CONTENT_TYPE_MAP, CONTENT_TYPES } from "./contentTypes";
import ContentPageSetup from "../ContentPages/components/ContentPageSetup";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import { ConfirmModal } from "../../../components/Shared";
import {
  getContentPages,
  createContentPage,
  updateContentPage,
  deleteContentPage,
} from "../../../Redux/adminCoreSlice";

const PAGE_SIZE = 15;
const FALLBACK_TYPE = {
  key: "all",
  label: "All Content",
  pageType: null,
  singleton: false,
  customerSlug: null,
  defaultTitle: "",
  description: "View and manage content.",
  customerRoute: null,
  bodyHint: "Write the page body here.",
};

const StatusBadge = ({ published }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
  >
    {published ? "Published" : "Draft"}
  </span>
);

const EmptyState = ({ type, onAdd }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="p-4 mb-4 bg-indigo-50 rounded-full">
      <svg
        className="w-10 h-10 text-indigo-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </div>
    <h3 className="mb-1 text-base font-semibold text-gray-700">{type.label}</h3>
    <p className="mb-6 text-sm text-gray-400 max-w-sm">{type.description}</p>
    <button
      onClick={onAdd}
      className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
    >
      Create {type.label}
    </button>
  </div>
);

const SingletonCard = ({
  page,
  type,
  onEdit,
  onDelete,
  onTogglePublish,
  onView,
}) => (
  <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-base font-semibold text-gray-800">
          {page?.title || "Untitled"}
        </h3>
        <p className="mt-1 text-xs text-gray-400">/{page?.slug || "-"}</p>
      </div>
      <StatusBadge published={Boolean(page?.published)} />
    </div>
    {type.customerRoute && (
      <p className="mb-4 text-xs text-gray-400">
        Customer URL:{" "}
        <span className="font-mono text-indigo-600">{type.customerRoute}</span>
      </p>
    )}
    {page?.body && (
      <div
        className="p-3 mb-4 text-xs text-gray-500 bg-gray-50 border rounded-lg line-clamp-3"
        dangerouslySetInnerHTML={{ __html: page.body }}
      />
    )}
    <div className="flex items-center gap-3">
      <button
        onClick={() => onView(page)}
        className="inline-flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <MdVisibility size={16} className="text-blue-600" /> View
      </button>
      <button
        onClick={() => onEdit(page)}
        className="inline-flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
      >
        <MdEdit size={16} className="text-blue-600" /> Edit
      </button>
      <button
        onClick={() => onDelete(page)}
        className="inline-flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
      >
        <MdDelete size={16} className="text-red-600" /> Delete
      </button>
      <div className="ml-auto">
        <ToggleButton
          isToggle={Boolean(page?.published)}
          handleClick={() => onTogglePublish(page)}
        />
      </div>
    </div>
  </div>
);

const ContentManagement = () => {
  const { type: typeKey } = useParams();
  const dispatch = useDispatch();

  const activeType =
    CONTENT_TYPE_MAP[typeKey] || CONTENT_TYPE_MAP["all"] || FALLBACK_TYPE;
  const isSingleton = Boolean(activeType?.singleton);
  const lockedFields = isSingleton
    ? ["slug", "pageType"]
    : activeType?.pageType
      ? ["pageType"]
      : [];

  const [pages, setPages] = useState([]);
  const [total, setTotal] = useState(0);
  const [pageNo, setPageNo] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ search: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [viewingPage, setViewingPage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const normalizedPages = useMemo(
    () =>
      (pages || [])
        .filter((item) => item && typeof item === "object")
        .map((item, index) => ({
          ...item,
          _rowKey: item?._id || item?.id || item?.slug || `row-${index}`,
          title: item?.title || "",
          slug: item?.slug || item?.id || item?._id || "",
          pageType: item?.pageType || item?.category_id || "",
        })),
    [pages],
  );

  const fetchPages = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = { page: pageNo, limit: PAGE_SIZE };
      if (activeType.pageType) query.pageType = activeType.pageType;
      if (search) query.q = search;

      const res = await dispatch(getContentPages(query)).unwrap();
      const data = res?.data;
      const items = Array.isArray(data)
        ? data
        : data?.list || data?.items || [];
      setPages(items);
      setTotal(res?.meta?.total || data?.total || items.length);
    } catch (err) {
      toast.error(err?.message || "Failed to load content pages");
      setPages([]);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, pageNo, search, activeType]);

  useEffect(() => {
    setPageNo(1);
    setSearch("");
    setFilters({ search: "" });
  }, [typeKey]);

  const handleSearch = useCallback((value) => {
    setSearch(value?.trim() || "");
    setPageNo(1);
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const openAdd = () => {
    setEditingPage(null);
    setSetupOpen(true);
  };

  const openEdit = (page) => {
    if (!page || typeof page !== "object") return;
    setEditingPage(page);
    setSetupOpen(true);
  };

  const handleSetupSubmit = async (form) => {
    if (!form || typeof form !== "object") {
      toast.error("Invalid form data");
      return;
    }
    setIsLoading(true);
    try {
      if (editingPage) {
        await dispatch(
          updateContentPage({ id: editingPage.slug, ...form }),
        ).unwrap();
        toast.success("Page updated");
      } else {
        await dispatch(createContentPage(form)).unwrap();
        toast.success("Page created");
      }
      setSetupOpen(false);
      fetchPages();
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsLoading(true);
    try {
      await dispatch(deleteContentPage({ slug: deleteTarget.slug })).unwrap();
      toast.success("Page deleted");
      setDeleteTarget(null);
      fetchPages();
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePublish = async (page) => {
    try {
      await dispatch(
        updateContentPage({ id: page.slug, published: !page.published }),
      ).unwrap();
      toast.success(`Page ${page.published ? "unpublished" : "published"}`);
      fetchPages();
    } catch (err) {
      toast.error(err?.message || "Status update failed");
    }
  };

  const singlePage = isSingleton ? pages[0] || null : null;

  const tabGroups = [
    { title: "All", items: CONTENT_TYPES.filter((t) => !t.singleton) },
    { title: "Policy Pages", items: CONTENT_TYPES.filter((t) => t.singleton) },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Content Management
          </h1>
          <p className="text-sm text-gray-400">{activeType.label}</p>
        </div>
        {!isSingleton && (
          <button
            onClick={openAdd}
            className="admin-btn-primary inline-flex items-center gap-1"
          >
            <MdAdd size={16} /> Add Content
          </button>
        )}
      </div>

      {/* Type tabs */}
      <div className="flex flex-wrap gap-2 pb-1 border-b">
        {tabGroups
          .flatMap((g) => g.items)
          .map((t) => (
            <Link
              key={t.key}
              to={`/app/content-management${t.key === "all" ? "" : `/${t.key}`}`}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${activeType.key === t.key ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {t.label}
            </Link>
          ))}
      </div>

      {/* Singleton view */}
      {isSingleton && (
        <div className="max-w-2xl ">
          {singlePage ? (
            <SingletonCard
              page={singlePage}
              type={activeType}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onTogglePublish={handleTogglePublish}
              onView={setViewingPage}
            />
          ) : (
            <EmptyState type={activeType} onAdd={openAdd} />
          )}
        </div>
      )}

      {/* List view */}
      {!isSingleton && (
        <>
          <div className="flex gap-2">
            <input
              className="flex-1 min-h-[38px] rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
              placeholder="Search by title, slug, or content"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              onKeyDown={(e) =>
                e.key === "Enter" && handleSearch(filters.search)
              }
            />
            <button
              type="button"
              onClick={() => handleSearch(filters.search)}
              className="admin-btn-primary"
            >
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setFilters({ search: "" });
                  handleSearch("");
                }}
                className="admin-btn-secondary"
              >
                Clear
              </button>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {normalizedPages.length === 0 && !isLoading ? (
              <EmptyState type={activeType} onAdd={openAdd} />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {[
                      "Title",
                      "Slug",
                      "Type",
                      "Language",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {normalizedPages.map((page) => (
                    <tr key={page._rowKey} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px] truncate">
                        {page.title}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-500 text-xs max-w-[150px] truncate">
                        {page.slug}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {page.pageType}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {page.language || "en"}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleTogglePublish(page)}>
                          <StatusBadge published={page.published} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(page)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50"
                          >
                            <MdEdit size={14} className="text-blue-600" /> Edit
                          </button>
                          <button
                            onClick={() => setViewingPage(page)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            <MdVisibility size={14} className="text-blue-600" /> View
                          </button>
                          <button
                            onClick={() => setDeleteTarget(page)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-red-500 border border-red-200 rounded hover:bg-red-50"
                          >
                            <MdDelete size={14} className="text-red-600" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-2 py-4">
              <button
                type="button"
                disabled={pageNo <= 1}
                onClick={() => setPageNo((p) => p - 1)}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {pageNo} of {Math.ceil(total / PAGE_SIZE)}
              </span>
              <button
                type="button"
                disabled={pageNo >= Math.ceil(total / PAGE_SIZE)}
                onClick={() => setPageNo((p) => p + 1)}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Setup modal */}
      <ContentPageSetup
        isOpen={setupOpen}
        onClose={() => setSetupOpen(false)}
        onSubmit={handleSetupSubmit}
        initialData={
          editingPage ||
          (isSingleton
            ? {
                slug: activeType.customerSlug,
                title: activeType.defaultTitle,
                pageType: activeType.pageType,
              }
            : null)
        }
        pageType={activeType.pageType || ""}
        lockedFields={lockedFields}
        bodyHint={activeType.bodyHint}
        isLoading={isLoading}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        variant="danger"
        title="Delete Content Page?"
        message={`Delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />
      {viewingPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative w-full max-w-3xl max-h-[88vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {viewingPage?.title || "Untitled"}
                </h3>
                <p className="mt-1 text-xs text-gray-400">
                  /{viewingPage?.slug || "-"} • {viewingPage?.pageType || "-"}
                </p>
              </div>
              <button
                onClick={() => setViewingPage(null)}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="p-6 space-y-3">
              {viewingPage?.description ? (
                <p className="text-sm text-gray-600">
                  {viewingPage.description}
                </p>
              ) : null}
              <div className="p-4 text-sm text-gray-700 bg-gray-50 border rounded-lg">
                {viewingPage?.body ? (
                  <div dangerouslySetInnerHTML={{ __html: viewingPage.body }} />
                ) : (
                  <p className="text-gray-400">No body content.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentManagement;
