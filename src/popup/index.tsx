import { createRoot } from "react-dom/client";
import * as React from "react";
import { useEffect, useState } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.min";
import "./index.css";
import { Container, Tab, Tabs } from "react-bootstrap";
import i18n from "../i18n";
import ServerTab from "./components/server-tab";
import ExtensionOptions from "../models/extension-options";
import Theme from "../models/theme";

const container = document.getElementById("root");
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(container!);

function Servers() {
  const [extensionOptions, setExtensionOptions] = useState(new ExtensionOptions());
  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    ExtensionOptions.fromStorage().then((result) => {
      setExtensionOptions(result);
      setActiveTab(Object.keys(result.servers)[0] ?? "");
    });
  }, []);

  useEffect(() => {
    if (extensionOptions.theme === Theme.Auto && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.setAttribute("data-bs-theme", Theme.Dark);
    } else {
      document.documentElement.setAttribute("data-bs-theme", extensionOptions.theme);
    }
  }, [extensionOptions]);

  if (Object.keys(extensionOptions.servers).length === 0) {
    return (
      <div className="text-center">
        {i18n("popupNoServerFound1")} <br />
        {i18n("popupNoServerFound2")}
      </div>
    );
  }

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    const storedTheme = extensionOptions.theme;
    if (storedTheme === Theme.Auto) {
      if (e.matches) {
        document.documentElement.setAttribute("data-bs-theme", Theme.Dark);
      } else {
        document.documentElement.setAttribute("data-bs-theme", Theme.Light);
      }
    }
  });

  return (
    <Tabs id="tabs-servers" defaultActiveKey="" activeKey={activeTab} onSelect={(k) => setActiveTab(k ?? "")} className="mb-3">
      {Object.entries(extensionOptions.servers).map(([id, server]) => (
        <Tab key={`tab-${id}`} eventKey={id} title={server.name}>
          <ServerTab key={`server-${id}`} setExtensionOptions={setExtensionOptions} extensionOptions={extensionOptions} server={server} />
        </Tab>
      ))}
    </Tabs>
  );
}

root.render(
  <Container className="p-3" fluid>
    <Servers />
  </Container>,
);
