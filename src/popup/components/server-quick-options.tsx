import type { ChangeEvent } from "react";
import { Col, Form, Row } from "react-bootstrap";
import { useExtensionOptions } from "@/extension-options-provider";
import i18n from "@/i18n";
import { ExtensionOptions } from "@/models/extension-options";
import type { Server } from "@/models/server";

interface Props {
  server: Server;
}

function ServerQuickOptions({ server }: Props) {
  const { extensionOptions, setExtensionOptions, managedOptions } = useExtensionOptions();

  const isCapturingOnThisServer = extensionOptions.captureDownloads && extensionOptions.captureServer === server.uuid;
  const isCaptureManaged = ExtensionOptions.isCaptureManaged(managedOptions);
  const isUseCompleteFilePathManaged = "useCompleteFilePath" in managedOptions;

  const updateOptions = async (overrides: Partial<ExtensionOptions>) => {
    const updatedOptions = ExtensionOptions.withOverrides(extensionOptions, overrides);
    setExtensionOptions(await ExtensionOptions.toStorage(updatedOptions));
  };

  const onChangeCaptureDownloads = (e: ChangeEvent<HTMLInputElement>) =>
    updateOptions({
      captureServer: e.target.checked ? server.uuid : "",
      captureDownloads: e.target.checked,
    });

  const onChangeUseCompleteFilePath = (e: ChangeEvent<HTMLInputElement>) => updateOptions({ useCompleteFilePath: e.target.checked });

  return (
    <Row className="mt-2 gx-0 ps-2 pe-2">
      <Col xs={12} sm={12}>
        <Form.Group controlId="form-capture-downloads">
          <Form.Check
            disabled={isCaptureManaged}
            checked={isCapturingOnThisServer}
            label={i18n("extensionOptionsCaptureDownloads")}
            aria-label={i18n("extensionOptionsCaptureDownloads")}
            onChange={onChangeCaptureDownloads}
          />
        </Form.Group>
      </Col>
      <Col xs={12} sm={12} className="mb-3">
        <Form.Group controlId="form-use-complete-path">
          <Form.Check
            disabled={!isCapturingOnThisServer || isUseCompleteFilePathManaged}
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
