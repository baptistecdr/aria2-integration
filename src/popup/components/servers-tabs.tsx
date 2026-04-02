import { useEffect, useId, useState } from "react";
import { Tab, Tabs } from "react-bootstrap";
import { useExtensionOptions } from "@/extension-options-provider";
import i18n from "@/i18n";
import ServerTab from "@/popup/components/server-tab";

function ServersTabs() {
  const { extensionOptions } = useExtensionOptions();
  const [activeTab, setActiveTab] = useState("");

  const tabServersId = useId();

  useEffect(() => {
    setActiveTab(Object.keys(extensionOptions.servers)[0] ?? "");
  }, [extensionOptions.servers]);

  if (Object.keys(extensionOptions.servers).length === 0) {
    return (
      <div className="text-center">
        {i18n("popupNoServerFound1")} <br />
        {i18n("popupNoServerFound2")}
      </div>
    );
  }

  return (
    <Tabs id={tabServersId} defaultActiveKey="" activeKey={activeTab} onSelect={(k) => setActiveTab(k ?? "")} className="mb-3">
      {Object.entries(extensionOptions.servers).map(([id, server]) => (
        <Tab key={`tab-${id}`} eventKey={id} title={server.name}>
          <ServerTab key={`server-${id}`} server={server} />
        </Tab>
      ))}
    </Tabs>
  );
}

export default ServersTabs;
