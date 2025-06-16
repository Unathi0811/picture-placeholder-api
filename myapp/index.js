require('dotenv').config();
const express = require('express');
const path = require('path');
const connectDB = require('./db');
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const avatarRouter = require('./routes/avatar');
app.use('/avatar', avatarRouter);

// API Routes
const userRouter = require('./routes/users');
app.use('/api/users', userRouter);

// Start server
app.listen(port, () => {
  console.log(`Pure API server running at http://localhost:${port}`);
});

module.exports = app