import { useEffect, useRef, useState } from "react";

import { fetchDevice, fetchModuleIds } from "../api";
import { DeviceCard } from "../components/DeviceCard";
import type { DeviceSummary } from "../types";

type SlotState = {
  id: number | null;
  device: DeviceSummary | null;
  error: string;
};

const SLOT_COUNT = 4;

function arraysEqual(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

export function DeviceOverviewPage() {
  const [slots, setSlots] = useState<SlotState[]>(
    Array.from({ length: SLOT_COUNT }, () => ({ id: null, device: null, error: "" }))
  );
  const [moduleIds, setModuleIds] = useState<number[]>([]);
  const [pageStart, setPageStart] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const moduleIdsRef = useRef<number[]>([]);
  const refreshVersionRef = useRef<number>(0);
  const pageStartRef = useRef<number>(0);
  const allModuleIdsRef = useRef<number[]>([]);
  const deviceCacheRef = useRef<Map<number, DeviceSummary>>(new Map());
  const knownOnlineRef = useRef<Map<number, boolean>>(new Map());
  const inflightFetchesRef = useRef<Set<number>>(new Set());

  const setModuleIdsStable = (nextIds: number[]) => {
    setModuleIds((current) => {
      if (arraysEqual(current, nextIds)) {
        return current;
      }
      moduleIdsRef.current = nextIds;
      return nextIds;
    });
  };

  const recomputeOrderedIds = (ids: number[]) => {
    const online = ids.filter((id) => knownOnlineRef.current.get(id) === true).sort((a, b) => a - b);
    const rest = ids.filter((id) => knownOnlineRef.current.get(id) !== true).sort((a, b) => a - b);
    return [...online, ...rest];
  };

  const syncVisibleSlots = (ids: number[], start: number) => {
    for (let i = 0; i < SLOT_COUNT; i += 1) {
      const id = ids[start + i];
      if (id !== undefined) {
        const cached = deviceCacheRef.current.get(id);
        setSlots((current) =>
          current.map((slot, index) =>
            index === i
              ? {
                  ...slot,
                  id,
                  device: cached ?? null,
                  error: cached ? "" : "Loading..."
                }
              : slot
          )
        );
      } else {
        setSlots((current) =>
          current.map((slot, index) =>
            index === i ? { ...slot, id: null, device: null, error: "No module in this slot" } : slot
          )
        );
      }
    }
  };

  const discoverModule = async (id: number, refreshVersion: number) => {
    if (inflightFetchesRef.current.has(id)) {
      return;
    }
    inflightFetchesRef.current.add(id);
    try {
      const device = await fetchDevice(id);
      if (refreshVersionRef.current !== refreshVersion) {
        return;
      }
      deviceCacheRef.current.set(id, device);
      knownOnlineRef.current.set(id, device.is_online);
      const ordered = recomputeOrderedIds(allModuleIdsRef.current);
      setModuleIdsStable(ordered);

      const maxStart = Math.max(0, ordered.length - SLOT_COUNT);
      const clampedStart = Math.min(pageStartRef.current, maxStart);
      if (clampedStart !== pageStartRef.current) {
        pageStartRef.current = clampedStart;
        setPageStart(clampedStart);
      }
      syncVisibleSlots(ordered, clampedStart);
    } catch {
      // Keep previous card/order state when an individual fetch fails.
    } finally {
      inflightFetchesRef.current.delete(id);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const refreshVersion = refreshVersionRef.current + 1;
      refreshVersionRef.current = refreshVersion;
      inflightFetchesRef.current.clear();

      try {
        const ids = await fetchModuleIds();
        if (isMounted) {
          allModuleIdsRef.current = ids;
          const orderedIds = recomputeOrderedIds(ids);

          // Keep stable ordering between refreshes if ids set is unchanged.
          // Preserve current order for existing ids and append new ids at end.
          const currentIds = moduleIdsRef.current;
          const idsForRender =
            currentIds.length === 0
              ? orderedIds
              : [
                  ...currentIds.filter((id) => orderedIds.includes(id)),
                  ...orderedIds.filter((id) => !currentIds.includes(id))
                ];
          setModuleIdsStable(idsForRender);
          setError("");
          const maxStart = Math.max(0, idsForRender.length - SLOT_COUNT);
          const clampedStart = Math.min(pageStart, maxStart);
          if (clampedStart !== pageStart) {
            pageStartRef.current = clampedStart;
            setPageStart(clampedStart);
          }
          syncVisibleSlots(idsForRender, clampedStart);

          // Progressive discovery: modules appear/update as soon as each fetch returns.
          idsForRender.forEach((id) => {
            void discoverModule(id, refreshVersion);
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load module list");
        }
      }
    };

    void load();
    const timer = setInterval(() => {
      void load();
    }, 15000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [pageStart]);

  const canGoPrev = pageStart > 0;
  const canGoNext = pageStart + SLOT_COUNT < moduleIds.length;
  const pageEnd = Math.min(pageStart + SLOT_COUNT, moduleIds.length);

  return (
    <main className="layout">
      <header className="page-header">
        <h1>MW Device Dashboard</h1>
        <p className="muted">Live status overview. Showing up to 4 modules at a time.</p>
        <div className="pager-row">
          <button disabled={!canGoPrev} onClick={() => setPageStart((value) => Math.max(0, value - SLOT_COUNT))} type="button">
            Previous 4
          </button>
          <span className="muted">
            Showing {moduleIds.length === 0 ? 0 : pageStart + 1} to {pageEnd} of {moduleIds.length}
          </span>
          <button disabled={!canGoNext} onClick={() => setPageStart((value) => value + SLOT_COUNT)} type="button">
            Next 4
          </button>
        </div>
      </header>
      {error ? <p className="error">{error}</p> : null}
      <section className="device-grid">
        {slots.map((slot, index) => (
          <div className="slot-card" key={`slot-${index.toString()}`}>
            {slot.device ? <DeviceCard device={slot.device} /> : <div className="device-card muted">No module selected.</div>}
            {slot.error ? <p className="error">{slot.error}</p> : null}
          </div>
        ))}
      </section>
    </main>
  );
}
