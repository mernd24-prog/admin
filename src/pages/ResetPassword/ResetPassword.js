import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { resetPassword } from "../../Redux/auth-Slice";
import { showError, showSuccess } from "../../Redux/alertSlice";
import FormLayout from "../../components/FormLayout/FormLayout";
import PasswordInput from "../../components/Atoms/password/PasswordInput";
import { CiLock } from "react-icons/ci";

const ResetPassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { loading, error } = useSelector((state) => state.authSlice || {});

  const [fields, setFields] = useState({
    password: "",
    confirmPassword: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const tokenFromUrl = new URLSearchParams(location.search).get("token");

  useEffect(() => {
    if (!tokenFromUrl) {
      navigate("/error");
    }
  }, [tokenFromUrl, navigate]);

  const validateFields = () => {
    const errors = {};
    const { password, confirmPassword } = fields;

    if (!password) {
      errors.password = "Enter password";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters long.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    if (!validateFields()) return; 
    try {
      const result = await dispatch(
        resetPassword({
          password: fields.password,
          confirmPassword: fields.confirmPassword,
          token: tokenFromUrl,
        })
      ).unwrap();
      dispatch(showSuccess(result.message || "Password reset successfully"));
      navigate("/login");
    } catch (err) {
      const message = err?.message || "Failed to reset password";
      dispatch(showError(message));
    }
  };

  return (
    <FormLayout
      title="Set New Password"
      subTitle="New Password should be unique."
      buttonText={loading ? "Loading..." : "Set Password"}
      onSubmit={handleSubmit}
      linkTo=""
    >
      <div className="flex flex-col space-y-4">
        <PasswordInput
          id="password"
          name="password"
          label="New Password"
          value={fields.password}
          placeholder="Enter your new password"
          icon={CiLock}
          onChange={handleInputChange}
          errorMessage={formErrors.password}
        />
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm New Password"
          value={fields.confirmPassword}
          placeholder="Enter your new confirm password"
          icon={CiLock}
          onChange={handleInputChange}
          errorMessage={formErrors.confirmPassword}
        />
        {error && <p className="text-red-500">{error}</p>}
      </div>
    </FormLayout>
  );
};

export default ResetPassword;



// import React, { useState } from "react";
// import { useLocation, useNavigate } from "react-router-dom";
// import FormLayout from "../../components/FormLayout/FormLayout";
// import { useDispatch, useSelector } from "react-redux";
// import { resetPassword } from "../../Redux/userSlice";
// import PasswordInput from "../../components/Atoms/password/PasswordInput";
// import { CiLock } from "react-icons/ci";
// import { showError, showSuccess } from "../../Redux/alertSlice";

// const ResetPassword = () => {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const selector = useSelector((state) => state);
//   const { authSlice } = selector || {};
//   let { loading, error } = authSlice || {};
//   const [fieldsLogin, setFields] = useState({
//     password: "",
//     confirmPassword: "",
//   });
//   const [formErrors, setFormErrors] = useState({});
//   const [errorsLogin, setErrorsLogin] = useState({});
//   const location = useLocation();
//   const tokenFromUrl = new URLSearchParams(location.search).get("token");
//   console.log("fieldsLogin", fieldsLogin)

//   if (!tokenFromUrl) {
//     navigate("/error");
//     return null;
//   }
//   const validateField = () => {
//     let formIsValid = true;
//     let errors = {};
//     const passwordMinLength = 6;

//     if (!fieldsLogin.email || fieldsLogin.email.trim() === "") {
//       formIsValid = false;
//       errors.email = "Enter user name";
//     }
//     if (!fieldsLogin.password || fieldsLogin.password.trim() === "") {
//       formIsValid = false;
//       errors.password = "Enter password";
//     } else if (fieldsLogin.password.length < passwordMinLength) {
//       formIsValid = false;
//       errors.password = `Password must be at least ${passwordMinLength} characters long.`;
//     }
//     setErrorsLogin(errors);
//     return formIsValid;
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;

//     setFields((prevState) => ({
//       ...prevState,
//       [name]: value,
//     }));

//     setFormErrors((prevErrors) => ({
//       ...prevErrors,
//       [name]: validateField(name, value),
//     }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     const passwordError = validateField("password", fieldsLogin.password);
//     const confirmPasswordError = validateField(
//       "password",
//       fieldsLogin.confirmPassword
//     );

//     if (passwordError || confirmPasswordError) {
//       setFormErrors({
//         password: passwordError,
//         confirmPassword: confirmPasswordError,
//       });
//       return;
//     }

//     if (fieldsLogin.password !== fieldsLogin.confirmPassword) {
//       setFormErrors({
//         ...formErrors,
//         confirmPassword: "Passwords do not match.",
//       });
//       return;
//     }

//     const resultAction = await dispatch(
//       resetPassword({
//         password: fieldsLogin.password,
//         confirmPassword: fieldsLogin.confirmPassword,
//         token: tokenFromUrl,
//       }).then((res) => {
//         console.log("resssssssssssssss", res)
//         if (res?.payload?.error) {
//           dispatch(showError(res?.payload?.message))
//         } else {
//           dispatch(showSuccess(res?.payload?.message))
//         }
//       }).catch((err) => {
//         console.log("Error", err)
//       })
//     )
//     if (resetPassword.fulfilled.match(resultAction)) {
//       setFormErrors({});
//       navigate("/login");
//     }
//   };

//   return (
//     <FormLayout
//       title="Set New Password"
//       subTitle="New Password should be unique."
//       buttonText={loading ? "Loading..." : "Set Password"}
//       onSubmit={handleSubmit}
//       linkTo=""
//     >
//       <div className="flex flex-col space-y-4">
//         {/* Password Input */}
//         {/* <Input
//           labelName="New Password"
//           name="password"
//           placeholder="Your new password"
//           type="password"
//           value={fieldsLogin.password}
//           onChange={handleInputChange}
//           errorMessage={errorsLogin.password}
//           required
//         /> */}
//         <PasswordInput
//           id="password"
//           name="password"
//           label="New Password"
//           value={fieldsLogin.password}
//           placeholder="Enter your new password"
//           icon={CiLock}
//           onChange={handleInputChange}
//           errorMessage={errorsLogin.password}
//         />
//         {/* <Input
//           labelName="Confirm New Password"
//           name="confirmPassword"
//           placeholder="Confirm your new password"
//           type="password"
//           value={fieldsLogin?.confirmPassword}
//           onChange={handleInputChange}
//           errorMessage={errorsLogin?.confirmPassword}
//           required
//         /> */}

//         <PasswordInput
//           id="confirmPassword"
//           name="confirmPassword"
//           label="Confirm New Password"
//           value={fieldsLogin?.confirmPassword}
//           placeholder="Enter your new confirm Password"
//           icon={CiLock}
//           onChange={handleInputChange}
//           errorMessage={errorsLogin?.confirmPassword}
//         />

//         {error && <p className="text-red-500">{error}</p>}
//       </div>
//     </FormLayout>
//   );
// };

// export default ResetPassword;
