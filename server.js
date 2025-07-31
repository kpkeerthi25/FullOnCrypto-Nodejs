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

// Payment Request API
app.post('/api/payment-request', async (req, res) => {
  try {
    const { upiId, amount, payeeName, note } = req.body;

    // Validation
    if (!upiId || !amount) {
      return res.status(400).json({ 
        error: 'UPI ID and amount are required' 
      });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ 
        error: 'Amount must be a positive number' 
      });
    }

    const paymentRequestsCollection = db.collection('paymentRequests');

    // Create payment request document
    const newPaymentRequest = {
      upiId,
      amount,
      payeeName: payeeName || '',
      note: note || '',
      requesterId: 'anonymous', // For now, will be updated when we add proper auth
      status: 'pending',
      createdAt: new Date()
    };

    const result = await paymentRequestsCollection.insertOne(newPaymentRequest);

    // Return success response
    res.status(201).json({
      message: 'Payment request created successfully',
      paymentRequest: {
        id: result.insertedId.toString(),
        upiId: newPaymentRequest.upiId,
        amount: newPaymentRequest.amount,
        payeeName: newPaymentRequest.payeeName,
        note: newPaymentRequest.note,
        requesterId: newPaymentRequest.requesterId,
        status: newPaymentRequest.status,
        createdAt: newPaymentRequest.createdAt
      }
    });

  } catch (error) {
    console.error('Payment request error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Get all payment requests API
app.get('/api/payment-requests', async (req, res) => {
  try {
    const paymentRequestsCollection = db.collection('paymentRequests');
    
    // Get all pending payment requests, sorted by creation date (newest first)
    const paymentRequests = await paymentRequestsCollection
      .find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .toArray();

    // Format the response
    const formattedRequests = paymentRequests.map(request => ({
      id: request._id.toString(),
      upiId: request.upiId,
      amount: request.amount,
      payeeName: request.payeeName,
      note: request.note,
      requesterId: request.requesterId,
      status: request.status,
      createdAt: request.createdAt
    }));

    res.json({
      message: 'Payment requests retrieved successfully',
      paymentRequests: formattedRequests
    });

  } catch (error) {
    console.error('Get payment requests error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});