# PlanIt_Nepal Backend

A comprehensive backend API for a wedding planning application that handles venues, decorations, catering, user management, and orders.

## Features

- **User Authentication System**
  - JWT-based authentication with access/refresh tokens
  - Password reset via email
  - Google OAuth integration
  - Role-based access control (Admin/Customer)

- **Wedding Resource Management**
  - Venues
  - Decorations
  - Food & Catering
  - Reviews

- **Order Processing**
  - Shopping cart functionality
  - Order placement and tracking
  - Payment processing (integration ready)

- **Media Management**
  - Image uploads via Cloudinary
  - Automatic image cleanup when resources are deleted

- **Security**
  - Rate limiting on sensitive routes
  - Password hashing with bcrypt
  - CORS protection
  - Input validation

## Technology Stack

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - Object Data Modeling
- **JWT** - Authentication
- **Passport** - OAuth strategies
- **Nodemailer** - Email services
- **Cloudinary** - Image storage
- **Multer** - File upload handling
- **Bcrypt** - Password hashing
