import { getListings, postSearch, useMock } from "./poe";
import { mockSearch } from "./mock-search";
import { SearchBody, SearchResultItem, normalizeListing } from "./search";

export interface RunSearchResult {
  league: string;
  total: number;
  queryId: string | null;
  count: number;
  items: SearchResultItem[];
  mock: boolean;
  asOf: string;
}

const FETCH_BATCH = 10; // trade API caps fetch at 10 ids per call

// Orchestrates the 2-step search: POST search -> batch GET fetch (<=10 ids).
// `limit` caps how many listings we hydrate (each 10 = one extra API call).
export async function runSearch(
  league: string,
  body: SearchBody,
  limit = 20,
): Promise<RunSearchResult> {
  if (useMock()) {
    const items = mockSearch(body, Math.min(limit, 12)).map(normalizeListing);
    return {
      league,
      total: items.length,
      queryId: "mockquery",
      count: items.length,
      items,
      mock: true,
      asOf: new Date().toISOString(),
    };
  }

  const search = await postSearch(league, body);
  const ids = search.result.slice(0, Math.max(0, limit));

  const items: SearchResultItem[] = [];
  for (let i = 0; i < ids.length; i += FETCH_BATCH) {
    const batch = ids.slice(i, i + FETCH_BATCH);
    const listings = await getListings(batch, search.id);
    for (const l of listings) items.push(normalizeListing(l));
  }

  return {
    league,
    total: search.total,
    queryId: search.id,
    count: items.length,
    items,
    mock: false,
    asOf: new Date().toISOString(),
  };
}
