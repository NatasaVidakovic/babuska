import React, { useState, useEffect, useMemo, useRef } from "react";
import { Routes, Route } from "react-router-dom";
import brandLogo from "./assets/brand/logo-babuska.webp";
import heroWordmark from "./assets/brand/logo-wordmark.webp";
import defaultHomeHero from "./assets/hero/default-home.webp";
import HeroLoader from "./components/HeroLoader";
import DeferredSection from "./components/DeferredSection";
import StoryViewer from "./components/StoryViewer";
import {
  localizeCategories,
  localizeMenuItems,
  localizedText,
  type AdminGalleryItem,
  type AdminMenuItem,
  type AdminStoryItem,
  type Lang,
  type MenuCategory,
  type SiteSettings,
} from "./lib/content";
import { BOOK_ITEMS_PER_PAGE, createBookPageSlots } from "./lib/book";
import {
  emptySiteSettings,
  fetchPublicContent,
  publicMediaUrl,
  publicSupabaseConfig,
  readPublicContentCache,
  writePublicContentCache,
  type PublicContentSnapshot,
} from "./lib/public-content";
import { getHeroLoadState } from "./lib/hero-loader";
import { mediaSrcSet } from "./lib/media-variants";
import { categoryIconKind } from "./lib/category-icons";

const Admin = React.lazy(() => import("./Admin"));

export type SocialLinks = {
  instagram: string;
  facebook: string;
  tiktok: string;
};
export type {
  AdminGalleryItem,
  AdminMenuItem,
  AdminStoryItem,
  MenuCategory,
  SiteSettings,
} from "./lib/content";

// ── Language ─────────────────────────────────────────────────────────
const LangContext = React.createContext<Lang>("sr");

const T = {
  sr: {
    nav: ["Мени", "Галерија", "Посјета"],
    nav_ids: ["menu", "gallery", "visit"],
    hero_sub_label: "Наша понуда",
    hero_title: "Укус Москве у Бањој Луци",
    hero_sub:
      "Ексклузивни напици, фини чајеви и руско гостопримство — послужени с тихом, спокојном топлином.",
    hero_cta: "Истражи мени",
    menu_overline: "Наша понуда",
    menu_heading: "Откриј нове укусе",
    menu_hint: "Отворите картицу за причу — поново за фотографију",
    book_overline: "Комплетна понуда",
    book_heading: "Мени",
    book_hint: "Прелистајте понуду као праву књигу",
    book_running_head: "Кафе Бабушка",
    book_prev: "Претходна",
    book_next: "Сљедећа",
    gallery_overline: "Атмосфера",
    gallery_heading: "Кафић",
    footer_addr_heading: "Адреса",
    footer_addr_1: "Господска улица 14",
    footer_addr_2: "78000 Бања Лука",
    footer_addr_3: "Босна и Херцеговина",
    footer_hours_heading: "Радно вријеме",
    footer_h1: "Пон – Пет: 08:00 – 23:00",
    footer_h2: "Субота: 09:00 – 00:00",
    footer_h3: "Недјеља: 09:00 – 22:00",
    footer_contact_heading: "Контакт",
    footer_copyright: `© ${new Date().getFullYear()} Кафе Бабушка · Бања Лука`,
    cat_all: "Све",
    cat_espresso: "Еспресо",
    cat_specialty: "Сигнатура",
    cat_tea: "Чај",
    cat_cold: "Хладно",
    cat_cocoa: "Какао",
    book_cat: {
      Espresso: "Еспресо",
      Signature: "Сигнатура",
      Čaj: "Чај",
      Hladno: "Хладно",
      Kakao: "Какао",
      Ekskluzivno: "Ексклузивно",
      Osvježenje: "Освјежење",
    } as Record<string, string>,
  },
  en: {
    nav: ["Menu", "Gallery", "Visit"],
    nav_ids: ["menu", "gallery", "visit"],
    hero_sub_label: "Our offer",
    hero_title: "A Taste of Moscow in Banja Luka",
    hero_sub:
      "Signature beverages, fine teas, and Russian hospitality — served with quiet, unhurried warmth.",
    hero_cta: "Explore the Menu",
    menu_overline: "Our Offerings",
    menu_heading: "Discover New Tastes",
    menu_hint: "Open a card to read its story — open it again to show the photo",
    book_overline: "Complete Menu",
    book_heading: "Menu",
    book_hint: "Browse the selection like a real book",
    book_running_head: "Café Babuska",
    book_prev: "Previous",
    book_next: "Next",
    gallery_overline: "Atmosphere",
    gallery_heading: "The Café",
    footer_addr_heading: "Address",
    footer_addr_1: "Gospodska Street 14",
    footer_addr_2: "78000 Banja Luka",
    footer_addr_3: "Bosnia and Herzegovina",
    footer_hours_heading: "Opening Hours",
    footer_h1: "Mon – Fri: 08:00 – 23:00",
    footer_h2: "Saturday: 09:00 – 00:00",
    footer_h3: "Sunday: 09:00 – 22:00",
    footer_contact_heading: "Contact",
    footer_copyright: `© ${new Date().getFullYear()} Кафе Бабушка · Banja Luka`,
    cat_all: "All",
    cat_espresso: "Espresso",
    cat_specialty: "Signature",
    cat_tea: "Tea",
    cat_cold: "Cold",
    cat_cocoa: "Cocoa",
    book_cat: {
      Espresso: "Espresso",
      Signature: "Signature",
      Čaj: "Tea",
      Hladno: "Cold",
      Kakao: "Cocoa",
      Ekskluzivno: "Exclusive",
      Osvježenje: "Refreshment",
    } as Record<string, string>,
  },
  ru: {
    nav: ["Меню", "Галерея", "Как нас найти"],
    nav_ids: ["menu", "gallery", "visit"],
    hero_sub_label: "Наше предложение",
    hero_title: "Вкус Москвы в Баня-Луке",
    hero_sub:
      "Авторские напитки, изысканные чаи и русское гостеприимство — с тихим, душевным теплом.",
    hero_cta: "Открыть меню",
    menu_overline: "Наше предложение",
    menu_heading: "Откройте новые вкусы",
    menu_hint: "Откройте карточку, чтобы прочитать историю, и ещё раз — чтобы увидеть фотографию",
    book_overline: "Полное предложение",
    book_heading: "Меню",
    book_hint: "Листайте меню как настоящую книгу",
    book_running_head: "Кафе Бабушка",
    book_prev: "Назад",
    book_next: "Далее",
    gallery_overline: "Атмосфера",
    gallery_heading: "Наше кафе",
    footer_addr_heading: "Адрес",
    footer_addr_1: "Господская улица, 14",
    footer_addr_2: "78000 Баня-Лука",
    footer_addr_3: "Босния и Герцеговина",
    footer_hours_heading: "Часы работы",
    footer_h1: "Пн – Пт: 08:00 – 23:00",
    footer_h2: "Суббота: 09:00 – 00:00",
    footer_h3: "Воскресенье: 09:00 – 22:00",
    footer_contact_heading: "Контакты",
    footer_copyright: `© ${new Date().getFullYear()} Кафе Бабушка · Баня-Лука`,
    cat_all: "Все",
    cat_espresso: "Эспрессо",
    cat_specialty: "Авторские",
    cat_tea: "Чай",
    cat_cold: "Холодные",
    cat_cocoa: "Какао",
    book_cat: {
      Espresso: "Эспрессо",
      Signature: "Авторские",
      Čaj: "Чай",
      Hladno: "Холодные",
      Kakao: "Какао",
      Ekskluzivno: "Эксклюзивные",
      Osvježenje: "Освежающие",
    } as Record<string, string>,
  },
} as const;

const PUBLIC_COPY = {
  sr: {
    home: "Кафе Бабушка — почетна",
    openNav: "Отвори навигацију",
    closeNav: "Затвори навигацију",
    heroAlt: "Поглед на Москву",
    heroLoading: "Учитавање почетне слике",
    openStories: "Отвори Живот Бабушке",
    stories: "Живот Бабушке",
    language: "Српски језик, ћирилица",
  },
  en: {
    home: "Café Babuska — home",
    openNav: "Open navigation",
    closeNav: "Close navigation",
    heroAlt: "View of Moscow",
    heroLoading: "Loading the hero image",
    openStories: "Open Babuska Life stories",
    stories: "Babuska Life",
    language: "English language",
  },
  ru: {
    home: "Кафе Бабушка — главная",
    openNav: "Открыть навигацию",
    closeNav: "Закрыть навигацию",
    heroAlt: "Вид на Москву",
    heroLoading: "Загрузка главного изображения",
    openStories: "Открыть истории «Жизнь Бабушки»",
    stories: "Жизнь Бабушки",
    language: "Русский язык",
  },
} as const;

// ── Types ────────────────────────────────────────────────────────────
type Category =
  | "All"
  | "Espresso"
  | "Specialty"
  | "Tea & Infusions"
  | "Cold & Iced"
  | "Hot Chocolate";

interface MenuItem {
  category: string;
  name: string;
  price: string;
  image: string;
  imageSrcSet: string;
  ingredients: string;
  fact: string;
}

function CategoryFallbackIcon({ category }: { category: string }) {
  const kind = categoryIconKind(category);
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      className="menu-card__category-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...common}
    >
      {kind === "coffee" && (
        <>
          <path d="M5 8h10v7.1A3.9 3.9 0 0 1 11.1 19H8.9A3.9 3.9 0 0 1 5 15.1Z" />
          <path d="M15 10h1.2a2.8 2.8 0 1 1 0 5.6H15" />
          <path d="M7.5 5.4c-.7.7-.7 1.5 0 2.2M11 5.4c-.7.7-.7 1.5 0 2.2" />
        </>
      )}
      {kind === "tea" && (
        <>
          <path d="M5.2 11.2h10.6v3.5A4.3 4.3 0 0 1 11.5 19h-2A4.3 4.3 0 0 1 5.2 14.7Z" />
          <path d="M15.8 12.1h1a2.5 2.5 0 0 1 0 5h-1" />
          <path d="M8 9.2h5.2M10.6 6.2v3" />
          <path d="M6.7 8.2 9 6.1" />
        </>
      )}
      {kind === "wine" && (
        <>
          <path d="M7 4.6h10c0 4-1.8 6.5-5 6.5s-5-2.5-5-6.5Z" />
          <path d="M12 11.1v6.2M8.7 19h6.6" />
          <path d="M8.5 7.7c1.2.6 5.8.6 7 0" />
        </>
      )}
      {kind === "cocktail" && (
        <>
          <path d="M5.4 5.2h13.2L12 12.5 5.4 5.2Z" />
          <path d="M12 12.5v5.1M8.7 19h6.6" />
          <path d="M16.2 4.1 20 7.9M17.8 5.7l1.7-1.7M18.1 7.6l2.2.1" />
        </>
      )}
      {kind === "juice" && (
        <>
          <path d="M7 6.4h10l-1.1 12.1H8.1L7 6.4Z" />
          <path d="m14.5 3.8 2.2 4.3M16.1 3.7h2.3" />
          <path d="M7.6 12.2h8.8l-.5 5.4H8.1l-.5-5.4Z" fill="currentColor" stroke="none" opacity="0.16" />
          <path d="M7.6 12.2h8.8" />
          <rect x="8.6" y="9.1" width="2.6" height="2.6" rx="0.35" transform="rotate(-12 9.9 10.4)" />
          <rect x="12" y="10" width="2.5" height="2.5" rx="0.35" transform="rotate(16 13.25 11.25)" />
        </>
      )}
      {kind === "water" && (
        <>
          <path d="M7.3 4.7h9.4l-1.1 13.8H8.4L7.3 4.7Z" />
          <path d="M7.4 4.7c2.5.52 6.7.52 9.2 0" />
          <path d="M7.9 11.4h8.2l-.45 5.7H8.35L7.9 11.4Z" fill="currentColor" stroke="none" opacity="0.16" />
          <path d="M7.9 11.4c2.05-.48 6.15-.48 8.2 0" />
          <path d="M10.1 14.4c1.15-.28 2.65-.28 3.8 0" opacity="0.72" />
        </>
      )}
      {kind === "beer" && (
        <>
          <path d="M6.2 7.2h9.1v8.7a3.1 3.1 0 0 1-3.1 3.1H9.3a3.1 3.1 0 0 1-3.1-3.1V7.2Z" />
          <path d="M15.3 9.2h1.3a2.5 2.5 0 0 1 0 5h-1.3" />
          <path d="M6.2 7.2c.6-1.6 2-1.8 3-1.1.7-1 2.1-1 2.8 0 1-.7 2.6-.4 3.3 1.1" />
        </>
      )}
      {kind === "cider" && (
        <>
          <path d="M7.5 6h9c0 3.4-1.6 5.7-4.5 5.7S7.5 9.4 7.5 6Z" />
          <path d="M12 11.7v5.6M8.8 19h6.4" />
          <path d="M9.1 8.6c1.4.6 4.4.6 5.8 0" />
          <path d="m16.6 4 3.4 3.4M18 5.4l1.5-1.5M18.4 7.3l1.9.1" />
        </>
      )}
      {kind === "gelato" && (
        <>
          <path d="M8.2 12.1h7.6L12 20 8.2 12.1Z" />
          <path d="M8.1 12.1h7.8M10.1 16.1h3.8M9.2 14.1h5.6" opacity="0.7" />
          <path d="M7.5 10.9a2.5 2.5 0 1 1 4.2-1.8 2.5 2.5 0 1 1 4.8 1.8" />
          <path d="M8.1 10.9a2.1 2.1 0 0 1 3.8-1.2 2.1 2.1 0 0 1 4.1 1.2" fill="currentColor" stroke="none" opacity="0.14" />
        </>
      )}
      {kind === "rakija" && (
        <>
          <path d="M5.6 5.1h3v2.2l1.2 1.4v8.7H4.4V8.7l1.2-1.4V5.1Z" />
          <path d="M4.4 11h5.4M5.8 14.2h2.6" />
          <path d="M14 11.2h4.8l-.5 6.1h-3.8l-.5-6.1Z" />
          <path d="M14.5 13.9h3.8" />
        </>
      )}
      {kind === "spirits" && (
        <>
          <path d="M6.4 6.6h11.2l-1 10.9a1.6 1.6 0 0 1-1.6 1.5H8.9a1.6 1.6 0 0 1-1.6-1.5L6.4 6.6Z" />
          <path d="M7.3 12.1h9.4l-.5 5.1H7.8l-.5-5.1Z" fill="currentColor" stroke="none" opacity="0.16" />
          <path d="M7.3 12.1h9.4" />
          <path d="m8.7 9.3 2.4 2.4-2.1 2.1-2.1-2.1 1.8-1.8ZM13.2 10.2l2.3 2.3-2.1 2.1-2.1-2.1 1.9-1.9Z" opacity="0.88" />
        </>
      )}
      {kind === "glass" && (
        <>
          <path d="M6.7 5.2h10.6l-1 12.2a1.8 1.8 0 0 1-1.8 1.6h-5a1.8 1.8 0 0 1-1.8-1.6L6.7 5.2Z" />
          <path d="M7.3 12h9.4" />
          <path d="M7.5 14.2h9l-.25 3.1a1.7 1.7 0 0 1-1.7 1.5h-5.1a1.7 1.7 0 0 1-1.7-1.5l-.25-3.1Z" fill="currentColor" stroke="none" opacity="0.14" />
        </>
      )}
    </svg>
  );
}

// ── Book menu data — 50 unique drinks, 10 per spread ─────────────────
interface BookDrink {
  name: string;
  price: string;
  category: string;
}
const bookDrinks: BookDrink[] = [
  { name: "Espresso", price: "3.50 KM", category: "Espresso" },
  { name: "Doppio", price: "4.50 KM", category: "Espresso" },
  { name: "Ristretto", price: "3.50 KM", category: "Espresso" },
  { name: "Lungo", price: "4.00 KM", category: "Espresso" },
  { name: "Americano", price: "4.50 KM", category: "Espresso" },
  { name: "Cappuccino", price: "5.50 KM", category: "Espresso" },
  { name: "Caffè Latte", price: "5.50 KM", category: "Espresso" },
  { name: "Flat White", price: "6.00 KM", category: "Espresso" },
  { name: "Macchiato", price: "4.50 KM", category: "Espresso" },
  { name: "Cortado", price: "5.00 KM", category: "Espresso" },
  { name: "Moscow Raf", price: "8.50 KM", category: "Signature" },
  { name: "Pine Nut Latte", price: "9.00 KM", category: "Signature" },
  { name: "Spiced Mocha", price: "7.50 KM", category: "Signature" },
  { name: "Rose Cardamom Latte", price: "8.50 KM", category: "Signature" },
  { name: "Honey Cinnamon Latte", price: "7.50 KM", category: "Signature" },
  { name: "Lavender Fog", price: "8.00 KM", category: "Signature" },
  { name: "Salted Caramel Raf", price: "9.00 KM", category: "Signature" },
  { name: "Vienna Coffee", price: "7.00 KM", category: "Signature" },
  { name: "Pistachio Raf", price: "9.50 KM", category: "Signature" },
  { name: "Tsarina's Latte", price: "10.00 KM", category: "Signature" },
  { name: "Imperial Black Tea", price: "6.00 KM", category: "Čaj" },
  { name: "Samovar Chai", price: "7.50 KM", category: "Čaj" },
  { name: "Siberian Berry Tea", price: "7.00 KM", category: "Čaj" },
  { name: "Jasmine Green", price: "6.50 KM", category: "Čaj" },
  { name: "Camomile & Honey", price: "6.00 KM", category: "Čaj" },
  { name: "Crimson Berry Infusion", price: "7.00 KM", category: "Čaj" },
  { name: "Mint Sencha", price: "6.50 KM", category: "Čaj" },
  { name: "White Peony", price: "7.50 KM", category: "Čaj" },
  { name: "Rose Hip & Ginger", price: "6.50 KM", category: "Čaj" },
  { name: "Earl Grey Royal", price: "7.00 KM", category: "Čaj" },
  { name: "Cold Brew", price: "7.00 KM", category: "Hladno" },
  { name: "Iced Raf", price: "9.00 KM", category: "Hladno" },
  { name: "Iced Lavender Latte", price: "8.50 KM", category: "Hladno" },
  { name: "Matcha Lemonade", price: "8.00 KM", category: "Hladno" },
  { name: "Sparkling Elderflower", price: "6.50 KM", category: "Hladno" },
  { name: "Cold Brew Tonic", price: "8.00 KM", category: "Hladno" },
  { name: "Iced Matcha", price: "7.50 KM", category: "Hladno" },
  { name: "Watermelon Mint", price: "6.50 KM", category: "Hladno" },
  { name: "Yuzu Lemonade", price: "7.00 KM", category: "Hladno" },
  { name: "Cold Brew Float", price: "9.00 KM", category: "Hladno" },
  { name: "Dark Chocolate Pot", price: "7.50 KM", category: "Kakao" },
  { name: "White Choco Raspberry", price: "8.00 KM", category: "Kakao" },
  { name: "Golden Milk", price: "7.50 KM", category: "Kakao" },
  { name: "Aztec Spiced Cacao", price: "8.50 KM", category: "Kakao" },
  { name: "Praline Velvet", price: "8.50 KM", category: "Kakao" },
  { name: "Babuška Special", price: "11.00 KM", category: "Ekskluzivno" },
  { name: "Tsar's Blend", price: "10.50 KM", category: "Ekskluzivno" },
  { name: "Kremlin Elixir", price: "9.50 KM", category: "Ekskluzivno" },
  { name: "Saffron Raf", price: "10.50 KM", category: "Ekskluzivno" },
  { name: "Fresh Lemonade", price: "5.50 KM", category: "Osvježenje" },
  { name: "Ginger Lemon Fizz", price: "6.00 KM", category: "Osvježenje" },
];

const galleryImages = [
  {
    src: "https://images.unsplash.com/photo-1493770348161-369560ae357d?w=900&h=700&fit=crop&auto=format",
    altSr: "Унутрашњост кафеа",
    altEn: "Café interior",
    altRu: "Интерьер кафе",
  },
  {
    src: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=500&fit=crop&auto=format",
    altSr: "Сто у кафеу",
    altEn: "Café table",
    altRu: "Столик в кафе",
  },
  {
    src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=500&fit=crop&auto=format",
    altSr: "Детаљ кафе",
    altEn: "Coffee detail",
    altRu: "Кофейная деталь",
  },
  {
    src: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=500&fit=crop&auto=format",
    altSr: "Топла атмосфера",
    altEn: "Warm atmosphere",
    altRu: "Тёплая атмосфера",
  },
  {
    src: "https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=600&h=500&fit=crop&auto=format",
    altSr: "Кутак у кафеу",
    altEn: "Café corner",
    altRu: "Уголок кафе",
  },
];

// ── Corner ornament ──────────────────────────────────────────────────
function CornerOrnament({ rotate = 0 }: { rotate?: number }) {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      style={{ transform: `rotate(${rotate}deg)`, opacity: 0.65 }}
    >
      <path d="M5 5 H55" stroke="#B34D47" strokeWidth="1" />
      <path d="M5 5 V55" stroke="#B34D47" strokeWidth="1" />
      <rect
        x="1"
        y="1"
        width="8"
        height="8"
        stroke="#B34D47"
        strokeWidth="0.8"
      />
      <rect x="3" y="3" width="4" height="4" fill="#8C1513" />
      <line x1="51" y1="1" x2="51" y2="9" stroke="#B34D47" strokeWidth="1" />
      <line x1="1" y1="51" x2="9" y2="51" stroke="#B34D47" strokeWidth="1" />
      <circle cx="55" cy="5" r="2" fill="#8C1513" />
      <circle cx="5" cy="55" r="2" fill="#8C1513" />
      <circle
        cx="28"
        cy="28"
        r="10"
        stroke="#B34D47"
        strokeWidth="0.7"
        opacity="0.5"
      />
      <circle cx="28" cy="28" r="4" fill="#8C1513" opacity="0.7" />
      <ellipse cx="28" cy="18" rx="2.5" ry="5" fill="#B34D47" opacity="0.45" />
      <ellipse cx="28" cy="38" rx="2.5" ry="5" fill="#B34D47" opacity="0.45" />
      <ellipse cx="18" cy="28" rx="5" ry="2.5" fill="#B34D47" opacity="0.45" />
      <ellipse cx="38" cy="28" rx="5" ry="2.5" fill="#B34D47" opacity="0.45" />
      <circle cx="28" cy="28" r="1.5" fill="#F7F2E9" opacity="0.6" />
      <path
        d="M5 20 Q16 20 20 28"
        stroke="#B34D47"
        strokeWidth="0.7"
        fill="none"
        opacity="0.35"
      />
      <path
        d="M20 5 Q20 16 28 20"
        stroke="#B34D47"
        strokeWidth="0.7"
        fill="none"
        opacity="0.35"
      />
    </svg>
  );
}

// ── Book page ornament helpers ─────────────────────────────────────────
function BookPageCorner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const rot = { tl: 0, tr: 90, br: 180, bl: 270 }[pos];
  const style: React.CSSProperties = {
    position: "absolute",
    width: 28,
    height: 28,
    pointerEvents: "none",
    zIndex: 1,
    ...(pos.startsWith("t") ? { top: 8 } : { bottom: 8 }),
    ...(pos.endsWith("l") ? { left: 8 } : { right: 8 }),
    transform: `rotate(${rot}deg)`,
  };
  return (
    <svg style={style} viewBox="0 0 28 28" fill="none">
      <path
        d="M2 2 H17"
        stroke="rgba(200,160,96,0.6)"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M2 2 V17"
        stroke="rgba(200,160,96,0.6)"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <rect
        x="0.4"
        y="0.4"
        width="4.2"
        height="4.2"
        stroke="rgba(200,160,96,0.55)"
        strokeWidth="0.7"
      />
      <rect
        x="1.4"
        y="1.4"
        width="2.2"
        height="2.2"
        fill="rgba(132,14,12,0.65)"
      />
      <circle cx="17" cy="2" r="1.2" fill="rgba(132,14,12,0.55)" />
      <circle cx="2" cy="17" r="1.2" fill="rgba(132,14,12,0.55)" />
      <circle
        cx="9"
        cy="9"
        r="2.8"
        stroke="rgba(200,160,96,0.3)"
        strokeWidth="0.6"
      />
      <ellipse cx="9" cy="9" rx="1.1" ry="2.2" fill="rgba(200,160,96,0.32)" />
      <ellipse cx="9" cy="9" rx="2.2" ry="1.1" fill="rgba(200,160,96,0.32)" />
      <circle cx="9" cy="9" r="1" fill="rgba(200,160,96,0.55)" />
    </svg>
  );
}

// ── Menu card — horizontal list view ────
function MenuCard({ item }: { item: MenuItem }) {
  return (
    <div
      className="flex flex-row items-center gap-4 py-4 md:py-5 w-full"
      style={{
        borderBottom: "1px solid rgba(221,214,203,0.4)",
        background: "transparent",
      }}
    >
      {item.image ? (
        <div
          className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden shrink-0 shadow-sm"
          style={{ border: "2px solid rgba(221,214,203,0.3)" }}
        >
          <img
            src={item.image}
            srcSet={item.imageSrcSet || undefined}
            sizes="96px"
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            width={96}
            height={96}
          />
        </div>
      ) : (
        <div
          className="menu-card__fallback w-20 h-20 md:w-24 md:h-24 rounded-full shrink-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <CategoryFallbackIcon category={item.category} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2 mb-1 md:mb-1.5">
          <h4
            className="menu-card__name text-base md:text-lg font-medium leading-snug text-foreground"
            style={{ fontFamily: "Philosopher, serif" }}
          >
            {item.name}
          </h4>
          <span
            className="pt-0.5 text-sm md:text-base font-semibold whitespace-nowrap shrink-0 tabular-nums"
            style={{ color: "#8C1513", fontFamily: "Lora, serif" }}
          >
            {item.price}
          </span>
        </div>
        {item.ingredients && (
          <p
            className="text-xs md:text-sm leading-snug italic truncate"
            style={{ color: "#75665E", fontFamily: "Lora, serif" }}
          >
            {item.ingredients}
          </p>
        )}
        {item.fact && (
          <p
            className="text-[10px] md:text-[11px] leading-relaxed mt-1.5 hidden sm:block"
            style={{ color: "#9A8878", fontFamily: "Lora, serif" }}
          >
            {item.fact}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Book menu — single item row ───────────────────────────────────────
const bookNamesSr: Record<string, string> = {
  Espresso: "Еспресо",
  Doppio: "Дупли еспресо",
  Ristretto: "Ристрето",
  Lungo: "Лунго",
  Americano: "Американо",
  Cappuccino: "Капућино",
  "Caffè Latte": "Кафе лате",
  "Flat White": "Флет вајт",
  Macchiato: "Макијато",
  Cortado: "Кортадо",
  "Moscow Raf": "Московски раф",
  "Pine Nut Latte": "Лате са пињолима",
  "Spiced Mocha": "Зачињена мока",
  "Rose Cardamom Latte": "Лате са ружом и кардамомом",
  "Honey Cinnamon Latte": "Лате са медом и циметом",
  "Lavender Fog": "Лавандин облак",
  "Salted Caramel Raf": "Раф са сланом карамелом",
  "Vienna Coffee": "Бечка кафа",
  "Pistachio Raf": "Раф са пистаћима",
  "Tsarina's Latte": "Царичин лате",
  "Imperial Black Tea": "Царски црни чај",
  "Samovar Chai": "Самовар чај",
  "Siberian Berry Tea": "Сибирски чај од бобица",
  "Jasmine Green": "Зелени чај са јасмином",
  "Camomile & Honey": "Камилица и мед",
  "Crimson Berry Infusion": "Инфузија црвених бобица",
  "Mint Sencha": "Сенча са ментом",
  "White Peony": "Бијели божур",
  "Rose Hip & Ginger": "Шипак и ђумбир",
  "Earl Grey Royal": "Краљевски ерл греј",
  "Cold Brew": "Хладно екстрахована кафа",
  "Iced Raf": "Ледени раф",
  "Iced Lavender Latte": "Ледени лате са лавандом",
  "Matcha Lemonade": "Мача лимунада",
  "Sparkling Elderflower": "Газирана базга",
  "Cold Brew Tonic": "Тоник са хладно екстрахованом кафом",
  "Iced Matcha": "Ледена мача",
  "Watermelon Mint": "Лубеница и мента",
  "Yuzu Lemonade": "Јузу лимунада",
  "Cold Brew Float": "Хладно екстрахована кафа са сладоледом",
  "Dark Chocolate Pot": "Тамна топла чоколада",
  "White Choco Raspberry": "Бијела чоколада и малина",
  "Golden Milk": "Златно млијеко",
  "Aztec Spiced Cacao": "Астечки зачињени какао",
  "Praline Velvet": "Свилени пралине",
  "Babuška Special": "Бабушка специјалитет",
  "Tsar's Blend": "Царска мјешавина",
  "Kremlin Elixir": "Кремљински еликсир",
  "Saffron Raf": "Раф са шафраном",
  "Fresh Lemonade": "Свјежа лимунада",
  "Ginger Lemon Fizz": "Лимунада са ђумбиром",
};

const bookNamesRu: Record<string, string> = {
  Espresso: "Эспрессо",
  Doppio: "Доппио",
  Ristretto: "Ристретто",
  Lungo: "Лунго",
  Americano: "Американо",
  Cappuccino: "Капучино",
  "Caffè Latte": "Кофе латте",
  "Flat White": "Флэт уайт",
  Macchiato: "Макиато",
  Cortado: "Кортадо",
  "Moscow Raf": "Московский раф",
  "Pine Nut Latte": "Латте с кедровым орехом",
  "Spiced Mocha": "Пряный мокко",
  "Rose Cardamom Latte": "Латте с розой и кардамоном",
  "Honey Cinnamon Latte": "Латте с мёдом и корицей",
  "Lavender Fog": "Лавандовый туман",
  "Salted Caramel Raf": "Раф с солёной карамелью",
  "Vienna Coffee": "Кофе по-венски",
  "Pistachio Raf": "Фисташковый раф",
  "Tsarina's Latte": "Латте «Царица»",
  "Imperial Black Tea": "Императорский чёрный чай",
  "Samovar Chai": "Самоварный чай",
  "Siberian Berry Tea": "Сибирский ягодный чай",
  "Jasmine Green": "Зелёный чай с жасмином",
  "Camomile & Honey": "Ромашка с мёдом",
  "Crimson Berry Infusion": "Настой красных ягод",
  "Mint Sencha": "Сенча с мятой",
  "White Peony": "Белый пион",
  "Rose Hip & Ginger": "Шиповник с имбирём",
  "Earl Grey Royal": "Королевский эрл грей",
  "Cold Brew": "Колд брю",
  "Iced Raf": "Холодный раф",
  "Iced Lavender Latte": "Холодный лавандовый латте",
  "Matcha Lemonade": "Лимонад с матча",
  "Sparkling Elderflower": "Газированный напиток с бузиной",
  "Cold Brew Tonic": "Колд брю с тоником",
  "Iced Matcha": "Холодная матча",
  "Watermelon Mint": "Арбуз с мятой",
  "Yuzu Lemonade": "Лимонад с юдзу",
  "Cold Brew Float": "Колд брю с мороженым",
  "Dark Chocolate Pot": "Горячий тёмный шоколад",
  "White Choco Raspberry": "Белый шоколад с малиной",
  "Golden Milk": "Золотое молоко",
  "Aztec Spiced Cacao": "Пряное какао по-ацтекски",
  "Praline Velvet": "Бархатное пралине",
  "Babuška Special": "Фирменный напиток «Бабушка»",
  "Tsar's Blend": "Царская смесь",
  "Kremlin Elixir": "Кремлёвский эликсир",
  "Saffron Raf": "Раф с шафраном",
  "Fresh Lemonade": "Свежий лимонад",
  "Ginger Lemon Fizz": "Имбирно-лимонный физз",
};

function BookItem({ item }: { item: BookDrink }) {
  const lang = React.useContext(LangContext);
  const catLabel = T[lang].book_cat[item.category] ?? item.category;
  const name =
    lang === "sr"
      ? (bookNamesSr[item.name] ?? item.name)
      : lang === "ru"
        ? (bookNamesRu[item.name] ?? bookNamesSr[item.name] ?? item.name)
        : item.name;
  return (
    <div
      data-book-item
      style={{
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        paddingBottom: "10px",
        borderBottom: "1px dotted rgba(139,94,60,0.18)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
        <span
          style={{
            fontFamily: "Philosopher, serif",
            fontSize: "13px",
            color: "#1E0E04",
            lineHeight: 1.3,
            flex: "0 1 auto",
            whiteSpace: "nowrap",
            maxWidth: "65%",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </span>
        <span
          style={{
            flex: 1,
            borderBottom: "1px dotted rgba(139,94,60,0.28)",
            marginBottom: "3px",
            minWidth: "8px",
          }}
        />
        <span
          style={{
            fontFamily: "Lora, serif",
            fontSize: "11.5px",
            color: "#8C1513",
            fontWeight: 600,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {item.price}
        </span>
      </div>
      <p
        style={{
          fontFamily: "Lora, serif",
          fontSize: "9px",
          color: "#9A7830",
          fontStyle: "italic",
          margin: "2px 0 0",
          letterSpacing: "0.05em",
        }}
      >
        {catLabel}
      </p>
    </div>
  );
}

// ── Book-style menu — 3D page flip, white ornamental pages ──
function BookMenu({ drinks }: { drinks: BookDrink[] }) {
  const lang = React.useContext(LangContext);
  const t = T[lang];
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [scale, setScale] = useState(1);

  // Desktop state
  const [spread, setSpread] = useState(0);
  const [flip, setFlip] = useState<{
    dir: "next" | "prev";
    fromSpread: number;
  } | null>(null);

  // Mobile state
  const [mobilePage, setMobilePage] = useState(0);
  const [mobileFlip, setMobileFlip] = useState<{
    dir: "next" | "prev";
    fromPage: number;
  } | null>(null);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    const compute = () => {
      if (!wrapperRef.current) return;
      const w = wrapperRef.current.clientWidth;
      setIsMobile(w < 640);
      setScale(Math.min(1, w / 816));
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setSpread(0);
    setMobilePage(0);
    setFlip(null);
    setMobileFlip(null);
  }, [drinks]);

  const itemsPerSpread = BOOK_ITEMS_PER_PAGE * 2;
  const total = Math.max(1, Math.ceil(drinks.length / itemsPerSpread));
  const getL = (s: number) =>
    drinks.slice(s * itemsPerSpread, s * itemsPerSpread + BOOK_ITEMS_PER_PAGE);
  const getR = (s: number) =>
    drinks.slice(
      s * itemsPerSpread + BOOK_ITEMS_PER_PAGE,
      (s + 1) * itemsPerSpread,
    );
  const totalMobilePages = Math.max(
    1,
    Math.ceil(drinks.length / BOOK_ITEMS_PER_PAGE),
  );
  const getMobilePg = (p: number) =>
    drinks.slice(p * BOOK_ITEMS_PER_PAGE, (p + 1) * BOOK_ITEMS_PER_PAGE);

  const go = (dir: "next" | "prev") => {
    if (flip) return;
    const to = dir === "next" ? spread + 1 : spread - 1;
    if (to < 0 || to >= total) return;
    setFlip({ dir, fromSpread: spread });
    setTimeout(() => {
      setSpread(to);
      setFlip(null);
    }, 900);
  };

  const goMobile = (dir: "next" | "prev") => {
    if (mobileFlip) return;
    const to = dir === "next" ? mobilePage + 1 : mobilePage - 1;
    if (to < 0 || to >= totalMobilePages) return;
    setMobileFlip({ dir, fromPage: mobilePage });
    setTimeout(() => {
      setMobilePage(to);
      setMobileFlip(null);
    }, 900);
  };

  const PAGE_BG = "#FEFCF8";
  const BOOK_W = 800,
    BOOK_H = 480;
  const MOBILE_BOOK_H = "clamp(470px, 125vw, 510px)";

  // Inline page renderer (function call, not component, to avoid remounting)
  const renderPage = (
    items: BookDrink[],
    pageNum: number,
    isRight: boolean,
    extraStyle?: React.CSSProperties,
  ) => (
    <div
      data-book-page
      style={{
        flex: 1,
        height: "100%",
        boxSizing: "border-box",
        padding: "26px 26px 18px",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        background: PAGE_BG,
        overflow: "hidden",
        ...extraStyle,
      }}
    >
      <BookPageCorner pos={isRight ? "tr" : "tl"} />
      <BookPageCorner pos={isRight ? "br" : "bl"} />
      <div
        style={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <p
          style={{
            fontFamily: "Lora, serif",
            fontSize: "7.5px",
            color: "#9A7830",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            fontStyle: "italic",
            textAlign: "center",
            margin: "0 0 3px",
          }}
        >
          {t.book_running_head}
        </p>
        <p
          style={{
            fontFamily: "Lora, serif",
            fontSize: "8px",
            color: "rgba(154,120,48,0.38)",
            fontStyle: "italic",
            textAlign: isRight ? "right" : "left",
            margin: "0 0 14px",
          }}
        >
          {pageNum}
        </p>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateRows: `repeat(${BOOK_ITEMS_PER_PAGE}, minmax(0, 1fr))`,
          }}
        >
          {createBookPageSlots(items).map((item, index) =>
            item ? (
              <BookItem key={`${pageNum}-${index}-${item.name}`} item={item} />
            ) : (
              <div key={`${pageNum}-empty-${index}`} aria-hidden="true" />
            ),
          )}
        </div>
      </div>
    </div>
  );

  // Compute static backgrounds and flip faces
  const fromSp = flip?.fromSpread ?? spread;
  const toSp = flip ? (flip.dir === "next" ? fromSp + 1 : fromSp - 1) : spread;

  // Static pages (destination spread, shown as background)
  const staticL = flip
    ? flip.dir === "next"
      ? getL(fromSp)
      : getL(toSp)
    : getL(spread);
  const staticLNum = flip
    ? flip.dir === "next"
      ? fromSp * 2 + 1
      : toSp * 2 + 1
    : spread * 2 + 1;
  const staticR = flip
    ? flip.dir === "next"
      ? getR(toSp)
      : getR(fromSp)
    : getR(spread);
  const staticRNum = flip
    ? flip.dir === "next"
      ? toSp * 2 + 2
      : fromSp * 2 + 2
    : spread * 2 + 2;

  // Flip faces
  const flipFrontItems = flip
    ? flip.dir === "next"
      ? getR(fromSp)
      : getL(fromSp)
    : [];
  const flipFrontNum = flip
    ? flip.dir === "next"
      ? fromSp * 2 + 2
      : fromSp * 2 + 1
    : 0;
  const flipFrontIsRight = flip ? flip.dir === "next" : false;
  const flipBackItems = flip
    ? flip.dir === "next"
      ? getL(toSp)
      : getR(toSp)
    : [];
  const flipBackNum = flip
    ? flip.dir === "next"
      ? toSp * 2 + 1
      : toSp * 2 + 2
    : 0;
  const flipBackIsRight = flip ? flip.dir === "prev" : false;

  // Mobile faces
  const mobileFromPg = mobileFlip?.fromPage ?? mobilePage;
  const mobileToPg = mobileFlip
    ? mobileFlip.dir === "next"
      ? mobileFromPg + 1
      : mobileFromPg - 1
    : mobilePage;

  const renderMobilePage = (page: number, extraStyle?: React.CSSProperties) => (
    <div
      data-book-page
      style={{
        padding: "30px 26px 22px",
        height: MOBILE_BOOK_H,
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: PAGE_BG,
        ...extraStyle,
      }}
    >
      {(["tl", "tr", "bl", "br"] as const).map((pos) => (
        <BookPageCorner key={pos} pos={pos} />
      ))}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <p
          style={{
            fontFamily: "Lora, serif",
            fontSize: "10px",
            color: "#9A7830",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            textAlign: "center",
            margin: "0 0 20px",
          }}
        >
          {t.book_running_head}
        </p>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateRows: `repeat(${BOOK_ITEMS_PER_PAGE}, minmax(0, 1fr))`,
          }}
        >
          {createBookPageSlots(getMobilePg(page)).map((item, index) =>
            item ? (
              <div
                key={`${page}-${index}-${item.name}`}
                data-book-item
                style={{
                  minHeight: 0,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "Philosopher, serif",
                      fontSize: "17px",
                      color: "#1A0D08",
                      lineHeight: 1.2,
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                      overflow: "hidden",
                    }}
                  >
                    {item.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "Lora, serif",
                      fontSize: "15px",
                      color: "#8C1513",
                      flexShrink: 0,
                    }}
                  >
                    {item.price}
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: "Lora, serif",
                    fontSize: "11px",
                    color: "#75665E",
                    fontStyle: "italic",
                    margin: "3px 0 0",
                  }}
                >
                  {t.book_cat[item.category] ?? item.category}
                </p>
              </div>
            ) : (
              <div key={`${page}-empty-${index}`} aria-hidden="true" />
            ),
          )}
        </div>
        <div style={{ textAlign: "center", paddingTop: "12px" }}>
          <p
            style={{
              fontFamily: "Lora, serif",
              fontSize: "11px",
              color: "#9A7830",
              margin: 0,
              fontStyle: "italic",
            }}
          >
            {page + 1}
          </p>
        </div>
      </div>
    </div>
  );

  // ── Mobile: 3D page flip on swipe ───────────────────────────────────
  if (isMobile) {
    const handleTouchStart = (e: React.TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchEndX.current = e.touches[0].clientX;
    };
    const handleTouchMove = (e: React.TouchEvent) => {
      touchEndX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = () => {
      if (touchStartX.current === null || touchEndX.current === null) return;
      const diff = touchStartX.current - touchEndX.current;
      if (diff > 40 && mobilePage < totalMobilePages - 1) goMobile("next");
      else if (diff < -40 && mobilePage > 0) goMobile("prev");
      touchStartX.current = null;
      touchEndX.current = null;
    };

    return (
      <div
        ref={wrapperRef}
        data-testid="dynamic-book-menu"
        style={{ width: "100%" }}
      >
        <div
          data-book-frame
          style={{
            position: "relative",
            boxShadow:
              "0 14px 44px rgba(26,13,8,0.2), 0 0 0 1px rgba(200,160,96,0.18)",
            overflow: "hidden",
            perspective: "1400px",
          }}
        >
          {/* Background: destination page */}
          <div style={{ position: "absolute", inset: 0 }}>
            {renderMobilePage(mobileToPg)}
          </div>

          {/* 3D flip overlay — current page rotates away */}
          {mobileFlip ? (
            <div
              style={{
                position: "relative",
                zIndex: 5,
                transformStyle: "preserve-3d",
                transformOrigin:
                  mobileFlip.dir === "next" ? "left center" : "right center",
                animation: `mobileFlip${mobileFlip.dir === "next" ? "Next" : "Prev"} 0.9s cubic-bezier(0.45,0,0.2,1) forwards`,
              }}
            >
              {/* Front face */}
              <div
                style={{
                  position: "relative",
                  backfaceVisibility: "hidden",
                  overflow: "hidden",
                }}
              >
                {renderMobilePage(mobileFromPg)}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background:
                      mobileFlip.dir === "next"
                        ? "linear-gradient(to left, rgba(0,0,0,0.22) 0%, transparent 45%)"
                        : "linear-gradient(to right, rgba(0,0,0,0.22) 0%, transparent 45%)",
                    animation: "flipShadowIn 0.9s ease both",
                  }}
                />
              </div>
              {/* Back face — thin paper bleed-through */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  background: PAGE_BG,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    transform: "scaleX(-1)",
                    opacity: 0.09,
                    filter: "blur(0.8px)",
                    pointerEvents: "none",
                  }}
                >
                  {renderMobilePage(mobileFromPg)}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ position: "relative", zIndex: 5 }}>
              {renderMobilePage(mobilePage)}
            </div>
          )}

          {/* Touch / click zones */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              zIndex: 20,
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              style={{
                flex: 1,
                cursor: mobilePage > 0 && !mobileFlip ? "pointer" : "default",
              }}
              onClick={() => {
                if (!mobileFlip && mobilePage > 0) goMobile("prev");
              }}
            />
            <div
              style={{
                flex: 1,
                cursor:
                  mobilePage < totalMobilePages - 1 && !mobileFlip
                    ? "pointer"
                    : "default",
              }}
              onClick={() => {
                if (!mobileFlip && mobilePage < totalMobilePages - 1)
                  goMobile("next");
              }}
            />
          </div>
        </div>

        {/* Nav */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            marginTop: "20px",
          }}
        >
          <button
            onClick={() => goMobile("prev")}
            disabled={mobilePage === 0 || !!mobileFlip}
            style={{
              border: "none",
              background: "none",
              cursor: mobilePage === 0 ? "default" : "pointer",
              color: mobilePage === 0 ? "rgba(124,106,92,0.25)" : "#75665E",
              padding: "8px",
              fontFamily: "Lora, serif",
              fontSize: "10px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <svg width="14" height="9" viewBox="0 0 14 9" fill="none">
              <path
                d="M13 4.5H1M5 1L1 4.5L5 8"
                stroke="currentColor"
                strokeWidth="1.15"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div
            style={{
              display: "flex",
              gap: "5px",
              flexWrap: "wrap",
              justifyContent: "center",
              maxWidth: "220px",
            }}
          >
            {Array.from({ length: totalMobilePages }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === mobilePage ? "18px" : "5px",
                  height: "5px",
                  borderRadius: "3px",
                  background:
                    i === mobilePage ? "#8C1513" : "rgba(132,14,12,0.2)",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>
          <button
            onClick={() => goMobile("next")}
            disabled={mobilePage === totalMobilePages - 1 || !!mobileFlip}
            style={{
              border: "none",
              background: "none",
              cursor:
                mobilePage === totalMobilePages - 1 ? "default" : "pointer",
              color:
                mobilePage === totalMobilePages - 1
                  ? "rgba(124,106,92,0.25)"
                  : "#75665E",
              padding: "8px",
            }}
          >
            <svg width="14" height="9" viewBox="0 0 14 9" fill="none">
              <path
                d="M1 4.5H13M9 1L13 4.5L9 8"
                stroke="currentColor"
                strokeWidth="1.15"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // ── Desktop: 3D book spread with click zones ─────────────────────────
  return (
    <div data-testid="dynamic-book-menu">
      <div ref={wrapperRef} style={{ width: "100%" }}>
        <div
          data-book-frame
          style={{ height: BOOK_H * scale, position: "relative" }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: `translateX(-50%) scale(${scale})`,
              transformOrigin: "top center",
              width: BOOK_W,
              height: BOOK_H,
            }}
          >
            <div
              style={{ perspective: "2400px", width: "100%", height: "100%" }}
            >
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  width: BOOK_W,
                  height: BOOK_H,
                  boxShadow:
                    "0 24px 64px rgba(26,13,8,0.24), 0 6px 18px rgba(26,13,8,0.12), 0 0 0 1px rgba(200,160,96,0.2)",
                }}
              >
                {/* Static left page */}
                {renderPage(staticL, staticLNum, false)}

                {/* Spine */}
                <div
                  style={{
                    width: "14px",
                    flexShrink: 0,
                    zIndex: 2,
                    background:
                      "linear-gradient(90deg, rgba(40,18,4,0.38) 0%, rgba(200,160,96,0.3) 50%, rgba(40,18,4,0.38) 100%)",
                    boxShadow:
                      "inset -2px 0 8px rgba(0,0,0,0.1), inset 2px 0 8px rgba(0,0,0,0.1)",
                  }}
                />

                {/* Static right page */}
                {renderPage(staticR, staticRNum, true)}

                {/* 3D flip element — covers one half, rotates around spine */}
                {flip && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      zIndex: 10,
                      ...(flip.dir === "next"
                        ? {
                            left: "calc(50% + 7px)",
                            right: 0,
                            transformOrigin: "left center",
                          }
                        : {
                            left: 0,
                            right: "calc(50% + 7px)",
                            transformOrigin: "right center",
                          }),
                      transformStyle: "preserve-3d",
                      animation: `pageFlip${flip.dir === "next" ? "Next" : "Prev"} 0.9s cubic-bezier(0.42,0,0.28,1) forwards`,
                    }}
                  >
                    {/* Front face */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        backfaceVisibility: "hidden",
                        overflow: "hidden",
                        boxShadow:
                          flip.dir === "next"
                            ? "-8px 0 24px rgba(0,0,0,0.2)"
                            : "8px 0 24px rgba(0,0,0,0.2)",
                      }}
                    >
                      {renderPage(
                        flipFrontItems,
                        flipFrontNum,
                        flipFrontIsRight,
                        { flex: "none", width: "100%", height: "100%" },
                      )}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          pointerEvents: "none",
                          background:
                            flip.dir === "next"
                              ? "linear-gradient(to left, rgba(0,0,0,0.12) 0%, transparent 65%)"
                              : "linear-gradient(to right, rgba(0,0,0,0.12) 0%, transparent 65%)",
                          animation: "flipShadowIn 0.9s ease both",
                        }}
                      />
                    </div>
                    {/* Back face */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                        overflow: "hidden",
                      }}
                    >
                      {renderPage(flipBackItems, flipBackNum, flipBackIsRight, {
                        flex: "none",
                        width: "100%",
                        height: "100%",
                      })}
                    </div>
                  </div>
                )}

                {/* Clickable zones — left half = prev, right half = next */}
                {!flip && (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: "calc(50% - 7px)",
                        cursor: spread > 0 ? "w-resize" : "default",
                        zIndex: 8,
                      }}
                      onClick={() => go("prev")}
                    />
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: "calc(50% - 7px)",
                        cursor: spread < total - 1 ? "e-resize" : "default",
                        zIndex: 8,
                      }}
                      onClick={() => go("next")}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px",
          marginTop: "22px",
        }}
      >
        <button
          onClick={() => go("prev")}
          disabled={spread === 0 || !!flip}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            fontFamily: "Lora, serif",
            fontSize: "10.5px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: spread === 0 ? "rgba(124,106,92,0.25)" : "#75665E",
            cursor: spread === 0 || !!flip ? "default" : "pointer",
            border: "none",
            background: "none",
            padding: "8px 10px",
            transition: "color 0.2s",
          }}
        >
          <svg width="14" height="9" viewBox="0 0 14 9" fill="none">
            <path
              d="M13 4.5H1M5 1L1 4.5L5 8"
              stroke="currentColor"
              strokeWidth="1.15"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t.book_prev}
        </button>
        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === spread ? "20px" : "6px",
                height: "6px",
                borderRadius: "3px",
                background: i === spread ? "#8C1513" : "rgba(132,14,12,0.2)",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
        <button
          onClick={() => go("next")}
          disabled={spread === total - 1 || !!flip}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            fontFamily: "Lora, serif",
            fontSize: "10.5px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: spread === total - 1 ? "rgba(124,106,92,0.25)" : "#75665E",
            cursor: spread === total - 1 || !!flip ? "default" : "pointer",
            border: "none",
            background: "none",
            padding: "8px 10px",
            transition: "color 0.2s",
          }}
        >
          {t.book_next}
          <svg width="14" height="9" viewBox="0 0 14 9" fill="none">
            <path
              d="M1 4.5H13M9 1L13 4.5L9 8"
              stroke="currentColor"
              strokeWidth="1.15"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Main app ─────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/admin"
        element={
          <React.Suspense
            fallback={
              <div className="admin-login">Учитавање администрације…</div>
            }
          >
            <Admin />
          </React.Suspense>
        }
      />
    </Routes>
  );
}

function LandingPage() {
  const [lang, setLang] = useState<Lang>("sr");
  const t = T[lang];
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    instagram: "",
    facebook: "",
    tiktok: "",
  });
  const [adminItems, setAdminItems] = useState<AdminMenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [siteSettings, setSiteSettings] =
    useState<SiteSettings>(emptySiteSettings);
  const [adminGalleryItems, setAdminGalleryItems] = useState<
    AdminGalleryItem[]
  >([]);
  const [stories, setStories] = useState<AdminStoryItem[]>([]);
  const [storyViewerIndex, setStoryViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.lang = { sr: "sr-Cyrl", en: "en", ru: "ru" }[
      lang
    ];
  }, [lang]);

  useEffect(() => {
    let mounted = true;
    const applySnapshot = (snapshot: PublicContentSnapshot) => {
      setSiteSettings(snapshot.settings);
      setSocialLinks({
        instagram: snapshot.settings.instagram,
        facebook: snapshot.settings.facebook,
        tiktok: snapshot.settings.tiktok,
      });
      setMenuCategories(snapshot.categories);
      setAdminItems(snapshot.items);
      setAdminGalleryItems(snapshot.gallery);
      setStories(snapshot.stories);
    };

    const cached = readPublicContentCache();
    if (cached) applySnapshot(cached);
    if (publicSupabaseConfig) {
      void fetchPublicContent(publicSupabaseConfig)
        .then((snapshot) => {
          if (!mounted) return;
          applySnapshot(snapshot);
          writePublicContentCache(snapshot);
        })
        .catch(() => {
          // Cached content or built-in copy remains visible when the backend is offline.
        });
    }
    return () => {
      mounted = false;
    };
  }, []);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<number | null>(null);
  const localizedCategories = useMemo(
    () => localizeCategories(menuCategories, lang),
    [menuCategories, lang],
  );
  const localizedItems = useMemo(
    () => localizeMenuItems(adminItems, lang),
    [adminItems, lang],
  );

  useEffect(() => {
    const firstCategory = localizedCategories[0]?.id ?? null;
    if (!firstCategory) {
      setActiveCategory(null);
      return;
    }
    if (
      !localizedCategories.some((category) => category.id === activeCategory)
    ) {
      setActiveCategory(firstCategory);
    }
  }, [localizedCategories, activeCategory]);

  const visibleItems: MenuItem[] = localizedItems
    .filter((item) => item.categoryId === activeCategory)
    .map((item) => ({
      category:
        localizedCategories.find((category) => category.id === item.categoryId)
          ?.name ?? "",
      name: item.name,
      price: item.price,
      image: item.image,
      imageSrcSet: mediaSrcSet(item.imageVariants),
      ingredients: item.description,
      fact: item.fact,
    }));

  const dynamicBookDrinks = useMemo<BookDrink[]>(
    () =>
      localizedCategories.flatMap((category) =>
        localizedItems
          .filter((item) => item.categoryId === category.id)
          .map((item) => ({
            name: item.name,
            price: item.price,
            category: category.name,
          })),
      ),
    [localizedItems, localizedCategories],
  );
  const bookMenuDrinks = publicSupabaseConfig ? dynamicBookDrinks : bookDrinks;
  const settingText = (
    sr: string,
    en: string,
    ru: string,
    fallback: string,
  ) => localizedText(sr, en, ru, lang) ?? fallback;
  const pageContent = {
    heroTitle:
      settingText(
        siteSettings.heroTitleSr,
        siteSettings.heroTitleEn,
        siteSettings.heroTitleRu,
        t.hero_title,
      ),
    heroDescription:
      settingText(
        siteSettings.heroDescriptionSr,
        siteSettings.heroDescriptionEn,
        siteSettings.heroDescriptionRu,
        t.hero_sub,
      ),
    heroCta:
      settingText(siteSettings.heroCtaSr, siteSettings.heroCtaEn, siteSettings.heroCtaRu, t.hero_cta),
    footerAddressHeading:
      settingText(siteSettings.footerAddressHeadingSr, siteSettings.footerAddressHeadingEn, siteSettings.footerAddressHeadingRu, t.footer_addr_heading),
    footerAddressLine1:
      settingText(siteSettings.footerAddressLine1Sr, siteSettings.footerAddressLine1En, siteSettings.footerAddressLine1Ru, t.footer_addr_1),
    footerAddressLine2:
      settingText(siteSettings.footerAddressLine2Sr, siteSettings.footerAddressLine2En, siteSettings.footerAddressLine2Ru, t.footer_addr_2),
    footerAddressLine3:
      settingText(siteSettings.footerAddressLine3Sr, siteSettings.footerAddressLine3En, siteSettings.footerAddressLine3Ru, t.footer_addr_3),
    footerHoursHeading:
      settingText(siteSettings.footerHoursHeadingSr, siteSettings.footerHoursHeadingEn, siteSettings.footerHoursHeadingRu, t.footer_hours_heading),
    footerHoursLine1:
      settingText(siteSettings.footerHoursLine1Sr, siteSettings.footerHoursLine1En, siteSettings.footerHoursLine1Ru, t.footer_h1),
    footerHoursLine2:
      settingText(siteSettings.footerHoursLine2Sr, siteSettings.footerHoursLine2En, siteSettings.footerHoursLine2Ru, t.footer_h2),
    footerHoursLine3:
      settingText(siteSettings.footerHoursLine3Sr, siteSettings.footerHoursLine3En, siteSettings.footerHoursLine3Ru, t.footer_h3),
    footerContactHeading:
      settingText(siteSettings.footerContactHeadingSr, siteSettings.footerContactHeadingEn, siteSettings.footerContactHeadingRu, t.footer_contact_heading),
    footerCopyright:
      settingText(siteSettings.footerCopyrightSr, siteSettings.footerCopyrightEn, siteSettings.footerCopyrightRu, t.footer_copyright),
    phone: siteSettings.phone || "+387 65 000 000",
    email: siteSettings.email || "hello@cafebabuska.ba",
    socialHandle: siteSettings.socialHandle || "@cafebabuska",
  };
  const publicGallery: {
    src: string;
    alt: string;
    srcSet?: string;
  }[] = publicSupabaseConfig
    ? adminGalleryItems.flatMap((item) => {
        const alt = localizedText(item.altSr, item.altEn, item.altRu, lang);
        return item.image && alt
          ? [{ src: item.image, alt, srcSet: mediaSrcSet(item.imageVariants) }]
          : [];
      })
    : galleryImages.map((item) => ({
        src: item.src,
        alt: localizedText(item.altSr, item.altEn, item.altRu, lang) ?? item.altSr,
    }));
  const activeStories = stories.filter(
    (story) => Date.parse(story.expiresAt) > Date.now() && story.isPublished,
  );
  const firstStoryDescription = activeStories[0]
    ? localizedText(
        activeStories[0].descriptionSr,
        activeStories[0].descriptionEn,
        activeStories[0].descriptionRu,
        lang,
        true,
      ) ?? PUBLIC_COPY[lang].stories
    : PUBLIC_COPY[lang].stories;
  const stableHeroSources = [640, 1280, 1920]
    .map((width) => ({
      width,
      url: publicMediaUrl(`hero/current-${width}.webp`),
    }))
    .filter((source) => source.url);
  const configuredHeroSources = Object.values(
    siteSettings.heroImageVariants,
  ).sort((left, right) => left.width - right.width);
  const hasConfiguredHero = Boolean(
    siteSettings.heroImage || configuredHeroSources.length,
  );
  const initialHeroSources = hasConfiguredHero
    ? publicSupabaseConfig
      ? stableHeroSources
      : configuredHeroSources
    : [];
  const [preferLegacyHero, setPreferLegacyHero] = useState(false);
  const heroImage =
    (preferLegacyHero ? siteSettings.heroImage : initialHeroSources.at(-1)?.url) ||
    siteSettings.heroImage ||
    defaultHomeHero;
  const heroSrcSet = preferLegacyHero
    ? ""
    : initialHeroSources
        .map((source) => `${source.url} ${source.width}w`)
        .join(", ");
  const [heroLoad, setHeroLoad] = useState({
    url: heroImage,
    elapsedMs: 0,
    decoded: false,
    failed: !heroImage,
  });
  const heroLoadState = getHeroLoadState(heroLoad);

  useEffect(() => {
    setHeroLoad({
      url: heroImage,
      elapsedMs: 0,
      decoded: false,
      failed: !heroImage,
    });
    if (!heroImage) return;
    const loaderTimer = window.setTimeout(
      () =>
        setHeroLoad((current) =>
          current.url === heroImage
            ? { ...current, elapsedMs: 400 }
            : current,
        ),
      400,
    );
    const fallbackTimer = window.setTimeout(
      () =>
        setHeroLoad((current) =>
          current.url === heroImage
            ? { ...current, elapsedMs: 4_000 }
            : current,
        ),
      4_000,
    );
    return () => {
      window.clearTimeout(loaderTimer);
      window.clearTimeout(fallbackTimer);
    };
  }, [heroImage]);

  useEffect(() => {
    if (lightboxImg !== null && lightboxImg >= publicGallery.length)
      setLightboxImg(null);
  }, [lightboxImg, publicGallery.length]);

  const handleTabClick = (cat: string) => {
    if (cat === activeCategory) return;
    setActiveCategory(cat);
  };

  const scrollToMenu = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document
      .getElementById("menu")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Language switcher button
  const LangSwitch = () => (
    <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
      {(["sr", "en", "ru"] as Lang[]).map((l, i) => (
        <React.Fragment key={l}>
          {i > 0 && (
            <span
              style={{
                color: "rgba(200,160,96,0.5)",
                fontSize: "10px",
                lineHeight: 1,
              }}
            >
              |
            </span>
          )}
          <button
            onClick={() => setLang(l)}
            aria-label={PUBLIC_COPY[l].language}
            style={{
              fontFamily: "Lora, serif",
              fontSize: "10px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: lang === l ? "#8C1513" : "#9A8878",
              fontWeight: lang === l ? 600 : 400,
              border: "none",
              background: "none",
              cursor: "pointer",
              padding: "4px 5px",
              transition: "color 0.2s",
            }}
          >
            {{ sr: "СР", en: "EN", ru: "РУ" }[l]}
          </button>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <LangContext.Provider value={lang}>
      <div className="min-h-screen bg-background cafe-site">
        {/* ═══ HEADER ════════════════════════════════════════════════ */}
        <header
          className="site-header fixed top-0 left-0 right-0 z-50"
          style={{
            background: "rgba(247,242,233,0.94)",
            backdropFilter: "blur(14px)",
            borderBottom: "1px solid rgba(227,215,202,0.75)",
          }}
        >
          <div className="site-header__inner">
            <a
              className="site-header__brand"
              href="#top"
              aria-label={PUBLIC_COPY[lang].home}
            >
              <img
                src={brandLogo}
                alt="Кафе Бабушка"
                className="h-11 md:h-12 w-auto"
              />
            </a>

            <nav className="site-header__nav hidden md:flex items-center gap-10">
              {t.nav.map((label, i) => (
                <a
                  key={label}
                  href={`#${t.nav_ids[i]}`}
                  className="nav-link text-[11px] uppercase tracking-[0.18em] transition-colors duration-200"
                  style={{ color: "#75665E", fontFamily: "Lora, serif" }}
                >
                  {label}
                </a>
              ))}
            </nav>

            <div className="site-header__actions hidden md:flex items-center gap-4">
              <LangSwitch />
            </div>

            <div className="site-header__actions md:hidden flex items-center gap-1">
              <LangSwitch />
              <button
                className="site-header__menu-toggle flex flex-col justify-center items-center w-11 h-11 gap-[5px]"
                onClick={() => setMobileNavOpen((v) => !v)}
                aria-label={
                  mobileNavOpen
                    ? PUBLIC_COPY[lang].closeNav
                    : PUBLIC_COPY[lang].openNav
                }
                aria-expanded={mobileNavOpen}
              >
                <span
                  className="block w-6 h-px transition-all duration-300"
                  style={{
                    background: "#8C1513",
                    transform: mobileNavOpen
                      ? "translateY(6px) rotate(45deg)"
                      : "none",
                  }}
                />
                <span
                  className="block w-6 h-px transition-all duration-300"
                  style={{
                    background: "#8C1513",
                    opacity: mobileNavOpen ? 0 : 1,
                  }}
                />
                <span
                  className="block w-6 h-px transition-all duration-300"
                  style={{
                    background: "#8C1513",
                    transform: mobileNavOpen
                      ? "translateY(-6px) rotate(-45deg)"
                      : "none",
                  }}
                />
              </button>
            </div>
          </div>

          <div
            className="md:hidden overflow-hidden transition-all duration-300"
            style={{
              maxHeight: mobileNavOpen ? "200px" : "0",
              borderTop: mobileNavOpen
                ? "1px solid rgba(227,215,202,0.75)"
                : "none",
              background: "rgba(247,242,233,0.98)",
            }}
          >
            <nav className="flex flex-col py-2">
              {t.nav.map((label, i) => (
                <a
                  key={label}
                  href={`#${t.nav_ids[i]}`}
                  className="px-6 py-3.5 text-[11px] uppercase tracking-[0.22em]"
                  style={{ color: "#75665E", fontFamily: "Lora, serif" }}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </header>

        {/* ═══ HERO ══════════════════════════════════════════════════ */}
        <section
          id="top"
          className="site-hero relative flex items-center justify-center overflow-hidden pt-[60px] md:pt-[66px]"
          style={{ background: "#F7F2E9" }}
        >
          <div className="absolute inset-0">
            {heroImage && (
              <picture className="block h-full w-full">
                {heroSrcSet && (
                  <source
                    type="image/webp"
                    srcSet={heroSrcSet}
                    sizes="100vw"
                  />
                )}
                <img
                  src={heroImage}
                  srcSet={heroSrcSet || undefined}
                  sizes={heroSrcSet ? "100vw" : undefined}
                  alt={PUBLIC_COPY[lang].heroAlt}
                  className="site-hero__image h-full w-full object-cover"
                  data-ready={heroLoadState === "ready"}
                  fetchPriority="high"
                  decoding="async"
                  onLoad={(event) => {
                    const image = event.currentTarget;
                    void image
                      .decode()
                      .catch(() => undefined)
                      .finally(() =>
                        setHeroLoad((current) =>
                          current.url === heroImage
                            ? { ...current, decoded: true, failed: false }
                            : current,
                        ),
                      );
                  }}
                  onError={() => {
                    if (heroImage.includes("/hero/current-"))
                      setPreferLegacyHero(true);
                    setHeroLoad((current) =>
                      current.url === heroImage
                        ? { ...current, failed: true }
                        : current,
                    );
                  }}
                  style={{
                    objectPosition: "center center",
                    filter: "sepia(10%) brightness(1.02) saturate(0.88)",
                  }}
                />
              </picture>
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(244,238,228,0.42) 0%, rgba(244,238,228,0.22) 50%, rgba(244,238,228,0.58) 100%)",
              }}
            />
          </div>

          <div className="site-hero__ornament site-hero__ornament--top site-hero__ornament--left">
            <CornerOrnament rotate={0} />
          </div>
          <div className="site-hero__ornament site-hero__ornament--top site-hero__ornament--right">
            <CornerOrnament rotate={90} />
          </div>
          <div className="site-hero__ornament site-hero__ornament--bottom site-hero__ornament--left">
            <CornerOrnament rotate={270} />
          </div>
          <div className="site-hero__ornament site-hero__ornament--bottom site-hero__ornament--right hero-loader-slot">
            {heroLoadState === "loading" ? (
              <HeroLoader
                label={PUBLIC_COPY[lang].heroLoading}
              />
            ) : (
              <CornerOrnament rotate={180} />
            )}
          </div>

          <div className="site-hero__content relative z-10 flex flex-col items-center text-center px-6 max-w-2xl mx-auto">
            <div className="site-hero__wordmark-frame">
              <img
                src={heroWordmark}
                alt="Кафе Бабушка"
                className="site-hero__wordmark"
                style={{ mixBlendMode: "multiply" }}
              />
            </div>
            <h1
              className="site-hero__title text-foreground"
              style={{ fontFamily: "Philosopher, serif" }}
            >
              {pageContent.heroTitle.split("\n").map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i === 0 && <br />}
                </React.Fragment>
              ))}
            </h1>
            <p
              className="site-hero__description"
              style={{
                color: "#75665E",
                fontFamily: "Lora, serif",
                fontStyle: "italic",
              }}
            >
              {pageContent.heroDescription}
            </p>
            {activeStories.length > 0 && (
              <button
                type="button"
                className="site-hero__story"
                aria-label={`${PUBLIC_COPY[lang].openStories}: ${firstStoryDescription}`}
                onClick={() => setStoryViewerIndex(0)}
              >
                <span className="site-hero__story-ring">
                  <img
                    src={activeStories[0].image}
                    srcSet={mediaSrcSet(activeStories[0].imageVariants) || undefined}
                    sizes="72px"
                    alt=""
                  />
                </span>
                <span>{firstStoryDescription}</span>
              </button>
            )}
            <a
              href="#menu"
              className="site-hero__cta inline-block px-9 py-3.5 text-[10px] uppercase tracking-[0.26em] transition-all duration-300"
              style={{
                fontFamily: "Lora, serif",
                color: "#fff",
                background: "#8C1513",
                border: "0",
                boxShadow: "0 10px 24px rgba(140,21,19,0.2)",
              }}
              onClick={scrollToMenu}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "#68100F";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "#8C1513";
              }}
            >
              {pageContent.heroCta}
            </a>
          </div>
        </section>

        {/* ═══ MENU — card grid ══════════════════════════════════════ */}
        <section id="menu" className="site-section bg-background">
          <div className="site-container">
            <div className="site-section-heading">
              <h2>{t.menu_heading}</h2>
            </div>

            {/* ── Category filter — seamless text links ── */}
            <div className="flex flex-wrap justify-center gap-6 mb-12 max-w-xl mx-auto">
              {localizedCategories.map((category) => {
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => handleTabClick(category.id)}
                    className="transition-colors duration-300"
                    style={{
                      border: "none",
                      background: "transparent",
                      color: isActive ? "#8C1513" : "#9A8878",
                      fontFamily: "Lora, serif",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.color =
                          "#8C1513";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.color =
                          "#9A8878";
                      }
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        borderBottom: isActive
                          ? "1px solid #8C1513"
                          : "1px solid transparent",
                        paddingBottom: "4px",
                      }}
                    >
                      {category.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 lg:gap-x-16 w-full max-w-6xl mx-auto">
              {visibleItems.map((item) => (
                <MenuCard key={item.name} item={item} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══ MENU — book view (comparison) ════════════════════════ */}
        <section className="site-section site-section--book bg-background">
          <div className="site-container site-container--book">
            <div className="site-section-heading">
              <h2>{t.book_heading}</h2>
            </div>
            <DeferredSection minHeight="650px">
              <BookMenu drinks={bookMenuDrinks} />
            </DeferredSection>
          </div>
        </section>

        {/* ═══ GALLERY ═══════════════════════════════════════════════ */}
        <section
          id="gallery"
          className="site-section site-section--divided bg-background"
        >
          <div className="site-container">
            <div className="site-section-heading">
              <h2>{t.gallery_heading}</h2>
            </div>
            <DeferredSection minHeight="680px">
              <div className="gallery-grid">
                {publicGallery.map((img, i) => (
                  <div
                    key={i}
                    className="gallery-grid__item overflow-hidden group relative cursor-pointer"
                    onClick={() => setLightboxImg(i)}
                  >
                    <img
                      src={img.src}
                      srcSet={img.srcSet || undefined}
                      sizes="(min-width: 768px) 33vw, 50vw"
                      alt={img.alt}
                      className="gallery-grid__image block w-full h-auto transition-opacity duration-300 ease-out group-hover:opacity-90"
                      style={{ filter: "sepia(8%) brightness(0.96)" }}
                      loading="lazy"
                      decoding="async"
                      width={640}
                      height={440}
                    />
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: "rgba(132,14,12,0.06)" }}
                    />
                  </div>
                ))}
              </div>
            </DeferredSection>
          </div>
        </section>

        {/* ═══ FOOTER ════════════════════════════════════════════════ */}
        <footer
          id="visit"
          className="site-section site-section--divided bg-background"
        >
          <div className="site-container">
            <div className="site-footer-grid mb-16">
              <div className="flex-1">
                <h3
                  className="text-xl mb-4 text-foreground"
                  style={{ fontFamily: "Philosopher, serif" }}
                >
                  {pageContent.footerAddressHeading}
                </h3>
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: "#75665E", fontFamily: "Lora, serif" }}
                >
                  <p>{pageContent.footerAddressLine1}</p>
                  <p>{pageContent.footerAddressLine2}</p>
                  <p>{pageContent.footerAddressLine3}</p>
                </div>
              </div>

              <div className="site-footer-logo">
                <img
                  src={brandLogo}
                  alt="Кафе Бабушка"
                  className="w-24 md:w-28 opacity-95"
                  style={{
                    height: "auto",
                    filter: "drop-shadow(0 6px 20px rgba(140,21,19,0.14))",
                  }}
                />
              </div>

              <div>
                <h3
                  className="text-xl mb-4 text-foreground"
                  style={{ fontFamily: "Philosopher, serif" }}
                >
                  {pageContent.footerHoursHeading}
                </h3>
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: "#75665E", fontFamily: "Lora, serif" }}
                >
                  <p>{pageContent.footerHoursLine1}</p>
                  <p>{pageContent.footerHoursLine2}</p>
                  <p>{pageContent.footerHoursLine3}</p>
                </div>
              </div>

              <div className="site-footer-contact">
                <h3
                  className="text-xl mb-4 text-foreground"
                  style={{ fontFamily: "Philosopher, serif" }}
                >
                  {pageContent.footerContactHeading}
                </h3>
                <div
                  className="space-y-2 text-sm"
                  style={{ color: "#75665E", fontFamily: "Lora, serif" }}
                >
                  <a
                    href={`tel:${pageContent.phone.replace(/\s/g, "")}`}
                    className="block transition-colors duration-200"
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "#8C1513";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "#75665E";
                    }}
                  >
                    {pageContent.phone}
                  </a>
                  <a
                    href={`mailto:${pageContent.email}`}
                    className="block transition-colors duration-200"
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "#8C1513";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "#75665E";
                    }}
                  >
                    {pageContent.email}
                  </a>
                  <p
                    className="pt-2 text-[13px] font-medium"
                    style={{ color: "#9A8878" }}
                  >
                    {pageContent.socialHandle}
                  </p>
                </div>
              </div>
            </div>

            <div
              className="pt-8 text-center"
              style={{ borderTop: "1px solid rgba(221,214,203,0.3)" }}
            >
              {/* Social links */}
              {(socialLinks.instagram ||
                socialLinks.facebook ||
                socialLinks.tiktok) && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "18px",
                    marginBottom: "16px",
                  }}
                >
                  {socialLinks.instagram && (
                    <a
                      href={socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#9A8878", transition: "color 0.2s" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color =
                          "#8C1513";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color =
                          "#9A8878";
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="2"
                          y="2"
                          width="20"
                          height="20"
                          rx="5"
                          ry="5"
                        ></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                      </svg>
                    </a>
                  )}
                  {socialLinks.facebook && (
                    <a
                      href={socialLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#9A8878", transition: "color 0.2s" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color =
                          "#8C1513";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color =
                          "#9A8878";
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                      </svg>
                    </a>
                  )}
                  {socialLinks.tiktok && (
                    <a
                      href={socialLinks.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#9A8878", transition: "color 0.2s" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color =
                          "#8C1513";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color =
                          "#9A8878";
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
                      </svg>
                    </a>
                  )}
                </div>
              )}
              <p
                className="text-xs"
                style={{ color: "#9A8878", fontFamily: "Philosopher, serif" }}
              >
                {pageContent.footerCopyright}
              </p>
            </div>
          </div>
        </footer>

        {/* Lightbox / Gallery Overlay */}
        {lightboxImg !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
            style={{
              background: "rgba(26,13,8,0.92)",
              backdropFilter: "blur(8px)",
            }}
            onClick={() => setLightboxImg(null)}
          >
            <div
              className="relative w-full max-w-5xl h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-0 right-0 p-4 text-white/70 hover:text-white transition-colors"
                onClick={() => setLightboxImg(null)}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              <button
                className="absolute left-0 top-1/2 -translate-y-1/2 p-4 sm:p-8 text-white/50 hover:text-white transition-colors disabled:opacity-0"
                disabled={lightboxImg === 0}
                onClick={() =>
                  setLightboxImg((prev) =>
                    prev !== null && prev > 0 ? prev - 1 : prev,
                  )
                }
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>

              <img
                src={publicGallery[lightboxImg].src}
                alt={publicGallery[lightboxImg].alt}
                className="max-w-full max-h-full object-contain"
                style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}
              />

              <button
                className="absolute right-0 top-1/2 -translate-y-1/2 p-4 sm:p-8 text-white/50 hover:text-white transition-colors disabled:opacity-0"
                disabled={lightboxImg === publicGallery.length - 1}
                onClick={() =>
                  setLightboxImg((prev) =>
                    prev !== null && prev < publicGallery.length - 1
                      ? prev + 1
                      : prev,
                  )
                }
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>
        )}
        {storyViewerIndex !== null && activeStories.length > 0 && (
          <StoryViewer
            stories={activeStories}
            initialIndex={storyViewerIndex}
            language={lang}
            onClose={() => setStoryViewerIndex(null)}
          />
        )}
      </div>
    </LangContext.Provider>
  );
}

// Re-export for use in Admin
export { LangContext };
