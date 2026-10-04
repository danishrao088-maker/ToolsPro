import { TextTransformWorkspace, type TextAction } from "../../components/tools/TextTransformWorkspace";
import { formatJson, minifyJson } from "../../lib/tools/jsonViewer";

const actions: TextAction[] = [
  { label: "Format (2 spaces)", run: (input) => formatJson(input, 2) },
  { label: "Format (4 spaces)", run: (input) => formatJson(input, 4) },
  { label: "Minify", run: minifyJson },
];

export default function JsonViewerTool() {
  return (
    <TextTransformWorkspace
      idPrefix="json-viewer"
      inputLabel="JSON"
      inputPlaceholder='{"name":"Ali","tags":["a","b"]}'
      outputLabel="Result"
      outputPlaceholder="The formatted JSON will appear here."
      actions={actions}
      downloadFilename="result.json"
      downloadMimeType="application/json"
    />
  );
}