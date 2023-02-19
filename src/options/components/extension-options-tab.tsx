import React, { ChangeEvent, useCallback, useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/js/bootstrap";
import { Alert, Button, Col, Form, FormText } from "react-bootstrap";
import i18n from "../../i18n";
import ExtensionOptions from "../../models/extension-options";
import AlertProps from "../models/alert-props";

interface Props {
  extensionOptions: ExtensionOptions;
  setExtensionOptions: React.Dispatch<React.SetStateAction<ExtensionOptions>>;
}

function ExtensionOptionsTab({ extensionOptions, setExtensionOptions }: Props) {
  const [captureDownloads, setCaptureDownloads] = useState(extensionOptions.captureDownloads);
  const [captureServer, setCaptureServer] = useState(extensionOptions.captureServer);
  const [excludedProtocols, setExcludedProtocols] = useState(extensionOptions.excludedProtocols);
  const [excludedSites, setExcludedSites] = useState(extensionOptions.excludedSites);
  const [excludedFileTypes, setExcludedFileTypes] = useState(extensionOptions.excludedFileTypes);
  const [alertProps, setAlertProps] = useState(new AlertProps());

  useEffect(() => {
    setCaptureDownloads(extensionOptions.captureDownloads);
    setCaptureServer(extensionOptions.captureServer);
    setExcludedProtocols(extensionOptions.excludedProtocols);
    setExcludedSites(extensionOptions.excludedSites);
    setExcludedFileTypes(extensionOptions.excludedFileTypes);
  }, [extensionOptions]);

  function serializeExcludedOption(excludedOptions: string) {
    return excludedOptions
      .trim()
      .split(/\s*,+\s*/)
      .filter((s) => s !== "");
  }

  function deserializeExcludedOption(excludedOption: string[]) {
    return excludedOption.join(", ");
  }

  const onChangeCaptureServer = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      if (extensionOptions.servers[event.target.value]) {
        setCaptureServer(event.target.value);
      }
    },
    [extensionOptions.servers],
  );

  const onChangeCaptureDownloads = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setCaptureDownloads(e.target.checked);
      if (!e.target.checked) {
        setCaptureServer("");
      } else {
        setCaptureServer(extensionOptions.captureServer);
      }
    },
    [extensionOptions.captureServer],
  );

  const onChangeExcludedProtocols = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setExcludedProtocols(serializeExcludedOption(e.target.value)),
    [],
  );

  const onChangeExcludedSites = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setExcludedSites(serializeExcludedOption(e.target.value)),
    [],
  );

  const onChangeExcludedFileTypes = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setExcludedFileTypes(serializeExcludedOption(e.target.value)),
    [],
  );

  const onClickSaveExtensionOptions = useCallback(async () => {
    try {
      const newExtensionOptions = await new ExtensionOptions(
        extensionOptions.servers,
        captureServer,
        captureDownloads,
        excludedProtocols,
        excludedSites,
        excludedFileTypes,
      ).toStorage();
      setExtensionOptions(newExtensionOptions);
      setAlertProps(AlertProps.success(i18n("serverOptionsSuccess")));
    } catch {
      setAlertProps(AlertProps.error(i18n("serverOptionsError")));
    }
  }, [captureDownloads, captureServer, excludedFileTypes, excludedProtocols, excludedSites, extensionOptions.servers, setExtensionOptions]);

  return (
    <Form className="row p-3">
      {alertProps.show && (
        <Col xs={12} sm={12}>
          <Alert variant={alertProps.variant} className="mb-3" onClose={() => setAlertProps(new AlertProps())} dismissible>
            {alertProps.message}
          </Alert>
        </Col>
      )}

      <Col xs={12} sm={12} className="mb-3">
        <Form.Group controlId="form-capture-downloads">
          <Form.Label>{i18n("extensionOptionsCaptureDownloads")}</Form.Label>
          <Form.Check checked={captureDownloads} aria-label={i18n("extensionOptionsCaptureDownloads")} onChange={onChangeCaptureDownloads} />
        </Form.Group>
      </Col>

      <Col xs={12} sm={12} className="mb-3">
        <Form.Group controlId="form-capture-downloads-servers">
          <Form.Label>{i18n("extensionOptionsCaptureDownloads")}</Form.Label>
          <Form.Select disabled={!captureDownloads} value={captureServer} onChange={onChangeCaptureServer}>
            <option value="" disabled>
              {i18n("extensionOptionsNoServerSelected")}
            </option>
            {Object.entries(extensionOptions.servers).map(([id, server]) => (
              <option key={id} value={id}>
                {server.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </Col>

      <Col xs={12} sm={12} className="mb-3">
        <Form.Group controlId="form-exclude-protocols">
          <Form.Label>{i18n("extensionOptionsExcludeProtocols")}</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder={i18n("extensionOptionsExcludeProtocolsInformation")}
            disabled={!captureDownloads}
            defaultValue={deserializeExcludedOption(excludedProtocols)}
            onChange={onChangeExcludedProtocols}
          />
          <FormText id="exclude-protocols-description" muted>
            {i18n("extensionOptionsExcludeProtocolsDescription")}
          </FormText>
        </Form.Group>
      </Col>

      <Col xs={12} sm={12} className="mb-3">
        <Form.Group controlId="form-exclude-sites">
          <Form.Label>{i18n("extensionOptionsExcludeSites")}</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder={i18n("extensionOptionsExcludeSitesInformation")}
            disabled={!captureDownloads}
            defaultValue={deserializeExcludedOption(excludedSites)}
            onChange={onChangeExcludedSites}
          />
          <FormText id="exclude-sites-description" muted>
            {i18n("extensionOptionsExcludeSitesDescription")}
          </FormText>
        </Form.Group>
      </Col>

      <Col xs={12} sm={12} className="mb-3">
        <Form.Group controlId="form-exclude-file-types">
          <Form.Label>{i18n("extensionOptionsExcludeFileTypes")}</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder={i18n("extensionOptionsExcludeFileTypesInformation")}
            disabled={!captureDownloads}
            defaultValue={deserializeExcludedOption(excludedFileTypes)}
            onChange={onChangeExcludedFileTypes}
          />
          <Form.Text id="exclude-file-types-description" muted>
            {i18n("extensionOptionsExcludeFileTypesDescription")}
          </Form.Text>
        </Form.Group>
      </Col>

      <Col xs={12} sm={12} className="mb-3">
        <Button variant="primary" onClick={onClickSaveExtensionOptions} disabled={captureDownloads && captureServer === ""}>
          {i18n("serverOptionsSave")}
        </Button>
      </Col>
    </Form>
  );
}

export default ExtensionOptionsTab;
