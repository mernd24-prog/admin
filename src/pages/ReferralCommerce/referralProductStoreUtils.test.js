import {
  resolveProductStoreId,
  resolveProductStoreName,
  resolveStoreKey,
} from "./referralProductStoreUtils";

describe("referral product store matching", () => {
  it("prefers organization and seller identifiers when matching a selected seller", () => {
    const product = {
      sellerId: "seller-42",
      organizationId: "org-7",
      organizationSnapshot: {
        storeDisplayName: "Aarav Consumer Products",
      },
    };

    expect(resolveProductStoreId(product)).toBe("org-7");
    expect(resolveStoreKey(product)).toBe("org-7");
    expect(resolveProductStoreName(product)).toBe("Aarav Consumer Products");
  });

  it("falls back to seller ids if no store or organization id exists", () => {
    const product = {
      sellerId: "seller-99",
      title: "Zen Bottle",
      organizationSnapshot: {},
    };

    expect(resolveProductStoreId(product)).toBe("seller-99");
    expect(resolveStoreKey(product)).toBe("seller-99");
    expect(resolveProductStoreName(product)).toBe("Unnamed Store");
  });
});
