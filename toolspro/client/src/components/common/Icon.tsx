import { createElement } from "react";
import { fallbackIcon, iconMap } from "../../lib/icons";

interface IconProps {
  name: string;
  size?: number;
}

export function Icon({ name, size = 22 }: IconProps) {
  return createElement(iconMap[name] ?? fallbackIcon, { size, "aria-hidden": true });
} 