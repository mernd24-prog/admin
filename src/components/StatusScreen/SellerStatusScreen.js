import React from "react";
import { MdArrowRightAlt } from "react-icons/md";
const statusContent = {
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

  return (
    <div
      className={`flex min-h-[560px] w-full items-center justify-center rounded-[22px] border border-[#e7e7e7] bg-white px-5 py-12 shadow-[0_10px_28px_rgba(0,0,0,0.16)] sm:min-h-[640px] sm:px-10 ${className}`}
    >
      <div
        className={`flex w-full max-w-[920px] flex-col items-center justify-center text-center ${contentClassName}`}
      >
        <img
          src={content.imageSrc}
          alt={content.imageAlt || content.title}
          className=" h-[140px] mb-6 w-full object-contain"
        />

        {showStatusBadge && (
          <span className="mb-8 inline-flex h-[28px] items-center rounded-full border border-[#E49E1C] bg-[#FFF2D3] px-4 font-inter text-[12px] font-semibold text-[#082f91]">
            <span className="mr-2 h-2 w-2 rounded-full  bg-[#082f91]" />
            {content.badgeLabel}
          </span>
        )}

        <div className="w-full">
          <h1 className="font-inter text-center text-[28px]  font-extrabold leading-[38px] text-[#082f91] sm:text-[34px] ">
            {content.title}
            {content.subtitleTitle && (
              <>
                <br />
                <span className="font-extrabold text-[#082f91] ">
                  {content.subtitleTitle}
                </span>
              </>
            )}
          </h1>

          {finalDescription && (
            <p className="mx-auto mt-5 max-w-3xl text-center  font-inter text-[24px] font-medium  text-[#484555]">
              {finalDescription}
            </p>
          )}

          {content.nextStepLabel && (
            <span className="mx-auto mt-8 inline-flex h-[29px] items-center rounded-[6px] bg-[#FFE5AB] px-5 font-inter text-[14px] font-bold text-[#082f91]">
              <span className="mr-2 text-[20px]  text-[#082f91]">
                <MdArrowRightAlt />
              </span>
              {content.nextStepLabel}
            </span>
          )}

          <button
            type="button"
            onClick={onButtonClick}
            disabled={disabled}
            className="mx-auto mt-8  flex h-[48px] w-full max-w-[680px] items-center justify-center rounded-[8px] bg-[#082f91] px-6 font-inter text-lg font-bold text-white shadow-[0_8px_16px_rgba(8,47,145,0.24)] transition hover:bg-[#062779] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {finalButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerStatusScreen;
