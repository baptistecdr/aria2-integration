import i18n from "@/platform/i18n";

// Shown inside a live region of the parent, which announces the loading text.
export function LoadingSpinner() {
  return (
    <div className="d-flex justify-content-center">
      <div className="spinner-border text-primary">
        <span className="visually-hidden">{i18n("popupLoading")}</span>
      </div>
    </div>
  );
}
