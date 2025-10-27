"use strict"

const Database = require("./database");
const express = require("express");
const cors = require("cors");
const { body, validationResult } = require("express-validator");
const { initAuthentication, isLoggedIn } = require("./authentication");
const passport = require("passport");

const PORT = 3001;
const app = new express();
const db = new Database("database.db");

app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

initAuthentication(app, db);



app.get("/api/boxes/:ShopId", async(req, res) => { // <-- Changed
  const shopId = req.params.ShopId; // <-- Changed
  try{
    const boxes = await db.getBoxesByShopId(shopId); // <-- Changed

    if (boxes == undefined){
      return res.status(4.04).json({ error: ['Boxes not found!'] });
    }
    res.json(boxes); 
  }catch(err){
    console.error(err); 
    res.status(500).json({ error: [`Error in the database while looking for the boxes for shop number '${shopId}': '${err}'`] }); // <-- Changed
  }
});

app.get("/api/boxes", async (req, res) => {
  try {
    const boxes = await db.getBoxes();
    res.json(boxes);
    
  } catch {
    res.status(500).json({errors: ["Database error 7"]});
  }
});




app.get("/api/shops", async (req, res) => {
  try {
    
    const shops = await db.getShops();
    res.json(shops);
    
  } catch {
    res.status(500).json({errors: ["Database error 6"]});
  }
});

app.delete("/api/purchase", isLoggedIn, async (req, res) => {
  try {
    await db.deletePurchases(req.user.Username);
    res.end();
  } catch {
    res.status(500).json({errors: ["Database error 5"]});
  }
});

// Add this route to index.js
app.post("/api/boxes-by-ids", isLoggedIn, async(req, res) => {
  const ids = req.body.ids;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: 'Missing or invalid "ids" array in request body.' });
  }

  try{
    const boxes = await db.getBoxesByIds(ids);
    res.json(boxes);
  }catch(err){
    console.error(err);
    res.status(500).json({ error: [`Database error while fetching boxes by IDs: ${err}`] });
  }
});

app.post(
  "/api/purchase",
  isLoggedIn,
  async (req, res) => {
    // Check if validation is ok
    const err = validationResult(req);
    const errList = [];
    if (!err.isEmpty()) {
      errList.push(...err.errors.map(e => e.msg));
      return res.status(400).json({errors: errList});
    }
    // Check if there was already a purchase for that user
    try {
      const checkErrors = await db.checkPurchases(req.user.Username);

      if (checkErrors.length > 0) {
        res.status(422).json({errors: checkErrors});
      } else {
        // Perform the actual insertions
        await db.createPurchase( req.body.boxes, req.user.Username);
        res.end();
      }
    } catch {
      return res.status(500).json({errors: ["Database error 4"]});
    }
});


app.post(
  "/api/Contents-modifications",
  isLoggedIn,
  async(req,res) =>{
    const err = validationResult(req);
    const errList = [];
    if (!err.isEmpty()) {
      errList.push(...err.errors.map(e => e.msg));
      return res.status(400).json({errors: errList});
    }
    try{
      await db.editContent(req.body.Box_id, req.body.contents);
      res.end();
    }catch{
      res.status(500).json({errors: ["Database error 15"]});
    }
  }
)


app.post(
  "/api/Purchases-modifications",
  isLoggedIn,
  async (req, res) => {
    const err = validationResult(req);
    // ... (validation checks remain the same) ...

    try {
      // Check for wasted boxes (this check might need refinement later)
      const checkErrors = await db.checkPurchases(req.user.Username);
      if (checkErrors && checkErrors.length > 0) { // Check if checkErrors is an array
        res.status(422).json({ errors: checkErrors });
      } else {
        // Pass the removedItems from the request body to db.editPurchase
        await db.editPurchase(
          req.body.add || [],       // Boxes to add
          req.body.rem || [],       // Boxes to remove
          req.user.Username,        // User ID
          req.body.removedItems || {} // Removed items object
        );
        res.end();
      }
    } catch (err) {
      if (err && err.message && err.message.includes("is no longer available")) {
        res.status(422).json({ errors: [err.message] });
      } else {
        console.error("Error in /api/Purchases-modifications:", err); // Log full error
        res.status(500).json({ errors: ["Database error 3"] });
      }
    }
  }
);


app.post(
  "/api/session",
  body("password", "password must be a non-empty string").isString().notEmpty(),
  (req, res, next) => {
    // Check if validation is ok
    const err = validationResult(req);
    const errList = [];
    if (!err.isEmpty()) {
      errList.push(...err.errors.map(e => e.msg));
      return res.status(400).json({errors: errList});
    }

    // Perform the actual authentication
    passport.authenticate("local", (err, user) => {
      if (err) {
        res.status(err.status).json({errors: [err.msg]});
      } else {
        req.login(user, err => {
          if (err) return next(err);
          else {
            // Get the purchases for this student
            db.getPurchasesbyUser(user.username)
              .then(purchases =>  res.json({username: user.username, purchases}))
              .catch(() => {
                res.status(500).json({errors: ["Database error 2"]});
              });
          }
        });
      }
    })(req, res, next);
  }
);


app.delete("/api/session", isLoggedIn, (req, res) => {
  req.logout(() => res.end());
});


app.get("/api/session/current", isLoggedIn, async (req, res) => {
  let purchases = undefined;
  let err = false;
  await (db.getPurchasesbyUser(req.user.Username)
    .then(pr => purchases = pr)
    .catch(() => {
      res.status(500).json({errors: ["Database error 1"]});
      err = true;
    }));
  
  if (!err) res.json({username: req.user.Username, purchases});
});

// activate the server
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}/`);
});
