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

### Environment Variables

Create a `.env` file in the `GovCare+` directory:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_key
VITE_ENCRYPTION_KEY=your_aes_encryption_key
```

### Run Locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Deploy to Firebase

```bash
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
