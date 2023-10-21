import { Button } from "react-bootstrap";
import { Task } from "../models/task";

interface Props {
  aria2: any;
  task: Task;
}

function ServerTaskManagement({ aria2, task }: Props) {
  const onClickPlayPause = () => {
    if (task.isActive()) {
      aria2.call("aria2.pause", task.gid);
    } else {
      aria2.call("aria2.unpause", task.gid);
    }
  };

  const onClickDelete = () => {
    if (task.isComplete() || task.isError() || task.isRemoved()) {
      aria2.call("aria2.removeDownloadResult", task.gid);
    } else {
      aria2.call("aria2.remove", task.gid);
    }
  };

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
