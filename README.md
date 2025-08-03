# FullOnCrypto Backend API

Node.js backend API for the FullOnCrypto application, designed to work with both local development and Vercel serverless deployment.

## Features

- User authentication (traditional and wallet-based)
- Payment request management
- UPI ID indexing for smart contract integration
- MongoDB integration
- CORS enabled for frontend integration

## Environment Variables

Create a `.env` file with the following variables:

```env
MONGODB_URI=your_mongodb_connection_string
DB_NAME=fulloncrypto
PORT=3001
```

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or start production server
npm start
```

## Vercel Deployment

This API is configured for Vercel serverless deployment:

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel
   ```

3. **Set Environment Variables in Vercel**:
   ```bash
   vercel env add MONGODB_URI
   vercel env add DB_NAME
   ```

4. **Redeploy after setting env vars**:
   ```bash
   vercel --prod
   ```

## API Endpoints

### Authentication
- `POST /api/signup` - User registration
- `POST /api/login` - User login
- `POST /api/register-wallet` - Wallet-based registration
- `POST /api/login-wallet` - Wallet-based login
- `POST /api/update-wallet` - Update user wallet address

### Payment Requests
- `POST /api/payment-request` - Create payment request
- `GET /api/payment-requests` - Get all pending payment requests
- `GET /api/payment-request/contract/:contractRequestId` - Get payment request by contract ID
- `GET /api/upi-id/contract/:contractRequestId` - Get UPI ID by contract ID (optimized)

### Health Check
- `GET /api/health` - API health status
- `GET /api/test` - Simple test endpoint

## MongoDB Collections

- `users` - User accounts and wallet addresses
- `paymentRequests` - Payment request details
- `upiIndex` - Optimized mapping of contract IDs to UPI IDs

## Architecture Notes

- Uses MongoDB for data persistence
- Implements connection pooling for serverless efficiency
- All routes use async/await with proper error handling
- CORS enabled for cross-origin requests from frontend