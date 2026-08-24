import React from "react";

const CHECKLIST_LABELS = {
  profileCompleted: "Profile Completed",
  kycSubmitted: "KYC Submitted",
  gstVerified: "GST / KYC Verified",
  bankLinked: "Bank Account Linked",
  firstProductPublished: "First Product Published",
};

const CHECKLIST_DESCRIPTIONS = {
  profileCompleted: "Display name, legal name, support email and phone are set",
  kycSubmitted: "PAN and KYC documents have been submitted",
  gstVerified: "KYC has been verified by admin (GST/PAN verified)",
  bankLinked: "Bank account holder name, number, IFSC, and bank name are set",
  firstProductPublished: "At least one product is live on the storefront",
};

const ChecklistItem = ({ label, description, done }) => (
  <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
    <div
      className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-green-500" : "bg-gray-200"}`}
    >
      {done ? (
        <svg
          className="w-3 h-3 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <div className="w-2 h-2 rounded-full bg-gray-400" />
      )}
    </div>
    <div>
      <p
        className={`text-sm font-medium ${done ? "text-gray-900" : "text-gray-500"}`}
      >
        {label}
      </p>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  </div>
);

/**
 * Displays the seller onboarding checklist.
 *
 * Props:
 *  checklist - object with boolean flags matching CHECKLIST_LABELS keys
 *  className - optional extra classes
 */
const OnboardingChecklist = ({ checklist = {}, className = "" }) => {
  const keys = Object.keys(CHECKLIST_LABELS);
  const completedCount = keys.filter((k) => checklist[k] === true).length;

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Onboarding Checklist
        </h3>
        <span className="text-xs font-medium text-gray-500">
          {completedCount}/{keys.length} done
        </span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
        <div
          className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${(completedCount / keys.length) * 100}%` }}
        />
      </div>

      <div>
        {keys.map((key) => (
          <ChecklistItem
            key={key}
            label={CHECKLIST_LABELS[key]}
            description={CHECKLIST_DESCRIPTIONS[key]}
            done={checklist[key] === true}
          />
        ))}
      </div>
    </div>
  );
};

export default OnboardingChecklist;
