import { Form } from "react-bootstrap";
import i18n from "@/platform/i18n";

interface Props {
  managed: boolean;
  // Referenced by the aria-describedby of the field, so that screen readers read the hint with it.
  id?: string;
}

// Tells why a field can't be changed: an enterprise policy sets it.
function ManagedHint({ managed, id }: Props) {
  if (!managed) {
    return null;
  }
  return (
    <Form.Text id={id} className="d-block" muted>
      <i className="bi bi-lock" aria-hidden="true" /> {i18n("managedByPolicy")}
    </Form.Text>
  );
}

export default ManagedHint;
