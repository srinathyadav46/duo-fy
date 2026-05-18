# Duo-fy 🎵

## Real-Time Synchronized Music Streaming Platform

Duo-fy is a full-stack real-time music synchronization web application designed for shared listening experiences. The platform allows users to create rooms, invite others, and enjoy synchronized music playback together using Spotify and YouTube integration.

The application focuses on seamless real-time communication, synchronized playback, responsive UI/UX, and secure user authentication.

---

# Features

* 🎧 Real-time synchronized music playback
* 👥 Multi-user room system
* 🔐 User authentication and authorization
* 📡 WebSocket-based live synchronization
* 🎵 Spotify API integration
* ▶️ YouTube music support
* 💬 Real-time room interactions
* 📱 Responsive UI for desktop and mobile
* ⚡ Fast frontend performance
* 🌐 Cloud deployment support

---

# Tech Stack

## Frontend

* React.js
* Tailwind CSS
* CRACO
* Axios
* Socket.IO Client

## Backend

* Python
* FastAPI
* WebSockets
* MongoDB
* JWT Authentication

## Deployment

* Vercel (Frontend)
* Render (Backend)

---

# System Architecture

The application follows a client-server architecture.

## Frontend Responsibilities

* User interface rendering
* Real-time socket communication
* Playback synchronization
* Authentication handling
* API communication

## Backend Responsibilities

* Room management
* Authentication and authorization
* Spotify and YouTube API handling
* Real-time socket management
* Database operations

---

# Folder Structure

```bash
Duo-fy/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── components/
│
├── backend/
│   ├── routes/
│   ├── auth.py
│   ├── models.py
│   ├── socket_manager.py
│   └── server.py
│
└── README.md
```

---

# Installation Guide

## Clone Repository

```bash
git clone <repository-url>
cd duo-fy
```

---

## Frontend Setup

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

Frontend runs on:

```bash
http://localhost:3000
```

---

## Backend Setup

```bash
cd backend
pip install -r requirements.txt
python server.py
```

---


# Deployment

## Frontend Deployment

* Hosted using Vercel

## Backend Deployment

* Hosted using Render

---

# Screenshots

Add application screenshots here.

Example:

* Landing Page
* Room Dashboard
* Music Player
* Authentication Page
* Synchronized Playback Room

---

# Future Enhancements

* Group chat inside rooms
* Playlist sharing
* Voice room support
* Advanced recommendation system
* Mobile application version
* Friend system
* Activity tracking

---

# Challenges Faced

* Real-time playback synchronization
* Managing WebSocket events
* Spotify API token handling
* Cross-device synchronization
* Backend deployment configuration
* Responsive UI optimization

---

# Learning Outcomes

Through this project, the following concepts were implemented and learned:

* Full-stack web development
* REST API integration
* Real-time communication using sockets
* Authentication using JWT
* Cloud deployment
* Frontend state management
* Database handling with MongoDB
* Responsive UI development

---

# Author

## Srinath C

Bachelor of Computer Applications (BCA)

Final Year Project

---

# License

This project is created for educational and academic purposes.
