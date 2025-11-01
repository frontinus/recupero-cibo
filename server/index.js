"use strict"

const Database = require("./database");
const express = require("express");
const cors = require("cors");
const { body, validationResult } = require("express-validator");
const { initAuthentication, isLoggedIn, isAdmin } = require("./authentication");
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

app.get("/api/boxes/:ShopId", async(req, res) => {
  const shopId = req.params.ShopId;
  try{
    const boxes = await db.getBoxesByShopId(shopId);

    if (boxes == undefined){
      return res.status(404).json({ error: ['Boxes not found!'] });
    }
    res.json(boxes); 
  }catch(err){
    console.error(err); 
    res.status(500).json({ error: [`Error in the database while looking for the boxes for shop number '${shopId}': '${err}'`] });
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
    // FIXED: Use consistent lowercase username
    await db.deletePurchases(req.user.username);
    res.end();
  } catch {
    res.status(500).json({errors: ["Database error 5"]});
  }
});

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
    const err = validationResult(req);
    const errList = [];
    if (!err.isEmpty()) {
      errList.push(...err.errors.map(e => e.msg));
      return res.status(400).json({errors: errList});
    }
    
    try {
      // FIXED: Use consistent lowercase username
      const checkErrors = await db.checkPurchases(req.user.username);

      if (checkErrors.length > 0) {
        res.status(422).json({errors: checkErrors});
      } else {
        await db.createPurchase(req.body.boxes, req.user.username);
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
    const errList = [];
    if (!err.isEmpty()) {
      errList.push(...err.errors.map(e => e.msg));
      return res.status(400).json({errors: errList});
    }

    try {
      // FIXED: Use consistent lowercase username
      const checkErrors = await db.checkPurchases(req.user.username);
      if (checkErrors && checkErrors.length > 0) {
        res.status(422).json({ errors: checkErrors });
      } else {
        await db.editPurchase(
          req.body.add || [],
          req.body.rem || [],
          req.user.username, // FIXED: lowercase username
          req.body.removedItems || {}
        );
        res.end();
      }
    } catch (err) {
      if (err && err.message && err.message.includes("is no longer available")) {
        res.status(422).json({ errors: [err.message] });
      } else {
        console.error("Error in /api/Purchases-modifications:", err);
        res.status(500).json({ errors: ["Database error 3"] });
      }
    }
  }
);

app.post(
  "/api/session",
  body("password", "password must be a non-empty string").isString().notEmpty(),
  (req, res, next) => {
    const err = validationResult(req);
    const errList = [];
    if (!err.isEmpty()) {
      errList.push(...err.errors.map(e => e.msg));
      return res.status(400).json({errors: errList});
    }

    passport.authenticate("local", (err, user) => {
      if (err) {
        res.status(err.status).json({errors: [err.msg]});
      } else {
        req.login(user, err => {
          if (err) return next(err);
          else {
            // FIXED: Use consistent lowercase username
            db.getPurchasesbyUser(user.username)
              .then(purchases =>  {
                console.log(`POST /api/session: Found purchases for ${user.username}:`, purchases);
                res.json({username: user.username, purchases, isAdmin: user.isAdmin})
              })
              .catch(() => {
                res.status(500).json({errors: ["Database error 2"]});
              });  
          }
        });
      }
    })(req, res, next);
  }
);

app.post(
    "/api/admin/shops",
    isLoggedIn,
    isAdmin,
    [
        body("name", "Shop name is required").notEmpty().isString(),
        body("address", "Address is required").notEmpty().isString(),
        body("phone", "Phone number is required").notEmpty().isString(), 
        body("foodType", "Food type is required").notEmpty().isString(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array().map(e => e.msg) });
        }

        try {
            const { name, address, phone, foodType } = req.body;
            const shopId = await db.createShop(name, address, phone, foodType);
            res.status(201).json({ id: shopId, message: "Shop created successfully" });
        } catch (err) {
            console.error("Error creating shop:", err);
            res.status(500).json({ errors: ["Database error creating shop"] });
        }
    }
);

app.post(
    "/api/admin/boxes",
    isLoggedIn,
    isAdmin,
    [
        body("type", "Box type is required (Normal/Surprise)").isIn(['Normal', 'Surprise']),
        body("size", "Box size is required (Small/Medium/Large)").isIn(['Small', 'Medium', 'Large']),
        body("price", "Price must be a positive number").isFloat({ gt: 0 }),
        body("timeSpan", "Retrieval time span is required (e.g., 18:00-19:00)").matches(/^\d{2}:\d{2}-\d{2}:\d{2}$/),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array().map(e => e.msg) });
        }
         try {
            const { type, size, price, timeSpan } = req.body;
            const boxId = await db.createBox(type, size, price, timeSpan);
            res.status(201).json({ id: boxId, message: "Box created successfully" });
        } catch (err) {
            console.error("Error creating box:", err);
            res.status(500).json({ errors: ["Database error creating box"] });
        }
    }
);

app.delete("/api/session", isLoggedIn, (req, res) => {
  req.logout(() => res.end());
});

app.get("/api/session/current", isLoggedIn, async (req, res) => {
  let purchases = undefined;
  let err = false;
  
  // FIXED: Use consistent lowercase username
  await (db.getPurchasesbyUser(req.user.username)
    .then(pr => purchases = pr)
    .catch(() => {
      res.status(500).json({errors: ["Database error 1"]});
      err = true;
    }));
  
  if (!err) res.json({username: req.user.username, purchases, isAdmin: req.user.isAdmin});
});


app.post(
  "/api/register",
  [
    body("username", "Username must be at least 3 characters long")
      .trim()
      .isLength({ min: 3 }),
    body("username", "Username must contain only letters and numbers")
      .isAlphanumeric(),
    body("password", "Password must be at least 6 characters long")
      .isLength({ min: 6 }),
  ],
  async (req, res) => {
    // Check if validation is ok
    const err = validationResult(req);
    const errList = [];
    if (!err.isEmpty()) {
      errList.push(...err.errors.map(e => e.msg));
      return res.status(400).json({errors: errList});
    }

    try {
      // Register the new user
      const newUser = await db.registerUser(req.body.username, req.body.password);
      
      // Automatically log in the new user
      req.login(newUser, err => {
        if (err) {
          console.error("Error auto-logging in new user:", err);
          return res.status(500).json({errors: ["Registration successful but login failed. Please login manually."]});
        }
        
        // Return user info with empty purchases array
        res.status(201).json({
          username: newUser.username,
          purchases: [],
          isAdmin: newUser.isAdmin
        });
      });
    } catch (err) {
      console.error("Registration error:", err);
      if (err.status === 409) {
        return res.status(409).json({errors: ["Username already exists"]});
      }
      return res.status(500).json({errors: ["Registration failed. Please try again."]});
    }
  }
);

// Get available items (food catalog)
app.get("/api/items", async (req, res) => {
    try {
        const items = await db.getAllItems();
        res.json(items);
    } catch (err) {
        console.error("Error fetching items:", err);
        res.status(500).json({ errors: ["Failed to fetch items"] });
    }
});

// Create new food item (Admin only)
app.post(
    "/api/admin/items",
    isLoggedIn,
    isAdmin,
    [
        body("itemName", "Item name is required").notEmpty().trim().isString(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array().map(e => e.msg) });
        }

        try {
            const { itemName } = req.body;
            const result = await db.createItem(itemName);
            res.status(201).json({ id: result, message: "Item created successfully" });
        } catch (err) {
            console.error("Error creating item:", err);
            if (err.message && err.message.includes('UNIQUE constraint')) {
                res.status(409).json({ errors: ["Item already exists"] });
            } else {
                res.status(500).json({ errors: [err.message || "Failed to create item"] });
            }
        }
    }
);

// Add item to box (Admin only)
app.post(
    "/api/admin/add-item-to-box",
    isLoggedIn,
    isAdmin,
    [
        body("boxId", "Box ID is required").isInt(),
        body("itemName", "Item name is required").notEmpty().isString(),
        body("quantity", "Quantity must be a positive number").isInt({ min: 1 }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array().map(e => e.msg) });
        }

        try {
            const { boxId, itemName, quantity } = req.body;
            await db.addItemToBox(boxId, itemName, quantity);
            res.status(200).json({ message: "Item added to box successfully" });
        } catch (err) {
            console.error("Error adding item to box:", err);
            res.status(500).json({ errors: [err.message || "Failed to add item to box"] });
        }
    }
);

// Assign box to shop
app.post(
    "/api/admin/assign-box-shop",
    isLoggedIn,
    isAdmin,
    [
        body("boxId", "Box ID is required").isInt(),
        body("shopId", "Shop ID is required").isInt(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array().map(e => e.msg) });
        }

        try {
            const { boxId, shopId } = req.body;
            await db.addBoxToShop(boxId, shopId);
            res.status(200).json({ message: "Box assigned to shop successfully" });
        } catch (err) {
            console.error("Error assigning box to shop:", err);
            res.status(500).json({ errors: ["Failed to assign box to shop"] });
        }
    }
);

// Assign box to user (forcefully create purchase)
app.post(
    "/api/admin/assign-box-user",
    isLoggedIn,
    isAdmin,
    [
        body("boxId", "Box ID is required").isInt(),
        body("username", "Username is required").notEmpty().isString(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array().map(e => e.msg) });
        }

        try {
            const { boxId, username } = req.body;
            await db.assignBoxToUser(boxId, username);
            res.status(200).json({ message: "Box assigned to user successfully" });
        } catch (err) {
            console.error("Error assigning box to user:", err);
            res.status(500).json({ errors: [err.message || "Failed to assign box to user"] });
        }
    }
);

// Remove box from shop
app.delete(
    "/api/admin/remove-box-shop",
    isLoggedIn,
    isAdmin,
    [
        body("boxId", "Box ID is required").isInt(),
        body("shopId", "Shop ID is required").isInt(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array().map(e => e.msg) });
        }

        try {
            const { boxId, shopId } = req.body;
            await db.removeBoxFromShop(boxId, shopId);
            res.status(200).json({ message: "Box removed from shop successfully" });
        } catch (err) {
            console.error("Error removing box from shop:", err);
            res.status(500).json({ errors: ["Failed to remove box from shop"] });
        }
    }
);

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}/`);
});
