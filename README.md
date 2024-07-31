[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-24ddc0f5d75046c5622901739e7c5dd533143b0c8e959d652212380cedb1ea36.svg)](https://classroom.github.com/a/AoyUG5Y1)
# Exam #12345: "Exam Title"
## Student: s319824 Abate Francesco 

## React Client Application Routes

- Route `/`: header, error handling
- Route ``: main page
- Route `login`: login

## API Server

-GET `/api/session/current`
  - request parameters:user (our user object) and request body content
  - response body content username :our username, purchase: chart of this user (in term of boxes IDs)
-  POST `/api/session`
  - request parameters, username and password
  - response body  username and purchases
- GET `/api/session/current`
  - request parameters (user object) and request body content 
  - response body content (username and password)
- POST `/api/Purchases-modifications`
  - req.user
  - req.body.add and rem
-  POST `/api/Contents-modifications`
  - req.body.Box_id (box da modificare)
  - req.body.contents (contents da cancellare dalla box)
-  POST `/api/purchase`
  - req.user
  - req.body.boxes
- Delete  `/api/purchase`
  - req.user
-GET `/api/shops`
   - res.shops
-GET `/api/purchases`
   - res.boxes
-GET `/apiboxes/:ShopName`
   - res.boxes
   - req.params.ShopMane

## Database Tables

- Table `Purchases` - it's the chart, associates a box and a user
- Table `Boxcontent` - it associates a content to a box to know what boxes contain
- Table `Boxes`- box object
- Table `Users`- user object
- Table `Shops`- shop object
- Table `Boxinshop`- asociates a box to a shop
- Table `Contents`- content object

## Main React Components

- `BoxesList` (in `BoxList.js`): List of boxes filtered generally, allows to display info about boxes
- `ShopsList` (in `ShopList.js`): List of boxes unfiltered, allows to display info about shops
- `LoginForm` (in `LoginForm.js`): login
- `PurchasesDetails` (in `Purchases.js`): content handling
- `Main` (in `App.js`): all the functions for chart, boxes checking etc
(only _main_ components, minor ones may be skipped)

## Screenshot

![Screenshot](/screen.png)

## Users Credentials

- frontinus, likikokin10 (plus any other requested info)
- FrancoPollo, likikokin10 (plus any other requested info)
- Guiglielmo , likikokin10

