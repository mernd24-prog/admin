import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MdAnalytics } from "react-icons/md";
import { DataTable, PageHeader } from "../../components/Shared";
import { axiosPrivate } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";

const PAGE_SIZE = 20;

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const AnalyticsEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axiosPrivate.get(ENDPOINTS.analytics.events);
      const payload = response?.data?.data ?? response?.data ?? [];
      setEvents(Array.isArray(payload) ? payload : payload?.items || []);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load analytics events.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const columns = useMemo(
    () => [
      { key: "eventName", label: "Event" },
      { key: "actorId", label: "Actor ID" },
      {
        key: "metadata",
        label: "Metadata",
        render: (row) => (
          <pre className="max-w-md whitespace-pre-wrap break-words text-xs">
            {JSON.stringify(row.metadata || {}, null, 2)}
          </pre>
        ),
      },
      {
        key: "createdAt",
        label: "Created At",
        render: (row) => formatDate(row.createdAt),
      },
    ],
    [],
  );

  const pageEvents = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics Events"
        subtitle="Recent platform events recorded by the backend"
        breadcrumbs={[{ label: "Reports & Analytics" }, { label: "Analytics Events" }]}
        count={events.length}
      />
      <DataTable
        columns={columns}
        data={pageEvents}
        loading={loading}
        error={error}
        totalCount={events.length}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRefresh={loadEvents}
        rowKey={(row) => row._id || `${row.eventName}-${row.createdAt}`}
        emptyText="No analytics events have been recorded."
        emptyIcon={<MdAnalytics size={42} />}
        showSerialNumber
      />
    </div>
  );
};

export default AnalyticsEvents;
