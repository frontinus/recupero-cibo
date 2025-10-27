import { createContext } from "react";
import { Alert, Button, Container, Nav, Navbar, OverlayTrigger, Tooltip } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";

/** Context used to propagate the list of shops */
const shopsContext = createContext();

const boxesContext = createContext();

/** Context used to propagate the user object */
const userContext = createContext();

const contentContext = createContext();

/** Context used to propagate all the study plan related functions */
const purchasesActivitiesContext = createContext();

/** Context used to propagate the waiting state to everything that might need it */
const waitingContext = createContext();

/**
 * The navigation bar at the top of the app.
 * This is meant to be inserted as a parent route to pretty much the entire app
 * 
 * @param props.user object with all the currently logged in user's info
 */
function MyNavbar(props) {
  const navigate = useNavigate();
  return (
    <>
      <Navbar className="shadow" fixed="top" bg="light" style={{"marginBottom": "2rem"}}>
        <Container>
          <Navbar.Brand href="/" onClick={event => {event.preventDefault(); navigate("/");}}>
            <i className="bi bi-cake2"/>
            {" "}
            Food Retrieving
          </Navbar.Brand>
          <Nav>
            {
              props.user ?
                <Navbar.Text>
                  Logged in as: {props.user.username} | <a href="/logout" onClick={event => {event.preventDefault(); props.logoutCbk();}}>Logout</a>
                </Navbar.Text>
                :
                <Nav.Link href="/login" active={false} onClick={event => {event.preventDefault(); navigate("/login");}}>
                  Login
                  {" "}
                  <i className="bi bi-person-fill"/>
                </Nav.Link>
            }
          </Nav>
        </Container>
      </Navbar>
    </>
  );
}

/**
 * Informs the user that the route is not valid
 */
function NotFoundPage() {
  return <>
    <div style={{"textAlign": "center", "paddingTop": "5rem"}}>
      <h1>
        <i className="bi bi-exclamation-circle-fill"/>
        {" "}
        The page cannot be found
        {" "}
        <i className="bi bi-exclamation-circle-fill"/>
      </h1>
      <br/>
      <p>
        The requested page does not exist, please head back to the <Link to={"/"}>app</Link>.
      </p>
    </div>
  </>;
}

/**
 * Bootstrap's Alert component used to show errors
 * 
 * @param props.errors list of error strings to show
 * @param props.clear callback to clear all errors
 */
function ErrorsAlert(props) {
  return (
    <Alert variant="danger" dismissible onClose={props.clear} style={{"margin": "2rem", "marginTop": "6rem"}}>
      {props.errors.length === 1 ? props.errors[0] : ["Errors: ", <br key="br"/>, <ul key="ul">
      {
        props.errors.map((e, i) => <li key={i + ""}>{e}</li>)
      }
      </ul>]}
    </Alert>
  );
}

 function SmallRoundButton(props) {
  const button = <Button variant={props.variant} disabled={props.disabled} className="rounded-pill" onClick={props.onClick} style={{
      "width": "30px",
      "height": "30px",
      "textAlign": "center",
      "padding": "0px"
    }}>
      {props.inner}
    </Button>;

  if (props.tooltip) {
    return (
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id={"tooltip2"}>{props.tooltip}</Tooltip>
        }
      >
        <div>{ button}</div>
      </OverlayTrigger>
    );
  } else {
    return button;
  }
}

/**
 * Checks the compatibility of the specified Course with the provided study plan
 * 
 * @param box the Box object to test
 * @param purchases a list of all the boxes currently bought
 * @param boxes all the boxes
 * @param Time Time object current time of the day
 * 
 * @returns an object like {result: <boolean>, reason: "..."}, where reason, in case result is false,
 *          contains a user-appropriate explaination for why this box is not buyable
 */
function checkisBoxOk(ID, purchases,is_owned,Retrieve_time_span) {
  if (purchases.includes(ID)) { // Check local cart
    return {
      result: false,
      reason: "Box is already in your purchase list"
    };
  }

  const Max_time = Retrieve_time_span.split('-')[1];
  const [max_hours, max_mins] = Max_time.split(':');
  const Higher_limit = new Date();

  Higher_limit.setHours(max_hours, max_mins, 0, 0);
  
    // Addition
    // Check mandatory
  if (Higher_limit<new Date()) {
    return {
      result: false,
      reason: `This box is already wasted`
    };
  }

  if (is_owned) { // Check database ownership
    return {
      result: false,
      reason: "The box has already been bought by somebody else"
    };
  }
    
  return { result: true };

  // If everything else was ok, return successful
  
}





function checkPurchasesModified(saved, current) {
  if (saved.length !== current.length) return true;

  for (const c of saved) {
    if (!current.includes(c))
      return true;
  }

  return false;
}

function checkBoxModified(saved, current) {
  if (saved.Contents.length !== current.Contents.length) return true;

  for (const c of saved.Contents) {
    if (!current.Contents.includes(c))
      return true;
  }

  return false;
}

export {
  MyNavbar,
  NotFoundPage,
  ErrorsAlert,
  shopsContext,
  boxesContext,
  userContext,
  purchasesActivitiesContext,
  waitingContext,
  checkisBoxOk,
  SmallRoundButton,
  checkPurchasesModified,
  checkBoxModified,
  contentContext  
};
