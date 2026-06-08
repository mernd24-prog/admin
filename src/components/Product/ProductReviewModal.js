import React, { useState, useEffect } from 'react';
import DefaultMiddleModal from '../Atoms/Modal/DefaultMiddleModal ';
import ProductStatusBadge from './ProductStatusBadge';

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

const DECISIONS = {
  full: [
    {
      value: 'active',
      label: 'Approve',
      description: 'Product goes live immediately',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
      cardClass: 'border-green-400 bg-green-50',
      labelClass: 'text-green-700',
      radioClass: 'accent-green-600',
    },
    {
      value: 'inactive',
      label: 'Deactivate',
      description: 'Approved but hidden from storefront',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M9 12h6" />
        </svg>
      ),
      cardClass: 'border-orange-400 bg-orange-50',
      labelClass: 'text-orange-700',
      radioClass: 'accent-orange-500',
    },
    {
      value: 'rejected',
      label: 'Reject',
      description: 'Needs changes before re-submission',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      cardClass: 'border-red-400 bg-red-50',
      labelClass: 'text-red-700',
      radioClass: 'accent-red-600',
    },
  ],
  revision: [
    {
      value: 'active',
      label: 'Approve Revision',
      description: 'Apply proposed changes to the live product',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
      cardClass: 'border-green-400 bg-green-50',
      labelClass: 'text-green-700',
      radioClass: 'accent-green-600',
    },
    {
      value: 'rejected',
      label: 'Reject Revision',
      description: 'Discard changes, product stays as-is',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      cardClass: 'border-red-400 bg-red-50',
      labelClass: 'text-red-700',
      radioClass: 'accent-red-600',
    },
  ],
};

const formatReviewValue = (value) => {
  if (value === undefined || value === null || value === '') return 'N/A';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '(empty)';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

/**
 * Modal for approving or rejecting a product / revision.
 *
 * Props:
 *  isOpen         - boolean
 *  onClose        - () => void
 *  onSubmit       - (decision: 'active'|'rejected'|'inactive', rejectionReason?: string, checklist: object, notes?: string) => Promise<void>
 *  product        - { title, status, revisionStatus, moderation: { rejectionReason, checklist } }
 *  revision       - optional pending revision with draftChanges + changedFields
 */
const ProductReviewModal = ({ isOpen, onClose, onSubmit, product, revision = null }) => {
  const isRevisionReview = Boolean(revision);
  const decisions = isRevisionReview ? DECISIONS.revision : DECISIONS.full;

  const [decision, setDecision] = useState('active');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDecision('active');
      setRejectionReason('');
      setNotes('');
      setChecklist({
        ...DEFAULT_CHECKLIST,
        ...(revision?.checklist || product?.moderation?.checklist || {}),
      });
      setError('');
      setSubmitted(false);
    }
  }, [isOpen, product, revision]);

  const isRejecting = decision === 'rejected';
  const allChecked = Object.values(checklist).every(Boolean);
  const checkedCount = Object.values(checklist).filter(Boolean).length;

  const draftChanges = revision?.draftChanges || {};
  const changedFields = revision?.changedFields?.length
    ? revision.changedFields
    : Object.keys(draftChanges);

  const handleChecklistToggle = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
    if (error) setError('');
  };

  const handleCheckAll = () => {
    const next = !allChecked;
    setChecklist(Object.fromEntries(CHECKLIST_ITEMS.map(({ key }) => [key, next])));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    if (isRejecting && !rejectionReason.trim()) {
      setError('A rejection reason is required.');
      return;
    }
    if (!isRejecting && !allChecked) {
      setError('Complete all checklist items before approving.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await onSubmit(
        decision,
        isRejecting ? rejectionReason.trim() : null,
        checklist,
        notes.trim() || null,
      );
      onClose();
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitLabel = loading
    ? 'Submitting…'
    : decision === 'active'
    ? isRevisionReview ? 'Approve Revision' : 'Approve Product'
    : decision === 'rejected'
    ? isRevisionReview ? 'Reject Revision' : 'Reject Product'
    : 'Deactivate Product';

  const submitColorClass =
    decision === 'active'
      ? 'bg-green-600 hover:bg-green-700'
      : decision === 'rejected'
      ? 'bg-red-600 hover:bg-red-700'
      : 'bg-orange-500 hover:bg-orange-600';

  return (
    <DefaultMiddleModal
      isOpen={isOpen}
      onClose={onClose}
      title={isRevisionReview ? 'Review Product Revision' : 'Review Product'}
      isButtonView={false}
    >
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Product identity */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
          <div>
            <p className="text-xs text-gray-500">Product</p>
            <p className="text-sm font-semibold text-gray-800 leading-tight mt-0.5">
              {product?.title || '—'}
            </p>
          </div>
          {product?.status && (
            <ProductStatusBadge status={product.status} revisionStatus={product.revisionStatus} />
          )}
        </div>

        {/* Previous rejection reason */}
        {product?.moderation?.rejectionReason && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-red-700">Previous Rejection Reason</p>
            <p className="mt-1 text-sm text-red-600">{product.moderation.rejectionReason}</p>
          </div>
        )}

        {/* Revision diff */}
        {isRevisionReview && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="mb-2 flex flex-wrap gap-3 text-xs text-blue-800">
              <span className="font-medium">Revision review</span>
              {revision.baseVersion && <span>Base v{revision.baseVersion}</span>}
              {revision.submittedAt && (
                <span>Submitted {new Date(revision.submittedAt).toLocaleString()}</span>
              )}
              {(revision.submittedByRole || revision.submittedBy) && (
                <span>by {revision.submittedByRole || revision.submittedBy}</span>
              )}
            </div>
            {changedFields.length > 0 ? (
              <div className="space-y-2">
                {changedFields.map((field) => (
                  <div key={field} className="overflow-hidden rounded border border-blue-100 bg-white">
                    <div className="border-b border-blue-100 bg-blue-50/60 px-3 py-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">{field}</p>
                    </div>
                    <div className="grid gap-px md:grid-cols-2">
                      <div className="p-2">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-1">Current</p>
                        <pre className="max-h-24 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs text-gray-700">
                          {formatReviewValue(product?.[field])}
                        </pre>
                      </div>
                      <div className="p-2">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-green-500 mb-1">Proposed</p>
                        <pre className="max-h-24 overflow-auto whitespace-pre-wrap rounded bg-green-50 p-2 text-xs text-green-800">
                          {formatReviewValue(draftChanges[field])}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-blue-700">No specific changed fields were returned for this revision.</p>
            )}
          </div>
        )}

        {/* Decision cards */}
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Decision</p>
          <div className={`grid gap-2 ${isRevisionReview ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {decisions.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer flex-col gap-1.5 rounded-lg border-2 p-3 transition-all ${
                  decision === opt.value
                    ? opt.cardClass
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  value={opt.value}
                  checked={decision === opt.value}
                  onChange={() => { setDecision(opt.value); setError(''); }}
                  className="sr-only"
                />
                <div className={`flex items-center gap-2 ${decision === opt.value ? opt.labelClass : 'text-gray-600'}`}>
                  {opt.icon}
                  <span className="text-sm font-semibold">{opt.label}</span>
                </div>
                <p className={`text-xs leading-tight ${decision === opt.value ? opt.labelClass : 'text-gray-400'}`}>
                  {opt.description}
                </p>
              </label>
            ))}
          </div>
        </div>

        {/* Moderation checklist */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              Moderation Checklist
              <span className="ml-1.5 text-xs font-normal text-gray-400">
                ({checkedCount}/{CHECKLIST_ITEMS.length} verified)
              </span>
            </p>
            <button
              type="button"
              onClick={handleCheckAll}
              className="text-xs text-[var(--admin-blue)] hover:underline"
            >
              {allChecked ? 'Uncheck all' : 'Check all'}
            </button>
          </div>
          <div className="space-y-1.5">
            {CHECKLIST_ITEMS.map(({ key, label }) => {
              const checked = !!checklist[key];
              return (
                <label
                  key={key}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 transition-colors ${
                    checked
                      ? 'border-green-200 bg-green-50'
                      : submitted && !isRejecting
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleChecklistToggle(key)}
                    className="w-4 h-4 rounded text-green-600 border-gray-300 focus:ring-green-500"
                  />
                  <span className={`text-sm ${checked ? 'text-green-700' : 'text-gray-600'}`}>{label}</span>
                  {checked && (
                    <svg className="ml-auto w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </label>
              );
            })}
          </div>
          {submitted && !isRejecting && !allChecked && (
            <p className="mt-1.5 text-xs text-red-500">All checklist items must be verified before approving.</p>
          )}
        </div>

        {/* Rejection reason */}
        {isRejecting && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none ${
                submitted && !rejectionReason.trim()
                  ? 'border-red-400'
                  : 'border-gray-300'
              }`}
              rows={3}
              placeholder="Describe clearly what needs to be changed before re-submission…"
              value={rejectionReason}
              onChange={(e) => { setRejectionReason(e.target.value); setError(''); }}
            />
            {submitted && !rejectionReason.trim() && (
              <p className="mt-1 text-xs text-red-500">This field is required when rejecting.</p>
            )}
          </div>
        )}

        {/* Internal notes (optional, for all decisions) */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Internal Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)] resize-none"
            rows={2}
            placeholder="Notes visible only to admins…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button
            type="button"
            className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`min-w-[140px] px-5 py-2 text-sm rounded-md text-white font-medium disabled:opacity-60 transition-colors ${submitColorClass}`}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Submitting…
              </span>
            ) : submitLabel}
          </button>
        </div>
      </form>
    </DefaultMiddleModal>
  );
};

export default ProductReviewModal;
