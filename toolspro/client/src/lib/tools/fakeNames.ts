import { plural } from "../format";
import type { TransformResult } from "./types";

export type NameRegion = "english" | "south-asian";

export const REGION_OPTIONS: { value: NameRegion; label: string }[] = [
  { value: "english", label: "English-style names" },
  { value: "south-asian", label: "South Asian-style names" },
];

export const COUNT_OPTIONS = [
  { value: "5", label: "5 names" },
  { value: "10", label: "10 names" },
  { value: "20", label: "20 names" },
  { value: "50", label: "50 names" },
];

export const NAME_LISTS: Record<NameRegion, { first: readonly string[]; last: readonly string[] }> = {
  english: {
    first: [
      "James", "Oliver", "Henry", "Thomas", "Daniel", "Samuel", "Lucas", "Ethan", "Noah", "Liam",
      "Emma", "Olivia", "Grace", "Charlotte", "Sophie", "Hannah", "Lily", "Chloe", "Ella", "Alice",
      "Ben", "Jack", "Adam", "Ryan", "Nora", "Ruby", "Emily", "Isla", "Leo", "Megan",
    ],
    last: [
      "Smith", "Johnson", "Brown", "Taylor", "Wilson", "Davies", "Evans", "Walker", "Wright", "Hall",
      "Green", "Baker", "Clarke", "Turner", "Hughes", "Parker", "Collins", "Morgan", "Cooper", "Bell",
      "Murphy", "Reed", "Ward", "Cook", "Price", "Bennett", "Gray", "Fox", "Hunt", "Shaw",
    ],
  },
  "south-asian": {
    first: [
      "Ali", "Ahmed", "Hassan", "Usman", "Bilal", "Hamza", "Zain", "Omar", "Faisal", "Imran",
      "Sara", "Ayesha", "Fatima", "Zainab", "Maryam", "Hina", "Sana", "Noor", "Amna", "Iqra",
      "Raza", "Kamran", "Nadia", "Farah", "Asad", "Tariq", "Saad", "Rida", "Hira", "Mehwish",
    ],
    last: [
      "Khan", "Ahmed", "Malik", "Sheikh", "Qureshi", "Siddiqui", "Butt", "Chaudhry", "Raza", "Hussain",
      "Mirza", "Ansari", "Baig", "Javed", "Iqbal", "Rehman", "Shah", "Abbasi", "Farooq", "Nawaz",
      "Gill", "Bhatti", "Rana", "Cheema", "Awan", "Memon", "Lodhi", "Niazi", "Kakar", "Yousaf",
    ],
  },
};

export interface FakeNameInput {
  region: NameRegion;
  count: string;
}

const MAX_ATTEMPTS_PER_NAME = 50;

function pick(list: readonly string[], random: () => number): string {
  const index = Math.min(list.length - 1, Math.floor(random() * list.length));
  return list[index] ?? "";
}

// `random` bahar se aata hai: asal mein Math.random, test mein tay shuda number.
export function generateFakeNames(input: FakeNameInput, random: () => number = Math.random): TransformResult {
  const lists = NAME_LISTS[input.region];
  if (!lists) return { ok: false, error: "Choose a valid name style." };
  if (!COUNT_OPTIONS.some((option) => option.value === input.count)) {
    return { ok: false, error: "Choose how many names to create." };
  }

  const wanted = Number(input.count);
  const names = new Set<string>();
  let attempts = 0;

  // Duplicate nikalne par dobara koshish, lekin hadd ke saath taake loop kabhi na atke
  while (names.size < wanted && attempts < wanted * MAX_ATTEMPTS_PER_NAME) {
    attempts += 1;
    names.add(`${pick(lists.first, random)} ${pick(lists.last, random)}`);
  }

  const note = "They are made by combining common first and last names, so one may match a real person by chance. Use them only for testing and samples.";
  const short = names.size < wanted ? ` Only ${plural(names.size, "different name")} could be made.` : "";

  return {
    ok: true,
    output: [...names].join("\n"),
    message: `${plural(names.size, "name")} created. ${note}${short}`,
  };
}