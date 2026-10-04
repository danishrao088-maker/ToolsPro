export type SmallTextStyle = "superscript" | "subscript" | "smallcaps";

export const SMALL_TEXT_STYLES: { value: SmallTextStyle; label: string }[] = [
  { value: "superscript", label: "Superscript" },
  { value: "subscript", label: "Subscript" },
  { value: "smallcaps", label: "Small caps" },
];

export const MAX_SMALL_TEXT_LENGTH = 10_000;

// Har jori "asli harf + uska chhota roop" hai. Aise likhne se galat jagah baithne ka khatra kam hai.
function fromPairs(pairs: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of pairs.split(" ")) {
    const [from, to] = Array.from(pair);
    if (from !== undefined && to !== undefined) map.set(from, to);
  }
  return map;
}

const MAPS: Record<SmallTextStyle, Map<string, string>> = {
  superscript: fromPairs(
    "aᵃ bᵇ cᶜ dᵈ eᵉ fᶠ gᵍ hʰ iⁱ jʲ kᵏ lˡ mᵐ nⁿ oᵒ pᵖ rʳ sˢ tᵗ uᵘ vᵛ wʷ xˣ yʸ zᶻ " +
      "0⁰ 1¹ 2² 3³ 4⁴ 5⁵ 6⁶ 7⁷ 8⁸ 9⁹ +⁺ -⁻ =⁼ (⁽ )⁾"
  ),
  subscript: fromPairs(
    "aₐ eₑ hₕ iᵢ jⱼ kₖ lₗ mₘ nₙ oₒ pₚ rᵣ sₛ tₜ uᵤ vᵥ xₓ " + "0₀ 1₁ 2₂ 3₃ 4₄ 5₅ 6₆ 7₇ 8₈ 9₉ +₊ -₋ =₌ (₍ )₎"
  ),
  smallcaps: fromPairs("aᴀ bʙ cᴄ dᴅ eᴇ fꜰ gɢ hʜ iɪ jᴊ kᴋ lʟ mᴍ nɴ oᴏ pᴘ qǫ rʀ sꜱ tᴛ uᴜ vᴠ wᴡ yʏ zᴢ"),
};

export type SmallTextResult =
  | { ok: true; output: string; unchanged: number }
  | { ok: false; error: string };

export function convertSmallText(text: string, style: SmallTextStyle): SmallTextResult {
  if (text.length > MAX_SMALL_TEXT_LENGTH) {
    return {
      ok: false,
      error: `The text is too long. The maximum is ${MAX_SMALL_TEXT_LENGTH.toLocaleString("en-US")} characters.`,
    };
  }

  const map = MAPS[style];
  let unchanged = 0;
  let output = "";

  // Array.from emoji jaise do-hisson wale characters ko ek hi character ginta hai
  for (const char of Array.from(text)) {
    const converted = map.get(char.toLowerCase());
    if (converted !== undefined) {
      output += converted;
    } else {
      output += char;
      if (/\p{L}/u.test(char)) unchanged += 1; // sirf harf ginte hain, space/number/emoji nahi
    }
  }

  return { ok: true, output, unchanged };
}