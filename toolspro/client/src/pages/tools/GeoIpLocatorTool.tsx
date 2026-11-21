import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Block, Facts, Mono, Note } from "../../components/tools/webResults";
import { formatDate } from "../../lib/web/format";
import { formatCoordinates, formatPlace, mapLink } from "../../lib/web/geo";
import { callWebTool, type GeoIpResult } from "../../lib/web/webApi";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; result: GeoIpResult; own: boolean };

const field =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-body";
const PRIVACY =
  "To find the place, this tool sends what you type to our server. If you choose Use my IP address, our server reads the address your connection comes from. The results are not saved by the tool.";

export default function GeoIpLocatorTool() {
  const [value, setValue] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const controller = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );

  async function lookup(query: string, own: boolean) {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState({ kind: "loading" });
    try {
      const result = await callWebTool<GeoIpResult>(
        "geo-ip",
        query,
        current.signal,
      );
      if (!current.signal.aborted) setState({ kind: "done", result, own });
    } catch (error) {
      if (current.signal.aborted) return;
      setState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim();
    if (query === "") {
      setState({
        kind: "error",
        message:
          "Enter an IP address or a domain name, for example 8.8.8.8 or example.com.",
      });
      return;
    }
    void lookup(query, false);
  }

  const loading = state.kind === "loading";

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-3" noValidate>
        <label className="block text-sm font-medium text-heading">
          IP address or domain name
          <input
            className={`${field} mt-1`}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="8.8.8.8 or example.com"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={255}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {loading ? "Looking up…" : "Find location"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void lookup("", true)}
            className="rounded-md border border-line px-4 py-2 font-medium text-heading disabled:opacity-50"
          >
            Use my IP address
          </button>
        </div>
        <p className="text-sm text-body">{PRIVACY}</p>
      </form>

      <div aria-live="polite" className="space-y-4">
        {state.kind === "loading" && (
          <p role="status" className="text-body">
            Looking up the location…
          </p>
        )}
        {state.kind === "error" && (
          <p role="alert" className="text-danger">
            {state.message}
          </p>
        )}
        {state.kind === "done" && !state.result.found && (
          <>
            <Block title="No location found">
              <p className="text-body">{state.result.message}</p>
              {state.result.ip && (
                <p className="text-body">
                  Address: <Mono>{state.result.ip}</Mono>
                </p>
              )}
            </Block>
            <Note>{state.result.note}</Note>
          </>
        )}
        {state.kind === "done" && state.result.found && (
          <Found result={state.result} own={state.own} />
        )}
      </div>

      <p className="text-sm text-body">
        Location data:{" "}
        <a
          className="underline"
          href="https://db-ip.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          IP Geolocation by DB-IP
        </a>
        .
      </p>
    </div>
  );
}

function Found({
  result,
  own,
}: {
  result: Extract<GeoIpResult, { found: true }>;
  own: boolean;
}) {
  const place = formatPlace(result);
  const hasPosition = result.latitude !== null && result.longitude !== null;
  const items: { label: string; value: ReactNode }[] = [
    {
      label: own ? "Your IP address" : "IP address",
      value: <Mono>{result.ip}</Mono>,
    },
    { label: "Version", value: `IPv${result.ipVersion}` },
  ];
  if (result.resolvedFrom)
    items.push({
      label: "Domain name",
      value: <Mono>{result.resolvedFrom}</Mono>,
    });
  if (result.country)
    items.push({
      label: "Country",
      value: result.countryCode
        ? `${result.country} (${result.countryCode})`
        : result.country,
    });
  if (result.region) items.push({ label: "Region", value: result.region });
  if (result.city) items.push({ label: "City", value: result.city });
  if (result.continent)
    items.push({ label: "Continent", value: result.continent });
  if (hasPosition) {
    items.push({
      label: "Approximate position",
      value: (
        <>
          {formatCoordinates(result.latitude!, result.longitude!)}{" "}
          <a
            className="underline"
            href={mapLink(result.latitude!, result.longitude!)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on OpenStreetMap
          </a>
        </>
      ),
    });
  }
  if (result.databaseDate)
    items.push({
      label: "Database updated",
      value: formatDate(result.databaseDate),
    });

  return (
    <>
      <Block title="Location">
        {place !== "" && (
          <p className="text-2xl font-bold text-heading">{place}</p>
        )}
        <Facts items={items} />
      </Block>
      <Note>{result.note}</Note>
    </>
  );
}
