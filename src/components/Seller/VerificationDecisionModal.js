import React, { useState, useEffect } from 'react';
import DefaultMiddleModal from '../Atoms/Modal/DefaultMiddleModal ';

/**
 * Reusable modal for KYC / bank / onboarding verification decisions.
 *
 * Props:
 *  isOpen          - boolean
 *  onClose         - () => void
 *  onSubmit        - (decision: string, rejectionReason?: string) => Promise<void>
 *  title           - string  (modal heading)
 *  decisionLabel   - string  (label for the dropdown, e.g. "KYC Decision")
 *  options         - Array<{ value: string, label: string }>
 *  defaultDecision - string  (pre-selected option value)
 *  rejectionValue  - string  (which option value triggers the reason textarea, e.g. "rejected")
 *  rejectionLabel  - string  (label for the rejection reason field)
 *  submitText      - string
 */
const VerificationDecisionModal = ({
  isOpen,
  onClose,
  onSubmit,
  title = 'Verification Decision',
  decisionLabel = 'Decision',
  options = [],
  defaultDecision = '',
  rejectionValue = 'rejected',
  rejectionLabel = 'Rejection Reason',
  submitText = 'Submit',
}) => {
  const [decision, setDecision] = useState(defaultDecision);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDecision(defaultDecision);
      setRejectionReason('');
      setError('');
    }
  }, [isOpen, defaultDecision]);

  const needsReason = decision === rejectionValue;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (needsReason && !rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onSubmit(decision, needsReason ? rejectionReason.trim() : null);
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
      title={title}
      isButtonView={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">{decisionLabel}</label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
            value={decision}
            onChange={(e) => { setDecision(e.target.value); setError(''); }}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {needsReason && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">{rejectionLabel} <span className="text-red-500">*</span></label>
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
            className="px-4 py-2 text-sm rounded-md bg-[var(--admin-blue)] text-white hover:bg-[#2e3074] disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Submitting…' : submitText}
          </button>
        </div>
      </form>
    </DefaultMiddleModal>
  );
};

export default VerificationDecisionModal;
