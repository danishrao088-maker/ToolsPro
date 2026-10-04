import { Laptop, Server } from "lucide-react";
import type { PublicTool } from "../../types/api";
import { Icon } from "../common/Icon";

export function ToolPageHeader({ tool, categoryName }: { tool: PublicTool; categoryName?: string }) {
  const inBrowser = tool.privacyMode === "browser";
  const PrivacyIcon = inBrowser ? Laptop : Server;

  return (
    <header className="flex items-start gap-4">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-link">
        <Icon name={tool.icon} size={28} />
      </span>
      <div>
        {categoryName ? <p className="text-sm font-medium text-link">{categoryName}</p> : null}
        <h1 className="text-2xl font-bold text-heading sm:text-3xl">{tool.name}</h1>
        <p className="mt-1 max-w-2xl">{tool.description}</p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-sm font-medium text-heading">
          <PrivacyIcon aria-hidden="true" size={16} />
          {inBrowser ? "Runs in your browser" : "Processed on our server"}
        </p>
      </div>
    </header>
  );
}