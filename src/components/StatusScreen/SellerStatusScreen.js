import React from "react";
import { CheckCircle2, Hourglass } from "lucide-react";
import { GoArrowRight, GoDotFill } from "react-icons/go";
import FormSubmitButton from "../Atoms/FormButton/FormSubmitButton";
import IconButton from "../Atoms/buttons/iconButton";

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
    icon: "review",
  },
};

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
  const isReview = content.icon === "review";

  return (
    <div
      className={`h-full w-full rounded-lg bg-white/40 shadow-[0_0_15px_rgba(0,0,0,0.15)] ${className}`}
    >
      <div
        className={`flex flex-col items-center justify-center px-8 pb-12 pt-1 text-center ${contentClassName}`}
      >
        {content.imageSrc ? (
          <img
            src={content.imageSrc}
            alt={content.imageAlt || content.title}
            className="h-[8rem] w-[11rem] object-cover lg:w-[10rem]"
          />
        ) : (
          <div className="mb-6 flex h-[110px] w-[110px] items-center justify-center rounded-full bg-[#30318d]">
            <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full border border-[#d09a2b]">
              {isReview ? (
                <Hourglass size={54} strokeWidth={2.6} className="text-white" />
              ) : (
                <CheckCircle2
                  size={54}
                  strokeWidth={2.6}
                  className="text-white"
                />
              )}
            </div>
          </div>
        )}

        <div className="mb-6 flex w-fit items-center justify-center">
          <IconButton
            label={content.badgeLabel}
            icon={isReview ? <Hourglass size={14} /> : <GoDotFill />}
            className="rounded-lg bg-golden/30"
          />
        </div>

        <div>
          <h1 className="font-inter text-center text-2xl font-extrabold text-blue xl:text-4xl xl:leading-[50px]">
            {content.title}
            <br />
            <span className="font-semibold text-ink">
              {content.subtitleTitle}
            </span>
          </h1>

          {finalDescription && (
            <h5 className="mx-auto mt-8 max-w-2xl text-center font-inter text-xl text-darkInk">
              {finalDescription}
            </h5>
          )}

          {content.nextStepLabel && (
            <div className="my-6 flex w-fit items-center justify-center mx-auto">
              <IconButton
                label={content.nextStepLabel}
                className="rounded-lg bg-golden/30"
                icon={<GoArrowRight />}
              />
            </div>
          )}

          <FormSubmitButton
            type="button"
            onClick={onButtonClick}
            buttonLabel={finalButtonLabel}
            className="mt-8"
          />
        </div>
      </div>
    </div>
  );
};

export default SellerStatusScreen;
