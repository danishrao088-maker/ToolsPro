import { TextTransformWorkspace, type TextAction } from "../../components/tools/TextTransformWorkspace";
import { binaryToText } from "../../lib/tools/binaryConverter";

const actions: TextAction[] = [{ label: "Convert to text", run: binaryToText }];

export default function BinaryToTextTool() {
  return (
    <TextTransformWorkspace
      idPrefix="binary-to-text"
      inputLabel="Binary code"
      inputPlaceholder="01001000 01101001"
      outputLabel="Text"
      outputPlaceholder="The text will appear here."
      actions={actions}
      downloadFilename="text.txt"
    />
  );
}