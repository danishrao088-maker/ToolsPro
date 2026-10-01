import type { Category } from "../types/tool";

export const categories: Category[] = [
  { id: "text", name: "Text Tools", slug: "text-tools", icon: "Type",
    description: "Convert, format and analyze text." },
  { id: "calculator", name: "Calculator Tools", slug: "calculator-tools", icon: "Calculator",
    description: "Quick calculators for everyday needs." },
  { id: "web-seo", name: "Web and SEO Tools", slug: "web-and-seo-tools", icon: "Globe",
    description: "Check and improve websites and search visibility." },
  { id: "image", name: "Image Tools", slug: "image-tools", icon: "Image",
    description: "Compress, convert and prepare images." },
  { id: "pdf", name: "PDF and Document Tools", slug: "pdf-and-document-tools", icon: "FileText",
    description: "Work with PDF and office documents." },
  { id: "design", name: "Design Tools", slug: "design-tools", icon: "Palette",
    description: "Create simple logos, flyers and posters." },
];