import { clearedShippingProfile, preserveShippingProfileSelection } from './productShippingProfile';
test('clearing a profile resets its inherited fields without sharing array state', () => {
  const old = { shippingProfileId: 'old-profile', shippingCharge: 149, estimatedDaysMin: 3, allowPincodes: ['110001'] };
  const cleared = { ...old, ...clearedShippingProfile() };
  expect(cleared.shippingProfileId).toBeNull();
  expect(cleared.shippingCharge).toBe('');
  expect(cleared.estimatedDaysMin).toBe('');
  expect(cleared.allowPincodes).toEqual([]);
  expect(clearedShippingProfile().allowPincodes).not.toBe(cleared.allowPincodes);
});
test('save preserves explicit null after empty values were compacted', () => {
  const serialized = JSON.parse(JSON.stringify(preserveShippingProfileSelection({ codAvailable: true }, null)));
  expect(serialized).toEqual({ codAvailable: true, shippingProfileId: null });
});
test('selected profile remains in payload', () => {
  expect(preserveShippingProfileSelection({}, 'new-profile').shippingProfileId).toBe('new-profile');
});
