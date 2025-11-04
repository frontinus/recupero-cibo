# Food Rescue Connect (Surplus Food Web App)

## Overview

Food Rescue Connect is a full-stack web application designed to combat food waste by connecting users with local stores and restaurants offering surplus food bags at discounted prices. The platform supports three user roles: regular customers, shop owners, and administrators, each with tailored functionality.

### Key Features

#### For Customers (Regular Users)

- **Browse Establishments**: View an alphabetically sorted list of participating stores and restaurants, including their location, contact details, and food category. (Publicly accessible)

- **View Available Bags**: Logged-in users can see available "Surplus Bags" for each establishment, categorized as:
  - **Surprise Bags**: Assorted items at a discounted price (contents hidden until pickup).
  - **Normal Bags**: Specific items and quantities listed with full transparency.

- **Bag Details**: View bag type, size (Small, Medium, Large), price, and pickup time window (only future times are available).

- **Shopping Cart**: Add desired bags to a personal cart with smart constraints:
  - **Fairness Rule**: Users can only reserve one bag per establishment per day.
  - Real-time availability checking prevents double-booking.

- **Customize Normal Bags**: Remove up to two individual food items from a "Normal Bag" before finalizing the reservation (price remains unchanged).

- **Reservation Management**:
  - Confirm cart contents to reserve bags with real-time availability verification.
  - If any bag becomes unavailable during checkout, the entire transaction is cancelled with clear feedback.
  - View and cancel confirmed reservations, making bags available again for other users.

- **User Authentication**: Secure registration and login with password hashing and session management.

#### For Shop Owners

- **Dedicated Shop Panel**: Shop owners have their own management dashboard accessible after login.

- **Inventory Management**:
  - Create new boxes (Normal or Surprise) with customizable items, prices, sizes, and pickup times.
  - Boxes are automatically assigned to their shop upon creation.
  - Delete available boxes (cannot delete boxes with active reservations).

- **Reservation Control**:
  - View all boxes with their current status (Available/Reserved).
  - Cancel customer reservations to make boxes available again.
  - Monitor reservation activity in real-time.

- **Shop Information**: View shop details including address, phone, and food type.

#### For Administrators

- **Comprehensive Admin Panel** with three main sections:
  
  1. **Create New**:
     - Create shops with full details (name, address, phone, food type).
     - Create food items for the catalog (used in Normal bags).
     - Create boxes with custom specifications and contents.
  
  2. **Manage**:
     - View all shops, boxes, and food items in the system.
     - Real-time statistics and status monitoring.
     - Assign boxes to shops or directly to users.
  
  3. **Assignments**:
     - Manage box-shop relationships.
     - Create shop owner user accounts linked to specific shops.
     - Remove box assignments from shops.

### User Roles

1. **Regular Users**: Browse shops, reserve bags, manage personal reservations.
2. **Shop Owners**: Manage their own shop's inventory and reservations.
3. **Administrators**: Full system access to create and manage shops, boxes, items, and user accounts.

### Tech Stack

- **Frontend**: React, React Router, React Bootstrap, Bootstrap Icons
- **Backend**: Node.js, Express.js
- **Authentication**: Passport.js (Local Strategy with sessions)
- **Database**: SQLite with foreign key constraints
- **Communication**: RESTful API with CORS configuration
- **Security**: Password hashing with crypto.scrypt, secure session cookies

### Database Schema

- **Users**: User accounts with roles (admin, shop owner, regular user)
- **Shops**: Store/restaurant information
- **Boxes**: Food bags with type, size, price, and time specifications
- **Contents**: Catalog of available food items
- **Boxcontent**: Junction table linking boxes to their contents with quantities
- **Boxinshop**: Junction table linking boxes to shops
- **Purchases**: User reservations of boxes

### API Endpoints

#### Authentication

- `POST /api/session` - User login
- `DELETE /api/session` - User logout
- `GET /api/session/current` - Get current session
- `POST /api/register` - Register new user

#### Public/User Routes

- `GET /api/shops` - Fetch all shops
- `GET /api/boxes/:shopId` - Fetch boxes for a specific shop
- `POST /api/boxes-by-ids` - Fetch specific boxes by IDs
- `POST /api/purchase` - Create new purchase
- `POST /api/Purchases-modifications` - Modify purchases (add/remove boxes and items)
- `DELETE /api/purchase` - Delete user's purchases
- `GET /api/items` - Get available food items

#### Shop Owner Routes (Authenticated)

- `GET /api/shop/current` - Get current shop information
- `GET /api/shop/boxes` - Get boxes for current shop
- `POST /api/shop/boxes` - Create new box for shop
- `DELETE /api/shop/boxes/:boxId` - Delete box
- `DELETE /api/shop/purchases/:boxId` - Cancel a reservation

#### Admin Routes (Authenticated + Admin)

- `POST /api/admin/shops` - Create new shop
- `POST /api/admin/boxes` - Create new box
- `POST /api/admin/items` - Create new food item
- `POST /api/admin/add-item-to-box` - Add item to box
- `POST /api/admin/assign-box-shop` - Assign box to shop
- `POST /api/admin/assign-box-user` - Assign box to user
- `DELETE /api/admin/remove-box-shop` - Remove box from shop
- `POST /api/admin/create-shop-user` - Create shop owner account
- `GET /api/admin/users` - Get all users

### Getting Started

#### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

#### Installation

1. Clone the repository:

```bash
git clone <https://github.com/frontinus/recupero-cibo.git>
cd <recuper-cibo>
```

2. Install Server Dependencies:

```bash
cd server
npm install
```

3. Install Client Dependencies:

```bash
cd client
npm install
```

#### Running the Application

1. Start the Server:

```bash
cd server
nodemon index.js
# Or: node index.js
```

Server will run on http://localhost:3001

2. Start the Client (in a new terminal):

```bash
cd client
npm run dev
```

Client will run on http://localhost:5173

#### Default Test Accounts

- **Regular Users**: polpop (password: `polpop`) (also a shop owner)
- **Admin**: admin (password: `admin`)
- **Shop Owners**: Create via admin panel after setting up shops

### Features Highlights

- **Real-time Availability**: Prevents overbooking with database-level checks.
- **Time-based Pickup Windows**: Only shows bags with future pickup times.
- **Customizable Normal Bags**: Users can remove unwanted items (up to 2) before purchase.
- **Transactional Integrity**: All purchase modifications use database transactions.
- **Role-based Access Control**: Three-tier permission system (user, shop owner, admin).
- **Responsive Design**: Works on desktop and mobile devices.
- **User-friendly Interface**: Clean, modern UI with Bootstrap components.

### Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── API.jsx           # API communication layer
│   │   ├── App.jsx            # Main app component
│   │   ├── AdminPanel.jsx     # Admin dashboard
│   │   ├── ShopOwnerPanel.jsx # Shop owner dashboard
│   │   ├── LoginForm.jsx      # Authentication forms
│   │   ├── ShopsList.jsx      # Shop browsing
│   │   ├── Purchases.jsx      # Cart management
│   │   └── ...
│   └── package.json
├── server/
│   ├── database.js            # Database operations
│   ├── authentication.js      # Passport.js config
│   ├── index.js               # Express server & routes
│   └── package.json
└── README.md
```

### Future Enhancements

- Email notifications for reservations
- Shop analytics and reporting
- User reviews and ratings
- Multi-language support
- Mobile app version
- Payment integration
- Advanced search and filtering

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### License

This project is licensed under the MIT License.

### Contact

For questions or support, please send me an email @ francesco1.abate@yahoo.com