// Currency trade tags used in the exchange `have`/`want` arrays.
// A subset of the most-traded PoE2 currencies; extend as needed.
// Tags verified against live client data (see FINDINGS.md).

export interface Currency {
  tag: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { tag: "divine", name: "Divine Orb" },
  { tag: "exalted", name: "Exalted Orb" },
  { tag: "chaos", name: "Chaos Orb" },
  { tag: "regal", name: "Regal Orb" },
  { tag: "vaal", name: "Vaal Orb" },
  { tag: "alch", name: "Orb of Alchemy" },
  { tag: "chance", name: "Orb of Chance" },
  { tag: "aug", name: "Orb of Augmentation" },
  { tag: "transmute", name: "Orb of Transmutation" },
  { tag: "mirror", name: "Mirror of Kalandra" },
];

const BY_TAG = new Map(CURRENCIES.map((c) => [c.tag, c]));

export function isKnownCurrency(tag: string): boolean {
  return BY_TAG.has(tag);
}

export function currencyName(tag: string): string {
  return BY_TAG.get(tag)?.name ?? tag;
}
