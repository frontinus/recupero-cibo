"use strict"

const sqlite = require("sqlite3");
const crypto = require("crypto");

/**
 * Wrapper around db.all
 */
const dbAllAsync = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else     resolve(rows);
  });
});

/**
 * Wrapper around db.run
 */
const dbRunAsync = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, err => {
    if (err) reject(err);
    else     resolve();
  });
});

/**
 * Wrapper around db.get
 */
const dbGetAsync = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else     resolve(row);
  });
});

// Helper to begin a transaction
const dbBeginTransaction = (db) => new Promise((resolve, reject) => {
  db.run("BEGIN TRANSACTION", err => err ? reject(err) : resolve());
});

// Helper to commit
const dbCommit = (db) => new Promise((resolve, reject) => {
  db.run("COMMIT", err => err ? reject(err) : resolve());
});

// Helper to roll back
const dbRollback = (db) => new Promise((resolve, reject) => {
  db.run("ROLLBACK", err => err ? reject(err) : resolve());
});

/**
 * Interface to the sqlite database for the application
 *
 * @param dbname name of the sqlite3 database file to open
 */
function Database(dbname) {
  this.db = new sqlite.Database(dbname, err => {
    if (err) throw err;
    this.db.run("PRAGMA foreign_keys = ON;");
  });

  /**
   * Retrieve the list of all boxes from the db
   *
   * @returns a Promise that resolves to the list of boxes
   * 
   *          
   */

  this.getPurchases = async () => {
    const purchases = await dbAllAsync(this.db,"select * from Purchases")

    return purchases
  }

  this.getBoxes = async () => {
    try {
      const boxes = (await dbAllAsync(this.db, "SELECT * FROM Boxes"))
                      .map(c => ({...c, Contents: []}));
                      
      // Select quantity here too
      const contents = await dbAllAsync(this.db, "SELECT Box_id, content_name, quantity FROM Boxcontent");
      
      for (const {Box_id, content_name, quantity} of contents) {
        const main = boxes.find(c => c.ID === Box_id);
        if (!main) { 
            // More specific error message
            throw new Error(`DB inconsistent: Boxcontent references Box_id ${Box_id} which does not exist in Boxes table.`);
        }
        // Use 'name' property to be consistent
        main.Contents.push({ name: content_name, quantity: quantity }); 
      }
      return boxes;
    } catch (error) {
      console.error("Error in getBoxes:", error);
      throw error;
    }
  };

  this.getShops = async () => {
    try{
    const shops = (await dbAllAsync(this.db, "select * from Shops")).map(c => ({...c, Boxes: []}))
    const sellers = await dbAllAsync(this.db, "select * from Boxinshop");

    for (const {Box_id, Shop_id} of sellers) {
      // Append incompatibility to the correct course
      const main = shops.find(c => c.Shopid === Shop_id);
      if (!main) {throw new Error("DB inconsistent: Shop not found");}


      main.Boxes.push(Box_id);}
    
    return shops;
  }catch (error) {
    console.error("Error in getShops:", error);
    throw error; // Rethrow the error to propagate it up the call stack
  }
};

  this.getContents = async () =>{
    const contents = await dbAllAsync(this.db, "select * from Contents")
    return contents
  };

  this.getContentsByBox = async Box_id =>{
    const contents = await dbAllAsync(this.db,"select * from Boxcontent where Box_id = ?",[Box_id])
    return contents
  }

  this.getBoxOwner = async Box_id =>{
    const owner = await dbAllAsync(this.db,"Select Username from Purchases where Box_id = ?",[Box_id])

    return owner
  } 

  this.getPurchasesbyUser = async Username => {
    return (await dbAllAsync(
      this.db,
      "select Box_id from Purchases where Username = ?",
      [Username]
    )).map(c => c.Box_id);
  };

  this.getBoxIdsByShopId = async ShopId => {
    return (await dbAllAsync(
      this.db,
      "select Box_id from Boxinshop where Shop_id = ?",
      [ShopId]
    )).map(c => c.Box_id);
  };

  this.getContentsbyBox = async Box_id => {
    return (await dbAllAsync(
      this.db,
      "select content_name from Boxcontent where Box_id = ?",
      [Box_id]
    )).map(c => c.content_name);
  };
  this.deleteContent = (content_name,Box_id) =>Promise.all([
    dbAllAsync(
      this.db,
      "delete from Boxcontent where content_name = ? and Box_id =?",
      [content_name,Box_id])
  ]);
  
 
  this.deletePurchases = (UserName) => Promise.all([
    dbRunAsync(
      this.db,
      "delete from Purchases where Username = ?",
      [UserName]
    )
  ]);

  this.getTimeSpanFromid = async Box_id => {
    return (await dbAllAsync(
      this.db,
      "Select Retrieve_time_span FROM Boxes WHERE ID = ?",
      [Box_id]
    )).map(c => c.Retrieve_time_span)
  };

  /**
   * Create a new Purchase for the specified user.
   * This function assumes the input to be correct, please validate it beforehand with 'checkStudyPlan'.
   * 
   * @param fullTime boolean, distinguishes beetween full-time and part-time
   * @param bl list of boxes ids that make up the purchase
   * @param userId id of the student
   * 
   * @returns a Promise that resolves to nothing on success
   */
  this.createPurchase = (bl, userName) => {

    let p;

    if (bl.length > 0) {
      const sql = "insert into Purchases (Username, Box_id) values " + bl
        .map((c, i, a) => "(?, ?)" + (i < a.length - 1 ? "," : ""))
        .reduce((prev, cur) => prev + cur);
      const values = bl.flatMap(c => [userName, c]);

      p = dbRunAsync(this.db, sql, values);
    } else
      p = Promise.resolve();

    return Promise.all([p]);
  };
  this.ChangeOwnershipStatus = Box_id => Promise.all(
    [ dbRunAsync(this.db,"Update Boxes SET Is_owned = NOT Is_owned Where ID=?",[Box_id]) ]
  );
  /**
   * Edit the current study plan for the specified student by adding and removing the given courses
   * @param bl list of course codes to be removed from the study plan
   * @param userId id of the student
   */

  this.editContent = (box_id,contents) =>{
    const cRem = contents.map(c => dbRunAsync(this.db,"delete from Boxcontent where (Box_id = ? and content_name = ?)", [box_id, contents]));
    return Promise.all([cRem])
  }

  const dbBeginTransaction = (db) => new Promise((resolve, reject) => {
    db.run("BEGIN TRANSACTION", err => err ? reject(err) : resolve());
  });
  const dbCommit = (db) => new Promise((resolve, reject) => {
    db.run("COMMIT", err => err ? reject(err) : resolve());
  });
  const dbRollback = (db) => new Promise((resolve, reject) => {
    db.run("ROLLBACK", err => err ? reject(err) : resolve());
  });


this.editPurchase = async (boxesToAdd, boxesToRemove, userId, removedItems) => {
  console.log("=== editPurchase Transaction Start ===");
  console.log("User:", userId);
  console.log("Boxes to Add:", boxesToAdd);
  console.log("Boxes to Remove:", boxesToRemove);
  console.log("Items to Remove:", JSON.stringify(removedItems, null, 2));
  
  await dbBeginTransaction(this.db);

  try {
    // --- 1. Validate Input ---
    if (!userId) {
      throw new Error("User ID is required");
    }

    // --- 2. Check Availability of Boxes to Add ---
    if (boxesToAdd.length > 0) {
      const placeholders = boxesToAdd.map(() => '?').join(',');
      const sqlCheck = `SELECT ID, Is_owned FROM Boxes WHERE ID IN (${placeholders})`;
      const boxes = await dbAllAsync(this.db, sqlCheck, boxesToAdd);
      
      // Check if all requested boxes exist
      if (boxes.length !== boxesToAdd.length) {
        const foundIds = boxes.map(b => b.ID);
        const missingIds = boxesToAdd.filter(id => !foundIds.includes(id));
        throw new Error(`Box(es) not found: ${missingIds.join(', ')}`);
      }
      
      // Check if any are already owned
      const unavailableBoxes = boxes.filter(box => box.Is_owned);
      if (unavailableBoxes.length > 0) {
        throw new Error(`Box ${unavailableBoxes[0].ID} is no longer available.`);
      }
    }

    // --- 3. Add New Purchases ---
    if (boxesToAdd.length > 0) {
      const sqlAdd = "INSERT INTO Purchases (Username, Box_id) VALUES " + 
        boxesToAdd.map(() => "(?, ?)").join(", ");
      const paramsAdd = boxesToAdd.flatMap(c => [userId, c]);
      
      console.log("Executing INSERT:", sqlAdd);
      console.log("With params:", paramsAdd);
      
      await dbRunAsync(this.db, sqlAdd, paramsAdd);
    }

    // --- 4. Remove Purchases ---
    for (const boxId of boxesToRemove) {
      console.log(`Removing purchase: User=${userId}, Box=${boxId}`);
      
      await dbRunAsync(
        this.db,
        "DELETE FROM Purchases WHERE (Username = ? AND Box_id = ?)",
        [userId, boxId]
      );
    }

    // --- 5. Toggle Ownership Status ---
    const allBoxesToToggle = [...boxesToAdd, ...boxesToRemove];
    for (const boxId of allBoxesToToggle) {
      console.log(`Toggling ownership for box ${boxId}`);
      
      await dbRunAsync(
        this.db,
        "UPDATE Boxes SET Is_owned = NOT Is_owned WHERE ID = ?",
        [boxId]
      );
    }

    // --- 6. Remove Specific Items from Box Contents ---
    // FIXED: Enhanced with better validation and error handling
    if (removedItems && Object.keys(removedItems).length > 0) {
      console.log("=== Processing Item Removals ===");
      
      for (const boxIdStr in removedItems) {
        const boxId = parseInt(boxIdStr, 10);
        const itemsToRemove = removedItems[boxIdStr];

        if (!Array.isArray(itemsToRemove) || itemsToRemove.length === 0) {
          console.log(`Skipping box ${boxId}: no items to remove or invalid format`);
          continue;
        }

        // Verify the box exists and user owns it
        const ownership = await dbGetAsync(
          this.db,
          "SELECT * FROM Purchases WHERE Username = ? AND Box_id = ?",
          [userId, boxId]
        );

        if (!ownership) {
          console.warn(`Warning: User ${userId} does not own box ${boxId}, skipping item removal`);
          continue;
        }

        // Get current contents for this box
        const currentContents = await dbAllAsync(
          this.db,
          "SELECT content_name, quantity FROM Boxcontent WHERE Box_id = ?",
          [boxId]
        );

        console.log(`Box ${boxId} current contents:`, currentContents);

        // Validate that items to remove actually exist in the box
        const availableItemNames = currentContents.map(c => c.content_name);
        const validItemsToRemove = itemsToRemove.filter(item => {
          if (availableItemNames.includes(item)) {
            return true;
          } else {
            console.warn(`Warning: Item '${item}' not found in box ${boxId}, skipping`);
            return false;
          }
        });

        // Enforce the 2-item removal limit
        if (validItemsToRemove.length > 2) {
          throw new Error(`Cannot remove more than 2 items from box ${boxId}. Attempted to remove ${validItemsToRemove.length} items.`);
        }

        // Perform the deletions
        for (const itemName of validItemsToRemove) {
          console.log(`Deleting item '${itemName}' from box ${boxId}`);
          
          const result = await dbRunAsync(
            this.db,
            "DELETE FROM Boxcontent WHERE Box_id = ? AND content_name = ?",
            [boxId, itemName]
          );

          console.log(`Delete result for '${itemName}':`, result);
        }

        console.log(`Successfully removed ${validItemsToRemove.length} items from box ${boxId}`);
      }
    }

    // --- 7. Commit Transaction ---
    console.log("=== All operations successful, committing transaction ===");
    await dbCommit(this.db);
    console.log("=== Transaction committed successfully ===");

  } catch (err) {
    // --- 8. Rollback on Error ---
    console.error("=== ERROR in editPurchase, rolling back transaction ===");
    console.error("Error details:", err);
    
    try {
      await dbRollback(this.db);
      console.log("=== Rollback successful ===");
    } catch (rollbackErr) {
      console.error("=== CRITICAL: Rollback failed ===", rollbackErr);
    }
    
    throw err;
  }
};

  /**
   * Authenticate a user from their username and password
   * 
   * @param username email of the user to authenticate
   * @param password password of the user to authenticate
   * 
   * @returns a Promise that resolves to the user object {id, username, name, fullTime}
   */
  this.authUser = (username, password) => new Promise((resolve, reject) => {
    dbGetAsync(
      this.db,
      // Select isAdmin
      "SELECT * FROM Users WHERE Username = ?",
      [username]
    )
      .then(user => {
        if (!user){ 
        return resolve(false); 
        }// Use return for clarity

        crypto.scrypt(password, user.Salt, 32, (err, hash) => {
          if (err){ 
            return reject(err);
            } // Use return

          if (crypto.timingSafeEqual(hash, Buffer.from(user.HashedPassword, "hex"))) {
            // Return user object including isAdmin
            resolve({ id: user.ID, username: user.Username, isAdmin: user.IsAdmin === 1 }); // Convert 1/0 to boolean
          } else {
            resolve(false);
          }
        });
      })
      .catch(e => {
        console.error(`authUser: Database error fetching user ${username}:`, e);
        reject(e)
      });
  });

  /**
   * Retrieve the student with the specified id
   * 
   * @param id the id of the student to retrieve
   * 
   * @returns a Promise that resolves to the user object {id, username, name, fullTime}
   */
  this.getUserbyId = async id => {
      const user = await dbGetAsync(
        this.db,
        // Select isAdmin
        "SELECT ID, Username, IsAdmin FROM Users WHERE ID = ? ",
        [id]
      );
      // Convert isAdmin 1/0 to boolean if user found
      if (user) {
          user.isAdmin = user.IsAdmin === 1;
      }
      return user; // Return the user object (or undefined if not found)
  };

  this.checkBox = async(Box_id) => {
    try{
      let o = await Promise.all([
          this.getBoxOwner(Box_id)
        ]);
      if(o.length>0){
        return{
          result: false,
          reason:"this box is already owned"
        };
      } else{
        return {
          result: true,
          reason: "Box is available for purchase",
        };
      }
    }catch(error){
      console.error("Error checking box ownership:", error);
      return {
        result: false,
        reason: "Error while checking box ownership"
      }
    }
  };
  /**
     * Retrieve the student with the specified id
     * 
     * @param id the id of the student to retrieve
     * 
     * @returns a Promise that resolves to the user object {id, username, name, fullTime}
     */
  this.checkPurchases = async(userId) =>{
  try {
    const curPurchases = await this.getPurchasesbyUser(userId);
    for (const purchase of curPurchases) {
      const timeSpan = (await this.getTimeSpanFromid(purchase)).toString()
      const maxTime = timeSpan.split('-')[1];
      const [maxHours, maxMins] = maxTime.split(':');
      
      const higherLimit = new Date();
      higherLimit.setHours(maxHours, maxMins, 0, 0);

      if (higherLimit < new Date()) {
        return {
          result: false,
          reason: `The box with ID ${purchase} is already wasted.`,
        };
      }
    }

    return [];
  } catch (error) {
    console.error("Error checking box ownership:", error);
    return {
      result: false,
      reason: "Error while checking box ownership",
    };
  }
  }

// Add this new function to database.js
this.getBoxesByShopId = async (shopId) => {
    // 1. Get the box IDs for the shop
    const boxIds = (await dbAllAsync(
      this.db,
      "SELECT Box_id FROM Boxinshop WHERE Shop_id = ?", // Uses the correct Shop_id
      [shopId]
    )).map(c => c.Box_id);

    if (boxIds.length === 0) {
      return []; // No boxes for this shop
    }

    // 2. Get the full details for those boxes
    const placeholders = boxIds.map(() => '?').join(',');
    const boxes = (await dbAllAsync(
      this.db,
      `SELECT * FROM Boxes WHERE ID IN (${placeholders})`,
      boxIds
    )).map(c => ({...c, Contents: []})); // Prepare for contents

    // 3. Get the contents for those boxes
    const contents = await dbAllAsync(
      this.db,
      `SELECT * FROM Boxcontent WHERE Box_id IN (${placeholders})`,
      boxIds
    );

    // 4. Combine boxes with their contents
    for (const {Box_id, content_name, quantity} of contents) {
      const main = boxes.find(c => c.ID === Box_id);
      if (main) {
        main.Contents.push({name: content_name, quantity: quantity});
      }
    }

    return boxes;
  };


  // Add this new function to database.js
  this.getBoxesByName = async (shopName) => {
    // 1. Get box IDs using Shop_name
    const boxIds = (await dbAllAsync(
      this.db,
      "SELECT Box_id FROM Boxinshop WHERE Shop_name = ?", // Uses Shop_name
      [shopName]
    )).map(c => c.Box_id);

    if (boxIds.length === 0) return [];

    // 2. Get box details
    const placeholders = boxIds.map(() => '?').join(',');
    const boxes = (await dbAllAsync(
      this.db,
      `SELECT * FROM Boxes WHERE ID IN (${placeholders})`,
      boxIds
    )).map(c => ({...c, Contents: []}));

    // 3. Get contents including quantity
    const contents = await dbAllAsync(
      this.db,
      `SELECT Box_id, content_name, quantity FROM Boxcontent WHERE Box_id IN (${placeholders})`, // Select quantity
      boxIds
    );

    // 4. Combine using the correct object structure
    for (const {Box_id, content_name, quantity} of contents) {
      const main = boxes.find(c => c.ID === Box_id);
      if (main) {
        // Use 'name' property
        main.Contents.push({ name: content_name, quantity: quantity }); 
      }
    }
    return boxes;
  };

  // Add this function to database.js
  this.getBoxesByIds = async (ids) => {
    if (!ids || ids.length === 0) {
      return [];
    }

    // 1. Get the full details for the requested box IDs
    const placeholders = ids.map(() => '?').join(',');
    const boxes = (await dbAllAsync(
      this.db,
      `SELECT * FROM Boxes WHERE ID IN (${placeholders})`,
      ids
    )).map(c => ({...c, Contents: []}));

    // 2. Get the contents for those boxes
    const contents = await dbAllAsync(
      this.db,
      `SELECT * FROM Boxcontent WHERE Box_id IN (${placeholders})`,
      ids
    );

    // 3. Combine boxes with their contents
    for (const {Box_id, content_name, quantity} of contents) {
      const main = boxes.find(c => c.ID === Box_id);
      if (main) {
        main.Contents.push({name:content_name, quantity: quantity});
      }
    }

    return boxes;
  };

  /**
   * Creates a new shop.
   * @returns {Promise<number>} Promise resolving to the ID of the newly created shop.
   */
  this.createShop = async (name, address, phone, foodType) => {
    return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO Shops(ShopName, Adress, Phone_nb, Food_type) VALUES(?, ?, ?, ?)';
        this.db.run(sql, [name, address, phone, foodType], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID); // Returns the ID of the inserted row
            }
        });
    });
  };

/**
 * Creates a new box - FIXED VERSION
 * @returns {Promise<number>} Promise resolving to the ID of the newly created box.
 */
this.createBox = async (type, size, price, timeSpan) => {
     return new Promise((resolve, reject) => {
        // Don't specify ID - let it auto-increment
        const sql = 'INSERT INTO Boxes(Type, Size, Price, Retrieve_time_span, Is_owned) VALUES(?, ?, ?, ?, 0)';
        this.db.run(sql, [type, size, price, timeSpan], function(err) {
            if (err) {
                console.error('Error creating box:', err);
                reject(err);
            } else {
                console.log('Box created with ID:', this.lastID);
                resolve(this.lastID);
            }
        });
     });
};

   /**
   * Creates a new food item type (if you add an Items table).
   * Example - adjust if your schema is different or if you don't need a separate Items table.
   * @returns {Promise<number>} Promise resolving to the ID of the newly created item.
   */
   this.createItem = async (itemName) => {
       // Check if your DB has a separate 'Items' table or if 'content_name' is just text
       // If just text, this function might not be needed.
       // Example assuming an 'Items' table:
       return new Promise((resolve, reject) => {
          const sql = 'INSERT INTO Contents(NAME) VALUES(?)'; // Use Contents table?
          this.db.run(sql, [itemName], function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
          });
       });
   };

  /**
   * Adds an item with quantity to a specific box.
   */
  this.addItemToBox = async (boxId, itemName, quantity) => {
      const sql = 'INSERT INTO Boxcontent(Box_id, content_name, quantity) VALUES (?, ?, ?)';
      return dbRunAsync(this.db, sql, [boxId, itemName, quantity]);
  };

  /**
   * Associates a box with a shop.
   */
  this.addBoxToShop = async (boxId, shopId) => {
      const sql = 'INSERT INTO Boxinshop(Box_id, Shop_id) VALUES (?, ?)';
      return dbRunAsync(this.db, sql, [boxId, shopId]);
  };

   /**
    * Updates the retrieval time span for a box.
    */
   this.updateBoxTime = async (boxId, newTimeSpan) => {
       const sql = 'UPDATE Boxes SET Retrieve_time_span = ? WHERE ID = ?';
       return dbRunAsync(this.db, sql, [newTimeSpan, boxId]);
   };

   // --- More Admin Functions (Remove Box, Assign/Unassign - Add implementations as needed) ---
   // Example: Remove Box (Needs careful handling of foreign keys/existing purchases)
   this.removeBox = async (boxId) => {
       // Consider implications: What happens if a user has this box reserved?
       // Option 1: Prevent deletion if reserved.
       // Option 2: Delete associated purchases too (cascade delete). Requires DB setup or manual delete.
       // Option 3: Mark the box as 'deleted' or 'inactive' instead of actual deletion.

       // Simplest (potentially problematic) version:
       await dbBeginTransaction(this.db);
       try {
           await dbRunAsync(this.db, "DELETE FROM Boxcontent WHERE Box_id = ?", [boxId]);
           await dbRunAsync(this.db, "DELETE FROM Boxinshop WHERE Box_id = ?", [boxId]);
           await dbRunAsync(this.db, "DELETE FROM Purchases WHERE Box_id = ?", [boxId]); // Remove existing purchases of this box
           await dbRunAsync(this.db, "DELETE FROM Boxes WHERE ID = ?", [boxId]);
           await dbCommit(this.db);
       } catch (err) {
           await dbRollback(this.db);
           throw err;
       }
   };

   // Example: Assign Box to User (Forcefully creates a purchase)
   this.assignBoxToUser = async (boxId, username) => {
        // WARNING: This bypasses availability checks, time checks, one-per-shop rule etc. Use with caution.
        await dbBeginTransaction(this.db);
        try {
            // Check if user already has it
            const existing = await dbGetAsync(this.db, "SELECT * FROM Purchases WHERE Username = ? AND Box_id = ?", [username, boxId]);
            if (!existing) {
                // Check if box exists and isn't owned (or assign regardless?)
                const box = await dbGetAsync(this.db, "SELECT Is_owned FROM Boxes WHERE ID = ?", [boxId]);
                if (!box) throw new Error("Box not found");
                if (box.Is_owned) throw new Error("Box already owned by someone else"); // Or override?

                await dbRunAsync(this.db, "INSERT INTO Purchases(Username, Box_id) VALUES (?, ?)", [username, boxId]);
                await dbRunAsync(this.db, "UPDATE Boxes SET Is_owned = 1 WHERE ID = ?", [boxId]); // Mark as owned
            }
            await dbCommit(this.db);
        } catch (err) {
            await dbRollback(this.db);
            throw err;
        }
   };

   // Example: Unassign Box from User
   this.unassignBoxFromUser = async (boxId, username) => {
        await dbBeginTransaction(this.db);
        try {
            const deleted = await dbRunAsync(this.db, "DELETE FROM Purchases WHERE Username = ? AND Box_id = ?", [username, boxId]);
            // Check if anyone still owns the box - simplistic check assumes only one owner possible here
            const owner = await this.getBoxOwner(boxId);
            if (!owner || owner.length === 0) {
                 await dbRunAsync(this.db, "UPDATE Boxes SET Is_owned = 0 WHERE ID = ?", [boxId]); // Mark as not owned if no one has it
            }
            await dbCommit(this.db);
        } catch(err) {
            await dbRollback(this.db);
            throw err;
        }
   };

   /**
 * Register a new user
 * 
 * @param username username for the new user
 * @param password plain text password (will be hashed)
 * 
 * @returns a Promise that resolves to the new user object {id, username, isAdmin}
 */
this.registerUser = (username, password) => new Promise((resolve, reject) => {
  // First check if username already exists
  dbGetAsync(
    this.db,
    "SELECT Username FROM Users WHERE Username = ?",
    [username]
  )
    .then(existingUser => {
      if (existingUser) {
        reject({ status: 409, msg: 'Username already exists' });
        return;
      }

      // Generate salt and hash password
      const salt = crypto.randomBytes(16).toString('hex');
      crypto.scrypt(password, salt, 32, (err, derivedKey) => {
        if (err) {
          reject({ status: 500, msg: 'Error hashing password' });
          return;
        }

        const hashedPassword = derivedKey.toString('hex');

        // Insert new user
        this.db.run(
          'INSERT INTO Users (Username, HashedPassword, Salt, IsAdmin) VALUES (?, ?, ?, 0)',
          [username, hashedPassword, salt],
          function(err) {
            if (err) {
              console.error('Error inserting user:', err);
              reject({ status: 500, msg: 'Database error during registration' });
              return;
            }

            // Return the new user object
            resolve({
              id: this.lastID,
              username: username,
              isAdmin: false
            });
          }
        );
      });
    })
    .catch(err => {
      console.error('Error checking existing user:', err);
      reject({ status: 500, msg: 'Database error' });
    });
});

/**
 * Get all available food items from Contents table
 */
this.getAllItems = async () => {
    const sql = 'SELECT * FROM Contents ORDER BY NAME';
    return dbAllAsync(this.db, sql);
};

/**
 * Create a new food item
 */
this.createItem = async (itemName) => {
    return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO Contents(NAME) VALUES(?)';
        this.db.run(sql, [itemName], function(err) {
            if (err) {
                console.error('Error creating item:', err);
                reject(err);
            } else {
                console.log('Item created with ID:', this.lastID);
                resolve(this.lastID);
            }
        });
    });
};

/**
 * Remove a box from a shop
 */
this.removeBoxFromShop = async (boxId, shopId) => {
    const sql = 'DELETE FROM Boxinshop WHERE Box_id = ? AND Shop_id = ?';
    return dbRunAsync(this.db, sql, [boxId, shopId]);
};

// Note: addBoxToShop and assignBoxToUser already exist in your database.js file
// But here's an enhanced version with better error handling:

/**
 * Add a box to a shop (enhanced with checks)
 */
this.addBoxToShop = async (boxId, shopId) => {
    // Check if box exists
    const box = await dbGetAsync(this.db, "SELECT ID FROM Boxes WHERE ID = ?", [boxId]);
    if (!box) {
        throw new Error(`Box with ID ${boxId} does not exist`);
    }

    // Check if shop exists
    const shop = await dbGetAsync(this.db, "SELECT Shopid FROM Shops WHERE Shopid = ?", [shopId]);
    if (!shop) {
        throw new Error(`Shop with ID ${shopId} does not exist`);
    }

    // Check if assignment already exists
    const existing = await dbGetAsync(
        this.db,
        "SELECT * FROM Boxinshop WHERE Box_id = ? AND Shop_id = ?",
        [boxId, shopId]
    );
    if (existing) {
        throw new Error(`Box ${boxId} is already assigned to shop ${shopId}`);
    }

    // Create the assignment
    const sql = 'INSERT INTO Boxinshop(Box_id, Shop_id) VALUES (?, ?)';
    return dbRunAsync(this.db, sql, [boxId, shopId]);
};

/**
 * Assign a box to a user (enhanced with checks)
 */
this.assignBoxToUser = async (boxId, username) => {
    await dbBeginTransaction(this.db);
    try {
        // Check if box exists
        const box = await dbGetAsync(this.db, "SELECT ID, Is_owned FROM Boxes WHERE ID = ?", [boxId]);
        if (!box) {
            throw new Error(`Box with ID ${boxId} does not exist`);
        }
        if (box.Is_owned) {
            throw new Error(`Box ${boxId} is already owned by someone else`);
        }

        // Check if user exists
        const user = await dbGetAsync(this.db, "SELECT Username FROM Users WHERE Username = ?", [username]);
        if (!user) {
            throw new Error(`User ${username} does not exist`);
        }

        // Check if user already has this box
        const existing = await dbGetAsync(
            this.db,
            "SELECT * FROM Purchases WHERE Username = ? AND Box_id = ?",
            [username, boxId]
        );
        if (existing) {
            throw new Error(`User ${username} already has box ${boxId}`);
        }

        // Create purchase
        await dbRunAsync(
            this.db,
            "INSERT INTO Purchases(Username, Box_id) VALUES (?, ?)",
            [username, boxId]
        );

        // Mark box as owned
        await dbRunAsync(
            this.db,
            "UPDATE Boxes SET Is_owned = 1 WHERE ID = ?",
            [boxId]
        );

        await dbCommit(this.db);
    } catch (err) {
        await dbRollback(this.db);
        throw err;
    }
};

}
module.exports = Database;
