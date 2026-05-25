import React from "react";

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
    badgeLabel: "KYC Submitted",
    title: "Your Account Is Under Review",
    subtitleTitle: "(24 - 48 Hours)",
    description: "",
    buttonLabel: "Return To Main Page",
    icon: "review",
  },
  approved: {
    imageSrc: "/Img/auth-img/completed.png",
    imageAlt: "KYC Approved",
    badgeLabel: "KYC Approved",
    title: "KYC Approved",
    subtitleTitle: "You're Ready To Sell",
    description:
      "KYC approved. Start adding products and grow your business with Sam Global.",
    buttonLabel: "Go To Dashboard",
    icon: "check",
  },
  rejected: {
    badgeLabel: "KYC Rejected",
    title: "KYC Rejected",
    subtitleTitle: "Please Update Your Details",
    description:
      "Your KYC was rejected. Please update your details and submit again.",
    buttonLabel: "Update Details",
    icon: "rejected",
  },
};

const STATUS_IMAGE_SRC = "/Img/auth-img/completeVerification.png";

const SellerStatusScreen = ({
  variant = "verificationComplete",
  description,
  buttonLabel,
  onButtonClick,
  className = "",
  contentClassName = "",
}) => {
  const content = statusContent[variant] || statusContent.verificationComplete;
  const finalDescription = description || content.description;
  const finalButtonLabel = buttonLabel || content.buttonLabel;

  return (
    <div
      className={`flex min-h-[560px] w-full items-center justify-center rounded-[22px] border border-[#e7e7e7] bg-white px-5 py-12 shadow-[0_10px_28px_rgba(0,0,0,0.16)] sm:min-h-[640px] sm:px-10 ${className}`}
    >
      <div
        className={`flex w-full max-w-[920px] flex-col items-center justify-center text-center ${contentClassName}`}
      >
        <img
          src={STATUS_IMAGE_SRC}
          alt={content.imageAlt || content.title}
          className="h-[14rem] w-full  object-contain"
        />

        <div className="w-full">
          <h1 className="font-inter text-center text-[26px] font-extrabold leading-[38px] text-[#082f91] sm:text-[34px] sm:leading-[50px]">
            {content.title}
            <br />
            <span className="font-extrabold text-[#082f91]">
              {content.subtitleTitle}
            </span>
          </h1>

          {finalDescription && (
            <p className="mx-auto mt-5 max-w-2xl text-center font-inter text-[15px] font-medium leading-6 text-[#596172]">
              {finalDescription}
            </p>
          )}

          <button
            type="button"
            onClick={onButtonClick}
            className="mx-auto mt-10 flex h-[48px] w-full max-w-[680px] items-center justify-center rounded-[8px] bg-[#082f91] px-6 font-inter text-[15px] font-bold text-white shadow-[0_8px_16px_rgba(8,47,145,0.24)] transition hover:bg-[#062779]"
          >
            {finalButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerStatusScreen;
