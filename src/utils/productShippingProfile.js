export const clearedShippingProfile = () => ({
  shippingProfileId: null,
  copiedFromShippingTemplateId: '', copiedFromShippingTemplateName: '',
  shippingCharge: '', additionalCost: '', handlingCharge: '', freeShippingMinOrder: '',
  processingDays: '', estimatedDaysMin: '', estimatedDaysMax: '',
  shippingMethod: '', freeShipping: false,
  serviceabilityMode: 'all_pincodes', allowPincodes: [], serviceablePincodes: [],
  regions: [], states: [], cities: [],
});

// null means intentionally removed. Omitting this field retains the saved profile.
export const preserveShippingProfileSelection = (shipping, profileId) => ({
  ...shipping, shippingProfileId: profileId || null,
});
