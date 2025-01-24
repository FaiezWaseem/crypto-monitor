import fetch from 'node-fetch';
import sqlite3 from 'sqlite3';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env
dotenv.config();

// Get directory name from the module URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up SQLite database
const db = new sqlite3.Database('./crypto.db', (err) => {
    if (err) {
        console.error(err.message);
    }
});

// Create table for storing crypto prices
db.run(`CREATE TABLE IF NOT EXISTS prices (
    id INTEGER PRIMARY KEY,
    coin TEXT,
    price REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// List of coins to monitor
const coins = ['bitcoin', 'ethereum', 'ripple', 'tether', 'solana', 'binancecoin', 'dogecoin', 'tron',
    'chainlink', 'weth', 'litecoin', 'official-trump', 'pepe', 'binance-staked-sol', 'mantle-staked-ether',
    'msol', 'solv-btc'];

async function fetchCoinData() {
    const url = 'https://api.coingecko.com/api/v3/simple/price';
    const params = new URLSearchParams({
        ids: coins.join(','),
        vs_currencies: 'usd'
    });

    try {
        const response = await fetch(`${url}?${params}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching coin data:', error);
        throw error;
    }
}

function checkPriceChanges(coin, currentPrice) {
    db.get(`SELECT price FROM prices WHERE coin = ? ORDER BY timestamp DESC LIMIT 1`, [coin], (err, row) => {
        if (err) {
            console.error(err.message);
            return;
        }
        if (row) {
            const previousPrice = row.price;
            const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;

            // Check for 5% price hike
            if (priceChange >= 5) {
                sendEmailAlert(coin, priceChange);
            }
        }
    });
}

function sendEmailAlert(coin, priceChange) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.RECIPIENT_EMAIL,
        subject: `Price Alert for ${coin.charAt(0).toUpperCase() + coin.slice(1)}`,
        text: `The price of ${coin} has changed by ${priceChange.toFixed(2)}% in the last 24 hours.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log('Error sending email:', error);
        }
        console.log('Email sent:', info.response);
    });
}

async function monitor() {
    try {
        const coinData = await fetchCoinData();
        console.log('Fetched coin data:', coinData);
        for (const coin of coins) {
            const currentPrice = coinData[coin].usd;
            console.log(`Current price of ${coin}: $${currentPrice}`);

            // Insert current price into database
            db.run(`INSERT INTO prices (coin, price) VALUES (?, ?)`, [coin, currentPrice], (err) => {
                if (err) {
                    console.error('Error inserting price into database:', err);
                }
            });

            // Check for price changes
            checkPriceChanges(coin, currentPrice);
        }
    } catch (error) {
        console.error('Error during monitoring:', error);
    }
}

// Schedule the monitoring task to run every 10 minutes
cron.schedule('*/10 * * * *', () => {
    console.log('Running monitoring task...');
    monitor();
});

// Initial run
monitor();

// Set up Express server
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to get price data for the graph
app.get('/api/prices', (req, res) => {
    const { coin } = req.query; // Get the coin from the query parameters
    const query = coin 
        ? `SELECT coin, price, timestamp FROM prices WHERE coin = ? ORDER BY timestamp DESC LIMIT 100` 
        : `SELECT coin, price, timestamp FROM prices ORDER BY timestamp DESC LIMIT 100`;
    
    db.all(query, coin ? [coin] : [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});


// Serve the HTML page
app.get('/', (req, res) => {
    // Query to fetch the latest prices
    db.all(`SELECT coin, price, change_24h, volume FROM prices ORDER BY timestamp DESC LIMIT 5`, [], (err, rows) => {
        if (err) {
            res.status(500).send('Error fetching data');
            return;
        }

        // Generate the table rows dynamically
        const tableRows = rows.map(row => `
            <tr>
                <td>${row.coin.charAt(0).toUpperCase() + row.coin.slice(1)} (${row.coin})</td>
                <td>$${row.price.toFixed(2)}</td>
                <td>${row.change_24h}%</td>
                <td>$${(row.volume / 1e9).toFixed(1)}B</td>
            </tr>
        `).join('');

        // Send the HTML response with dynamic table data
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Crypto Prices</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    th, td {
                        padding: 10px;
                        text-align: left;
                        border: 1px solid #ddd;
                    }
                    th {
                        background-color: #f2f2f2;
                    }
                </style>
            </head>
            <body>
                <h1>Cryptocurrency Prices</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Price</th>
                            <th>24h Change</th>
                            <th>Volume</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </body>
            </html>
        `);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});