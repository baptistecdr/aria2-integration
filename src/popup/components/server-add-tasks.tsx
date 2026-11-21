import { type SubmitEvent, useState } from "react";
import { Button, Col, Form, InputGroup, Row } from "react-bootstrap";
import type { Server } from "@/domain/server";
import i18n from "@/platform/i18n";
import type { Aria2Client } from "@/services/aria2-client";
import { captureTorrentFile, captureUrl } from "@/services/capture";
import { runWithNotification } from "@/services/notify";
import { useCurrentTab } from "@/shared/ui/current-tab-provider";
import { useExtensionOptions } from "@/shared/ui/extension-options-provider";

interface Props {
  aria2: Aria2Client;
  server: Server;
}

const DEFAULT_FORM_FILES = { files: null } as HTMLInputElement;

function ServerAddTasks({ aria2, server }: Props) {
  const { extensionOptions } = useExtensionOptions();
  const [formUrls, setFormUrls] = useState<string[]>([]);
  const [formFiles, setFormFiles] = useState(DEFAULT_FORM_FILES);
  const currentTab = useCurrentTab();

  const incognito = !!currentTab?.incognito;

  const formAddUrlsOnSubmit = (formEvent: SubmitEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    // The form is cleared right away: each URL is reported by its own notification.
    void Promise.all(
      formUrls.map((url) =>
        runWithNotification(() => captureUrl(aria2, server, { url, incognito }), {
          success: extensionOptions.notifyUrlIsAdded ? i18n("addUrlSuccess", server.name) : undefined,
          error: extensionOptions.notifyErrorOccurs ? i18n("addUrlError", server.name) : undefined,
        }),
      ),
    );
    formEvent.currentTarget.reset();
    setFormUrls([]);
  };

  const formAddFilesOnSubmit = (formEvent: SubmitEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (formFiles.files !== null) {
      void Promise.all(
        Array.from(formFiles.files, (file) =>
          runWithNotification(() => captureTorrentFile(aria2, server, file, incognito), {
            success: extensionOptions.notifyFileIsAdded ? i18n("addFileSuccess", server.name) : undefined,
            error: extensionOptions.notifyErrorOccurs ? i18n("addFileError", server.name) : undefined,
          }),
        ),
      );
      formEvent.currentTarget.reset();
      setFormFiles(DEFAULT_FORM_FILES);
    }
  };

  return (
    <Row className="mt-2 gx-0 ps-2 pe-2">
      <Col xs={12} sm={12} className="mb-3">
        <Form onSubmit={formAddUrlsOnSubmit}>
          <Form.Group controlId="form-add-urls">
            <Form.Label>{i18n("addTaskAddUrls")}</Form.Label>
            <InputGroup>
              <Form.Control
                as="textarea"
                rows={5}
                placeholder={i18n("addTaskAddUrlsPlaceholder")}
                value={formUrls.join("\n")}
                onChange={(e) => setFormUrls(e.target.value.split("\n"))}
              />
              <Button type="submit" variant="primary" size="sm">
                {i18n("addTaskAdd")}
              </Button>
            </InputGroup>
          </Form.Group>
        </Form>
      </Col>
      <Col xs={12} sm={12} className="mb-3">
        <Form onSubmit={formAddFilesOnSubmit}>
          <Form.Group controlId="form-add-files">
            <Form.Label>{i18n("addTaskAddFiles")}</Form.Label>
            <InputGroup>
              <Form.Control
                type="file"
                size="sm"
                accept="application/x-bittorrent, .torrent, application/metalink4+xml, application/metalink+xml, .meta4, .metalink"
                onChange={(e) => setFormFiles(e.target as HTMLInputElement)}
                multiple
              />
              <Button type="submit" variant="primary" size="sm">
                {i18n("addTaskAdd")}
              </Button>
            </InputGroup>
          </Form.Group>
        </Form>
      </Col>
    </Row>
  );
}

export default ServerAddTasks;
