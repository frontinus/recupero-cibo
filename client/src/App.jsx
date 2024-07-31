import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
//import './App.css';
import { Box } from './Box';
import {Shop} from './Shop';
import { ShopsList } from './ShopsList';
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useNavigate } from 'react-router-dom';
import { ErrorsAlert, MyNavbar, shopsContext,contentContext, userContext, purchasesActivitiesContext, checkPurchasesModified, waitingContext, NotFoundPage,boxesContext } from './Miscellaneous';
import { Col, Container, Row, Spinner } from 'react-bootstrap';
import { API } from './API';
import { LoginForm } from './LoginForm';
import { Purchases } from './Purchases';

function App() {
  return (
    <BrowserRouter>
      <Main/>
    </BrowserRouter>
  );
}

/**
 * The actual main app.
 * This is used instead of the default App component because Main can be encapsulated in
 * a BrowserRouter component, giving it the possibility of using the useNavigate hook.
 */
function Main() {
  const navigate = useNavigate();
  
  /** The list of shops */
  const [shops, setShops] = useState([]);
  /** A list of errors */
  const [errors, setErrors] = useState([]);

  const [boxes, setBoxes] = useState([])
  /**
   * Information about the currently logged in user.
   * This is undefined when no user is logged in
   */
  const [user, setUser] = useState(undefined);

  const [contents, setContents] = useState([]);


  const [savedBoxesList, setSavedBoxesList] = useState(undefined);

  /** Flags initial loading of the app */
  const [loading, setLoading] = useState(true);

  const [waiting, setWaiting] = useState(false);
  
  useEffect(() => {
    Promise.all([API.fetchBoxes(),API.fetchShops()])
      .then(res => {
        const b = res[0]; // Courses
        const s = res[1];
        setBoxes(
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

        setShops(
          s.map(shop => new Shop(
            shop.Shopid,
            shop.ShopName,
            shop.Adress,
            shop.Phone_nb,
            shop.Food_type,
            shop.Boxes
          ))
          .sort((a, b) => a.ShopName.localeCompare(b.ShopName))
        );

        
        // Loading done
        setLoading(false);
      })
      .catch(err =>{console.error('Error fetching data:', err);
  setErrors(err);});

      // Check if the user was already logged in
      API.fetchCurrentUser()
        .then(user => {
          setUser(user);
          setSavedBoxesList(user.purchases);
        })
        .catch(err => {
          // Remove eventual 401 Unauthorized errors from the list, those are expected
          setErrors(err.filter(e => e !== "Must be authenticated to make this request!"));
        });
  }, []);
  
  

  const refetchDynamicContent = () => {
    
    const p2 = API.fetchCurrentUser()
      .then(user => {
        setUser(user);
        setSavedBoxesList(user.purchases);
      })
      .catch(err => {
        // Remove eventual 401 Unauthorized errors from the list, those are expected
        setErrors(err.filter(e => e !== "Not authenticated"));
      });

    return Promise.all([p2]);
  }

 
  const login = (username, password, onFinish) => {
    API.login(username, password)
      .then(user => {
        setErrors([]);
        refetchDynamicContent()
          .then(() => navigate("/"));
      })
      .catch(err => setErrors(err))
      .finally(() => onFinish?.());
  };

  /**
   * Perform the logout
   */
  const logout = () => {
    API.logout()
      .then(() => {
        setUser(undefined);
        setSavedBoxesList(undefined);
      })
      .catch(err => {
        // Remove eventual 401 Unauthorized errors from the list
        setErrors(err.filter(e => e !== "Must be authenticated to make this request"));
      });
  };

   const createPurchases = () => {
    setUser(user => ({...user, purchases: [], purchasesEdited: true}));
  };

  const deletePurchases = () => {
    setWaiting(true);
    
    const p = (user.purchases) ?
      API.deletePurchases()
    :
      Promise.resolve();
    
    return p.then(() => refetchDynamicContent())
      .catch(err => setErrors(err))
      .finally(() => setWaiting(false));
  };


  const addBoxtoPurchases = boxCode => {
    setUser(user => {
      const purchaseLocal = [...user.purchases, boxCode];
      const purchaseEdited = checkPurchasesModified(savedBoxesList, purchaseLocal);

      const updatedBoxes = boxes.map(box =>
      box.ID === boxCode ? { ...box, Is_owned: true } : box
    );

    // Update the state with the new boxes
    setBoxes(updatedBoxes);
    
      return {...user, purchases: purchaseLocal, purchasesEdited :purchaseEdited};
    });
  };


  /**

   */
  const removeBoxFromPurchases = BoxCode => {
    setUser(user => {
      const purchaseLocal = user.purchases.filter(p => p !== BoxCode);
      const purchaseEdited = checkPurchasesModified(savedBoxesList, purchaseLocal);

      const updatedBoxes = boxes.map(box =>
      box.ID === BoxCode ? { ...box, Is_owned: false } : box
    );

    

    // Update the state with the new boxes
    setBoxes(updatedBoxes);

      return {...user, purchases: purchaseLocal,purchasesEdited: purchaseEdited};
    });
  };


  const savePurchaseChanges = () => {
    setWaiting(true);
    
    const create = () => API.createPurchases(user.purchases);
    const edit = () => {
      // Find diff between saved and current study plans
      const add = user.purchases.filter(c => !savedBoxesList.includes(c));
      const rem = savedBoxesList.filter(c => !user.purchases.includes(c));
      const Boxes_id = [...add, ...rem]
      return API.editPurchase(add, rem, Boxes_id);
    };

    const APICall = (savedBoxesList.length === null || savedBoxesList.length === undefined) ?
      create : edit;

    return APICall()
      .then(() => refetchDynamicContent())
      .catch(err => setErrors(err))
      .finally(() => setWaiting(false));
  };
  

  const saveContentsChanges = (Box_id,Contents) => {
    setWaiting(true);
    
    const edit = () => {
      
      return API.editContents(Box_id, Contents);
    };

    const APICall = edit;

    return APICall()
      .then(() => refetchDynamicContent())
      .catch(err => setErrors(err))
      .finally(() => setWaiting(false));
  };

  const discardPurchasesChanges = () => {
    setUser(user => ({...user, purchases: savedBoxesList, purchasesEdited: false}));
  };

  const purchasesActivities = {
    createPurchases,
    deletePurchases,
    addBoxtoPurchases,
    removeBoxFromPurchases,
    savePurchaseChanges,
    discardPurchasesChanges,
    saveContentsChanges,
    
  };
  
  return (
    <Routes>
      <Route path="/" element={<Header user={user} logoutCbk={logout} errors={errors} clearErrors={() => setErrors([])}/>}>
        <Route path="" element={loading ? <LoadingSpinner/> : <HomePage contents={contents} boxes = {boxes} user={user} shops={shops}  purchaseActivities={purchasesActivities} errorAlertActive={errors.length > 0} waiting={waiting}/>}/>
        <Route path="login" element={loading ? <LoadingSpinner/> : <LoginForm loginCbk={login} errorAlertActive={errors.length > 0}/>}/>
      </Route>

      <Route path="*" element={<NotFoundPage/>}/>
    </Routes>
  );
}

/**
 * Proper home page component of the app
 *
 * @param props.shops list of all the Shops objects
 * @param props.user object with all the currently logged in student's info
 * @param props.pActivities object with all the study plan related functions
 * @param props.errorAlertActive true when the error alert on the top is active and showing, false otherwise
 * @param props.waiting boolean, when true all controls should be disabled
 */
function HomePage(props) {
  return (
<contentContext.Provider value ={props.contents}>
  <boxesContext.Provider value={props.boxes}>
    <shopsContext.Provider value={props.shops}>
      <userContext.Provider value={props.user}>
        <purchasesActivitiesContext.Provider value={props.purchaseActivities}>
          <waitingContext.Provider value={props.waiting}>
            <Container fluid style={{"paddingLeft": "25rem", "paddingRight": "2rem", "paddingBottom": "1rem", "marginTop": props.errorAlertActive ? "2rem" : "6rem"}}>
              <Row className="justify-content-center">
                <Col lg style={{"borderRight": props.user && "1px solid #dfdfdf", "maxWidth": "70%"}}>
                   <ShopsList />
                </Col>
               
                { 
                  props.user ?(
                     
                  <Col lg>
                    <Purchases />
                  </Col>
                  ): null
                }
              </Row>
            </Container>
          </waitingContext.Provider>
        </purchasesActivitiesContext.Provider>
      </userContext.Provider>
    </shopsContext.Provider>
  </boxesContext.Provider>
</contentContext.Provider >
);

}

/**
 * Header of the page, containing the navbar and, potentially, the error alert
 * 
 * @param props.errors current list of error strings
 * @param props.clearErrors callback to clear all errors
 * @param props.user object with all the currently logged in student's info
 * @param props.logoutCbk callback to perform the user's logout
 */
function Header(props) {
  return (
    <>
      <MyNavbar user={props.user} logoutCbk={props.logoutCbk}/>
      {
        props.errors.length > 0 ? <ErrorsAlert errors={props.errors} clear={props.clearErrors}/> : false
      }
      <Outlet/>
    </>
  );
}

/**
 * A loading spinner shown on first loading of the app
 */
function LoadingSpinner() {
  return (
    <div className="position-absolute w-100 h-100 d-flex flex-column align-items-center justify-content-center">
      <Spinner animation="border" role="status">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );
}

export default App;