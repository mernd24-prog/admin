import React from 'react';

const DownloadButton = ({onClick}) => {
    return (
        <div className="relative w-[200px] mx-auto mt-36" onClick={onClick}>
            <div className="group cursor-pointer">
                <div
                    className="block h-[50px] w-full leading-[50px] text-black text-sm text-center uppercase font-semibold bg-white rounded-[3px] transition-all active:bg-gradient-to-b active:from-[#00b7ea] active:to-[#009ec3]"
                >
                    Download Sample
                </div>
                <p
                    className="absolute z-[-1] w-[180px] h-[40px] ml-[10px] text-center text-black font-bold rounded-[3px] transition-all duration-500 mt-[-50px] group-hover:mt-[-80px] group-hover:leading-[30px]"
                >
                    click to start
                </p>
                <p
                    className="absolute z-[-1] w-[180px] h-[40px] ml-[10px] text-center text-black font-bold rounded-[3px] transition-all duration-500 mt-[-50px] group-hover:mt-[-10px] group-hover:leading-[50px]"
                >
                    5MB (.csv)
                </p>
            </div>
        </div>
    );
};

export default DownloadButton;
