import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "./assets/brand/logo-babuska.webp";
import {
  TranslatedField,
  TranslationSummary,
} from "./components/AdminTranslationFields";
import {
  CONTENT_SUFFIX,
  translationIssues,
  type TranslationEntry,
} from "./lib/admin-translations";
import {
  ADMIN_TABS,
  adminText,
  type AdminLanguage,
  type AdminTab,
} from "./lib/admin-i18n";
import type {
  AdminGalleryItem,
  AdminMenuItem,
  AdminStoryItem,
  MenuCategory,
  SiteSettings,
} from "./lib/content";
import {
  IMAGE_PICKER_ACCEPT,
  removableMediaPaths,
  removeUploadedImage,
  snapshotSelectedFiles,
  uploadImage,
  type MediaFolder,
} from "./lib/media";
import { isCyrillicContent } from "./lib/cyrillic";
import { mediaVariantPaths, parseMediaVariants } from "./lib/media-variants";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type SessionState = "loading" | "signed-out" | "denied" | "ready";
type FeedbackTone = "success" | "error" | "warning";
type Feedback = { text: string; tone: FeedbackTone } | null;

type TranslationResult = Record<string, Pick<TranslationEntry, "en" | "ru">>;

const emptyItem: AdminMenuItem = {
  id: "",
  nameSr: "",
  nameEn: "",
  nameRu: "",
  categoryId: "",
  price: "",
  image: "",
  storagePath: "",
  imageVariants: {},
  descriptionSr: "",
  descriptionEn: "",
  descriptionRu: "",
  factSr: "",
  factEn: "",
  factRu: "",
};
const emptyCategory: MenuCategory = {
  id: "",
  nameSr: "",
  nameEn: "",
  nameRu: "",
  sortOrder: 0,
};
const emptyGallery: AdminGalleryItem = {
  id: "",
  image: "",
  storagePath: "",
  imageVariants: {},
  altSr: "",
  altEn: "",
  altRu: "",
  sortOrder: 0,
  isPublished: true,
};
const emptySettings: SiteSettings = {
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

function Field({
  label,
  hint,
  children,
  full = false,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  const fieldId = React.useId();
  const isFormControl =
    React.isValidElement(children) &&
    typeof children.type === "string" &&
    ["input", "select", "textarea"].includes(children.type);
  const control = isFormControl
    ? React.cloneElement(children as React.ReactElement<{ id?: string }>, {
        id: fieldId,
      })
    : children;
  return (
    <div className={`admin-field${full ? " admin-field--full" : ""}`}>
      {isFormControl ? (
        <label htmlFor={fieldId}>{label}</label>
      ) : (
        <span className="admin-field__label">{label}</span>
      )}
      {control}
      {hint && <small>{hint}</small>}
    </div>
  );
}

function MediaUpload({
  label,
  value,
  busy,
  language,
  onUpload,
}: {
  label: string;
  value: string;
  busy: boolean;
  language: AdminLanguage;
  onUpload: (file: File) => Promise<void>;
}) {
  const tr = (sr: string, en: string) => adminText(language, sr, en);
  return (
    <div className="admin-media-upload">
      <span className="admin-media-upload__label">{label}</span>
      {value && (
        <img
          className="admin-media-upload__preview"
          src={value}
          alt={tr("Преглед одабране слике", "Selected image preview")}
        />
      )}
      <label className="admin-media-upload__trigger">
        <span>
          {busy
            ? tr("Слика се преноси…", "Uploading image…")
            : value
              ? tr("Замијени слику", "Replace image")
              : tr("Одабери слику са уређаја", "Choose image from device")}
        </span>
        <input
          type="file"
          accept={IMAGE_PICKER_ACCEPT}
          disabled={busy}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void onUpload(file);
          }}
        />
      </label>
      <small>
        {tr(
          "JPEG, PNG, WebP, AVIF, HEIC или HEIF · највише 10 MB",
          "JPEG, PNG, WebP, AVIF, HEIC or HEIF · up to 10 MB",
        )}
      </small>
    </div>
  );
}

type TextSettingKey = Exclude<keyof SiteSettings, "heroImageVariants">;

const settingFields: [TextSettingKey, string][] = [
  ["instagram", "instagram"],
  ["facebook", "facebook"],
  ["tiktok", "tiktok"],
  ["phone", "phone"],
  ["email", "email"],
  ["socialHandle", "social_handle"],
  ["heroImage", "hero_image_url"],
  ["heroImageStoragePath", "hero_image_storage_path"],
  ["heroTitleSr", "hero_title_sr"],
  ["heroTitleEn", "hero_title_en"],
  ["heroTitleRu", "hero_title_ru"],
  ["heroDescriptionSr", "hero_description_sr"],
  ["heroDescriptionEn", "hero_description_en"],
  ["heroDescriptionRu", "hero_description_ru"],
  ["heroCtaSr", "hero_cta_sr"],
  ["heroCtaEn", "hero_cta_en"],
  ["heroCtaRu", "hero_cta_ru"],
  ["footerAddressHeadingSr", "footer_address_heading_sr"],
  ["footerAddressHeadingEn", "footer_address_heading_en"],
  ["footerAddressHeadingRu", "footer_address_heading_ru"],
  ["footerAddressLine1Sr", "footer_address_line_1_sr"],
  ["footerAddressLine1En", "footer_address_line_1_en"],
  ["footerAddressLine1Ru", "footer_address_line_1_ru"],
  ["footerAddressLine2Sr", "footer_address_line_2_sr"],
  ["footerAddressLine2En", "footer_address_line_2_en"],
  ["footerAddressLine2Ru", "footer_address_line_2_ru"],
  ["footerAddressLine3Sr", "footer_address_line_3_sr"],
  ["footerAddressLine3En", "footer_address_line_3_en"],
  ["footerAddressLine3Ru", "footer_address_line_3_ru"],
  ["footerHoursHeadingSr", "footer_hours_heading_sr"],
  ["footerHoursHeadingEn", "footer_hours_heading_en"],
  ["footerHoursHeadingRu", "footer_hours_heading_ru"],
  ["footerHoursLine1Sr", "footer_hours_line_1_sr"],
  ["footerHoursLine1En", "footer_hours_line_1_en"],
  ["footerHoursLine1Ru", "footer_hours_line_1_ru"],
  ["footerHoursLine2Sr", "footer_hours_line_2_sr"],
  ["footerHoursLine2En", "footer_hours_line_2_en"],
  ["footerHoursLine2Ru", "footer_hours_line_2_ru"],
  ["footerHoursLine3Sr", "footer_hours_line_3_sr"],
  ["footerHoursLine3En", "footer_hours_line_3_en"],
  ["footerHoursLine3Ru", "footer_hours_line_3_ru"],
  ["footerContactHeadingSr", "footer_contact_heading_sr"],
  ["footerContactHeadingEn", "footer_contact_heading_en"],
  ["footerContactHeadingRu", "footer_contact_heading_ru"],
  ["footerCopyrightSr", "footer_copyright_sr"],
  ["footerCopyrightEn", "footer_copyright_en"],
  ["footerCopyrightRu", "footer_copyright_ru"],
];

const localizedSettingNames = [
  "heroTitle",
  "heroDescription",
  "heroCta",
  "footerAddressHeading",
  "footerAddressLine1",
  "footerAddressLine2",
  "footerAddressLine3",
  "footerHoursHeading",
  "footerHoursLine1",
  "footerHoursLine2",
  "footerHoursLine3",
  "footerContactHeading",
  "footerCopyright",
] as const;

const settingLabels = {
  heroTitle: { sr: "Наслов на почетној", en: "Homepage title" },
  heroDescription: { sr: "Опис на почетној", en: "Homepage description" },
  heroCta: { sr: "Текст дугмета", en: "Button text" },
  footerAddressHeading: { sr: "Наслов адресе", en: "Address heading" },
  footerAddressLine1: {
    sr: "Адреса · улица и број",
    en: "Address · street and number",
  },
  footerAddressLine2: { sr: "Адреса · град", en: "Address · city" },
  footerAddressLine3: { sr: "Адреса · држава", en: "Address · country" },
  footerHoursHeading: {
    sr: "Наслов радног времена",
    en: "Opening hours heading",
  },
  footerHoursLine1: {
    sr: "Радно вријеме · први ред",
    en: "Opening hours · first line",
  },
  footerHoursLine2: {
    sr: "Радно вријеме · други ред",
    en: "Opening hours · second line",
  },
  footerHoursLine3: {
    sr: "Радно вријеме · трећи ред",
    en: "Opening hours · third line",
  },
  footerContactHeading: { sr: "Наслов контакта", en: "Contact heading" },
  footerCopyright: { sr: "Ауторска права", en: "Copyright" },
} as const;

function settingsFromRow(row: Record<string, unknown> | null): SiteSettings {
  const output = { ...emptySettings };
  for (const [key, column] of settingFields)
    output[key] =
      typeof row?.[column] === "string" ? (row[column] as string) : "";
  output.heroImageVariants = parseMediaVariants(row?.hero_image_variants);
  return output;
}

function settingsPayload(settings: SiteSettings) {
  return Object.fromEntries([
    ["id", 1],
    ["hero_image_variants", settings.heroImageVariants],
    ...settingFields.map(([key, column]) => [
      column,
      settings[key].trim() || null,
    ]),
  ]);
}

function RecordSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <section className="admin-panel">
      <div className="admin-panel__heading">
        <div>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="admin-record-list">
        {children.length ? (
          children
        ) : (
          <div className="admin-empty">{empty}</div>
        )}
      </div>
    </section>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [uiLanguage, setUiLanguage] = useState<AdminLanguage>("sr");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [menuCategoryFilter, setMenuCategoryFilter] = useState("");
  const [tab, setTab] = useState<AdminTab>(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    return requested && Object.prototype.hasOwnProperty.call(ADMIN_TABS, requested)
      ? (requested as AdminTab)
      : "stories";
  });
  const [items, setItems] = useState<AdminMenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [galleryItems, setGalleryItems] = useState<AdminGalleryItem[]>([]);
  const [stories, setStories] = useState<AdminStoryItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(emptySettings);
  const [savedHeroPath, setSavedHeroPath] = useState("");
  const [draft, setDraft] = useState<AdminMenuItem>(emptyItem);
  const [galleryDraft, setGalleryDraft] =
    useState<AdminGalleryItem>(emptyGallery);
  const [categoryDraft, setCategoryDraft] =
    useState<MenuCategory>(emptyCategory);
  const [editingItem, setEditingItem] = useState(false);
  const [editingGallery, setEditingGallery] = useState(false);
  const [editingCategory, setEditingCategory] = useState(false);
  const [uploading, setUploading] = useState<MediaFolder | null>(null);
  const tr = (sr: string, en: string) => adminText(uiLanguage, sr, en);
  const validateCyrillic = (values: string[]) => {
    if (isCyrillicContent(values)) return true;
    notice(
      tr(
        "Српски текст мора бити унесен ћирилицом.",
        "Serbian content must be entered in Cyrillic.",
      ),
      "error",
    );
    return false;
  };
  const completeTranslations = async (
    entries: TranslationEntry[],
  ): Promise<TranslationResult> => {
    const trimmed = entries.map((entry) => ({
      ...entry,
      sr: entry.sr.trim(),
      en: entry.en.trim(),
      ru: entry.ru.trim(),
    }));
    const missing = trimmed.filter(
      (entry) => entry.sr && (!entry.en || !entry.ru),
    );
    const existing = Object.fromEntries(
      trimmed.map((entry) => [entry.key, { en: entry.en, ru: entry.ru }]),
    ) as TranslationResult;
    if (!missing.length) return existing;

    let response;
    try {
      response = await supabase.functions.invoke("translate-content", {
        body: { entries: missing.map(({ key, sr }) => ({ key, sr })) },
      });
    } catch {
      return existing;
    }
    const { data, error } = response;
    // A translation is optional. Saving Serbian content must still work if the
    // administrator has not configured the translation service yet.
    if (error) return existing;
    const translations = data?.translations as
      { key?: string; en?: string; ru?: string }[] | undefined;
    if (!Array.isArray(translations)) return existing;
    for (const entry of missing) {
      const translated = translations.find((item) => item.key === entry.key);
      if (!translated?.en?.trim() || !translated.ru?.trim()) continue;
      existing[entry.key] = {
        en: entry.en || translated.en.trim(),
        ru: entry.ru || translated.ru.trim(),
      };
    }
    return existing;
  };
  const notice = (text: string, tone: FeedbackTone) =>
    setFeedback({ text, tone });

  const persistedPaths = useMemo(
    () =>
      new Set(
        [
          ...items.map((item) => item.storagePath),
          ...items.flatMap((item) => mediaVariantPaths(item.imageVariants)),
          ...galleryItems.map((item) => item.storagePath),
          ...galleryItems.flatMap((item) =>
            mediaVariantPaths(item.imageVariants),
          ),
          ...stories.map((item) => item.storagePath),
          ...stories.flatMap((item) => mediaVariantPaths(item.imageVariants)),
          savedHeroPath,
          ...mediaVariantPaths(settings.heroImageVariants),
        ].filter(Boolean),
      ),
    [items, galleryItems, stories, savedHeroPath, settings.heroImageVariants],
  );
  const discardPending = async (
    path: string,
    variants: AdminMenuItem["imageVariants"] = {},
  ) => {
    const pending = removableMediaPaths(path, variants).filter(
      (candidate) => !persistedPaths.has(candidate),
    );
    if (pending.length)
      await removeUploadedImage(pending).catch(() => undefined);
  };

  const load = async () => {
    const [
      categoriesResult,
      itemsResult,
      galleryResult,
      storiesResult,
      settingsResult,
    ] = await Promise.all([
      supabase
        .from("menu_categories")
        .select("id, name_sr, name_en, name_ru, sort_order")
        .order("sort_order"),
      supabase
        .from("menu_items")
        .select(
          "id, name_sr, name_en, name_ru, category_id, price, image_url, storage_path, image_variants, description_sr, description_en, description_ru, fact_sr, fact_en, fact_ru",
        )
        .order("sort_order"),
      supabase
        .from("gallery_items")
        .select(
          "id, image_url, storage_path, image_variants, alt_sr, alt_en, alt_ru, is_published, sort_order",
        )
        .order("sort_order"),
      supabase
        .from("story_items")
        .select(
          "id, image_url, storage_path, image_variants, sort_order, is_published, published_at, expires_at",
        )
        .order("published_at", { ascending: false }),
      supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    const error =
      categoriesResult.error ??
      itemsResult.error ??
      galleryResult.error ??
      storiesResult.error ??
      settingsResult.error;
    if (error) {
      notice(error.message, "error");
      return;
    }
    const nextCategories = (categoriesResult.data ?? []).map((category) => ({
      id: category.id,
      nameSr: category.name_sr ?? "",
      nameEn: category.name_en ?? "",
      nameRu: category.name_ru ?? "",
      sortOrder: category.sort_order,
    }));
    setCategories(nextCategories);
    setCategoryDraft((current) =>
      current.id || current.nameSr || current.nameEn || current.nameRu
        ? current
        : {
            ...current,
            sortOrder:
              Math.max(
                -1,
                ...nextCategories.map((category) => category.sortOrder),
              ) + 1,
          },
    );
    setItems(
      (itemsResult.data ?? []).map((item) => ({
        id: item.id,
        nameSr: item.name_sr ?? "",
        nameEn: item.name_en ?? "",
        nameRu: item.name_ru ?? "",
        categoryId: item.category_id,
        price: item.price,
        image: item.image_url ?? "",
        storagePath: item.storage_path ?? "",
        imageVariants: parseMediaVariants(item.image_variants),
        descriptionSr: item.description_sr ?? "",
        descriptionEn: item.description_en ?? "",
        descriptionRu: item.description_ru ?? "",
        factSr: item.fact_sr ?? "",
        factEn: item.fact_en ?? "",
        factRu: item.fact_ru ?? "",
      })),
    );
    setGalleryItems(
      (galleryResult.data ?? []).map((item) => ({
        id: item.id,
        image: item.image_url,
        storagePath: item.storage_path ?? "",
        imageVariants: parseMediaVariants(item.image_variants),
        altSr: item.alt_sr,
        altEn: item.alt_en,
        altRu: item.alt_ru ?? "",
        isPublished: item.is_published,
        sortOrder: item.sort_order,
      })),
    );
    setStories(
      (storiesResult.data ?? []).map((story) => ({
        id: story.id,
        image: story.image_url,
        storagePath: story.storage_path,
        imageVariants: parseMediaVariants(story.image_variants),
        sortOrder: story.sort_order,
        isPublished: story.is_published,
        publishedAt: story.published_at,
        expiresAt: story.expires_at,
      })),
    );
    const nextSettings = settingsFromRow(settingsResult.data);
    setSettings(nextSettings);
    setSavedHeroPath(nextSettings.heroImageStoragePath);
    setDraft((current) =>
      current.id || current.categoryId || !nextCategories[0]
        ? current
        : { ...current, categoryId: nextCategories[0].id },
    );
  };

  const verify = async () => {
    if (!isSupabaseConfigured) {
      setSessionState("signed-out");
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setSessionState("signed-out");
      return;
    }
    const { data, error } = await supabase.rpc("is_admin");
    if (error || !data) {
      setSessionState("denied");
      return;
    }
    setSessionState("ready");
    await load();
  };

  useEffect(() => {
    void verify();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void verify();
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      notice(
        tr(
          "Позадински систем није покренут.",
          "Supabase backend is not running.",
        ),
        "error",
      );
      return;
    }
    setFeedback(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) notice(error.message, "error");
  };

  const uploadFor = async (file: File, folder: MediaFolder) => {
    setUploading(folder);
    setFeedback(null);
    const currentPath =
      folder === "hero"
        ? settings.heroImageStoragePath
        : folder === "menu"
          ? draft.storagePath
          : galleryDraft.storagePath;
    const currentVariants =
      folder === "hero"
        ? settings.heroImageVariants
        : folder === "menu"
          ? draft.imageVariants
          : galleryDraft.imageVariants;
    try {
      const media = await uploadImage(file, folder);
      await discardPending(currentPath, currentVariants);
      if (folder === "hero")
        setSettings((current) => ({
          ...current,
          heroImage: media.url,
          heroImageStoragePath: media.path,
          heroImageVariants: media.variants,
        }));
      else if (folder === "menu")
        setDraft((current) => ({
          ...current,
          image: media.url,
          storagePath: media.path,
          imageVariants: media.variants,
        }));
      else
        setGalleryDraft((current) => ({
          ...current,
          image: media.url,
          storagePath: media.path,
          imageVariants: media.variants,
        }));
    } catch (error) {
      notice(
        error instanceof Error
          ? error.message
          : tr("Слика није пренесена.", "Image upload failed."),
        "error",
      );
    } finally {
      setUploading(null);
    }
  };

  const uploadStories = async (selected: readonly File[]) => {
    if (!selected.length) return;
    setUploading("stories");
    setFeedback(null);
    const failures: string[] = [];
    let uploaded = 0;
    for (const file of selected) {
      try {
        const media = await uploadImage(file, "stories");
        const now = new Date();
        const { error } = await supabase.from("story_items").insert({
          image_url: media.url,
          storage_path: media.path,
          image_variants: media.variants,
          sort_order: 0,
          is_published: true,
          published_at: now.toISOString(),
          expires_at: new Date(now.getTime() + 86_400_000).toISOString(),
        });
        if (error) {
          await removeUploadedImage([
            media.path,
            ...mediaVariantPaths(media.variants),
          ]).catch(() => undefined);
          throw error;
        }
        uploaded += 1;
      } catch (error) {
        failures.push(
          `${file.name}: ${
            error instanceof Error
              ? error.message
              : tr("пренос није успио", "upload failed")
          }`,
        );
      }
    }
    setUploading(null);
    await load();
    if (failures.length) {
      notice(failures.join("\n"), "error");
      return;
    }
    notice(
      tr(
        uploaded === 1
          ? "Прича је објављена на 24 часа."
          : `Објављено је ${uploaded} прича на 24 часа.`,
        uploaded === 1
          ? "Story published for 24 hours."
          : `${uploaded} stories published for 24 hours.`,
      ),
      "success",
    );
  };

  const republishStory = async (story: AdminStoryItem) => {
    const now = new Date();
    const { error } = await supabase
      .from("story_items")
      .update({
        is_published: true,
        published_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 86_400_000).toISOString(),
      })
      .eq("id", story.id);
    if (error) notice(error.message, "error");
    else {
      notice(tr("Прича је поново објављена.", "Story republished."), "success");
      await load();
    }
  };

  const removeStory = async (story: AdminStoryItem) => {
    if (!window.confirm(tr("Избрисати ову причу?", "Delete this story?")))
      return;
    const { error } = await supabase
      .from("story_items")
      .delete()
      .eq("id", story.id);
    if (error) {
      notice(error.message, "error");
      return;
    }
    await removeUploadedImage([
      story.storagePath,
      ...mediaVariantPaths(story.imageVariants),
    ]).catch(() =>
      notice(
        tr(
          "Прича је избрисана, али слика није уклоњена.",
          "Story deleted, but its image could not be removed.",
        ),
        "error",
      ),
    );
    notice(tr("Прича је избрисана.", "Story deleted."), "success");
    await load();
  };

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    const nameSr = categoryDraft.nameSr.trim();
    if (!nameSr) {
      notice(
        tr(
          "Унесите назив категорије на српском.",
          "Enter the category name in Serbian.",
        ),
        "error",
      );
      return;
    }
    if (!validateCyrillic([nameSr])) return;
    let translations: TranslationResult;
    try {
      translations = await completeTranslations([
        {
          key: "name",
          sr: nameSr,
          en: categoryDraft.nameEn,
          ru: categoryDraft.nameRu,
        },
      ]);
    } catch (error) {
      notice(error instanceof Error ? error.message : String(error), "error");
      return;
    }
    const payload = {
      name: nameSr,
      name_sr: nameSr,
      name_en: translations.name.en,
      name_ru: translations.name.ru,
      sort_order: categoryDraft.sortOrder,
      is_active: true,
    };
    const result = editingCategory
      ? await supabase
          .from("menu_categories")
          .update(payload)
          .eq("id", categoryDraft.id)
          .select("id")
          .single()
      : await supabase
          .from("menu_categories")
          .insert(payload)
          .select("id")
          .single();
    if (result.error) notice(result.error.message, "error");
    else {
      const saved = {
        ...categoryDraft,
        id: result.data.id,
        nameEn: translations.name.en,
        nameRu: translations.name.ru,
      };
      const incomplete = noticeSaved(
        tr("Категорија је сачувана.", "Category saved."),
        [nameEntry(saved)],
      );
      setCategoryDraft(
        incomplete
          ? saved
          : {
              ...emptyCategory,
              sortOrder:
                Math.max(
                  -1,
                  ...categories.map((category) => category.sortOrder),
                  saved.sortOrder,
                ) + 1,
            },
      );
      setEditingCategory(incomplete);
      await load();
    }
  };

  const removeCategory = async (id: string) => {
    if (
      !window.confirm(
        tr(
          "Избрисати категорију? Категорија са ставкама не може бити избрисана.",
          "Delete category? A category containing menu items cannot be deleted.",
        ),
      )
    )
      return;
    const { error } = await supabase
      .from("menu_categories")
      .delete()
      .eq("id", id);
    if (error) notice(error.message, "error");
    else {
      notice(tr("Категорија је избрисана.", "Category deleted."), "success");
      await load();
    }
  };

  const saveItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.categoryId || !draft.nameSr.trim() || !draft.price.trim()) {
      notice(
        tr(
          "Одаберите категорију и унесите назив и цијену ставке.",
          "Choose a category and enter the item name and price.",
        ),
        "error",
      );
      return;
    }
    if (!validateCyrillic([draft.nameSr])) return;
    let translations: TranslationResult;
    try {
      translations = await completeTranslations([
        {
          key: "name",
          sr: draft.nameSr,
          en: draft.nameEn,
          ru: draft.nameRu,
        },
        {
          key: "description",
          sr: draft.descriptionSr,
          en: draft.descriptionEn,
          ru: draft.descriptionRu,
        },
        { key: "fact", sr: draft.factSr, en: draft.factEn, ru: draft.factRu },
      ]);
    } catch (error) {
      notice(error instanceof Error ? error.message : String(error), "error");
      return;
    }
    const oldPath = editingItem
      ? (items.find((item) => item.id === draft.id)?.storagePath ?? "")
      : "";
    const payload = {
      name: draft.nameSr.trim(),
      name_sr: draft.nameSr.trim(),
      name_en: translations.name.en,
      name_ru: translations.name.ru,
      category_id: draft.categoryId,
      price: draft.price.trim(),
      image_url: draft.image,
      storage_path: draft.storagePath || null,
      image_variants: draft.imageVariants,
      description: "",
      description_sr: draft.descriptionSr.trim(),
      description_en: translations.description.en,
      description_ru: translations.description.ru,
      fact: translations.fact.en || null,
      fact_sr: draft.factSr.trim() || null,
      fact_en: translations.fact.en || null,
      fact_ru: translations.fact.ru || null,
      is_published: true,
      ...(editingItem ? {} : { sort_order: items.length }),
    };
    const result = editingItem
      ? await supabase
          .from("menu_items")
          .update(payload)
          .eq("id", draft.id)
          .select("id")
          .single()
      : await supabase.from("menu_items").insert(payload).select("id").single();
    if (result.error) {
      notice(result.error.message, "error");
      return;
    }
    const oldItem = editingItem
      ? items.find((item) => item.id === draft.id)
      : undefined;
    if (oldPath && oldPath !== draft.storagePath)
      await removeUploadedImage([
        oldPath,
        ...mediaVariantPaths(oldItem?.imageVariants ?? {}),
      ]).catch(() =>
        notice(
          tr(
            "Ставка је сачувана, али стара слика није уклоњена.",
            "Menu item saved, but the old image could not be removed.",
          ),
          "error",
        ),
      );
    const saved = {
      ...draft,
      id: result.data.id,
      nameEn: translations.name.en,
      nameRu: translations.name.ru,
      descriptionEn: translations.description.en,
      descriptionRu: translations.description.ru,
      factEn: translations.fact.en,
      factRu: translations.fact.ru,
    };
    const incomplete = noticeSaved(
      tr("Ставка менија је сачувана.", "Menu item saved."),
      itemEntries(saved),
    );
    setDraft(
      incomplete ? saved : { ...emptyItem, categoryId: draft.categoryId },
    );
    setEditingItem(incomplete);
    await load();
  };

  const cancelItem = async () => {
    await discardPending(draft.storagePath, draft.imageVariants);
    setDraft({ ...emptyItem, categoryId: categories[0]?.id ?? "" });
    setEditingItem(false);
  };
  const removeItem = async (item: AdminMenuItem) => {
    if (
      !window.confirm(
        tr("Избрисати ову ставку менија?", "Delete this menu item?"),
      )
    )
      return;
    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", item.id);
    if (error) {
      notice(error.message, "error");
      return;
    }
    await removeUploadedImage([
      item.storagePath,
      ...mediaVariantPaths(item.imageVariants),
    ]).catch(() =>
      notice(
        tr(
          "Ставка менија је избрисана, али слика није уклоњена.",
          "Menu item deleted, but its image could not be removed.",
        ),
        "error",
      ),
    );
    notice(tr("Ставка менија је избрисана.", "Menu item deleted."), "success");
    await load();
  };

  const saveGallery = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!galleryDraft.image || !galleryDraft.altSr.trim()) {
      notice(
        tr(
          "Пренесите слику и унесите опис на српском.",
          "Upload an image and enter a Serbian description.",
        ),
        "error",
      );
      return;
    }
    if (!validateCyrillic([galleryDraft.altSr])) return;
    let translations: TranslationResult;
    try {
      translations = await completeTranslations([
        {
          key: "alt",
          sr: galleryDraft.altSr,
          en: galleryDraft.altEn,
          ru: galleryDraft.altRu,
        },
      ]);
    } catch (error) {
      notice(error instanceof Error ? error.message : String(error), "error");
      return;
    }
    const oldPath = editingGallery
      ? (galleryItems.find((item) => item.id === galleryDraft.id)
          ?.storagePath ?? "")
      : "";
    const payload = {
      image_url: galleryDraft.image,
      storage_path: galleryDraft.storagePath || null,
      image_variants: galleryDraft.imageVariants,
      alt_sr: galleryDraft.altSr.trim(),
      alt_en: translations.alt.en,
      alt_ru: translations.alt.ru,
      is_published: galleryDraft.isPublished,
      sort_order: galleryDraft.sortOrder,
    };
    const result = editingGallery
      ? await supabase
          .from("gallery_items")
          .update(payload)
          .eq("id", galleryDraft.id)
          .select("id")
          .single()
      : await supabase
          .from("gallery_items")
          .insert(payload)
          .select("id")
          .single();
    if (result.error) {
      notice(result.error.message, "error");
      return;
    }
    const oldGalleryItem = editingGallery
      ? galleryItems.find((item) => item.id === galleryDraft.id)
      : undefined;
    if (oldPath && oldPath !== galleryDraft.storagePath)
      await removeUploadedImage([
        oldPath,
        ...mediaVariantPaths(oldGalleryItem?.imageVariants ?? {}),
      ]).catch(() =>
        notice(
          tr(
            "Галерија је сачувана, али стара слика није уклоњена.",
            "Gallery saved, but the old image could not be removed.",
          ),
          "error",
        ),
      );
    const saved = {
      ...galleryDraft,
      id: result.data.id,
      altEn: translations.alt.en,
      altRu: translations.alt.ru,
    };
    const incomplete = noticeSaved(
      tr("Галеријска слика је сачувана.", "Gallery image saved."),
      galleryEntries(saved),
    );
    setGalleryDraft(incomplete ? saved : emptyGallery);
    setEditingGallery(incomplete);
    await load();
  };

  const cancelGallery = async () => {
    await discardPending(galleryDraft.storagePath, galleryDraft.imageVariants);
    setGalleryDraft(emptyGallery);
    setEditingGallery(false);
  };
  const removeGallery = async (item: AdminGalleryItem) => {
    if (
      !window.confirm(
        tr("Избрисати галеријску слику?", "Delete gallery image?"),
      )
    )
      return;
    const { error } = await supabase
      .from("gallery_items")
      .delete()
      .eq("id", item.id);
    if (error) {
      notice(error.message, "error");
      return;
    }
    await removeUploadedImage([
      item.storagePath,
      ...mediaVariantPaths(item.imageVariants),
    ]).catch(() =>
      notice(
        tr(
          "Запис је избрисан, али слика није уклоњена.",
          "Record deleted, but its image could not be removed.",
        ),
        "error",
      ),
    );
    notice(
      tr("Галеријска слика је избрисана.", "Gallery image deleted."),
      "success",
    );
    await load();
  };

  const saveSettings = async (
    event: React.FormEvent,
    successMessage: string,
  ) => {
    event.preventDefault();
    if (tab === "contact") {
      const { error } = await supabase.from("site_settings").upsert({
        id: 1,
        instagram: settings.instagram.trim() || null,
        facebook: settings.facebook.trim() || null,
        tiktok: settings.tiktok.trim() || null,
        phone: settings.phone.trim() || null,
        email: settings.email.trim() || null,
        social_handle: settings.socialHandle.trim() || null,
      });
      if (error) {
        notice(error.message, "error");
        return;
      }
      notice(successMessage, "success");
      await load();
      return;
    }
    if (
      !validateCyrillic([
        settings.heroTitleSr,
        settings.heroDescriptionSr,
        settings.heroCtaSr,
        settings.footerAddressHeadingSr,
        settings.footerAddressLine1Sr,
        settings.footerAddressLine2Sr,
        settings.footerAddressLine3Sr,
        settings.footerHoursHeadingSr,
        settings.footerHoursLine1Sr,
        settings.footerHoursLine2Sr,
        settings.footerHoursLine3Sr,
        settings.footerContactHeadingSr,
        settings.footerCopyrightSr,
      ])
    )
      return;
    let translatedSettings = { ...settings };
    try {
      const translations = await completeTranslations(
        localizedSettingNames.map((field) => ({
          key: field,
          sr: settings[`${field}Sr` as keyof SiteSettings] as string,
          en: settings[`${field}En` as keyof SiteSettings] as string,
          ru: settings[`${field}Ru` as keyof SiteSettings] as string,
        })),
      );
      for (const field of localizedSettingNames) {
        translatedSettings = {
          ...translatedSettings,
          [`${field}En`]: translations[field]?.en ?? "",
          [`${field}Ru`]: translations[field]?.ru ?? "",
        };
      }
    } catch (error) {
      notice(error instanceof Error ? error.message : String(error), "error");
      return;
    }
    const { error } = await supabase
      .from("site_settings")
      .upsert(settingsPayload(translatedSettings));
    if (error) {
      notice(error.message, "error");
      return;
    }
    if (savedHeroPath && savedHeroPath !== settings.heroImageStoragePath)
      await removeUploadedImage(savedHeroPath).catch(() =>
        notice(
          tr(
            "Садржај је сачуван, али стара почетна слика није уклоњена.",
            "Content saved, but the old hero image could not be removed.",
          ),
          "error",
        ),
      );
    setSettings(translatedSettings);
    noticeSaved(successMessage, settingsEntries(translatedSettings));
    await load();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  const localizedCategoryKey = uiLanguage === "en" ? "nameEn" : "nameSr";
  const localizedGalleryKey = uiLanguage === "en" ? "altEn" : "altSr";
  const localizedItemKey = (_field: "name") =>
    uiLanguage === "en" ? "nameEn" : "nameSr";

  const nameEntry = (
    value: MenuCategory | AdminMenuItem,
  ): TranslationEntry => ({
    key: tr("Назив", "Name"),
    sr: value.nameSr,
    en: value.nameEn,
    ru: value.nameRu,
    required: true,
  });
  const itemEntries = (item: AdminMenuItem): TranslationEntry[] => [
    nameEntry(item),
    ...categories
      .filter((category) => category.id === item.categoryId)
      .map((category) => ({
        ...nameEntry(category),
        key: tr("Назив категорије", "Category name"),
      })),
    {
      key: tr("Опис", "Description"),
      sr: item.descriptionSr,
      en: item.descriptionEn,
      ru: item.descriptionRu,
    },
    {
      key: tr("Занимљивост", "Fun fact"),
      sr: item.factSr,
      en: item.factEn,
      ru: item.factRu,
    },
  ];
  const galleryEntries = (item: AdminGalleryItem): TranslationEntry[] => [
    {
      key: tr("Опис слике", "Image description"),
      sr: item.altSr,
      en: item.altEn,
      ru: item.altRu,
      required: true,
    },
  ];
  const settingsEntries = (value: SiteSettings): TranslationEntry[] =>
    localizedSettingNames.map((field) => ({
      key: settingLabels[field][uiLanguage],
      sr: value[`${field}Sr`],
      en: value[`${field}En`],
      ru: value[`${field}Ru`],
    }));
  const noticeSaved = (text: string, entries: TranslationEntry[]) => {
    const issues = translationIssues(entries);
    if (!issues.length) {
      notice(text, "success");
      return false;
    }
    const details = issues
      .map((issue) => `${issue.language.toUpperCase()}: ${issue.key}`)
      .join(" · ");
    notice(
      `${text} ${tr("Преводи нису потпуни", "Translations are incomplete")}: ${details}. ${tr("Допуните означена поља. Ставка без назива се не приказује на том језику.", "Complete the marked fields. An item without a name is hidden in that language.")}`,
      "warning",
    );
    return true;
  };
  const runSave = async (
    event: React.FormEvent,
    action: (event: React.FormEvent) => Promise<void>,
  ) => {
    event.preventDefault();
    if (saving) return;
    const entries =
      tab === "categories"
        ? [nameEntry(categoryDraft)]
        : tab === "menu"
          ? itemEntries(draft)
          : tab === "gallery"
            ? galleryEntries(galleryDraft)
            : tab === "content"
              ? settingsEntries(settings)
              : [];
    const invalid = translationIssues(entries).filter(
      (issue) => issue.reason === "invalid",
    );
    if (invalid.length) {
      notice(
        tr(
          "Унесите српски и руски текст ћирилицом",
          "Enter Serbian and Russian text in Cyrillic",
        ) +
          ": " +
          invalid
            .map((issue) => `${issue.language.toUpperCase()} · ${issue.key}`)
            .join(", "),
        "error",
      );
      (event.currentTarget as HTMLFormElement)
        .querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await action(event);
    } catch (error) {
      notice(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setSaving(false);
    }
  };
  const scrollToEditor = () =>
    requestAnimationFrame(() => {
      document.querySelector("form.admin-panel")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
    });
  const filteredItems = items.filter(
    (item) =>
      (!menuCategoryFilter || item.categoryId === menuCategoryFilter) &&
      [item.nameSr, item.nameEn, item.nameRu].some((name) =>
        name
          .toLocaleLowerCase()
          .includes(menuSearch.trim().toLocaleLowerCase()),
      ),
  );

  if (sessionState === "loading")
    return (
      <div className="admin-login">
        {tr("Учитавање администрације…", "Loading administration…")}
      </div>
    );
  if (sessionState === "signed-out" || sessionState === "denied")
    return (
      <main className="admin-login">
        <form className="admin-login__card" onSubmit={login}>
          <div className="admin-login__language">
            <button
              type="button"
              onClick={() => setUiLanguage(uiLanguage === "sr" ? "en" : "sr")}
            >
              {uiLanguage === "sr" ? "EN" : "СР"}
            </button>
          </div>
          <img className="admin-login__mark" src={logo} alt="" />
          <h1 className="admin-login__title">Кафе Бабушка</h1>
          <p className="admin-login__copy">
            {sessionState === "denied"
              ? tr(
                  "Овај корисник нема администраторски приступ.",
                  "This user does not have administrator access.",
                )
              : tr("Администрација садржаја", "Content administration")}
          </p>
          {feedback && (
            <div
              className="admin-status"
              data-tone={feedback.tone}
              role="status"
            >
              {feedback.text}
            </div>
          )}
          <div className="admin-form-grid">
            <Field label={tr("Е-пошта", "Email")} full>
              <input
                className="admin-input"
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field label={tr("Лозинка", "Password")} full>
              <input
                className="admin-input"
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
          </div>
          <div className="admin-actions">
            <button className="admin-button admin-button--wide" type="submit">
              {tr("Пријава", "Sign in")}
            </button>
          </div>
          <p className="admin-login__back">
            <a className="admin-link" href="/">
              ← {tr("Назад на сајт", "Back to site")}
            </a>
          </p>
        </form>
      </main>
    );

  const tabCopy = ADMIN_TABS[tab][uiLanguage];
  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar__inner">
          <a className="admin-brand" href="/">
            <img className="admin-brand__mark" src={logo} alt="" />
            <span>
              <strong>Кафе Бабушка</strong>
              <span>
                {tr("Администрација садржаја", "Content administration")}
              </span>
            </span>
          </a>
          <div className="admin-topbar__actions">
            <div className="admin-language-switch">
              <button
                type="button"
                aria-pressed={uiLanguage === "sr"}
                onClick={() => setUiLanguage("sr")}
              >
                СР
              </button>
              <button
                type="button"
                aria-pressed={uiLanguage === "en"}
                onClick={() => setUiLanguage("en")}
              >
                EN
              </button>
            </div>
            <a className="admin-link" href="/">
              {tr("Погледај сајт", "View site")}
            </a>
            <button
              className="admin-button admin-button--secondary"
              onClick={logout}
            >
              {tr("Одјава", "Sign out")}
            </button>
          </div>
        </div>
      </header>
      <section
        className="admin-content"
        onInvalidCapture={() =>
          notice(
            tr(
              "Попуните означена обавезна поља прије чувања.",
              "Complete the marked required fields before saving.",
            ),
            "error",
          )
        }
      >
        <div className="admin-page-heading">
          <h1>{tabCopy[1]}</h1>
          <p>{tabCopy[2]}</p>
        </div>
        <nav
          className="admin-tabs"
          aria-label={tr("Администрација садржаја", "Content administration")}
        >
          {(Object.keys(ADMIN_TABS) as AdminTab[]).map((key) => (
            <button
              key={key}
              className="admin-tab"
              aria-selected={tab === key}
              onClick={() => {
                setTab(key);
                setFeedback(null);
              }}
            >
              {ADMIN_TABS[key][uiLanguage][0]}
            </button>
          ))}
        </nav>
        {feedback && (
          <div
            className="admin-status admin-status--floating"
            data-tone={feedback.tone}
            role={feedback.tone === "success" ? "status" : "alert"}
            aria-atomic="true"
          >
            <span className="admin-status__icon" aria-hidden="true">
              {feedback.tone === "success" ? "✓" : "!"}
            </span>
            <div>
              <strong>
                {feedback.tone === "error"
                  ? tr("Грешка", "Error")
                  : feedback.tone === "warning"
                    ? tr(
                        "Сачувано · провјерите преводе",
                        "Saved · check translations",
                      )
                    : tr("Успјешно", "Success")}
              </strong>
              <p>{feedback.text}</p>
            </div>
            <button
              type="button"
              className="admin-status__close"
              aria-label={tr("Затвори обавјештење", "Dismiss notification")}
              onClick={() => setFeedback(null)}
            >
              ×
            </button>
          </div>
        )}

        {tab === "stories" && (
          <>
            <section className="admin-panel admin-panel--narrow">
              <div className="admin-panel__heading">
                <div>
                  <h2>{tr("Нова прича", "New story")}</h2>
                  <p>
                    {tr(
                      "Одаберите једну или више слика. Свака ће на почетној страници бити видљива 24 часа.",
                      "Choose one or more photos. Each will be visible on the homepage for 24 hours.",
                    )}
                  </p>
                </div>
              </div>
              <div className="admin-media-upload">
                <label className="admin-media-upload__trigger">
                  <span>
                    {uploading === "stories"
                      ? tr("Слике се преносе…", "Uploading images…")
                      : tr(
                          "Одаберите слике са уређаја",
                          "Choose photos from device",
                        )}
                  </span>
                  <input
                    type="file"
                    multiple
                    accept={IMAGE_PICKER_ACCEPT}
                    disabled={uploading === "stories"}
                    onChange={(event) => {
                      const files = snapshotSelectedFiles(
                        event.currentTarget.files,
                      );
                      event.currentTarget.value = "";
                      if (files.length) void uploadStories(files);
                    }}
                  />
                </label>
                <small>
                  {tr(
                    "JPEG, PNG, WebP, AVIF, HEIC или HEIF · највише 10 MB по слици · без ограничења броја слика",
                    "JPEG, PNG, WebP, AVIF, HEIC or HEIF · up to 10 MB per image · no photo limit",
                  )}
                </small>
              </div>
            </section>
            <RecordSection
              title={tr(
                "Објављене и истекле приче",
                "Published and expired stories",
              )}
              empty={tr(
                "Још нема објављених прича.",
                "No stories have been published yet.",
              )}
            >
              {stories.map((story) => {
                const isActive =
                  story.isPublished && Date.parse(story.expiresAt) > Date.now();
                return (
                  <div className="admin-record" key={story.id}>
                    <img
                      className="admin-record__image"
                      src={story.image}
                      alt=""
                    />
                    <div className="admin-record__content">
                      <strong className="admin-record__title">
                        {isActive
                          ? tr(
                              "Видљиво на почетној страници",
                              "Visible on the homepage",
                            )
                          : tr("Истекло или скривено", "Expired or hidden")}
                      </strong>
                      <div className="admin-record__meta">
                        {tr("Истиче", "Expires")}:{" "}
                        {new Intl.DateTimeFormat(
                          uiLanguage === "sr" ? "sr-Cyrl-BA" : "en-GB",
                          { dateStyle: "medium", timeStyle: "short" },
                        ).format(new Date(story.expiresAt))}
                      </div>
                    </div>
                    <div className="admin-record__actions">
                      <button
                        className="admin-button admin-button--secondary"
                        onClick={() => void republishStory(story)}
                      >
                        {tr("Објави поново", "Republish")}
                      </button>
                      <button
                        className="admin-button admin-button--danger"
                        onClick={() => void removeStory(story)}
                      >
                        {tr("Избриши", "Delete")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </RecordSection>
          </>
        )}

        {tab === "content" && (
          <form
            className="admin-panel"
            onSubmit={(event) =>
              void runSave(event, (e) =>
                saveSettings(
                  e,
                  tr("Текст странице је сачуван.", "Page content saved."),
                ),
              )
            }
          >
            <div className="admin-panel__heading">
              <div>
                <h2>{tr("Почетни екран и подножје", "Homepage and footer")}</h2>
                <p>
                  {tr(
                    "За свако поље унесите преводе један испод другог.",
                    "Enter the translations below each field.",
                  )}
                </p>
              </div>
            </div>
            <TranslationSummary
              entries={settingsEntries(settings)}
              language={uiLanguage}
            />
            <div className="admin-content-section">
              <MediaUpload
                label={tr("Слика почетног екрана", "Homepage image")}
                value={settings.heroImage}
                busy={uploading === "hero"}
                language={uiLanguage}
                onUpload={(file) => uploadFor(file, "hero")}
              />
            </div>
            {(["hero", "footer"] as const).map((section) => (
              <div className="admin-content-section" key={section}>
                <div className="admin-content-section__heading">
                  <h3>
                    {section === "hero"
                      ? tr("Увод на почетној", "Homepage introduction")
                      : tr("Подножје сајта", "Website footer")}
                  </h3>
                </div>
                <div className="admin-translation-fields">
                  {localizedSettingNames
                    .filter((field) => field.startsWith(section))
                    .map((field) => (
                      <TranslatedField
                        key={field}
                        label={settingLabels[field][uiLanguage]}
                        language={uiLanguage}
                        multiline={
                          field === "heroTitle" || field === "heroDescription"
                        }
                        value={{
                          sr: settings[`${field}Sr`],
                          en: settings[`${field}En`],
                          ru: settings[`${field}Ru`],
                        }}
                        onChange={(lang, value) =>
                          setSettings((current) => ({
                            ...current,
                            [`${field}${CONTENT_SUFFIX[lang]}`]: value,
                          }))
                        }
                      />
                    ))}
                </div>
              </div>
            ))}
            <div className="admin-actions admin-actions--save">
              <button
                className="admin-button"
                disabled={saving || uploading === "hero"}
              >
                {saving
                  ? tr("Чување…", "Saving…")
                  : tr("Сачувај садржај", "Save content")}
              </button>
            </div>
          </form>
        )}

        {tab === "categories" && (
          <>
            <form
              className="admin-panel"
              onSubmit={(event) => void runSave(event, saveCategory)}
            >
              <div className="admin-panel__heading">
                <div>
                  <h2>
                    {editingCategory
                      ? tr("Уреди категорију", "Edit category")
                      : tr("Нова категорија", "New category")}
                  </h2>
                  <p>
                    {tr(
                      "Назив се приказује као филтер и у књизи менија.",
                      "The name appears in filters and the menu book.",
                    )}
                  </p>
                </div>
              </div>
              <TranslationSummary
                entries={[nameEntry(categoryDraft)]}
                language={uiLanguage}
              />
              <div className="admin-form-grid">
                <div className="admin-field--full">
                  <TranslatedField
                    label={tr("Назив категорије", "Category name")}
                    language={uiLanguage}
                    required
                    value={{
                      sr: categoryDraft.nameSr,
                      en: categoryDraft.nameEn,
                      ru: categoryDraft.nameRu,
                    }}
                    onChange={(lang, value) =>
                      setCategoryDraft((current) => ({
                        ...current,
                        [`name${CONTENT_SUFFIX[lang]}`]: value,
                      }))
                    }
                  />
                </div>
                <Field label={tr("Редослијед", "Order")}>
                  <input
                    className="admin-input"
                    required
                    type="number"
                    min="0"
                    value={categoryDraft.sortOrder}
                    onChange={(event) =>
                      setCategoryDraft({
                        ...categoryDraft,
                        sortOrder: Number(event.target.value),
                      })
                    }
                  />
                </Field>
              </div>
              <div className="admin-actions">
                <button className="admin-button" disabled={saving}>
                  {saving
                    ? tr("Чување…", "Saving…")
                    : editingCategory
                      ? tr("Сачувај измјене", "Save changes")
                      : tr("Додај категорију", "Add category")}
                </button>
                {editingCategory && (
                  <button
                    type="button"
                    className="admin-button admin-button--secondary"
                    onClick={() => {
                      setCategoryDraft(emptyCategory);
                      setEditingCategory(false);
                    }}
                  >
                    {tr("Откажи", "Cancel")}
                  </button>
                )}
              </div>
            </form>
            <RecordSection
              title={tr("Постојеће категорије", "Existing categories")}
              empty={tr("Још нема категорија.", "No categories yet.")}
            >
              {categories.map((category) => (
                <div className="admin-record" key={category.id}>
                  <div className="admin-record__content">
                    <strong className="admin-record__title">
                      {category[localizedCategoryKey] || category.nameSr}
                    </strong>
                    <div className="admin-record__meta">
                      {tr("Редослијед", "Order")}: {category.sortOrder} ·{" "}
                      {
                        items.filter((item) => item.categoryId === category.id)
                          .length
                      }{" "}
                      {tr("ставки", "items")}
                    </div>
                    <TranslationSummary
                      entries={[nameEntry(category)]}
                      language={uiLanguage}
                      compact
                    />
                  </div>
                  <div className="admin-record__actions">
                    <button
                      className="admin-button admin-button--secondary"
                      onClick={() => {
                        setCategoryDraft(category);
                        setEditingCategory(true);
                        scrollToEditor();
                      }}
                    >
                      {tr("Уреди", "Edit")}
                    </button>
                    <button
                      className="admin-button admin-button--danger"
                      disabled={
                        saving ||
                        items.some((item) => item.categoryId === category.id)
                      }
                      title={
                        items.some((item) => item.categoryId === category.id)
                          ? tr(
                              "Прво премјестите или избришите ставке ове категорије.",
                              "Move or delete this category’s items first.",
                            )
                          : undefined
                      }
                      onClick={() => void removeCategory(category.id)}
                    >
                      {tr("Избриши", "Delete")}
                    </button>
                  </div>
                </div>
              ))}
            </RecordSection>
          </>
        )}

        {tab === "menu" && (
          <>
            <form
              className="admin-panel"
              onSubmit={(event) => void runSave(event, saveItem)}
            >
              <div className="admin-panel__heading">
                <div>
                  <h2>
                    {editingItem
                      ? tr("Уреди ставку менија", "Edit menu item")
                      : tr("Нова ставка менија", "New menu item")}
                  </h2>
                  <p>
                    {categories.length
                      ? tr(
                          "Одаберите категорију и унесите цијену и називе на сва три језика. Слика, опис и занимљивост су необавезни.",
                          "Choose a category and enter the price and names in all three languages. Image, description and fun fact are optional.",
                        )
                      : tr(
                          "Прво креирајте категорију.",
                          "Create a category first.",
                        )}
                  </p>
                </div>
              </div>
              <TranslationSummary
                entries={itemEntries(draft)}
                language={uiLanguage}
              />
              <div className="admin-form-grid">
                <Field label={tr("Категорија", "Category")}>
                  <select
                    className="admin-input"
                    required
                    disabled={!categories.length}
                    value={draft.categoryId}
                    onChange={(event) =>
                      setDraft({ ...draft, categoryId: event.target.value })
                    }
                  >
                    <option value="" disabled>
                      {tr("Одаберите категорију", "Choose category")}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category[localizedCategoryKey] || category.nameSr}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={tr("Цијена", "Price")}>
                  <input
                    className="admin-input"
                    required
                    value={draft.price}
                    placeholder="8.50 КМ"
                    onChange={(event) =>
                      setDraft({ ...draft, price: event.target.value })
                    }
                  />
                </Field>
                <div className="admin-field--full admin-translation-fields">
                  {(["name", "description", "fact"] as const).map((field) => (
                    <TranslatedField
                      key={field}
                      label={
                        field === "name"
                          ? tr("Назив ставке", "Item name")
                          : field === "description"
                            ? tr("Опис", "Description")
                            : tr("Занимљивост", "Fun fact")
                      }
                      language={uiLanguage}
                      required={field === "name"}
                      multiline={field !== "name"}
                      value={{
                        sr: draft[`${field}Sr`],
                        en: draft[`${field}En`],
                        ru: draft[`${field}Ru`],
                      }}
                      onChange={(lang, value) =>
                        setDraft((current) => ({
                          ...current,
                          [`${field}${CONTENT_SUFFIX[lang]}`]: value,
                        }))
                      }
                    />
                  ))}
                </div>
                <Field
                  label={tr("Слика", "Image")}
                  hint={tr("Необавезно", "Optional")}
                  full
                >
                  <MediaUpload
                    label={tr("Слика ставке", "Item image")}
                    value={draft.image}
                    busy={uploading === "menu"}
                    language={uiLanguage}
                    onUpload={(file) => uploadFor(file, "menu")}
                  />
                </Field>
              </div>
              <div className="admin-actions">
                <button
                  className="admin-button"
                  disabled={
                    saving || !categories.length || uploading === "menu"
                  }
                >
                  {saving
                    ? tr("Чување…", "Saving…")
                    : editingItem
                      ? tr("Сачувај измјене", "Save changes")
                      : tr("Додај у мени", "Add menu item")}
                </button>
                {editingItem && (
                  <button
                    type="button"
                    className="admin-button admin-button--secondary"
                    onClick={() => void cancelItem()}
                  >
                    {tr("Откажи", "Cancel")}
                  </button>
                )}
              </div>
            </form>
            <div className="admin-list-tools">
              <Field label={tr("Претражи мени", "Search menu")}>
                <input
                  type="search"
                  className="admin-input"
                  value={menuSearch}
                  placeholder={tr(
                    "Назив на било ком језику…",
                    "Name in any language…",
                  )}
                  onChange={(event) => setMenuSearch(event.target.value)}
                />
              </Field>
              <Field
                label={tr("Филтрирај по категорији", "Filter by category")}
              >
                <select
                  className="admin-input"
                  value={menuCategoryFilter}
                  onChange={(event) =>
                    setMenuCategoryFilter(event.target.value)
                  }
                >
                  <option value="">
                    {tr("Све категорије", "All categories")}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category[localizedCategoryKey] || category.nameSr}
                    </option>
                  ))}
                </select>
              </Field>
              <small>
                {filteredItems.length} / {items.length} {tr("ставки", "items")}
              </small>
            </div>
            <RecordSection
              title={tr("Ставке менија", "Menu items")}
              empty={tr(
                "Нема ставки за изабрану претрагу.",
                "No menu items match your search.",
              )}
            >
              {filteredItems.map((item) => (
                <div className="admin-record" key={item.id}>
                  {item.image && (
                    <img
                      className="admin-record__image"
                      src={item.image}
                      alt=""
                    />
                  )}
                  <div className="admin-record__content">
                    <strong className="admin-record__title">
                      {item[localizedItemKey("name")] || item.nameSr}
                    </strong>
                    <div className="admin-record__meta">
                      {(categories.find(
                        (category) => category.id === item.categoryId,
                      )?.[localizedCategoryKey] ||
                        categories.find(
                          (category) => category.id === item.categoryId,
                        )?.nameSr) ??
                        tr("Без категорије", "No category")}{" "}
                      · {item.price}
                    </div>
                    <TranslationSummary
                      entries={itemEntries(item)}
                      language={uiLanguage}
                      compact
                    />
                  </div>
                  <div className="admin-record__actions">
                    <button
                      className="admin-button admin-button--secondary"
                      onClick={() => {
                        setDraft(item);
                        setEditingItem(true);
                        scrollToEditor();
                      }}
                    >
                      {tr("Уреди", "Edit")}
                    </button>
                    <button
                      className="admin-button admin-button--danger"
                      onClick={() => void removeItem(item)}
                    >
                      {tr("Избриши", "Delete")}
                    </button>
                  </div>
                </div>
              ))}
            </RecordSection>
          </>
        )}

        {tab === "gallery" && (
          <>
            <form
              className="admin-panel"
              onSubmit={(event) => void runSave(event, saveGallery)}
            >
              <div className="admin-panel__heading">
                <div>
                  <h2>
                    {editingGallery
                      ? tr("Уреди галеријску слику", "Edit gallery image")
                      : tr("Нова галеријска слика", "New gallery image")}
                  </h2>
                  <p>
                    {tr(
                      "Додајте слику и опис на сва три језика.",
                      "Add a photo and a description in all three languages.",
                    )}
                  </p>
                </div>
              </div>
              <TranslationSummary
                entries={galleryEntries(galleryDraft)}
                language={uiLanguage}
              />
              <div className="admin-form-grid">
                <Field label={tr("Слика", "Image")} full>
                  <MediaUpload
                    label={tr("Галеријска слика", "Gallery image")}
                    value={galleryDraft.image}
                    busy={uploading === "gallery"}
                    language={uiLanguage}
                    onUpload={(file) => uploadFor(file, "gallery")}
                  />
                </Field>
                <div className="admin-field--full">
                  <TranslatedField
                    label={tr("Опис слике", "Image description")}
                    language={uiLanguage}
                    required
                    value={{
                      sr: galleryDraft.altSr,
                      en: galleryDraft.altEn,
                      ru: galleryDraft.altRu,
                    }}
                    onChange={(lang, value) =>
                      setGalleryDraft((current) => ({
                        ...current,
                        [`alt${CONTENT_SUFFIX[lang]}`]: value,
                      }))
                    }
                  />
                </div>
                <Field label={tr("Редослијед", "Order")}>
                  <input
                    className="admin-input"
                    required
                    type="number"
                    min="0"
                    value={galleryDraft.sortOrder}
                    onChange={(event) =>
                      setGalleryDraft({
                        ...galleryDraft,
                        sortOrder: Number(event.target.value),
                      })
                    }
                  />
                </Field>
                <Field label={tr("Видљивост", "Visibility")}>
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={galleryDraft.isPublished}
                      onChange={(event) =>
                        setGalleryDraft({
                          ...galleryDraft,
                          isPublished: event.target.checked,
                        })
                      }
                    />{" "}
                    {tr("Објави слику на сајту", "Publish image on site")}
                  </label>
                </Field>
              </div>
              <div className="admin-actions">
                <button
                  className="admin-button"
                  disabled={saving || uploading === "gallery"}
                >
                  {saving
                    ? tr("Чување…", "Saving…")
                    : editingGallery
                      ? tr("Сачувај измјене", "Save changes")
                      : tr("Додај слику", "Add image")}
                </button>
                {editingGallery && (
                  <button
                    type="button"
                    className="admin-button admin-button--secondary"
                    onClick={() => void cancelGallery()}
                  >
                    {tr("Откажи", "Cancel")}
                  </button>
                )}
              </div>
            </form>
            <RecordSection
              title={tr("Галеријске слике", "Gallery images")}
              empty={tr("Нема унесених слика.", "No images yet.")}
            >
              {galleryItems.map((item) => (
                <div className="admin-record" key={item.id}>
                  <img
                    className="admin-record__image"
                    src={item.image}
                    alt=""
                  />
                  <div className="admin-record__content">
                    <strong className="admin-record__title">
                      {item[localizedGalleryKey] || item.altSr}
                    </strong>
                    <div className="admin-record__meta">
                      {item.isPublished
                        ? tr("Објављено", "Published")
                        : tr("Скривено", "Hidden")}{" "}
                      · {tr("редослијед", "order")} {item.sortOrder}
                    </div>
                    <TranslationSummary
                      entries={galleryEntries(item)}
                      language={uiLanguage}
                      compact
                    />
                  </div>
                  <div className="admin-record__actions">
                    <button
                      className="admin-button admin-button--secondary"
                      onClick={() => {
                        setGalleryDraft(item);
                        setEditingGallery(true);
                        scrollToEditor();
                      }}
                    >
                      {tr("Уреди", "Edit")}
                    </button>
                    <button
                      className="admin-button admin-button--danger"
                      onClick={() => void removeGallery(item)}
                    >
                      {tr("Избриши", "Delete")}
                    </button>
                  </div>
                </div>
              ))}
            </RecordSection>
          </>
        )}

        {tab === "contact" && (
          <form
            className="admin-panel admin-panel--narrow"
            onSubmit={(event) =>
              void runSave(event, (e) =>
                saveSettings(
                  e,
                  tr(
                    "Контакт и мреже су сачувани.",
                    "Contact and social links saved.",
                  ),
                ),
              )
            }
          >
            <div className="admin-panel__heading">
              <div>
                <h2>
                  {tr("Контакт и друштвене мреже", "Contact and social links")}
                </h2>
                <p>
                  {tr(
                    "Празан линк сакрива одговарајућу икону.",
                    "An empty URL hides the corresponding icon.",
                  )}
                </p>
              </div>
            </div>
            <div className="admin-form-grid">
              <Field
                label={tr("Телефон", "Phone")}
                hint={tr(
                  "Подножје → Контакт. Клик на број позива телефон.",
                  "Footer → Contact. Visitors can tap the number to call.",
                )}
                full
              >
                <input
                  className="admin-input"
                  type="tel"
                  value={settings.phone}
                  placeholder="+387 65 000 000"
                  onChange={(event) =>
                    setSettings({ ...settings, phone: event.target.value })
                  }
                />
              </Field>
              <Field
                label={tr("Е-пошта", "Email")}
                hint={tr(
                  "Подножје → Контакт. Клик отвара нову е-пошту.",
                  "Footer → Contact. Visitors can tap it to email you.",
                )}
                full
              >
                <input
                  className="admin-input"
                  type="email"
                  value={settings.email}
                  placeholder="hello@cafebabuska.ba"
                  onChange={(event) =>
                    setSettings({ ...settings, email: event.target.value })
                  }
                />
              </Field>
              <Field
                label={tr("Корисничко име", "Handle")}
                hint={tr(
                  "Приказује се испод контакт података у подножју.",
                  "Shown below the contact details in the footer.",
                )}
                full
              >
                <input
                  className="admin-input"
                  value={settings.socialHandle}
                  placeholder="@cafebabuska"
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      socialHandle: event.target.value,
                    })
                  }
                />
              </Field>
              <Field
                label={tr("Инстаграм", "Instagram")}
                hint={tr(
                  "Линк за Инстаграм икону у подножју. Оставите празно да је сакријете.",
                  "Link for the Instagram icon in the footer. Leave empty to hide it.",
                )}
                full
              >
                <input
                  className="admin-input"
                  type="url"
                  value={settings.instagram}
                  placeholder="https://instagram.com/…"
                  onChange={(event) =>
                    setSettings({ ...settings, instagram: event.target.value })
                  }
                />
              </Field>
              <Field
                label={tr("Фејсбук", "Facebook")}
                hint={tr(
                  "Линк за Фејсбук икону у подножју. Оставите празно да је сакријете.",
                  "Link for the Facebook icon in the footer. Leave empty to hide it.",
                )}
                full
              >
                <input
                  className="admin-input"
                  type="url"
                  value={settings.facebook}
                  placeholder="https://facebook.com/…"
                  onChange={(event) =>
                    setSettings({ ...settings, facebook: event.target.value })
                  }
                />
              </Field>
              <Field
                label={tr("ТикТок", "TikTok")}
                hint={tr(
                  "Линк за ТикТок икону у подножју. Оставите празно да је сакријете.",
                  "Link for the TikTok icon in the footer. Leave empty to hide it.",
                )}
                full
              >
                <input
                  className="admin-input"
                  type="url"
                  value={settings.tiktok}
                  placeholder="https://tiktok.com/@…"
                  onChange={(event) =>
                    setSettings({ ...settings, tiktok: event.target.value })
                  }
                />
              </Field>
            </div>
            <div className="admin-actions">
              <button className="admin-button" disabled={saving}>
                {saving
                  ? tr("Чување…", "Saving…")
                  : tr("Сачувај контакт", "Save contact")}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
