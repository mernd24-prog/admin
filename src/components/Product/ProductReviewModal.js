import React, { useState, useEffect } from 'react';
import DefaultMiddleModal from '../Atoms/Modal/DefaultMiddleModal ';
import useDropdownOptions from '../../hooks/useDropdownOptions';

const CHECKLIST_ITEMS = [
  { key: 'titleVerified',      label: 'Title & Description verified' },
  { key: 'categoryVerified',   label: 'Category correctly assigned' },
  { key: 'complianceVerified', label: 'Compliance & legal checks passed' },
  { key: 'mediaVerified',      label: 'Images & media verified' },
];

const DEFAULT_CHECKLIST = {
  titleVerified: false,
  categoryVerified: false,
  complianceVerified: false,
  mediaVerified: false,
};

/**
 * Modal for approving or rejecting a product with optional checklist + rejection reason.
 *
 * Props:
 *  isOpen         - boolean
 *  onClose        - () => void
 *  onSubmit       - (decision: 'active'|'rejected'|'inactive', rejectionReason?: string, checklist: object) => Promise<void>
 *  product        - { title, status, moderation: { rejectionReason, checklist } }
 *  revision       - optional pending revision with draftChanges + changedFields
 */
const formatReviewValue = (value) => {
  if (value === undefined || value === null || value === '') return 'N/A';
  if (Array.isArray(value)) return value.length ? JSON.stringify(value, null, 2) : '[]';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

const ProductReviewModal = ({ isOpen, onClose, onSubmit, product, revision = null }) => {
  const productStatuses = useDropdownOptions('product-statuses');
  const [decision, setDecision] = useState('active');
  const [rejectionReason, setRejectionReason] = useState('');
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDecision('active');
      setRejectionReason('');
      setChecklist({
        ...DEFAULT_CHECKLIST,
        ...(revision?.checklist || product?.moderation?.checklist || {}),
      });
      setError('');
    }
  }, [isOpen, product, revision]);

  const needsReason = decision === 'rejected';

  const allChecked = Object.values(checklist).every(Boolean);
  const isRevisionReview = Boolean(revision);
  const draftChanges = revision?.draftChanges || {};
  const changedFields = revision?.changedFields?.length
    ? revision.changedFields
    : Object.keys(draftChanges);

  const handleChecklistToggle = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCheckAll = () => {
    const next = !allChecked;
    setChecklist({
      titleVerified: next,
      categoryVerified: next,
      complianceVerified: next,
      mediaVerified: next,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (needsReason && !rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onSubmit(decision, needsReason ? rejectionReason.trim() : null, checklist);
      onClose();
    } catch (err) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DefaultMiddleModal
      isOpen={isOpen}
      onClose={onClose}
      title={isRevisionReview ? "Product Revision Review" : "Product Review Decision"}
      isButtonView={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {product?.title && (
          <p className="text-sm text-gray-600">
            Product: <span className="font-medium text-gray-800">{product.title}</span>
          </p>
        )}

        {isRevisionReview && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-blue-900">
              <span>Base version: {revision.baseVersion || 'N/A'}</span>
              <span>Submitted by: {revision.submittedByRole || revision.submittedBy || 'N/A'}</span>
              <span>
                Submitted at: {revision.submittedAt ? new Date(revision.submittedAt).toLocaleString() : 'N/A'}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {changedFields.length ? (
                changedFields.map((field) => (
                  <div key={field} className="rounded border border-blue-100 bg-white p-2">
                    <p className="text-xs font-semibold uppercase text-blue-800">{field}</p>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <div>
                        <p className="text-[11px] uppercase text-gray-400">Current</p>
                        <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs text-gray-700">
                          {formatReviewValue(product?.[field])}
                        </pre>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase text-gray-400">Proposed</p>
                        <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap rounded bg-green-50 p-2 text-xs text-green-800">
                          {formatReviewValue(draftChanges[field])}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-blue-800">No changed fields were returned for this revision.</p>
              )}
            </div>
          </div>
        )}

        {product?.moderation?.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-xs font-semibold text-red-700 mb-1">Previous Rejection Reason</p>
            <p className="text-sm text-red-600">{product.moderation.rejectionReason}</p>
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Decision</label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
            value={decision}
            onChange={(e) => { setDecision(e.target.value); setError(''); }}
          >
            {productStatuses.options
              .filter((option) => (
                isRevisionReview
                  ? ['active', 'rejected'].includes(option.value)
                  : ['active', 'inactive', 'rejected'].includes(option.value)
              ))
              .map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Moderation Checklist</p>
            <button
              type="button"
              onClick={handleCheckAll}
              className="text-xs text-[var(--admin-blue)] hover:underline"
            >
              {allChecked ? 'Uncheck all' : 'Check all'}
            </button>
          </div>
          {CHECKLIST_ITEMS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!checklist[key]}
                onChange={() => handleChecklistToggle(key)}
                className="w-4 h-4 text-[var(--admin-blue)] border-gray-300 rounded focus:ring-[var(--admin-blue)]"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>

        {needsReason && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)] resize-none"
              rows={3}
              placeholder="Provide a clear reason for rejection..."
              value={rejectionReason}
              onChange={(e) => { setRejectionReason(e.target.value); setError(''); }}
            />
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-4 py-2 text-sm rounded-md text-white disabled:opacity-60 ${
              needsReason
                ? 'bg-red-600 hover:bg-red-700'
                : decision === 'active'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-orange-500 hover:bg-orange-600'
            }`}
            disabled={loading}
          >
            {loading ? 'Submitting…' : decision === 'active' ? 'Approve' : decision === 'rejected' ? 'Reject' : 'Deactivate'}
          </button>
        </div>
      </form>
    </DefaultMiddleModal>
  );
};

export default ProductReviewModal;
