/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdArticle } from "react-icons/md";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import { ConfirmModal, DataTable, PageHeader } from "../../../components/Shared";
import ContentPageSetup from "./components/ContentPageSetup";
import {
  createContentPage,
  deleteContentPage,
  getContentPages,
  updateContentPage,
} from "../../../Redux/adminCoreSlice";

const PAGE_SIZE = 10;

const emptyForm = {
  slug: "",
  title: "",
  pageType: "static_page",
  status: "draft",
  description: "",
  body: "",
  excerpt: "",
  category: "",
  tags: [],
  image: { url: "", alt: "", title: "", caption: "", type: "hero" },
  gallery: [],
  sections: [],
  cta: { label: "", url: "", target: "_self" },
  seo: {
    metaTitle: "", metaDescription: "", keywords: [], focusKeyword: "",
    canonicalUrl: "", robots: "index,follow", ogTitle: "", ogDescription: "",
    ogImage: { url: "", alt: "" }, twitterTitle: "", twitterDescription: "",
    twitterImage: { url: "", alt: "" }, schemaType: "WebPage", schemaJson: {},
    breadcrumbs: [],
  },
  visibility: { channels: ["web", "app"], roles: ["public"] },
  sortOrder: 0,
  coverImage: "",
  thumbnailUrl: "",
  heroImage: "",
  galleryImages: [],
  author: { name: "", avatar: "" },
  readTime: 0,
  language: "en",
  published: false,
  publishedAt: "",
  metadata: {},
};

const slugify = (value = "") =>
  String(value || "content-page")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "content-page";

const pageSlug = (page = {}) => page?.slug || page?.id || page?._id || "";

const ContentPages = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.adminCore);
  const [pageNo, setPageNo] = useState(1);
  const [search, setSearch] = useState("");
  const [isRefresh, setIsRefresh] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusLoadingSlug, setStatusLoadingSlug] = useState("");

  const payload = selector?.contentPagesData?.data?.data || {};
  const pages = payload?.list || [];
  const total = payload?.total || 0;

  const fetchPages = useCallback(() => {
    dispatch(getContentPages({ page: pageNo, limit: PAGE_SIZE, q: search }));
  }, [dispatch, pageNo, search]);

  useEffect(() => { fetchPages(); }, [fetchPages, isRefresh]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "title" && !prev.recordSlug && !prev.slug ? { slug: slugify(value) } : {}),
    }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.title.trim()) nextErrors.title = "Title is required";
    if (!formData.slug.trim()) nextErrors.slug = "Slug is required";
    if (!formData.pageType.trim()) nextErrors.pageType = "Page type is required";
    const hasSectionContent = (formData.sections || []).some(
      (section) =>
        String(section?.title || "").trim() ||
        String(section?.description || "").trim() ||
        (section?.points || []).some(
          (point) => String(point?.title || "").trim() || String(point?.description || "").trim(),
        ),
    );
    if (!formData.description.trim() && !formData.body.trim() && !hasSectionContent) {
      nextErrors.description = "Description, body, or at least one section is required";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const closeModal = (force = false) => {
    if (submitting && !force) return;
    setIsModalOpen(false);
    setFormData(emptyForm);
    setErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    const body = {
      ...formData,
      published: formData.status === "published" || Boolean(formData.published),
      heroImage: formData.heroImage || formData.image?.url || "",
      coverImage: formData.coverImage || formData.image?.url || "",
      thumbnailUrl: formData.thumbnailUrl || formData.image?.url || "",
      galleryImages: Array.isArray(formData.gallery)
        ? formData.gallery.map((item) => item?.url).filter(Boolean)
        : formData.galleryImages || [],
    };

    try {
      setSubmitting(true);
      if (formData.recordSlug) {
        await dispatch(updateContentPage({ ...body, slug: formData.recordSlug })).unwrap();
        toast.success("Content page updated successfully");
      } else {
        await dispatch(createContentPage(body)).unwrap();
        toast.success("Content page created successfully");
      }
      closeModal(true);
      setIsRefresh((v) => !v);
    } catch (error) {
      toast.error(error?.message || "Failed to save content page");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (page) => {
    if (submitting || deleting || statusLoadingSlug) return;
    setFormData({
      ...emptyForm,
      ...page,
      recordSlug: pageSlug(page),
      slug: page.slug || pageSlug(page),
      title: page.title || "",
      pageType: page.pageType || "content",
      status: page.status || (page.published ? "published" : "draft"),
      description: page.description || page.excerpt || "",
      excerpt: page.excerpt || page.description || "",
      category: page.category || "",
      tags: page.tags || [],
      image: page.image || { url: page.heroImage || page.coverImage || "", alt: page.title || "", title: "", caption: "", type: "hero" },
      gallery: page.gallery || (page.galleryImages || []).map((url) => ({ url, alt: page.title || "" })),
      sections: page.sections || [],
      cta: page.cta || emptyForm.cta,
      seo: { ...emptyForm.seo, ...(page.seo || {}) },
      visibility: { ...emptyForm.visibility, ...(page.visibility || {}) },
      sortOrder: page.sortOrder || 0,
      coverImage: page.coverImage || page.image?.url || "",
      thumbnailUrl: page.thumbnailUrl || page.image?.url || "",
      heroImage: page.heroImage || page.image?.url || "",
      galleryImages: page.galleryImages || [],
      author: page.author || emptyForm.author,
      readTime: page.readTime || 0,
      language: page.language || "en",
      body: page.body || "",
      published: Boolean(page.published),
    });
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    const slug = pageSlug(deleteTarget);
    if (!slug || deleting) return;
    try {
      setDeleting(true);
      await dispatch(deleteContentPage({ slug })).unwrap();
      toast.success("Content page deleted successfully");
      setDeleteTarget(null);
      setIsRefresh((v) => !v);
    } catch (error) {
      toast.error(error?.message || "Failed to delete content page");
    } finally {
      setDeleting(false);
    }
  };

  const togglePublished = async (page) => {
    const slug = pageSlug(page);
    if (!slug || statusLoadingSlug) return;
    try {
      setStatusLoadingSlug(slug);
      await dispatch(
        updateContentPage({ slug, published: !page.published, status: !page.published ? "published" : "draft" }),
      ).unwrap();
      toast.success("Status updated successfully");
      setIsRefresh((v) => !v);
    } catch (error) {
      toast.error(error?.message || "Failed to update status");
    } finally {
      setStatusLoadingSlug("");
    }
  };

  const columns = [
    { key: "title", label: "Title", render: (v) => <span className="font-medium text-gray-800">{v}</span> },
    { key: "slug", label: "Slug", render: (v) => <span className="font-mono text-xs text-gray-500">{v}</span> },
    { key: "pageType", label: "Type", render: (v) => <span className="capitalize text-sm">{v}</span> },
    { key: "language", label: "Language", render: (v) => <span className="text-sm">{v || "en"}</span> },
    {
      key: "published",
      label: "Published",
      render: (v, row) => (
        <ToggleButton
          isToggle={Boolean(v)}
          handleClick={() => togglePublished(row)}
          loading={statusLoadingSlug === pageSlug(row)}
          disabled={Boolean(statusLoadingSlug) || submitting || deleting}
        />
      ),
    },
  ];

  const rowActions = (row) => [
    { label: "Edit", onClick: () => openEdit(row), disabled: submitting || deleting || Boolean(statusLoadingSlug) },
    { label: "Delete", onClick: () => setDeleteTarget(row), danger: true, disabled: submitting || deleting || Boolean(statusLoadingSlug) },
  ];

  return (
    <div>
      <PageHeader
        title="Content Pages"
        subtitle="Manage static pages, blog posts, and CMS content"
        breadcrumbs={[{ label: "CMS" }, { label: "Content Pages" }]}
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={submitting || deleting || Boolean(statusLoadingSlug)}
             
          >
            + Add Page
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={pages}
        loading={selector.loading}
        totalCount={total}
        page={pageNo}
        pageSize={PAGE_SIZE}
        onPageChange={setPageNo}
        onSearch={(v) => { setSearch(v?.trim() || ""); setPageNo(1); }}
        rowActions={rowActions}
        searchPlaceholder="Search content pages..."
        emptyText="No content pages found."
        emptyIcon={<MdArticle size={40} className="text-gray-200" />}
        requiredModule="cms"
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        variant="danger"
        title="Delete Content Page?"
        message={`Delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />

      <ContentPageSetup
        errors={errors}
        formData={formData}
        isOpen={isModalOpen}
        onChange={onChange}
        onClose={closeModal}
        onSubmit={handleSubmit}
        loading={submitting}
      />
    </div>
  );
};

export default ContentPages;
