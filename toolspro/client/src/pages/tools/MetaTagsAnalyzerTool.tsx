import UrlCheckForm from "../../components/tools/UrlCheckForm";
import { Block, LevelBadge, Mono, Note, StatusCode, SummaryCounts } from "../../components/tools/webResults";
import type { MetaResult } from "../../lib/web/webApi";

export default function MetaTagsAnalyzerTool() {
  return (
    <UrlCheckForm<MetaResult>
      tool="meta"
      buttonLabel="Analyze meta tags"
      render={(result) => (
        <>
          <Block title="Summary">
            <p className="break-all text-body">
              <Mono>{result.url}</Mono> answered with <StatusCode status={result.status} />
            </p>
            <SummaryCounts {...result.summary} />
          </Block>
          <Block title="Checks">
            <ul className="divide-y divide-line">
              {result.checks.map((check) => (
                <li key={check.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-heading">{check.label}</span>
                    <LevelBadge level={check.level} />
                  </div>
                  {check.value && <p><Mono>{check.value}</Mono></p>}
                  <p className="text-sm text-body">{check.message}</p>
                </li>
              ))}
            </ul>
          </Block>
          {result.allMeta.length > 0 && (
            <details className="rounded-lg border border-line p-4">
              <summary className="cursor-pointer font-semibold text-heading">All meta tags found ({result.allMeta.length})</summary>
              <dl className="mt-3 space-y-2">
                {result.allMeta.map((meta, index) => (
                  <div key={`${meta.name}-${index}`}>
                    <dt className="text-sm font-medium text-heading">{meta.name}</dt>
                    <dd className="break-words text-sm text-body">{meta.content}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
          <Note>The recommended lengths are common rules of thumb, not strict rules of any search engine.</Note>
        </>
      )}
    />
  );
}
