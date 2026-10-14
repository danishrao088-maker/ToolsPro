import ScoreReport from "../../components/tools/ScoreReport";
import UrlCheckForm from "../../components/tools/UrlCheckForm";
import type { ScoreResult } from "../../lib/web/webApi";

const VERDICTS: Record<ScoreResult["verdict"], string> = {
  good: "Looks mobile friendly",
  needs_work: "Needs work for phones",
  poor: "Not mobile friendly",
};

export default function MobileFriendlyTestTool() {
  return (
    <UrlCheckForm<ScoreResult>
      tool="mobile-friendly"
      buttonLabel="Test mobile friendliness"
      busyHint="The page and its first stylesheets are being read."
      render={(result) => <ScoreReport result={result} name="Mobile score" verdicts={VERDICTS} />}
    />
  );
}