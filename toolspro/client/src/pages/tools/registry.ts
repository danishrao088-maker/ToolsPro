import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export interface ToolImplementation {
  Workspace: LazyExoticComponent<ComponentType>;
  howTo: string[];
  limitations?: string[];
}

// Har tool yahan ek entry hai. Slug server ki registry (tools.ts) ke slug se milna chahiye.
export const toolImplementations: Partial<Record<string, ToolImplementation>> = {
  "uppercase-to-lowercase": {
    Workspace: lazy(() => import("./UppercaseToLowercaseTool")),
    howTo: [
      "Paste or type your text in the Your text box.",
      "Select Convert to lowercase.",
      "Review the result, then copy it or download it as a text file.",
    ],
    limitations: [
      "Your text is processed in your browser and is not sent to our server.",
      "The maximum input size is 500,000 characters.",
    ],
  },
  "text-to-binary": {
    Workspace: lazy(() => import("./TextToBinaryTool")),
    howTo: [
      "Type or paste your text in the Your text box.",
      "Select Convert to binary.",
      "Copy the binary code or download it as a text file.",
    ],
    limitations: [
      "Text is encoded as UTF-8, so characters such as é or emoji use more than one byte (8 bits each).",
      "Your text is processed in your browser and is not sent to our server.",
      "The maximum input size is 100,000 characters.",
    ],
  },
  "binary-to-text": {
    Workspace: lazy(() => import("./BinaryToTextTool")),
    howTo: [
      "Paste your binary code in the Binary code box.",
      "Select Convert to text.",
      "Copy the text or download it as a text file.",
    ],
    limitations: [
      "Use only 0 and 1. Spaces and line breaks between bytes are optional.",
      "The number of bits must be a multiple of 8, and the bytes must form valid UTF-8 text.",
      "Your input is processed in your browser and is not sent to our server.",
      "The maximum input size is 900,000 characters.",
    ],
  },
  "json-viewer": {
    Workspace: lazy(() => import("./JsonViewerTool")),
    howTo: [
      "Paste your JSON in the JSON box.",
      "Choose Format (2 spaces), Format (4 spaces) or Minify.",
      "If the JSON is invalid, the error message explains what is wrong. Fix it and try again.",
    ],
    limitations: [
      "Whole numbers larger than 9,007,199,254,740,991 can lose precision, because browsers read JSON numbers as floating point.",
      "Keys that look like whole numbers (such as \"2\") may move to the start of an object.",
      "Comments and trailing commas are not valid JSON and are reported as errors.",
      "Your JSON is processed in your browser and is not sent to our server. The maximum size is 1,000,000 characters.",
    ],
  },
  "age-calculator": {
    Workspace: lazy(() => import("./AgeCalculatorTool")),
    howTo: [
      "Choose your date of birth.",
      "Optionally change Age at the date of. It starts as today's date.",
      "Select Calculate age.",
    ],
    limitations: [
      "Only calendar dates are used. The time of day is ignored.",
      "A birthday on 29 February is counted on 28 February in years that are not leap years.",
      "Dates before 1900 are not supported.",
    ],
  },
};