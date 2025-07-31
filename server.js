const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'fulloncrypto';

let db;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
MongoClient.connect(MONGODB_URI)
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db(DB_NAME);
  })
  .catch(error => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'FullOnCrypto API Server' });
});

// Signup API
app.post('/api/signup', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    const usersCollection = db.collection('users');

    // Check if username already exists
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ 
        error: 'Username already exists' 
      });
    }

    // Create new user
    const newUser = {
      username,
      password, 
      email: '',
      createdAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);

    // Return success 
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: result.insertedId.toString(),
        username: newUser.username,
        email: newUser.email,
        createdAt: newUser.createdAt
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Login API 
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ username });

    if (!user || user.password !== password) {
      return res.status(401).json({ 
        error: 'Invalid username or password' 
      });
    }

    // Return success response 
    res.json({
      message: 'Login successful',
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});