import React, { ChangeEvent, FormEvent, useCallback, useState } from "react";
import { InputGroup, Form, Button, Col, Row } from "react-bootstrap";
import i18n from "../../i18n";
import { captureTorrentFromFile, captureURL, showNotification } from "../../models/aria2-extension";
import Server from "../../models/server";

interface Props {
  aria2: any;
  server: Server;
}

const DEFAULT_FORM_FILES = { files: null } as HTMLInputElement;

function ServerAddTasks({ aria2, server }: Props) {
  const [formUrls, setFormUrls] = useState([] as string[]);
  const [formFiles, setFormFiles] = useState(DEFAULT_FORM_FILES);

  const formAddUrlsOnSubmit = useCallback(
    (formEvent: FormEvent<HTMLFormElement>) => {
      formEvent.preventDefault();
      formUrls.forEach(async (url) => {
        captureURL(aria2, server, url, "", "")
          .then(() => {
            showNotification(i18n("addUrlSuccess", server.name));
          })
          .catch(() => {
            showNotification(i18n("addUrlError", server.name));
          });
      });
      formEvent.currentTarget.reset();
      setFormUrls([]);
    },
    [aria2, formUrls, server],
  );

  const onChangeInputFiles = useCallback((e: ChangeEvent) => {
    setFormFiles(e.target as HTMLInputElement);
  }, []);

  const formAddFilesOnSubmit = useCallback(
    (formEvent: FormEvent<HTMLFormElement>) => {
      formEvent.preventDefault();
      if (formFiles.files !== null) {
        for (let i = 0; i < formFiles.files.length; i += 1) {
          captureTorrentFromFile(aria2, server, formFiles.files[i])
            .then(() => {
              showNotification(i18n("addFileSuccess", server.name));
            })
            .catch(() => {
              showNotification(i18n("addFileError", server.name));
            });
        }
        formEvent.currentTarget.reset();
        setFormFiles(DEFAULT_FORM_FILES);
      }
    },
    [aria2, formFiles.files, server],
  );

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
                onChange={onChangeInputFiles}
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
