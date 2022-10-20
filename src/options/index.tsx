import { createRoot } from "react-dom/client";
import * as React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.min";
import "./index.css";
import { useCallback, useEffect, useState } from "react";
import { Container, Tab, Tabs } from "react-bootstrap";
import ExtensionOptionsTab from "./components/extension-options-tab";
import ServerOptionsTab from "./components/server-options-tab";
import ExtensionOptions from "../models/extension-options";
import Server from "../models/server";

const container = document.getElementById("root");
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(container!);

const ADD_SERVER_TAB = "add-server";
const EXTENSION_OPTIONS_TAB = "extension-options";

function Options() {
  const defaultActiveTab = EXTENSION_OPTIONS_TAB;
  const [activeTab, setActiveTab] = useState(defaultActiveTab);
  const [extensionOptions, setExtensionOptions] = useState(new ExtensionOptions());

  useEffect(() => {
    ExtensionOptions.fromStorage().then((result) => {
      setExtensionOptions(result);
    });
  }, []);

  async function addServer() {
    const server = new Server();
    const newExtensionOptions = await extensionOptions.addServer(server);
    setExtensionOptions(newExtensionOptions);
    setActiveTab(server.uuid);
  }

  const deleteServer = useCallback(
    async (server: Server) => {
      const newExtensionOptions = await extensionOptions.deleteServer(server);
      setExtensionOptions(newExtensionOptions);
      const serversKeys = Object.keys(newExtensionOptions.servers);
      if (serversKeys.length === 0) {
        setActiveTab(EXTENSION_OPTIONS_TAB);
      } else {
        setActiveTab(serversKeys[0]);
      }
    },
    [extensionOptions]
  );

  return (
    <Tabs
      id="tabs-servers-options"
      defaultActiveKey={defaultActiveTab}
      activeKey={activeTab}
      onSelect={async (k) => {
        if (k === ADD_SERVER_TAB) {
          await addServer();
        } else {
          setActiveTab(k ?? defaultActiveTab);
        }
      }}
    >
      {Object.entries(extensionOptions.servers).map(([id, server]) => (
        <Tab eventKey={id} title={server.name}>
          <ServerOptionsTab
            extensionOptions={extensionOptions}
            setExtensionOptions={setExtensionOptions}
            server={server}
            deleteServer={deleteServer}
          />
        </Tab>
      ))}
      <Tab eventKey={ADD_SERVER_TAB} title="+" />
      <Tab eventKey={EXTENSION_OPTIONS_TAB} title="Options">
        <ExtensionOptionsTab servers={extensionOptions.servers} />
      </Tab>
    </Tabs>
  );
}

root.render(
  <Container className="p-3" fluid>
    <Options />
  </Container>
);
