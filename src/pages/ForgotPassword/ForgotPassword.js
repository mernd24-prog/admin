import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../../Redux/auth-Slice";
import FormLayout from "../../components/FormLayout/FormLayout";
import { showError, showSuccess } from "../../Redux/alertSlice";
import EmailInput from "../../components/Atoms/EmailInput";
import { CiUser } from "react-icons/ci";

const ForgetPassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selector = useSelector((state) => state);
  const { authSlice } = selector || {};
  const { loading } = authSlice || {};

  const [email, setEmail] = useState({
    email: "",
  });

  const [errorsLogin, setErrorsLogin] = useState({});
  const validateField = (name, value) => {
    if (name === "email") {
      if (!value || value.trim() === "") {
        return "Enter user email";
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return "Enter a valid email address";
      }
    }
    return "";
  };
  // Validate entire form
  const validateForm = () => {
    const errors = {};
    const emailError = validateField("email", email.email);

    if (emailError) {
      errors.email = emailError;
    }

    setErrorsLogin(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle field input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setEmail((prevState) => ({
      ...prevState,
      [name]: value,
    }));

    const errorMsg = validateField(name, value);
    setErrorsLogin((prevErrors) => ({
      ...prevErrors,
      [name]: errorMsg,
    }));
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const isValid = validateForm();
    if (!isValid) return;

    try {
      const resultAction = await dispatch(forgotPassword(email));
      const { payload } = resultAction || {};

      if (payload?.error) {
        setErrorsLogin({ email: payload?.message || "An error occurred" });
        dispatch(showError(payload?.message));
      } else {
        dispatch(showSuccess(payload?.message));
        navigate("/verifyOtp", { state: { email: email.email } });
      }
    } catch (error) {
      console.error("Password reset failed:", error);
      setErrorsLogin({ email: "Failed to send reset link. Please try again." });
    }
  };

  return (
    <FormLayout
      title="Reset Your Password"
      subTitle="Enter Your Registered Email ID."
      buttonText={loading ? "Sending..." : "Submit"}
      onSubmit={handleSubmit}
      bottomText="Remember your password?"
      linkText="Login"
      linkTo="/login"
    >
      <div className="">
        {/* <Input
          labelName="Email"
          name="email"
          placeholder="Enter your email"
          type="email"
          value={email.email}
          onChange={handleInputChange}
          required={true}
          errorMessage={errorsLogin.email || ""}
        /> */}
        <EmailInput
          id="email"
          name="email"
          label="Email"
          value={email.email}
          placeholder="Enter your email"
          icon={CiUser}
          onChange={handleInputChange}
          errorMessage={errorsLogin.email}
          autoFocus
        />
      </div>
    </FormLayout>
  );
};

export default ForgetPassword;
