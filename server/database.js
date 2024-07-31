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
    try{
      const boxes = (await dbAllAsync(this.db, "select * from Boxes")).map(c => ({...c, Contents: []}))
      const contents = await dbAllAsync(this.db,"select * from Boxcontent");
     
      for (const {Box_id, content_name} of contents) {
      // Append incompatibility to the correct course
        const main = boxes.find(c => c.ID === Box_id);
        if (!main) {throw new Error("DB inconsistent: Shop not found");}

        main.Contents.push(content_name);}

    return boxes;
  }catch (error) {
    console.error("Error in getBoxes:", error);
    throw error; // Rethrow the error to propagate it up the call stack
  }
  };

  this.getShops = async () => {
    try{
    const shops = (await dbAllAsync(this.db, "select * from Shops")).map(c => ({...c, Boxes: []}))
    const sellers = await dbAllAsync(this.db, "select * from Boxinshop");

    for (const {Box_id, Shop_name} of sellers) {
      // Append incompatibility to the correct course
      const main = shops.find(c => c.ShopName === Shop_name);
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

  this.getBoxesbyName = async ShopName => {
    return (await dbAllAsync(
      this.db,
      "select Box_id from Boxinshop where Shop_name = ?",
      [ShopName]
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

  this.editPurchase = (ba,br, userId) => {

    let pAdd;
    
    if (ba.length > 0) {
      const sql = "insert into Purchases (Username, Box_id) values " + ba
        .map((c, i, a) => "(?, ?)" + (i < a.length - 1 ? "," : ""))
        .reduce((prev, cur) => prev + cur);
      const params = ba.flatMap(c => [userId, c]);
      pAdd = dbRunAsync(this.db, sql, params);
    } else
      pAdd = Promise.resolve();

    const pRem = br.map(c => dbRunAsync(this.db, "delete from Purchases where (Username = ? and Box_id = ?)", [userId, c]));
    return Promise.all([pAdd,pRem].flat());
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
}
module.exports = Database;
