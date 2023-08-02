import { Button } from "react-bootstrap";
import { useCallback } from "react";
import { Task } from "../models/task";

interface Props {
  aria2: any;
  task: Task;
}

function ServerTaskManagement({ aria2, task }: Props) {
  const onClickPlayPause = useCallback(() => {
    if (task.isActive()) {
      aria2.call("aria2.pause", task.gid);
    } else {
      aria2.call("aria2.unpause", task.gid);
    }
  }, [aria2, task]);

  const onClickDelete = useCallback(() => {
    if (task.isComplete() || task.isError() || task.isRemoved()) {
      aria2.call("aria2.removeDownloadResult", task.gid);
    } else {
      aria2.call("aria2.remove", task.gid);
    }
  }, [aria2, task]);

  if (task.isActive() || task.isPaused()) {
    return (
      <>
        <Button variant="primary" size="sm" className="btn-left" onClick={onClickPlayPause}>
          {task.isActive() && <i className="bi bi-pause" />}
          {task.isPaused() && <i className="bi bi-play" />}
        </Button>
        <Button variant="danger" size="sm" className="btn-right" onClick={onClickDelete}>
          <i className="bi bi-trash" />
        </Button>
      </>
    );
  }
  return (
    <Button variant="danger" size="sm" onClick={onClickDelete}>
      <i className="bi bi-trash" />
    </Button>
  );
}

export default ServerTaskManagement;
