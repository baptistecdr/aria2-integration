import type Aria2 from "@baptistecdr/aria2";
import { Button } from "react-bootstrap";
import type { Server } from "@/domain/server";
import type { Task } from "@/domain/task";
import i18n from "@/platform/i18n";
import { showNotification } from "@/platform/notifications";
import { captureUrl } from "@/services/capture";
import { useCurrentTab } from "@/shared/ui/current-tab-provider";
import { useExtensionOptions } from "@/shared/ui/extension-options-provider";

interface Props {
  server: Server;
  aria2: Aria2;
  task: Task;
}

function ServerTaskManagement({ server, aria2, task }: Props) {
  const { extensionOptions } = useExtensionOptions();
  const currentTab = useCurrentTab();

  const onClickPlayPauseRetry = async () => {
    try {
      if (task.isActive()) {
        await aria2.call("aria2.pause", task.gid);
      } else if (task.isPaused()) {
        await aria2.call("aria2.unpause", task.gid);
      } else if (task.isError()) {
        await captureUrl(aria2, server, {
          url: task.files[0].uris[0].uri,
          incognito: !!currentTab?.incognito,
          directory: task.dir,
          filename: task.getFilename(),
        });
      }
    } catch (error) {
      console.error(error);
      if (extensionOptions.notifyErrorOccurs) {
        showNotification(i18n("taskActionError"));
      }
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
