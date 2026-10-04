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
    "meta-tag-generator": {
    Workspace: lazy(() => import("./MetaTagGeneratorTool")),
    howTo: [
      "Enter your page title and description.",
      "Add optional details such as keywords, author and canonical URL, and choose the search engine instructions.",
      "Select Generate meta tags, then copy the code.",
      "Paste the code inside the head section of your page.",
    ],
    limitations: [
      "Search engines decide what to show in results. Good tags help, but they do not guarantee a particular title or description.",
      "Most search engines ignore the keywords tag, so it is optional.",
      "A title over about 60 characters or a description over about 160 characters may be cut off in search results.",
      "Special characters such as quotes and ampersands are escaped for you.",
      "Your input is processed in your browser and is not sent to our server.",
    ],
  },
  "open-graph-generator": {
    Workspace: lazy(() => import("./OpenGraphGeneratorTool")),
    howTo: [
      "Enter the title and the full address of the page you want to share.",
      "Optionally add a description, an image address, an image description and a site name.",
      "Select Generate Open Graph tags, then copy the code.",
      "Paste the code inside the head section of that page.",
    ],
    limitations: [
      "The image must be publicly available on the web for other sites to show it.",
      "Each site decides how to show a shared link, and some keep an older preview for a while.",
      "Your input is processed in your browser and is not sent to our server.",
    ],
  },
  "twitter-card-generator": {
    Workspace: lazy(() => import("./TwitterCardGeneratorTool")),
    howTo: [
      "Choose a card type and enter a title.",
      "Optionally add a description, an image address, an image description, and the site and creator handles.",
      "Select Generate card tags, then copy the code.",
      "Paste the code inside the head section of the page you want to share.",
    ],
    limitations: [
      "Handles must be 1 to 15 letters, numbers or underscores. An @ is added for you.",
      "The tool creates standard twitter: meta tags. How a platform shows them is up to that platform.",
      "Your input is processed in your browser and is not sent to our server.",
    ],
  },
  "robots-txt-generator": {
    Workspace: lazy(() => import("./RobotsTxtGeneratorTool")),
    howTo: [
      "Choose a rule type. For Custom rules, enter the paths to block and, if needed, the paths to allow.",
      "Optionally add the full address of your sitemap.",
      "Select Generate robots.txt, then copy it or download the file.",
      "Upload the file to the top level of your site, so it is found at /robots.txt.",
    ],
    limitations: [
      "A robots.txt file is a request, not protection. It is public, and well-behaved crawlers follow it but others may not.",
      "Blocking a page in robots.txt does not always keep it out of search results. To ask for that, use a noindex tag.",
      "This tool creates one group of rules for all crawlers (User-agent: *).",
      "Your input is processed in your browser and is not sent to our server.",
    ],
  },
  "xml-sitemap-generator": {
    Workspace: lazy(() => import("./XmlSitemapGeneratorTool")),
    howTo: [
      "Enter your page addresses, one per line. Each must start with http:// or https://.",
      "Optionally set a last modified date, a change frequency and a priority.",
      "Select Generate sitemap, then copy it or download sitemap.xml.",
      "Upload the file to the top level of your site.",
    ],
    limitations: [
      "All addresses must belong to one site.",
      "You can add up to 5,000 addresses per sitemap. Larger sites need several sitemap files.",
      "Some search engines ignore priority and change frequency, so they are optional.",
      "The last modified date you choose is added to every address.",
      "Your input is processed in your browser and is not sent to our server.",
    ],
  },
    "keyword-density-checker": {
    Workspace: lazy(() => import("./KeywordDensityCheckerTool")),
    howTo: [
      "Paste or type your text.",
      "Choose whether to count single words or two-word and three-word phrases.",
      "Keep \"Ignore common English words\" on to hide words such as the and of.",
      "Read the table. It shows the 20 most used entries, how many times each appears and its share of the text.",
    ],
    limitations: [
      "Density is the number of times an entry appears divided by the number of entries of that length in your text.",
      "The common-word list covers English only. For other languages, every word is counted.",
      "There is no ideal density. Search engines do not use a fixed target, so write for your readers first.",
      "The text can be up to 500,000 characters.",
      "Your text is processed in your browser and is not sent to our server.",
    ],
  },
  "small-text-generator": {
    Workspace: lazy(() => import("./SmallTextGeneratorTool")),
    howTo: [
      "Type or paste your text.",
      "Look at the three styles: superscript, subscript and small caps.",
      "Select Copy under the style you want.",
      "Paste it where you need it.",
    ],
    limitations: [
      "This text is made of special Unicode characters, not a font. It looks different depending on the font and device.",
      "Some letters have no small version in a style. They stay as normal letters, and the tool tells you how many.",
      "Screen readers may read these characters oddly or skip them, so avoid them for important information.",
      "Some sites and apps do not show these characters correctly.",
      "Your text is processed in your browser and is not sent to our server.",
    ],
  },
  "invisible-character": {
    Workspace: lazy(() => import("./InvisibleCharacterTool")),
    howTo: [
      "Choose how many characters you need.",
      "Pick a character from the list and read its note.",
      "Select Copy.",
      "Paste it where you need it.",
    ],
    limitations: [
      "Some websites and apps remove these characters or reject them, so a character may not work everywhere.",
      "Different characters behave differently. Some take up space and some take none.",
      "Do not use blank text to mislead people or to get around the rules of a service.",
      "Screen readers may announce these characters or skip them.",
      "Everything happens in your browser. Nothing is sent to our server.",
    ],
  },
  "fake-name-generator": {
    Workspace: lazy(() => import("./FakeNameGeneratorTool")),
    howTo: [
      "Choose a name style and how many names you need.",
      "Select Generate names. Select it again for a new set.",
      "Copy the names or download them as a text file.",
    ],
    limitations: [
      "Names are random combinations of common first and last names. A name may match a real person by chance.",
      "Use them for testing, samples and examples only. Do not use them to pretend to be someone.",
      "The tool creates names only, not addresses, emails or numbers.",
      "Names are created in your browser and are not sent to our server.",
    ],
  },
  "html-viewer": {
    Workspace: lazy(() => import("./HtmlViewerTool")),
    howTo: [
      "Type or paste your HTML code.",
      "Optionally allow scripts or resources from other websites. Both are off by default.",
      "Select Show preview.",
      "Edit the code and select Show preview again to see the change.",
    ],
    limitations: [
      "The preview runs in a sandboxed frame, apart from this page. Links, forms and popups are blocked.",
      "With scripts off, code that needs JavaScript will not work. Turn scripts on only for code you trust.",
      "When you allow resources from other websites, your browser may contact the addresses named in your code.",
      "Only https addresses are allowed for outside resources, and some sites may refuse to load.",
      "The HTML can be up to 200,000 characters.",
      "Your code is processed in your browser and is not sent to our server.",
    ],
  },
};