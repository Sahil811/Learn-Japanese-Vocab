const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const { URLSearchParams } = require('url');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 7000;

// Middleware for parsing JSON bodies
app.use(express.json());

// Performance middleware
app.use((req, res, next) => {
    // Add caching headers for static resources
    if (req.url.includes('.css') || req.url.includes('.js') || req.url.includes('.json')) {
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
    }
    // Add compression headers
    res.setHeader('Vary', 'Accept-Encoding');
    next();
});

// Serve static files under /mokuro path, including index.html
app.use('/mokuro/visual_novel', express.static(path.join(__dirname)));

// Database connection with performance optimizations
const db = new sqlite3.Database('japanese_words.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        // Enable performance optimizations
        db.run('PRAGMA journal_mode = WAL');
        db.run('PRAGMA synchronous = NORMAL');
        db.run('PRAGMA cache_size = 10000');
        db.run('PRAGMA temp_store = MEMORY');
    }
});

// API endpoint to get all words (optimized with caching and pagination)
app.get('/api/words', (req, res) => {
    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
    res.setHeader('ETag', 'words-v1');
    
    // Pagination parameters
    const limit = parseInt(req.query.limit) || 0; // 0 means no limit (backwards compatibility)
    const offset = parseInt(req.query.offset) || 0;
    
    let query = 'SELECT word FROM words ORDER BY word';
    let params = [];
    
    if (limit > 0) {
        query += ' LIMIT ? OFFSET ?';
        params = [limit, offset];
    }
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching words:', err);
            res.status(500).json({ error: 'Failed to fetch words' });
        } else {
            const words = rows.map(row => row.word);
            
            // Add pagination metadata
            if (limit > 0) {
                res.json({
                    data: words,
                    pagination: {
                        limit,
                        offset,
                        count: words.length,
                        hasMore: words.length === limit
                    }
                });
            } else {
                // Backwards compatibility - return array directly
                res.json(words);
            }
        }
    });
});

// API endpoint to get all kanji data (optimized with caching and pagination)
app.get('/api/kanji', (req, res) => {
    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
    res.setHeader('ETag', 'kanji-v1');
    
    // Pagination parameters
    const limit = parseInt(req.query.limit) || 0; // 0 means no limit (backwards compatibility)
    const offset = parseInt(req.query.offset) || 0;
    
    let query = 'SELECT kanji, meaning, rtk FROM kanji ORDER BY kanji';
    let params = [];
    
    if (limit > 0) {
        query += ' LIMIT ? OFFSET ?';
        params = [limit, offset];
    }
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching kanji:', err);
            res.status(500).json({ error: 'Failed to fetch kanji' });
        } else {
            // Add pagination metadata
            if (limit > 0) {
                res.json({
                    data: rows,
                    pagination: {
                        limit,
                        offset,
                        count: rows.length,
                        hasMore: rows.length === limit
                    }
                });
            } else {
                // Backwards compatibility - return array directly
                res.json(rows);
            }
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

// API endpoint to update kanji RTK
app.put('/api/kanji/:kanji/rtk', (req, res) => {
    const kanjiChar = req.params.kanji;
    const { rtk } = req.body;
    
    // Validate input
    if (rtk === undefined || rtk === null) {
        return res.status(400).json({ error: 'RTK field is required' });
    }
    
    // Convert to string and trim whitespace
    const rtkValue = String(rtk).trim();
    
    // First check if kanji exists
    db.get('SELECT kanji FROM kanji WHERE kanji = ?', [kanjiChar], (err, row) => {
        if (err) {
            console.error('Error checking kanji existence:', err);
            res.status(500).json({ error: 'Failed to check kanji existence' });
            return;
        }
        
        if (!row) {
            res.status(404).json({ error: 'Kanji not found' });
            return;
        }
        
        // Update the RTK value
        db.run('UPDATE kanji SET rtk = ? WHERE kanji = ?', [rtkValue, kanjiChar], function(err) {
            if (err) {
                console.error('Error updating kanji RTK:', err);
                res.status(500).json({ error: 'Failed to update kanji RTK' });
            } else {
                console.log(`✅ Updated RTK for kanji '${kanjiChar}': "${rtkValue}"`);
                
                // Return the updated kanji data
                db.get('SELECT kanji, meaning, rtk FROM kanji WHERE kanji = ?', [kanjiChar], (err, updatedRow) => {
                    if (err) {
                        console.error('Error fetching updated kanji:', err);
                        res.status(500).json({ error: 'Update successful but failed to fetch updated data' });
                    } else {
                        res.json({
                            success: true,
                            message: 'RTK updated successfully',
                            data: updatedRow
                        });
                    }
                });
            }
        });
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
