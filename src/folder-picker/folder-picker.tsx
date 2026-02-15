import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap";
import "./folder-picker.css";
import { Alert, Button, Container, Form } from "react-bootstrap";
import browser from "webextension-polyfill";
import i18n from "@/i18n";
import ExtensionOptions from "@/models/extension-options";
import type FolderPreset from "@/models/folder-preset";
import { applyTheme } from "@/models/theme";

interface PendingDownload {
  serverId: string;
  urls: string[];
  referer: string;
  cookies: string;
}

const container = document.getElementById("root");
// biome-ignore lint/style/noNonNullAssertion: We are sure the container exists
const root = createRoot(container!);

function FolderPicker() {
  const [extensionOptions, setExtensionOptions] = useState<ExtensionOptions>(new ExtensionOptions());
  const [pendingDownload, setPendingDownload] = useState<PendingDownload | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [customPath, setCustomPath] = useState<string>("");
  const [useCustomPath, setUseCustomPath] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const hasPresets = extensionOptions.folderPresets.length > 0;

  useEffect(() => {
    const loadData = async () => {
      const options = await ExtensionOptions.fromStorage();
      setExtensionOptions(options);
      applyTheme(options.theme);

      // If no presets, auto-enable custom path mode
      if (options.folderPresets.length === 0) {
        setUseCustomPath(true);
        // Pre-fill with default folder if set
        if (options.defaultFolder) {
          setCustomPath(options.defaultFolder);
        }
      } else {
        // Set default selection to first preset
        setSelectedPresetId(options.folderPresets[0].id);
      }

      // Get pending download info
      const storage = await browser.storage.local.get("pendingDownload");
      if (storage.pendingDownload) {
        setPendingDownload(storage.pendingDownload as PendingDownload);
      }
    };

    loadData();
  }, []);

  const getSelectedFolder = (): string => {
    if (useCustomPath) {
      return customPath.trim();
    }
    const preset = extensionOptions.folderPresets.find((p: FolderPreset) => p.id === selectedPresetId);
    return preset?.path ?? "";
  };

  const handleDownload = async () => {
    const folder = getSelectedFolder();
    if (!folder) {
      setError(i18n("folderPickerNoFolderSelected"));
      return;
    }

    await browser.runtime.sendMessage({
      type: "folderPickerResponse",
      folder,
      cancelled: false,
    });

    window.close();
  };

  const handleCancel = async () => {
    await browser.runtime.sendMessage({
      type: "folderPickerResponse",
      cancelled: true,
    });

    window.close();
  };

  const handleDownloadNormally = async () => {
    // Clear pending download so aria2 doesn't get it
    await browser.storage.local.remove("pendingDownload");

    // Trigger browser's native download for each URL
    if (pendingDownload?.urls) {
      for (const url of pendingDownload.urls) {
        browser.downloads.download({ url });
      }
    }

    window.close();
  };

  const openOptions = () => {
    browser.runtime.openOptionsPage();
    window.close();
  };

  const displayUrl = pendingDownload?.urls?.[0] ?? "";
  const urlCount = pendingDownload?.urls?.length ?? 0;

  return (
    <Container className="p-3 folder-picker-container" fluid>
      <div className="folder-picker-header">
        <h5>{i18n("folderPickerTitle")}</h5>
        {displayUrl && <div className="folder-picker-url">{urlCount > 1 ? `${urlCount} URLs` : displayUrl}</div>}
      </div>

      {error && (
        <Alert variant="danger" onClose={() => setError("")} dismissible>
          {error}
        </Alert>
      )}

      {!hasPresets && (
        <Alert variant="info" className="py-2">
          <small>
            {i18n("folderPickerNoPresetsHint")}{" "}
            <Alert.Link onClick={openOptions} style={{ cursor: "pointer" }}>
              {i18n("folderPickerAddPresets")}
            </Alert.Link>
          </small>
        </Alert>
      )}

      <Form>
        {hasPresets && (
          <>
            <Form.Group className="mb-3">
              <Form.Label>{i18n("folderPickerSelectFolder")}</Form.Label>
              <Form.Select
                value={selectedPresetId}
                onChange={(e) => {
                  setSelectedPresetId(e.target.value);
                  setUseCustomPath(false);
                }}
                disabled={useCustomPath}
              >
                {extensionOptions.folderPresets.map((preset: FolderPreset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} ({preset.path})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label={i18n("folderPickerUseCustomPath")}
                checked={useCustomPath}
                onChange={(e) => setUseCustomPath(e.target.checked)}
              />
            </Form.Group>
          </>
        )}

        {useCustomPath && (
          <Form.Group className="mb-3">
            <Form.Label>{i18n("folderPickerCustomPath")}</Form.Label>
            <Form.Control
              type="text"
              placeholder={i18n("folderPickerCustomPathPlaceholder")}
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              autoFocus={!hasPresets}
            />
          </Form.Group>
        )}

        <div className="folder-picker-actions">
          <Button variant="secondary" onClick={handleDownloadNormally} title={i18n("folderPickerDownloadNormallyHint")}>
            <i className="bi bi-box-arrow-down me-1" />
            {i18n("folderPickerDownloadNormally")}
          </Button>
          <div className="folder-picker-actions-right">
            <Button variant="secondary" onClick={handleCancel}>
              {i18n("folderPickerCancel")}
            </Button>
            <Button variant="primary" onClick={handleDownload}>
              <i className="bi bi-download me-1" />
              {i18n("folderPickerDownload")}
            </Button>
          </div>
        </div>
      </Form>
    </Container>
  );
}

root.render(
  <React.StrictMode>
    <FolderPicker />
  </React.StrictMode>,
);
