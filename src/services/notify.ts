import { showNotification } from "@/platform/notifications";

export interface OutcomeNotifications {
  // Shown when the action succeeds. Leave it undefined to stay silent.
  success?: string;
  // Shown when the action fails. Leave it undefined to only log the error.
  error?: string;
}

// Runs the action and tells the user how it went. Never throws: returns whether the action succeeded.
export async function runWithNotification(action: () => Promise<unknown>, notifications: OutcomeNotifications): Promise<boolean> {
  try {
    await action();
  } catch (error) {
    console.error(error);
    if (notifications.error !== undefined) {
      await showNotification(notifications.error);
    }
    return false;
  }
  if (notifications.success !== undefined) {
    await showNotification(notifications.success);
  }
  return true;
}
