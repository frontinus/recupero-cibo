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

const fetchBoxesByShop = async (Shopid) => await APICall(`boxes/${Shopid}`)

const fetchShops = async () => await APICall("shops");


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

const editPurchase = async (add, rem, Boxes_id) => await APICall(
  "Purchases-modifications",
  "POST",
  JSON.stringify({add, rem, Boxes_id}),
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
  editContents
};


export { API };
