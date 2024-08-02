import i18n from "@/i18n";
import ExtensionOptions from "@/models/extension-options";
import type Server from "@/models/server";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { Col, Form, Row } from "react-bootstrap";

interface Props {
  setExtensionOptions: Dispatch<SetStateAction<ExtensionOptions>>;
  extensionOptions: ExtensionOptions;
  server: Server;
}

function ServerQuickOptions({ setExtensionOptions, extensionOptions, server }: Props) {
  const onChangeCaptureDownloads = async (e: ChangeEvent<HTMLInputElement>) => {
    const newExtensionsOptions = new ExtensionOptions(
      extensionOptions.servers,
      e.target.checked ? server.uuid : "",
      e.target.checked,
      extensionOptions.minFileSizeInBytes,
      extensionOptions.excludedProtocols,
      extensionOptions.excludedSites,
      extensionOptions.excludedFileTypes,
      extensionOptions.useCompleteFilePath,
      extensionOptions.theme,
    );
    await newExtensionsOptions.toStorage();
    setExtensionOptions(newExtensionsOptions);
  };

  const onChangeUseCompleteFilePath = async (e: ChangeEvent<HTMLInputElement>) => {
    const newExtensionsOptions = new ExtensionOptions(
      extensionOptions.servers,
      extensionOptions.captureServer,
      extensionOptions.captureDownloads,
      extensionOptions.minFileSizeInBytes,
      extensionOptions.excludedProtocols,
      extensionOptions.excludedSites,
      extensionOptions.excludedFileTypes,
      e.target.checked,
      extensionOptions.theme,
    );
    await newExtensionsOptions.toStorage();
    setExtensionOptions(newExtensionsOptions);
  };

  return (
    <Row className="mt-2 gx-0 ps-2 pe-2">
      <Col xs={12} sm={12}>
        <Form.Group controlId="form-capture-downloads">
          <Form.Check
            checked={extensionOptions.captureDownloads && extensionOptions.captureServer === server.uuid}
            label={i18n("extensionOptionsCaptureDownloads")}
            aria-label={i18n("extensionOptionsCaptureDownloads")}
            onChange={onChangeCaptureDownloads}
          />
        </Form.Group>
      </Col>
      <Col xs={12} sm={12} className="mb-3">
        <Form.Group controlId="form-use-complete-path">
          <Form.Check
            disabled={!extensionOptions.captureDownloads || extensionOptions.captureServer !== server.uuid}
            checked={extensionOptions.useCompleteFilePath}
            label={i18n("extensionOptionsUseCompleteFilePath")}
            aria-label={i18n("extensionOptionsUseCompleteFilePath")}
            onChange={onChangeUseCompleteFilePath}
          />
        </Form.Group>
      </Col>
    </Row>
  );
}

export default ServerQuickOptions;
