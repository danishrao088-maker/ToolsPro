import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export interface ToolImplementation {
  Workspace: LazyExoticComponent<ComponentType>;
  howTo: string[];
  limitations?: string[];
}


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
};