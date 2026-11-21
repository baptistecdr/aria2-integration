import { filesize } from "filesize";
import { Duration } from "luxon";
import { useEffect, useId, useRef, useState } from "react";
import { Col, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import type { Server } from "@/domain/server";
import { Task, TaskStatus } from "@/domain/task";
import i18n, { getUILanguage, type MessageKey } from "@/platform/i18n";
import ServerTaskManagement from "@/popup/components/server-task-management";
import Speeds from "@/popup/components/speeds";
import type { Aria2Client } from "@/services/aria2-client";

interface Props {
  server: Server;
  aria2: Aria2Client;
  task: Task;
}

const FILESIZE_BASE = { base: 2 } as const;
const PROGRESS_TEXT_COLOR_THRESHOLD = 55;

const STATUS_MESSAGES: Record<TaskStatus, MessageKey> = {
  [TaskStatus.Active]: "taskStatusActive",
  [TaskStatus.Complete]: "taskStatusComplete",
  [TaskStatus.Error]: "taskStatusError",
  [TaskStatus.Paused]: "taskStatusPaused",
  [TaskStatus.Removed]: "taskStatusRemoved",
  [TaskStatus.Waiting]: "taskStatusWaiting",
};

function formatETA(seconds: number): string {
  const milliseconds = seconds * 1000;
  const duration = Duration.fromMillis(milliseconds, {
    locale: getUILanguage(),
  });
  return duration.toISOTime()?.replace(/\.\d{3}$/, "") ?? "";
}

function ServerTask({ server, aria2, task }: Props) {
  const filename = Task.filename(task);
  const filenameRef = useRef<HTMLDivElement>(null);
  const [truncated, setTruncated] = useState(false);

  // Only a truncated name needs the keyboard focus (to open its tooltip): not every task adds a tab stop.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the name changes what is truncated.
  useEffect(() => {
    const element = filenameRef.current;
    if (!element) {
      return;
    }
    const measure = () => setTruncated(element.scrollWidth > element.clientWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [filename]);

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

  const status = i18n(STATUS_MESSAGES[task.status]);

  const eta = task.downloadSpeed !== 0 ? formatETA((task.totalLength - task.completedLength) / task.downloadSpeed) : "∞";

  // Once the bar is under the percentage, the text must contrast with the bar: white, except on the light yellow of
  // paused tasks, where only black text reaches the WCAG contrast ratio (like Bootstrap's text-bg-warning).
  const progressVariant = getProgressVariant();
  let progressTextColor = "inherit";
  if (progressPercent > PROGRESS_TEXT_COLOR_THRESHOLD) {
    progressTextColor = progressVariant === "warning" ? "var(--bs-black)" : "white";
  }

  return (
    <Row as="li" className="mt-2 gx-0 ps-2 pe-2 small">
      <Col xs={9}>
        <Row>
          <Col ref={filenameRef} xs={12} sm={12} className="align-self-start text-start text-truncate fw-bold">
            <OverlayTrigger
              key="bottom"
              placement="top"
              overlay={
                <Tooltip id={useId()}>
                  <small>{filename}</small>
                </Tooltip>
              }
            >
              <span tabIndex={truncated ? 0 : undefined}>{filename}</span>
            </OverlayTrigger>
          </Col>
          <Col xs={12} sm={12} className="align-self-start ps-4 text-start">
            {status}, {filesize(task.completedLength, FILESIZE_BASE)} / {filesize(task.totalLength, FILESIZE_BASE)}
            {Task.isActive(task) && `, ${eta}`}
          </Col>
          {Task.isActive(task) && (
            <Col xs={12} sm={12} className="align-self-start ps-4 text-start">
              {task.connections} {i18n("taskConnections")}, <Speeds downloadSpeed={task.downloadSpeed} uploadSpeed={task.uploadSpeed} />
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
            className={`progress-bar bg-${progressVariant}`}
            role="progressbar"
            style={{ width: `${progressPercent}%` }}
            aria-label={i18n("taskProgress", filename)}
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
          {/* The progress bar already gives the percentage to screen readers. */}
          <small aria-hidden="true" className="justify-content-center d-flex position-absolute w-100" style={{ color: progressTextColor }}>
            {progressPercent} %
          </small>
        </div>
      </Col>
    </Row>
  );
}

export default ServerTask;
