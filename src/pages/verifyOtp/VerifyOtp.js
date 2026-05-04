import React, { useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import { verifyOtp } from "../../Redux/auth-Slice";
import { setToken } from "../../Redux/authSlice";
import FormLayout from "../../components/FormLayout/FormLayout";
import OtpInputComponent from "../../components/Atoms/optInput";
import { showError, showSuccess } from "../../Redux/alertSlice";

const VerifyOtp = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const selector = useSelector((state) => state);
  const { authSlice } = selector || {};
  const { loading, error } = authSlice || {};
  const tokenFromUrl = new URLSearchParams(location.search).get("token");

  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [formErrors, setFormErrors] = useState({});
  const inputRefs = useRef([]);

  const handleOtpChange = (event, index) => {
    const value = event.target.value;
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < otp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    const otpCode = otp.join("").trim();
    if (otpCode.length < 6) {
      setFormErrors({ otp: "Please enter all OTP digits." });
      return;
    } 
    if (!tokenFromUrl) {
      setFormErrors({ otp: "Token not found. Please try again." });
      return;
    } 
    const otpData = {
      token: tokenFromUrl,
      otp: otpCode,
    }; 
    try {
      const resultAction = await dispatch(verifyOtp(otpData));
      if (verifyOtp.rejected.match(resultAction)) {
        const message = resultAction?.payload?.message || "OTP verification failed. Please try again.";
        setFormErrors({ otp: message });
        dispatch(showError(message));
        return;
      }
      dispatch(showSuccess(resultAction?.payload?.message || "OTP verified successfully."));
      setFormErrors({});
      setOtp(new Array(6).fill("")); 
      const token = resultAction?.payload?.data?.token;
      if (token) {
        dispatch(setToken(token));
        navigate(`/ResetPassword?token=${token}`);
      } else {
        setFormErrors({ otp: "Verification succeeded, but no token was returned." });
      } 
    } catch (error) {
      console.error("OTP verification failed:", error);
      setFormErrors({ otp: "OTP verification failed. Please try again later." });
      dispatch(showError("OTP verification failed. Please try again."));
    }
  };
  
  return (
    <FormLayout
      title="Email Otp"
      subTitle={`OTP successfully sent to your email.`}
      buttonText={loading ? "Sending..." : "Submit"}
      onSubmit={handleSubmit}
      bottomText=""
      linkText=""
      linkTo=""
    >
      <div className="flex flex-col gap-5">
        <OtpInputComponent
          labelName="Enter OTP"
          name="otp"
          placeholder=""
          type="text"
          value={otp.join("")}
          onChange={(e, index) => handleOtpChange(e, index)}
          onKeyDown={(e, index) => handleOtpKeyDown(index, e)}
          required={true}
          errorMessage={formErrors.otp || error || ""}
        />
      </div>
    </FormLayout>
  );
};

export default VerifyOtp;
