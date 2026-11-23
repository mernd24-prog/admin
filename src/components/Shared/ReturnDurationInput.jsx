import React, { useState } from "react";
import Input from "../Atoms/Input/Input";
import FilterSelect from "../Atoms/FilterSelect/FilterSelect";

export const formatReturnDuration = (value) => {
  const total = Math.max(0, Math.round(Number(value || 0) * 1440));
  const parts = [
    [Math.floor(total / 1440), "day"],
    [Math.floor((total % 1440) / 60), "hour"],
    [total % 60, "minute"],
  ].filter(([amount]) => amount > 0);
  return parts.map(([amount, unit]) => `${amount} ${unit}${amount === 1 ? "" : "s"}`).join(" ") || "0 minutes";
};

const localDateTime = (timestamp) => {
  const date = new Date(timestamp);
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function ReturnDurationInput({
  value,
  onChange,
  maxDays = 365,
  minMinutes = 0,
  label = "Return Window",
  error,
  onBlur,
  showDateTimePicker = true,
  dataErrorField = "warranty.returnPolicy.returnWindowDays",
}) {
  // Keep a stable reference while editing so the selected duration never drifts.
  const [referenceTime] = useState(() => Math.floor(Date.now() / 60000) * 60000);
  const [pickerError, setPickerError] = useState("");
  const [touched, setTouched] = useState(false);
  const total = Math.round(Number(value || 0) * 1440);
  const values = [Math.floor(total / 1440), Math.floor((total % 1440) / 60), total % 60];
  const limits = [maxDays, 23, 59];
  const toMinutes = (parts) => parts[0] * 1440 + parts[1] * 60 + parts[2];
  const rangeError = !Number.isFinite(total) || total < minMinutes || total > maxDays * 1440
    ? `Choose a return window between ${minMinutes} minute${minMinutes === 1 ? "" : "s"} and ${maxDays} days.`
    : "";
  const validationError = pickerError || error || (touched ? rangeError : "");
  if (showDateTimePicker) {
    return (
      <div className="min-w-0 h-full" {...(dataErrorField ? { "data-error-field": dataErrorField } : {})}>
        <Input
          labelName={label}
          required={minMinutes > 0}
          type="datetime-local"
          step={60}
          min={localDateTime(referenceTime + Math.max(minMinutes, 1) * 60000)}
          max={localDateTime(referenceTime + maxDays * 86400000)}
          value={Number.isFinite(total) && total > 0 ? localDateTime(referenceTime + total * 60000) : ""}
          error={validationError}
          onBlur={(event) => {
            setTouched(true);
            onBlur?.(event);
          }}
          helperText={Number.isFinite(total) && total > 0
            ? `${formatReturnDuration(value)} from delivery.`
            : "Choose a date and time to set the return window."}
          onChange={(event) => {
            const selected = new Date(event.target.value).getTime();
            const minutes = (selected - referenceTime) / 60000;
            if (!Number.isInteger(minutes) || minutes < Math.max(minMinutes, 1) || minutes > maxDays * 1440) {
              setPickerError(`Select a future date and time within ${maxDays} days of the reference time.`);
              return;
            }
            setPickerError("");
            setTouched(true);
            onChange(minutes / 1440);
          }}
        />

      </div>
    );
  }
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-3 gap-2">
        {["Days", "Hours", "Minutes"].map((unit, index) => {
          const options = Array.from({ length: limits[index] + 1 }, (_, number) => ({ value: number, label: String(number) }))
            .filter((option) => {
              const next = [...values];
              next[index] = option.value;
              return toMinutes(next) <= maxDays * 1440;
            });
          return (
            <FilterSelect
              key={unit}
              label={unit}
              options={options}
              value={options.find((option) => option.value === values[index]) || null}
              isClearable={false}
              isSearchable
              onBlur={onBlur}
              error={validationError ? " " : ""}
              onChange={(option) => {
                if (!option) return;
                setPickerError("");
                const next = [...values];
                next[index] = option.value;
                const minutes = toMinutes(next);
                if (Number.isInteger(minutes) && minutes >= 0 && minutes <= maxDays * 1440) onChange(minutes / 1440);
              }}
            />
          );
        })}
      </div>
      {validationError && <p role="alert" className="text-sm text-red-600">{validationError}</p>}
    </fieldset>
  );
}
