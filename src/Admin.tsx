import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "./assets/brand/logo-babuska.webp";
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
type Feedback = { text: string; tone: "success" | "error" } | null;
type ContentLanguage = "sr" | "en" | "ru";
const CONTENT_SUFFIX = { sr: "Sr", en: "En", ru: "Ru" } as const;

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

function LanguageSwitch({
  value,
  onChange,
  language,
  completed,
}: {
  value: ContentLanguage;
  onChange: (value: ContentLanguage) => void;
  language: AdminLanguage;
  completed?: Partial<Record<ContentLanguage, boolean>>;
}) {
  return (
    <div
      className="admin-language-switch"
      aria-label={adminText(language, "Језик садржаја", "Content language")}
    >
      {(["sr", "en", "ru"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {{ sr: "СР", en: "EN", ru: "РУ" }[option]}
          {completed?.[option] ? " ✓" : ""}
        </button>
      ))}
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
  const [contentLanguage, setContentLanguage] = useState<ContentLanguage>("sr");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [tab, setTab] = useState<AdminTab>("stories");
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
  const notice = (text: string, tone: "success" | "error") =>
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
    const [categoriesResult, itemsResult, galleryResult, storiesResult, settingsResult] =
      await Promise.all([
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
        uploaded === 1 ? "Прича је објављена на 24 часа." : `Објављено је ${uploaded} прича на 24 часа.`,
        uploaded === 1 ? "Story published for 24 hours." : `${uploaded} stories published for 24 hours.`,
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
    const nameEn = categoryDraft.nameEn.trim();
    const nameRu = categoryDraft.nameRu.trim();
    if (!nameSr || !nameEn) {
      notice(
        tr(
          "Унесите назив категорије на оба језика.",
          "Enter the category name in both languages.",
        ),
        "error",
      );
      return;
    }
    if (!validateCyrillic([nameSr])) return;
    const payload = {
      name: nameSr,
      name_sr: nameSr,
      name_en: nameEn,
      name_ru: nameRu || null,
      sort_order: categoryDraft.sortOrder,
      is_active: true,
    };
    const result = editingCategory
      ? await supabase
          .from("menu_categories")
          .update(payload)
          .eq("id", categoryDraft.id)
      : await supabase.from("menu_categories").insert(payload);
    if (result.error) notice(result.error.message, "error");
    else {
      setCategoryDraft(emptyCategory);
      setEditingCategory(false);
      notice(tr("Категорија је сачувана.", "Category saved."), "success");
      await load();
    }
  };

  const removeCategory = async (id: string) => {
    if (
      !window.confirm(
        tr(
          "Избрисати категорију? Категорија са пићима не може бити избрисана.",
          "Delete category? A category containing drinks cannot be deleted.",
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
    if (
      !draft.categoryId ||
      !draft.nameSr.trim() ||
      !draft.nameEn.trim() ||
      !draft.price.trim()
    ) {
      notice(
        tr(
          "Одаберите категорију и унесите назив и цијену пића.",
          "Choose a category and enter the drink name and price.",
        ),
        "error",
      );
      return;
    }
    if (!validateCyrillic([draft.nameSr])) return;
    const oldPath = editingItem
      ? (items.find((item) => item.id === draft.id)?.storagePath ?? "")
      : "";
    const payload = {
      name: draft.nameSr.trim(),
      name_sr: draft.nameSr.trim(),
      name_en: draft.nameEn.trim(),
      name_ru: draft.nameRu.trim() || null,
      category_id: draft.categoryId,
      price: draft.price.trim(),
      image_url: draft.image,
      storage_path: draft.storagePath || null,
      image_variants: draft.imageVariants,
      description: "",
      description_sr: "",
      description_en: "",
      description_ru: draft.descriptionRu.trim() || null,
      fact: null,
      fact_sr: null,
      fact_en: null,
      fact_ru: draft.factRu.trim() || null,
      is_published: true,
      ...(editingItem ? {} : { sort_order: items.length }),
    };
    const result = editingItem
      ? await supabase.from("menu_items").update(payload).eq("id", draft.id)
      : await supabase.from("menu_items").insert(payload);
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
            "Пиће је сачувано, али стара слика није уклоњена.",
            "Drink saved, but the old image could not be removed.",
          ),
          "error",
        ),
      );
    setDraft({ ...emptyItem, categoryId: categories[0]?.id ?? "" });
    setEditingItem(false);
    notice(tr("Пиће је сачувано.", "Drink saved."), "success");
    await load();
  };

  const cancelItem = async () => {
    await discardPending(draft.storagePath, draft.imageVariants);
    setDraft({ ...emptyItem, categoryId: categories[0]?.id ?? "" });
    setEditingItem(false);
  };
  const removeItem = async (item: AdminMenuItem) => {
    if (!window.confirm(tr("Избрисати ово пиће?", "Delete this drink?")))
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
          "Пиће је избрисано, али слика није уклоњена.",
          "Drink deleted, but its image could not be removed.",
        ),
        "error",
      ),
    );
    notice(tr("Пиће је избрисано.", "Drink deleted."), "success");
    await load();
  };

  const saveGallery = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !galleryDraft.image ||
      !galleryDraft.altSr.trim() ||
      !galleryDraft.altEn.trim()
    ) {
      notice(
        tr(
          "Пренесите слику и унесите опис на оба језика.",
          "Upload an image and enter descriptions in both languages.",
        ),
        "error",
      );
      return;
    }
    if (!validateCyrillic([galleryDraft.altSr])) return;
    const oldPath = editingGallery
      ? (galleryItems.find((item) => item.id === galleryDraft.id)
          ?.storagePath ?? "")
      : "";
    const payload = {
      image_url: galleryDraft.image,
      storage_path: galleryDraft.storagePath || null,
      image_variants: galleryDraft.imageVariants,
      alt_sr: galleryDraft.altSr.trim(),
      alt_en: galleryDraft.altEn.trim(),
      alt_ru: galleryDraft.altRu.trim() || null,
      is_published: galleryDraft.isPublished,
      sort_order: galleryDraft.sortOrder,
    };
    const result = editingGallery
      ? await supabase
          .from("gallery_items")
          .update(payload)
          .eq("id", galleryDraft.id)
      : await supabase.from("gallery_items").insert(payload);
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
    setGalleryDraft(emptyGallery);
    setEditingGallery(false);
    notice(
      tr("Галеријска слика је сачувана.", "Gallery image saved."),
      "success",
    );
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
    const { error } = await supabase
      .from("site_settings")
      .upsert(settingsPayload(settings));
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
    notice(successMessage, "success");
    await load();
  };

  type LocalizedSetting =
    | "heroTitle"
    | "heroDescription"
    | "heroCta"
    | "footerAddressHeading"
    | "footerAddressLine1"
    | "footerAddressLine2"
    | "footerAddressLine3"
    | "footerHoursHeading"
    | "footerHoursLine1"
    | "footerHoursLine2"
    | "footerHoursLine3"
    | "footerContactHeading"
    | "footerCopyright";
  const updateLocalizedSetting = (field: LocalizedSetting, value: string) => {
    const key = `${field}${CONTENT_SUFFIX[contentLanguage]}` as keyof SiteSettings;
    setSettings((current) => ({ ...current, [key]: value }));
  };
  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  const suffix = CONTENT_SUFFIX[contentLanguage];
  const localizedSetting = (field: string) =>
    settings[`${field}${suffix}` as keyof SiteSettings] as string;
  const localizedItemKey = (field: "name" | "description" | "fact") =>
    `${field}${suffix}` as
      | "nameSr"
      | "nameEn"
      | "nameRu"
      | "descriptionSr"
      | "descriptionEn"
      | "descriptionRu"
      | "factSr"
      | "factEn"
      | "factRu";
  const localizedCategoryKey = `name${suffix}` as
    | "nameSr"
    | "nameEn"
    | "nameRu";
  const localizedGalleryKey = `alt${suffix}` as "altSr" | "altEn" | "altRu";

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
      <section className="admin-content">
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
          <div className="admin-status" data-tone={feedback.tone} role="status">
            {feedback.text}
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
                      : tr("Одаберите слике са уређаја", "Choose photos from device")}
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
              title={tr("Објављене и истекле приче", "Published and expired stories")}
              empty={tr("Још нема објављених прича.", "No stories have been published yet.")}
            >
              {stories.map((story) => {
                const isActive =
                  story.isPublished && Date.parse(story.expiresAt) > Date.now();
                return (
                  <div className="admin-record" key={story.id}>
                    <img className="admin-record__image" src={story.image} alt="" />
                    <div className="admin-record__content">
                      <strong className="admin-record__title">
                        {isActive
                          ? tr("Видљиво на почетној страници", "Visible on the homepage")
                          : tr("Истекло или скривено", "Expired or hidden")}
                      </strong>
                      <div className="admin-record__meta">
                        {tr("Истиче", "Expires")}: {new Intl.DateTimeFormat(
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
              void saveSettings(
                event,
                tr("Текст странице је сачуван.", "Page content saved."),
              )
            }
          >
            <div className="admin-panel__heading">
              <div>
                <h2>{tr("Почетни екран и подножје", "Homepage and footer")}</h2>
                <p>
                  {tr(
                    "Изаберите језик, па уредите текст који се приказује на почетној и у подножју сајта.",
                    "Choose a language, then edit the text shown on the homepage and in the footer.",
                  )}
                </p>
              </div>
              <LanguageSwitch
                value={contentLanguage}
                onChange={setContentLanguage}
                language={uiLanguage}
              />
            </div>
            <div className="admin-content-section">
              <div className="admin-content-section__heading">
                <h3>{tr("Почетна слика и увод", "Homepage image and introduction")}</h3>
                <p>{tr("Ови елементи се приказују на врху почетне странице.", "These elements appear at the top of the homepage.")}</p>
              </div>
              <div className="admin-form-grid">
              <Field
                label={tr("Почетна слика", "Hero image")}
                hint={tr("Позадинска слика преко цијелог почетног екрана.", "Background image across the full homepage hero.")}
                full
              >
                <MediaUpload
                  label={tr("Слика почетног екрана", "Homepage image")}
                  value={settings.heroImage}
                  busy={uploading === "hero"}
                  language={uiLanguage}
                  onUpload={(file) => uploadFor(file, "hero")}
                />
              </Field>
              <Field
                label={tr("Наслов на почетној", "Homepage title")}
                hint={tr("Велики наслов у средини почетне слике.", "Large heading centred on the homepage image.")}
                full
              >
                <textarea
                  className="admin-input admin-textarea"
                  value={localizedSetting("heroTitle")}
                  placeholder={tr("Укус Москве у Бањој Луци", "A Taste of Moscow in Banja Luka")}
                  onChange={(event) =>
                    updateLocalizedSetting("heroTitle", event.target.value)
                  }
                />
              </Field>
              <Field
                label={tr("Опис на почетној", "Homepage description")}
                hint={tr("Кратак текст испод великог наслова.", "Short copy directly below the main heading.")}
                full
              >
                <textarea
                  className="admin-input admin-textarea"
                  value={localizedSetting("heroDescription")}
                  placeholder={tr("Ексклузивни напици, фини чајеви и руско гостопримство.", "Exclusive drinks, fine teas, and Russian hospitality.")}
                  onChange={(event) =>
                    updateLocalizedSetting(
                      "heroDescription",
                      event.target.value,
                    )
                  }
                />
              </Field>
              <Field
                label={tr("Текст дугмета", "Button text")}
                hint={tr("Црвено дугме које води до менија.", "Red button that takes visitors to the menu.")}
                full
              >
                <input
                  className="admin-input"
                  value={localizedSetting("heroCta")}
                  placeholder={tr("Истражи мени", "Explore menu")}
                  onChange={(event) =>
                    updateLocalizedSetting("heroCta", event.target.value)
                  }
                />
              </Field>
              </div>
            </div>
            <div className="admin-content-section">
              <div className="admin-content-section__heading">
                <h3>{tr("Подножје сајта", "Website footer")}</h3>
                <p>{tr("Ови текстови се приказују у доњем дијелу сваке странице.", "These texts appear at the bottom of every page.")}</p>
              </div>
              <div className="admin-form-grid">
              <Field
                label={tr("Наслов адресе", "Address heading")}
                hint={tr("Подножје → прва колона.", "Footer → first column.")}
              >
                <input
                  className="admin-input"
                  value={localizedSetting("footerAddressHeading")}
                  placeholder={tr("Адреса", "Address")}
                  onChange={(event) =>
                    updateLocalizedSetting(
                      "footerAddressHeading",
                      event.target.value,
                    )
                  }
                />
              </Field>
              <Field
                label={tr("Наслов контакта", "Contact heading")}
                hint={tr("Подножје → колона са телефоном и е-поштом.", "Footer → column with phone and email.")}
              >
                <input
                  className="admin-input"
                  value={localizedSetting("footerContactHeading")}
                  placeholder={tr("Контакт", "Contact")}
                  onChange={(event) =>
                    updateLocalizedSetting(
                      "footerContactHeading",
                      event.target.value,
                    )
                  }
                />
              </Field>
              {([1, 2, 3] as const).map((line) => (
                <Field
                  key={`address-${line}`}
                  label={tr(`Адреса — ${line}. ред`, `Address — line ${line}`)}
                  hint={tr(`Подножје → Адреса → ${line}. ред.`, `Footer → Address → line ${line}.`)}
                  full
                >
                  <input
                    className="admin-input"
                    value={localizedSetting(`footerAddressLine${line}`)}
                    placeholder={
                      line === 1
                        ? tr("Господска улица 14", "Gospodska Street 14")
                        : line === 2
                          ? tr("78000 Бања Лука", "78000 Banja Luka")
                          : tr("Босна и Херцеговина", "Bosnia and Herzegovina")
                    }
                    onChange={(event) =>
                      updateLocalizedSetting(
                        `footerAddressLine${line}` as LocalizedSetting,
                        event.target.value,
                      )
                    }
                  />
                </Field>
              ))}
              <Field
                label={tr("Наслов радног времена", "Opening-hours heading")}
                hint={tr("Подножје → средња колона.", "Footer → middle column.")}
                full
              >
                <input
                  className="admin-input"
                  value={localizedSetting("footerHoursHeading")}
                  placeholder={tr("Радно вријеме", "Opening hours")}
                  onChange={(event) =>
                    updateLocalizedSetting(
                      "footerHoursHeading",
                      event.target.value,
                    )
                  }
                />
              </Field>
              {([1, 2, 3] as const).map((line) => (
                <Field
                  key={`hours-${line}`}
                  label={tr(
                    `Радно вријеме — ${line}. ред`,
                    `Opening hours — line ${line}`,
                  )}
                  hint={tr(`Подножје → Радно вријеме → ${line}. ред.`, `Footer → Opening hours → line ${line}.`)}
                  full
                >
                  <input
                    className="admin-input"
                    value={localizedSetting(`footerHoursLine${line}`)}
                    placeholder={
                      line === 1
                        ? tr("Понедјељак – петак: 08:00 – 23:00", "Monday – Friday: 08:00 – 23:00")
                        : line === 2
                          ? tr("Субота: 09:00 – 00:00", "Saturday: 09:00 – 00:00")
                          : tr("Недјеља: 09:00 – 22:00", "Sunday: 09:00 – 22:00")
                    }
                    onChange={(event) =>
                      updateLocalizedSetting(
                        `footerHoursLine${line}` as LocalizedSetting,
                        event.target.value,
                      )
                    }
                  />
                </Field>
              ))}
              <Field
                label={tr("Ауторска права", "Copyright")}
                hint={tr("Најдоњи ред подножја, испод свих колона.", "Bottom-most footer line, below all columns.")}
                full
              >
                <input
                  className="admin-input"
                  value={localizedSetting("footerCopyright")}
                  placeholder={tr("© 2026 Кафе Бабушка · Бања Лука", "© 2026 Café Babuska · Banja Luka")}
                  onChange={(event) =>
                    updateLocalizedSetting(
                      "footerCopyright",
                      event.target.value,
                    )
                  }
                />
              </Field>
              </div>
            </div>
            <div className="admin-actions">
              <button className="admin-button" disabled={uploading === "hero"}>
                {tr("Сачувај садржај", "Save content")}
              </button>
            </div>
          </form>
        )}

        {tab === "categories" && (
          <>
            <form className="admin-panel" onSubmit={saveCategory}>
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
                <LanguageSwitch
                  value={contentLanguage}
                  onChange={setContentLanguage}
                  language={uiLanguage}
                  completed={{
                    sr: Boolean(categoryDraft.nameSr.trim()),
                    en: Boolean(categoryDraft.nameEn.trim()),
                    ru: Boolean(categoryDraft.nameRu.trim()),
                  }}
                />
              </div>
              <div className="admin-form-grid">
                <Field label={tr("Назив категорије", "Category name")}>
                  <input
                    className="admin-input"
                    required={contentLanguage !== "ru"}
                    value={categoryDraft[localizedCategoryKey]}
                    onChange={(event) =>
                      setCategoryDraft({
                        ...categoryDraft,
                        [localizedCategoryKey]: event.target.value,
                      })
                    }
                  />
                </Field>
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
                <button className="admin-button">
                  {editingCategory
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
                      {tr("Редослијед", "Order")}: {category.sortOrder}
                    </div>
                  </div>
                  <div className="admin-record__actions">
                    <button
                      className="admin-button admin-button--secondary"
                      onClick={() => {
                        setCategoryDraft(category);
                        setEditingCategory(true);
                      }}
                    >
                      {tr("Уреди", "Edit")}
                    </button>
                    <button
                      className="admin-button admin-button--danger"
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
            <form className="admin-panel" onSubmit={saveItem}>
              <div className="admin-panel__heading">
                <div>
                  <h2>
                    {editingItem
                      ? tr("Уреди пиће", "Edit drink")
                      : tr("Ново пиће", "New drink")}
                  </h2>
                  <p>
                    {categories.length
                      ? tr(
                          "Назив пића на оба језика и цијена су обавезни. Слика није обавезна.",
                          "The drink name in both languages and price are required. An image is optional.",
                        )
                      : tr(
                          "Прво креирајте категорију.",
                          "Create a category first.",
                        )}
                  </p>
                </div>
                <LanguageSwitch
                  value={contentLanguage}
                  onChange={setContentLanguage}
                  language={uiLanguage}
                  completed={{
                    sr: Boolean(
                      draft.nameSr.trim(),
                    ),
                    en: Boolean(
                      draft.nameEn.trim(),
                    ),
                    ru: Boolean(draft.nameRu.trim()),
                  }}
                />
              </div>
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
                <Field label={tr("Назив пића", "Drink name")}>
                  <input
                    className="admin-input"
                    required={contentLanguage !== "ru"}
                    value={draft[localizedItemKey("name")]}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        [localizedItemKey("name")]: event.target.value,
                      })
                    }
                  />
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
                <Field
                  label={tr("Слика", "Image")}
                  hint={tr("Необавезно", "Optional")}
                  full
                >
                  <MediaUpload
                    label={tr("Слика пића", "Drink image")}
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
                  disabled={!categories.length || uploading === "menu"}
                >
                  {editingItem
                    ? tr("Сачувај измјене", "Save changes")
                    : tr("Додај пиће", "Add drink")}
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
            <RecordSection
              title={tr("Ставке менија", "Menu items")}
              empty={tr("Нема унесених пића.", "No drinks yet.")}
            >
              {items.map((item) => (
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
                  </div>
                  <div className="admin-record__actions">
                    <button
                      className="admin-button admin-button--secondary"
                      onClick={() => {
                        setDraft(item);
                        setEditingItem(true);
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
            <form className="admin-panel" onSubmit={saveGallery}>
              <div className="admin-panel__heading">
                <div>
                  <h2>
                    {editingGallery
                      ? tr("Уреди галеријску слику", "Edit gallery image")
                      : tr("Нова галеријска слика", "New gallery image")}
                  </h2>
                  <p>
                    {tr(
                      "Слика се преноси директно у сигурно складиште.",
                      "The image uploads directly to Supabase Storage.",
                    )}
                  </p>
                </div>
                <LanguageSwitch
                  value={contentLanguage}
                  onChange={setContentLanguage}
                  language={uiLanguage}
                  completed={{
                    sr: Boolean(galleryDraft.altSr.trim()),
                    en: Boolean(galleryDraft.altEn.trim()),
                    ru: Boolean(galleryDraft.altRu.trim()),
                  }}
                />
              </div>
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
                <Field label={tr("Опис слике", "Image description")} full>
                  <input
                    className="admin-input"
                    required={contentLanguage !== "ru"}
                    value={galleryDraft[localizedGalleryKey]}
                    onChange={(event) =>
                      setGalleryDraft({
                        ...galleryDraft,
                        [localizedGalleryKey]: event.target.value,
                      })
                    }
                  />
                </Field>
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
                  disabled={uploading === "gallery"}
                >
                  {editingGallery
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
                  </div>
                  <div className="admin-record__actions">
                    <button
                      className="admin-button admin-button--secondary"
                      onClick={() => {
                        setGalleryDraft(item);
                        setEditingGallery(true);
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
              void saveSettings(
                event,
                tr(
                  "Контакт и мреже су сачувани.",
                  "Contact and social links saved.",
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
                hint={tr("Подножје → Контакт. Клик на број позива телефон.", "Footer → Contact. Visitors can tap the number to call.")}
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
                hint={tr("Подножје → Контакт. Клик отвара нову е-пошту.", "Footer → Contact. Visitors can tap it to email you.")}
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
                hint={tr("Приказује се испод контакт података у подножју.", "Shown below the contact details in the footer.")}
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
                hint={tr("Линк за Инстаграм икону у подножју. Оставите празно да је сакријете.", "Link for the Instagram icon in the footer. Leave empty to hide it.")}
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
                hint={tr("Линк за Фејсбук икону у подножју. Оставите празно да је сакријете.", "Link for the Facebook icon in the footer. Leave empty to hide it.")}
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
                hint={tr("Линк за ТикТок икону у подножју. Оставите празно да је сакријете.", "Link for the TikTok icon in the footer. Leave empty to hide it.")}
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
              <button className="admin-button">
                {tr("Сачувај контакт", "Save contact")}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
