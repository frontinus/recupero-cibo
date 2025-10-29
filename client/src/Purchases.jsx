import { useContext, useState, useEffect } from "react";
import { Badge, Button, Col, ListGroup, Row, Spinner, Tab, Nav, Alert } from "react-bootstrap";
import { purchasesActivitiesContext, userContext, waitingContext, SmallRoundButton } from "./Miscellaneous";
import { API } from "./API";
import { Box } from "./Box";

function Purchases() {
  const [selectedItem, setSelectedItem] = useState(null);
  const user = useContext(userContext);

  const [purchasedBoxDetails, setPurchasedBoxDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // NEW: Track unavailable boxes for highlighting
  const [unavailableBoxes, setUnavailableBoxes] = useState([]);

  useEffect(() => {
    if (!user || user.purchases === undefined) {
      setPurchasedBoxDetails([]);
      setSelectedItem(null);
      setLoading(false);
      return;
    }

    if (user.purchases.length === 0) {
      setPurchasedBoxDetails([]);
      setSelectedItem(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    API.fetchBoxesByIds(user.purchases)
      .then(b => {
        const newBoxDetails = b.map(box => new Box(
          box.ID, box.Type, box.Size, box.Price,
          box.Retrieve_time_span, box.Is_owned,
          box.Contents || []
        ));
        console.log("Purchases: Setting new purchasedBoxDetails:", JSON.stringify(newBoxDetails, null, 2));
        setPurchasedBoxDetails(newBoxDetails);

        const currentSelectedId = selectedItem?.ID;
        if (currentSelectedId) {
            const updatedSelectedItem = newBoxDetails.find(box => box.ID === currentSelectedId);
            if (updatedSelectedItem) {
                if (updatedSelectedItem !== selectedItem) {
                     console.log("Purchases: Explicitly updating selectedItem state with fetched data.");
                     setSelectedItem(updatedSelectedItem);
                }
            } else {
                console.log(`Purchases: Previously selected item ${currentSelectedId} no longer in list, clearing selection.`);
                setSelectedItem(null);
            }
        }
      })
      .catch(err => {
        console.error("Error fetching purchased box details:", err);
        setError("Could not load your purchased boxes.");
        setPurchasedBoxDetails([]);
        setSelectedItem(null);
      })
      .finally(() => setLoading(false));

  }, [user]);

  // NEW: Effect to clear unavailable boxes after 5 seconds
  useEffect(() => {
    if (unavailableBoxes.length > 0) {
      const timer = setTimeout(() => {
        setUnavailableBoxes([]);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [unavailableBoxes]);

  return (
    <>
      { user && <Toolbar 
          state={user.purchases === undefined ? "create" : "edit"} 
          edited={user.purchasesEdited}
          onUnavailableBoxes={setUnavailableBoxes}
        /> 
      }

      {loading ? (
        <Row className="justify-content-center mt-3">
          <Col md="auto"><Spinner animation="border" /></Col>
        </Row>
      ) : error ? (
        <Alert variant="danger" className="mt-3">{error}</Alert>
      ) : (!user || !user.purchases || user.purchases.length === 0) ? (
        user ? (
            <Row className="justify-content-center text-muted mt-4">
              <Col md="auto" className="text-center">
                <i className="bi bi-cart-x" style={{"fontSize": "3rem"}}/>
                <p><em>No purchases yet :)</em></p>
              </Col>
            </Row>
        ) : null
      ) : (
        <Row className="ms-0 mt-2">
          <Col>
            <PurchasesList 
              boxes={purchasedBoxDetails} 
              onItemSelected={setSelectedItem}
              unavailableBoxes={unavailableBoxes}
            />
            {selectedItem && (
              <PurchasesDetails
                selectedItem={selectedItem}
                key={`${selectedItem.ID}-${JSON.stringify(selectedItem.Contents)}`}
              />
            )}
          </Col>
        </Row>
      )}
    </>
  );
}

// UPDATED: Toolbar now handles save errors and communicates unavailable boxes
function Toolbar(props) {
  const [saving, setSaving] = useState(false);
  const waiting = useContext(waitingContext);
  const purchasea = useContext(purchasesActivitiesContext);

  const savePurchase = () => {
    setSaving(true);
    purchasea.savePurchaseChanges()
      .catch(err => {
        console.error("Save failed:", err);
        
        // NEW: Extract unavailable box IDs from error message
        if (Array.isArray(err)) {
          const unavailableMatch = err[0]?.match(/Box (\d+) is no longer available/);
          if (unavailableMatch) {
            const boxId = parseInt(unavailableMatch[1], 10);
            props.onUnavailableBoxes([boxId]);
          }
        }
      })
      .finally(() => setSaving(false));
  };

  return (
    <Row className="justify-content-end rounded-pill mb-1 align-items-center" style={{
      backgroundColor: "#f8f9fA",
      margin: "0px",
      padding: "0.2rem 0.25rem 0.2rem 1rem"
    }}>
      <Col xs="auto" className="align-self-center">
        <Badge pill bg="secondary">Bought Boxes</Badge>
      </Col>
      <Col xs="auto" className="p-0">
        <Button
          variant="success"
          className="rounded-pill"
          disabled={!props.edited || waiting || saving}
          style={{ height: "100%", minWidth: "80px" }}
          onClick={savePurchase}
        >
          {saving ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true"/>
              <span className="visually-hidden">Saving...</span>
            </>
          ) : "Save"}
        </Button>
      </Col>
    </Row>
  );
}

// UPDATED: PurchasesList now highlights unavailable boxes
function PurchasesList(props) {
  const [selectedItemId, setSelectedItemId] = useState(null);

  useEffect(() => {
      if (selectedItemId !== null && !props.boxes.some(box => box.ID === selectedItemId)) {
          setSelectedItemId(null);
          props.onItemSelected(null);
      }
  }, [props.boxes, selectedItemId, props.onItemSelected]);

  const handleItemClick = (box) => {
    setSelectedItemId(box.ID);
    props.onItemSelected(box);
  };

  return (
    <ListGroup>
      {props.boxes.map((box) => {
        // NEW: Check if this box is unavailable
        const isUnavailable = props.unavailableBoxes?.includes(box.ID);
        
        return (
          <ListGroup.Item
            key={box.ID}
            active={selectedItemId === box.ID}
            onClick={() => handleItemClick(box)}
            as="div"
            style={{ 
              cursor: 'pointer',
              // NEW: Highlight unavailable boxes
              backgroundColor: isUnavailable ? '#f8d7da' : undefined,
              borderColor: isUnavailable ? '#f5c2c7' : undefined,
              transition: 'all 0.3s ease'
            }}
          >
            <PurchasesListItem box={box} isUnavailable={isUnavailable} />
          </ListGroup.Item>
        );
      })}
    </ListGroup>
  );
}

function PurchasesDetails({ selectedItem }) {
    const ap = useContext(purchasesActivitiesContext);
    const waiting = useContext(waitingContext);

    const displayedContents = ap.getFilteredContentsForBox?.(selectedItem.ID) || selectedItem.Contents || [];
    const removedItemNames = ap.getRemovedItemsForBox?.(selectedItem.ID) || [];
    const originalContents = ap.originalBoxContents?.[selectedItem.ID] || selectedItem.Contents || [];
    const maxRemovableItems = Math.min(2, originalContents.length);

    const handleRemoveClick = (contentObject) => { 
        ap.handleItemRemoval?.(selectedItem.ID, contentObject.name); 
    };
    
    const handleAddClick = (itemName) => { 
        ap.handleItemReAddition?.(selectedItem.ID, itemName); 
    };

    const canRemoveMore = removedItemNames.length < 2;

    return (
        <div className="mt-3 border rounded p-3">
            <Tab.Container id={`details-tab-${selectedItem.ID}`} defaultActiveKey="details">
                <Row>
                    <Col sm={4}>
                       <Nav variant="pills" className="flex-column">
                           <Nav.Item><Nav.Link eventKey="details">Details</Nav.Link></Nav.Item>
                       </Nav>
                    </Col>
                    <Col sm={8}>
                        <Tab.Content>
                            <Tab.Pane eventKey="details">
                                <div>
                                    <p><b>ID:</b> {selectedItem.ID}</p>
                                    <p><b>Type:</b> {selectedItem.Type}</p>
                                    <p><b>Price:</b> ${selectedItem.Price}</p>
                                    <p><b>Retrieve:</b> {selectedItem.Retrieve_time_span}</p>

                                    {selectedItem.Type === "Normal" && (
                                        <div>
                                            <p className="mb-1"><b>Contents:</b></p>
                                            
                                            {displayedContents.length === 0 ? (
                                                <em className="text-muted">Bag is empty.</em>
                                            ) : (
                                                <ul className="list-unstyled mb-1">
                                                    {displayedContents.map((content) => (
                                                        <li key={`${selectedItem.ID}-${content.name}`} className="d-flex justify-content-between align-items-center mb-1">
                                                            <span>
                                                                {content.quantity} x {content.name}
                                                            </span>
                                                            <RemoveContentButton 
                                                                handleRemoveContent={() => handleRemoveClick(content)} 
                                                                disabled={!canRemoveMore || waiting} 
                                                            />
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            
                                            {removedItemNames.length > 0 && (
                                                <>
                                                    <p className="mb-1 mt-2"><b>Removed Items:</b></p>
                                                    <ul className="list-unstyled mb-1">
                                                        {removedItemNames.map((itemName) => {
                                                            const originalItem = originalContents.find(item => item.name === itemName);
                                                            const quantity = originalItem?.quantity || 1;
                                                            
                                                            return (
                                                                <li key={`removed-${selectedItem.ID}-${itemName}`} className="d-flex justify-content-between align-items-center mb-1">
                                                                    <span className="text-decoration-line-through text-muted">
                                                                        {quantity} x {itemName}
                                                                    </span>
                                                                    <AddContentButton 
                                                                        handleAddContent={() => handleAddClick(itemName)} 
                                                                        disabled={waiting}
                                                                    />
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </>
                                            )}
                                            
                                            <p className="text-muted small mt-2 mb-0">
                                                 Removed: {removedItemNames.length}/{maxRemovableItems}
                                            </p>
                                        </div>
                                    )}
                                    {selectedItem.Type === "Surprise" && (
                                        <p className="text-muted"><em>Contents are a surprise!</em></p>
                                    )}
                                </div>
                            </Tab.Pane>
                        </Tab.Content>
                    </Col>
                </Row>
            </Tab.Container>
        </div>
    );
}

function RemoveContentButton({ handleRemoveContent, disabled }) {
    const inner = <i className="bi bi-dash"/>;
    const variant = "danger";
    return (
        <SmallRoundButton
            inner={inner}
            variant={variant}
            tooltip={"Remove item"}
            disabled={disabled}
            onClick={handleRemoveContent}
        />
    );
}

function AddContentButton({ handleAddContent, disabled }) {
    const inner = <i className="bi bi-plus"/>;
    const variant = "success";
    return (
        <SmallRoundButton
            inner={inner}
            variant={variant}
            tooltip={"Add back to bag"}
            disabled={disabled}
            onClick={handleAddContent}
        />
    );
}

// UPDATED: Show unavailable badge
function PurchasesListItem(props) {
  const pa = useContext(purchasesActivitiesContext);
  const waiting = useContext(waitingContext);

  const removeButton = <Button
    variant="link"
    className="text-danger p-0"
    style={{"fontSize": "0.9rem"}}
    onClick={(e) => {
      e.stopPropagation();
      pa.removeBoxFromPurchases(props.box.ID);
    }}
    disabled={waiting}
  >Remove</Button>;

  return (
    <Row className="align-items-center">
      <Col xs="auto">
        <Badge bg="secondary" pill>
          <tt>{props.box.ID}</tt>
        </Badge>
      </Col>
      <Col style={{"borderLeft": "1px solid #ccc", "paddingLeft": "0.75rem"}}>
        ${props.box.Price}
        {" "}
        <Badge bg="light" text="dark" pill>
          {props.box.Type}
        </Badge>
        {/* NEW: Show unavailable badge */}
        {props.isUnavailable && (
          <>
            {" "}
            <Badge bg="danger" pill>
              Unavailable
            </Badge>
          </>
        )}
      </Col>
      <Col xs="auto">
        {removeButton}
      </Col>
    </Row>
  );
}

export { Purchases };