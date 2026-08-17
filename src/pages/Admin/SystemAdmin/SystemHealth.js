/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import {
  MdCheckCircle,
  MdError,
  MdRefresh,
  MdWarning,
  MdAccessTime,
  MdMemory,
  MdStorage,
  MdSpeed,
  MdDns,
} from "react-icons/md";
import Loader from "../../../components/Loader/Loader";
import { PageHeader, SummaryCard } from "../../../components/Shared";
import { getSystemHealth } from "../../../Redux/adminCoreSlice";
import moment from "moment";

const StatusIcon = ({ status, size = 20 }) => {
  const s = String(status || "").toLowerCase();
  if (s === "healthy" || s === "ok" || s === "up")
    return <MdCheckCircle className="text-emerald-500" size={size} />;
  if (s === "degraded" || s === "warn" || s === "warning")
    return <MdWarning className="text-amber-500" size={size} />;
  return <MdError className="text-rose-500" size={size} />;
};

const StatusBadgeRaw = ({ status }) => {
  const s = String(status || "").toLowerCase();
  const isOk = s === "healthy" || s === "ok" || s === "up";
  const isWarn = s === "degraded" || s === "warn" || s === "warning";

  const colorClass = isOk
    ? "bg-emerald-50 text-emerald-700"
    : isWarn
      ? "bg-amber-50 text-amber-700"
      : "bg-rose-50 text-rose-700";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize tracking-wide ${colorClass}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isOk ? "bg-emerald-500" : isWarn ? "bg-amber-500" : "bg-rose-500"
        }`}
      />
      {status || "unknown"}
    </span>
  );
};

const SystemHealth = () => {
  const dispatch = useDispatch();
  const selector = useSelector((s) => s.adminCore);
  const healthData =
    selector?.systemHealthData?.data?.data ||
    selector?.systemHealthData?.data ||
    {};

  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      await dispatch(getSystemHealth()).unwrap();
      setLastRefreshed(new Date());
    } catch (err) {
      toast.error(err?.message || "Failed to load system health");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const services = healthData.services || healthData.checks || {};
  const overallStatus = healthData.status || healthData.overall || "unknown";
  const uptime = healthData.uptime;
  const version = healthData.version;
  const memory = healthData.memory || healthData.memoryUsage;
  const cpu = healthData.cpu || healthData.cpuUsage;

  const isOverallHealthy =
    String(overallStatus).toLowerCase() === "healthy" ||
    String(overallStatus).toLowerCase() === "ok" ||
    String(overallStatus).toLowerCase() === "up";

  const isOverallDegraded =
    String(overallStatus).toLowerCase() === "degraded" ||
    String(overallStatus).toLowerCase() === "warn" ||
    String(overallStatus).toLowerCase() === "warning";

  const serviceCount = Object.keys(services).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health"
        breadcrumbs={[{ label: "Settings" }, { label: "System Health" }]}
        subtitle={
          lastRefreshed
            ? `Last refreshed ${moment(lastRefreshed).format("h:mm:ss A")}`
            : "Monitoring system components & services"
        }
        actions={
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--admin-gold)] bg-[var(--admin-gold)] px-3.5 py-1.5 text-xs font-bold text-[var(--admin-navy)] shadow-sm hover:bg-[#ffe8a8] active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            <MdRefresh size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        }
      />

      {loading && !Object.keys(healthData).length ? (
        <Loader />
      ) : (
        <>
          {/* Overall status banner */}
          <div className="relative overflow-hidden rounded-xl border border-[var(--admin-line)] bg-gradient-to-r from-white to-[var(--admin-gold-soft)]/30 p-5 shadow-[0_10px_28px_rgba(31,27,95,0.06)] transition-all duration-200">
            <span
              className={`absolute inset-y-0 left-0 w-[4px] ${
                isOverallHealthy
                  ? "bg-[var(--admin-gold)]"
                  : isOverallDegraded
                    ? "bg-amber-500"
                    : "bg-rose-500"
              }`}
            />
            <div className="flex items-center justify-between gap-4 pl-1">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--admin-gold)]  bg-white shadow-sm">
                  <StatusIcon status={overallStatus} size={26} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[var(--admin-ink)]">
                    Overall System Status
                  </h2>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadgeRaw status={overallStatus} />
                    <span className="text-xs text-[var(--admin-muted)]">
                      {isOverallHealthy
                        ? "All core services operational"
                        : isOverallDegraded
                          ? "Some services are experiencing latency"
                          : "Component failure detected"}
                    </span>
                  </div>
                </div>
              </div>

              {version && (
                <div className="hidden sm:block text-right rounded-lg border border-[var(--admin-line)] bg-white px-3.5 py-1.5 shadow-sm">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--admin-muted)]">
                    System Version
                  </p>
                  <p className="font-mono text-xs font-bold text-[var(--admin-navy)]">
                    {version}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {uptime != null && (
              <SummaryCard
                title="Uptime"
                value={
                  typeof uptime === "number"
                    ? `${Math.floor(uptime / 60)} min`
                    : uptime
                }
                description="System active duration"
                icon={<MdAccessTime size={18} />}
              />
            )}
            {memory?.heapUsed != null && (
              <SummaryCard
                title="Heap Used"
                value={`${Math.round(memory.heapUsed / 1024 / 1024)} MB`}
                description="Current JS heap allocation"
                icon={<MdMemory size={18} />}
              />
            )}
            {memory?.heapTotal != null && (
              <SummaryCard
                title="Heap Total"
                value={`${Math.round(memory.heapTotal / 1024 / 1024)} MB`}
                description="Total memory allocated"
                icon={<MdStorage size={18} />}
              />
            )}
            {cpu?.user != null && (
              <SummaryCard
                title="CPU User Time"
                value={`${Math.round(cpu.user / 1000)} ms`}
                description="User execution time"
                icon={<MdSpeed size={18} />}
              />
            )}
          </div>

          {/* Service checks */}
          {serviceCount > 0 && (
            <div className="overflow-hidden rounded-xl border border-[var(--admin-line)] bg-white shadow-[0_10px_28px_rgba(31,27,95,0.04)]">
              <div className="flex items-center justify-between border-b border-[var(--admin-line)] bg-gradient-to-r from-[var(--admin-canvas)] to-white px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <MdDns className="text-[var(--admin-gold-dark)]" size={18} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--admin-ink)]">
                    Service Health Checks
                  </h3>
                </div>
                <span className="rounded-full border border-[var(--admin-gold)]/40 bg-[var(--admin-gold-soft)] px-2.5 py-0.5 text-[11px] font-extrabold text-[var(--admin-gold-dark)]">
                  {serviceCount} Services
                </span>
              </div>
              <div className="divide-y divide-[var(--admin-line)]">
                {Object.entries(services || {}).map(([name, check]) => {
                  const status =
                    typeof check === "string"
                      ? check
                      : check?.status || check?.state || "unknown";
                  const latency = check?.latency || check?.responseTime;
                  return (
                    <div
                      key={name}
                      className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[#fffdf7]"
                    >
                      <div className="flex items-center gap-3 ">
                        <StatusIcon status={status} size={18} />
                        <span className="text-xs font-bold text-[var(--admin-navy)] capitalize">
                          {name.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {latency != null && (
                          <span className="rounded border border-[var(--admin-line)] bg-[var(--admin-canvas)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--admin-muted)]">
                            {latency} ms
                          </span>
                        )}
                        <StatusBadgeRaw status={status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {Object.keys(healthData).length === 0 && !loading && (
            <div className="rounded-xl border border-[var(--admin-line)] bg-white py-16 text-center shadow-sm">
              <MdCheckCircle
                size={48}
                className="mx-auto mb-3 text-[var(--admin-gold)] opacity-50"
              />
              <p className="text-xs font-bold text-[var(--admin-ink)]">
                No health metrics available
              </p>
              <p className="mt-1 text-xs text-[var(--admin-muted)]">
                Click refresh to fetch current service status
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SystemHealth;
