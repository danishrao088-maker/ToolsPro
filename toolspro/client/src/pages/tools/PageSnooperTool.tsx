import UrlCheckForm from "../../components/tools/UrlCheckForm";
import { Block, Facts, HeadersList, Mono, Note, StatusCode } from "../../components/tools/webResults";
import { formatBytes, formatMs, safeHttpUrl } from "../../lib/web/format";
import type { SnoopResult } from "../../lib/web/webApi";

export default function PageSnooperTool() {
  return (
    <UrlCheckForm<SnoopResult>
      tool="snoop"
      buttonLabel="Inspect page"
      render={(result) => (
        <>
          <Block title="Overview">
            <Facts
              items={[
                { label: "Address", value: <Mono>{result.url}</Mono> },
                { label: "Status", value: <StatusCode status={result.status} /> },
                ...(result.redirects > 0 ? [{ label: "Redirects followed", value: String(result.redirects) }] : []),
                { label: "Loaded in", value: formatMs(result.responseTimeMs) },
                { label: "HTML size", value: `${formatBytes(result.htmlBytes)}${result.truncated ? " (only the first part was read)" : ""}` },
                { label: "Language", value: result.language ?? "Not set" },
                { label: "Words on the page", value: String(result.wordCount) },
                { label: "Title", value: result.title || "None" },
                { label: "Description", value: result.description || "None" },
              ]}
            />
          </Block>

          <Block title="Headings">
            {result.headings.length === 0 ? (
              <p className="text-body">No headings found.</p>
            ) : (
              <ul className="space-y-1">
                {result.headings.map((heading, index) => (
                  <li key={index} style={{ paddingLeft: `${(heading.level - 1) * 16}px` }} className="break-words text-body">
                    <span className="mr-2 text-xs font-semibold uppercase text-heading">H{heading.level}</span>
                    {heading.text || "(empty)"}
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block title="Links, images and files">
            <Facts
              items={[
                { label: "Links", value: `${result.links.total} (${result.links.internal} inside this site, ${result.links.external} to other sites, ${result.links.nofollow} nofollow)` },
                { label: "Images", value: `${result.images.total} (${result.images.missingAlt} without alt text, ${result.images.emptyAlt} with empty alt text)` },
                { label: "Scripts", value: `${result.scripts.total} (${result.scripts.external} files, ${result.scripts.inline} inline)` },
                { label: "Stylesheets", value: String(result.stylesheets) },
              ]}
            />
          </Block>

          {result.links.items.length > 0 && (
            <details className="rounded-lg border border-line p-4">
              <summary className="cursor-pointer font-semibold text-heading">Links found ({result.links.items.length} different addresses)</summary>
              <ul className="mt-3 space-y-2">
                {result.links.items.map((link) => {
                  const href = safeHttpUrl(link.href);
                  return (
                    <li key={link.href} className="break-all text-sm text-body">
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline">
                          {link.text || link.href}
                        </a>
                      ) : (
                        link.href
                      )}
                      <span className="ml-2 text-xs">{link.external ? "other site" : "this site"}{link.nofollow ? ", nofollow" : ""}</span>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}

          <HeadersList headers={result.headers} />
          <Note>Only the first 1 MB of the page is read, and the page is read as plain HTML. Content added later by JavaScript is not seen.</Note>
        </>
      )}
    />
  );
}
