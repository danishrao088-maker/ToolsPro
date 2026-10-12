import UrlCheckForm from "../../components/tools/UrlCheckForm";
import { Block, Facts, Mono, Note } from "../../components/tools/webResults";
import { formatAge, formatDate } from "../../lib/web/format";
import type { DomainAgeResult } from "../../lib/web/webApi";

const PRIVACY =
  "To find the age, this tool sends the domain you type to our server. Our server asks the public domain registry for the record. The results are not saved by the tool.";

export default function DomainAgeCheckerTool() {
  return (
    <UrlCheckForm<DomainAgeResult>
      tool="domain-age"
      buttonLabel="Check domain age"
      label="Domain name"
      placeholder="example.com"
      emptyMessage="Enter a domain name, for example example.com."
      privacyNote={PRIVACY}
      busyHint="Asking the domain registry."
      render={(result) => {
        if (!result.found) {
          return (
            <Block title="No record found">
              <p className="text-body">{result.message}</p>
            </Block>
          );
        }
                const expired = result.expiresOn !== null && Date.parse(result.expiresOn) < Date.parse(result.checkedAt);
        return (
          <>
            <Block title="Domain age">
              {result.age ? (
                <>
                  <p className="text-2xl font-bold text-heading">{formatAge(result.age)}</p>
                  <p className="text-body">
                    <Mono>{result.domain}</Mono> was registered {result.age.totalDays.toLocaleString("en-US")} days ago.
                  </p>
                </>
              ) : (
                <p className="text-body">
                  The registry has a record for <Mono>{result.domain}</Mono> but does not show when it was registered, so the age cannot be worked out.
                </p>
              )}
            </Block>
            <Block title="Details">
              <Facts
                items={[
                  { label: "Domain", value: <Mono>{result.domain}</Mono> },
                  ...(result.registeredOn ? [{ label: "Registered on", value: formatDate(result.registeredOn) }] : []),
                  ...(result.expiresOn ? [{ label: "Expires on", value: expired ? `${formatDate(result.expiresOn)} (this date has passed)` : formatDate(result.expiresOn) }] : []),
                  ...(result.updatedOn ? [{ label: "Record last changed", value: formatDate(result.updatedOn) }] : []),
                  ...(result.registrar ? [{ label: "Registrar", value: result.registrar }] : []),
                  ...(result.nameservers.length > 0 ? [{ label: "Name servers", value: <Mono>{result.nameservers.join(", ")}</Mono> }] : []),
                  ...(result.statuses.length > 0 ? [{ label: "Status", value: result.statuses.join(", ") }] : []),
                  { label: "Data from", value: <Mono>{result.registryHost}</Mono> },
                ]}
              />
            </Block>
            <Note>{result.note}</Note>
          </>
        );
      }}
    />
  );
}