import React, { useState, useContext, useEffect } from 'react';
import { ListGroup, ListGroupItem, Badge, Container, Row, Col, Tabs, Tab, Spinner, Alert } from 'react-bootstrap';
import { BoxesList } from './BoxesList';
import { shopsContext } from './Miscellaneous';
import { API } from './API';
import { Box } from './Box';

function ShopsList() {
  const [selectedShop, setSelectedShop] = useState(null);
  const shops = useContext(shopsContext);
  
  const [shopBoxes, setShopBoxes] = useState([]);
  const [loadingBoxes, setLoadingBoxes] = useState(false);
  const [error, setError] = useState(null);

  const handleShopClick = (shop) => {
    setSelectedShop(shop);
  };

  // This hook fetches boxes whenever the selected shop changes
  useEffect(() => {
    if (!selectedShop) {
      setShopBoxes([]); // Clear boxes if no shop is selected
      return;
    }

    setLoadingBoxes(true);
    setError(null);

    // Call the API to get boxes for this specific shop
    API.fetchBoxesByShop(selectedShop.Shopid)
      .then(b => {
        // Map the raw box data to Box objects
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

  }, [selectedShop]); // Re-runs every time 'selectedShop' changes

  return (
    <div className="row">
      {/* Column for the shop list */}
      <div className="col-4">
        <ListGroup> {/* <-- Re-added ListGroup */}
          {shops && shops.length > 0 ? (
            shops.map((shop) => (
              <ListGroupItem
                key={shop.Shopid}
                action // This makes it clickable
                active={selectedShop?.Shopid === shop.Shopid} // Check for active state
                onClick={() => handleShopClick(shop)}
              >
                {shop.ShopName}
              </ListGroupItem>
            ))
          ) : (
            <ListGroupItem>No shops available.</ListGroupItem>
          )}
        </ListGroup>
      </div>

      {/* Column for the shop details and boxes */}
      <div className="col-8">
        <div className="tab-content">
          {selectedShop ? (
            <>
              <div className="tab-pane fade show active">
                <ShopItem shop={selectedShop} />
                <Tabs defaultActiveKey="boxes" id="shop-details-tabs" className="mb-3">
                  <Tab eventKey="boxes" title="Boxes">
                    {/* Updated logic to show loading/error/boxes */}
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
                  {/* You could add more tabs here, e.g., <Tab title="Shop Info">...</Tab> */}
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

// ShopItem component (unchanged, but still needed)
function ShopItem({ shop }) {
  return (
    <div className='mb-3'> {/* Added margin-bottom */}
      <Row>
        <Col>
          <Container className='p-0'> {/* Removed padding */}
            <Row>
              <Col md="auto" className="align-self-center">
                <h5>{shop.ShopName}</h5> {/* Made name bigger */}
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
      {/* Removed the <hr /> to use the Tabs component's border */}
    </div>
  );
}

export { ShopsList };