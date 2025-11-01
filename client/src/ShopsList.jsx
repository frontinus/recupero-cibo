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

  // Logged-in view (enhanced layout)
  return (
    <div className="logged-in-shops-view">
      {/* Page Header */}
      <div className="mb-4">
        <h3 className="mb-2">
          <i className="bi bi-shop me-2 text-primary"></i>
          Available Establishments
        </h3>
        <p className="text-muted mb-0">Select a shop to view and reserve available bags</p>
      </div>

      <div className="row">
        {/* Shops List - Enhanced styling */}
        <div className="col-lg-5 col-xl-4 mb-4 mb-lg-0">
          <div className="shops-list-container p-3 bg-white rounded shadow-sm" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">
                <i className="bi bi-list-ul me-2"></i>
                Shops
              </h5>
              <Badge bg="secondary" pill>{shops?.length || 0}</Badge>
            </div>
            <ListGroup variant="flush">
              {shops && shops.length > 0 ? (
                shops.map((shop) => (
                  <ListGroup.Item
                    key={shop.Shopid}
                    action
                    active={selectedShop?.Shopid === shop.Shopid}
                    onClick={() => handleShopClick(shop)}
                    className="border-0 rounded mb-2"
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedShop?.Shopid === shop.Shopid ? '#667eea' : '#f8f9fa',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <i className="bi bi-shop me-2"></i>
                        <strong>{shop.ShopName}</strong>
                      </div>
                      {shop.Boxes && shop.Boxes.length > 0 && (
                        <Badge 
                          bg={selectedShop?.Shopid === shop.Shopid ? "light" : "primary"} 
                          text={selectedShop?.Shopid === shop.Shopid ? "dark" : "white"}
                          pill
                        >
                          {shop.Boxes.length}
                        </Badge>
                      )}
                    </div>
                  </ListGroup.Item>
                ))
              ) : (
                <ListGroup.Item className="border-0 text-muted text-center">
                  <i className="bi bi-inbox me-2"></i>
                  No shops available.
                </ListGroup.Item>
              )}
            </ListGroup>
          </div>
        </div>

        {/* Shop Details */}
        <div className="col-lg-7 col-xl-8">
          <div className="shop-details-container">
            {selectedShop ? (
              <div className="bg-white rounded shadow-sm p-4">
                <ShopItem shop={selectedShop} />
                <Tabs defaultActiveKey="boxes" id="shop-details-tabs" className="mb-3">
                  <Tab 
                    eventKey="boxes" 
                    title={
                      <span>
                        <i className="bi bi-box-seam me-2"></i>
                        Available Bags
                      </span>
                    }
                  >
                    {loadingBoxes ? (
                      <div className="text-center py-5">
                        <Spinner animation="border" role="status" variant="primary">
                          <span className="visually-hidden">Loading boxes...</span>
                        </Spinner>
                        <p className="text-muted mt-3">Loading bags...</p>
                      </div>
                    ) : error ? (
                      <Alert variant="danger" className="mt-3">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        {error}
                      </Alert>
                    ) : shopBoxes.length === 0 ? (
                      <Alert variant="info" className="mt-3">
                        <i className="bi bi-info-circle me-2"></i>
                        No bags available at this shop right now.
                      </Alert>
                    ) : (
                      <BoxesList filteredBoxes={shopBoxes} />
                    )}
                  </Tab>
                </Tabs>
              </div>
            ) : (
              <div className="text-center py-5 bg-white rounded shadow-sm">
                <i className="bi bi-arrow-left-circle" style={{ fontSize: '3rem', color: '#667eea' }}></i>
                <h5 className="mt-3 text-muted">
                  {shops && shops.length === 0 ? 'No shops available.' : 'Select a shop to view details'}
                </h5>
                <p className="text-muted">Choose a shop from the list to see available bags</p>
              </div>
            )}
          </div>
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

// Shop item component (enhanced for logged-in view)
function ShopItem({ shop }) {
  return (
    <div className='mb-4'>
      <Card className="border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Card.Body className="text-white">
          <Row className="align-items-center">
            <Col>
              <div className="d-flex align-items-center mb-2">
                <i className="bi bi-shop-window me-2" style={{ fontSize: '1.5rem' }}></i>
                <h4 className="mb-0">{shop.ShopName}</h4>
              </div>
              <div className="ms-4">
                <div className="mb-1">
                  <i className="bi bi-geo-alt-fill me-2"></i>
                  {shop.Adress}
                </div>
                <div className="mb-1">
                  <i className="bi bi-telephone-fill me-2"></i>
                  {shop.Phone_nb}
                </div>
                <Badge bg="light" text="dark" className="mt-2">
                  <i className="bi bi-tag-fill me-1"></i>
                  {shop.Food_type}
                </Badge>
              </div>
            </Col>
            {shop.Boxes && shop.Boxes.length > 0 && (
              <Col xs="auto" className="text-center">
                <div className="bg-white bg-opacity-25 rounded p-3">
                  <h2 className="mb-0">{shop.Boxes.length}</h2>
                  <small>Available Bags</small>
                </div>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
}

export { ShopsList };