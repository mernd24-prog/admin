import { createContext, useContext, useState } from "react";

const KYCContext = createContext();

export const KYCProvider = ({ children }) => {
  const [step, setStep] = useState(0);

  const stepToSection = (step) => {
    switch (step) {
      case 1:
        return "personal";
      case 2:
        return "business";
      case 3:
        return "bank";
      case 4:
        return "review";
      case 5:
        return "status";
      default:
        return "status";
    }
  };

  const currentSection = stepToSection(step);

  return (
    <KYCContext.Provider value={{ step, setStep, currentSection }}>
      {children}
    </KYCContext.Provider>
  );
};

export const useKYC = () => useContext(KYCContext);