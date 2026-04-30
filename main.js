const { chromium } = require('playwright');
const express = require('express');
const app = express();

app.use(express.json());

const PORT = 3030;
const HEADLESS = false;
const LOG = false;

app.get('/', (req, res) => {
    res.json({ status: 'OK', app_version: '2.3.0', timestamp: new Date().toLocaleString() });
});

app.listen(PORT, () => {
    // console.log(`Server is running on port ${PORT}`);
});

app.get('/v2', async (req, res) => {
    const { name, url, selector } = req.body || {};

    if (!url) return res.status(400).json({ error: 'Missing URL' });
    if (!selector) return res.status(400).json({ error: 'Missing selector' });
    if (!name) return res.status(400).json({ error: 'Missing name' });

    try {
        const value = await loadPage({ url, selector });
        if (value === null || value === undefined) {
            throw new Error('No result found or the result is empty');
        }

        return res.json({
            success: true,
            error: null,
            data: {
                name,
                url,
                selector,
                value,
                fetched_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).replace('T', ' ')
            }
        });
    } catch (err) {
        if (LOG) console.log(err);
        return res.status(500).json({
            success: false,
            error: err.code || "SCRAPE_FAILED",
        });
    }
});

async function loadPage({ url, selector }) {
    if (!url) throw new Error('url is required');
    if (!selector) throw new Error('selector is required');

    const browser = await chromium.launch({
        headless: HEADLESS,
        executablePath: '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        const elHandle = page.locator(selector);
        const raw = await elHandle.evaluate(node => node.innerHTML, undefined, { timeout: 10000 });
        const value = parsePrice(raw);

        await browser.close();
        return value;
    } catch (err) {
        if (LOG) console.log(err);
        try { await browser.close(); } catch (_) { }
        throw err;
    }
}

function parsePrice(value) {
    if (!value) return null;
    let cleaned = value.replace(/[^0-9.,]/g, '');

    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');

    let decimalSeparator = null;

    if (lastDot > -1 && lastComma > -1) {
        decimalSeparator = lastDot > lastComma ? '.' : ',';
    } else if (lastComma > -1) {
        const parts = cleaned.split(',');
        if (parts[parts.length - 1].length !== 3) {
            decimalSeparator = ',';
        }
    } else if (lastDot > -1) {
        const parts = cleaned.split('.');
        if (parts[parts.length - 1].length !== 3) {
            decimalSeparator = '.';
        }
    }

    let normalized = cleaned;

    if (decimalSeparator) {
        const regex = decimalSeparator === '.' ? /,/g : /\./g;
        normalized = normalized.replace(regex, '');
        if (decimalSeparator === ',') {
            normalized = normalized.replace(',', '.');
        }
    } else {
        normalized = normalized.replace(/[.,]/g, '');
    }

    const result = Number(normalized);
    return isNaN(result) ? null : result;
}