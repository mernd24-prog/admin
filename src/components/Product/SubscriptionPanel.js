import React, { useState } from 'react';
import useDropdownOptions from '../../hooks/useDropdownOptions';

const Field = ({ label, hint, children }) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-400">{hint}</p>}
  </div>
);

/**
 * Subscription product configuration panel.
 *
 * Props:
 *  subscription - object matching subscription sub-schema
 *  onChange     - (field, value) => void  (field = 'subscription.xxx')
 */
const SubscriptionPanel = ({ subscription = {}, onChange }) => {
  const [featureInput, setFeatureInput] = useState('');
  const billingCycles = useDropdownOptions('subscription-billing-cycles');

  const set = (key, val) => onChange(`subscription.${key}`, val);

  const addFeature = () => {
    if (!featureInput.trim()) return;
    const existing = Array.isArray(subscription.features) ? subscription.features : [];
    if (!existing.includes(featureInput.trim())) {
      set('features', [...existing, featureInput.trim()]);
    }
    setFeatureInput('');
  };

  const removeFeature = (f) => {
    set('features', (subscription.features || []).filter((x) => x !== f));
  };

  return (
    <div className="space-y-5">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <p className="text-xs text-purple-700 font-medium">Subscription Product</p>
        <p className="text-xs text-purple-600 mt-0.5">
          Customers are billed on a recurring basis. Configure the billing cycle, trial, and pricing below.
        </p>
      </div>

      {/* Billing cycle + recurring price */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Billing Cycle *">
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4094]"
            value={subscription.billingCycle || 'monthly'}
            onChange={(e) => set('billingCycle', e.target.value)}
          >
            {billingCycles.options.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Recurring Price (₹) *" hint="Charged each billing cycle.">
          <input
            type="number"
            min={0}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4094]"
            placeholder="e.g. 499"
            value={subscription.recurringPrice || ''}
            onChange={(e) => set('recurringPrice', Number(e.target.value))}
          />
        </Field>
      </div>

      {/* Trial + setup fee */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Trial Period (days)" hint="0 = no free trial.">
          <input
            type="number"
            min={0}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4094]"
            placeholder="e.g. 14"
            value={subscription.trialDays || ''}
            onChange={(e) => set('trialDays', Number(e.target.value) || 0)}
          />
        </Field>

        <Field label="Setup Fee (₹)" hint="One-time charge at sign-up. 0 = no setup fee.">
          <input
            type="number"
            min={0}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4094]"
            placeholder="e.g. 0"
            value={subscription.setupFee || ''}
            onChange={(e) => set('setupFee', Number(e.target.value) || 0)}
          />
        </Field>
      </div>

      {/* Grace period */}
      <Field label="Grace Period (days)" hint="Extra days after a failed payment before cancelling. Default 3 days.">
        <input
          type="number"
          min={0}
          max={30}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4094]"
          placeholder="3"
          value={subscription.gracePeriodDays || ''}
          onChange={(e) => set('gracePeriodDays', Number(e.target.value) || 0)}
        />
      </Field>

      {/* Features list */}
      <Field label="Plan Features" hint="List what's included in this plan (e.g. 'Unlimited storage', '24/7 support').">
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4094]"
              placeholder="Add a feature…"
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
            />
            <button
              type="button"
              onClick={addFeature}
              className="px-3 py-2 bg-[#3E4094] text-white text-sm rounded-md hover:bg-[#2e3074]"
            >
              Add
            </button>
          </div>
          {(subscription.features || []).length > 0 && (
            <ul className="space-y-1">
              {(subscription.features || []).map((f, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                  <span className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </span>
                  <button type="button" onClick={() => removeFeature(f)} className="text-gray-400 hover:text-red-500 ml-2">×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Field>

      {/* Cancellation policy */}
      <Field label="Cancellation Policy">
        <textarea
          rows={2}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4094] resize-none"
          placeholder="e.g. Cancel anytime. No refunds for the current billing period."
          value={subscription.cancellationPolicy || ''}
          onChange={(e) => set('cancellationPolicy', e.target.value)}
        />
      </Field>

      {/* Toggles */}
      <div className="space-y-3">
        {[
          {
            key: 'autoRenew',
            label: 'Auto-renew enabled by default',
            hint: 'Subscription renews automatically unless cancelled.',
            defaultVal: true,
          },
          {
            key: 'pauseAllowed',
            label: 'Allow customers to pause',
            hint: 'Customers can temporarily pause their subscription.',
            defaultVal: false,
          },
        ].map(({ key, label, hint, defaultVal }) => (
          <div key={key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <input
              id={`sub-${key}`}
              type="checkbox"
              className="mt-0.5 accent-[#3E4094]"
              checked={subscription[key] !== undefined ? subscription[key] : defaultVal}
              onChange={(e) => set(key, e.target.checked)}
            />
            <div>
              <label htmlFor={`sub-${key}`} className="text-sm font-medium text-gray-700 cursor-pointer">{label}</label>
              <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPanel;
