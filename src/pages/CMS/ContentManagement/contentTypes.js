// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT TYPES REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════
//
// HOW TO ADD A NEW CONTENT TYPE
// ─────────────────────────────
// 1. Add an entry to CONTENT_TYPES below.
// 2. That's it — the sidebar and route are created automatically.
//
// FIELD REFERENCE
// ───────────────
// key          URL segment used in /app/content-management/<key>
// label        Human-readable name shown in the tab bar
// pageType     Value stored in backend `pageType` field (keep lowercase-kebab,
//              never change after records are created)
// singleton    true  → only ONE record (policy pages)
//              false → unlimited records (FAQs, banners, etc.)
// customerSlug For singleton=true: the fixed slug the storefront fetches
// defaultTitle Pre-filled title when creating a singleton page
// description  One-line description shown in the empty-state card
// customerRoute Informational — the customer-facing URL for this content
// bodyHint     Hint shown in the Body editor
// ═══════════════════════════════════════════════════════════════════════════════

export const CONTENT_TYPES = [
  {
    key: 'all',
    label: 'All Content',
    pageType: null,
    singleton: false,
    customerSlug: null,
    defaultTitle: '',
    description: 'View and manage every content page regardless of type.',
    customerRoute: null,
    bodyHint: 'Write the page body here.',
  },

  // ── Multi-entry types ─────────────────────────────────────────────────────
  {
    key: 'content',
    label: 'Content Pages',
    pageType: 'content',
    singleton: false,
    customerSlug: null,
    defaultTitle: '',
    description: 'General-purpose content pages (blogs, landing pages, promos, etc.).',
    customerRoute: null,
    bodyHint: 'Write the full page content here.',
  },
  {
    key: 'faq',
    label: 'FAQs',
    pageType: 'faq',
    singleton: false,
    customerSlug: null,
    defaultTitle: '',
    description: 'Frequently asked questions shown on the customer FAQ page.',
    customerRoute: '/faq',
    bodyHint: 'Write a short introduction or description for this FAQ group.',
  },
  {
    key: 'homepage-slide',
    label: 'Homepage Slides',
    pageType: 'homepage-slide',
    singleton: false,
    customerSlug: null,
    defaultTitle: '',
    description: 'Hero carousel slides shown at the top of the customer homepage.',
    customerRoute: '/',
    bodyHint: 'Optional slide caption or call-to-action text.',
  },
  {
    key: 'banner-location',
    label: 'Banner Locations',
    pageType: 'banner-location',
    singleton: false,
    customerSlug: null,
    defaultTitle: '',
    description: 'Named banner slots available across the storefront layout.',
    customerRoute: null,
    bodyHint: 'Optional notes about this banner placement.',
  },
  {
    key: 'promotion-banner',
    label: 'Promo Banners',
    pageType: 'promotion-banner',
    singleton: false,
    customerSlug: null,
    defaultTitle: '',
    description: 'Promotional banners that appear in product listings and category pages.',
    customerRoute: null,
    bodyHint: 'Promotional text shown inside the banner.',
  },
  {
    key: 'holiday',
    label: 'Holidays',
    pageType: 'holiday',
    singleton: false,
    customerSlug: null,
    defaultTitle: '',
    description: 'Holiday dates used for delivery blackout and scheduling logic.',
    customerRoute: null,
    bodyHint: 'Optional description for this holiday entry.',
  },

  // ── Singleton types ───────────────────────────────────────────────────────
  {
    key: 'privacy-policy',
    label: 'Privacy Policy',
    pageType: 'privacy-policy',
    singleton: true,
    customerSlug: 'privacy-policy',
    defaultTitle: 'Privacy Policy',
    description: "Your platform's privacy policy — visible to customers at /privacy-policy.",
    customerRoute: '/privacy-policy',
    bodyHint: 'Write the full privacy policy text here. HTML is supported.',
  },
  {
    key: 'return-policy',
    label: 'Return Policy',
    pageType: 'return-policy',
    singleton: true,
    customerSlug: 'return-policy',
    defaultTitle: 'Return Policy',
    description: 'Your return and refund policy — visible to customers at /return-policy.',
    customerRoute: '/return-policy',
    bodyHint: 'Write the full return policy text here. HTML is supported.',
  },
  {
    key: 'payment-policy',
    label: 'Payment Policy',
    pageType: 'payment-policy',
    singleton: true,
    customerSlug: 'payment-policy',
    defaultTitle: 'Payment Policy',
    description: 'Accepted payment methods and billing terms — visible to customers.',
    customerRoute: '/payment-policy',
    bodyHint: 'Write the payment policy here. Include accepted methods and billing cycle.',
  },
  {
    key: 'terms-and-conditions',
    label: 'Terms & Conditions',
    pageType: 'terms-and-conditions',
    singleton: true,
    customerSlug: 'terms-and-conditions',
    defaultTitle: 'Terms & Conditions',
    description: 'Legal terms governing use of the platform.',
    customerRoute: '/terms-and-conditions',
    bodyHint: 'Write the terms and conditions here. HTML is supported.',
  },
  {
    key: 'help-and-support',
    label: 'Help & Support',
    pageType: 'help-and-support',
    singleton: true,
    customerSlug: 'help-and-support',
    defaultTitle: 'Help & Support',
    description: 'Help center content shown to customers at /support.',
    customerRoute: '/support',
    bodyHint: 'Write the help and support content here.',
  },
];

export const CONTENT_TYPE_MAP = Object.fromEntries(CONTENT_TYPES.map((t) => [t.key, t]));

export const CONTENT_SIDEBAR_ROUTES = [
  { label: 'All Content', route: 'content-management' },
  ...CONTENT_TYPES.filter((t) => t.key !== 'all').map((t) => ({
    label: t.label,
    route: `content-management/${t.key}`,
  })),
];
