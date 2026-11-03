export type AdminLanguage = "sr" | "en";

export function adminText(
  language: AdminLanguage,
  sr: string,
  en: string,
): string {
  return language === "sr" ? sr : en;
}

export const ADMIN_TABS = {
  stories: {
    sr: [
      "Живот Бабушке",
      "Живот Бабушке",
      "Објавите тренутке из кафића који се на почетној страници приказују 24 часа.",
    ],
    en: [
      "Babuska Life",
      "Babuska Life",
      "Publish café moments that appear on the homepage for 24 hours.",
    ],
  },
  content: {
    sr: [
      "Садржај",
      "Садржај странице",
      "Уредите почетни екран и подножје на српском, енглеском и руском језику.",
    ],
    en: [
      "Content",
      "Page content",
      "Edit the homepage and footer in Serbian, English, and Russian.",
    ],
  },
  categories: {
    sr: [
      "Категорије",
      "Категорије менија",
      "Категорије одређују редослијед и филтере на јавној страници.",
    ],
    en: [
      "Categories",
      "Menu categories",
      "Categories determine the public filters and menu order.",
    ],
  },
  menu: {
    sr: [
      "Мени",
      "Ставке менија",
      "Додајте и уредите пића и десерте, са преводима на сва три језика.",
    ],
    en: [
      "Menu",
      "Menu items",
      "Add and edit drinks and desserts, with translations in all three languages.",
    ],
  },
  gallery: {
    sr: [
      "Галерија",
      "Галерија",
      "Управљајте фотографијама које се приказују на јавној страници.",
    ],
    en: [
      "Gallery",
      "Gallery",
      "Manage the photos displayed on the public site.",
    ],
  },
  contact: {
    sr: [
      "Контакт",
      "Контакт и мреже",
      "Уредите контакт податке и профиле у подножју странице.",
    ],
    en: [
      "Contact",
      "Contact and social links",
      "Edit the contact details and profiles displayed in the footer.",
    ],
  },
} as const;

export type AdminTab = keyof typeof ADMIN_TABS;
