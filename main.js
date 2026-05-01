import { chromium } from 'playwright';
import express from 'express';

const app = express();
app.use(express.json());

const PORT = 3030;
const HEADLESS = false;
const LOG = false;

let browser;

app.get('/', (req, res) => {
    res.json({ status: 'OK', app_version: '2.3.0', timestamp: new Date().toLocaleString() });
});

app.get('/v2', async (req, res) => {
    const { name, key, url, selector } = req.query;

    if (!url) return res.status(400).json({ error: 'Missing URL' });
    if (!selector) return res.status(400).json({ error: 'Missing selector' });
    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!key) return res.status(400).json({ error: 'Missing key' });

    try {
        const value = await loadPage({ url, selector });

        return res.json({
            success: true,
            data: {
                name,
                url,
                selector,
                key,
                value
            }
        });
    } catch (err) {
        if (LOG) console.log(err);
        return res.status(500).json({
            success: false,
            error: "SCRAPE_FAILED",
        });
    }
});

async function init() {
    browser = await chromium.launch({
        headless: HEADLESS,
        // executablePath: '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

await init();