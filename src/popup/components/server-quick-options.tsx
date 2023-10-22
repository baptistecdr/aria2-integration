import { Col, Form, Row } from "react-bootstrap";
import { ChangeEvent, Dispatch, SetStateAction } from "react";
import i18n from "../../i18n";
import ExtensionOptions from "../../models/extension-options";
import Server from "../../models/server";

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
      extensionOptions.excludedProtocols,
      extensionOptions.excludedSites,
      extensionOptions.excludedFileTypes,
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
    </Row>
  );
}

export default ServerQuickOptions;
