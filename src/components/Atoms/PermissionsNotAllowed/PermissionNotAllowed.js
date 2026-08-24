import { BsArrowLeft } from "react-icons/bs";
import Button from "../buttons/button";

const PermissionNotAllowed = ({
  contactPerson = "your administrator",
  contactEmail = "admin@example.com",
  permissionName = "this Module",
  customMessage,
  showGoBackButton = true,
  loading = false,
}) => {
  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  if (!loading) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 flex items-center justify-center px-4 py-10">
      <div className=" p-8 max-w-lg w-full text-center ">
        <img
          src="https://res.cloudinary.com/razeshzone/image/upload/v1588316204/house-key_yrqvxv.svg"
          alt="Access Denied"
          className="w-28 mx-auto mb-6"
        />

        <h1 className="text-[120px] font-bold text-gray-800 tracking-widest flex justify-center space-x-2 mb-6">
          <span className="animate-pulse text-gray-800">4</span>
          <span className="animate-pulse delay-150 text-gray-800">0</span>
          <span className="animate-pulse delay-300 text-red-500">3</span>
        </h1>

        <h2 className="text-2xl font-bold text-gray-700 mb-4">Access Denied</h2>

        <p className="text-gray-600 text-base mb-6 leading-relaxed">
          {customMessage || (
            <>
              You don't have access to <strong>{permissionName}</strong>.
              <br />
              Please contact <strong>{contactPerson}</strong> at{" "}
              <a
                href={`mailto:${contactEmail}`}
                className="text-blue-600 underline hover:text-blue-800"
              >
                {contactEmail}
              </a>{" "}
              to request access.
            </>
          )}
        </p>

        {showGoBackButton && (
          <div className="flex justify-center">
            <Button
              onClick={handleGoBack}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-black font-medium px-6 py-3 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <BsArrowLeft className="w-5 h-5" />
              Go Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionNotAllowed;
