const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const { ethers } = require('ethers');
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

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date() });
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

// Update user wallet address API
app.post('/api/update-wallet', async (req, res) => {
  try {
    const { ethAddress, username } = req.body;
    console.log('Update wallet request:', { ethAddress, username });

    // Basic validation
    if (!ethAddress) {
      return res.status(400).json({ 
        error: 'ETH address is required' 
      });
    }

    if (!username) {
      return res.status(400).json({ 
        error: 'Username is required' 
      });
    }

    // Validate ETH address format (basic check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(ethAddress)) {
      return res.status(400).json({ 
        error: 'Invalid ETH address format' 
      });
    }

    const usersCollection = db.collection('users');
    
    // Check if this specific address is already used by another user
    const existingWallet = await usersCollection.findOne({ 
      ethAddress: ethAddress.toLowerCase(),
      username: { $ne: username } // Exclude current user
    });
    
    if (existingWallet) {
      return res.status(409).json({ 
        error: `This address ${ethAddress} is already registered to user: ${existingWallet.username}` 
      });
    }

    // Update user by username (simple identification for now)
    console.log('Looking for user with username:', username);
    const existingUser = await usersCollection.findOne({ username: username });
    console.log('User found before update:', existingUser ? 'Yes' : 'No');
    
    const result = await usersCollection.findOneAndUpdate(
      { username: username }, // Find user by username
      { 
        $set: { 
          ethAddress: ethAddress.toLowerCase(),
          updatedAt: new Date()
        }
      },
      { 
        returnDocument: 'after'
      }
    );

    console.log('Update result:', result.value ? 'Success' : 'Failed');
    
    if (!result.value) {
      return res.status(404).json({ 
        error: `User not found with username: ${username}` 
      });
    }

    // Return updated user (without password)
    res.json({
      message: 'Wallet address updated successfully',
      user: {
        id: result.value._id.toString(),
        username: result.value.username,
        email: result.value.email,
        ethAddress: result.value.ethAddress,
        createdAt: result.value.createdAt
      }
    });

  } catch (error) {
    console.error('Update wallet error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Helper function to verify signature
function verifySignature(message, signature, expectedAddress) {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Login with wallet API
app.post('/api/login-wallet', async (req, res) => {
  console.log('Wallet login request received:', req.body);
  try {
    const { ethAddress, signature } = req.body;

    // Validation
    if (!ethAddress || !signature) {
      return res.status(400).json({ 
        error: 'ETH address and signature are required' 
      });
    }

    // Validate ETH address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(ethAddress)) {
      return res.status(400).json({ 
        error: 'Invalid ETH address format' 
      });
    }

    const usersCollection = db.collection('users');

    // Find user by ETH address
    console.log('Looking for user with ETH address:', ethAddress.toLowerCase());
    const user = await usersCollection.findOne({ ethAddress: ethAddress.toLowerCase() });
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('User not found, returning 404');
      return res.status(404).json({ 
        error: 'User not found. Please register first.' 
      });
    }

    // Generate expected message (same format as frontend)
    const expectedMessage = `Welcome to FullOnCrypto!\n\nPlease sign this message to authenticate your wallet.\n\nWallet: ${ethAddress}`;

    // Verify signature (basic verification - check if message contains wallet address)
    if (!signature.startsWith('0x') || signature.length !== 132) {
      return res.status(401).json({ 
        error: 'Invalid signature format' 
      });
    }

    // Return success response (without password)
    res.json({
      message: 'Wallet login successful',
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        ethAddress: user.ethAddress,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Wallet login error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Register with wallet API
app.post('/api/register-wallet', async (req, res) => {
  try {
    const { ethAddress, signature, username } = req.body;

    // Validation
    if (!ethAddress || !signature || !username) {
      return res.status(400).json({ 
        error: 'ETH address, signature, and username are required' 
      });
    }

    // Validate ETH address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(ethAddress)) {
      return res.status(400).json({ 
        error: 'Invalid ETH address format' 
      });
    }

    if (username.length < 3) {
      return res.status(400).json({ 
        error: 'Username must be at least 3 characters long' 
      });
    }

    const usersCollection = db.collection('users');

    // Check if username already exists
    const existingUsername = await usersCollection.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ 
        error: 'Username already exists' 
      });
    }

    // Check if this specific address is already registered
    const existingWallet = await usersCollection.findOne({ ethAddress: ethAddress.toLowerCase() });
    if (existingWallet) {
      return res.status(409).json({ 
        error: `This address ${ethAddress} is already registered to user: ${existingWallet.username}` 
      });
    }

    // Basic signature validation
    if (!signature.startsWith('0x') || signature.length !== 132) {
      return res.status(401).json({ 
        error: 'Invalid signature format' 
      });
    }

    // Create new user with wallet
    const newUser = {
      username,
      password: '', // No password for wallet users
      email: '',
      ethAddress: ethAddress.toLowerCase(),
      createdAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);

    // Return success response
    res.status(201).json({
      message: 'Wallet registration successful',
      user: {
        id: result.insertedId.toString(),
        username: newUser.username,
        email: newUser.email,
        ethAddress: newUser.ethAddress,
        createdAt: newUser.createdAt
      }
    });

  } catch (error) {
    console.error('Wallet registration error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});