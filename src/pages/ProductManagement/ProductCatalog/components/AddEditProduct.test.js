import { resolveSellerContext } from "./AddEditProduct";

describe("resolveSellerContext", () => {
  it("prefers the logged-in seller and active organization for seller-panel users", () => {
    const user = {
      ownerSellerId: "seller-101",
      sellerId: "seller-999",
      organizationId: "org-legacy",
      role: "seller-admin",
    };

    expect(resolveSellerContext(user, "org-active")).toEqual({
      sellerId: "seller-101",
      organizationId: "org-active",
    });
  });

  it("falls back to the seller object when the top-level user is missing the seller id", () => {
    const user = {
      seller: {
        id: "seller-202",
      },
      role: "seller",
    };

    expect(resolveSellerContext(user, "org-2")).toEqual({
      sellerId: "seller-202",
      organizationId: "org-2",
    });
  });
});
