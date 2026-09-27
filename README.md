# 🏋️ Gym Tracker

A full-stack workout tracking application designed to help users manage their workouts, exercises, workout history, and fitness progress from a responsive web interface.

🌐 **Live Demo:**  
https://gym-tracker-tawny-five.vercel.app

---

## ✨ Features

- 🔐 User registration and authentication
- 👤 User account management
- 🏋️ Workout tracking
- 💪 Exercise management
- 📅 Weekly workout schedule
- 📊 Workout history
- 📈 Progress tracking
- 🗄️ Persistent data storage with MongoDB Atlas
- 📱 Responsive interface for desktop and mobile
- ☁️ Cloud deployment
- 🔄 Frontend and backend API integration

---

## 🛠️ Tech Stack

### Frontend

- React
- TypeScript
- Vite
- HTML5
- CSS
- JavaScript

### Backend

- Node.js
- Express.js
- TypeScript
- REST API

### Database

- MongoDB
- MongoDB Atlas

### Deployment

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** MongoDB Atlas

### Development Tools

- Git
- GitHub
- npm
- Antigravity
- Visual Studio / Code Editor

---

## 🏗️ Application Architecture


                    ┌──────────────────────┐
                    │      User Device     │
                    │  Desktop / iPhone    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │       Vercel         │
                    │   React Frontend     │
                    └──────────┬───────────┘
                               │
                         REST API
                               │
                               ▼
                    ┌──────────────────────┐
                    │       Render         │
                    │  Express.js Backend  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    MongoDB Atlas     │
                    │      Database        │
                    └──────────────────────┘

---

## 📂 Project Structure


gym-tracker/
│
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   └── ...
│   │
│   ├── package.json
│   └── ...
│
├── server/
│   ├── src/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── ...
│   │
│   ├── package.json
│   └── ...
│
├── .gitignore
└── README.md

---

## 🔐 Authentication

The application includes user authentication with:

* User registration
* User login
* Protected user data
* Authentication tokens
* MongoDB-backed user accounts

User authentication is handled by the Express backend and user data is stored in MongoDB Atlas.

---

## 🔌 API

The frontend communicates with the backend through REST API endpoints.

Example:


POST /api/auth/register
POST /api/auth/login


Backend health check:


GET /api/health


Production backend:


https://gym-tracker-test.onrender.com


---

## ⚙️ Environment Variables

### Frontend

Create a `.env` file inside the `client` directory:


VITE_API_BASE_URL=http://localhost:5001/api


For production, the frontend uses the deployed Render backend:


VITE_API_BASE_URL=https://gym-tracker-test.onrender.com


### Backend

Backend environment variables should contain the required MongoDB connection and authentication configuration.

Example:


MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5001


> Never commit real passwords, database credentials, JWT secrets, or other sensitive values to GitHub.

---

## 🚀 Running Locally

### 1. Clone the repository


git clone https://github.com/sruju22/gym-tracker.git



cd gym-tracker


### 2. Install backend dependencies


cd server
npm install


### 3. Configure backend environment variables

Create:


server/.env

and add the required MongoDB and authentication variables.

### 4. Start the backend


npm run dev


### 5. Install frontend dependencies

Open another terminal:


cd client
npm install


### 6. Configure frontend

Create:


client/.env

Add:


VITE_API_BASE_URL=http://localhost:5001/api


### 7. Start the frontend


npm run dev


The application will then be available through the local Vite development server.

---

## ☁️ Deployment

### Frontend — Vercel

The React frontend is deployed using Vercel.

Production URL:

**[https://gym-tracker-tawny-five.vercel.app](https://gym-tracker-tawny-five.vercel.app)**

Every update pushed to the `main` branch can trigger a new production deployment.

### Backend — Render

The Express.js backend is deployed using Render.

Production API:

**[https://gym-tracker-test.onrender.com](https://gym-tracker-test.onrender.com)**

### Database — MongoDB Atlas

MongoDB Atlas provides the cloud database used by the application.

The backend connects to MongoDB Atlas using the configured MongoDB connection string.

---

## 📱 Mobile Usage

The application is responsive and can be accessed directly from a mobile browser.

On iPhone, the website can also be added to the Home Screen:

Safari
   ↓
Share
   ↓
Add to Home Screen
   ↓
Gym Tracker

This provides quick access to the application like a mobile app.

---

## 🧪 Testing

The application has been tested across the deployed frontend and backend.

Verified:

* ✅ Frontend production deployment
* ✅ Backend production deployment
* ✅ Backend health endpoint
* ✅ Frontend → backend communication
* ✅ User registration
* ✅ MongoDB Atlas connection
* ✅ User authentication
* ✅ Production API requests

---

## 🔄 Development Workflow

Make changes
     ↓
Test locally
     ↓
Git commit
     ↓
Push to GitHub
     ↓
Vercel / Render deployment
     ↓
Test production application
## 🎯 Future Improvements

Planned improvements include:

* 🎨 Professional branding and app identity
* 🏋️ Advanced workout planning
* 📊 Detailed fitness analytics
* 📈 More progress visualizations
* 🔔 Workout reminders
* 🎯 Fitness goals
* 🗓️ Improved workout calendar
* 📱 Enhanced mobile experience
* ⚡ Performance optimization
* 🧩 Progressive Web App improvements
* 🔒 Additional security improvements

---

## 👨‍💻 Author

**Srujan**

Computer Science & Engineering Student

GitHub:
[https://github.com/sruju22](https://github.com/sruju22)

---

## 📄 License

This project is currently intended as a personal/project application.
