import type { MeasureText } from "./logoSvg";

let context: CanvasRenderingContext2D | null = null;

// Browser ka canvas text ki asli chaurai batata hai. Sirf browser mein chalta hai, is liye iske unit test nahi hain.
export const measureWithCanvas: MeasureText = (text, fontSize, fontStack, bold) => {
  context ??= document.createElement("canvas").getContext("2d");
  if (!context) return text.length * fontSize * 0.6; // canvas na mile to andaza
  context.font = `${bold ? 700 : 400} ${fontSize}px ${fontStack}`;
  return context.measureText(text).width;
};