import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { INFO_LANGS, type InfoLang } from "./types";

export const dynamic = "force-dynamic";

function detectLang(acceptLanguage: string | null): InfoLang {
  if (!acceptLanguage) return "en";

  const langs = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0].split("-")[0].trim().toLowerCase());

  for (const l of langs) {
    if (INFO_LANGS.includes(l as InfoLang)) {
      return l as InfoLang;
    }
  }

  return "en";
}

export default function InfoIndexPage() {
  const acceptLang = headers().get("accept-language");
  const detectedLang = detectLang(acceptLang);

  redirect(`/info/${detectedLang}`);
}
