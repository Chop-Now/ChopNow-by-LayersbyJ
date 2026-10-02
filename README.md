@a# ChopNow - Surplus Food Marketplace

<p align="center">
  <strong>Connecting businesses with surplus food to conscious consumers</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#api-documentation">API Docs</a> •
  <a href="#project-structure">Structure</a>
</p>

---

## Overview

ChopNow is a full-stack marketplace platform that connects local businesses (farmers, restaurants, bakeries, supermarkets) with consumers looking to purchase surplus food at discounted prices. The platform helps reduce food waste while providing affordable food options to the community.

## Features

### For Consumers

- **Browse & Search**: Discover surplus food listings from local businesses
- **Location-Based**: Find deals near you with interactive maps
- **Real-Time Availability**: See pickup times and remaining quantities
- **Order Management**: Track orders from placement to pickup
- **Reviews & Ratings**: Share feedback on your purchases
- **Favorites**: Save your preferred businesses and products
- **Notifications**: Get alerts for new deals and order updates

### For Business Owners

- **Business Registration**: Easy onboarding with verification workflow
- **Listing Management**: Create and manage surplus food listings
- **Order Dashboard**: Track and fulfill incoming orders
- **Analytics**: View sales performance and customer insights
- **Payout Management**: Track earnings and withdrawal history

### For Administrators

- **User Management**: Manage users, roles, and permissions
- **Business Verification**: Approve/reject business applications
- **Platform Settings**: Configure features, maintenance mode, commissions
- **Dispute Resolution**: Handle customer complaints and refunds
- **Analytics Dashboard**: Monitor platform-wide metrics

## Tech Stack

### Backend

- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt password hashing
- **File Storage**: Cloudinary for images
- **Email**: SendGrid for transactional emails
- **Validation**: express-validator
- **Logging**: Pino with structured JSON logs
- **Security**: Helmet, CORS, rate limiting

### Frontend

- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Maps**: Leaflet with OpenStreetMap
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Authentication**: Google OAuth 2.0

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB database (local or Atlas)
- Cloudinary account (for image uploads)
- SendGrid account (for emails)
- Google Cloud Console project (for OAuth)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/ChopNow.git
   cd ChopNow
   ```

2. **Setup Backend**

   ```bash
   cd Backend
   npm install
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Setup Frontend**

   ```bash
   cd Frontend
   npm install
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Start Development Servers**

   Backend (Terminal 1):

   ```bash
   cd Backend
   npm run dev
   ```

   Frontend (Terminal 2):

   ```bash
   cd Frontend
   npm run dev
   ```

5. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - API Docs: http://localhost:5000/api-docs

## Environment Variables

### Backend (.env)

| Variable               | Description                              | Required         |
| ---------------------- | ---------------------------------------- | ---------------- |
| `MONGO_URI`            | MongoDB connection string                | Yes              |
| `JWT_SECRET`           | Secret key for JWT tokens (min 32 chars) | Yes              |
| `PORT`                 | Server port (default: 5000)              | No               |
| `NODE_ENV`             | Environment (development/production)     | No               |
| `ALLOWED_ORIGINS`      | CORS allowed origins (comma-separated)   | Production       |
| `CLOUDINARY_*`         | Cloudinary credentials                   | For uploads      |
| `SENDGRID_API_KEY`     | SendGrid API key                         | For emails       |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                   | For Google login |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret               | For Google login |

### Frontend (.env)

| Variable                | Description            | Required         |
| ----------------------- | ---------------------- | ---------------- |
| `VITE_API_URL`          | Backend API URL        | Yes              |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | For Google login |

## Project Structure

```
ChopNow/
├── Backend/
│   ├── config/           # Database and service configs
│   ├── controllers/      # Route handlers
│   ├── middleware/       # Express middleware
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API route definitions
│   ├── scripts/          # Utility scripts
│   ├── utils/            # Helper functions
│   └── server.js         # Entry point
│
├── Frontend/
│   ├── public/           # Static assets
│   └── src/
│       ├── admin/        # Admin dashboard
│       ├── assets/       # Images, fonts
│       ├── Components/   # Reusable components
│       ├── context/      # React Context providers
│       ├── Pages/        # Page components
│       ├── services/     # API service layer
│       └── utils/        # Utility functions
│
└── README.md
```

## API Documentation

### Authentication Endpoints

| Method | Endpoint                  | Description               |
| ------ | ------------------------- | ------------------------- |
| POST   | `/api/users/register`     | Register new user         |
| POST   | `/api/users/login`        | Login with email/password |
| POST   | `/api/users/google-login` | Login with Google         |
| GET    | `/api/users/profile`      | Get current user profile  |
| PUT    | `/api/users/profile`      | Update profile            |
| POST   | `/api/users/switch-role`  | Switch active role        |

### Business Endpoints

| Method | Endpoint                      | Description                    |
| ------ | ----------------------------- | ------------------------------ |
| GET    | `/api/businesses`             | List all businesses            |
| POST   | `/api/businesses`             | Create new business            |
| GET    | `/api/businesses/:id`         | Get business details           |
| PUT    | `/api/businesses/:id`         | Update business                |
| GET    | `/api/businesses/pending`     | List pending approvals (admin) |
| PATCH  | `/api/businesses/:id/approve` | Approve business (admin)       |

### Listing Endpoints

| Method | Endpoint            | Description              |
| ------ | ------------------- | ------------------------ |
| GET    | `/api/listings`     | List all active listings |
| POST   | `/api/listings`     | Create new listing       |
| GET    | `/api/listings/:id` | Get listing details      |
| PUT    | `/api/listings/:id` | Update listing           |
| DELETE | `/api/listings/:id` | Delete listing           |

### Order Endpoints

| Method | Endpoint                 | Description         |
| ------ | ------------------------ | ------------------- |
| GET    | `/api/orders`            | List user orders    |
| POST   | `/api/orders`            | Create new order    |
| GET    | `/api/orders/:id`        | Get order details   |
| PATCH  | `/api/orders/:id/status` | Update order status |

Full API documentation available at `/api-docs` when running the backend.

## User Roles

| Role             | Description                      |
| ---------------- | -------------------------------- |
| `consumer`       | Can browse, order, and review    |
| `business_owner` | Can manage business and listings |
| `rider`          | Can handle deliveries (future)   |
| `admin`          | Full platform access             |

Users can have multiple roles and switch between them.

## Security Features

- **Password Security**: bcrypt hashing with salt rounds
- **JWT Authentication**: Secure token-based auth with expiration
- **Rate Limiting**: Protection against brute force attacks
- **CORS**: Configured allowed origins
- **Helmet**: Security headers
- **Input Validation**: Server-side validation on all endpoints
- **Role-Based Access**: Granular permission control

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For support, email chopnow.app@gmail.com or open an issue in the repository.

---

<p align="center">
  Built with ❤️ for reducing food waste
</p>
