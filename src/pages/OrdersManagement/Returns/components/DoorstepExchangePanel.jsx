import React from "react";
import FormSection from "../../../../components/Atoms/FormSection/FormSection";
import Button from "../../../../components/Atoms/buttons/button";
import { StatusBadge } from "../../../../components/Shared";
import { doorstepExchangeStage, getReturnShipmentLinks, doorstepCollectionStatusLabel } from "../../../../utils/returnTrackingOptions";
import { formatDateTime12Hour } from "../../../../utils/formatters";

export default function DoorstepExchangePanel({ request, isSeller, canViewShipments, loading, onAction, onShipment, onDetails }) {
  const stage = doorstepExchangeStage(request, isSeller);
  const links = getReturnShipmentLinks(request);
  const closed = ["closed", "rejected"].includes(request.status);
  return (
    <div className="space-y-5 text-sm">
      <FormSection title={request.returnNumber || "Doorstep exchange"} description="One visit: inspect both items with the customer, then collect the old item and hand over the accepted replacement together.">
        <StatusBadge status={request.status} label={doorstepCollectionStatusLabel(request)} dot />
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <h3 className="font-semibold text-gray-900">{stage.title}</h3>
          <p className="mt-2 leading-6 text-gray-600">{stage.description}</p>
          {request.status === 'pickup_failed' && request.collectionQc?.exchangeFailure && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="font-semibold text-amber-900">Why the exchange failed</p>
            <p className="mt-1 whitespace-pre-wrap text-amber-900">{request.collectionQc.exchangeFailure.reason}</p>
            <p className="mt-2 text-xs text-gray-600">Recorded: {formatDateTime12Hour(request.collectionQc.exchangeFailure.at)}</p>
          </div>}
          {request.status === "reverse_pickup_scheduled" && !request.collectionQc?.collectedAt && <Button className="mt-4 mr-3" requiredModule="returns" requiredAction="update" disabled={loading} onClick={() => onAction("exchange_failure")}>Record Exchange Failure</Button>}
          {stage.action && <Button className="mt-4" requiredModule="returns" requiredAction="update" disabled={loading} onClick={() => onAction(stage.action)}>{stage.label}</Button>}
        </div>
      </FormSection>
      <details className="rounded-lg border border-gray-200 p-4">
        <summary className="cursor-pointer font-semibold text-gray-900">Shipment Details</summary>
        <p className="mt-3 text-xs leading-5 text-gray-600">One courier visit covers collection and replacement handover. Both internal parcel records may share the same exchange booking reference.</p>
        <div className="mt-3 space-y-3">
          {request.collectionQc?.sameVisitExchange ? (
            <div className="rounded-md bg-gray-50 p-3">
              <p className="font-medium">Exchange booking</p>
              <p className="mt-1 break-all text-gray-600">Reference: {request.collectionQc.exchangeReference || request.reverseShipment?.trackingNumber || 'Not booked yet'}</p>
              <p className="mt-1 text-gray-600">{request.status === 'replaced' || request.collectionQc.exchangeCompletedAt ? 'Exchange completed — old item collected and replacement handed over' : stage.title}</p>
            </div>
          ) : <>{[
            ["Replacement delivery", request.replacement?.trackingNumber, request.replacement?.shipment?.status || request.replacement?.status],
            ["Return pickup", request.reverseShipment?.trackingNumber, request.reverseShipment?.status],
          ].map(([label, tracking, status]) => <div key={label} className="rounded-md bg-gray-50 p-3"><p className="font-medium">{label}</p><p className="mt-1 break-all text-gray-600">Tracking number: {tracking || "Not booked yet"}</p><p className="mt-1 capitalize text-gray-600">Status: {String(status || "Not booked yet").replace(/_/g, " ")}</p></div>)}</>}

          {canViewShipments && links.map(link => <Button key={link.id} requiredModule="delivery" requiredAction="view" onClick={() => onShipment(link.path)}>{link.label === "View Exchange Booking" ? "View Exchange Booking" : link.label === "View Replacement Shipment" ? "Replacement Delivery History" : "Return Pickup History"}</Button>)}
          {!request.collectionQc?.sameVisitExchange && !canViewShipments && request.reverseShipment?.shipmentId && ["reverse_pickup_scheduled", "pickup_failed", "in_reverse_transit"].includes(request.status) && <Button requiredModule="returns" requiredAction="update" disabled={loading} onClick={() => onAction("tracking")}>Record Courier Status</Button>}
          <p className="text-xs text-gray-500">Manage the visit, inspection and exchange completion here. If the visit cannot be completed, use Record Exchange Failure.</p>
        </div>
      </details>
      <details className="rounded-lg border border-gray-200 p-4">
        <summary className="cursor-pointer font-semibold text-gray-900">Inspection and Exchange Details</summary>
        <p className="mt-3">Doorstep QC: {String(request.collectionQc?.status || "pending").replace(/_/g, " ")}</p>
        <p className="mt-2">Old item collected: {request.collectionQc?.collectedAt ? formatDateTime12Hour(request.collectionQc.collectedAt) : "Not collected"}</p>
        <Button className="mt-3" onClick={onDetails}>View Full Details and Evidence</Button>
      </details>
      {!isSeller && !closed && <details className="rounded-lg border border-gray-200 p-4">
        <summary className="cursor-pointer font-semibold text-gray-900">Other Actions</summary>
        <p className="mt-3 text-xs leading-5 text-gray-600">Closing is blocked while a collected item, refund, or replacement parcel still needs resolution.</p>
        {request.status === "requested" && <Button className="mt-3 mr-3" requiredModule="returns" requiredAction="update" disabled={loading} onClick={() => onAction("reject")}>Reject Exchange</Button>}
        <Button className="mt-3" requiredModule="returns" requiredAction="update" disabled={loading} onClick={() => onAction("close")}>Close Exchange</Button>
      </details>}
    </div>
  );
}
