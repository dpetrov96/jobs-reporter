import { useEffect, useState } from "react";
import {
  formatCountdown,
  getMsUntilNextScheduledFetchForRegion,
  isNearCronSlotForRegion,
} from "@jobs-reporter/shared";
import type { ScrapeRegionId } from "@jobs-reporter/shared";

export function useRegionSchedule(regionId: ScrapeRegionId) {
  const [countdownMs, setCountdownMs] = useState(() =>
    getMsUntilNextScheduledFetchForRegion(regionId)
  );
  const [nearCronSlot, setNearCronSlot] = useState(() =>
    isNearCronSlotForRegion(regionId)
  );

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCountdownMs(getMsUntilNextScheduledFetchForRegion(regionId, now));
      setNearCronSlot(isNearCronSlotForRegion(regionId, now));
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [regionId]);

  return {
    countdownLabel: formatCountdown(countdownMs),
    nearCronSlot,
  };
}
