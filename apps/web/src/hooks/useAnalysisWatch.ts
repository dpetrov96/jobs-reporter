import { useEffect, useRef } from "react";
import { fetchAnalysis, isAnalysisInProgress } from "@jobs-reporter/shared";
import type { AnalysisRecord } from "@jobs-reporter/shared";

const POLL_INTERVAL_MS = 3000;

export function useAnalysisWatch(
  apiUrl: string,
  analysis: AnalysisRecord | null,
  onUpdate: (analysis: AnalysisRecord) => void,
  enabled = true
) {
  const analysisRef = useRef(analysis);
  analysisRef.current = analysis;

  useEffect(() => {
    if (!enabled || !analysis || !isAnalysisInProgress(analysis.status)) {
      return;
    }

    let cancelled = false;

    async function poll() {
      while (!cancelled) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        if (cancelled) break;

        const current = analysisRef.current;
        if (!current || !isAnalysisInProgress(current.status)) break;

        try {
          const response = await fetchAnalysis(apiUrl, current.fetchedAt);
          if (response.analysis && !cancelled) {
            onUpdate(response.analysis);
            if (!isAnalysisInProgress(response.analysis.status)) break;
          }
        } catch {
          // Keep polling on transient errors
        }
      }
    }

    void poll();

    return () => {
      cancelled = true;
    };
  }, [apiUrl, analysis?.fetchedAt, analysis?.status, enabled, onUpdate]);
}
