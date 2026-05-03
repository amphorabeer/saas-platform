import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";

export default createMiddleware({
  // ⚡ მხარდაჭერილი locale-ები
  locales,

  // ⚡ Default locale (URL-ში არ ჩაიწერება — `/` = `/ka`)
  defaultLocale,

  // ⚡ Strategy: ყოველთვის დაამატე locale prefix URL-ში
  // 'as-needed' — default locale prefix-ის გარეშე (`/` = ka, `/en` = en)
  // 'always' — ყოველთვის prefix-ით (`/ka`, `/en`)
  localePrefix: "as-needed",

  // ⚡ ბრაუზერის ენის ავტომატური ცნობა
  // თუ user-ი English browser-ით შემოვა — ავტომატურად /en-ზე გადავა
  localeDetection: true,
});

export const config = {
  // ⚡ ეს middleware მუშაობს ყველა URL-ზე გარდა:
  // - /api/* (API routes — არ ითარგმნება)
  // - /_next/* (Next.js internals)
  // - /_vercel (Vercel internals)
  // - სტატიკური ფაილები (.png, .jpg, .ico, .txt, .xml, etc.)
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
