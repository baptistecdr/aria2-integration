import { useState } from "react";
import { Button, Col, Form, InputGroup, ListGroup, Row } from "react-bootstrap";
import i18n from "@/i18n";
import type ExtensionOptions from "@/models/extension-options";
import FolderPreset from "@/models/folder-preset";

interface Props {
  extensionOptions: ExtensionOptions;
  setExtensionOptions: React.Dispatch<React.SetStateAction<ExtensionOptions>>;
}

function FolderPresetsEditor({ extensionOptions, setExtensionOptions }: Props) {
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetPath, setNewPresetPath] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPath, setEditPath] = useState("");

  const handleAddPreset = async () => {
    if (!newPresetName.trim() || !newPresetPath.trim()) return;

    const preset = new FolderPreset(undefined, newPresetName.trim(), newPresetPath.trim());
    const newOptions = await extensionOptions.addFolderPreset(preset);
    setExtensionOptions(newOptions);
    setNewPresetName("");
    setNewPresetPath("");
  };

  const handleDeletePreset = async (id: string) => {
    const newOptions = await extensionOptions.deleteFolderPreset(id);
    setExtensionOptions(newOptions);
  };

  const handleStartEdit = (preset: FolderPreset) => {
    setEditingId(preset.id);
    setEditName(preset.name);
    setEditPath(preset.path);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditPath("");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim() || !editPath.trim()) return;

    const updatedPreset = new FolderPreset(editingId, editName.trim(), editPath.trim());
    const newOptions = await extensionOptions.updateFolderPreset(updatedPreset);
    setExtensionOptions(newOptions);
    handleCancelEdit();
  };

  return (
    <>
      <Form.Label>{i18n("extensionOptionsFolderPresets")}</Form.Label>
      <Form.Text className="d-block mb-2 text-muted">{i18n("extensionOptionsFolderPresetsDescription")}</Form.Text>

      {extensionOptions.folderPresets.length > 0 && (
        <ListGroup className="mb-3">
          {extensionOptions.folderPresets.map((preset) => (
            <ListGroup.Item key={preset.id}>
              {editingId === preset.id ? (
                <Row className="g-2 align-items-center">
                  <Col xs={12} md={4}>
                    <Form.Control size="sm" type="text" placeholder={i18n("folderPresetName")} value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </Col>
                  <Col xs={12} md={5}>
                    <Form.Control size="sm" type="text" placeholder={i18n("folderPresetPath")} value={editPath} onChange={(e) => setEditPath(e.target.value)} />
                  </Col>
                  <Col xs={12} md={3} className="d-flex gap-1">
                    <Button size="sm" variant="success" onClick={handleSaveEdit}>
                      <i className="bi bi-check" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleCancelEdit}>
                      <i className="bi bi-x" />
                    </Button>
                  </Col>
                </Row>
              ) : (
                <Row className="align-items-center">
                  <Col xs={12} md={4}>
                    <strong>{preset.name}</strong>
                  </Col>
                  <Col xs={12} md={5}>
                    <code className="text-muted">{preset.path}</code>
                  </Col>
                  <Col xs={12} md={3} className="d-flex gap-1 justify-content-end">
                    <Button size="sm" variant="outline-primary" onClick={() => handleStartEdit(preset)}>
                      <i className="bi bi-pencil" />
                    </Button>
                    <Button size="sm" variant="outline-danger" onClick={() => handleDeletePreset(preset.id)}>
                      <i className="bi bi-trash" />
                    </Button>
                  </Col>
                </Row>
              )}
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}

      <InputGroup className="mb-2">
        <Form.Control type="text" placeholder={i18n("folderPresetNamePlaceholder")} value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} />
        <Form.Control type="text" placeholder={i18n("folderPresetPathPlaceholder")} value={newPresetPath} onChange={(e) => setNewPresetPath(e.target.value)} />
        <Button variant="outline-primary" onClick={handleAddPreset} disabled={!newPresetName.trim() || !newPresetPath.trim()}>
          <i className="bi bi-plus-lg me-1" />
          {i18n("folderPresetAdd")}
        </Button>
      </InputGroup>
    </>
  );
}

export default FolderPresetsEditor;
