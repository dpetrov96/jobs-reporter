import { useCallback, useEffect, useState } from "react";
import { fetchRuns, isJobRunRecord } from "@jobs-reporter/shared";
import type { JobRunRecord } from "@jobs-reporter/shared";

const PAGE_SIZE = 50;

export function useAllRuns(apiUrl: string) {
  const [runs, setRuns] = useState<JobRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const collected: JobRunRecord[] = [];
      let cursor: string | undefined;

      do {
        const response = await fetchRuns(apiUrl, {
          limit: PAGE_SIZE,
          ...(cursor ? { cursor } : {}),
        });
        collected.push(...response.runs.filter(isJobRunRecord));
        cursor = response.nextCursor;
      } while (cursor);

      setRuns(collected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scrapes");
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  return { runs, loading, error, reload: loadRuns };
}
