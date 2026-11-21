import { Form } from "react-bootstrap";
import i18n from "@/platform/i18n";

interface Props {
  managed: boolean;
}

// Tells why a field can't be changed: an enterprise policy sets it.
function ManagedHint({ managed }: Props) {
  if (!managed) {
    return null;
  }
  return (
    <Form.Text className="d-block" muted>
      <i className="bi bi-lock" aria-hidden="true" /> {i18n("managedByPolicy")}
    </Form.Text>
  );
}

export default ManagedHint;
