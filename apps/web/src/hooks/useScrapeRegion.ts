import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type { ScrapeRegionId } from "@jobs-reporter/shared";
import { resolveScrapeRegionId } from "@jobs-reporter/shared";

const REGION_PARAM = "region";

export function useScrapeRegion() {
  const [searchParams, setSearchParams] = useSearchParams();
  const region = resolveScrapeRegionId(searchParams.get(REGION_PARAM) ?? undefined);

  const setRegion = useCallback(
    (next: ScrapeRegionId) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          if (next === "europe") {
            params.delete(REGION_PARAM);
          } else {
            params.set(REGION_PARAM, next);
          }
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  return { region, setRegion };
}
