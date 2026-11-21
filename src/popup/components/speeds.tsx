import { filesize } from "filesize";
import i18n from "@/platform/i18n";

const FILESIZE_BASE = { base: 2 } as const;

interface Props {
  downloadSpeed: number;
  uploadSpeed: number;
}

// "↓ 1 MiB/s - ↑ 10 KiB/s": the arrows are icons, so screen readers read the name of each speed instead.
function Speeds({ downloadSpeed, uploadSpeed }: Props) {
  return (
    <>
      <i className="bi-arrow-down" aria-hidden="true" />
      <span className="visually-hidden">{i18n("popupDownloadSpeed")}</span> {filesize(downloadSpeed, FILESIZE_BASE)}/s -{" "}
      <i className="bi-arrow-up" aria-hidden="true" />
      <span className="visually-hidden">{i18n("popupUploadSpeed")}</span> {filesize(uploadSpeed, FILESIZE_BASE)}/s
    </>
  );
}

export default Speeds;
