import browser, { type Cookies } from "webextension-polyfill";
import { isFirefox } from "@/platform/browser-info";

export function formatCookies(cookies: Cookies.Cookie[]) {
  return cookies.reduce((acc, cookie) => {
    return `${acc}${cookie.name}=${cookie.value};`;
  }, "");
}

// Returns the cookies to send with a request to the URL, as a Cookie header value.
export async function getCookies(url: string, cookieStoreID?: string): Promise<string> {
  const details: Cookies.GetAllDetailsType = { url, storeId: cookieStoreID };
  if (isFirefox()) {
    // Ignore First-Party Isolation: it would filter out the cookies of the page that started the download.
    details.firstPartyDomain = null;
  }
  return formatCookies(await browser.cookies.getAll(details));
}
