require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const incidentRoutes = require('./routes/incidentRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON payloads

// Mount Routes
app.use('/api/incidents', incidentRoutes);
app.use('/api/webhooks', webhookRoutes);

// Healthcheck endpoint for Load Balancers (AWS ALB / Nginx)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'SpriteSRE Backend running' });
});

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
