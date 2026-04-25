import { useEffect, useRef, useState } from "react";

import { fetchDevice, fetchDevices, fetchModuleIds } from "../api";
import { DeviceCard } from "../components/DeviceCard";
import type { DeviceSummary } from "../types";

type SlotState = {
  id: number | null;
  input: string;
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
    Array.from({ length: SLOT_COUNT }, () => ({ id: null, input: "", device: null, error: "" }))
  );
  const [moduleIds, setModuleIds] = useState<number[]>([]);
  const [pageStart, setPageStart] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const moduleIdsRef = useRef<number[]>([]);
  const refreshVersionRef = useRef<number>(0);

  const setModuleIdsStable = (nextIds: number[]) => {
    setModuleIds((current) => {
      if (arraysEqual(current, nextIds)) {
        return current;
      }
      moduleIdsRef.current = nextIds;
      return nextIds;
    });
  };

  const hydrateSlot = async (slotIndex: number, id: number, refreshVersion: number) => {
    try {
      const device = await fetchDevice(id);
      if (refreshVersionRef.current !== refreshVersion) {
        return;
      }
      setSlots((current) =>
        current.map((slot, index) =>
          index === slotIndex
            ? { ...slot, id, input: id.toString(), device, error: "" }
            : slot
        )
      );
    } catch (err) {
      if (refreshVersionRef.current !== refreshVersion) {
        return;
      }
      setSlots((current) =>
        current.map((slot, index) =>
          index === slotIndex
            ? {
                ...slot,
                id,
                input: id.toString(),
                device: null,
                error: err instanceof Error ? err.message : "Failed to load module"
              }
            : slot
        )
      );
    }
  };

  const hydrateSlotsForPage = (ids: number[], start: number, refreshVersion: number) => {
    for (let i = 0; i < SLOT_COUNT; i += 1) {
      const id = ids[start + i];
      if (id !== undefined) {
        void hydrateSlot(i, id, refreshVersion);
      } else {
        setSlots((current) =>
          current.map((slot, index) =>
            index === i ? { ...slot, id: null, input: "", device: null, error: "No module in this slot" } : slot
          )
        );
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const refreshVersion = refreshVersionRef.current + 1;
      refreshVersionRef.current = refreshVersion;

      try {
        const ids = await fetchModuleIds();
        if (isMounted) {
          // Keep stable ordering between refreshes so modules do not jump.
          // Preserve current order for existing ids and append new ids at end.
          const currentIds = moduleIdsRef.current;
          const idsForRender =
            currentIds.length === 0
              ? ids
              : [...currentIds.filter((id) => ids.includes(id)), ...ids.filter((id) => !currentIds.includes(id))];
          setModuleIdsStable(idsForRender);
          setError("");
          const maxStart = Math.max(0, idsForRender.length - SLOT_COUNT);
          const clampedStart = Math.min(pageStart, maxStart);
          if (clampedStart !== pageStart) {
            setPageStart(clampedStart);
          }
          hydrateSlotsForPage(idsForRender, clampedStart, refreshVersion);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load module list");
        }
      }

      // Apply online-first ordering as a second pass so the UI still renders
      // even if status fetch is slow.
      try {
        const [ids, devices] = await Promise.all([fetchModuleIds(), fetchDevices()]);
        if (!isMounted) {
          return;
        }
        const existingIdSet = new Set(ids);
        const onlineIds = devices
          .filter((device) => existingIdSet.has(device.id) && device.is_online)
          .map((device) => device.id)
          .sort((a, b) => a - b);
        const offlineIds = devices
          .filter((device) => existingIdSet.has(device.id) && !device.is_online)
          .map((device) => device.id)
          .sort((a, b) => a - b);
        const orderedIds = [...onlineIds, ...offlineIds];
        setModuleIdsStable(orderedIds);
        const maxStart = Math.max(0, orderedIds.length - SLOT_COUNT);
        const clampedStart = Math.min(pageStart, maxStart);
        if (clampedStart !== pageStart) {
          setPageStart(clampedStart);
        }
        hydrateSlotsForPage(orderedIds, clampedStart, refreshVersion);
      } catch {
        // Keep fallback ordering if full device status is slow/unavailable.
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

  const updateSlotInput = (slotIndex: number, value: string) => {
    setSlots((current) =>
      current.map((slot, index) => (index === slotIndex ? { ...slot, input: value, error: "" } : slot))
    );
  };

  const applySlotModule = async (slotIndex: number) => {
    const parsed = Number(slots[slotIndex].input);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 999) {
      setSlots((current) =>
        current.map((slot, index) =>
          index === slotIndex ? { ...slot, error: "Enter a module number from 1 to 999" } : slot
        )
      );
      return;
    }
    if (!moduleIds.includes(parsed)) {
      setSlots((current) =>
        current.map((slot, index) =>
          index === slotIndex
            ? { ...slot, id: parsed, device: null, error: `Module ${parsed.toString().padStart(3, "0")} does not exist` }
            : slot
        )
      );
      return;
    }
    try {
      const device = await fetchDevice(parsed);
      setSlots((current) =>
        current.map((slot, index) =>
          index === slotIndex ? { ...slot, id: parsed, device, error: "" } : slot
        )
      );
    } catch (err) {
      setSlots((current) =>
        current.map((slot, index) =>
          index === slotIndex
            ? { ...slot, id: parsed, device: null, error: err instanceof Error ? err.message : "Failed to load module" }
            : slot
        )
      );
    }
  };

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
            <div className="slot-controls">
              <label htmlFor={`slot-input-${index.toString()}`}>Module</label>
              <div className="slot-controls-row">
                <input
                  id={`slot-input-${index.toString()}`}
                  max={999}
                  min={1}
                  type="number"
                  value={slot.input}
                  onChange={(event) => updateSlotInput(index, event.target.value)}
                />
                <button onClick={() => void applySlotModule(index)} type="button">
                  Apply
                </button>
              </div>
              {slot.error ? <p className="error">{slot.error}</p> : null}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
