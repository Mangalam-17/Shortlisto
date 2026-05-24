# Shortlisto 🚀

> A full-stack recruitment management and online assessment platform built to streamline candidate hiring workflows, application screening, and technical evaluation.

![Shortlisto Banner](./assets/banner.png)

## 📌 Overview

Shortlisto is a modern recruitment platform designed to simplify and automate the hiring process for organizations, universities, and recruitment teams.

It enables recruiters to create hiring drives, build dynamic candidate application forms, manage applications, shortlist candidates, conduct online assessments, and analyze recruitment performance through a centralized dashboard.

Unlike a basic job portal, Shortlisto combines **Applicant Tracking System (ATS) workflows + candidate assessment capabilities** into a unified full-stack platform.

---

## ✨ Key Features

### Recruitment Drive Management
- Create and manage hiring drives
- Support for different recruitment workflows:
  - Campus Hiring
  - Lateral Hiring
  - Custom Recruitment Drives
- Configure drive timelines and metadata

---

### Dynamic Application Form Builder
- Build fully customizable candidate application forms
- Supported field types:
  - Text
  - Email
  - Phone
  - Number
  - Textarea
  - Select
  - Multi-select
  - Checkbox
  - Date
  - File Upload
  - URL
- Required/optional field configuration
- Placeholder and validation support
- Section grouping and field ordering

---

### Candidate Management
- Candidate registration and profile creation
- Draft application save functionality
- Duplicate application prevention
- Candidate profile management
- Resume and document handling
- Academic and professional details capture

---

### Candidate Screening & Shortlisting
- Candidate filtering and search
- Shortlisting workflows
- Custom query-based filtering
- Candidate application review dashboard

---

### Online Assessment Engine
- Technical assessment creation and management
- Multiple assessment support per candidate
- Candidate assessment login workflow
- Assessment instructions and waiting room
- Timed assessment sessions
- Answer submission workflow
- Result generation and score tracking

---

### Assessment Security Features
- Randomized question ordering
- Randomized option ordering
- Candidate-specific assessment sessions
- Controlled access workflow

---

### Analytics Dashboard
- Recruitment performance insights
- Candidate statistics
- Assessment completion tracking
- Shortlisted candidate metrics
- Drive-wise analytics

---

### Communication System
- Email notification workflows
- Async email queue processing
- Configurable email settings

---

### Performance Optimization
- Server-side caching
- Paginated APIs
- Optimized filtering logic

---

### Security
- JWT Authentication
- Password hashing with bcrypt
- Helmet security middleware
- MongoDB query sanitization
- Input validation middleware
- Protected admin routes

---

## 🛠 Tech Stack

### Frontend
- React.js
- Vite
- Tailwind CSS
- React Query
- React Router
- Socket.IO Client

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Socket.IO
- Nodemailer

### Utilities / Tooling
- Node Cache
- XLSX
- PapaParse
- Helmet
- Express Mongo Sanitize

---

## 🏗 System Architecture

```text
Frontend (React + Vite)
        ↓
REST APIs / Socket Communication
        ↓
Backend (Node.js + Express)
        ↓
Business Logic / Middleware
        ↓
MongoDB Database
        ↓
Email Queue / Assessment Engine / Analytics
```

---

## 📂 Project Structure

```bash
Shortlisto/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   ├── candidate/
│   │   │   └── public/
│   │   ├── utils/
│   │   └── App.jsx
│
├── server/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── workers/
│   └── server.js
│
└── README.md
```

---

## ⚙️ Installation & Setup

### Clone Repository

```bash
git clone https://github.com/your-username/shortlisto.git
cd shortlisto
```

---

### Backend Setup

```bash
cd server
npm install
```

Create `.env` file:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key

SMTP_HOST=your_smtp_host
SMTP_PORT=your_smtp_port
SMTP_USER=your_email
SMTP_PASS=your_password
```

Run backend:

```bash
npm run dev
```

---

### Frontend Setup

```bash
cd client
npm install
```

Create `.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Run frontend:

```bash
npm run dev
```

---

## 🔐 Environment Variables

Required variables include:

### Backend
- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

### Frontend
- `VITE_API_BASE_URL`

---

## 📸 Screenshots

Add project screenshots here:

- Dashboard
- Candidate Application Form
- Recruitment Drive Management
- Assessment Interface
- Results Dashboard
- Analytics View

Example:

```markdown
![Dashboard](./assets/dashboard.png)
```

---

## 🚀 Future Improvements

- Role-based recruiter access
- Multi-admin support
- Resume parsing
- AI-based candidate matching
- Interview scheduling module
- Cloud file storage integration
- Advanced reporting exports
- Redis-based distributed caching
- Audit logging
- Notification center

---

## 🧠 Learning Outcomes

This project demonstrates:

- Full-stack application architecture
- REST API development
- Authentication & authorization
- Dynamic form generation
- Database schema design
- Assessment workflow engineering
- Real-time communication
- Async job processing
- Performance optimization
- Security best practices

---

## 👨‍💻 Author

**Mangalam Mishra**

Software Developer | Full Stack Developer

Portfolio: [https://my-portfolio-ecru-xi-31.vercel.app/]

---

## 📄 License

This project is intended for educational and portfolio demonstration purposes.
