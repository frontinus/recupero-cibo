# Food Rescue Connect (Surplus Food Web App)

## Overview

Food Rescue Connect is a full-stack web application designed to combat food waste by connecting users with local stores and restaurants offering surplus food bags at discounted prices. Users can browse participating establishments, reserve available food bags, and manage their reservations.

### Key Features

- Browse Establishments: View an alphabetically sorted list of participating stores and restaurants, including their location, contact details, and food category. (Publicly accessible)

- View Available Bags: Logged-in users can see available "Surplus Bags" for each establishment, categorized as:

  - Surprise Bags: Assorted items at a low price (contents hidden).

  - Regular Bags: Specific items and quantities listed.

- Bag Details: View bag type, size (Small, Medium, Large), price, and pickup time window (only future times are available).

- User Authentication: Secure user login and session management using Passport.js with session cookies.

- Shopping Cart: Add desired bags to a personal cart.

  - Fairness Rule: Users can only reserve one bag per establishment per day.

- Customize Regular Bags: Remove up to two individual food items from a "Regular Bag" before finalizing the reservation (price remains unchanged).

- Reservation Confirmation: Confirm cart contents to reserve bags. The system checks for real-time availability before confirming. If any bag becomes unavailable, the entire reservation attempt is cancelled, highlighting the unavailable items.

- Reservation Management: View confirmed reservations and delete them, making the bags available again.

- Real-time Availability: Bag availability is updated when reservations are confirmed or deleted.

### Tech Stack

- Frontend: React, React Router, React Bootstrap

- Backend: Node.js, Express.js

- Authentication: Passport.js (Local Strategy with sessions)

- Database: SQLite

- Communication: RESTful API with CORS configuration

### API Summary

The backend provides a RESTful API for managing:

- Authentication: User login (/api/session), logout (/api/session), and session checking (/api/session/current).

- Shops: Fetching all shops (/api/shops).

- Boxes: Fetching available boxes for a specific shop (/api/boxes/:shopId), fetching details for specific box IDs (/api/boxes-by-ids).

- Purchases (Cart/Reservations): Creating (/api/purchase), modifying (adding/removing boxes and items - /api/Purchases-modifications), and deleting (/api/purchase) user reservations.

### Getting Started

Clone the repository:

```bash
  git clone <your-repo-url>
  cd <your-project-dir>


  Install Server Dependencies:

  cd server
  npm install
```

Install Client Dependencies:

```bash
cd ../client
npm install
```

Run the Server:
(Ensure nodemon is installed globally or use npx nodemon)

```bash
cd ../server
nodemon index.js 
# Or: node index.js
```

(Server will run on http://localhost:3001)

Run the Client:

```bash
cd ../client
npm run dev
```

(Client will run on http://localhost:5173 or similar)
