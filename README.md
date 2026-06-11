# GovCare+

A civic complaint and public service tracking web application built with React, Firebase, and Vite. GovCare+ allows citizens to submit complaints, track their status, and receive updates from government administrators.

## Features

- **Complaint Submission** — Citizens can submit public service complaints with supporting details
- **Status Tracking** — Real-time complaint status tracking with a unique tracking ID
- **Admin Dashboard** — Administrators can manage, respond to, and update complaint statuses
- **FAQ & Help Center** — Built-in FAQ and help pages for user guidance
- **AES-GCM Encryption** — Sensitive PII is encrypted before being stored in Firestore
- **reCAPTCHA Protection** — Bot protection on forms via Google reCAPTCHA
- **Secure Auth** — Separate login flows for citizens and admins

## Tech Stack

- **Frontend:** React 19, React Router v7, Vite
- **Backend/DB:** Firebase Firestore, Firebase Hosting, Firebase Functions
- **Security:** AES-GCM client-side encryption, Firestore security rules, Google reCAPTCHA

## Getting Started

### Prerequisites

- Node.js >= 18
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

```bash
git clone https://github.com/nisrinamasyitah/govcarepluss.git
cd govcarepluss/GovCare+
npm install
```

### Run Locally

```bash
npm run dev
```

### Build & Deploy

```bash
npm run build
firebase deploy
```

## Project Structure

```
GovCare+/
├── src/
│   ├── pages/
│   │   ├── MainPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── SubmitComplaintPage.jsx
│   │   ├── TrackingStatusPage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── FAQPage.jsx
│   │   ├── HelpCenterPage.jsx
│   │   ├── AdminLoginPage.jsx
│   │   └── AdminDashboardPage.jsx
│   ├── firebase.js
│   ├── crypto.js
│   └── App.jsx
├── functions/
├── firestore.rules
└── firebase.json
```

## License

This project is for educational and civic purposes.
