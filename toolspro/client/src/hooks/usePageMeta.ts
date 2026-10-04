import { useEffect } from "react";

const SITE_NAME = "ToolsPro";

function setMetaDescription(content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!el) {
    el = document.createElement("meta");
    el.name = "description";
    document.head.appendChild(el);
  }
  el.content = content;
}

export function usePageMeta(title: string, description: string): void {
  useEffect(() => {
    document.title = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
    setMetaDescription(description);
  }, [title, description]);
}