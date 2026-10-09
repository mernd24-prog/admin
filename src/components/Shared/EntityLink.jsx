import React from "react";
import { Link } from "react-router-dom";
import { getStoredRole, isAllowedSellerRole } from "../../_helpers/authStorage";

const shortOrderId = (value) => String(value || "").slice(-8);

const entityLabel = (label, className = "") => (
  <span className={`font-medium text-gray-700 ${className}`}>{label}</span>
);

const sellerUserIsLoggedIn = () => isAllowedSellerRole(getStoredRole());

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const joinName = (value = {}) =>
  [value.firstName || value.first_name, value.lastName || value.last_name]
    .filter(Boolean)
    .join(" ");

export const sellerIdentityFrom = (row = {}) => {
  const seller = row.seller || row.vendor || row.relations?.seller || {};
  const organization =
    row.organization || row.store || row.relations?.organization || {};

  return {
    id: firstValue(
      row.sellerId,
      row.seller_id,
      seller.id,
      seller._id,
      seller.sellerId,
    ),
    storeName: firstValue(
      row.storeName,
      row.store_name,
      row.organizationName,
      row.organization_name,
      row.businessName,
      row.business_name,
      organization.name,
      organization.organizationName,
      organization.businessName,
      seller.storeName,
      seller.businessName,
      seller.companyName,
    ),
    loginName: firstValue(
      row.sellerName,
      row.seller_name,
      row.sellerEmail,
      row.seller_email,
      seller.displayName,
      seller.fullName,
      seller.name,
      joinName(seller.profile || seller),
      seller.email,
    ),
  };
};

export const customerIdentityFrom = (row = {}) => {
  const customer =
    row.buyer ||
    row.customer ||
    row.user ||
    row.relations?.buyer ||
    row.relations?.customer ||
    {};
  const address = row.shippingAddress || row.shipping_address || {};
  return {
    id: firstValue(
      row.buyerId,
      row.buyer_id,
      row.customerId,
      row.customer_id,
      row.userId,
      row.user_id,
      customer.id,
      customer._id,
    ),
    name: firstValue(
      row.buyerName,
      row.buyer_name,
      row.customerName,
      row.customer_name,
      row.userName,
      customer.displayName,
      customer.fullName,
      customer.name,
      joinName(customer.profile || customer),
      address.fullName,
      address.name,
    ),
    loginName: firstValue(
      row.buyerEmail,
      row.buyer_email,
      row.customerEmail,
      row.customer_email,
      row.email,
      customer.email,
      address.email,
    ),
  };
};

const IdentityContent = ({ primary, secondary, fallback }) => (
  <div className="group min-w-0 text-left">
    <div className="truncate text-sm font-semibold text-gray-800 transition-colors group-hover:text-[var(--admin-blue)]">
      {primary || fallback}
    </div>
    {secondary && secondary !== primary && (
      <div className="truncate text-xs text-gray-400 transition-colors group-hover:text-[var(--admin-blue)]">
        {secondary}
      </div>
    )}
  </div>
);

// Order Link
export function OrderLink({
  orderId,
  orderNumber,
  prefix = "#",
  className = "",
  children,
}) {
  if (!orderId) return <span className="text-gray-400">—</span>;

  const label =
    children ||
    (orderNumber
      ? `${prefix}${orderNumber}`
      : `${prefix}${shortOrderId(orderId)}`);

  return (
    <Link
      to={`/app/orders/view/${encodeURIComponent(String(orderId))}`}
      className={`font-mono text-xs font-medium text-[var(--admin-navy)] hover:underline ${className}`}
      // title={`Open order ${orderNumber || orderId}`}
    >
      {label}
    </Link>
  );
}

// User Link
export function UserLink({
  userId,
  userName,
  className = "",
  children,
  onClick,
}) {
  if (!userId) {
    return <span className="text-gray-400">{userName || "N/A"}</span>;
  }

  const label = children || userName || "N/A";

  if (sellerUserIsLoggedIn()) return entityLabel(label, className);

  return (
    <Link
      to={`/app/users/view/${encodeURIComponent(String(userId))}`}
      className={`font-medium text-[var(--admin-navy)] hover:underline ${className}`}
      // title={`Open user ${userName || userId}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
    >
      {label}
    </Link>
  );
}

// Seller Link
export function SellerLink({
  sellerId,
  sellerName,
  className = "",
  children,
  onClick,
}) {
  if (!sellerId) {
    return <span className="text-gray-400">{sellerName || "N/A"}</span>;
  }

  const label = children || sellerName || "N/A";

  if (sellerUserIsLoggedIn()) return entityLabel(label, className);

  return (
    <Link
      to={`/app/seller/view/${encodeURIComponent(String(sellerId))}`}
      className={`font-medium text-[var(--admin-navy)] hover:underline ${className}`}
      // title={`Open seller ${sellerName || sellerId}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
    >
      {label}
    </Link>
  );
}

export function SellerIdentity({
  row = {},
  sellerId,
  storeName,
  loginName,
  className = "",
  link = true,
}) {
  const identity = sellerIdentityFrom(row);
  const id = sellerId || identity.id;
  const store = storeName || identity.storeName;
  const login = loginName || identity.loginName;
  const content = (
    <IdentityContent
      primary={store || login}
      secondary={store ? login : undefined}
      fallback="Seller details unavailable"
    />
  );
  return link && id ? (
    <SellerLink
      sellerId={id}
      sellerName={store || login}
      className={`block ${className}`}
    >
      {content}
    </SellerLink>
  ) : (
    content
  );
}

export function CustomerIdentity({
  row = {},
  userId,
  name,
  loginName,
  className = "",
  link = true,
}) {
  const identity = customerIdentityFrom(row);
  const id = userId || identity.id;
  const displayName = name || identity.name;
  const login = loginName || identity.loginName;
  const content = (
    <IdentityContent
      primary={displayName || login}
      secondary={displayName ? login : undefined}
      fallback="Customer details unavailable"
    />
  );
  return link && id ? (
    <UserLink
      userId={id}
      userName={displayName || login}
      className={`block ${className}`}
    >
      {content}
    </UserLink>
  ) : (
    content
  );
}
