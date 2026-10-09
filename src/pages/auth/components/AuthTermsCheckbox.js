import Checkbox from "../../../components/Atoms/Checkbox/Checkbox";

const AuthTermsCheckbox = ({ checked, onChange, className = "" }) => (
  <label
    className={`mb-[20px] flex cursor-pointer items-center gap-[10px] ${className}`}
  >
    <Checkbox
      id="remember_me"
      name="remember_me"
      checked={checked}
      onChange={onChange}
      className="mt-[1px]"
    />

    <span className="text-[13px] leading-5 font-inter text-[#667085]">
      I agree to all{" "}
      <span className="font-semibold text-[#031b52]">
        <a
          href="https://staging.samglobal1.com/terms-of-use"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Terms
        </a>
        , Privacy, and Cancellation Policies.
      </span>
    </span>
  </label>
);

export default AuthTermsCheckbox;
