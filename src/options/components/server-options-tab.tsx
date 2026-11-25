import { type SubmitEvent, useId, useState } from "react";
import { Alert, Button, Col, Form, InputGroup, Row } from "react-bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";
import { ExtensionOptions } from "@/domain/extension-options";
import type { Server } from "@/domain/server";
import { AlertProps } from "@/options/models/alert-props";
import { formatPath, fromServerFormValues, type ServerFormValues, serverUrl, toServerFormValues } from "@/options/models/server-form";
import i18n from "@/platform/i18n";
import { useExtensionOptions } from "@/shared/ui/extension-options-provider";
import { useFormValues } from "@/shared/ui/use-form-values";

interface Props {
  server: Server;
  deleteServer: (server: Server) => Promise<void>;
}

const VALIDATION_TIMEOUT = 1500; // 1,5 s

function ServerOptionsTab({ server, deleteServer }: Props) {
  const { managedOptions, updateExtensionOptions } = useExtensionOptions();
  // Lives outside the form so that the confirmation stays visible when the saved server restarts the form.
  const [alertProps, setAlertProps] = useState(AlertProps.none());

  const save = async (values: ServerFormValues) => {
    try {
      await updateExtensionOptions((options) => ExtensionOptions.withServer(options, fromServerFormValues(server.uuid, values)));
      setAlertProps(AlertProps.success(i18n("serverOptionsSuccess")));
    } catch (error) {
      console.error(error);
      setAlertProps(AlertProps.error(i18n("serverOptionsError")));
    }
  };

  // The form restarts from the server whenever it changes: when saved, or when changed elsewhere.
  return (
    <ServerOptionsForm
      key={JSON.stringify(server)}
      server={server}
      alertProps={alertProps}
      onCloseAlert={() => setAlertProps(AlertProps.none())}
      onSave={save}
      onDelete={() => deleteServer(server)}
      // The policy replaces every server: changes to them would be lost.
      readOnly={managedOptions.has("servers")}
    />
  );
}

interface ServerOptionsFormProps {
  server: Server;
  alertProps: AlertProps;
  onCloseAlert: () => void;
  onSave: (values: ServerFormValues) => Promise<void>;
  onDelete: () => void;
  readOnly: boolean;
}

function ServerOptionsForm({ server, alertProps, onCloseAlert, onSave, onDelete, readOnly }: ServerOptionsFormProps) {
  const [values, set] = useFormValues(() => toServerFormValues(server));
  const [validated, setValidated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const readOnlyNoticeId = useId();
  const nameFeedbackId = useId();
  const hostFeedbackId = useId();
  const pathFeedbackId = useId();
  const uuidDescriptionId = useId();
  const secretDescriptionId = useId();
  const rpcParametersDescriptionId = useId();
  const incognitoModeLabelId = useId();
  const incognitoRpcParametersDescriptionId = useId();

  // Screen readers read a hidden description too, so the feedback is only linked to a field once it is invalid.
  const feedbackFor = (feedbackId: string, value: string) => (validated && value === "" ? feedbackId : undefined);

  async function onSubmitSaveServer(formEvent: SubmitEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (formEvent.currentTarget.checkValidity()) {
      await onSave(values);
      window.setTimeout(() => setValidated(false), VALIDATION_TIMEOUT);
    }
    setValidated(true);
  }

  return (
    <Form className="p-3" noValidate validated={validated} onSubmit={(fe) => onSubmitSaveServer(fe)}>
      {alertProps.show && (
        <Row className="mb-3">
          <Form.Group as={Col} controlId="form-server-name">
            <Alert variant={alertProps.variant} className="mb-0" onClose={onCloseAlert} dismissible>
              {alertProps.message}
            </Alert>
          </Form.Group>
        </Row>
      )}
      {readOnly && (
        <Row className="mb-3">
          <Col>
            <Alert id={readOnlyNoticeId} variant="secondary" className="mb-0">
              <i className="bi bi-lock" aria-hidden="true" /> {i18n("managedServersByPolicy")}
            </Alert>
          </Col>
        </Row>
      )}
      {/* Outside the read-only fieldset: the uuid can be copied to configure the server in a policy. */}
      <Row className="mb-3">
        <Form.Group as={Col} controlId="form-server-uuid">
          <Form.Label>{i18n("serverOptionsUuid")}</Form.Label>
          <InputGroup>
            <Form.Control type="text" value={server.uuid} disabled={true} aria-describedby={uuidDescriptionId} />
            <Button
              variant="outline-secondary"
              aria-label={i18n("serverOptionsCopyUuid")}
              title={i18n("serverOptionsCopyUuid")}
              onClick={() => navigator.clipboard.writeText(server.uuid)}
            >
              <i className="bi-clipboard" aria-hidden="true" />
            </Button>
          </InputGroup>
          <Form.Text id={uuidDescriptionId} muted>
            {i18n("serverOptionsUuidDescription")}
          </Form.Text>
        </Form.Group>
      </Row>

      <fieldset disabled={readOnly} aria-describedby={readOnly ? readOnlyNoticeId : undefined}>
        <Row className="mb-3">
          <Form.Group as={Col} controlId="form-server-name">
            <Form.Label>{i18n("serverOptionsName")}</Form.Label>
            <Form.Control
              type="text"
              value={values.name}
              required
              aria-describedby={feedbackFor(nameFeedbackId, values.name)}
              onChange={(e) => set("name", e.target.value)}
            />
            <Form.Control.Feedback id={nameFeedbackId} type="invalid">
              {i18n("serverOptionsInvalidFeedback")}
            </Form.Control.Feedback>
          </Form.Group>
          <Form.Group as={Col} controlId="form-server-host">
            <Form.Label>{i18n("serverOptionsHost")}</Form.Label>
            <Form.Control
              type="text"
              value={values.host}
              required
              aria-describedby={feedbackFor(hostFeedbackId, values.host)}
              onChange={(e) => set("host", e.target.value)}
            />
            <Form.Control.Feedback id={hostFeedbackId} type="invalid">
              {i18n("serverOptionsInvalidFeedback")}
            </Form.Control.Feedback>
          </Form.Group>
        </Row>

        <Row className="mb-3">
          <Form.Group as={Col} controlId="form-server-port">
            <Form.Label>{i18n("serverOptionsPort")}</Form.Label>
            <Form.Control type="number" min={0} max={49151} value={values.port} required onChange={(e) => set("port", Number.parseInt(e.target.value, 10))} />
          </Form.Group>

          <Form.Group as={Col} controlId="form-server-path">
            <Form.Label>{i18n("serverOptionsPath")}</Form.Label>
            <Form.Control
              type="text"
              value={values.path}
              required
              aria-describedby={feedbackFor(pathFeedbackId, values.path)}
              onChange={(e) => set("path", formatPath(e.target.value))}
            />
            <Form.Control.Feedback id={pathFeedbackId} type="invalid">
              {i18n("serverOptionsInvalidFeedback")}
            </Form.Control.Feedback>
          </Form.Group>
        </Row>

        <Row className="mb-3">
          <Form.Group as={Col} controlId="form-server-secure">
            <Form.Label>{i18n("serverOptionsSecureConnection")}</Form.Label>
            <Form.Check checked={values.secure} onChange={(e) => set("secure", e.target.checked)} />
          </Form.Group>

          <Form.Group as={Col} controlId="form-server-url">
            <Form.Label>{i18n("serverOptionsUrl")}</Form.Label>
            <Form.Control type="text" value={serverUrl(values)?.toString() ?? ""} disabled={true} />
          </Form.Group>
        </Row>

        <Row className="mb-3">
          <Form.Group as={Col} controlId="form-server-secret">
            <Form.Label>{i18n("serverOptionsSecret")}</Form.Label>
            <InputGroup>
              <Form.Control
                type={showPassword ? "text" : "password"}
                value={values.secret}
                aria-describedby={secretDescriptionId}
                onChange={(e) => set("secret", e.target.value)}
              />
              <Button
                variant="outline-secondary"
                aria-label={i18n("serverOptionsShowSecret")}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={showPassword ? "bi-eye-slash" : "bi-eye"} aria-hidden="true" />
              </Button>
            </InputGroup>
            <Form.Text id={secretDescriptionId} muted>
              {i18n("serverOptionsSecretDescription")}
            </Form.Text>
          </Form.Group>
        </Row>

        <Row className="mb-3">
          <Form.Group as={Col} controlId="form-rpc-parameters">
            <Form.Label>{i18n("serverOptionsRpcParameters")}</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="split: 5"
              value={values.rpcParameters}
              aria-describedby={rpcParametersDescriptionId}
              onChange={(e) => set("rpcParameters", e.target.value)}
            />
            <Form.Text id={rpcParametersDescriptionId}>{i18n("serverOptionsRpcParametersDescription")}</Form.Text>
          </Form.Group>
        </Row>

        <div className="my-3">
          <div className="d-flex align-items-center">
            <hr className="flex-grow-1 m-0" />
            <span id={incognitoModeLabelId} className="px-2 small text-nowrap">
              {i18n("serverOptionsIncognitoMode")}
            </span>
            <hr className="flex-grow-1 m-0" />
          </div>
        </div>

        {/* The settings used in private windows: their own "RPC Parameters" field is told apart by this group. */}
        <fieldset aria-labelledby={incognitoModeLabelId}>
          <Row className="mb-3">
            <Form.Group controlId="form-im-automatically-purge-downloads">
              <Form.Check
                label={i18n("serverOptionsAutomaticallyPurgeDownloads")}
                checked={values.incognitoAutomaticallyPurgeDownloads}
                onChange={(e) => set("incognitoAutomaticallyPurgeDownloads", e.target.checked)}
              />
            </Form.Group>
          </Row>

          <Row className="mb-3">
            <Form.Group controlId="form-im-overwrite-rpc-parameters">
              <Form.Check
                label={i18n("serverOptionsOverwriteRpcParameters")}
                checked={values.incognitoOverwriteRpcParameters}
                onChange={(e) => set("incognitoOverwriteRpcParameters", e.target.checked)}
              />
            </Form.Group>
          </Row>

          <Row className="mb-3">
            <Form.Group as={Col} controlId="form-im-rpc-parameters">
              <Form.Label>{i18n("serverOptionsRpcParameters")}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="split: 5"
                disabled={!values.incognitoOverwriteRpcParameters}
                value={values.incognitoRpcParameters}
                aria-describedby={incognitoRpcParametersDescriptionId}
                onChange={(e) => set("incognitoRpcParameters", e.target.value)}
              />
              <Form.Text id={incognitoRpcParametersDescriptionId}>{i18n("serverOptionsRpcParametersDescription")}</Form.Text>
            </Form.Group>
          </Row>
        </fieldset>
      </fieldset>

      {!readOnly && (
        <Row className="mb-3">
          <Col xs={12} sm={12}>
            <Button type="submit" variant="primary">
              {i18n("serverOptionsSave")}
            </Button>
            <Button variant="danger" className="ms-2" onClick={onDelete}>
              {i18n("serverOptionsDelete")}
            </Button>
          </Col>
        </Row>
      )}
    </Form>
  );
}

export default ServerOptionsTab;
