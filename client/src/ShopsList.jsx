import React, { useState, useContext } from 'react';
import { ListGroup, ListGroupItem, Badge, Container, Row, Col, Tabs, Tab } from 'react-bootstrap';
import { BoxesList } from './BoxesList';
import { boxesContext, shopsContext } from './Miscellaneous';

function ShopsList() {
  const [selectedShop, setSelectedShop] = useState(null);
  const shops = useContext(shopsContext);
  const boxs = useContext(boxesContext)

  const handleShopClick = (shop) => {
    setSelectedShop(shop);
  };

  return (
    <div className="row">
      <div className="col-4">
        <div className="list-group">
          {shops && shops.length > 0 ? (
            shops.map((shop, index) => (
              <ListGroupItem
                key={shop.Shopid}
                className={`list-group-item-action ${selectedShop === shop ? 'active' : ''}`}
                onClick={() => handleShopClick(shop)}
              >
                {shop.ShopName}
              </ListGroupItem>
            ))
          ) : (
            <p>No shops available.</p>
          )}
        </div>
      </div>
      <div className="col-8">
        <div className="tab-content">
          {selectedShop ? (
            <>
              <div className="tab-pane fade show active">
                <ShopItem shop={selectedShop} />
                <Tabs defaultActiveKey="boxes" id="shop-details-tabs">
                  <Tab eventKey="boxes" title="Boxes">
                    {/* Include the filtered BoxesList component here */}
                    <FilteredBoxesList shop={selectedShop} boxes={boxs} />
                  </Tab>
                  {/* Add more tabs as needed for other details */}
                </Tabs>
              </div>
            </>
          ) : (
            <div className="tab-pane fade" role="tabpanel">
              {shops && shops.length === 0 ? 'No shops available.' : 'Select a shop to view details.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShopItem({ shop }) {
  return (
    <div>
      <Row>
        <Col>
          <Container>
            <Row>
              <Col md="auto" className="align-self-center" style={{ color: "blue" }}>
                {shop.Food_type}
              </Col>
              <Col md="auto" style={{ "borderLeft": "1px solid grey", color: "green" }}>
                {shop.ShopName}
              </Col>
            </Row>
          </Container>
          <strong>
            <Badge bg="light" pill style={{ "color": "black" }}>
              Phone number: {shop.Phone_nb}
            </Badge>
          </strong>
          <br />
          <em style={{ "color": "red" }}>Address: </em>
          <strong>
            {shop.Adress}
          </strong>
        </Col>
      </Row>
      <hr style={{ width: "100%" }} />
    </div>
  );
}

function FilteredBoxesList({ shop,boxes }) {
  // Filter the boxes based on the IDs in the Boxes field of the selected shop
  const filteredBoxes = shop.Boxes.map(boxID => boxes.find(box => box.ID === boxID));
  return <BoxesList filteredBoxes={filteredBoxes} />;
}

export { ShopsList };
