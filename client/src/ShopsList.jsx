import React, { useState, useContext, useEffect } from 'react';
import { ListGroup, Badge, Container, Row, Col, Tabs, Tab, Spinner, Alert, Card } from 'react-bootstrap';
import { BoxesList } from './BoxesList';
import { shopsContext, userContext } from './Miscellaneous';
import { API } from './API';
import { Box } from './Box';

function ShopsList() {
  const [selectedShop, setSelectedShop] = useState(null);
  const shops = useContext(shopsContext);
  const user = useContext(userContext);
  
  const [shopBoxes, setShopBoxes] = useState([]);
  const [loadingBoxes, setLoadingBoxes] = useState(false);
  const [error, setError] = useState(null);

  const handleShopClick = (shop) => {
    setSelectedShop(shop);
  };

  useEffect(() => {
    if (!selectedShop) {
      setShopBoxes([]);
      return;
    }

    setLoadingBoxes(true);
    setError(null);

    API.fetchBoxesByShop(selectedShop.Shopid)
      .then(b => {
        setShopBoxes(
          b.map(box => new Box(
            box.ID,
            box.Type,
            box.Size,
            box.Price,
            box.Retrieve_time_span,
            box.Is_owned,
            box.Contents
          ))
        );
      })
      .catch(err => {
        console.error("Error fetching boxes:", err);
        setError("Failed to load boxes for this shop.");
      })
      .finally(() => {
        setLoadingBoxes(false);
      });

  }, [selectedShop]);

  // If user is not logged in, show enhanced public view
  if (!user) {
    return <PublicShopsView shops={shops} />;
  }

  // Logged-in view (keep existing layout)
  return (
    <div className="row">
      <div className="col-4">
        <ListGroup>
          {shops && shops.length > 0 ? (
            shops.map((shop) => (
              <ListGroup.Item
                key={shop.Shopid}
                action
                active={selectedShop?.Shopid === shop.Shopid}
                onClick={() => handleShopClick(shop)}
              >
                {shop.ShopName}
              </ListGroup.Item>
            ))
          ) : (
            <ListGroup.Item>No shops available.</ListGroup.Item>
          )}
        </ListGroup>
      </div>

      <div className="col-8">
        <div className="tab-content">
          {selectedShop ? (
            <>
              <div className="tab-pane fade show active">
                <ShopItem shop={selectedShop} />
                <Tabs defaultActiveKey="boxes" id="shop-details-tabs" className="mb-3">
                  <Tab eventKey="boxes" title="Boxes">
                    {loadingBoxes ? (
                      <div className="text-center mt-3">
                        <Spinner animation="border" role="status">
                          <span className="visually-hidden">Loading boxes...</span>
                        </Spinner>
                      </div>
                    ) : error ? (
                      <Alert variant="danger" className="mt-3">
                        {error}
                      </Alert>
                    ) : (
                      <BoxesList filteredBoxes={shopBoxes} />
                    )}
                  </Tab>
                </Tabs>
              </div>
            </>
          ) : (
            <div className="pt-5 text-center text-muted">
              {shops && shops.length === 0 ? 'No shops available.' : 'Select a shop to view details.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// NEW: Enhanced public view component
function PublicShopsView({ shops }) {
  const [selectedShop, setSelectedShop] = useState(null);

  return (
    <Container fluid className="px-0">
      {/* Hero Section */}
      <Row className="mb-4">
        <Col>
          <div className="p-4 rounded" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <h2 className="mb-2">
              <i className="bi bi-basket2-fill me-2"></i>
              Rescue Surplus Food
            </h2>
            <p className="mb-0" style={{ opacity: 0.9 }}>
              Browse participating establishments and help reduce food waste. 
              <strong> Login to reserve bags!</strong>
            </p>
          </div>
        </Col>
      </Row>

      {/* Shops Grid */}
      <Row className="g-4">
        {shops && shops.length > 0 ? (
          shops.map((shop) => (
            <Col key={shop.Shopid} xs={12} md={6} lg={4}>
              <Card 
                className="h-100 shadow-sm hover-card"
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: selectedShop?.Shopid === shop.Shopid ? '2px solid #667eea' : '1px solid #dee2e6'
                }}
                onClick={() => setSelectedShop(selectedShop?.Shopid === shop.Shopid ? null : shop)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 0.125rem 0.25rem rgba(0,0,0,0.075)';
                }}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <Card.Title className="mb-1 h5">
                        <i className="bi bi-shop me-2 text-primary"></i>
                        {shop.ShopName}
                      </Card.Title>
                      <Badge bg="secondary" pill style={{ fontSize: '0.75rem' }}>
                        {shop.Food_type}
                      </Badge>
                    </div>
                    {shop.Boxes && shop.Boxes.length > 0 && (
                      <Badge bg="success" pill style={{ fontSize: '0.85rem' }}>
                        {shop.Boxes.length} {shop.Boxes.length === 1 ? 'bag' : 'bags'}
                      </Badge>
                    )}
                  </div>

                  <div className="text-muted small">
                    <div className="mb-2">
                      <i className="bi bi-geo-alt-fill me-2"></i>
                      {shop.Adress}
                    </div>
                    <div>
                      <i className="bi bi-telephone-fill me-2"></i>
                      {shop.Phone_nb}
                    </div>
                  </div>

                  {selectedShop?.Shopid === shop.Shopid && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid #dee2e6' }}>
                      <div className="text-center">
                        <i className="bi bi-lock-fill me-2 text-muted"></i>
                        <small className="text-muted">Login to view available bags and reserve</small>
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : (
          <Col xs={12}>
            <Alert variant="info" className="text-center">
              <i className="bi bi-info-circle me-2"></i>
              No participating establishments at the moment. Check back soon!
            </Alert>
          </Col>
        )}
      </Row>

      {/* Info Banner */}
      <Row className="mt-5">
        <Col>
          <Card className="border-0" style={{ backgroundColor: '#f8f9fa' }}>
            <Card.Body className="text-center py-4">
              <h5 className="mb-3">
                <i className="bi bi-heart-fill text-danger me-2"></i>
                How It Works
              </h5>
              <Row className="g-3">
                <Col md={4}>
                  <div className="p-3">
                    <div className="display-6 text-primary mb-2">
                      <i className="bi bi-person-circle"></i>
                    </div>
                    <h6>1. Login</h6>
                    <small className="text-muted">Create an account or sign in</small>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="p-3">
                    <div className="display-6 text-success mb-2">
                      <i className="bi bi-bag-check"></i>
                    </div>
                    <h6>2. Reserve Bags</h6>
                    <small className="text-muted">Choose surprise or regular bags</small>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="p-3">
                    <div className="display-6 text-warning mb-2">
                      <i className="bi bi-clock"></i>
                    </div>
                    <h6>3. Pick Up</h6>
                    <small className="text-muted">Collect during the time window</small>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

// Shop item component (for logged-in view)
function ShopItem({ shop }) {
  return (
    <div className='mb-3'>
      <Row>
        <Col>
          <Container className='p-0'>
            <Row>
              <Col md="auto" className="align-self-center">
                <h5>{shop.ShopName}</h5>
              </Col>
              <Col md="auto" style={{ "borderLeft": "1px solid #ccc", "paddingLeft": "1rem" }}>
                <Badge bg="secondary" pill>
                  {shop.Food_type}
                </Badge>
              </Col>
            </Row>
          </Container>
          <span className="d-block text-muted">
            <i className="bi bi-geo-alt-fill me-1"></i>
            {shop.Adress}
          </span>
          <span className="d-block text-muted">
            <i className="bi bi-telephone-fill me-1"></i>
            {shop.Phone_nb}
          </span>
        </Col>
      </Row>
    </div>
  );
}

export { ShopsList };