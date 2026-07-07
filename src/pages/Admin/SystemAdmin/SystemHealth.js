/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdCheckCircle, MdError, MdRefresh, MdWarning } from "react-icons/md";
import Loader from "../../../components/Loader/Loader";
import { PageHeader } from "../../../components/Shared";
import { getSystemHealth } from "../../../Redux/adminCoreSlice";
import moment from "moment";

const StatusIcon = ({ status }) => {
  const s = String(status || "").toLowerCase();
  if (s === "healthy" || s === "ok" || s === "up")
    return <MdCheckCircle className="text-green-500" size={20} />;
  if (s === "degraded" || s === "warn" || s === "warning")
    return <MdWarning className="text-yellow-500" size={20} />;
  return <MdError className="text-red-500" size={20} />;
};

const StatusBadgeRaw = ({ status }) => {
  const s = String(status || "").toLowerCase();
  const color =
    s === "healthy" || s === "ok" || s === "up"
      ? "bg-green-100 text-green-700"
      : s === "degraded" || s === "warn" || s === "warning"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${color}`}>
      {status || "unknown"}
    </span>
  );
};

const MetricCard = ({ label, value, unit }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4">
    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
    <p className="text-2xl font-bold text-gray-800 mt-1">
      {value ?? "—"}
      {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
    </p>
  </div>
);

const SystemHealth = () => {
  const dispatch = useDispatch();
  const selector = useSelector((s) => s.adminCore);
  const healthData = selector.systemHealthData?.data?.data || selector.systemHealthData?.data || {};

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

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="System Health"
        subtitle={lastRefreshed ? `Last refreshed ${moment(lastRefreshed).format("h:mm:ss A")}` : "Monitoring system components"}
        actions={
          <button
            onClick={fetchHealth}
            disabled={loading}

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
          {/* Overall status */}
          <div className={`rounded-xl border-2 p-6 flex items-center gap-4 ${overallStatus === "healthy" || overallStatus === "ok" ? "border-green-200 bg-green-50" : overallStatus === "degraded" ? "border-yellow-200 bg-yellow-50" : "border-red-200 bg-red-50"}`}>
            <StatusIcon status={overallStatus} />
            <div>
              <p className="text-lg font-semibold text-gray-800">Overall Status</p>
              <StatusBadgeRaw status={overallStatus} />
            </div>
            {version && <div className="ml-auto text-right"><p className="text-xs text-gray-500">Version</p><p className="font-mono text-sm">{version}</p></div>}
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {uptime != null && (
              <MetricCard label="Uptime" value={typeof uptime === "number" ? Math.floor(uptime / 60) : uptime} unit={typeof uptime === "number" ? "min" : ""} />
            )}
            {memory?.heapUsed != null && (
              <MetricCard label="Heap Used" value={Math.round(memory.heapUsed / 1024 / 1024)} unit="MB" />
            )}
            {memory?.heapTotal != null && (
              <MetricCard label="Heap Total" value={Math.round(memory.heapTotal / 1024 / 1024)} unit="MB" />
            )}
            {cpu?.user != null && (
              <MetricCard label="CPU (user)" value={Math.round(cpu.user / 1000)} unit="ms" />
            )}
          </div>

          {/* Service checks */}
          {Object.keys(services).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Service Checks</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {Object.entries(services).map(([name, check]) => {
                  const status = typeof check === "string" ? check : check?.status || check?.state || "unknown";
                  const latency = check?.latency || check?.responseTime;
                  return (
                    <div key={name} className="px-6 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusIcon status={status} />
                        <span className="font-medium text-gray-700 capitalize">{name.replace(/_/g, " ")}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {latency != null && (
                          <span className="text-xs text-gray-500">{latency}ms</span>
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
            <div className="text-center py-16 text-gray-400">
              <MdCheckCircle size={48} className="mx-auto mb-3 opacity-30" />
              <p>No health data available</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SystemHealth;
