import { useContext, useState } from 'react';
import { Accordion, Badge, Col, Container, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';
import { boxesContext, shopsContext, SmallRoundButton, purchasesActivitiesContext, userContext, waitingContext,  checkisBoxOk } from './Miscellaneous';


function BoxesList({ filteredBoxes }) {
  const boxes = useContext(boxesContext);
  const boxesToDisplay = filteredBoxes || boxes;

   return (
    <Accordion alwaysOpen>
      {boxesToDisplay.map((c, i, a) => (
        <BoxItem
          box={c}
          key={c.ID}
          first={i === 0}
          last={i === a.length - 1}
        />
      ))}
    </Accordion>
  );
}


function BoxItem(props) {
  const user = useContext(userContext);
  
  const itemStyle = {
    "borderTopRightRadius": "0px",
    "borderTopLeftRadius": "0px",
    "borderBottomRightRadius": "0px",
    "borderBottomLeftRadius": "0px",
    "borderBottomWidth": "0px"
  };

  if (props.first) {
    delete itemStyle.borderTopRightRadius;
    delete itemStyle.borderTopLeftRadius;
  } else if (props.last) {
    delete itemStyle.borderBottomWidth;
    delete itemStyle.borderBottomRightRadius;
    delete itemStyle.borderBottomLeftRadius;
  }
  const constraints = user?.purchases && checkisBoxOk(props.box.ID,user.purchases,props.box.Is_owned,props.box.Retrieve_time_span);
  const constrOk = constraints !== undefined ? constraints.result : true;

  return (
    <Row>
      <Col>
        <Accordion.Item eventKey={props.box.ID} className={(props.accent ? "accent" : "") + (!constrOk ? " disabled" : "")} style={itemStyle}>
          <Accordion.Header>
            <Container style={{"paddingLeft": "0.5rem"}}>
              <Row>
                <Col md="auto" className="align-self-ceDnter">
                  <Badge bg="secondary">
                    <tt>{props.box.ID}</tt>
                  </Badge>
                </Col>
                <Col md="auto" style={{"borderLeft": "1px solid grey"}}>
                  { constrOk ? props.box.Type : <em style={{"color": "grey"}}>{props.box.Type}</em> }
                  {" "}
                  <Badge bg="light" pill style={{"color": "black"}}>
                    Price: {props.box.Price}
                  </Badge>
                </Col>
                <Col className="text-end align-self-center" style={{"marginRight": "1rem"}}>
                  <Badge>
                    {
                      props.box.Size 
                    }
                    {" "}
                  </Badge>
                </Col>
              </Row>
            </Container>
          </Accordion.Header>
          <Accordion.Body><BoxItemDetails box={props.box} disabled={!constrOk} reason={constraints?.reason}/></Accordion.Body>
        </Accordion.Item>
      </Col>
      {
        user?.purchases ? (
          <Col md="auto" className="align-self-center" style={{"paddingLeft": "0px"}}>
            <ContextualButton constraints={constraints} box={props.box}/>
          </Col>
        ): null
      }
    </Row>
  );
}


// Replace this function in BoxesList.jsx

function ContextualButton(props) {
  const user = useContext(userContext);
  const purchasesa = useContext(purchasesActivitiesContext);
  const waiting = useContext(waitingContext);

  // Check if the box is already in the user's purchase list
  if (user.purchases?.includes(props.box.ID)) {
    
    // --- This is a REMOVE button ---
    const inner = <i className="bi bi-dash"/>;
    const variant = "danger";
    const onClick = () => purchasesa.removeBoxFromPurchases(props.box.ID);
    
    // It should only be disabled if 'waiting' is true.
    // The 'constraints.result' (which is false) should be ignored.
    return (
      <SmallRoundButton 
        inner={inner} 
        variant={variant} 
        tooltip={"Remove from purchases"} // New, clearer tooltip
        disabled={waiting} 
        onClick={onClick}
      />
    );
  
  } else {

    // --- This is an ADD button ---
    const inner = <i className="bi bi-plus"/>;
    const variant = "success";
    const onClick = () => purchasesa.addBoxtoPurchases(props.box.ID);

    // It *should* be disabled if constraints fail or we are waiting.
    return (
      <SmallRoundButton 
        inner={inner} 
        variant={variant} 
        tooltip={props.constraints.reason || "Add to purchases"} 
        disabled={!props.constraints.result || waiting} 
        onClick={onClick}
      />
    );
  }
}


function BoxItemDetails(props) {
  
  return (
    <div>
      { props.disabled ? <><em>{props.reason}</em><br/><br/></> : false }
      { props.disabled ? <em style={{"color": "grey"}}>Time: </em> : "Time: " } 
      {
        props.disabled?
        <BoxDrop box={props.box} color="red" />
        :
        <BoxDrop box={props.box} color="green" />
      }
      <br/>
      { <em style={{"color": "grey"}}>Type: </em> }
      {
        <strong style={{"color": "green"}}>
          {props.box.Type}
        </strong>
      }
    </div>
  );
}


function BoxDrop(props) {
  return (
    <OverlayTrigger
      placement="top"
      overlay={
        <Tooltip id={"tooltip-" + props.box.Retrieve_time_span}>{props.box.Retrieve_time_span}</Tooltip>
      }
    >
      <strong style={props.color ? {"color": props.color} : {}}><tt>{props.box.Retrieve_time_span}</tt></strong>
    </OverlayTrigger>
  );
}

export { BoxesList };
