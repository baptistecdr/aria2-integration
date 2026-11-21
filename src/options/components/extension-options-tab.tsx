import { type ChangeEvent, useEffect, useId, useState } from "react";
import { Alert, Button, Col, Form, FormText, InputGroup, Modal } from "react-bootstrap";
import { ExtensionOptions } from "@/domain/extension-options";
import Theme from "@/domain/theme";
import AlertProps from "@/options/models/alert-props";
import { applyExtensionOptionsFormValues, type ExtensionOptionsFormValues, toExtensionOptionsFormValues } from "@/options/models/extension-options-form";
import { isChromium, isOsAndroid } from "@/platform/browser-info";
import i18n from "@/platform/i18n";
import { useExtensionOptions } from "@/shared/ui/extension-options-provider";
import { useFormValues } from "@/shared/ui/use-form-values";

function ExtensionOptionsTab() {
  const { extensionOptions, updateExtensionOptions } = useExtensionOptions();
  // Lives outside the form so that the confirmation stays visible when the saved options restart the form.
  const [alertProps, setAlertProps] = useState(new AlertProps());

  const save = async (values: ExtensionOptionsFormValues) => {
    try {
      await updateExtensionOptions((options) => applyExtensionOptionsFormValues(options, values));
      setAlertProps(AlertProps.success(i18n("serverOptionsSuccess")));
    } catch (error) {
      console.error(error);
      setAlertProps(AlertProps.error(i18n("serverOptionsError")));
    }
  };

  // The form restarts from the options whenever they change: once loaded, when saved, or when changed elsewhere.
  return (
    <ExtensionOptionsForm
      key={ExtensionOptions.serialize(extensionOptions)}
      options={extensionOptions}
      alertProps={alertProps}
      onCloseAlert={() => setAlertProps(new AlertProps())}
      onSave={save}
    />
  );
}

interface ExtensionOptionsFormProps {
  options: ExtensionOptions;
  alertProps: AlertProps;
  onCloseAlert: () => void;
  onSave: (values: ExtensionOptionsFormValues) => Promise<void>;
}

function ExtensionOptionsForm({ options, alertProps, onCloseAlert, onSave }: ExtensionOptionsFormProps) {
  const [values, set] = useFormValues(() => toExtensionOptionsFormValues(options));
  const [isAndroid, setIsAndroid] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const formMinimumFileSizeExponentId = useId();
  const minimumFileSizeDescriptionId = useId();
  const excludedProtocolsDescriptionId = useId();
  const excludedSitesDescriptionId = useId();
  const excludedFileTypesDescriptionId = useId();
  const notifyUrlIsAddedId = useId();
  const notifyFileIsAddedId = useId();
  const notifyErrorOccursId = useId();
  const themeLightId = useId();
  const themeDarkId = useId();
  const themeAutoId = useId();

  useEffect(() => {
    isOsAndroid().then(setIsAndroid);
  }, []);

  const { captureDownloads, captureServer } = values;

  const onChangeCaptureServer = (event: ChangeEvent<HTMLSelectElement>) => {
    if (options.servers[event.target.value]) {
      set("captureServer", event.target.value);
    }
  };

  const onChangeCaptureDownloads = (e: ChangeEvent<HTMLInputElement>) => {
    set("captureDownloads", e.target.checked);
    set("captureServer", e.target.checked ? options.captureServer : "");
  };

  const onChangeMinFileSize = (e: ChangeEvent<HTMLInputElement>) => {
    set("minFileSize", Number.parseInt(e.target.value || "0", 10));
  };

  return (
    <Form className="row p-3">
      {alertProps.show && (
        <Col xs={12} sm={12}>
          <Alert variant={alertProps.variant} className="mb-3" onClose={onCloseAlert} dismissible>
            {alertProps.message}
          </Alert>
        </Col>
      )}

      {!isAndroid && (
        <>
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
                {Object.entries(options.servers).map(([id, server]) => (
                  <option key={id} value={id}>
                    {server.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          {isChromium() && (
            <Form.Group as={Col} controlId="form-minimum-file-size" className="mb-3">
              <Form.Label>{i18n("extensionOptionsMinimumFileSize")}</Form.Label>
              <InputGroup>
                <Form.Control type="number" disabled={!captureDownloads} min={0} value={values.minFileSize} onChange={onChangeMinFileSize} required />
                <Form.Select
                  id={formMinimumFileSizeExponentId}
                  disabled={!captureDownloads}
                  value={values.minFileSizeExponent}
                  onChange={(e) => set("minFileSizeExponent", Number.parseInt(e.target.value, 10))}
                >
                  <option value="0">{i18n("B")}</option>
                  <option value="1">{i18n("KiB")}</option>
                  <option value="2">{i18n("MiB")}</option>
                  <option value="3">{i18n("GiB")}</option>
                </Form.Select>
              </InputGroup>
              <FormText id={minimumFileSizeDescriptionId} muted>
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
                value={values.excludedProtocols}
                onChange={(e) => set("excludedProtocols", e.target.value)}
              />
              <FormText id={excludedProtocolsDescriptionId} muted>
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
                value={values.excludedSites}
                onChange={(e) => set("excludedSites", e.target.value)}
              />
              <FormText id={excludedSitesDescriptionId} muted>
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
                value={values.excludedFileTypes}
                onChange={(e) => set("excludedFileTypes", e.target.value)}
              />
              <Form.Text id={excludedFileTypesDescriptionId} muted>
                {i18n("extensionOptionsExcludeFileTypesDescription")}
              </Form.Text>
            </Form.Group>
          </Col>
          <Col xs={11} sm={11} className="mb-3">
            <Form.Group controlId="form-use-complete-path">
              <Form.Check
                disabled={!captureDownloads}
                checked={values.useCompleteFilePath}
                label={i18n("extensionOptionsUseCompleteFilePath")}
                aria-label={i18n("extensionOptionsUseCompleteFilePath")}
                onChange={(e) => set("useCompleteFilePath", e.target.checked)}
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
          </Modal>{" "}
        </>
      )}

      <Col xs={12} sm={12} className="mb-3">
        <Form.Label>{i18n("extensionOptionsNotify")}</Form.Label>
        <Form.Check
          id={notifyUrlIsAddedId}
          checked={values.notifyUrlIsAdded}
          onChange={(e) => set("notifyUrlIsAdded", e.target.checked)}
          label={i18n("extensionOptionsNotifyUrlIsAdded")}
          aria-label={i18n("extensionOptionsNotifyUrlIsAdded")}
        />
        <Form.Check
          id={notifyFileIsAddedId}
          checked={values.notifyFileIsAdded}
          onChange={(e) => set("notifyFileIsAdded", e.target.checked)}
          label={i18n("extensionOptionsNotifyFileIsAdded")}
          aria-label={i18n("extensionOptionsNotifyFileIsAdded")}
        />
        <Form.Check
          id={notifyErrorOccursId}
          checked={values.notifyErrorOccurs}
          onChange={(e) => set("notifyErrorOccurs", e.target.checked)}
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
              id={themeLightId}
              value={Theme.Light}
              checked={values.theme === Theme.Light}
              onChange={(e) => set("theme", e.target.value as Theme)}
            />
            <Form.Check
              inline
              label={i18n("extensionOptionsThemeDark")}
              name="group-theme"
              type="radio"
              id={themeDarkId}
              value={Theme.Dark}
              checked={values.theme === Theme.Dark}
              onChange={(e) => set("theme", e.target.value as Theme)}
            />
            <Form.Check
              inline
              label={i18n("extensionOptionsThemeAuto")}
              name="group-theme"
              type="radio"
              id={themeAutoId}
              value={Theme.Auto}
              checked={values.theme === Theme.Auto}
              onChange={(e) => set("theme", e.target.value as Theme)}
            />
          </Form.Group>
        </Form.Group>
      </Col>

      <Col xs={12} sm={12} className="mb-3">
        <Button variant="primary" onClick={() => onSave(values)} disabled={captureDownloads && captureServer === ""}>
          {i18n("serverOptionsSave")}
        </Button>
      </Col>
    </Form>
  );
}

export default ExtensionOptionsTab;
