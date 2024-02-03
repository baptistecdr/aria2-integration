import { Col, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import { Duration } from "luxon";
import browser from "webextension-polyfill";
import { filesize, FileSizeOptionsBase } from "filesize";
import Server from "@/models/server";
import { Task } from "../models/task";
import ServerTaskManagement from "./server-task-management";
import i18n from "../../i18n";

interface Props {
  server: Server;
  aria2: any;
  task: Task;
}

function ServerTask({ server, aria2, task }: Props) {
  const filesizeParameters = { base: 2 } as FileSizeOptionsBase;

  function toFirstUppercase(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function getProgressVariant(): string {
    if (task.isComplete()) {
      return "success";
    }
    if (task.isError() || task.isRemoved()) {
      return "danger";
    }
    if (task.isPaused() || task.isWaiting()) {
      return "warning";
    }
    return "primary";
  }

  function getStatus() {
    const firstUppercaseStatus = toFirstUppercase(task.status);
    return i18n(`taskStatus${firstUppercaseStatus}`);
  }

  function formatETA(seconds: number): string {
    const milliseconds = seconds * 1000;
    const duration = Duration.fromMillis(milliseconds, {
      locale: browser.i18n.getUILanguage(),
    });
    return duration.toISOTime()?.replace(/\.\d{3}$/, "") ?? "";
  }

  function getETA(): string {
    if (task.downloadSpeed !== 0) {
      return formatETA((task.totalLength - task.completedLength) / task.downloadSpeed);
    }
    return "∞";
  }

  function getDownloadPer(per: number): number {
    return Math.round((task.completedLength * per) / task.totalLength) || 0;
  }

  return (
    <Row className="mt-2 gx-0 ps-2 pe-2 small">
      <Col xs={9}>
        <Row>
          <Col xs={12} sm={12} className="align-self-start text-start text-truncate fw-bold">
            <OverlayTrigger
              key="bottom"
              placement="top"
              overlay={
                <Tooltip id="tooltip-bottom">
                  <small>{task.getFilename()}</small>
                </Tooltip>
              }
            >
              <span>{task.getFilename()}</span>
            </OverlayTrigger>
          </Col>
          <Col xs={12} sm={12} className="align-self-start ps-4 text-start">
            <>
              {getStatus()}, {filesize(task.completedLength, filesizeParameters)} / {filesize(task.totalLength, filesizeParameters)}
              {task.isActive() && `, ${getETA()}`}
            </>
          </Col>
          {task.isActive() && (
            <Col xs={12} sm={12} className="align-self-start ps-4 text-start">
              <>
                {task.connections} {i18n("taskConnections")}, <i className="bi-arrow-down" /> {filesize(task.downloadSpeed, filesizeParameters)}/s -{" "}
                <i className="bi-arrow-up" /> {filesize(task.uploadSpeed, filesizeParameters)}/s
              </>
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
            style={{ width: `${getDownloadPer(100)}%` }}
            aria-valuenow={getDownloadPer(1000)}
            aria-valuemin={0}
            aria-valuemax={1000}
          />
          <small
            className="justify-content-center d-flex position-absolute w-100"
            style={{
              color: `${getDownloadPer(100) <= 55 ? "inherit" : "white"}`,
            }}
          >
            {getDownloadPer(100)} %
          </small>
        </div>
      </Col>
    </Row>
  );
}

export default ServerTask;
