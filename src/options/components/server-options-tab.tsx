import { type FormEvent, useState } from "react";
import { Alert, Button, Col, Form, InputGroup, Row } from "react-bootstrap";
import i18n from "@/i18n";
import "bootstrap-icons/font/bootstrap-icons.css";
import type ExtensionOptions from "@/models/extension-options";
import Server from "@/models/server";
import AlertProps from "@/options/models/alert-props";

interface Props {
  extensionOptions: ExtensionOptions;
  setExtensionOptions: React.Dispatch<React.SetStateAction<ExtensionOptions>>;
  server: Server;
  deleteServer: (server: Server) => Promise<void>;
}

function ServerOptionsTab({ extensionOptions, setExtensionOptions, server, deleteServer }: Props) {
  function deserializeRpcParameters(rpcParameters: Record<string, string>): string {
    return Object.keys(rpcParameters)
      .reduce((previousValue, currentValue) => {
        return `${previousValue}${currentValue}: ${rpcParameters[currentValue]}\n`;
      }, "")
      .trim();
  }

  const [serverName, setServerName] = useState(server.name);
  const [serverHost, setServerHost] = useState(server.host);
  const [serverPort, setServerPort] = useState(server.port);
  const [serverSecure, setServerSecure] = useState(server.secure);
  const [serverSecret, setServerSecret] = useState(server.secret);
  const [serverRpcParameters, setServerRpcParameters] = useState(deserializeRpcParameters(server.rpcParameters));

  const [validated, setValidated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [alertProps, setAlertProps] = useState(new AlertProps());

  function serializeRpcParameters(rpcParameters: string): Record<string, string> {
    const newRpcParameters: Record<string, string> = {};
    for (const parameter of rpcParameters.trim().split("\n")) {
      const [option, ...values] = parameter.split(/\s*:+\s*/);
      // We need to join on ':' in case the parameter is, for example, proxy: http://localhost:8080
      // option = proxy, values = ["http", "localhost", "8080"]
      const value = values.join(":");
      if (value !== "") {
        newRpcParameters[option] = value;
      }
    }
    return newRpcParameters;
  }

  function serverUrl(): URL | null {
    try {
      return new URL(`http${serverSecure ? "s" : ""}://${serverHost}:${serverPort}/jsonrpc`);
    } catch (_) {
      return null;
    }
  }

  async function onSubmitSaveServer(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    formEvent.stopPropagation();
    const form = formEvent.currentTarget;
    if (form.checkValidity()) {
      try {
        const newExtensionOptions = await extensionOptions.addServer(
          new Server(server.uuid, serverName, serverSecure, serverHost, serverPort, "/jsonrpc", serverSecret, serializeRpcParameters(serverRpcParameters)),
        );
        setExtensionOptions(newExtensionOptions);
        setAlertProps(AlertProps.success(i18n("serverOptionsSuccess")));
      } catch {
        setAlertProps(AlertProps.error(i18n("serverOptionsError")));
      }
      const validationTimeout = 1500; // ms
      window.setTimeout(() => setValidated(false), validationTimeout);
    }
    setValidated(true);
  }

  return (
    <Form className="p-3" noValidate validated={validated} onSubmit={(fe) => onSubmitSaveServer(fe)}>
      {alertProps.show && (
        <Row className="mb-3">
          <Form.Group as={Col} controlId="form-server-name">
            <Alert variant={alertProps.variant} className="mb-0" onClose={() => setAlertProps(new AlertProps())} dismissible>
              {alertProps.message}
            </Alert>
          </Form.Group>
        </Row>
      )}
      <Row className="mb-3">
        <Form.Group as={Col} controlId="form-server-name">
          <Form.Label>{i18n("serverOptionsName")}</Form.Label>
          <Form.Control type="text" value={serverName} required onChange={(e) => setServerName(e.target.value)} />
        </Form.Group>
        <Form.Group as={Col} controlId="form-server-host">
          <Form.Label>{i18n("serverOptionsHost")}</Form.Label>
          <Form.Control type="text" value={serverHost} required onChange={(e) => setServerHost(e.target.value)} />
        </Form.Group>
      </Row>

      <Row className="mb-3">
        <Form.Group as={Col} controlId="form-server-port">
          <Form.Label>{i18n("serverOptionsPort")}</Form.Label>
          <Form.Control type="number" min={0} max={49151} value={serverPort} required onChange={(e) => setServerPort(Number.parseInt(e.target.value, 10))} />
        </Form.Group>

        <Form.Group as={Col} controlId="form-server-secure">
          <Form.Label>{i18n("serverOptionsSecureConnection")}</Form.Label>
          <Form.Check checked={serverSecure} onChange={(e) => setServerSecure(e.target.checked)} />
        </Form.Group>
      </Row>

      <Row className="mb-3">
        <Form.Group as={Col} controlId="form-server-url">
          <Form.Label>{i18n("serverOptionsUrl")}</Form.Label>
          <Form.Control type="text" value={serverUrl()?.toString() ?? ""} disabled={true} />
        </Form.Group>
      </Row>

      <Row className="mb-3">
        <Form.Group as={Col} controlId="form-server-secret">
          <Form.Label>{i18n("serverOptionsSecret")}</Form.Label>
          <InputGroup>
            <Form.Control type={showPassword ? "text" : "password"} value={serverSecret} onChange={(e) => setServerSecret(e.target.value)} />
            <Button variant="outline-secondary" onClick={() => setShowPassword(!showPassword)}>
              <i className={showPassword ? "bi-eye-slash" : "bi-eye"} />
            </Button>
          </InputGroup>
          <Form.Text muted>{i18n("serverOptionsSecretDescription")}</Form.Text>
        </Form.Group>
      </Row>

      <Row className="mb-3">
        <Form.Group as={Col} controlId="form-rpc-parameters">
          <Form.Label>{i18n("serverOptionsRpcParameters")}</Form.Label>
          <Form.Control as="textarea" rows={3} placeholder="split: 5" value={serverRpcParameters} onChange={(e) => setServerRpcParameters(e.target.value)} />
          <Form.Text>{i18n("serverOptionsRpcParametersDescription")}</Form.Text>
        </Form.Group>
      </Row>

      <Row className="mb-3">
        <Col xs={12} sm={12}>
          <Button type="submit" variant="primary">
            {i18n("serverOptionsSave")}
          </Button>
          <Button variant="danger" className="ms-2" onClick={() => deleteServer(server)}>
            {i18n("serverOptionsDelete")}
          </Button>
        </Col>
      </Row>
    </Form>
  );
}

export default ServerOptionsTab;
