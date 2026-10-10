
export type Measure = (text: string) => number;

export function wrapText(text: string, maxWidth: number, measure: Measure): string[] {
  const out: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (paragraph.trim() === "") {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line === "" ? word : `${line} ${word}`;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line !== "") out.push(line);
      
      let rest = word;
      // Bohat lamba lafz: jitna samaye utna ek line mein
      while (measure(rest) > maxWidth && Array.from(rest).length > 1) {
        const chars = Array.from(rest);
        let take = chars.length - 1;
        while (take > 1 && measure(chars.slice(0, take).join("")) > maxWidth) take -= 1;
        out.push(chars.slice(0, take).join(""));
        rest = chars.slice(take).join("");
      }
      line = rest;
    }
    if (line !== "") out.push(line);
  }
  return out;
}