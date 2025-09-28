import { expect } from "vitest";
import type { Cookies } from "webextension-polyfill";
import { formatCookies } from "@/background/background";

describe("Cookies", () => {
  function createCookie(name: string, value: string): Cookies.Cookie {
    return {
      domain: "domain",
      firstPartyDomain: "firstPartyDomain",
      hostOnly: false,
      httpOnly: false,
      path: "path",
      sameSite: "strict",
      secure: false,
      session: false,
      storeId: "storeId",
      name: name,
      value: value,
    };
  }

  it("should format cookies", () => {
    const cookies = [createCookie("name1", "value1"), createCookie("name2", "value2")];

    const formattedCookies = formatCookies(cookies);

    expect(formattedCookies).toEqual("name1=value1;name2=value2;");
  });
});
