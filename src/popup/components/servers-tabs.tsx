import { useId, useState } from "react";
import { Tab, Tabs } from "react-bootstrap";
import i18n from "@/platform/i18n";
import ServerTab from "@/popup/components/server-tab";
import { useExtensionOptions } from "@/shared/ui/extension-options-provider";

function ServersTabs() {
  const { extensionOptions } = useExtensionOptions();
  const [selectedTab, setSelectedTab] = useState("");

  const tabServersId = useId();

  // Every options change creates new server objects: the selected server stays active as long as it exists.
  const serverIds = Object.keys(extensionOptions.servers);
  const activeTab = serverIds.includes(selectedTab) ? selectedTab : (serverIds[0] ?? "");

  if (serverIds.length === 0) {
    return (
      <div className="text-center">
        {i18n("popupNoServerFound1")} <br />
        {i18n("popupNoServerFound2")}
      </div>
    );
  }

  return (
    <Tabs id={tabServersId} defaultActiveKey="" activeKey={activeTab} onSelect={(k) => setSelectedTab(k ?? "")} className="mb-3" mountOnEnter unmountOnExit>
      {Object.entries(extensionOptions.servers).map(([id, server]) => (
        <Tab key={`tab-${id}`} eventKey={id} title={server.name}>
          <ServerTab key={`server-${id}`} server={server} />
        </Tab>
      ))}
    </Tabs>
  );
}

export default ServersTabs;
