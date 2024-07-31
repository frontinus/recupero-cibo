import { useContext, useState } from "react";
import { Badge, Button, Col, Form, ListGroup, OverlayTrigger, Popover, Row, Spinner, Tooltip, Tab, Nav} from "react-bootstrap";
import { boxesContext, purchasesActivitiesContext, userContext, waitingContext,SmallRoundButton,contentContext} from "./Miscellaneous";

function Purchases() {
  const [selectedItem, setSelectedItem] = useState(null);
  const boxes = useContext(boxesContext);
  const user = useContext(userContext);
  // Get the list of boxes in the purchases
  const Purchasedboxes = boxes != undefined ? boxes.filter(c => user.purchases?.includes(c.ID)) : [];
  return (
    <>
    <Toolbar state={user.purchases == undefined ? "create" : "edit"} edited={user.purchasesEdited}/>
    {
      user.purchases == undefined ?
        <>
          <Row className="justify-content-center" style={{"color": "grey"}}>
            <Col md="auto">
              <i className="bi bi-code-slash" style={{"fontSize": "3rem"}}/>
            </Col>
          </Row>
          <Row className="justify-content-center" style={{"color": "grey"}}>
            <Col md="auto">
              <em>No purchases yet :)</em>
            </Col>
          </Row>
        </>
      :
        <Row style={{"marginLeft": "0px", "marginTop": "0.8rem"}}>
          <Col xs={6}>
            <PurchasesList boxes={Purchasedboxes} onItemSelected={setSelectedItem} />
            <Row>
              {selectedItem ? <PurchasesDetails selectedItem={selectedItem} /> : null}
              
            </Row>
          </Col>
        </Row>
    }
    </>
  );
}

function Toolbar(props) {
  const [saving, setSaving] = useState(false);
  const waiting = useContext(waitingContext);
  const purchasea = useContext(purchasesActivitiesContext);

  const savePurchase = () => {
    setSaving(true);
    purchasea.savePurchaseChanges()
      .then(() => setSaving(false));
  };

  return (
    <Row className="justify-content-end rounded-pill mb-1" style={{
      "backgroundColor": "#f8f9fA",
      "margin": "0px",
      "paddingTop": "0.2rem",
      "paddingBottom": "0.2rem",
      "paddingLeft": "1rem",
      "paddingRight": "4px"
    }}>
      <Col sm="auto" className="align-self-center">
        <Badge pill bg="secondary">bought boxes</Badge>
      </Col>
      
      <Col md="auto" style={{"padding": "0px"}}>
        <Button variant="success" className="rounded-pill" disabled={!props.edited || waiting} style={{"height": "100%", "minWidth": "100px"}} onClick={savePurchase}>
          {
            saving ?
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
                <span className="visually-hidden">Saving...</span>
              </>
            : "Save"
          }
        </Button>
      </Col>
    </Row>
  );
}


function PurchasesList(props) {
  const [selectedItem, setSelectedItem] = useState(null);

  const handleItemClick = (box) => {
    setSelectedItem(box);
    props.onItemSelected(box);
  };
  return (
    <ListGroup>
      {props.boxes != undefined ? props.boxes.map((box) => (
        <ListGroup.Item
          key={box.ID}
          onClick={() => handleItemClick(box)}
          active={selectedItem && selectedItem.ID === box.ID}
          style={{ cursor: "pointer", backgroundColor: selectedItem && selectedItem.ID === box.ID ? "blue" : "" }}
        >
          <PurchasesListItem box={box} />
        </ListGroup.Item>
      )) : ""}
    </ListGroup>
  );
}
function PurchasesDetails({ selectedItem }) {
  const [contents, setContents] = useState(selectedItem.Contents);
  const ap = useContext(purchasesActivitiesContext)
  const handleRemoveContent = (index) => {
    const updatedContents = contents.filter((_, i) => i !== index);
    const removedComp = contents.filter((_, i) => i == index);
    setContents(updatedContents);
    selectedItem.RC = selectedItem.RC +1
    ap.saveContentsChanges(selectedItem.ID,removedComp)
  };
return (
  <Tab.Container id="details-tab" defaultActiveKey="details">
    <Row>
      <Col>
        <Nav variant="pills" className="flex-column">
          <Nav.Item>
            <Nav.Link eventKey="details">Details</Nav.Link>
          </Nav.Item>
          {/* Add more tabs as needed */}
        </Nav>
      </Col>
      <Col>
        <Tab.Content>
          <Tab.Pane eventKey="details">
            {selectedItem ? (
              <div>
                {/* Render details based on selectedItem */}
                <p>ID: {selectedItem.ID}</p>
                <p>Type: {selectedItem.Type}</p>
                <p>Price: {selectedItem.Price}</p>
                <p>Retrieve_span: {selectedItem.Retrieve_time_span}</p>
                {selectedItem.Type === "Normal" ? (
                  <div>
                    <p>Contents:</p>
                    <ul>
                      {contents.map((content, index) => (
                        <li key={index}>
                          {content}
                          {
                           (selectedItem.Is_owned && selectedItem.RC<2)?
                          <ContextualContentButton
                            handleRemoveContent ={handleRemoveContent}
                            index={index}
                          /> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {/* Add more details as needed */}
              </div>
            ) : null}
          </Tab.Pane>
          {/* Add more tab panes as needed */}
        </Tab.Content>
      </Col>
    </Row>
  </Tab.Container>
);



}
function ContextualContentButton({ index, handleRemoveContent }) {
  const pa = useContext(purchasesActivitiesContext)
  let inner= <i className="bi bi-dash"/>;
  let variant="danger";
  let onClick= () =>  handleRemoveContent(index);


  return (
    <SmallRoundButton
      inner={inner}
      variant={variant}
      tooltip={""}
      disabled={false}
      onClick={onClick}
    />
  );

  
}


function PurchasesListItem(props) {
  const user = useContext(userContext);
  const pa = useContext(purchasesActivitiesContext);
  const waiting = useContext(waitingContext);
  const constraints = user?.purchases
  const constrOk = constraints !== undefined ? constraints.result : true;

  const removeButton = <Button
    variant="link"
    style={{"fontSize": "0.8rem"}}
    onClick={() => pa.removeBoxFromPurchases(props.box.ID)}
  >remove</Button>;
  
  return (
    <Row>
      <Col md="auto" className="align-self-center">
        <Badge bg="secondary">
          <tt>{props.box.ID}</tt>
        </Badge>
      </Col>
      <Col className="align-self-center" style={{"borderLeft": "1px solid grey"}}>
        {props.box.Price}
        {" "}
        <Badge bg="light" pill style={{"color": "black"}}>
          Type: {props.box.Type}
        </Badge>
      </Col>
      <Col md="auto" className="align-self-center">
        {
          constrOk ?(
            removeButton)
          :(
            <OverlayTrigger overlay={<Tooltip>{constraints.reason}</Tooltip>}>
              <div>{removeButton}</div>
            </OverlayTrigger>
        )}
      </Col>
    </Row>
  );
}

export { Purchases };
