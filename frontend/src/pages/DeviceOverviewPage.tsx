import { useEffect, useState } from "react";

import { fetchDevices } from "../api";
import { DeviceCard } from "../components/DeviceCard";
import type { DeviceSummary } from "../types";

export function DeviceOverviewPage() {
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await fetchDevices();
        if (isMounted) {
          setDevices(data);
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load devices");
        }
      }
    };

    load();
    const timer = setInterval(load, 5000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <main className="layout">
      <header className="page-header">
        <h1>MW Device Dashboard</h1>
        <p className="muted">Live status overview. Click a panel to build graphs.</p>
      </header>
      {error ? <p className="error">{error}</p> : null}
      <section className="device-grid">
        {devices.map((device) => (
          <DeviceCard key={device.id} device={device} />
        ))}
      </section>
    </main>
  );
}
