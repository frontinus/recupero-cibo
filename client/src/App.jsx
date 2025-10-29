import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
//import './App.css';
import { Box } from './Box';
import {Shop} from './Shop';
import { ShopsList } from './ShopsList';
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { ErrorsAlert, MyNavbar, shopsContext,contentContext, userContext, purchasesActivitiesContext, checkPurchasesModified, waitingContext, NotFoundPage,boxesContext } from './Miscellaneous';
import { Col, Container, Row, Spinner } from 'react-bootstrap';
import { API } from './API';
import { LoginForm } from './LoginForm';
import { Purchases } from './Purchases';
import AdminPanel from './AdminPanel';

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
  
  const [shops, setShops] = useState([]);
  const [errors, setErrors] = useState([]);
  const [user, setUser] = useState(undefined);
  const [savedBoxesList, setSavedBoxesList] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [waiting, setWaiting] = useState(false);

  // --- NEW STATE ---
  // Track removed items: { boxId1: ['itemA', 'itemB'], boxId2: ['itemC'] }
  const [removedItemsByBox, setRemovedItemsByBox] = useState({});
  // Track the original contents of purchased boxes when they were loaded
  const [originalBoxContents, setOriginalBoxContents] = useState({});

  useEffect(() => {
    setLoading(true);
    const fetchShopsPromise = API.fetchShops()
      .then(s => {
        setShops(
          s.map(shop => new Shop(
            shop.Shopid, shop.ShopName, shop.Adress,
            shop.Phone_nb, shop.Food_type, shop.Boxes
          )).sort((a, b) => a.ShopName.localeCompare(b.ShopName))
        );
      });
    
    const fetchUserPromise = API.fetchCurrentUser()
      .then(async (currentUser) => { // Make async to fetch box details
        setUser(currentUser);
        setSavedBoxesList(currentUser.purchases);
        
        // --- FETCH INITIAL BOX DETAILS FOR REMOVAL TRACKING ---
        if (currentUser.purchases && currentUser.purchases.length > 0) {
          try {
            const boxesDetails = await API.fetchBoxesByIds(currentUser.purchases);
            const initialContents = {};
            boxesDetails.forEach(box => {
              // Store original contents (as objects with name/quantity)
              initialContents[box.ID] = box.Contents || [];
            });
            setOriginalBoxContents(initialContents);
          } catch (detailsError) {
             console.error("Error fetching initial box details for user:", detailsError);
             // Decide how to handle this - maybe show an error?
             // For now, we'll proceed without original contents, meaning revert won't work perfectly.
             setOriginalBoxContents({});
          }
        } else {
           setOriginalBoxContents({}); // No purchases, empty object
        }
        setRemovedItemsByBox({}); // Reset removed items on login/reload
      })
      .catch(err => {
        if (err.includes && !err.includes("Must be authenticated to make this request!")) {
          throw err;
        }
        setUser(undefined); // Ensure user is undefined if fetch fails
        setSavedBoxesList(undefined);
        setRemovedItemsByBox({});
        setOriginalBoxContents({});
        return; 
      });

    Promise.allSettled([fetchShopsPromise, fetchUserPromise])
      .then(results => {
        results.forEach(result => {
          if (result.status === 'rejected') {
            console.error('Error during initial load:', result.reason);
            setErrors(prevErrors => [...prevErrors, result.reason.toString()]);
          }
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []); // Run only on mount

  // This function might need updating if you fetch box details again elsewhere
  const refetchDynamicContent = async () => { // Make async
    try {
      const currentUser = await API.fetchCurrentUser();
      setUser(currentUser);
      setSavedBoxesList(currentUser.purchases);
      console.log("Refetched user purchases:", currentUser.purchases);
       // --- RE-FETCH INITIAL BOX DETAILS ---
       if (currentUser.purchases && currentUser.purchases.length > 0) {
         const boxesDetails = await API.fetchBoxesByIds(currentUser.purchases);
         const initialContents = {};
         boxesDetails.forEach(box => {
           initialContents[box.ID] = box.Contents || [];
         });
         setOriginalBoxContents(initialContents);
       } else {
         setOriginalBoxContents({});
       }
       setRemovedItemsByBox({}); // Reset removed items after save/refetch
    } catch (err) {
      setErrors(err.filter(e => e !== "Not authenticated"));
      // Clear user data if refetch fails (e.g., session expired)
      setUser(undefined);
      setSavedBoxesList(undefined);
      setRemovedItemsByBox({});
      setOriginalBoxContents({});
    }
  };
 
  const login = (username, password, onFinish) => {
    API.login(username, password)
      .then(user => {
        setErrors([]);
        refetchDynamicContent() // refetch already handles setting user and boxes
          .then(() => navigate("/"));
      })
      .catch(err => setErrors(err))
      .finally(() => onFinish?.());
  };

  const logout = () => {
    API.logout()
      .then(() => {
        setUser(undefined);
        setSavedBoxesList(undefined);
        setRemovedItemsByBox({}); // Clear removed items on logout
        setOriginalBoxContents({}); // Clear original contents
      })
      .catch(err => {
        setErrors(err.filter(e => e !== "Must be authenticated to make this request"));
      });
  };

  // In App.jsx
const handleItemRemoval = (boxId, itemName) => {
  setRemovedItemsByBox(prev => {
    const currentRemoved = prev[boxId] || [];
    // Only add if not already present and count < 2
    if (currentRemoved.length < 2 && !currentRemoved.includes(itemName)) {
      const newState = {
        ...prev,
        [boxId]: [...currentRemoved, itemName]
      };
      // --- ADD LOG INSIDE SETTER ---
      console.log(`Client: Updated removedItemsByBox for box ${boxId}:`, newState[boxId]); 
      return newState;
    }
    console.log(`Client: Did NOT update removedItemsByBox for box ${boxId} (limit reached or item already removed).`);
    return prev; // No change if limit reached or already removed
  });
  // Also mark as edited
  markPurchasesAsEdited();
};

  // --- NEW: Handles adding items back locally ---
  // Called by PurchasesDetails if you implement an "undo removal" button
  const handleItemReAddition = (boxId, itemName) => {
    setRemovedItemsByBox(prev => {
       const currentRemoved = prev[boxId] || [];
       const updatedRemoved = currentRemoved.filter(item => item !== itemName);
       return {
         ...prev,
         [boxId]: updatedRemoved
       };
    });
    // We might need more complex logic to determine if still edited
     markPurchasesAsEdited(); // For simplicity, mark as edited
  };


  // --- NEW: Function needed by PurchasesDetails ---
  const markPurchasesAsEdited = () => {
    setUser(user => ({...user, purchasesEdited: true}));
  };

  const createPurchase = () => {
    setUser(user => ({...user, purchases: [], purchasesEdited: true}));
    setRemovedItemsByBox({}); // Clear removed items when creating new
  };

  const deletePurchases = () => {
    setWaiting(true);
    const p = (user.purchases) ? API.deletePurchases() : Promise.resolve();
    
    return p.then(() => refetchDynamicContent()) // Refetch will clear state
      .catch(err => setErrors(err))
      .finally(() => setWaiting(false));
  };

  const addBoxtoPurchases = boxCode => {
    setUser(user => {
      const purchaseLocal = [...user.purchases, boxCode];
      // Check against saved list AND check if removed items need clearing for this box
      const purchaseEdited = checkPurchasesModified(savedBoxesList, purchaseLocal) || removedItemsByBox[boxCode]?.length > 0;
      
      // Clear any removed items state for a box being added back (if applicable)
      const { [boxCode]: _, ...remainingRemoved } = removedItemsByBox;
      setRemovedItemsByBox(remainingRemoved);

      return {...user, purchases: purchaseLocal, purchasesEdited :purchaseEdited};
    });
  };

  const removeBoxFromPurchases = BoxCode => {
    setUser(user => {
      const purchaseLocal = user.purchases.filter(p => p !== BoxCode);
      const purchaseEdited = checkPurchasesModified(savedBoxesList, purchaseLocal);

      // Also clear any removed items state for the box being removed
      const { [BoxCode]: _, ...remainingRemoved } = removedItemsByBox;
      setRemovedItemsByBox(remainingRemoved);

      return {...user, purchases: purchaseLocal, purchasesEdited: purchaseEdited};
    });
  };

  // --- MODIFIED: Needs to send removedItemsByBox ---
  const savePurchaseChanges = () => {
    setWaiting(true);
    
    // Determine boxes added and removed
    const add = user.purchases.filter(c => !(savedBoxesList || []).includes(c));
    const rem = (savedBoxesList || []).filter(c => !user.purchases.includes(c));
    const boxesToToggleOwnership = [...add, ...rem]; // IDs for ownership change

    // Prepare removed items data ONLY for boxes currently in the purchase list
    const finalRemovedItems = {};
    for (const boxId of user.purchases) {
        if (removedItemsByBox[boxId] && removedItemsByBox[boxId].length > 0) {
            finalRemovedItems[boxId] = removedItemsByBox[boxId];
        }
    }

    // --- API Call Needs Update ---
    // API.editPurchase needs to be modified (or a new endpoint created)
    // to accept the finalRemovedItems object.
    // Example: API.editPurchase(add, rem, boxesToToggleOwnership, finalRemovedItems)
    console.log("Client: Sending finalRemovedItems:", JSON.stringify(finalRemovedItems, null, 2));    
    
    // Assuming API.editPurchase is updated to take the 4th argument:
    return API.editPurchase(add, rem, boxesToToggleOwnership, finalRemovedItems)
      .then(() => refetchDynamicContent()) // Refetch clears local state
      .catch(err => {
          setErrors(err);
          // Optional: Revert local changes on error? Or let user retry?
          // For now, just show error.
       })
      .finally(() => setWaiting(false));
  };
 
  // This might not be needed if savePurchaseChanges handles content now
  const saveContentsChanges = (Box_id, Contents) => {
    console.warn("saveContentsChanges might be deprecated. Content changes should be saved via savePurchaseChanges.");
    // ... (keep existing logic for now if needed elsewhere) ...
    setWaiting(true);
    return API.editContents(Box_id, Contents)
      .then(() => refetchDynamicContent())
      .catch(err => setErrors(err))
      .finally(() => setWaiting(false));
  };

  const discardPurchasesChanges = () => {
    setUser(user => ({...user, purchases: savedBoxesList, purchasesEdited: false}));
    setRemovedItemsByBox({}); // Discard removed items too
  };

  const getRemovedItemsForBox = (boxId) => {
    return removedItemsByBox[boxId] || [];
};

  // --- Updated Context Value ---
  const purchasesActivities = {
    createPurchase,
    deletePurchases,
    addBoxtoPurchases,
    removeBoxFromPurchases,
    savePurchaseChanges,
    discardPurchasesChanges,
    saveContentsChanges, // Keep or remove based on whether savePurchaseChanges handles it
    markPurchasesAsEdited, // Add the new function
    handleItemRemoval,    // Add the handler for removing items locally
    handleItemReAddition, // Add the handler for re-adding items locally
    getRemovedItemsForBox
  };
 
  // The Routes and HomePage structure remain the same
return (
    <Routes>
      {/* Routes with the main Header (Navbar, Error Alert) */}
      <Route path="/" element={<Header user={user} logoutCbk={logout} errors={errors} clearErrors={() => setErrors([])}/>}>

        {/* Home Page Route */}
        <Route
           index // Use 'index' for the default path "/"
           element={loading ? <LoadingSpinner/> : <HomePage user={user} shops={shops} purchaseActivities={purchasesActivities} errorAlertActive={errors.length > 0} waiting={waiting} />}
         />

        {/* Login Page Route */}
        <Route
          path="login"
          element={loading ? <LoadingSpinner/> : (user ? <Navigate to="/" /> : <LoginForm loginCbk={login} errorAlertActive={errors.length > 0}/>)} // Redirect if already logged in
        />

        {/* --- NEW Admin Page Route --- */}
        <Route
          path="admin"
          element={
            loading ? <LoadingSpinner/> : ( // Show spinner while loading initial user state
              user && user.isAdmin ? <AdminPanel /> : ( // If loaded and user is admin, show AdminPanel
                user ? <Navigate to="/" /> : <Navigate to="/login" /> // If loaded but not admin, redirect to home. If not logged in, redirect to login.
              )
            )
          }
        />
         {/* --- End NEW Route --- */}

      </Route> {/* End of routes with Header */}

      {/* Catch-all Not Found Route (outside Header) */}
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
    // Consider removing boxesContext and contentContext if no longer used globally
    // <contentContext.Provider value={[]}> {/* Empty if not used */}
    // <boxesContext.Provider value={[]}> {/* Empty if not used */}
    <shopsContext.Provider value={props.shops}>
      <userContext.Provider value={props.user}>
        <purchasesActivitiesContext.Provider value={props.purchaseActivities}>
          <waitingContext.Provider value={props.waiting}>
            <Container fluid style={{ paddingLeft: "2rem", paddingRight: "2rem", paddingBottom: "1rem", marginTop: props.errorAlertActive ? "2rem" : "6rem" }}> {/* Adjusted padding */}
              <Row className="justify-content-center gx-5"> {/* Added gutter spacing */}
                {/* Shops List Column */}
                <Col lg={7} style={{ borderRight: props.user ? "1px solid #dfdfdf" : "none", paddingRight: props.user ? '2rem' : '0' }}>
                   <ShopsList />
                </Col>
               
                {/* Purchases Column (only if logged in) */}
                {props.user && (
                  <Col lg={5} style={{ paddingLeft: '2rem'}}>
                    <Purchases />
                  </Col>
                )}
              </Row>
            </Container>
          </waitingContext.Provider>
        </purchasesActivitiesContext.Provider>
      </userContext.Provider>
    </shopsContext.Provider>
    // </boxesContext.Provider>
    // </contentContext.Provider>
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
