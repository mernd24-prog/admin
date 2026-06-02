import React from 'react';
import { MdCheck } from 'react-icons/md';

/**
 * StepperForm
 *
 * Generic multi-step form wrapper used by ProductEditor, OnboardingFlow, etc.
 *
 * Props:
 *   steps    {Array<{label, icon?, optional?}>}
 *   current  {number}   — 0-indexed active step
 *   onChange {(index: number) => void}  — called when a completed step header is clicked
 *   children {React.ReactNode}  — the active step content
 *   onBack   {() => void}
 *   onNext   {() => void}
 *   onSubmit {() => void}
 *   nextLabel    {string}
 *   submitLabel  {string}
 *   loading      {boolean}
 *   backDisabled {boolean}
 *   nextDisabled {boolean}
 */
const StepperForm = ({
  steps = [],
  current = 0,
  onChange,
  children,
  onBack,
  onNext,
  onSubmit,
  nextLabel = 'Next',
  submitLabel = 'Submit',
  loading = false,
  backDisabled = false,
  nextDisabled = false,
}) => {
  const isLast = current === steps.length - 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicators */}
      <div className="admin-card px-5 py-4 overflow-x-auto">
        <div className="flex items-center min-w-max">
          {steps.map((step, i) => {
            const done    = i < current;
            const active  = i === current;

            return (
              <React.Fragment key={i}>
                {/* Step node */}
                <div
                  className={`flex flex-col items-center gap-1.5 ${(done && onChange) ? 'cursor-pointer' : ''}`}
                  onClick={() => done && onChange?.(i)}
                >
                  {/* Circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                      done    ? 'bg-green-500 text-white shadow-sm' :
                      active  ? 'bg-[var(--admin-navy)] text-white shadow-md ring-4 ring-[var(--admin-blue)]/10' :
                                'bg-[var(--admin-blue-soft)] text-[var(--admin-muted)]'
                    }`}
                  >
                    {done ? <MdCheck size={16} /> : i + 1}
                  </div>
                  {/* Label */}
                  <span className={`text-[10px] font-medium whitespace-nowrap ${
                    active  ? 'text-[var(--admin-navy)]' :
                    done    ? 'text-green-600' :
                              'text-gray-400'
                  }`}>
                    {step.label}
                    {step.optional && <span className="text-gray-300 ml-0.5">(opt)</span>}
                  </span>
                </div>

                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors duration-300 ${i < current ? 'bg-green-400' : 'bg-[var(--admin-line)]'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0">{children}</div>

      {/* Navigation */}
      <div className="admin-card px-5 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={backDisabled || current === 0}
          className="admin-btn-secondary !min-h-9 px-5 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Back
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            Step {current + 1} of {steps.length}
          </span>
        </div>

        <button
          type="button"
          onClick={isLast ? onSubmit : onNext}
          disabled={nextDisabled || loading}
          className="admin-btn-primary !min-h-9 px-6 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          {isLast ? submitLabel : nextLabel}
        </button>
      </div>
    </div>
  );
};

export default StepperForm;
