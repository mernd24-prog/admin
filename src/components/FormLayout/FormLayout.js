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
  topContent = null,
  className = "",
  shellClassName = "",
  formClassName = "",
  cardClassName = "",
  childrenClassName = "",
  footerClassName = "",
  titleClassName = "",
  subTitleClassName = "",
}) => {
  return (
    <div
      className={`relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#f3f0ec] px-4 py-8 sm:px-6 lg:px-8 ${shellClassName}`}
    >
      <div
        className={`relative z-10 flex w-full max-w-[720px] flex-col items-center ${className}`}
      >
        {showLogo && (
          <div className="mb-[26px] flex h-[155px] w-[210px] items-center justify-center rounded-[8px] border border-[#e6cda9] bg-[#f7f5f2] p-[10px] shadow-[0_7px_12px_rgba(78,53,23,0.16)]">
            <img
              src={logoSrc}
              alt="Sam Global"
              className="h-full w-full rounded-[6px] border border-[#eadbc8] object-contain object-center p-[6px]"
            />
          </div>
        )}
        {topContent}

        <div className="mb-[22px] text-center">
          <h2
            className={`text-[28px] font-bold leading-[1.12] tracking-normal text-[#082f91] sm:text-[35px] ${titleClassName}`}
          >
            {title}
          </h2>
          {subTitle && (
            <p
              className={`mt-[10px] w-full max-w-3xl text-center font-[Inter] text-[13px] font-normal leading-[20px] tracking-normal text-[#4f5565] opacity-100 sm:text-[14px] sm:leading-[24px] ${subTitleClassName}`}
            >
              {subTitle}
            </p>
          )}
        </div>

        <div
          className={`flex w-full max-w-[600.5px] flex-col gap-[35px] rounded-[10px] border border-[#e4dfd9] bg-[#f7f5f2] px-4 py-[34px] opacity-100 shadow-[0_24px_44px_rgba(35,31,27,0.08)] sm:px-[30px] sm:py-[42px] ${cardClassName}`}
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
          <p
            className={`mt-[15px] text-center text-[14px] font-semibold text-[#031b52] ${footerClassName}`}
          >
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
