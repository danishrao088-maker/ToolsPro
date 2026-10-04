import { TextTransformWorkspace, type TextAction } from "../../components/tools/TextTransformWorkspace";
import { textToBinary } from "../../lib/tools/binaryConverter";

const actions: TextAction[] = [{ label: "Convert to binary", run: textToBinary }];

export default function TextToBinaryTool() {
  return (
    <TextTransformWorkspace
      idPrefix="text-to-binary"
      inputLabel="Your text"
      inputPlaceholder="Type or paste text here..."
      outputLabel="Binary"
      outputPlaceholder="The binary code will appear here."
      actions={actions}
      downloadFilename="binary.txt"
    />
  );
}