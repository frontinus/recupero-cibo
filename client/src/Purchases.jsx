import { useContext, useState, useEffect } from "react";
import { Badge, Button, Col, ListGroup, OverlayTrigger, Row, Spinner, Tooltip, Tab, Nav, Alert } from "react-bootstrap";
import { purchasesActivitiesContext, userContext, waitingContext, SmallRoundButton } from "./Miscellaneous";
import { API } from "./API";
import { Box } from "./Box";

// Main Purchases Component (Right side panel)
function Purchases() {
  const [selectedItem, setSelectedItem] = useState(null);
  const user = useContext(userContext);

  // State for box details fetched from API
  const [purchasedBoxDetails, setPurchasedBoxDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch box details when the user's purchase list changes
  useEffect(() => {
    // If user is not logged in or has no purchase list, don't fetch
    if (!user || user.purchases === undefined) {
      setPurchasedBoxDetails([]);
      setSelectedItem(null); // Clear selection if user logs out or list becomes undefined
      setLoading(false);
      return;
    }

    // If purchase list is empty, don't fetch
    if (user.purchases.length === 0) {
      setPurchasedBoxDetails([]);
      setSelectedItem(null); // Clear selection if list becomes empty
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    API.fetchBoxesByIds(user.purchases)
      .then(b => {
        // Map API data to Box objects, ensuring Contents is an array
        const newBoxDetails = b.map(box => new Box(
          box.ID, box.Type, box.Size, box.Price,
          box.Retrieve_time_span, box.Is_owned,
          box.Contents || []
        ));
        console.log("Purchases: Setting new purchasedBoxDetails:", JSON.stringify(newBoxDetails, null, 2)); // Debug log
        setPurchasedBoxDetails(newBoxDetails);

        // --- Explicitly update selectedItem if it exists ---
        // Find the updated version of the currently selected item
        // Use selectedItem directly from state before the update finishes
        const currentSelectedId = selectedItem?.ID;
        if (currentSelectedId) {
            const updatedSelectedItem = newBoxDetails.find(box => box.ID === currentSelectedId);
            if (updatedSelectedItem) {
                // Only update if the object reference or contents might have changed
                // This check might be overly simple, might need deep comparison if issues persist
                if (updatedSelectedItem !== selectedItem) {
                     console.log("Purchases: Explicitly updating selectedItem state with fetched data.");
                     setSelectedItem(updatedSelectedItem); // Update selectedItem state too
                }
            } else {
                // Item was removed entirely? Clear selection.
                console.log(`Purchases: Previously selected item ${currentSelectedId} no longer in list, clearing selection.`);
                setSelectedItem(null);
            }
        }
        // --- End explicit update ---

      })
      .catch(err => {
        console.error("Error fetching purchased box details:", err);
        setError("Could not load your purchased boxes.");
        setPurchasedBoxDetails([]); // Clear details on error
        setSelectedItem(null);    // Clear selection on error
      })
      .finally(() => setLoading(false));

  }, [user]); // Re-run when user object changes

  return (
    <>
      {/* Render Toolbar only if user exists */}
      { user && <Toolbar state={user.purchases === undefined ? "create" : "edit"} edited={user.purchasesEdited}/> }

      {/* Conditional rendering based on state */}
      {loading ? (
        <Row className="justify-content-center mt-3">
          <Col md="auto"><Spinner animation="border" /></Col>
        </Row>
      ) : error ? (
        <Alert variant="danger" className="mt-3">{error}</Alert>
      ) : (!user || !user.purchases || user.purchases.length === 0) ? (
        // Only show "No purchases" if the user is logged in
        user ? (
            <Row className="justify-content-center text-muted mt-4">
              <Col md="auto" className="text-center">
                <i className="bi bi-cart-x" style={{"fontSize": "3rem"}}/>
                <p><em>No purchases yet :)</em></p>
              </Col>
            </Row>
        ) : null // Don't show anything if not logged in (handled by parent component)

      ) : (
        // Display list and details if loaded and purchases exist
        <Row className="ms-0 mt-2">
          <Col>
            <PurchasesList boxes={purchasedBoxDetails} onItemSelected={setSelectedItem} />
            {selectedItem && (
              <PurchasesDetails
                selectedItem={selectedItem}
                // Ensure key uses a value that changes ONLY when the item identity changes
                // If ID is stable even after update, this key is fine.
                key={selectedItem.ID}
              />
            )}
          </Col>
        </Row>
      )}
    </>
  );
}

// --- Toolbar Component (Handles Save Button) ---
function Toolbar(props) {
  const [saving, setSaving] = useState(false);
  const waiting = useContext(waitingContext);
  const purchasea = useContext(purchasesActivitiesContext);

  const savePurchase = () => {
    setSaving(true);
    purchasea.savePurchaseChanges()
      .catch(err => {
        console.error("Save failed:", err);
        // Add user feedback here, e.g., using an Alert or Toast
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

// --- List of Purchased Boxes ---
function PurchasesList(props) {
  const [selectedItemId, setSelectedItemId] = useState(null);

  // If the list of boxes changes (e.g., after save/refetch),
  // ensure the selected ID still exists in the new list.
  useEffect(() => {
      if (selectedItemId !== null && !props.boxes.some(box => box.ID === selectedItemId)) {
          setSelectedItemId(null);
          props.onItemSelected(null); // Notify parent that selection is cleared
      }
  }, [props.boxes, selectedItemId, props.onItemSelected]);


  const handleItemClick = (box) => {
    setSelectedItemId(box.ID);
    props.onItemSelected(box);
  };

  return (
    <ListGroup>
      {props.boxes.map((box) => (
        <ListGroup.Item
          key={box.ID}
          active={selectedItemId === box.ID}
          onClick={() => handleItemClick(box)}
          as="div" // Render as a div to fix nesting issue
          style={{ cursor: 'pointer' }} // Add cursor style manually
        >
          <PurchasesListItem box={box} />
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
}


// --- Use THIS version of PurchasesDetails in Purchases.jsx ---
function PurchasesDetails({ selectedItem }) {
    const ap = useContext(purchasesActivitiesContext);
    const waiting = useContext(waitingContext);

    // Get removed names directly from context for this box
    // This reflects the LOCAL, UNSAVED changes
    const removedItemNames = ap.getRemovedItemsForBox?.(selectedItem.ID) || [];

    // Calculate max removable based on the contents *currently* shown in the prop,
    // plus those marked for removal in context state. This determines the denominator.
    const currentItemCount = selectedItem.Contents.length;
    // Estimate original count for denominator calculation
    const estimatedOriginalCount = currentItemCount + removedItemNames.filter(name => !selectedItem.Contents.some(item => item.name === name)).length;
    const maxRemovableItems = Math.min(2, estimatedOriginalCount); // Denominator based on original count, capped at 2

    const handleRemoveClick = (contentObject) => { ap.handleItemRemoval?.(selectedItem.ID, contentObject.name); };
    const handleAddClick = (contentObject) => { ap.handleItemReAddition?.(selectedItem.ID, contentObject.name); };

    // Determine button state based on context (local changes)
    const getButtonState = (itemName) => {
      const isLocallyRemoved = removedItemNames.includes(itemName); // Check local unsaved state
      const canRemoveMore = removedItemNames.length < 2;
      if (isLocallyRemoved) {
          // If marked for removal locally, show Add (+) button
          return { type: 'add', disabled: waiting };
      } else {
          // Otherwise, show Remove (-) button if allowed
          const canRemove = selectedItem.Type === "Normal" && canRemoveMore && !waiting;
          return { type: 'remove', disabled: !canRemove };
      }
    };

    return (
        <div className="mt-3 border rounded p-3">
            <Tab.Container id={`details-tab-${selectedItem.ID}`} defaultActiveKey="details">
                <Row>
                     {/* Nav Column */}
                    <Col sm={4}>
                       <Nav variant="pills" className="flex-column">
                           <Nav.Item><Nav.Link eventKey="details">Details</Nav.Link></Nav.Item>
                       </Nav>
                    </Col>
                    {/* Content Column */}
                    <Col sm={8}>
                        <Tab.Content>
                            <Tab.Pane eventKey="details">
                                <div>
                                    {/* Box Details */}
                                    <p><b>ID:</b> {selectedItem.ID}</p>
                                    <p><b>Type:</b> {selectedItem.Type}</p>
                                    <p><b>Price:</b> ${selectedItem.Price}</p>
                                    <p><b>Retrieve:</b> {selectedItem.Retrieve_time_span}</p>

                                    {selectedItem.Type === "Normal" && (
                                        <div>
                                            <p className="mb-1"><b>Contents:</b></p>
                                            {/* Render ONLY items currently in selectedItem.Contents prop */}
                                            {selectedItem.Contents.length === 0 ? (
                                                <em className="text-muted">Bag is empty.</em>
                                            ) : (
                                                <ul className="list-unstyled mb-1">
                                                    {selectedItem.Contents.map((content) => {
                                                        const buttonState = getButtonState(content.name);
                                                        // Determine if locally marked removed FOR BUTTON DISPLAY ONLY
                                                        const isLocallyMarkedRemoved = removedItemNames.includes(content.name);

                                                        return (
                                                            <li key={`${selectedItem.ID}-${content.name}`} className="d-flex justify-content-between align-items-center mb-1">
                                                                {/* Render item text normally (no strike-through) */}
                                                                <span>
                                                                    {content.quantity} x {content.name}
                                                                </span>
                                                                {/* Show +/- button based on LOCAL removed state */}
                                                                 {isLocallyMarkedRemoved ? (
                                                                    // This state should ideally not happen if prop is correct,
                                                                    // but show Add(+) if context says removed
                                                                    <AddContentButton handleAddContent={() => handleAddClick(content)} disabled={buttonState.disabled}/>
                                                                ) : (
                                                                    <RemoveContentButton handleRemoveContent={() => handleRemoveClick(content)} disabled={buttonState.disabled} />
                                                                )}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                            {/* Counter: Numerator from context (local changes), Denominator calculated */}
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
            disabled={disabled} // Use passed disabled prop
            onClick={handleRemoveContent}
        />
    );
}

// --- NEW Button for ADDING Content Item Back ---
function AddContentButton({ handleAddContent, disabled }) {
    const inner = <i className="bi bi-plus"/>;
    const variant = "success";
    return (
        <SmallRoundButton
            inner={inner}
            variant={variant}
            tooltip={"Undo remove"}
            disabled={disabled} // Use passed disabled prop
            onClick={handleAddContent}
        />
    );
}

// --- Individual Item in the Purchases List ---
function PurchasesListItem(props) {
  const pa = useContext(purchasesActivitiesContext);
  const waiting = useContext(waitingContext);

  const removeButton = <Button
    variant="link"
    className="text-danger p-0" // Style as red link, remove padding
    style={{"fontSize": "0.9rem"}}
    onClick={(e) => {
      e.stopPropagation(); // Prevent ListGroup item click triggering selection
      pa.removeBoxFromPurchases(props.box.ID);
    }}
    disabled={waiting} // Only disable when globally waiting
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
      </Col>
      <Col xs="auto">
        {removeButton}
      </Col>
    </Row>
  );
}

export { Purchases };