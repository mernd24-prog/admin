import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { MdOutlineClose, MdStar, MdStarBorder } from "react-icons/md";
import { updateProductReview } from "../../../../Redux/adminCoreSlice";

const STATUSES = [
  { value: "published", label: "Published" },
  { value: "pending",   label: "Pending" },
  { value: "hidden",    label: "Hidden" },
  { value: "rejected",  label: "Rejected" },
];

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-2xl transition-colors"
        >
          {star <= (hovered || value)
            ? <MdStar className="text-yellow-400" />
            : <MdStarBorder className="text-gray-300" />}
        </button>
      ))}
    </div>
  );
}

const EditProductReview = ({ isOpen, onClose, reviewData }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    rating: 0,
    title: "",
    reviewText: "",
    status: "pending",
    adminReplyText: "",
  });
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (reviewData) {
      setForm({
        rating:         reviewData.rating || 0,
        title:          reviewData.title || "",
        reviewText:     reviewData.reviewText || reviewData.comment || "",
        status:         reviewData.status || "pending",
        adminReplyText: reviewData.adminReply?.text || "",
      });
    }
  }, [reviewData]);

  const handleSave = async () => {
    const reviewId = reviewData?._id || reviewData?.id;
    if (!reviewId) return;
    setSaving(true);
    try {
      const payload = {
        reviewId,
        rating:     form.rating,
        title:      form.title,
        reviewText: form.reviewText,
        status:     form.status,
      };
      if (form.adminReplyText.trim()) {
        payload.adminReply = { text: form.adminReplyText.trim() };
      }
      await dispatch(updateProductReview(payload)).unwrap();
      toast.success("Review updated successfully");
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to update review");
    } finally {
      setSaving(false);
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const reviewDate = reviewData?.createdAt
    ? new Date(reviewData.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "—";

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black bg-opacity-40 backdrop-blur-sm transition-all duration-300 ${
          isOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 z-50 w-full max-w-xl h-full bg-white shadow-xl transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Edit Product Review</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
            <MdOutlineClose size={22} />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto h-[calc(100vh-120px)]">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
            <div>
              <span className="font-medium text-gray-500">Product ID</span>
              <p className="font-mono text-xs truncate">{reviewData?.productId || "—"}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500">Order ID</span>
              <p className="font-mono text-xs truncate">{reviewData?.orderId || "—"}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500">Buyer ID</span>
              <p className="font-mono text-xs truncate">{reviewData?.buyerId || "—"}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500">Date</span>
              <p className="text-xs">{reviewDate}</p>
            </div>
            {reviewData?.helpfulVotes > 0 && (
              <div>
                <span className="font-medium text-gray-500">Helpful Votes</span>
                <p className="text-xs">{reviewData.helpfulVotes}</p>
              </div>
            )}
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
            <StarRating
              value={form.rating}
              onChange={(r) => setForm((f) => ({ ...f, rating: r }))}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={set("status")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-navy)]"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={set("title")}
              maxLength={200}
              placeholder="Review title"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-navy)]"
            />
          </div>

          {/* Review Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Review</label>
            <textarea
              rows={4}
              value={form.reviewText}
              onChange={set("reviewText")}
              maxLength={2000}
              placeholder="Customer review text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-navy)]"
            />
            <p className="text-xs text-gray-400 text-right">{form.reviewText.length}/2000</p>
          </div>

           

          {/* Media */}
          {reviewData?.media?.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>
              <div className="flex flex-wrap gap-2">
                {reviewData.media.map((src, idx) => (
                  <img
                    key={idx}
                    src={src}
                    alt={`review-${idx}`}
                    onClick={() => setSelectedImage(src)}
                    className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 px-5 py-4 border-t bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white bg-[var(--admin-navy)] rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Image lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[60] bg-black bg-opacity-80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Review media"
            className="max-w-full max-h-[90vh] rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
};

export default EditProductReview;
