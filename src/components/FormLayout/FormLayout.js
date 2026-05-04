import React from "react";


const FormLayout = ({
  title,
  subTitle,
  onSubmit,
  children,
  handleForgotPassword
}) => {
  return (
    <div className="relative w-full min-h-screen  flex items-center justify-center overflow-hidden   md:p-0 p-4">
      <div className="absolute z-10 bg-white w-full md:h-[40vh] h-[40vh]  top-0"></div>
      <div className=" md:max-w-[450px] w-full bg-[#FFFFFF] p-6  md:p-10   z-50">
        <div className="flex flex-col gap-6 sm:gap-9">

          <div>
            <h2 className="">{title}</h2>
            <p className="text-sm text-[#6c757d] leading-6 mt-3">
              {subTitle}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {children}
   
           
          </form>
        </div>
      </div>
    </div>
  );
};

export default FormLayout;
