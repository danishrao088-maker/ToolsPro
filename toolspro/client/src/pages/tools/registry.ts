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
    "hours-calculator": {
    Workspace: lazy(() => import("./HoursCalculatorTool")),
    howTo: [
      "Choose the start time and the end time.",
      "If you took an unpaid break, enter its length in minutes.",
      "For an overnight shift, tick \"The shift ends the next day\".",
      "Read the total in hours and minutes, and as decimal hours.",
    ],
    limitations: [
      "The tool works out one shift at a time. For several days, add the results yourself.",
      "A shift can be at most 24 hours long.",
      "Decimal hours are rounded to two places, so 20 minutes shows as 0.33.",
      "Clock changes for daylight saving time are not taken into account.",
      "Your times are processed in your browser and are not sent to our server.",
    ],
  },
  "what-is-my-browser": {
    Workspace: lazy(() => import("./WhatIsMyBrowserTool")),
    howTo: [
      "Open this page. Your details appear automatically.",
      "Read the summary at the top, or scroll for more details.",
      "Select Copy to copy the full list, for example to send it to someone who is helping you.",
    ],
    limitations: [
      "The details come from what your browser reports about itself. Some browsers hide or change them on purpose.",
      "Windows 10 and Windows 11 look the same to websites, and Mac versions are not shown for the same reason.",
      "Some browsers pretend to be others, and some, such as Brave, cannot be told apart from Chrome.",
      "Websites you visit can usually see this same information. This tool only shows it to you.",
      "The details stay in your browser and are not sent to our server.",
    ],
  },
  "online-text-editor": {
    Workspace: lazy(() => import("./OnlineTextEditorTool")),
    howTo: [
      "Type or paste your text, or select Open a file to load a text file.",
      "Check the word and character counts below the editor.",
      "Select Copy, or Download to save the text as a file.",
      "Select Clear to start again. Undo brings the text back.",
    ],
    limitations: [
      "Your text is not saved. If you close or refresh the page it is lost, so download anything you want to keep.",
      "This is a plain text editor. It has no bold, italics or other formatting.",
      "You can open plain text files up to 1,000,000 bytes, and the editor holds up to 1,000,000 characters.",
      "Word counts split text at spaces, so they may differ from other programs for some languages.",
      "Your text is processed in your browser and is not sent to our server.",
    ],
  },
    "citation-generator": {
    Workspace: lazy(() => import("./CitationGeneratorTool")),
    howTo: [
      "Choose a style (APA or MLA) and the type of source: a book, a journal article or a web page.",
      "Enter the authors, one per line, as Family name, Given name. Then fill in the title and the other details.",
      "Select Create citation.",
      "Select Copy citation and paste it into your document. In Word or Google Docs the italics are kept.",
    ],
    limitations: [
      "Only books, journal articles and web pages are supported, in APA 7 and MLA 9 style. Other source types and styles are not available.",
      "A name written without a comma is treated as an organization. Write people as Family name, Given name, for example Khan, Ali.",
      "The tool does not change capital letters in your title. APA uses sentence case and MLA uses title case, so type the title the way your style needs it.",
      "Names with suffixes such as Jr., and more than 20 authors, are not handled.",
      "Web addresses are shown in full, including https://. Some MLA guides leave that part out, so remove it if your guide asks.",
      "The tool does not add a hanging indent. Add one in your document if your style requires it.",
      "Citation rules have many special cases. Always check the result against the official guide your school or publisher requires.",
      "Your details are processed in your browser and are not sent to our server.",
    ],
  },
    "image-converter": {
    Workspace: lazy(() => import("./ImageConverterTool")),
    howTo: [
      "Choose your images, or drop them on the box. You can add several at once.",
      "Pick the format to convert to: JPG, PNG or WebP.",
      "For JPG and WebP, set the quality. For JPG, you can also pick the background colour that fills transparent areas.",
      "Select Convert images, then download each result.",
    ],
    limitations: [
      "You can open JPG, PNG, WebP, GIF, BMP and AVIF images, as far as your browser supports them. Results are saved as JPG, PNG or WebP.",
      "For animated images such as GIFs, only the first frame is converted.",
      "JPG does not support transparency, so transparent areas are filled with the background colour you choose.",
      "JPG and WebP lose a little detail each time you save. Keep your original files.",
      "Saving a new copy removes hidden information from the picture, such as camera details and location. Colours may shift slightly.",
      "Whether WebP can be created depends on your browser. If it cannot, the tool tells you.",
      "You can add up to 20 images at a time, up to 30 MB each. Very large pictures may fail on devices with little memory.",
      "Your images are processed in your browser and are not sent to our server.",
    ],
  },
  "image-compressor": {
    Workspace: lazy(() => import("./ImageCompressorTool")),
    howTo: [
      "Choose your images, or drop them on the box. You can add several at once.",
      "Lower the quality, make the picture smaller, or save it as WebP to reduce the file size.",
      "Select Compress images.",
      "Compare the sizes shown for each image, then download the ones you want.",
    ],
    limitations: [
      "How much space you save depends on the picture. A file that is already well compressed may get bigger, and the tool shows you when that happens.",
      "PNG files are lossless, so quality has no effect on them. To make a PNG smaller, reduce its size or save it as JPG or WebP.",
      "JPG and WebP lose a little detail each time you save. Keep your original files.",
      "For animated images such as GIFs, only the first frame is kept, and the result is saved as JPG unless you choose another format.",
      "Transparent areas become white when the result is a JPG.",
      "Saving a new copy removes hidden information from the picture, such as camera details and location.",
      "You can add up to 20 images at a time, up to 30 MB each.",
      "Your images are processed in your browser and are not sent to our server.",
    ],
  },
    "svg-converter": {
    Workspace: lazy(() => import("./SvgConverterTool")),
    howTo: [
      "Choose an SVG file, or drop it on the box.",
      "Pick the format (PNG, JPG or WebP) and how wide the picture should be.",
      "Select Convert SVG.",
      "Select Download to save your image.",
    ],
    limitations: [
      "One SVG at a time, up to 5 MB.",
      "Fonts that are not stored inside the SVG may look different from how you see them elsewhere.",
      "Pictures inside the SVG that point to other websites may not appear.",
      "Your file is processed in your browser and is not sent to our server.",
    ],
  },
  "favicon-generator": {
    Workspace: lazy(() => import("./FaviconGeneratorTool")),
    howTo: [
      "Choose your logo. A square PNG or an SVG gives the best result.",
      "Choose whether the picture should fit inside the square or fill it.",
      "Select Create favicons.",
      "Download the files one by one or as a ZIP, and add the shown code to your pages.",
    ],
    limitations: [
      "One image at a time.",
      "Very small icons lose detail, so a simple logo works best.",
      "Your image is processed in your browser and is not sent to our server.",
    ],
  },
    "qr-code-generator": {
    Workspace: lazy(() => import("./QrCodeGeneratorTool")),
    howTo: [
      "Choose what the code is for: a link or text, a Wi-Fi network, an email or a phone number.",
      "Fill in the details. The QR code appears and changes as you type.",
      "Choose the colours and size if you want. Keep a dark code on a light background.",
      "Select Download PNG or Download SVG. Scan the code with your phone before you print or share it.",
    ],
    limitations: [
      "The text can be up to 1000 bytes long. Longer text makes a crowded code that is hard to scan.",
      "A code cannot be changed after you print it. Create a new one if the link changes.",
      "Very light colours or a transparent background on a dark surface can stop phones from reading the code.",
      "Your text, links and Wi-Fi password are used in your browser only and are not sent to our server.",
    ],
  },
    "merge-pdf": {
    Workspace: lazy(() => import("./MergePdfTool")),
    howTo: [
      "Choose two or more PDF files, or drop them on the box.",
      "Use Up and Down to put the files in the order you want. Remove any file you do not need.",
      "Select Merge PDFs.",
      "Select Download merged.pdf.",
    ],
    limitations: [
      "You can merge up to 20 files at a time, up to 50 MB each and 200 MB in total.",
      "PDFs protected with a password cannot be merged. Remove the password first.",
      "Interactive parts such as form fields, bookmarks and links may not be kept in the merged file.",
      "Your files are processed in your browser and are not sent to our server.",
    ],
  },
  "split-pdf": {
    Workspace: lazy(() => import("./SplitPdfTool")),
    howTo: [
      "Choose a PDF file. The tool shows how many pages it has.",
      "Choose how to split it, and type the pages, for example 1-3, 5, 8-. The 8- means page 8 to the end.",
      "Select Split PDF.",
      "Download each new PDF, or all of them together as a ZIP file.",
    ],
    limitations: [
      "One PDF at a time, up to 50 MB.",
      "PDFs protected with a password cannot be split. Remove the password first.",
      "One split can create up to 200 PDFs.",
      "Your file is processed in your browser and is not sent to our server.",
    ],
  },
  "rotate-pdf": {
    Workspace: lazy(() => import("./RotatePdfTool")),
    howTo: [
      "Choose a PDF file. The tool shows how many pages it has.",
      "Choose how far to rotate, and whether to rotate all pages or only the pages you type.",
      "Select Rotate PDF.",
      "Select Download rotated PDF.",
    ],
    limitations: [
      "One PDF at a time, up to 50 MB.",
      "The tool does not show page previews. Check the result in your PDF viewer.",
      "PDFs protected with a password cannot be rotated. Remove the password first.",
      "Your file is processed in your browser and is not sent to our server.",
    ],
  }, 
    "pdf-to-jpg": {
    Workspace: lazy(() => import("./PdfToJpgTool")),
    howTo: [
      "Choose a PDF file. The tool shows how many pages it has.",
      "Choose JPG or PNG, the resolution, and whether to convert all pages or only the pages you type.",
      "Select Convert PDF and wait while each page is converted.",
      "Download one page at a time, or all pages together as a ZIP file.",
    ],
    limitations: [
      "One PDF at a time, up to 50 MB, and up to 100 pages in one conversion.",
      "PDFs protected with a password cannot be converted. Remove the password first.",
      "A higher resolution gives a sharper picture but a bigger file, and needs more memory in your browser.",
      "Your file is processed in your browser and is not sent to our server.",
    ],
  },
  "pdf-to-zip": {
    Workspace: lazy(() => import("./PdfToZipTool")),
    howTo: [
      "Choose one or more PDF files, or drop them on the box.",
      "Put the files in the order you like and remove any you do not need.",
      "Select Create ZIP.",
      "Select the Download button to save the ZIP file.",
    ],
    limitations: [
      "Up to 20 files at a time, up to 50 MB each and 200 MB in total.",
      "PDF files are often already compressed, so the ZIP file may be only a little smaller than the PDFs.",
      "The files go into the ZIP file without any changes to their content.",
      "Your files are processed in your browser and are not sent to our server.",
    ],
  }, 
    "jpg-to-word": {
    Workspace: lazy(() => import("./JpgToWordTool")),
    howTo: [
      "Choose one or more pictures, or drop them on the box.",
      "Put the pictures in the order you like and remove any you do not need.",
      "Choose the page size, the margin and how big each picture should be.",
      "Select Create Word file, then select the Download button.",
    ],
    limitations: [
      "Up to 20 pictures at a time, up to 30 MB each and 100 MB in total.",
      "Each picture is placed on its own page as a picture. Text inside a picture is not converted into editable text.",
      "Word may look slightly different in other programs, such as Google Docs or LibreOffice.",
      "Your pictures are processed in your browser and are not sent to our server.",
    ],
  },
      "image-to-text-converter": {
    Workspace: lazy(() => import("./ImageToTextTool")),
    howTo: [
      "Choose a picture that has printed text, such as a photo of a page or a screenshot.",
      "Choose the language of the text.",
      "Select Extract text and wait. The first time can take longer.",
      "Check the text, fix any mistakes in the box, then copy it or download it as a .txt file.",
    ],
    limitations: [
      "One picture at a time, up to 20 MB. Very large pictures are made smaller before reading.",
      "Printed text in a clear picture works best. Handwriting, blurry photos and unusual fonts may give wrong words.",
      "Only the languages in the list are supported.",
      "Always read the result once to check it. The tool can make mistakes.",
      "Your picture is processed in your browser and is not sent to our server.",
    ],
  },
    "logo-maker": {
    Workspace: lazy(() => import("./LogoMakerTool")),
    howTo: [
      "Type the name of your business, brand or project. You can add a short tagline.",
      "Choose a layout, a letter style and a symbol, and pick the colors you like.",
      "Check the preview. It changes as you make choices.",
      "Download the logo as a PNG picture or as an SVG file.",
    ],
    limitations: [
      "This tool makes simple logos from a name and a ready-made symbol. It does not draw custom pictures.",
      "Only fonts that are already on most computers are used, so the choice of letter styles is small.",
      "The SVG file may look a little different on a computer that does not have the same fonts. The PNG always looks like the preview.",
      "Check that your name or design is not already used by someone else before you use it as a trademark.",
      "Your logo is made in your browser and is not sent to our server.",
    ],
  },
    "flyer-maker": {
    Workspace: lazy(() => import("./FlyerMakerTool")),
    howTo: [
      "Type a headline. Add a subtitle, a description, the details and a button text if you want them.",
      "Choose a design, the paper size, the letter style and a colour. You can also add a picture.",
      "Check the preview. It changes as you type.",
      "Download the flyer as a PNG picture or as a PDF.",
    ],
    limitations: [
      "This tool makes a one-page flyer from a few ready-made designs. You cannot move the items around.",
      "If the text is too long for one page, a warning is shown. Make the text shorter.",
      "Only fonts that are already on most computers are used.",
      "The PDF holds the flyer as a picture, so its text cannot be selected or searched.",
      "Your flyer and picture are processed in your browser and are not sent to our server.",
    ],
  },
};