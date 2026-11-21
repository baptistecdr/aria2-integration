import type { ChangeEvent } from "react";
import { Col, Form, Row } from "react-bootstrap";
import { ExtensionOptions } from "@/domain/extension-options";
import type { Server } from "@/domain/server";
import i18n from "@/platform/i18n";
import { useExtensionOptions } from "@/shared/ui/extension-options-provider";
import ManagedHint from "@/shared/ui/managed-hint";

interface Props {
  server: Server;
}

function ServerQuickOptions({ server }: Props) {
  const { extensionOptions, managedOptions, updateExtensionOptions } = useExtensionOptions();

  const isCapturingOnThisServer = extensionOptions.captureDownloads && extensionOptions.captureServer === server.uuid;
  // Turning capture on or off here changes both options.
  const captureDownloadsManaged = managedOptions.has("captureDownloads") || managedOptions.has("captureServer");
  const useCompleteFilePathManaged = managedOptions.has("useCompleteFilePath");

  const updateOptions = (overrides: Partial<ExtensionOptions>) => updateExtensionOptions((options) => ExtensionOptions.withOverrides(options, overrides));

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
            checked={isCapturingOnThisServer}
            disabled={captureDownloadsManaged}
            label={i18n("extensionOptionsCaptureDownloads")}
            aria-label={i18n("extensionOptionsCaptureDownloads")}
            onChange={onChangeCaptureDownloads}
          />
          <ManagedHint managed={captureDownloadsManaged} />
        </Form.Group>
      </Col>
      <Col xs={12} sm={12} className="mb-3">
        <Form.Group controlId="form-use-complete-path">
          <Form.Check
            disabled={!isCapturingOnThisServer || useCompleteFilePathManaged}
            checked={extensionOptions.useCompleteFilePath}
            label={i18n("extensionOptionsUseCompleteFilePath")}
            aria-label={i18n("extensionOptionsUseCompleteFilePath")}
            onChange={onChangeUseCompleteFilePath}
          />
          <ManagedHint managed={useCompleteFilePathManaged} />
        </Form.Group>
      </Col>
    </Row>
  );
}

export default ServerQuickOptions;
