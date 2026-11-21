import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Col, Container, Row } from "react-bootstrap";
import type { Server } from "@/domain/server";
import i18n from "@/platform/i18n";
import ServerAddTasks from "@/popup/components/server-add-tasks";
import ServerQuickOptions from "@/popup/components/server-quick-options";
import ServerTask from "@/popup/components/server-task";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/js/bootstrap";
import "./server-tab.css";
import { isOsAndroid } from "@/platform/browser-info";
import { LoadingSpinner } from "@/popup/components/loading-spinner";
import Speeds from "@/popup/components/speeds";
import { useAria2Tasks } from "@/popup/hooks/use-aria2-tasks";
import { createAria2Client } from "@/services/aria2-client";
import { runWithNotification } from "@/services/notify";

interface Props {
  server: Server;
}

function ServerTab({ server }: Props) {
  // The server can be changed elsewhere while the popup is open: reconnect when a setting of the connection changes, but
  // not on a rename or new download parameters.
  const { secure, host, port, path, secret } = server;
  const aria2 = useMemo(() => createAria2Client({ secure, host, port, path, secret }), [secure, host, port, path, secret]);
  const { loading, failed, globalStat, tasks } = useAria2Tasks(aria2);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showQuickOptions, setShowQuickOptions] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  const onClickPurge = () => runWithNotification(() => aria2.purgeDownloadResult(), {});

  const toggleAddTask = useCallback(() => {
    setShowAddTask((prev) => !prev);
    setShowQuickOptions(false);
  }, []);

  const toggleQuickOptions = useCallback(() => {
    setShowQuickOptions((prev) => !prev);
    setShowAddTask(false);
  }, []);

  useEffect(() => {
    void isOsAndroid().then(setIsAndroid);
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  const showTaskList = !showAddTask && !showQuickOptions;

  return (
    <Container fluid>
      <Row>
        <Col xs={6} className="align-self-baseline text-start stats">
          <Speeds downloadSpeed={globalStat.downloadSpeed} uploadSpeed={globalStat.uploadSpeed} />
        </Col>
        <Col xs={6} className="align-self-baseline text-end">
          <Button variant="primary" size="sm" className="btn-left" aria-expanded={showAddTask} onClick={toggleAddTask}>
            {showAddTask ? i18n("serverCancel") : i18n("serverAdd")}
          </Button>
          <Button variant="danger" size="sm" className={isAndroid ? "btn-right" : "btn-middle"} onClick={onClickPurge}>
            {i18n("serverPurge")}
          </Button>
          {!isAndroid && (
            <Button
              variant="secondary"
              size="sm"
              className="btn-right"
              aria-label={i18n("popupQuickOptions")}
              aria-expanded={showQuickOptions}
              onClick={toggleQuickOptions}
            >
              {showQuickOptions ? <i className="bi-caret-left" aria-hidden="true" /> : <i className="bi-gear" aria-hidden="true" />}
            </Button>
          )}
        </Col>
        <Col xs={12}>
          <hr className="mt-2 mb-2" />
        </Col>
      </Row>
      {showAddTask && <ServerAddTasks aria2={aria2} server={server} />}
      {showQuickOptions && <ServerQuickOptions server={server} />}
      {showTaskList && tasks.length === 0 && (
        // A status, so that screen readers announce when the server becomes unreachable.
        <Row role="status">
          <Col xs={12}>
            <em>{failed ? i18n("serverError") : i18n("serverNoTasks")}</em>
          </Col>
        </Row>
      )}
      {showTaskList && tasks.length > 0 && (
        // A list, so that screen readers tell how many downloads there are and move from one to the next.
        <ul className="list-unstyled mb-0">
          {tasks.map((task) => (
            <ServerTask key={task.gid} server={server} aria2={aria2} task={task} />
          ))}
        </ul>
      )}
    </Container>
  );
}

export default ServerTab;
