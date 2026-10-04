import {
  Binary,
  Braces,
  Cake,
  Calculator,
  CaseLower,
  FileText,
  Globe,
  Image as ImageIcon,
  Palette,
  Type,
  Wrench,
  type LucideIcon,
} from "lucide-react";


export const iconMap: Record<string, LucideIcon> = {
  Type,
  Calculator,
  Globe,
  Image: ImageIcon,
  FileText,
  Palette,
  CaseLower,
  Binary,
  Braces,
  Cake,
};

export const fallbackIcon: LucideIcon = Wrench;