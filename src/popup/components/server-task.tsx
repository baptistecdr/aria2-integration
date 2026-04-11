import type Aria2 from "@baptistecdr/aria2";
import { filesize } from "filesize";
import { Duration } from "luxon";
import { useId } from "react";
import { Col, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import browser from "webextension-polyfill";
import i18n from "@/i18n";
import type Server from "@/models/server";
import ServerTaskManagement from "@/popup/components/server-task-management";
import type { Task } from "@/popup/models/task";

interface Props {
  server: Server;
  aria2: Aria2;
  task: Task;
}

const FILESIZE_BASE = { base: 2 } as const;
const PROGRESS_TEXT_COLOR_THRESHOLD = 55;

function formatETA(seconds: number): string {
  const milliseconds = seconds * 1000;
  const duration = Duration.fromMillis(milliseconds, {
    locale: browser.i18n.getUILanguage(),
  });
  return duration.toISOTime()?.replace(/\.\d{3}$/, "") ?? "";
}

function ServerTask({ server, aria2, task }: Props) {
  const filename = task.getFilename();

  const progressPercent = task.totalLength > 0 ? Math.round((task.completedLength * 100) / task.totalLength) : 0;

  const getProgressVariant = () => {
    if (task.status === "error") {
      return "danger";
    } else if (task.status === "complete") {
      return "success";
    } else if (task.status === "paused") {
      return "warning";
    } else {
      return "primary";
    }
  };

  const capitalizedStatus = task.status.charAt(0).toUpperCase() + task.status.slice(1);
  const status = i18n(`taskStatus${capitalizedStatus}`);

  const eta = task.downloadSpeed !== 0 ? formatETA((task.totalLength - task.completedLength) / task.downloadSpeed) : "∞";

  const progressTextColor = progressPercent <= PROGRESS_TEXT_COLOR_THRESHOLD ? "inherit" : "white";

  return (
    <Row className="mt-2 gx-0 ps-2 pe-2 small">
      <Col xs={9}>
        <Row>
          <Col xs={12} sm={12} className="align-self-start text-start text-truncate fw-bold">
            <OverlayTrigger
              key="bottom"
              placement="top"
              overlay={
                <Tooltip id={useId()}>
                  <small>{filename}</small>
                </Tooltip>
              }
            >
              <span>{filename}</span>
            </OverlayTrigger>
          </Col>
          <Col xs={12} sm={12} className="align-self-start ps-4 text-start">
            {status}, {filesize(task.completedLength, FILESIZE_BASE)} / {filesize(task.totalLength, FILESIZE_BASE)}
            {task.isActive() && `, ${eta}`}
          </Col>
          {task.isActive() && (
            <Col xs={12} sm={12} className="align-self-start ps-4 text-start">
              {task.connections} {i18n("taskConnections")}, <i className="bi-arrow-down" /> {filesize(task.downloadSpeed, FILESIZE_BASE)}/s -{" "}
              <i className="bi-arrow-up" /> {filesize(task.uploadSpeed, FILESIZE_BASE)}/s
            </Col>
          )}
        </Row>
      </Col>
      <Col xs={3} sm={3} className="align-self-start text-end">
        <ServerTaskManagement server={server} aria2={aria2} task={task} />
      </Col>
      <Col xs={12} sm={12}>
        <div className="progress position-relative">
          <div
            className={`progress-bar bg-${getProgressVariant()}`}
            role="progressbar"
            style={{ width: `${progressPercent}%` }}
            aria-valuenow={progressPercent * 10}
            aria-valuemin={0}
            aria-valuemax={1000}
          />
          <small className="justify-content-center d-flex position-absolute w-100" style={{ color: progressTextColor }}>
            {progressPercent} %
          </small>
        </div>
      </Col>
    </Row>
  );
}

export default ServerTask;
