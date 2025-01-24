import fetch from 'node-fetch';
import sqlite3 from 'sqlite3';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

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
        user: process.env.EMAIL_USER, // Use environment variable
        pass: process.env.EMAIL_PASS    // Use environment variable
    }
});

// List of coins to monitor
const coins = ['bitcoin', 'ethereum','ripple','tether','solana','binancecoin','dogecoin','tron',
    'chainlink','weth','litecoin','official-trump','pepe','binance-staked-sol','mantle-staked-ether',
     'msol','solv-btc'];

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
        throw error; // Propagate the error to handle it later
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
        from: process.env.EMAIL_USER, // Use environment variable
        to: process.env.RECIPIENT_EMAIL, // Use environment variable
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