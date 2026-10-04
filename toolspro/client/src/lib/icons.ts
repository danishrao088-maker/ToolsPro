import { Calculator, FileText, Globe, Image as ImageIcon, Palette, Type, Wrench, type LucideIcon } from "lucide-react";

// Sirf wahi icons jo use ho rahe hain, taake homepage ka bundle chhota rahe.
// Naye tool ko active karte waqt uska icon yahan jorna hai.
export const iconMap: Record<string, LucideIcon> = {
  Type,
  Calculator,
  Globe,
  Image: ImageIcon,
  FileText,
  Palette,
};

export const fallbackIcon: LucideIcon = Wrench;