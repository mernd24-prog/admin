import React from 'react';

export const TitleValue = ({ title = "", value = "" }) => {
  return (
    <div className="mb-2 grid grid-cols-2">
      <p className="text-sm text-black/60 font-medium">{title}</p>
      <p className="text-sm text-black/60 text-end">{value}</p>
    </div>
  );
};

export const TitleValue2 = ({ title = "", value = "" }) => {
  return (
    <div className="mb-2">
      <p className="text-sm text-black/60 font-medium">{title}</p>
      <p className="text-sm text-black/60">{value}</p>
    </div>
  );
};
