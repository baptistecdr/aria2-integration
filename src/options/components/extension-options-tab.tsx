import i18n from "@/i18n";
import { isFirefox } from "@/models/aria2-extension";
import ExtensionOptions from "@/models/extension-options";
import Theme from "@/models/theme";
import AlertProps from "@/options/models/alert-props";
import { filesize } from "filesize";
import { type ChangeEvent, useCallback, useEffect, useState } from "react";
import { Alert, Button, Col, Form, FormText, InputGroup, Modal } from "react-bootstrap";

interface Props {
  extensionOptions: ExtensionOptions;
  setExtensionOptions: React.Dispatch<React.SetStateAction<ExtensionOptions>>;
}

function ExtensionOptionsTab({ extensionOptions, setExtensionOptions }: Props) {
  const deserializeExcludedOption = useCallback((excludedOption: string[]) => {
    return excludedOption.join(", ");
  }, []);

  const formatFileSize = useCallback((fileSizeInBytes: number) => {
    const { value, exponent } = filesize(fileSizeInBytes, {
      base: 2,
      output: "object",
    });
    return [Number.parseInt(value, 10), exponent];
  }, []);

  const [captureDownloads, setCaptureDownloads] = useState(extensionOptions.captureDownloads);
  const [captureServer, setCaptureServer] = useState(extensionOptions.captureServer);
  const [minFileSize, setMinFileSize] = useState(formatFileSize(extensionOptions.minFileSizeInBytes)[0]);
  const [excludedProtocols, setExcludedProtocols] = useState(deserializeExcludedOption(extensionOptions.excludedProtocols));
  const [excludedSites, setExcludedSites] = useState(deserializeExcludedOption(extensionOptions.excludedSites));
  const [excludedFileTypes, setExcludedFileTypes] = useState(deserializeExcludedOption(extensionOptions.excludedFileTypes));
  const [useCompleteFilePath, setUseCompleteFilePath] = useState(extensionOptions.useCompleteFilePath);
  const [notifyUrlIsAdded, setNotifyUrlIsAdded] = useState(extensionOptions.notifyUrlIsAdded);
  const [notifyFileIsAdded, setNotifyFileIsAdded] = useState(extensionOptions.notifyFileIsAdded);
  const [notifyErrorOccurs, setNotifyErrorOccurs] = useState(extensionOptions.notifyErrorOccurs);
  const [theme, setTheme] = useState(extensionOptions.theme);
  const [alertProps, setAlertProps] = useState(new AlertProps());
  const [showModal, setShowModal] = useState(false);
  const [minFileSizeExponent, setMinFileSizeExponent] = useState(formatFileSize(extensionOptions.minFileSizeInBytes)[1]);

  function serializeExcludedOption(excludedOptions: string) {
    return excludedOptions
      .trim()
      .split(/\s*,+\s*/)
      .filter((s) => s !== "");
  }

  useEffect(() => {
    setCaptureDownloads(extensionOptions.captureDownloads);
    setCaptureServer(extensionOptions.captureServer);
    setMinFileSize(formatFileSize(extensionOptions.minFileSizeInBytes)[0]);
    setMinFileSizeExponent(formatFileSize(extensionOptions.minFileSizeInBytes)[1]);
    setExcludedProtocols(deserializeExcludedOption(extensionOptions.excludedProtocols));
    setExcludedSites(deserializeExcludedOption(extensionOptions.excludedSites));
    setExcludedFileTypes(deserializeExcludedOption(extensionOptions.excludedFileTypes));
    setUseCompleteFilePath(extensionOptions.useCompleteFilePath);
    setNotifyUrlIsAdded(extensionOptions.notifyUrlIsAdded);
    setNotifyFileIsAdded(extensionOptions.notifyFileIsAdded);
    setNotifyErrorOccurs(extensionOptions.notifyErrorOccurs);
    setTheme(extensionOptions.theme);
  }, [
    extensionOptions.captureDownloads,
    extensionOptions.captureServer,
    extensionOptions.minFileSizeInBytes,
    extensionOptions.excludedProtocols,
    extensionOptions.excludedSites,
    extensionOptions.excludedFileTypes,
    extensionOptions.useCompleteFilePath,
    extensionOptions.notifyUrlIsAdded,
    extensionOptions.notifyFileIsAdded,
    extensionOptions.notifyErrorOccurs,
    extensionOptions.theme,
    formatFileSize,
    deserializeExcludedOption,
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

  const onChangeMinFileSize = (e: ChangeEvent<HTMLInputElement>) => {
    const fileSizeStr = e.target.value || "0";
    const fileSize = Number.parseInt(fileSizeStr, 10);
    setMinFileSize(fileSize);
  };

  const onClickSaveExtensionOptions = async () => {
    try {
      const newExtensionOptions = await new ExtensionOptions(
        extensionOptions.servers,
        captureServer,
        captureDownloads,
        minFileSize * 1024 ** minFileSizeExponent,
        serializeExcludedOption(excludedProtocols),
        serializeExcludedOption(excludedSites),
        serializeExcludedOption(excludedFileTypes),
        useCompleteFilePath,
        notifyUrlIsAdded,
        notifyFileIsAdded,
        notifyErrorOccurs,
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

      {!isFirefox() && (
        <Form.Group as={Col} controlId="form-minimum-file-size" className="mb-3">
          <Form.Label>{i18n("extensionOptionsMinimumFileSize")}</Form.Label>
          <InputGroup>
            <Form.Control type="number" disabled={!captureDownloads} min={0} value={minFileSize} onChange={onChangeMinFileSize} required />
            <Form.Select
              id="form-minimum-file-size-exponent"
              disabled={!captureDownloads}
              value={minFileSizeExponent}
              onChange={(e) => setMinFileSizeExponent(Number.parseInt(e.target.value, 10))}
            >
              <option value="0">{i18n("B")}</option>
              <option value="1">{i18n("KiB")}</option>
              <option value="2">{i18n("MiB")}</option>
              <option value="3">{i18n("GiB")}</option>
            </Form.Select>
          </InputGroup>
          <FormText id="minimum-file-size-description" muted>
            {i18n("extensionOptionsMinimumFileSizeDescription")}
          </FormText>
        </Form.Group>
      )}

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
        <Form.Label>{i18n("extensionOptionsNotify")}</Form.Label>
        <Form.Check
          id="notify-url-added"
          checked={notifyUrlIsAdded}
          onChange={(e) => setNotifyUrlIsAdded(e.target.checked)}
          label={i18n("extensionOptionsNotifyUrlIsAdded")}
          aria-label={i18n("extensionOptionsNotifyUrlIsAdded")}
        />
        <Form.Check
          id="notify-file-added"
          checked={notifyFileIsAdded}
          onChange={(e) => setNotifyFileIsAdded(e.target.checked)}
          label={i18n("extensionOptionsNotifyFileIsAdded")}
          aria-label={i18n("extensionOptionsNotifyFileIsAdded")}
        />
        <Form.Check
          id="notify-error-occurs"
          checked={notifyErrorOccurs}
          onChange={(e) => setNotifyErrorOccurs(e.target.checked)}
          label={i18n("extensionOptionsNotifyErrorOccurs")}
          aria-label={i18n("extensionOptionsNotifyErrorOccurs")}
        />
      </Col>

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
