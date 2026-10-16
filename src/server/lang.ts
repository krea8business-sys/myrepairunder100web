import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, parseLang, translator } from "@/lib/i18n";

export async function getLang() {
  const jar = await cookies();
  return parseLang(jar.get(LANG_COOKIE)?.value);
}

export async function getT() {
  return translator(await getLang());
}
