import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { Box } from './Box';
import {Shop} from './Shop';
import { ShopsList } from './ShopsList';
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { ErrorsAlert, MyNavbar, shopsContext, userContext, purchasesActivitiesContext, checkPurchasesModified, waitingContext, NotFoundPage } from './Miscellaneous';
import { Col, Container, Row, Spinner } from 'react-bootstrap';
import { API } from './API';
import { LoginForm } from './LoginForm';
import { Purchases } from './Purchases';
import AdminPanel from './AdminPanel';
import ShopOwnerPanel from './ShopOwnerPanel';

function App() {
  return (
    <BrowserRouter>
      <Main/>
    </BrowserRouter>
  );
}

function Main() {
  const navigate = useNavigate();
  
  const [shops, setShops] = useState([]);
  const [errors, setErrors] = useState([]);
  const [user, setUser] = useState(undefined);
  const [savedBoxesList, setSavedBoxesList] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [waiting, setWaiting] = useState(false);

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
      .then(async (currentUser) => {
        setUser(currentUser);
        setSavedBoxesList(currentUser.purchases);
        
        // Fetch initial box details for removal tracking
        if (currentUser.purchases && currentUser.purchases.length > 0) {
          try {
            const boxesDetails = await API.fetchBoxesByIds(currentUser.purchases);
            const initialContents = {};
            boxesDetails.forEach(box => {
              initialContents[box.ID] = box.Contents || [];
            });
            setOriginalBoxContents(initialContents);
          } catch (detailsError) {
             console.error("Error fetching initial box details for user:", detailsError);
             setOriginalBoxContents({});
          }
        } else {
           setOriginalBoxContents({});
        }
        setRemovedItemsByBox({});
      })
      .catch(err => {
        if (err.includes && !err.includes("Must be authenticated to make this request!")) {
          throw err;
        }
        setUser(undefined);
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
  }, []);

  const refetchDynamicContent = async () => {
    try {
      const currentUser = await API.fetchCurrentUser();
      setUser(currentUser);
      setSavedBoxesList(currentUser.purchases);
      console.log("Refetched user purchases:", currentUser.purchases);
      
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
       setRemovedItemsByBox({});
    } catch (err) {
      setErrors(err.filter(e => e !== "Not authenticated"));
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
        refetchDynamicContent()
          .then(() => navigate("/"));
      })
      .catch(err => setErrors(err))
      .finally(() => onFinish?.());
  };

  const register = (username, password, onFinish) => {
    API.register(username, password)
      .then(user => {
        setErrors([]);
        refetchDynamicContent()
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
        setRemovedItemsByBox({});
        setOriginalBoxContents({});
      })
      .catch(err => {
        setErrors(err.filter(e => e !== "Must be authenticated to make this request"));
      });
  };

  // FIXED: Improved item removal to properly track state
  const handleItemRemoval = (boxId, itemName) => {
    setRemovedItemsByBox(prev => {
      const currentRemoved = prev[boxId] || [];
      
      // Check if we can remove more items
      if (currentRemoved.length >= 2) {
        console.log(`Cannot remove more items from box ${boxId}: limit reached`);
        return prev;
      }
      
      if (currentRemoved.includes(itemName)) {
        console.log(`Item ${itemName} already marked for removal from box ${boxId}`);
        return prev;
      }
      
      const newState = {
        ...prev,
        [boxId]: [...currentRemoved, itemName]
      };
      
      console.log(`Client: Updated removedItemsByBox for box ${boxId}:`, newState[boxId]); 
      return newState;
    });
    
    markPurchasesAsEdited();
  };

  // FIXED: Handler for adding items back (undo removal)
  const handleItemReAddition = (boxId, itemName) => {
    setRemovedItemsByBox(prev => {
       const currentRemoved = prev[boxId] || [];
       const updatedRemoved = currentRemoved.filter(item => item !== itemName);
       
       const newState = {
         ...prev,
         [boxId]: updatedRemoved
       };
       
       console.log(`Client: Re-added item ${itemName} to box ${boxId}. Updated list:`, newState[boxId]);
       return newState;
    });
    
    markPurchasesAsEdited();
  };

  const markPurchasesAsEdited = () => {
    setUser(user => ({...user, purchasesEdited: true}));
  };

  const createPurchase = () => {
    setUser(user => ({...user, purchases: [], purchasesEdited: true}));
    setRemovedItemsByBox({});
  };

  const deletePurchases = () => {
    setWaiting(true);
    const p = (user.purchases) ? API.deletePurchases() : Promise.resolve();
    
    return p.then(() => refetchDynamicContent())
      .catch(err => setErrors(err))
      .finally(() => setWaiting(false));
  };

  const addBoxtoPurchases = boxCode => {
    setUser(user => {
      const purchaseLocal = [...user.purchases, boxCode];
      const purchaseEdited = checkPurchasesModified(savedBoxesList, purchaseLocal) || removedItemsByBox[boxCode]?.length > 0;
      
      // Clear any removed items state for a box being added back
      const { [boxCode]: _, ...remainingRemoved } = removedItemsByBox;
      setRemovedItemsByBox(remainingRemoved);

      return {...user, purchases: purchaseLocal, purchasesEdited: purchaseEdited};
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

  const savePurchaseChanges = () => {
    setWaiting(true);
    
    // Determine boxes added and removed
    const add = user.purchases.filter(c => !(savedBoxesList || []).includes(c));
    const rem = (savedBoxesList || []).filter(c => !user.purchases.includes(c));
    const boxesToToggleOwnership = [...add, ...rem];

    // Prepare removed items data ONLY for boxes currently in the purchase list
    const finalRemovedItems = {};
    for (const boxId of user.purchases) {
        if (removedItemsByBox[boxId] && removedItemsByBox[boxId].length > 0) {
            finalRemovedItems[boxId] = removedItemsByBox[boxId];
        }
    }

    console.log("Client: Sending finalRemovedItems:", JSON.stringify(finalRemovedItems, null, 2));    
    
    return API.editPurchase(add, rem, boxesToToggleOwnership, finalRemovedItems)
      .then(() => refetchDynamicContent())
      .catch(err => {
          setErrors(err);
       })
      .finally(() => setWaiting(false));
  };
 
  const saveContentsChanges = (Box_id, Contents) => {
    console.warn("saveContentsChanges might be deprecated. Content changes should be saved via savePurchaseChanges.");
    setWaiting(true);
    return API.editContents(Box_id, Contents)
      .then(() => refetchDynamicContent())
      .catch(err => setErrors(err))
      .finally(() => setWaiting(false));
  };

  const discardPurchasesChanges = () => {
    setUser(user => ({...user, purchases: savedBoxesList, purchasesEdited: false}));
    setRemovedItemsByBox({});
  };

  const getRemovedItemsForBox = (boxId) => {
    return removedItemsByBox[boxId] || [];
  };

  // FIXED: New function to get filtered contents (excluding removed items)
  const getFilteredContentsForBox = (boxId) => {
    const originalContents = originalBoxContents[boxId] || [];
    const removedItems = removedItemsByBox[boxId] || [];
    
    // Filter out items that are marked for removal
    return originalContents.filter(item => !removedItems.includes(item.name));
  };

  const purchasesActivities = {
    createPurchase,
    deletePurchases,
    addBoxtoPurchases,
    removeBoxFromPurchases,
    savePurchaseChanges,
    discardPurchasesChanges,
    saveContentsChanges,
    markPurchasesAsEdited,
    handleItemRemoval,
    handleItemReAddition,
    getRemovedItemsForBox,
    getFilteredContentsForBox, // FIXED: Added new function
    originalBoxContents // FIXED: Pass original contents for reference
  };
 
  return (
    <Routes>
      <Route path="/" element={<Header user={user} logoutCbk={logout} errors={errors} clearErrors={() => setErrors([])}/>}>
        <Route
           index
           element={loading ? <LoadingSpinner/> : <HomePage user={user} shops={shops} purchaseActivities={purchasesActivities} errorAlertActive={errors.length > 0} waiting={waiting} />}
         />
        <Route
          path="login"
          element={loading ? <LoadingSpinner/> : (user ? <Navigate to="/" /> : <LoginForm loginCbk={login} registerCbk={register} errorAlertActive={errors.length > 0}/>)}
        />
        <Route
          path="admin"
          element={
            loading ? <LoadingSpinner/> : (
              user && user.isAdmin ? <AdminPanel /> : (
                user ? <Navigate to="/" /> : <Navigate to="/login" />
              )
            )
          }
        />
      </Route>
      <Route
          path="shop-panel"
          element={
              loading ? <LoadingSpinner/> : (
                user && user.shopId ? <ShopOwnerPanel /> : (
                  user ? <Navigate to="/" /> : <Navigate to="/login" />
                )
              )
          }
      />
      <Route path="*" element={<NotFoundPage/>}/>
    </Routes>
  );
}

function HomePage(props) {
  return (
    <shopsContext.Provider value={props.shops}>
      <userContext.Provider value={props.user}>
        <purchasesActivitiesContext.Provider value={props.purchaseActivities}>
          <waitingContext.Provider value={props.waiting}>
            <Container fluid style={{ 
              paddingLeft: props.user ? "2rem" : "3rem", 
              paddingRight: props.user ? "2rem" : "3rem", 
              paddingBottom: "1rem", 
              marginTop: props.errorAlertActive ? "2rem" : "6rem",
              maxWidth: props.user ? "100%" : "1400px"
            }}>
              <Row className="justify-content-center gx-5">
                {/* Shops List Column - Full width when not logged in, 7/12 when logged in */}
                <Col lg={props.user ? 7 : 12} style={{ 
                  borderRight: props.user ? "1px solid #dfdfdf" : "none", 
                  paddingRight: props.user ? '2rem' : '0' 
                }}>
                   <ShopsList />
                </Col>
                
                {/* Purchases Column - Only shown when logged in */}
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
  );
}

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