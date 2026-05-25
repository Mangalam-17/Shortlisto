<div align="center">

# Shortlisto 🚀

### Full Stack Recruitment Management & Online Assessment Platform

A modern full-stack recruitment platform built to streamline hiring workflows, candidate evaluation, technical assessments, and analytics.

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge)](https://shortlisto.vercel.app/)
[![Backend API](https://img.shields.io/badge/Backend-API-blue?style=for-the-badge)](https://shortlisto-production.up.railway.app/health)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)]
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)]
[![Express](https://img.shields.io/badge/Framework-Express-black?style=for-the-badge&logo=express)]
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)]
[![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-black?style=for-the-badge&logo=socket.io)]
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black?style=for-the-badge&logo=vercel)]
[![Railway](https://img.shields.io/badge/Backend-Railway-purple?style=for-the-badge)]

</div>

---

## 📌 Overview

Shortlisto is a **full-stack recruitment management platform** designed to simplify and modernize hiring workflows.

It enables recruiters and organizations to:

- manage recruitment drives
- shortlist candidates efficiently
- conduct technical assessments
- evaluate applicant performance
- track analytics and hiring progress
- manage recruitment settings and workflows

The platform is built with a scalable production-style architecture using modern web technologies.

---

## 🌐 Live Deployment

### Frontend
🔗 https://shortlisto.vercel.app/

### Backend API
🔗 https://shortlisto-production.up.railway.app/

### Health Check
🔗 https://shortlisto-production.up.railway.app/health

---

## ✨ Core Features

### 🔐 Authentication & Authorization
- Secure JWT-based authentication
- Role-based access control
- Protected routes
- Session validation
- Secure password hashing using bcrypt

---

### 👥 Candidate Management
- Add and manage candidates
- Candidate profile tracking
- Application management
- Candidate evaluation workflow
- Recruitment pipeline management

---

### 📋 Recruitment Drive Management
- Create recruitment drives
- Manage active hiring campaigns
- Drive-specific candidate handling
- Recruitment workflow tracking

---

### 📝 Online Assessment System
- Technical assessment creation
- Question management
- Assessment scheduling
- Candidate test participation
- Automated result storage

---

### 📊 Analytics Dashboard
- Hiring analytics
- Candidate statistics
- Assessment performance insights
- Recruitment metrics
- Dashboard reporting

---

### ⚡ Realtime Communication
- Socket.IO powered realtime infrastructure
- JWT-authenticated websocket communication
- Live event handling

---

### ⚙️ System Configuration
- Platform settings management
- Configurable recruitment workflows
- Admin-level control panel

---

### 🛡 Security Features
- Helmet security middleware
- MongoDB injection protection
- CORS protection
- Input validation
- JWT authentication
- Secure API middleware

---

### 🚀 Performance Optimizations
- Response compression
- API caching
- Optimized Vite production build
- Code splitting / chunk optimization
- Static asset optimization

---

## 🏗 System Architecture

```text
┌───────────────────────┐
│   React Frontend      │
│   (Vercel Hosting)    │
└──────────┬────────────┘
           │
           │ REST API / Socket.IO
           ▼
┌───────────────────────┐
│   Node.js + Express   │
│   (Railway Hosting)   │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│    MongoDB Atlas      │
│     Cloud Database    │
└───────────────────────┘
```

---

## 🛠 Tech Stack

### Frontend
- React.js
- Vite
- React Router DOM
- Axios
- TanStack React Query
- React Hot Toast
- Lucide React

### Backend
- Node.js
- Express.js
- Socket.IO
- JWT Authentication
- BcryptJS
- Winston Logging
- Node Cache
- Resend (Email API)

### Database
- MongoDB Atlas
- Mongoose ODM

### Security
- Helmet
- CORS
- Express Validator
- Express Mongo Sanitize

### Deployment
- Vercel (Frontend)
- Railway (Backend)
- MongoDB Atlas (Database)

---

## 📁 Project Structure

```bash
Shortlisto/
│
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server/                 # Backend (Node + Express)
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── workers/
│   ├── services/
│   └── package.json
│
└── README.md
```

---

## ⚙️ Local Setup

### Clone Repository

```bash
git clone https://github.com/Mangalam-17/Shortlisto.git
cd Shortlisto
```

---

### Install Frontend Dependencies

```bash
cd client
npm install
```

---

### Install Backend Dependencies

```bash
cd ../server
npm install
```

---

## 🔐 Environment Variables

### Backend (`server/.env`)

```env
PORT=8000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secure_secret
JWT_EXPIRE=1d
CLIENT_URL=https://your-frontend-url.vercel.app
ALLOWED_ORIGINS=https://your-frontend-url.vercel.app,http://localhost:5173
BCRYPT_ROUNDS=12
RESEND_API_KEY=your_resend_api_key
```

---

### Frontend (`client/.env`)

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## ▶ Run Locally

### Backend

```bash
cd server
npm run dev
```

---

### Frontend

```bash
cd client
npm run dev
```

---

## API Modules

Available backend modules:

- `/api/auth`
- `/api/drives`
- `/api/dashboard`
- `/api/candidates`
- `/api/assessments`
- `/api/questions`
- `/api/results`
- `/api/analytics`
- `/api/settings`

---

## 📸 Screenshots

### 🏠 Hero / Landing Page
![Hero Page](./screenshots/HeroPage.png)

### 🔐 Login Page
![Login Page](./screenshots/LoginPage.png)

### 📝 Register Page
![Register Page](./screenshots/RegisterPage.png)

---

## Deployment Architecture

### Frontend Hosting
**Vercel**

### Backend Hosting
**Railway**

### Database
**MongoDB Atlas**

---

## Future Enhancements

- Email notification workflows
- Advanced analytics dashboards
- Interview scheduling module
- Resume parsing integration
- AI-based candidate scoring
- Exportable recruitment reports

---

## 👨‍💻 Author

**Mangalam Vaishre**

- GitHub: https://github.com/Mangalam-17
- LinkedIn: Add your LinkedIn profile here

---

<div align="center">

### ⭐ If you like this project, consider starring the repository!

Built with ❤️ using MERN Stack

</div>