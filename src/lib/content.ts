import type { MediaVariants } from "./media-variants";

export type Lang = "sr" | "en";

export type MenuCategory = {
  id: string;
  nameSr: string;
  nameEn: string;
  sortOrder: number;
};

export type AdminMenuItem = {
  id: string;
  nameSr: string;
  nameEn: string;
  categoryId: string;
  price: string;
  image: string;
  storagePath: string;
  imageVariants: MediaVariants;
  descriptionSr: string;
  descriptionEn: string;
  factSr: string;
  factEn: string;
};

export type AdminGalleryItem = {
  id: string;
  image: string;
  storagePath: string;
  imageVariants: MediaVariants;
  altSr: string;
  altEn: string;
  sortOrder: number;
  isPublished: boolean;
};

export type SiteSettings = {
  instagram: string;
  facebook: string;
  tiktok: string;
  phone: string;
  email: string;
  socialHandle: string;
  heroImage: string;
  heroImageStoragePath: string;
  heroImageVariants: MediaVariants;
  heroTitleSr: string;
  heroTitleEn: string;
  heroDescriptionSr: string;
  heroDescriptionEn: string;
  heroCtaSr: string;
  heroCtaEn: string;
  footerAddressHeadingSr: string;
  footerAddressHeadingEn: string;
  footerAddressLine1Sr: string;
  footerAddressLine1En: string;
  footerAddressLine2Sr: string;
  footerAddressLine2En: string;
  footerAddressLine3Sr: string;
  footerAddressLine3En: string;
  footerHoursHeadingSr: string;
  footerHoursHeadingEn: string;
  footerHoursLine1Sr: string;
  footerHoursLine1En: string;
  footerHoursLine2Sr: string;
  footerHoursLine2En: string;
  footerHoursLine3Sr: string;
  footerHoursLine3En: string;
  footerContactHeadingSr: string;
  footerContactHeadingEn: string;
  footerCopyrightSr: string;
  footerCopyrightEn: string;
};

export type LocalizedMenuCategory = Pick<MenuCategory, "id" | "sortOrder"> & {
  name: string;
};
export type LocalizedMenuItem = Pick<
  AdminMenuItem,
  | "id"
  | "categoryId"
  | "price"
  | "image"
  | "storagePath"
  | "imageVariants"
> & {
  name: string;
  description: string;
  fact: string;
};

const LATIN_LETTER = /[A-Za-zČĆŽŠĐčćžšđ]/;
const CYRILLIC_LETTER = /\p{Script=Cyrillic}/u;

export function isValidLocalizedText(
  value: string,
  lang: Lang,
  optional = false,
): boolean {
  const text = value.trim();
  if (!text) return optional;
  if (lang === "en") return true;
  return CYRILLIC_LETTER.test(text) && !LATIN_LETTER.test(text);
}

export function localizedText(
  sr: string,
  en: string,
  lang: Lang,
  optional = false,
): string | null {
  const value = lang === "sr" ? sr : en;
  return isValidLocalizedText(value, lang, optional) ? value.trim() : null;
}

export function localizeCategory(
  category: MenuCategory,
  lang: Lang,
): LocalizedMenuCategory | null {
  const name = localizedText(category.nameSr, category.nameEn, lang);
  return name ? { id: category.id, sortOrder: category.sortOrder, name } : null;
}

export function localizeMenuItem(
  item: AdminMenuItem,
  lang: Lang,
): LocalizedMenuItem | null {
  const name = localizedText(item.nameSr, item.nameEn, lang);
  const description = localizedText(
    item.descriptionSr,
    item.descriptionEn,
    lang,
    true,
  );
  const fact = localizedText(item.factSr, item.factEn, lang, true);
  if (!name || description === null || fact === null) return null;
  return {
    id: item.id,
    categoryId: item.categoryId,
    price: item.price.trim(),
    image: item.image,
    storagePath: item.storagePath,
    imageVariants: item.imageVariants,
    name,
    description,
    fact,
  };
}

export function localizeCategories(
  categories: MenuCategory[],
  lang: Lang,
): LocalizedMenuCategory[] {
  return categories
    .map((category) => localizeCategory(category, lang))
    .filter((category): category is LocalizedMenuCategory => category !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function localizeMenuItems(
  items: AdminMenuItem[],
  lang: Lang,
): LocalizedMenuItem[] {
  return items
    .map((item) => localizeMenuItem(item, lang))
    .filter((item): item is LocalizedMenuItem => item !== null);
}
