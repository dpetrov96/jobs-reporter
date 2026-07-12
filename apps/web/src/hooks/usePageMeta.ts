import { useEffect } from "react";

export interface PageMeta {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  ogType?: string;
  twitterCard?: string;
}

const DEFAULT_TITLE = "Jobs Reporter";
const DEFAULT_DESCRIPTION = "LinkedIn job market reports and analytics";

function ensureMeta(attr: "name" | "property", key: string): HTMLMetaElement {
  const selector =
    attr === "name" ? `meta[name="${key}"]` : `meta[property="${key}"]`;
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }

  return element as HTMLMetaElement;
}

function setNamedMeta(key: string, value: string | undefined) {
  if (value) {
    ensureMeta("name", key).content = value;
  }
}

function setPropertyMeta(key: string, value: string | undefined) {
  if (value) {
    ensureMeta("property", key).content = value;
  }
}

export function usePageMeta(meta: PageMeta | null | undefined) {
  useEffect(() => {
    const previousTitle = document.title;

    if (!meta) {
      document.title = DEFAULT_TITLE;
      setNamedMeta("description", DEFAULT_DESCRIPTION);
      setPropertyMeta("og:title", DEFAULT_TITLE);
      setPropertyMeta("og:description", DEFAULT_DESCRIPTION);
      return () => {
        document.title = previousTitle;
      };
    }

    if (meta.title) {
      document.title = meta.title;
    }

    setNamedMeta("description", meta.description);
    setPropertyMeta("og:title", meta.ogTitle ?? meta.title);
    setPropertyMeta("og:description", meta.ogDescription ?? meta.description);
    setPropertyMeta("og:type", meta.ogType ?? "website");
    setPropertyMeta("og:url", meta.ogUrl);
    setNamedMeta("twitter:card", meta.twitterCard ?? "summary");
    setNamedMeta("twitter:title", meta.ogTitle ?? meta.title);
    setNamedMeta("twitter:description", meta.ogDescription ?? meta.description);

    return () => {
      document.title = previousTitle;
      setNamedMeta("description", DEFAULT_DESCRIPTION);
      setPropertyMeta("og:title", DEFAULT_TITLE);
      setPropertyMeta("og:description", DEFAULT_DESCRIPTION);
      setPropertyMeta("og:url", undefined);
    };
  }, [meta]);
}
