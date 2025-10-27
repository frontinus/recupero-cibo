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

  this.getBoxesbyId = async ShopId => {
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

  // In database.js

this.editPurchase = async (boxesToAdd, boxesToRemove, userId, removedItems) => {
  console.log("--- editPurchase called ---");
  console.log("User:", userId);
  console.log("Boxes to Add:", boxesToAdd);
  console.log("Boxes to Remove:", boxesToRemove);
  console.log("Items to Remove:", JSON.stringify(removedItems, null, 2)); // Log the critical object
  await dbBeginTransaction(this.db); //

  try {
    // --- 1. Check Availability ---
    if (boxesToAdd.length > 0) { //
      const placeholders = boxesToAdd.map(() => '?').join(',');
      const sqlCheck = `SELECT ID, Is_owned FROM Boxes WHERE ID IN (${placeholders})`; //
      const unavailableBoxes = (await dbAllAsync(this.db, sqlCheck, boxesToAdd))
                                  .filter(box => box.Is_owned); //
      if (unavailableBoxes.length > 0) { //
        throw new Error(`Box ${unavailableBoxes[0].ID} is no longer available.`); //
      }
    }

    // --- 2. Add Purchases ---
    let pAdd = Promise.resolve();
    if (boxesToAdd.length > 0) { //
      const sqlAdd = "INSERT INTO Purchases (Username, Box_id) VALUES " + boxesToAdd
        .map(() => "(?, ?)").join(", "); //
      const paramsAdd = boxesToAdd.flatMap(c => [userId, c]); //
      pAdd = dbRunAsync(this.db, sqlAdd, paramsAdd); //
    }

    // --- 3. Remove Purchases ---
    const pRem = boxesToRemove.map(boxId => dbRunAsync( //
      this.db,
      "DELETE FROM Purchases WHERE (Username = ? AND Box_id = ?)", //
      [userId, boxId]
    ));

    // --- 4. Toggle Ownership ---
    const allBoxesToToggle = [...boxesToAdd, ...boxesToRemove]; //
    const pToggle = allBoxesToToggle.map(boxId => dbRunAsync( //
      this.db,
      "UPDATE Boxes SET Is_owned = NOT Is_owned WHERE ID = ?", //
      [boxId]
    ));

    // --- 5. Remove Specific Items ---
    const pRemoveItems = []; //
    for (const boxIdStr in removedItems) { //
      const boxId = parseInt(boxIdStr, 10); //
      const itemsToRemove = removedItems[boxIdStr]; //

      if (itemsToRemove && itemsToRemove.length > 0) { //
        itemsToRemove.forEach(itemName => { //
          console.log(` ---> Preparing DELETE for Box ID: ${boxId}, Item: '${itemName}'`);
          // --- THIS IS THE CRITICAL PART ---
          pRemoveItems.push(dbRunAsync( //
            this.db,
            "DELETE FROM Boxcontent WHERE Box_id = ? AND content_name = ?", //
            [boxId, itemName] // Make sure boxId and itemName are correct
          ).catch(e => { // ADD CATCH HERE
     console.error(`ERROR deleting item '${itemName}' from box ${boxId}:`, e);
     throw e; // Re-throw to ensure transaction rolls back
  }));
        });
      }
    }

    // --- 6. Wait ---
    await Promise.all([pAdd, ...pRem, ...pToggle, ...pRemoveItems]); //

    // --- 7. Commit ---
    console.log("--- Operations successful, attempting COMMIT ---");
    await dbCommit(this.db); //
    console.log("--- COMMIT successful ---");

  } catch (err) {
    // --- 8. Rollback ---
    console.error("--- Error occurred, attempting ROLLBACK ---", err);
    await dbRollback(this.db); //
    console.log("--- ROLLBACK successful ---");
    throw err; //
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
    // Get the user with the given email
    dbGetAsync(
      this.db,
      "select * from Users where Username = ?",
      [username]
    )
      .then(user => {
        // If there is no such student, resolve to false.
        // This is used instead of rejecting the Promise to differentiate the
        // failure from database errors
        if (!user) resolve(false);

        // Verify the password
        crypto.scrypt(password, user.Salt, 32, (err, hash) => {
          if (err) reject(err);

          if (crypto.timingSafeEqual(hash, Buffer.from(user.HashedPassword, "hex")))
            resolve({id: user.ID, username: user.Username}); 
          else resolve(false);
        });
      })
      .catch(e => reject(e));
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
      "select * from Users where ID = ? ",
      [id]
    );

    return user;
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

}
module.exports = Database;
