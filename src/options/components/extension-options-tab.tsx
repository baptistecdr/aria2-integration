import { ChangeEvent, useEffect, useState } from "react";
import { Alert, Button, Col, Form, FormText, Modal } from "react-bootstrap";
import i18n from "../../i18n";
import AlertProps from "../models/alert-props";
import ExtensionOptions from "../../models/extension-options";
import Theme from "../../models/theme";

interface Props {
  extensionOptions: ExtensionOptions;
  setExtensionOptions: React.Dispatch<React.SetStateAction<ExtensionOptions>>;
}

function ExtensionOptionsTab({ extensionOptions, setExtensionOptions }: Props) {
  function deserializeExcludedOption(excludedOption: string[]) {
    return excludedOption.join(", ");
  }

  const [captureDownloads, setCaptureDownloads] = useState(extensionOptions.captureDownloads);
  const [captureServer, setCaptureServer] = useState(extensionOptions.captureServer);
  const [excludedProtocols, setExcludedProtocols] = useState(deserializeExcludedOption(extensionOptions.excludedProtocols));
  const [excludedSites, setExcludedSites] = useState(deserializeExcludedOption(extensionOptions.excludedSites));
  const [excludedFileTypes, setExcludedFileTypes] = useState(deserializeExcludedOption(extensionOptions.excludedFileTypes));
  const [useCompleteFilePath, setUseCompleteFilePath] = useState(extensionOptions.useCompleteFilePath);
  const [theme, setTheme] = useState(extensionOptions.theme);
  const [alertProps, setAlertProps] = useState(new AlertProps());
  const [showModal, setShowModal] = useState(false);

  function serializeExcludedOption(excludedOptions: string) {
    return excludedOptions
      .trim()
      .split(/\s*,+\s*/)
      .filter((s) => s !== "");
  }

  useEffect(() => {
    setCaptureDownloads(extensionOptions.captureDownloads);
    setCaptureServer(extensionOptions.captureServer);
    setExcludedProtocols(deserializeExcludedOption(extensionOptions.excludedProtocols));
    setExcludedSites(deserializeExcludedOption(extensionOptions.excludedSites));
    setExcludedFileTypes(deserializeExcludedOption(extensionOptions.excludedFileTypes));
    setUseCompleteFilePath(extensionOptions.useCompleteFilePath);
    setTheme(extensionOptions.theme);
  }, [
    extensionOptions.captureDownloads,
    extensionOptions.captureServer,
    extensionOptions.excludedFileTypes,
    extensionOptions.excludedProtocols,
    extensionOptions.excludedSites,
    extensionOptions.theme,
    extensionOptions.useCompleteFilePath,
  ]);

  const onChangeCaptureServer = (event: ChangeEvent<HTMLSelectElement>) => {
    if (extensionOptions.servers[event.target.value]) {
      setCaptureServer(event.target.value);
    }
  };

  const onChangeCaptureDownloads = (e: ChangeEvent<HTMLInputElement>) => {
    setCaptureDownloads(e.target.checked);
    if (!e.target.checked) {
      setCaptureServer("");
    } else {
      setCaptureServer(extensionOptions.captureServer);
    }
  };

  const onClickSaveExtensionOptions = async () => {
    try {
      const newExtensionOptions = await new ExtensionOptions(
        extensionOptions.servers,
        captureServer,
        captureDownloads,
        serializeExcludedOption(excludedProtocols),
        serializeExcludedOption(excludedSites),
        serializeExcludedOption(excludedFileTypes),
        useCompleteFilePath,
        theme,
      ).toStorage();
      setExtensionOptions(newExtensionOptions);
      setAlertProps(AlertProps.success(i18n("serverOptionsSuccess")));
    } catch {
      setAlertProps(AlertProps.error(i18n("serverOptionsError")));
    }
  };

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
          <Form.Check
            checked={captureDownloads}
            label={i18n("extensionOptionsCaptureDownloads")}
            aria-label={i18n("extensionOptionsCaptureDownloads")}
            onChange={onChangeCaptureDownloads}
          />
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
            value={excludedProtocols}
            onChange={(e) => setExcludedProtocols(e.target.value)}
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
            value={excludedSites}
            onChange={(e) => setExcludedSites(e.target.value)}
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
            value={excludedFileTypes}
            onChange={(e) => setExcludedFileTypes(e.target.value)}
          />
          <Form.Text id="exclude-file-types-description" muted>
            {i18n("extensionOptionsExcludeFileTypesDescription")}
          </Form.Text>
        </Form.Group>
      </Col>

      <Col xs={11} sm={11} className="mb-3">
        <Form.Group controlId="form-use-complete-path">
          <Form.Check
            disabled={!captureDownloads}
            checked={useCompleteFilePath}
            label={i18n("extensionOptionsUseCompleteFilePath")}
            aria-label={i18n("extensionOptionsUseCompleteFilePath")}
            onChange={(e) => setUseCompleteFilePath(e.target.checked)}
          />
        </Form.Group>
      </Col>

      <Col xs={1} sm={1} className="mb-3 align-self-center">
        <Form.Group controlId="form-use-complete-path-help">
          <Button variant="link" disabled={!captureDownloads} onClick={() => setShowModal(true)}>
            <i className="bi bi-question-circle" />
          </Button>
        </Form.Group>
      </Col>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{i18n("extensionOptionsUseCompleteFilePathHelpTitle")}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ whiteSpace: "pre-wrap" }}>{i18n("extensionOptionsUseCompleteFilePathHelpContent")}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            {i18n("extensionOptionsUseCompleteFilePathHelpButton")}
          </Button>
        </Modal.Footer>
      </Modal>

      <Col xs={12} sm={12} className="mb-3">
        <Form.Group controlId="form-theme">
          <Form.Label>{i18n("extensionOptionsTheme")}</Form.Label>
          <Form.Group controlId="form-group-theme">
            <Form.Check
              inline
              label={i18n("extensionOptionsThemeLight")}
              name="group-theme"
              type="radio"
              id="theme-light"
              value={Theme.Light}
              checked={theme === Theme.Light}
              onChange={(e) => setTheme(e.target.value as Theme)}
            />
            <Form.Check
              inline
              label={i18n("extensionOptionsThemeDark")}
              name="group-theme"
              type="radio"
              id="theme-dark"
              value={Theme.Dark}
              checked={theme === Theme.Dark}
              onChange={(e) => setTheme(e.target.value as Theme)}
            />
            <Form.Check
              inline
              label={i18n("extensionOptionsThemeAuto")}
              name="group-theme"
              type="radio"
              id="theme-auto"
              value={Theme.Auto}
              checked={theme === Theme.Auto}
              onChange={(e) => setTheme(e.target.value as Theme)}
            />
          </Form.Group>
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
