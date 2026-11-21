import { Button } from "react-bootstrap";
import type { Server } from "@/domain/server";
import { Task } from "@/domain/task";
import i18n from "@/platform/i18n";
import type { Aria2Client } from "@/services/aria2-client";
import { captureUrl } from "@/services/capture";
import { runWithNotification } from "@/services/notify";
import { useCurrentTab } from "@/shared/ui/current-tab-provider";
import { useExtensionOptions } from "@/shared/ui/extension-options-provider";

interface Props {
  server: Server;
  aria2: Aria2Client;
  task: Task;
}

function ServerTaskManagement({ server, aria2, task }: Props) {
  const { extensionOptions } = useExtensionOptions();
  const currentTab = useCurrentTab();

  // The buttons are icons: their names say what they do, and on which task, since every task has the same buttons.
  const filename = Task.filename(task);
  const deleteLabel = i18n("taskDelete", filename);
  const playPauseRetryLabel = () => {
    if (Task.isActive(task)) {
      return i18n("taskPause", filename);
    }
    return Task.isPaused(task) ? i18n("taskResume", filename) : i18n("taskRetry", filename);
  };

  const errorNotification = { error: extensionOptions.notifyErrorOccurs ? i18n("taskActionError") : undefined };

  const playPauseOrRetry = () => {
    if (Task.isActive(task)) {
      return aria2.pause(task.gid);
    }
    if (Task.isPaused(task)) {
      return aria2.unpause(task.gid);
    }
    // Failed: download it again.
    return captureUrl(aria2, server, {
      url: task.files[0].uris[0].uri,
      incognito: !!currentTab?.incognito,
      directory: task.dir,
      filename,
    });
  };

  const onClickPlayPauseRetry = () => runWithNotification(playPauseOrRetry, errorNotification);

  const onClickDelete = () =>
    runWithNotification(() => (Task.isStopped(task) ? aria2.removeDownloadResult(task.gid) : aria2.remove(task.gid)), errorNotification);

  if (Task.isActive(task) || Task.isPaused(task) || Task.isError(task)) {
    return (
      <>
        <Button variant="primary" size="sm" className="btn-left" aria-label={playPauseRetryLabel()} onClick={onClickPlayPauseRetry}>
          {Task.isActive(task) && <i className="bi bi-pause" aria-hidden="true" />}
          {Task.isPaused(task) && <i className="bi bi-play" aria-hidden="true" />}
          {Task.isError(task) && <i className="bi bi-arrow-repeat" aria-hidden="true" />}
        </Button>
        <Button variant="danger" size="sm" className="btn-right" aria-label={deleteLabel} onClick={onClickDelete}>
          <i className="bi bi-trash" aria-hidden="true" />
        </Button>
      </>
    );
  }
  return (
    <Button variant="danger" size="sm" aria-label={deleteLabel} onClick={onClickDelete}>
      <i className="bi bi-trash" aria-hidden="true" />
    </Button>
  );
}

export default ServerTaskManagement;
