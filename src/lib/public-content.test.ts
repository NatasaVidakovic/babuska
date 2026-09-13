import { describe, expect, it, vi } from "vitest";
import {
  PUBLIC_CONTENT_CACHE_KEY,
  fetchPublicContent,
  normalizePublicContent,
  readPublicContentCache,
  writePublicContentCache,
  type PublicContentSnapshot,
} from "./public-content";

const rawBootstrap = {
  settings: {
    instagram: "https://instagram.com/babuska",
    hero_image_url: "https://cdn.test/hero.webp",
    hero_image_variants: {
      "640": {
        width: 640,
        path: "hero/current-640.webp",
        url: "https://cdn.test/current-640.webp",
      },
    },
  },
  categories: [
    { id: "category", name_sr: "Кафа", name_en: "Coffee", sort_order: 1 },
  ],
  items: [
    {
      id: "item",
      name_sr: "Еспресо",
      name_en: "Espresso",
      category_id: "category",
      price: "3.50 КМ",
      image_url: "https://cdn.test/item.webp",
      storage_path: "menu/item/original.jpg",
      image_variants: {},
      description_sr: "Кратка кафа.",
      description_en: "Short coffee.",
      fact_sr: "",
      fact_en: "",
      sort_order: 1,
    },
  ],
  gallery: [],
  stories: [
    {
      id: "story-current",
      image_url: "https://cdn.test/story.webp",
      storage_path: "stories/story-current/original.jpg",
      image_variants: {},
      sort_order: 0,
      published_at: "2099-01-02T00:00:00.000Z",
      expires_at: "2099-01-03T00:00:00.000Z",
    },
  ],
};

describe("public content bootstrap", () => {
  it("uses one native RPC request and maps its payload", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(rawBootstrap), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const result = await fetchPublicContent(
      { url: "https://project.supabase.co", key: "publishable" },
      { fetchImpl },
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const calls = fetchImpl.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0]?.[0]).toBe(
      "https://project.supabase.co/rest/v1/rpc/public_site_bootstrap",
    );
    const options = calls[0]?.[1] as RequestInit;
    expect(options.method).toBe("POST");
    expect((options.headers as Record<string, string>).apikey).toBe(
      "publishable",
    );
    expect(result.categories[0]?.nameSr).toBe("Кафа");
    expect(result.items[0]?.imageVariants).toEqual({});
    expect(result.items[0]?.descriptionSr).toBe("");
    expect(result.items[0]?.descriptionEn).toBe("");
    expect(result.items[0]?.factSr).toBe("");
    expect(result.items[0]?.factEn).toBe("");
    expect(result.settings.heroImageVariants["640"]?.width).toBe(640);
    expect(result.stories[0]?.id).toBe("story-current");
  });

  it("ignores malformed and old cache records", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } as unknown as Storage;
    values.set(PUBLIC_CONTENT_CACHE_KEY, "not-json");
    expect(readPublicContentCache(storage)).toBeNull();
    values.set(
      PUBLIC_CONTENT_CACHE_KEY,
      JSON.stringify({ version: 0, data: rawBootstrap }),
    );
    expect(readPublicContentCache(storage)).toBeNull();
    values.set(
      PUBLIC_CONTENT_CACHE_KEY,
      JSON.stringify({
        version: 3,
        data: { settings: {}, categories: [], items: [], gallery: [] },
      }),
    );
    expect(readPublicContentCache(storage)).toBeNull();
  });

  it("keeps only active, well-formed stories in newest-first order", () => {
    const snapshot = normalizePublicContent({
      ...rawBootstrap,
      stories: [
        ...rawBootstrap.stories,
        {
          id: "story-newest",
          image_url: "https://cdn.test/newest.webp",
          storage_path: "stories/newest/original.jpg",
          image_variants: {},
          published_at: "2099-01-03T00:00:00.000Z",
          expires_at: "2099-01-04T00:00:00.000Z",
        },
        {
          id: "story-expired",
          image_url: "https://cdn.test/old.webp",
          storage_path: "stories/old/original.jpg",
          image_variants: {},
          published_at: "2020-01-01T00:00:00.000Z",
          expires_at: "2020-01-02T00:00:00.000Z",
        },
        { id: "missing-image", expires_at: "2099-01-04T00:00:00.000Z" },
      ],
    });

    expect(snapshot.stories.map((story) => story.id)).toEqual([
      "story-newest",
      "story-current",
    ]);
  });

  it("round-trips a versioned normalized cache", async () => {
    const snapshot = await fetchPublicContent(
      { url: "https://project.supabase.co", key: "publishable" },
      {
        fetchImpl: async () =>
          new Response(JSON.stringify(rawBootstrap), { status: 200 }),
      },
    );
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } as unknown as Storage;
    writePublicContentCache(snapshot, storage);
    expect(readPublicContentCache(storage)).toEqual<PublicContentSnapshot>(
      snapshot,
    );
  });
});
