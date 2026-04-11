import { Col, Container, Row } from "react-bootstrap";

export function LoadingSpinner() {
  return (
    <Container fluid>
      <Row>
        <Col xs={12} className="d-flex justify-content-center">
          <div className="spinner-border text-primary">
            <span className="visually-hidden"></span>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
