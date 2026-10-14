import ScoreReport from "../../components/tools/ScoreReport";
import UrlCheckForm from "../../components/tools/UrlCheckForm";
import type { ScoreResult } from "../../lib/web/webApi";

const VERDICTS: Record<ScoreResult["verdict"], string> = {
  good: "Looks fast",
  needs_work: "Could be faster",
  poor: "Looks slow",
};

export default function PageSpeedTestTool() {
  return (
    <UrlCheckForm<ScoreResult>
      tool="page-speed"
      buttonLabel="Check page speed"
      render={(result) => <ScoreReport result={result} name="Speed score" verdicts={VERDICTS} />}
    />
  );
}