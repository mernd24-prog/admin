import React from "react";
import { Link } from "react-router-dom";
import FormSubmitButton from "../Atoms/FormButton/FormSubmitButton";

const FormLayout = ({
  title,
  subTitle,
  onSubmit,
  children,
  buttonText,
  bottomText,
  linkText,
  linkTo,
  onLinkClick,
  logoSrc = "/logo.png",
  showLogo = true,
  className = "",
  formClassName = "",
  cardClassName = "",
  childrenClassName = "",
}) => {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#f3f0ec] px-4 py-8">
      <div
        className={`relative z-10 flex w-full max-w-[390px] flex-col items-center ${className}`}
      >
        {showLogo && (
          <div className="mb-[22px] flex h-[92px] w-[118px] items-center justify-center rounded-[8px] border border-[#e7d8c3] bg-[#f7f5f2] p-[6px] shadow-[0_6px_10px_rgba(78,53,23,0.14)]">
            <img
              src={logoSrc}
              alt="Sam Global"
              className="h-full w-full object-contain object-center"
            />
          </div>
        )}

        <div className="mb-[18px] text-center">
          <h2 className="text-[30px] font-bold leading-[1.14] tracking-normal text-[#082f91] sm:text-[34px]">
            {title}
          </h2>
          {subTitle && (
            <p className="mt-[10px] text-[13px] leading-5 text-[#4f5565]">
              {subTitle}
            </p>
          )}
        </div>

        <div
          className={`w-full max-w-[344px] rounded-[12px] border border-[#e4dfd9] bg-[#f7f5f2] px-[22px] py-[39px] shadow-[0_24px_44px_rgba(35,31,27,0.08)] ${cardClassName}`}
        >
          <form onSubmit={onSubmit} className={`space-y-0 ${formClassName}`}>
            <div className={childrenClassName}>{children}</div>
            {buttonText && (
              <FormSubmitButton
                buttonLabel={buttonText}
                className="h-[38px] w-full rounded-[7px] bg-[#082f91] text-[11px] font-semibold text-white shadow-[0_8px_16px_rgba(8,47,145,0.28)] transition hover:bg-[#062779] active:scale-[0.99]"
              />
            )}
          </form>
        </div>

        {(bottomText || linkText) && (
          <p className="mt-[30px] text-center text-[11px] font-semibold text-[#031b52]">
            {bottomText && <span>{bottomText} </span>}
            {linkText &&
              (onLinkClick ? (
                <button
                  type="button"
                  onClick={onLinkClick}
                  className="text-[#c89a3c] transition hover:text-[#a77d2e]"
                >
                  {linkText}
                </button>
              ) : linkTo ? (
                <Link
                  to={linkTo}
                  className="text-[#c89a3c] transition hover:text-[#a77d2e]"
                >
                  {linkText}
                </Link>
              ) : (
                <span className="text-[#c89a3c]">{linkText}</span>
              ))}
          </p>
        )}
      </div>
    </div>
  );
};

export default FormLayout;
