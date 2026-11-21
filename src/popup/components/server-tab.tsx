import { filesize } from "filesize";
import { useCallback, useEffect, useState } from "react";
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
import { useAria2Tasks } from "@/popup/hooks/use-aria2-tasks";
import { createAria2Client } from "@/services/aria2-client";

const FILESIZE_BASE = { base: 2 } as const;

interface Props {
  server: Server;
}

function ServerTab({ server }: Props) {
  const [aria2] = useState(() => createAria2Client(server));
  const { loading, failed, globalStat, tasks } = useAria2Tasks(aria2);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showQuickOptions, setShowQuickOptions] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  const onClickPurge = () => {
    aria2.purgeDownloadResult();
  };

  const toggleAddTask = useCallback(() => {
    setShowAddTask((prev) => !prev);
    setShowQuickOptions(false);
  }, []);

  const toggleQuickOptions = useCallback(() => {
    setShowQuickOptions((prev) => !prev);
    setShowAddTask(false);
  }, []);

  useEffect(() => {
    isOsAndroid().then(setIsAndroid);
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  const showTaskList = !showAddTask && !showQuickOptions;

  return (
    <Container fluid>
      <Row>
        <Col xs={6} className="align-self-baseline text-start stats">
          <i className="bi-arrow-down" /> {filesize(globalStat.downloadSpeed, FILESIZE_BASE)}/s - <i className="bi-arrow-up" />{" "}
          {filesize(globalStat.uploadSpeed, FILESIZE_BASE)}/s
        </Col>
        <Col xs={6} className="align-self-baseline text-end">
          <Button variant="primary" size="sm" className="btn-left" onClick={toggleAddTask}>
            {showAddTask ? i18n("serverCancel") : i18n("serverAdd")}
          </Button>
          <Button variant="danger" size="sm" className={isAndroid ? "btn-right" : "btn-middle"} onClick={onClickPurge}>
            {i18n("serverPurge")}
          </Button>
          {!isAndroid && (
            <Button variant="secondary" size="sm" className="btn-right" aria-label="quick-options" onClick={toggleQuickOptions}>
              {showQuickOptions ? <i className="bi-caret-left" /> : <i className="bi-gear" />}
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
        <Row>
          <Col xs={12}>
            <em>{failed ? i18n("serverError") : i18n("serverNoTasks")}</em>
          </Col>
        </Row>
      )}
      {showTaskList && tasks.map((task) => <ServerTask key={task.gid} server={server} aria2={aria2} task={task} />)}
    </Container>
  );
}

export default ServerTab;
