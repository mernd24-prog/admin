import React, { useState } from "react";

const KYC_STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600" },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700" },
  under_review: {
    label: "Under Review",
    color: "bg-yellow-100 text-yellow-700",
  },
  verified: { label: "Verified", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
};

const StatusBadge = ({ status }) => {
  const cfg = KYC_STATUS_CONFIG[status] || {
    label: status || "N/A",
    color: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="border-b border-gray-100 py-2">
    <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
    <p className="text-sm text-gray-800 break-all">{value || "—"}</p>
  </div>
);

const DOC_LABELS = {
  panDocumentUrl: "PAN Card",
  gstCertificateUrl: "GST Certificate",
  aadhaarFrontUrl: "Aadhaar Front",
  aadhaarBackUrl: "Aadhaar Back",
  bankProofUrl: "Bank Proof",
  addressProofUrl: "Address Proof",
};

const DocumentLink = ({ label, url }) => {
  if (!url) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-100">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-xs text-gray-400">Not uploaded</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100">
      <span className="text-sm text-gray-700">{label}</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-[var(--admin-blue)] underline hover:text-[#2e3074]"
      >
        View
      </a>
    </div>
  );
};

/**
 * Displays full KYC details including documents for admin review.
 *
 * Props:
 *  kyc - object returned by /admin/sellers/:id/kyc  (formatKycForAdmin shape)
 *  loading - boolean
 *  onLoad  - () => void  (called when user expands the card to trigger lazy load)
 */
const SellerKycCard = ({ kyc, loading = false, onLoad }) => {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    if (!expanded && onLoad) onLoad();
    setExpanded((v) => !v);
  };

  const documents = kyc?.documents || {};
  const docKeys = Object.keys(DOC_LABELS);

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={handleToggle}
        type="button"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-800">KYC Details</h3>
          {kyc && <StatusBadge status={kyc.verificationStatus} />}
          {!kyc && !loading && (
            <span className="text-xs text-gray-400">Not submitted</span>
          )}
          {loading && <span className="text-xs text-gray-400">Loading…</span>}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          {loading && (
            <p className="text-sm text-gray-400 py-4 text-center">
              Loading KYC details…
            </p>
          )}

          {!loading && !kyc && (
            <p className="text-sm text-gray-400 py-4 text-center">
              No KYC record found for this seller.
            </p>
          )}

          {!loading && kyc && (
            <>
              {kyc.rejectionReason && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">
                    Rejection Reason
                  </p>
                  <p className="text-sm text-red-600">{kyc.rejectionReason}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 mt-3">
                <InfoRow label="Legal Name" value={kyc.legalName} />
                <InfoRow label="Business Type" value={kyc.businessType} />
                <InfoRow label="PAN Number" value={kyc.panNumber} />
                <InfoRow label="GST Number" value={kyc.gstNumber} />
                <InfoRow label="Aadhaar Number" value={kyc.aadhaarNumber} />
                <InfoRow label="Reviewed By" value={kyc.reviewedBy} />
                <InfoRow
                  label="Submitted At"
                  value={
                    kyc.submittedAt
                      ? new Date(kyc.submittedAt).toLocaleString()
                      : null
                  }
                />
                <InfoRow
                  label="Reviewed At"
                  value={
                    kyc.reviewedAt
                      ? new Date(kyc.reviewedAt).toLocaleString()
                      : null
                  }
                />
              </div>

              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-2 font-medium">
                  KYC Documents
                </p>
                <div>
                  {docKeys.map((key) => (
                    <DocumentLink
                      key={key}
                      label={DOC_LABELS[key]}
                      url={documents[key]}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SellerKycCard;
