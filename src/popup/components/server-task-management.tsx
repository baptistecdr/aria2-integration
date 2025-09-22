import { Button } from "react-bootstrap";
import { captureURL } from "@/models/aria2-extension";
import type Server from "@/models/server";
import type { Task } from "@/popup/models/task";

interface Props {
  server: Server;
  aria2: any;
  task: Task;
}

function ServerTaskManagement({ server, aria2, task }: Props) {
  const onClickPlayPauseRetry = () => {
    if (task.isActive()) {
      aria2.call("aria2.pause", task.gid);
    } else if (task.isPaused()) {
      aria2.call("aria2.unpause", task.gid);
    } else if (task.isError()) {
      captureURL(aria2, server, task.files[0].uris[0].uri, "", "", task.dir, task.getFilename());
    }
  };

  const onClickDelete = () => {
    if (task.isComplete() || task.isError() || task.isRemoved()) {
      aria2.call("aria2.removeDownloadResult", task.gid);
    } else {
      aria2.call("aria2.remove", task.gid);
    }
  };

  if (task.isActive() || task.isPaused() || task.isError()) {
    return (
      <>
        <Button variant="primary" size="sm" className="btn-left" aria-label="play-pause-retry" onClick={onClickPlayPauseRetry}>
          {task.isActive() && <i className="bi bi-pause" />}
          {task.isPaused() && <i className="bi bi-play" />}
          {task.isError() && <i className="bi bi-arrow-repeat" />}
        </Button>
        <Button variant="danger" size="sm" className="btn-right" aria-label="delete" onClick={onClickDelete}>
          <i className="bi bi-trash" />
        </Button>
      </>
    );
  }
  return (
    <Button variant="danger" size="sm" aria-label="delete" onClick={onClickDelete}>
      <i className="bi bi-trash" />
    </Button>
  );
}

export default ServerTaskManagement;
