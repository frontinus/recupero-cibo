const SERVER_HOST = "http://localhost";
const SERVER_PORT = 3001;

const SERVER_BASE = `${SERVER_HOST}:${SERVER_PORT}/api/`;

/**
 * Generic API call
 *
 * @param endpoint API endpoint string to fetch
 * @param method HTTP method
 * @param body HTTP request body string
 * @param headers additional HTTP headers to be passed to 'fetch'
 * @param expectResponse wheter to expect a non-empty response body
 * 
 * @returns whatever the specified API endpoint returns
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
  // Include removedItems in the JSON body
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
 * 
 * @param username username of the user
 * @param password password of the user
 */
const login = async (username, password) => await APICall(
  "session",
  "POST",
  JSON.stringify({username: username, password}),
  { "Content-Type": "application/json" }
);

/**
 * Logout.
 * This function can return a "Not authenticated" error if the user wasn't authenticated beforehand
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
 * Creates a new shop (Admin only).
 * @param {string} name - Shop name
 * @param {string} address - Shop address
 * @param {string} phone - Shop phone number
 * @param {string} foodType - Shop food type/category
 * @returns {Promise<object>} Promise resolving to the server response (e.g., { id, message })
 */
const adminCreateShop = async (name, address, phone, foodType) => await APICall(
  "admin/shops", // Matches the endpoint in index.js
  "POST",
  JSON.stringify({ name, address, phone, foodType }), // Correct body structure
  { "Content-Type": "application/json" },
  true // Expect a JSON response with the new ID
);

/**
 * Creates a new box (Admin only).
 * @param {'Normal'|'Surprise'} type - Box type
 * @param {'Small'|'Medium'|'Large'} size - Box size
 * @param {number} price - Box price
 * @param {string} timeSpan - Retrieval time span (e.g., "HH:MM-HH:MM")
 * @returns {Promise<object>} Promise resolving to the server response (e.g., { id, message })
 */
const adminCreateBox = async (type, size, price, timeSpan) => await APICall(
  "admin/boxes", // Matches the endpoint in index.js
  "POST",
  JSON.stringify({ type, size, price, timeSpan }), // Correct body structure
  { "Content-Type": "application/json" },
  true // Expect a JSON response with the new ID
);

const API = {
  fetchBoxes,
  fetchBoxesByShop,
  deletePurchases,
  createPurchase,
  editPurchase,
  login,
  logout,
  fetchCurrentUser,
  fetchShops,
  editContents,
  fetchBoxesByIds,
  adminCreateBox,
  adminCreateShop
};


export { API };
