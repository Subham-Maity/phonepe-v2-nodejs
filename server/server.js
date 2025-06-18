require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { tokenHandler } = require('./auth');
const { payment, status, callback } = require('./phonepe');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/api/token', tokenHandler);
app.post('/api/payment', payment);
app.get('/api/redirect/:merchantOrderId', status);
app.post('/api/callback', callback);

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'PhonePe Payment Server is running!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});