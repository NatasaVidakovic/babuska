import type {
  AdminGalleryItem,
  AdminMenuItem,
  AdminStoryItem,
  MenuCategory,
  SiteSettings,
} from "./content";
import { parseMediaVariants } from "./media-variants";

const CACHE_VERSION = 4;
const REQUEST_TIMEOUT_MS = 8_000;
export const PUBLIC_CONTENT_CACHE_KEY = "cafe-babuska:public-content:v1";

export type PublicContentSnapshot = {
  settings: SiteSettings;
  categories: MenuCategory[];
  items: AdminMenuItem[];
  gallery: AdminGalleryItem[];
  stories: AdminStoryItem[];
};

export type PublicSupabaseConfig = { url: string; key: string };

const firstConfiguredValue = (...values: unknown[]) =>
  values
    .find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    ?.trim();

export const publicSupabaseConfig: PublicSupabaseConfig | null = (() => {
  const url = firstConfiguredValue(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const key = firstConfiguredValue(
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return url && key && !key.includes("your-local-anon-key")
    ? { url: url.replace(/\/$/, ""), key }
    : null;
})();

export function publicMediaUrl(
  path: string,
  config: PublicSupabaseConfig | null = publicSupabaseConfig,
) {
  return config
    ? `${config.url}/storage/v1/object/public/cafe-media/${path}`
    : "";
}

export const emptySiteSettings: SiteSettings = {
  instagram: "",
  facebook: "",
  tiktok: "",
  phone: "",
  email: "",
  socialHandle: "",
  heroImage: "",
  heroImageStoragePath: "",
  heroImageVariants: {},
  heroTitleSr: "",
  heroTitleEn: "",
  heroTitleRu: "",
  heroDescriptionSr: "",
  heroDescriptionEn: "",
  heroDescriptionRu: "",
  heroCtaSr: "",
  heroCtaEn: "",
  heroCtaRu: "",
  footerAddressHeadingSr: "",
  footerAddressHeadingEn: "",
  footerAddressHeadingRu: "",
  footerAddressLine1Sr: "",
  footerAddressLine1En: "",
  footerAddressLine1Ru: "",
  footerAddressLine2Sr: "",
  footerAddressLine2En: "",
  footerAddressLine2Ru: "",
  footerAddressLine3Sr: "",
  footerAddressLine3En: "",
  footerAddressLine3Ru: "",
  footerHoursHeadingSr: "",
  footerHoursHeadingEn: "",
  footerHoursHeadingRu: "",
  footerHoursLine1Sr: "",
  footerHoursLine1En: "",
  footerHoursLine1Ru: "",
  footerHoursLine2Sr: "",
  footerHoursLine2En: "",
  footerHoursLine2Ru: "",
  footerHoursLine3Sr: "",
  footerHoursLine3En: "",
  footerHoursLine3Ru: "",
  footerContactHeadingSr: "",
  footerContactHeadingEn: "",
  footerContactHeadingRu: "",
  footerCopyrightSr: "",
  footerCopyrightEn: "",
  footerCopyrightRu: "",
};

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const string = (value: unknown) => (typeof value === "string" ? value : "");
const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

function settingsFromRaw(value: unknown): SiteSettings {
  const row = record(value) ?? {};
  return {
    instagram: string(row.instagram),
    facebook: string(row.facebook),
    tiktok: string(row.tiktok),
    phone: string(row.phone),
    email: string(row.email),
    socialHandle: string(row.social_handle),
    heroImage: string(row.hero_image_url),
    heroImageStoragePath: string(row.hero_image_storage_path),
    heroImageVariants: parseMediaVariants(row.hero_image_variants),
    heroTitleSr: string(row.hero_title_sr),
    heroTitleEn: string(row.hero_title_en),
    heroTitleRu: string(row.hero_title_ru),
    heroDescriptionSr: string(row.hero_description_sr),
    heroDescriptionEn: string(row.hero_description_en),
    heroDescriptionRu: string(row.hero_description_ru),
    heroCtaSr: string(row.hero_cta_sr),
    heroCtaEn: string(row.hero_cta_en),
    heroCtaRu: string(row.hero_cta_ru),
    footerAddressHeadingSr: string(row.footer_address_heading_sr),
    footerAddressHeadingEn: string(row.footer_address_heading_en),
    footerAddressHeadingRu: string(row.footer_address_heading_ru),
    footerAddressLine1Sr: string(row.footer_address_line_1_sr),
    footerAddressLine1En: string(row.footer_address_line_1_en),
    footerAddressLine1Ru: string(row.footer_address_line_1_ru),
    footerAddressLine2Sr: string(row.footer_address_line_2_sr),
    footerAddressLine2En: string(row.footer_address_line_2_en),
    footerAddressLine2Ru: string(row.footer_address_line_2_ru),
    footerAddressLine3Sr: string(row.footer_address_line_3_sr),
    footerAddressLine3En: string(row.footer_address_line_3_en),
    footerAddressLine3Ru: string(row.footer_address_line_3_ru),
    footerHoursHeadingSr: string(row.footer_hours_heading_sr),
    footerHoursHeadingEn: string(row.footer_hours_heading_en),
    footerHoursHeadingRu: string(row.footer_hours_heading_ru),
    footerHoursLine1Sr: string(row.footer_hours_line_1_sr),
    footerHoursLine1En: string(row.footer_hours_line_1_en),
    footerHoursLine1Ru: string(row.footer_hours_line_1_ru),
    footerHoursLine2Sr: string(row.footer_hours_line_2_sr),
    footerHoursLine2En: string(row.footer_hours_line_2_en),
    footerHoursLine2Ru: string(row.footer_hours_line_2_ru),
    footerHoursLine3Sr: string(row.footer_hours_line_3_sr),
    footerHoursLine3En: string(row.footer_hours_line_3_en),
    footerHoursLine3Ru: string(row.footer_hours_line_3_ru),
    footerContactHeadingSr: string(row.footer_contact_heading_sr),
    footerContactHeadingEn: string(row.footer_contact_heading_en),
    footerContactHeadingRu: string(row.footer_contact_heading_ru),
    footerCopyrightSr: string(row.footer_copyright_sr),
    footerCopyrightEn: string(row.footer_copyright_en),
    footerCopyrightRu: string(row.footer_copyright_ru),
  };
}

function array(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function normalizePublicContent(value: unknown): PublicContentSnapshot {
  const root = record(value) ?? {};
  const categories = array(root.categories)
    .map(record)
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map((row) => ({
      id: string(row.id),
      nameSr: string(row.name_sr),
      nameEn: string(row.name_en),
      nameRu: string(row.name_ru),
      sortOrder: number(row.sort_order),
    }))
    .filter((item) => item.id)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const items = array(root.items)
    .map(record)
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map((row) => ({
      id: string(row.id),
      nameSr: string(row.name_sr),
      nameEn: string(row.name_en),
      nameRu: string(row.name_ru),
      categoryId: string(row.category_id),
      price: string(row.price),
      image: string(row.image_url),
      storagePath: string(row.storage_path),
      imageVariants: parseMediaVariants(row.image_variants),
      // The public menu intentionally contains only the drink name and price.
      // Older records may still carry placeholder text such as "Тест" / "Test";
      // never expose it while the administrator is cleaning up legacy content.
      descriptionSr: "",
      descriptionEn: "",
      descriptionRu: "",
      factSr: "",
      factEn: "",
      factRu: "",
      sortOrder: number(row.sort_order),
    }))
    .filter((item) => item.id && item.categoryId)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map(({ sortOrder: _sortOrder, ...item }) => item);
  const gallery = array(root.gallery)
    .map(record)
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map((row) => ({
      id: string(row.id),
      image: string(row.image_url),
      storagePath: string(row.storage_path),
      imageVariants: parseMediaVariants(row.image_variants),
      altSr: string(row.alt_sr),
      altEn: string(row.alt_en),
      altRu: string(row.alt_ru),
      sortOrder: number(row.sort_order),
      isPublished: true,
    }))
    .filter((item) => item.id && item.image)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const stories = array(root.stories)
    .map(record)
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map((row) => ({
      id: string(row.id),
      image: string(row.image_url),
      storagePath: string(row.storage_path),
      imageVariants: parseMediaVariants(row.image_variants),
      sortOrder: number(row.sort_order),
      isPublished: true,
      publishedAt: string(row.published_at),
      expiresAt: string(row.expires_at),
    }))
    .filter(
      (item) =>
        Boolean(item.id) &&
        Boolean(item.image) &&
        Number.isFinite(Date.parse(item.publishedAt)) &&
        Date.parse(item.expiresAt) > Date.now(),
    )
    .sort(
      (left, right) =>
        Date.parse(right.publishedAt) - Date.parse(left.publishedAt) ||
        right.id.localeCompare(left.id),
    );
  return {
    settings: settingsFromRaw(root.settings),
    categories,
    items,
    gallery,
    stories,
  };
}

export async function fetchPublicContent(
  config: PublicSupabaseConfig,
  {
    fetchImpl = fetch,
    timeoutMs = REQUEST_TIMEOUT_MS,
  }: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<PublicContentSnapshot> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(
      `${config.url.replace(/\/$/, "")}/rest/v1/rpc/public_site_bootstrap`,
      {
        method: "POST",
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
          "Content-Type": "application/json",
        },
        body: "{}",
        signal: controller.signal,
      },
    );
    if (!response.ok)
      throw new Error(`Public content request failed (${response.status}).`);
    return normalizePublicContent(await response.json());
  } finally {
    globalThis.clearTimeout(timer);
  }
}

export function readPublicContentCache(
  storage: Storage = localStorage,
): PublicContentSnapshot | null {
  try {
    const parsed = JSON.parse(storage.getItem(PUBLIC_CONTENT_CACHE_KEY) ?? "");
    const cachedSettings = record(parsed?.data?.settings);
    if (
      parsed?.version !== CACHE_VERSION ||
      !cachedSettings ||
      typeof cachedSettings.heroImage !== "string" ||
      !record(cachedSettings.heroImageVariants) ||
      !Array.isArray(parsed.data?.categories) ||
      !Array.isArray(parsed.data?.items) ||
      !Array.isArray(parsed.data?.gallery) ||
      !Array.isArray(parsed.data?.stories) ||
      !parsed.data.categories.every(
        (category: unknown) =>
          typeof record(category)?.id === "string" &&
          typeof record(category)?.nameSr === "string" &&
          typeof record(category)?.nameRu === "string",
      ) ||
      !parsed.data.items.every(
        (item: unknown) =>
          typeof record(item)?.id === "string" &&
          Boolean(record(record(item)?.imageVariants)),
      ) ||
      !parsed.data.gallery.every(
        (item: unknown) =>
          typeof record(item)?.id === "string" &&
          Boolean(record(record(item)?.imageVariants)),
      ) ||
      !parsed.data.stories.every(
        (item: unknown) =>
          typeof record(item)?.id === "string" &&
          typeof record(item)?.image === "string" &&
          typeof record(item)?.expiresAt === "string" &&
          Boolean(record(record(item)?.imageVariants)),
      )
    )
      return null;
    return parsed.data as PublicContentSnapshot;
  } catch {
    return null;
  }
}

export function writePublicContentCache(
  data: PublicContentSnapshot,
  storage: Storage = localStorage,
) {
  try {
    storage.setItem(
      PUBLIC_CONTENT_CACHE_KEY,
      JSON.stringify({ version: CACHE_VERSION, savedAt: Date.now(), data }),
    );
  } catch {
    // Content remains usable when storage is disabled or full.
  }
}
