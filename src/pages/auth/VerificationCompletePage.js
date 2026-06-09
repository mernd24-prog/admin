import { useNavigate } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import { AUTH_FORM_TYPES } from "../../context/AuthLayoutContext";
import { AUTH_ROUTES } from "./authRoutes";
import { useAuthFlow } from "./useAuthFlow";
import { useAuthPageMeta } from "./useAuthPageMeta";
import { statusContent } from "../../components/StatusScreen/SellerStatusScreen";

const verificationComplete = statusContent.verificationComplete;

const VerificationCompletePage = () => {
  const navigate = useNavigate();
  useAuthFlow({
    currentFormType: AUTH_FORM_TYPES.VERIFICATION_COMPLETE,
  });
  useAuthPageMeta("Verification Complete", "Your seller account is verified.");

  return (
    <section className="mx-auto w-full max-w-[791px] overflow-hidden    font-inter text-center">
      <div className="flex min-h-[250px] flex-col items-center justify-center  px-5 py-10">
        <span className="flex h-[80px] w-[80px] items-center justify-center rounded-full bg-[#43B947] text-white">
          <BadgeCheck size={45} strokeWidth={2.6} />
        </span>

        <h1 className="mt-5 text-[28px] font-extrabold leading-[36px] text-[#2D2D2D]">
          {verificationComplete.title}
        </h1>

        <span className="mt-4 inline-flex h-[32px] items-center rounded-full border border-[#CE9F2D] bg-[#F5D58D] px-4 text-[13px] font-medium text-[#1A1A68]">
          <span className="mr-2 h-[7px] w-[7px] rounded-full bg-[#1A1A68]" />
          {verificationComplete.badgeLabel}
        </span>
      </div>

      <div className="flex min-h-[286px] flex-col items-center rounded-xl border border-[#CE9F2D] bg-white px-6 pb-7 pt-8">
        <div>
          <h2 className="text-[24px] font-extrabold leading-[32px] text-[#2D2D2D] sm:text-[26px]">
            {verificationComplete.subtitleTitle}
          </h2>

          <p className="mx-auto mt-3 max-w-[560px] text-[14px] font-medium leading-[18px] text-[#182D50B2] sm:text-[15px]">
            {verificationComplete.description}
          </p>
        </div>

        <div className="mt-[78px] flex w-full flex-col items-center">
          <p className="text-[14px] font-medium leading-[20px] text-[#2D2D2D] sm:text-[15px]">
            {verificationComplete.nextStepLabel}
          </p>

          <button
            type="button"
            onClick={() => {
              navigate(AUTH_ROUTES.ONBOARDING);
            }}
            className="mt-4 flex h-[40px] w-full max-w-[421px] items-center justify-center rounded-[8px] bg-[#D8A72C] px-6 text-[13px] font-bold text-white focus-visible:outline-none"
          >
            {verificationComplete.buttonLabel}
          </button>
        </div>
      </div>
    </section>
  );
};

export default VerificationCompletePage;
