const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const { URLSearchParams } = require('url');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 7000;

// Serve static files under /mokuro path, including index.html
app.use('/mokuro/visual_novel', express.static(path.join(__dirname)));

// Database connection
const db = new sqlite3.Database('japanese_words.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// API endpoint to get all words
app.get('/api/words', (req, res) => {
    db.all('SELECT word FROM words ORDER BY word', (err, rows) => {
        if (err) {
            console.error('Error fetching words:', err);
            res.status(500).json({ error: 'Failed to fetch words' });
        } else {
            const words = rows.map(row => row.word);
            res.json(words);
        }
    });
});

// API endpoint to get all kanji data
app.get('/api/kanji', (req, res) => {
    db.all('SELECT kanji, meaning, rtk FROM kanji ORDER BY kanji', (err, rows) => {
        if (err) {
            console.error('Error fetching kanji:', err);
            res.status(500).json({ error: 'Failed to fetch kanji' });
        } else {
            res.json(rows);
        }
    });
});

// API endpoint to get a random word
app.get('/api/random-word', (req, res) => {
    db.get('SELECT word FROM words ORDER BY RANDOM() LIMIT 1', (err, row) => {
        if (err) {
            console.error('Error fetching random word:', err);
            res.status(500).json({ error: 'Failed to fetch random word' });
        } else if (row) {
            res.json({ word: row.word });
        } else {
            res.status(404).json({ error: 'No words found' });
        }
    });
});

// API endpoint to get kanji info for a specific kanji character
app.get('/api/kanji/:kanji', (req, res) => {
    const kanjiChar = req.params.kanji;
    db.get('SELECT kanji, meaning, rtk FROM kanji WHERE kanji = ?', [kanjiChar], (err, row) => {
        if (err) {
            console.error('Error fetching kanji info:', err);
            res.status(500).json({ error: 'Failed to fetch kanji info' });
        } else if (row) {
            res.json(row);
        } else {
            res.status(404).json({ error: 'Kanji not found' });
        }
    });
});

// Proxy for Jisho API
app.get('/api/jisho', async (req, res) => {
    const { keyword } = req.query;
    if (!keyword) {
        return res.status(400).json({ error: 'Keyword is required' });
    }
    const url = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(keyword)}`;
    try {
        const apiResponse = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            }
        });
        
        const data = await apiResponse.json();
        res.json(data);
    } catch (error) {
        console.error('Jisho API proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch data from Jisho API' });
    }
});

// Generic Proxy for Immersion Kit API
app.get('/api/immersion-kit', async (req, res) => {
    // The original target URL is passed as a query parameter 'targetUrl'
    const targetUrl = req.query.targetUrl;
    if (!targetUrl) {
        return res.status(400).json({ error: 'Target URL is required' });
    }

    // Reconstruct the query parameters for the target API, excluding our own 'targetUrl'
    const originalParams = new URLSearchParams(req.query);
    originalParams.delete('targetUrl');
    const fullUrl = `${targetUrl}?${originalParams.toString()}`;

    try {
        // Fetch data, images, or audio from the target URL
        const apiResponse = await fetch(fullUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            }
        });

        // Check if the response is OK
        if (!apiResponse.ok) {
            throw new Error(`API responded with status: ${apiResponse.status}`);
        }

        // Get the content type to handle binary data (images, audio) correctly
        const contentType = apiResponse.headers.get('content-type');
        
        // Pipe the response directly to the client
        res.setHeader('Content-Type', contentType);
        apiResponse.body.pipe(res);

    } catch (error) {
        console.error('Immersion Kit proxy error:', error);
        res.status(500).json({ error: `Failed to fetch data from Immersion Kit API: ${error.message}` });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Close database connection on app termination
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});
