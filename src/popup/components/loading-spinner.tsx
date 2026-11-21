import { Col, Container, Row } from "react-bootstrap";
import i18n from "@/platform/i18n";

export function LoadingSpinner() {
  return (
    <Container fluid>
      <Row>
        <Col xs={12} className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">{i18n("popupLoading")}</span>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
