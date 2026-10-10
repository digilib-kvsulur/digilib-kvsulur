# digilib-kvsulur

Build a Digital Library Management System for PM SHRI KV Sulur.

Features required:

User Authentication

Sign up and login system for students, teachers, and admin (library in-charge).

Role-based access (admin, student, teacher).

Student Dashboard

View and search books.

View book issue history.

See earned library points (based on book returns, reading time, participation).

Book Management System

Add/edit/delete book records (admin only).

Store book details: title, author, genre, ISBN, availability status.

Book Issue/Return System

Students can request to issue books.

Admin can approve/deny requests and log return dates.

Auto-notify for due/overdue books.

Student Point Management

Points awarded based on reading activities, timely return, and book reviews.

Admin can set rules for earning/deducting points.

Display leaderboard to encourage healthy reading competition.

Usage Analytics Dashboard (Admin View)

View data like:

Most read books

Active students

Average reading time

Issue/return trends

Filterable by class, date, and category.

Database Integration with Firebase

Realtime updates using Firebase Firestore.

Firebase Authentication for secure login.

Firebase Cloud Functions for scheduled reminders and automation.

Mobile & Desktop Compatibility

Responsive design for students to access on phones and desktops.

Custom Branding

Include school logo, motto, and colors.

Welcome message: "Welcome to PM SHRI KV Sulur's Digital Library!"

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://digilib-kvsulur.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/46bf525f-575f-404d-8f6a-4d2ccd628883).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `lovable` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
