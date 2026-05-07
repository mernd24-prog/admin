import React from 'react';

const Nodata = ({ nodataLabel, nodataDesc }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md p-6 mx-auto space-y-4">
      <div className="w-52 flex items-center justify-center">
        <img src='/Img/noData.png' alt='' />
      </div>
      <h2 className="text-xl font-semibold text-gray-900">{nodataLabel}</h2>
      <p className="text-center text-gray-600">{nodataDesc}</p>
      {/* <button className="flex items-center px-4 py-2 space-x-2 text-black font-[600] transition-colors bg-[#00811D] rounded-md focus:outline-none">
        <span className=''>{buttonLabel}</span>
      </button> */}
    </div>
  );
};

export default Nodata;