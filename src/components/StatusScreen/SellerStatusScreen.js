import React from "react";
import { Hourglass } from "lucide-react";
import { MdArrowRightAlt } from "react-icons/md";
export const statusContent = {
  verificationComplete: {
    imageSrc: "/Img/auth-img/completed.png",
    imageAlt: "Verification Complete",
    badgeLabel: "Account Verified",
    title: "Verification Complete!",
    subtitleTitle: "You're One Step Closer to Selling",
    description:
      "Complete your KYC verification to activate your seller account and start listing products on the marketplace.",
    nextStepLabel: "Next Step: KYC Verification",
    buttonLabel: "Continue to KYC Verification",
    icon: "check",
  },
  underReview: {
    imageSrc: "/Img/auth-img/completeVerification.png",
    imageAlt: "Account Under Review",
    badgeLabel: "KYC Submitted",
    title: "Your Account Is Under Review",
    subtitleTitle: "(24 - 48 Hours)",
    description: "",
    buttonLabel: "KYC Verification",
    icon: "review",
  },
  approved: {
    imageSrc: "/Img/auth-img/completed.png",
    imageAlt: "KYC Approved",
    badgeLabel: "KYC Approved",
    title: "KYC Approved",
    subtitleTitle: "",
    description:
      "Your seller account is now verified. You can begin adding products and accepting orders.",
    buttonLabel: "Continue",
    icon: "check",
  },
  readyToSell: {
    imageSrc: "/Img/auth-img/approved.png",
    imageAlt: "KYC Approved",
    badgeLabel: "KYC Approved",
    title: "You're Ready To Sell",
    subtitleTitle: "",
    description:
      "KYC approved. Start adding products and grow your business with Sam Global.",
    buttonLabel: "Go To Dashboard",
    icon: "check",
  },
  rejected: {
    imageSrc: "/Img/auth-img/completeVerification.png",
    imageAlt: "KYC Rejected",
    badgeLabel: "KYC Rejected",
    title: "KYC Rejected",
    subtitleTitle: "Please Update Your Details",
    description:
      "Your KYC was rejected. Please update your details and submit again.",
    buttonLabel: "Update Details",
    icon: "rejected",
  },
};

const SellerStatusScreen = ({
  variant = "verificationComplete",
  imageSrc,
  imageAlt,
  title,
  subtitleTitle,
  description,
  badgeLabel,
  buttonLabel,
  onButtonClick,
  disabled = false,
  className = "",
  contentClassName = "",
}) => {
  const baseContent =
    statusContent[variant] || statusContent.verificationComplete;
  const content = {
    ...baseContent,
    imageSrc: imageSrc || baseContent.imageSrc,
    imageAlt: imageAlt || baseContent.imageAlt,
    title: title || baseContent.title,
    subtitleTitle:
      subtitleTitle !== undefined ? subtitleTitle : baseContent.subtitleTitle,
    badgeLabel: badgeLabel || baseContent.badgeLabel,
  };
  const finalDescription = description || content.description;
  const finalButtonLabel = buttonLabel || content.buttonLabel;
  const showStatusBadge = ["verificationComplete", "readyToSell"].includes(
    variant,
  );
  const renderProgressHeader = () => (
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-inter text-[28px] font-extrabold leading-[36px] text-[#2d2f35]">
          We're Reviewing Your Account
        </h1>
        <p className="mt-3 max-w-3xl font-inter text-[14px] font-medium leading-[22px] text-[#182D50B2]">
          Your application is currently under review. This usually takes 24–48
          hours.
        </p>
      </div>
      <div className="min-w-[185px]">
        <p className="mb-2 text-left font-inter text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ba4b6] sm:text-right">
          Progress
        </p>
        <div className="flex items-center gap-3 sm:justify-end">
          <span className="whitespace-nowrap font-inter text-[16px] font-extrabold text-[#182D50]">
            Step 5 / 5
          </span>
          <div className="h-[5px] w-28 overflow-hidden rounded-full bg-[#d7d4cf]">
            <span className="block h-full w-full rounded-full bg-[#DB971A]" />
          </div>
        </div>
      </div>
    </div>
  );

  if (variant === "underReview") {
    const reviewHours = content.subtitleTitle || "24 - 48 Hours";
    const isDurationSubtitle = /hour|24|48/i.test(reviewHours);
    const formattedReviewHours = /^\(.+\)$/.test(reviewHours)
      ? reviewHours
      : `(${reviewHours})`;
    const reviewTitle = isDurationSubtitle
      ? `Your account is under review ${formattedReviewHours}`
      : content.title;

    return (
      <div className={`w-full ${className}`}>
        {renderProgressHeader()}

        <div
          className={`flex min-h-[430px] w-full  items-center justify-center rounded-[14px] border border-[#e7d6b7] bg-white px-5 py-12 ${contentClassName}`}
        >
          <div className="flex w-full max-w-[360px] flex-col items-center text-center">
            <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[#1A1A68] text-white">
              <Hourglass size={42} strokeWidth={2.4} />
            </span>
            <h2 className="mt-10 max-w-[720px] font-inter text-[24px] font-extrabold leading-[32px] text-[#1A1A68] sm:text-[28px] sm:leading-[36px] lg:whitespace-nowrap">
              {reviewTitle}
              {!isDurationSubtitle && content.subtitleTitle && (
                <>
                  <br />
                  <span>{content.subtitleTitle}</span>
                </>
              )}
            </h2>
            <button
              type="button"
              onClick={onButtonClick}
              disabled={disabled}
              className="mt-14 flex h-[48px] w-full max-w-[260px] items-center justify-center rounded-[8px] bg-[#DBA328] px-6 font-inter text-[13px] font-bold text-white shadow-[0_8px_16px_rgba(219,151,26,0.22)] transition hover:bg-[#bd861c] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {finalButtonLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "rejected") {
    return (
      <div className={`w-full ${className}`}>
        {renderProgressHeader()}

        <div className="flex min-h-[430px] w-full items-center justify-center rounded-[14px] border border-[#e7d6b7] bg-white px-5 py-12">
          <div
            className={`flex w-full max-w-[760px] flex-col items-center justify-center text-center ${contentClassName}`}
          >
            <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[#1A1A68] text-white">
              <Hourglass size={42} strokeWidth={2.4} />
            </span>

            <h1 className="mt-10 max-w-[760px] font-inter text-[26px] font-extrabold leading-[34px] text-[#1A1A68] sm:text-[32px] sm:leading-[40px]">
              {content.title}
              {content.subtitleTitle && (
                <>
                  <br />
                  {content.subtitleTitle}
                </>
              )}
            </h1>

            {finalDescription && (
              <p className="mt-7 max-w-[720px] font-inter text-[18px] font-medium leading-[28px] text-[#182D50B2] sm:text-[22px] sm:leading-[32px]">
                {finalDescription}
              </p>
            )}

            <button
              type="button"
              onClick={onButtonClick}
              disabled={disabled}
              className="mt-12 flex h-[48px] w-full max-w-[320px] items-center justify-center rounded-[8px] bg-[#DBA328] px-6 font-inter text-[13px] font-bold text-white shadow-[0_8px_16px_rgba(219,151,26,0.22)] transition hover:bg-[#bd861c] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {finalButtonLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* {renderProgressHeader()} */}
      <div className="flex min-h-[430px] w-full items-center justify-center rounded-[14px] border border-[#e7d6b7] bg-white px-5 py-12 sm:px-10">
        <div
          className={`flex w-full max-w-[760px] flex-col items-center justify-center text-center ${contentClassName}`}
        >
          <img
            src={content.imageSrc}
            alt={content.imageAlt || content.title}
            className="mb-8 h-[88px] w-full object-contain"
          />

          {showStatusBadge && (
            <span className="mb-8 inline-flex h-[28px] items-center rounded-full border border-[#e7d6b7] bg-[#FFF2D3] px-4 font-inter text-[12px] font-semibold text-[#1A1A68]">
              <span className="mr-2 h-2 w-2 rounded-full bg-[#DBA328]" />
              {content.badgeLabel}
            </span>
          )}

          <div className="w-full">
            <h1 className="font-inter text-center text-[26px] font-extrabold leading-[34px] text-[#1A1A68] sm:text-[32px] sm:leading-[40px]">
              {content.title}
              {content.subtitleTitle && (
                <>
                  <br />
                  <span className="font-extrabold text-[#1A1A68]">
                    {content.subtitleTitle}
                  </span>
                </>
              )}
            </h1>

            {finalDescription && (
              <p className="mx-auto mt-7 max-w-[720px] text-center font-inter text-[18px] font-medium leading-[28px] text-[#182D50B2] sm:text-[22px] sm:leading-[32px]">
                {finalDescription}
              </p>
            )}

            {content.nextStepLabel && (
              <span className="mx-auto mt-8 inline-flex h-[29px] items-center rounded-[6px] bg-[#FFF2D3] px-5 font-inter text-[14px] font-bold text-[#1A1A68]">
                <span className="mr-2 text-[20px] text-[#DBA328]">
                  <MdArrowRightAlt />
                </span>
                {content.nextStepLabel}
              </span>
            )}

            <button
              type="button"
              onClick={onButtonClick}
              disabled={disabled}
              className="mx-auto mt-10 flex h-[48px] w-full max-w-[320px] items-center justify-center rounded-[8px] bg-[#DBA328] px-6 font-inter text-[13px] font-bold text-white shadow-[0_8px_16px_rgba(219,151,26,0.22)] transition hover:bg-[#bd861c] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {finalButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerStatusScreen;
