import React from "react";

const OtpCodeInputs = ({
  codeInputRefs,
  verificationCode,
  onCodeChange,
  onCodeKeyDown,
  onCodePaste,
  containerClassName = "",
  inputClassName = "",
  getInputStyle,
}) => (
  <div className={containerClassName}>
    {[0, 1, 2, 3, 4, 5].map((index) => (
      <input
        key={index}
        ref={codeInputRefs[index]}
        type="text"
        maxLength={1}
        className={inputClassName}
        style={getInputStyle ? getInputStyle(index) : undefined}
        value={verificationCode[index]}
        onChange={(event) => onCodeChange(index, event.target.value)}
        onKeyDown={(event) => onCodeKeyDown(index, event)}
        onPaste={index === 0 ? onCodePaste : undefined}
      />
    ))}
  </div>
);

export default OtpCodeInputs;
