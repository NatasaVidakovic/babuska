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
      "Уредите почетни екран и подножје на српском и енглеском језику.",
    ],
    en: [
      "Content",
      "Page content",
      "Edit the homepage and footer in Serbian and English.",
    ],
  },
  categories: {
    sr: [
      "Категорије",
      "Категорије пића",
      "Категорије одређују редослијед и филтере на јавној страници.",
    ],
    en: [
      "Categories",
      "Drink categories",
      "Categories determine the public filters and menu order.",
    ],
  },
  menu: {
    sr: [
      "Пића",
      "Пића у менију",
      "Додајте пиће у категорију; слика и опис су необавезни.",
    ],
    en: [
      "Drinks",
      "Menu drinks",
      "Add a drink to a category; its image and description are optional.",
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
