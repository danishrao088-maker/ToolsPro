import { useState } from "react";
import UrlCheckForm from "../../components/tools/UrlCheckForm";
import { Block, LevelBadge, Mono, Note, SummaryCounts } from "../../components/tools/webResults";
import { safeHttpUrl } from "../../lib/web/format";
import type { OgCheck, OpenGraphResult } from "../../lib/web/webApi";

function CheckList({ checks }: { checks: OgCheck[] }) {
  return (
    <ul className="divide-y divide-line">
      {checks.map((check) => (
        <li key={check.tag} className="space-y-1 py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Mono>{check.tag}</Mono>
            <LevelBadge level={check.level} />
          </div>
          {check.value && <p className="break-all text-sm text-heading">{check.value}</p>}
          <p className="text-sm text-body">{check.message}</p>
        </li>
      ))}
    </ul>
  );
}

// Picture doosri site se aati hai, is liye tabhi kholte hain jab aap kahein (sirf https)
function PreviewPicture({ src }: { src: string | null }) {
  const [shown, setShown] = useState(false);
  const safe = src ? safeHttpUrl(src) : null;
  if (!safe || !safe.startsWith("https://")) return <p className="text-sm text-body">No picture to show.</p>;
  if (!shown) {
    return (
      <div className="space-y-1">
        <button type="button" onClick={() => setShown(true)} className="rounded-md border border-line px-3 py-1 text-sm text-heading">
          Load preview picture
        </button>
        <p className="text-xs text-body">Loading the picture contacts the other website from your browser.</p>
      </div>
    );
  }
  return <img src={safe} alt="Preview picture from the page" referrerPolicy="no-referrer" loading="lazy" className="max-h-64 w-full rounded-md border border-line object-cover" />;
}

export default function OpenGraphCheckerTool() {
  return (
    <UrlCheckForm<OpenGraphResult>
      tool="open-graph"
      buttonLabel="Check Open Graph tags"
      render={(result) => (
        <>
          <Block title="Share preview">
            <div className="max-w-md space-y-2 rounded-lg border border-line bg-surface-muted p-3">
              <PreviewPicture src={result.preview.image} />
              <p className="text-xs uppercase text-body">{result.preview.siteName}</p>
              <p className="break-words font-semibold text-heading">{result.preview.title || "No title"}</p>
              <p className="break-words text-sm text-body">{result.preview.description || "No description"}</p>
            </div>
            <Note>This is a simple preview. Each site (Facebook, X, LinkedIn, WhatsApp) draws its own card in its own way.</Note>
            <SummaryCounts {...result.summary} />
          </Block>
          <Block title="Open Graph tags">
            <CheckList checks={result.openGraph} />
          </Block>
          <Block title="X (Twitter) card tags">
            <CheckList checks={result.twitter} />
          </Block>
          {result.otherTags.length > 0 && (
            <details className="rounded-lg border border-line p-4">
              <summary className="cursor-pointer font-semibold text-heading">Other related tags ({result.otherTags.length})</summary>
              <dl className="mt-3 space-y-2">
                {result.otherTags.map((tag, index) => (
                  <div key={`${tag.tag}-${index}`}>
                    <dt className="text-sm font-medium text-heading">{tag.tag}</dt>
                    <dd className="break-all text-sm text-body">{tag.content}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </>
      )}
    />
  );
}
