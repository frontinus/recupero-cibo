const SERVER_HOST = "http://localhost";
const SERVER_PORT = 3001;

const SERVER_BASE = `${SERVER_HOST}:${SERVER_PORT}/api/`;

/**
 * Generic API call
 */
const APICall = async (endpoint, method = "GET", body = undefined, headers = undefined, expectResponse = true) => {
  let errors = [];

  try {
    const response = await fetch(new URL(endpoint, SERVER_BASE), {
        method,
        body,
        headers,
        credentials: "include"
    });

    if (response.ok) {
      if (expectResponse) return await response.json();
    }
    else errors = (await response.json()).errors;
  } catch {
    const err = ["Failed to contact the server"];
    throw err;
  }

  if (errors.length !== 0)
    throw errors;
};

const fetchBoxes = async () => await APICall("boxes");

const fetchBoxesByShop = async (ShopId) => await APICall(`boxes/${ShopId}`)

const fetchShops = async () => await APICall("shops");

const fetchBoxesByIds = async (ids) => await APICall(
  "boxes-by-ids",
  "POST",
  JSON.stringify({ids}),
  { "Content-Type": "application/json" }
);

const deletePurchases = async () => await APICall(
  "purchase",
  "DELETE",
  undefined,
  undefined,
  false
);

const createPurchase = async (boxes) => await APICall(
  "purchase",
  "POST",
  JSON.stringify({boxes}),
  { "Content-Type": "application/json" },
  false
);

const editPurchase = async (add, rem, Boxes_id, removedItems) => await APICall(
  "Purchases-modifications",
  "POST",
  JSON.stringify({ add, rem, Boxes_id, removedItems }),
  { "Content-Type": "application/json" },
  false
);

const editContents = async (Box_id,contents)=> await APICall(
  "Contents-modifications",
  "POST",
  JSON.stringify({Box_id,contents}),
  { "Content-Type": "application/json" },
  false
)

/**
 * Attempts to login the user
 */
const login = async (username, password) => await APICall(
  "session",
  "POST",
  JSON.stringify({username: username, password}),
  { "Content-Type": "application/json" }
);

/**
 * Register a new user
 */
const register = async (username, password) => await APICall(
  "register",
  "POST",
  JSON.stringify({username, password}),
  { "Content-Type": "application/json" }
);

/**
 * Logout
 */
const logout = async () => await APICall(
  "session",
  "DELETE",
  undefined,
  undefined,
  false
);

const fetchCurrentUser = async () => await APICall("session/current");

/**
 * Creates a new shop (Admin only)
 */
const adminCreateShop = async (name, address, phone, foodType) => await APICall(
  "admin/shops",
  "POST",
  JSON.stringify({ name, address, phone, foodType }),
  { "Content-Type": "application/json" },
  true
);

/**
 * Creates a new box (Admin only)
 */
const adminCreateBox = async (type, size, price, timeSpan) => await APICall(
  "admin/boxes",
  "POST",
  JSON.stringify({ type, size, price, timeSpan }),
  { "Content-Type": "application/json" },
  true
);

/**
 * Assign a box to a shop (Admin only)
 */
const adminAssignBoxToShop = async (boxId, shopId) => await APICall(
  "admin/assign-box-shop",
  "POST",
  JSON.stringify({ boxId, shopId }),
  { "Content-Type": "application/json" },
  true
);

/**
 * Assign a box to a user (Admin only)
 */
const adminAssignBoxToUser = async (boxId, username) => await APICall(
  "admin/assign-box-user",
  "POST",
  JSON.stringify({ boxId, username }),
  { "Content-Type": "application/json" },
  true
);

/**
 * Remove a box from a shop (Admin only)
 */
const adminRemoveBoxFromShop = async (boxId, shopId) => await APICall(
  "admin/remove-box-shop",
  "DELETE",
  JSON.stringify({ boxId, shopId }),
  { "Content-Type": "application/json" },
  true
);

/**
 * Fetch available food items
 */
const fetchAvailableItems = async () => await APICall("items");

/**
 * Fetch list of users
 */
const fetchUsers = async () => await APICall("admin/users");

/**
 * Add an item to a box (Admin only)
 */
const adminAddItemToBox = async (boxId, itemName, quantity) => await APICall(
  "admin/add-item-to-box",
  "POST",
  JSON.stringify({ boxId, itemName, quantity }),
  { "Content-Type": "application/json" },
  true
);

/**
 * Create a new food item (Admin only)
 */
const adminCreateItem = async (itemName) => await APICall(
  "admin/items",
  "POST",
  JSON.stringify({ itemName }),
  { "Content-Type": "application/json" },
  true
);

// Shop owner endpoints
const fetchCurrentShop = async () => await APICall("shop/current");

const fetchShopBoxes = async () => await APICall("shop/boxes");

const createShopBox = async (type, size, price, timeSpan, items) => await APICall(
    "shop/boxes",
    "POST",
    JSON.stringify({ type, size, price, timeSpan, items }),
    { "Content-Type": "application/json" },
    true
);

const deleteShopBox = async (boxId) => await APICall(
    `shop/boxes/${boxId}`,
    "DELETE",
    undefined,
    undefined,
    false
);

const cancelShopPurchase = async (boxId) => await APICall(
    `shop/purchases/${boxId}`,
    "DELETE",
    undefined,
    undefined,
    false
);

const adminCreateShopUser = async (shopId, username, password) => await APICall(
    "admin/create-shop-user",
    "POST",
    JSON.stringify({ shopId, username, password }),
    { "Content-Type": "application/json" },
    true
);


const API = {
  fetchBoxes,
  fetchBoxesByShop,
  deletePurchases,
  createPurchase,
  editPurchase,
  login,
  register,
  logout,
  fetchCurrentUser,
  fetchShops,
  editContents,
  fetchBoxesByIds,
  adminCreateBox,
  adminCreateShop,
  adminAssignBoxToShop,
  adminAssignBoxToUser,
  adminRemoveBoxFromShop,
  fetchAvailableItems,
  adminAddItemToBox,
  adminCreateItem,
  fetchUsers,
  fetchCurrentShop,
  fetchShopBoxes,
  createShopBox,
  deleteShopBox,
  cancelShopPurchase,
  adminCreateShopUser
};

export { API };