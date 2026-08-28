import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "./assets/brand/logo-babuska.png";
import {
  ADMIN_TABS,
  adminText,
  type AdminLanguage,
  type AdminTab,
} from "./lib/admin-i18n";
import type {
  AdminGalleryItem,
  AdminMenuItem,
  MenuCategory,
  SiteSettings,
} from "./lib/content";
import {
  removeUploadedImage,
  uploadImage,
  type MediaFolder,
} from "./lib/media";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type SessionState = "loading" | "signed-out" | "denied" | "ready";
type Feedback = { text: string; tone: "success" | "error" } | null;
type ContentLanguage = "sr" | "en";

const emptyItem: AdminMenuItem = {
  id: "",
  nameSr: "",
  nameEn: "",
  categoryId: "",
  price: "",
  image: "",
  storagePath: "",
  descriptionSr: "",
  descriptionEn: "",
  factSr: "",
  factEn: "",
};
const emptyCategory: MenuCategory = {
  id: "",
  nameSr: "",
  nameEn: "",
  sortOrder: 0,
};
const emptyGallery: AdminGalleryItem = {
  id: "",
  image: "",
  storagePath: "",
  altSr: "",
  altEn: "",
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
  heroTitleSr: "",
  heroTitleEn: "",
  heroDescriptionSr: "",
  heroDescriptionEn: "",
  heroCtaSr: "",
  heroCtaEn: "",
  footerAddressHeadingSr: "",
  footerAddressHeadingEn: "",
  footerAddressLine1Sr: "",
  footerAddressLine1En: "",
  footerAddressLine2Sr: "",
  footerAddressLine2En: "",
  footerAddressLine3Sr: "",
  footerAddressLine3En: "",
  footerHoursHeadingSr: "",
  footerHoursHeadingEn: "",
  footerHoursLine1Sr: "",
  footerHoursLine1En: "",
  footerHoursLine2Sr: "",
  footerHoursLine2En: "",
  footerHoursLine3Sr: "",
  footerHoursLine3En: "",
  footerContactHeadingSr: "",
  footerContactHeadingEn: "",
  footerCopyrightSr: "",
  footerCopyrightEn: "",
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
  completed?: { sr: boolean; en: boolean };
}) {
  return (
    <div
      className="admin-language-switch"
      aria-label={adminText(language, "Језик садржаја", "Content language")}
    >
      {(["sr", "en"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {option === "sr" ? "СР" : "EN"}
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
              : tr("Одабери слику са рачунара", "Choose image from computer")}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
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
          "JPEG, PNG, WebP или AVIF · највише 10 MB",
          "JPEG, PNG, WebP or AVIF · up to 10 MB",
        )}
      </small>
    </div>
  );
}

const settingFields: [keyof SiteSettings, string][] = [
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
  ["heroDescriptionSr", "hero_description_sr"],
  ["heroDescriptionEn", "hero_description_en"],
  ["heroCtaSr", "hero_cta_sr"],
  ["heroCtaEn", "hero_cta_en"],
  ["footerAddressHeadingSr", "footer_address_heading_sr"],
  ["footerAddressHeadingEn", "footer_address_heading_en"],
  ["footerAddressLine1Sr", "footer_address_line_1_sr"],
  ["footerAddressLine1En", "footer_address_line_1_en"],
  ["footerAddressLine2Sr", "footer_address_line_2_sr"],
  ["footerAddressLine2En", "footer_address_line_2_en"],
  ["footerAddressLine3Sr", "footer_address_line_3_sr"],
  ["footerAddressLine3En", "footer_address_line_3_en"],
  ["footerHoursHeadingSr", "footer_hours_heading_sr"],
  ["footerHoursHeadingEn", "footer_hours_heading_en"],
  ["footerHoursLine1Sr", "footer_hours_line_1_sr"],
  ["footerHoursLine1En", "footer_hours_line_1_en"],
  ["footerHoursLine2Sr", "footer_hours_line_2_sr"],
  ["footerHoursLine2En", "footer_hours_line_2_en"],
  ["footerHoursLine3Sr", "footer_hours_line_3_sr"],
  ["footerHoursLine3En", "footer_hours_line_3_en"],
  ["footerContactHeadingSr", "footer_contact_heading_sr"],
  ["footerContactHeadingEn", "footer_contact_heading_en"],
  ["footerCopyrightSr", "footer_copyright_sr"],
  ["footerCopyrightEn", "footer_copyright_en"],
];

function settingsFromRow(row: Record<string, unknown> | null): SiteSettings {
  const output = { ...emptySettings };
  for (const [key, column] of settingFields)
    output[key] =
      typeof row?.[column] === "string" ? (row[column] as string) : "";
  return output;
}

function settingsPayload(settings: SiteSettings) {
  return Object.fromEntries([
    ["id", 1],
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
  const [tab, setTab] = useState<AdminTab>("content");
  const [items, setItems] = useState<AdminMenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [galleryItems, setGalleryItems] = useState<AdminGalleryItem[]>([]);
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
  const notice = (text: string, tone: "success" | "error") =>
    setFeedback({ text, tone });

  const persistedPaths = useMemo(
    () =>
      new Set(
        [
          ...items.map((item) => item.storagePath),
          ...galleryItems.map((item) => item.storagePath),
          savedHeroPath,
        ].filter(Boolean),
      ),
    [items, galleryItems, savedHeroPath],
  );
  const discardPending = async (path: string) => {
    if (path && !persistedPaths.has(path))
      await removeUploadedImage(path).catch(() => undefined);
  };

  const load = async () => {
    const [categoriesResult, itemsResult, galleryResult, settingsResult] =
      await Promise.all([
        supabase
          .from("menu_categories")
          .select("id, name_sr, name_en, sort_order")
          .order("sort_order"),
        supabase
          .from("menu_items")
          .select(
            "id, name_sr, name_en, category_id, price, image_url, storage_path, description_sr, description_en, fact_sr, fact_en",
          )
          .order("sort_order"),
        supabase
          .from("gallery_items")
          .select(
            "id, image_url, storage_path, alt_sr, alt_en, is_published, sort_order",
          )
          .order("sort_order"),
        supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
    const error =
      categoriesResult.error ??
      itemsResult.error ??
      galleryResult.error ??
      settingsResult.error;
    if (error) {
      notice(error.message, "error");
      return;
    }
    const nextCategories = (categoriesResult.data ?? []).map((category) => ({
      id: category.id,
      nameSr: category.name_sr ?? "",
      nameEn: category.name_en ?? "",
      sortOrder: category.sort_order,
    }));
    setCategories(nextCategories);
    setItems(
      (itemsResult.data ?? []).map((item) => ({
        id: item.id,
        nameSr: item.name_sr ?? "",
        nameEn: item.name_en ?? "",
        categoryId: item.category_id,
        price: item.price,
        image: item.image_url ?? "",
        storagePath: item.storage_path ?? "",
        descriptionSr: item.description_sr ?? "",
        descriptionEn: item.description_en ?? "",
        factSr: item.fact_sr ?? "",
        factEn: item.fact_en ?? "",
      })),
    );
    setGalleryItems(
      (galleryResult.data ?? []).map((item) => ({
        id: item.id,
        image: item.image_url,
        storagePath: item.storage_path ?? "",
        altSr: item.alt_sr,
        altEn: item.alt_en,
        isPublished: item.is_published,
        sortOrder: item.sort_order,
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
          "Supabase позадински систем није покренут.",
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
    try {
      const media = await uploadImage(file, folder);
      await discardPending(currentPath);
      if (folder === "hero")
        setSettings((current) => ({
          ...current,
          heroImage: media.url,
          heroImageStoragePath: media.path,
        }));
      else if (folder === "menu")
        setDraft((current) => ({
          ...current,
          image: media.url,
          storagePath: media.path,
        }));
      else
        setGalleryDraft((current) => ({
          ...current,
          image: media.url,
          storagePath: media.path,
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

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    const nameSr = categoryDraft.nameSr.trim();
    const nameEn = categoryDraft.nameEn.trim();
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
    const payload = {
      name: nameSr,
      name_sr: nameSr,
      name_en: nameEn,
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
      !draft.descriptionSr.trim() ||
      !draft.descriptionEn.trim() ||
      !draft.image
    ) {
      notice(
        tr(
          "Одаберите категорију, пренесите слику и попуните обавезни текст на оба језика.",
          "Choose a category, upload an image, and complete required text in both languages.",
        ),
        "error",
      );
      return;
    }
    const oldPath = editingItem
      ? (items.find((item) => item.id === draft.id)?.storagePath ?? "")
      : "";
    const payload = {
      name: draft.nameSr.trim(),
      name_sr: draft.nameSr.trim(),
      name_en: draft.nameEn.trim(),
      category_id: draft.categoryId,
      price: draft.price.trim(),
      image_url: draft.image,
      storage_path: draft.storagePath || null,
      description: draft.descriptionSr.trim(),
      description_sr: draft.descriptionSr.trim(),
      description_en: draft.descriptionEn.trim(),
      fact: draft.factSr.trim() || null,
      fact_sr: draft.factSr.trim() || null,
      fact_en: draft.factEn.trim() || null,
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
    if (oldPath && oldPath !== draft.storagePath)
      await removeUploadedImage(oldPath).catch(() =>
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
    await discardPending(draft.storagePath);
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
    await removeUploadedImage(item.storagePath).catch(() =>
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
    const oldPath = editingGallery
      ? (galleryItems.find((item) => item.id === galleryDraft.id)
          ?.storagePath ?? "")
      : "";
    const payload = {
      image_url: galleryDraft.image,
      storage_path: galleryDraft.storagePath || null,
      alt_sr: galleryDraft.altSr.trim(),
      alt_en: galleryDraft.altEn.trim(),
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
    if (oldPath && oldPath !== galleryDraft.storagePath)
      await removeUploadedImage(oldPath).catch(() =>
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
    await discardPending(galleryDraft.storagePath);
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
    await removeUploadedImage(item.storagePath).catch(() =>
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
    const key =
      `${field}${contentLanguage === "sr" ? "Sr" : "En"}` as keyof SiteSettings;
    setSettings((current) => ({ ...current, [key]: value }));
  };
  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  const suffix = contentLanguage === "sr" ? "Sr" : "En";
  const localizedSetting = (field: string) =>
    settings[`${field}${suffix}` as keyof SiteSettings] as string;
  const localizedItemKey = (field: "name" | "description" | "fact") =>
    `${field}${suffix}` as keyof AdminMenuItem;
  const localizedCategoryKey = `name${suffix}` as "nameSr" | "nameEn";
  const localizedGalleryKey = contentLanguage === "sr" ? "altSr" : "altEn";

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
                    "Унесите комплетан садржај на оба језика.",
                    "Complete the content in both languages.",
                  )}
                </p>
              </div>
              <LanguageSwitch
                value={contentLanguage}
                onChange={setContentLanguage}
                language={uiLanguage}
              />
            </div>
            <div className="admin-form-grid">
              <Field label={tr("Почетна слика", "Hero image")} full>
                <MediaUpload
                  label={tr("Слика почетног екрана", "Homepage image")}
                  value={settings.heroImage}
                  busy={uploading === "hero"}
                  language={uiLanguage}
                  onUpload={(file) => uploadFor(file, "hero")}
                />
              </Field>
              <Field label={tr("Наслов на почетној", "Homepage title")} full>
                <textarea
                  className="admin-input admin-textarea"
                  value={localizedSetting("heroTitle")}
                  onChange={(event) =>
                    updateLocalizedSetting("heroTitle", event.target.value)
                  }
                />
              </Field>
              <Field
                label={tr("Опис на почетној", "Homepage description")}
                full
              >
                <textarea
                  className="admin-input admin-textarea"
                  value={localizedSetting("heroDescription")}
                  onChange={(event) =>
                    updateLocalizedSetting(
                      "heroDescription",
                      event.target.value,
                    )
                  }
                />
              </Field>
              <Field label={tr("Текст дугмета", "Button text")} full>
                <input
                  className="admin-input"
                  value={localizedSetting("heroCta")}
                  onChange={(event) =>
                    updateLocalizedSetting("heroCta", event.target.value)
                  }
                />
              </Field>
              <Field label={tr("Наслов адресе", "Address heading")}>
                <input
                  className="admin-input"
                  value={localizedSetting("footerAddressHeading")}
                  onChange={(event) =>
                    updateLocalizedSetting(
                      "footerAddressHeading",
                      event.target.value,
                    )
                  }
                />
              </Field>
              <Field label={tr("Наслов контакта", "Contact heading")}>
                <input
                  className="admin-input"
                  value={localizedSetting("footerContactHeading")}
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
                  full
                >
                  <input
                    className="admin-input"
                    value={localizedSetting(`footerAddressLine${line}`)}
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
                full
              >
                <input
                  className="admin-input"
                  value={localizedSetting("footerHoursHeading")}
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
                  full
                >
                  <input
                    className="admin-input"
                    value={localizedSetting(`footerHoursLine${line}`)}
                    onChange={(event) =>
                      updateLocalizedSetting(
                        `footerHoursLine${line}` as LocalizedSetting,
                        event.target.value,
                      )
                    }
                  />
                </Field>
              ))}
              <Field label={tr("Ауторска права", "Copyright")} full>
                <input
                  className="admin-input"
                  value={localizedSetting("footerCopyright")}
                  onChange={(event) =>
                    updateLocalizedSetting(
                      "footerCopyright",
                      event.target.value,
                    )
                  }
                />
              </Field>
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
                  }}
                />
              </div>
              <div className="admin-form-grid">
                <Field label={tr("Назив категорије", "Category name")}>
                  <input
                    className="admin-input"
                    required
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
                      {contentLanguage === "sr"
                        ? category.nameSr
                        : category.nameEn}
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
                          "Слика и текст на оба језика су обавезни.",
                          "Image and text in both languages are required.",
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
                      draft.nameSr.trim() && draft.descriptionSr.trim(),
                    ),
                    en: Boolean(
                      draft.nameEn.trim() && draft.descriptionEn.trim(),
                    ),
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
                        {contentLanguage === "sr"
                          ? category.nameSr
                          : category.nameEn}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={tr("Назив пића", "Drink name")}>
                  <input
                    className="admin-input"
                    required
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
                <Field label={tr("Слика", "Image")} full>
                  <MediaUpload
                    label={tr("Слика производа", "Product image")}
                    value={draft.image}
                    busy={uploading === "menu"}
                    language={uiLanguage}
                    onUpload={(file) => uploadFor(file, "menu")}
                  />
                </Field>
                <Field
                  label={tr("Опис / састојци", "Description / ingredients")}
                  full
                >
                  <textarea
                    className="admin-input admin-textarea"
                    required
                    value={draft[localizedItemKey("description")]}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        [localizedItemKey("description")]: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field
                  label={tr("Занимљивост", "Fact")}
                  hint={tr("Необавезно", "Optional")}
                  full
                >
                  <textarea
                    className="admin-input admin-textarea"
                    value={draft[localizedItemKey("fact")]}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        [localizedItemKey("fact")]: event.target.value,
                      })
                    }
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
                      {contentLanguage === "sr" ? item.nameSr : item.nameEn}
                    </strong>
                    <div className="admin-record__meta">
                      {(contentLanguage === "sr"
                        ? categories.find(
                            (category) => category.id === item.categoryId,
                          )?.nameSr
                        : categories.find(
                            (category) => category.id === item.categoryId,
                          )?.nameEn) ??
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
                      "Слика се преноси директно у Supabase Storage.",
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
                    required
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
                      {contentLanguage === "sr" ? item.altSr : item.altEn}
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
                    "Празан URL сакрива одговарајућу икону.",
                    "An empty URL hides the corresponding icon.",
                  )}
                </p>
              </div>
            </div>
            <div className="admin-form-grid">
              <Field label={tr("Телефон", "Phone")} full>
                <input
                  className="admin-input"
                  type="tel"
                  value={settings.phone}
                  onChange={(event) =>
                    setSettings({ ...settings, phone: event.target.value })
                  }
                />
              </Field>
              <Field label={tr("Е-пошта", "Email")} full>
                <input
                  className="admin-input"
                  type="email"
                  value={settings.email}
                  onChange={(event) =>
                    setSettings({ ...settings, email: event.target.value })
                  }
                />
              </Field>
              <Field label={tr("Корисничко име", "Handle")} full>
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
              <Field label="Instagram" full>
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
              <Field label="Facebook" full>
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
              <Field label="TikTok" full>
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
