const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const { URLSearchParams } = require('url');

const app = express();
const PORT = process.env.PORT || 7000;

// Serve static files from the root directory, including index.html
app.use(express.static(path.join(__dirname)));

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
