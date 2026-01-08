require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const { scrapeHtmlSection } = require('./lib/scraper');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({ status: 'OK', app_version: process.env.APP_VERSION, timestamp: new Date().toLocaleString() });
});

app.get('/target-list', async (req, res) => {
    try {
        const targetPath = path.join(__dirname, 'v2-target.json');
        const contents = await fs.readFile(targetPath, 'utf8');
        const data = JSON.parse(contents);

        return res.json({ success: true, error: null, data });
    } catch (err) {
        console.error(`Failed to load target list: ${err.message || err}`);
        return res.status(500).json({ success: false, error: err.message || 'Failed to load target list' });
    }
});

app.get('/scrape', async (req, res) => {
    const { url, selectors = 'body' } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Missing URL' });

    try {
        const result = await scrapeHtmlSection({ url, selectors });
        if (!result) {
            throw new Error('No result found or the result is empty');
        }

        return res.json({
            success: true,
            error: null,
            data: {
                url,
                result,
                fetched_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).replace('T', ' ')
            }
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err.code || "SCRAPE_FAILED",
        });
    }

});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
