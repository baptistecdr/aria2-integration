import browser, { type Notifications } from "webextension-polyfill";

export async function showNotification(message: string) {
  const options: Notifications.CreateNotificationOptions = {
    type: "basic",
    title: "Aria2",
    iconUrl: "../icons/icon-browser-80.png",
    message,
  };
  await browser.notifications.create(undefined, options);
}
