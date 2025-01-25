
import sqlite3 from 'sqlite3';

import cron from 'node-cron';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { SqliteGuiNode }  from "sqlite-gui-node";
import {Database} from './src/db-migrations.js';
import { fetchCoinData } from './src/coinbase.js';
import { monitor } from './src/monitor.js';
import { html } from './src/dashboard.js';

// Load environment variables from .env
dotenv.config();

// Get directory name from the module URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up SQLite database
const sqlitedb = new sqlite3.Database('./crypto.db', (err) => {
    if (err) {
        console.error(err.message);
    }
});

const db = new Database(sqlitedb);

// Create table for storing crypto prices
db.runMigrations();


// Schedule the monitoring task to run every 12 hours
cron.schedule('0 */12 * * *', () => {
    console.log('Running monitoring task...');
    monitor(sqlitedb);
});

// Initial run
monitor(sqlitedb);

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
    
        sqlitedb.all(query, coin ? [coin] : [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});
// Endpoint to fetch live prices directly from CoinGecko API
app.get('/api/live-prices', async (req, res) => {
    try {
        const coinData = await fetchCoinData(); // Reusing the fetchCoinData function
        res.json(coinData);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching live prices' });
    }
});


const coins = ['bitcoin', 'ethereum', 'ripple', 'tether', 'solana', 'binancecoin', 'dogecoin', 'tron',
    'chainlink', 'weth', 'litecoin', 'official-trump', 'pepe', 'binance-staked-sol', 'mantle-staked-ether',
    'msol', 'solv-btc'];

app.get('/', async (req, res) => {
        try {
            const coinData = await fetchCoinData(); // Fetch current prices from CoinGecko API
            const prices24hAgo = {};
            const prices12hAgo = {};
            const prices6hAgo = {};
    
            // Get the prices from the database for each coin at different intervals
            for (const coin of coins) {
                await new Promise((resolve, reject) => {
                    // Fetch 24-hour old price
                    sqlitedb.get(
                        `SELECT price FROM prices WHERE coin = ? AND timestamp <= datetime('now', '-24 hours') ORDER BY timestamp DESC LIMIT 1`,
                        [coin],
                        (err, row) => {
                            if (err) reject(err);
                            prices24hAgo[coin] = row ? row.price : null;
                            resolve();
                        }
                    );
                });
    
                await new Promise((resolve, reject) => {
                    // Fetch 12-hour old price
                    sqlitedb.get(
                        `SELECT price FROM prices WHERE coin = ? AND timestamp <= datetime('now', '-12 hours') ORDER BY timestamp DESC LIMIT 1`,
                        [coin],
                        (err, row) => {
                            if (err) reject(err);
                            prices12hAgo[coin] = row ? row.price : null;
                            resolve();
                        }
                    );
                });
    
                await new Promise((resolve, reject) => {
                    // Fetch 6-hour old price
                    sqlitedb.get(
                        `SELECT price FROM prices WHERE coin = ? AND timestamp <= datetime('now', '-6 hours') ORDER BY timestamp DESC LIMIT 1`,
                        [coin],
                        (err, row) => {
                            if (err) reject(err);
                            prices6hAgo[coin] = row ? row.price : null;
                            resolve();
                        }
                    );
                });
            }
    
            // Pass the data to the EJS template
            res.render('dashboard', {
                coinData,
                prices24hAgo,
                prices12hAgo,
                prices6hAgo,
            });
        } catch (error) {
            console.error('Error rendering dashboard:', error);
            res.status(500).send('Error rendering dashboard');
        }
    });
    


if (process.env.NODE_ENV != 'production') {
    SqliteGuiNode(sqlitedb ).catch((err) => {
        console.error("Error starting the GUI:", err);
    });
}

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views')); // Set the views directory
  
  
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
