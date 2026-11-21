import type Aria2 from "@baptistecdr/aria2";
import { type SubmitEvent, useState } from "react";
import { Button, Col, Form, InputGroup, Row } from "react-bootstrap";
import type { Server } from "@/domain/server";
import i18n from "@/platform/i18n";
import { showNotification } from "@/platform/notifications";
import { captureTorrentFile, captureUrl } from "@/services/capture";
import { useCurrentTab } from "@/shared/ui/current-tab-provider";
import { useExtensionOptions } from "@/shared/ui/extension-options-provider";

interface Props {
  aria2: Aria2;
  server: Server;
}

const DEFAULT_FORM_FILES = { files: null } as HTMLInputElement;

function ServerAddTasks({ aria2, server }: Props) {
  const { extensionOptions } = useExtensionOptions();
  const [formUrls, setFormUrls] = useState<string[]>([]);
  const [formFiles, setFormFiles] = useState(DEFAULT_FORM_FILES);
  const currentTab = useCurrentTab();

  const formAddUrlsOnSubmit = (formEvent: SubmitEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    for (const url of formUrls) {
      captureUrl(aria2, server, { url, incognito: !!currentTab?.incognito })
        .then(() => {
          if (extensionOptions.notifyUrlIsAdded) {
            showNotification(i18n("addUrlSuccess", server.name));
          }
        })
        .catch((error) => {
          console.error(error);
          if (extensionOptions.notifyErrorOccurs) {
            showNotification(i18n("addUrlError", server.name));
          }
        });
    }
    formEvent.currentTarget.reset();
    setFormUrls([]);
  };

  const formAddFilesOnSubmit = (formEvent: SubmitEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (formFiles.files !== null) {
      for (let i = 0; i < formFiles.files.length; i += 1) {
        captureTorrentFile(aria2, server, formFiles.files[i], !!currentTab?.incognito)
          .then(() => {
            if (extensionOptions.notifyFileIsAdded) {
              showNotification(i18n("addFileSuccess", server.name));
            }
          })
          .catch((error) => {
            console.error(error);
            if (extensionOptions.notifyErrorOccurs) {
              showNotification(i18n("addFileError", server.name));
            }
          });
      }
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
