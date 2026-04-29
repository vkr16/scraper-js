// const env = require('dotenv');
// env.config();

const { chromium } = require('playwright');

const express = require('express');
const app = express();

app.use(express.json());

const PORT = 3000;
const HEADLESS = false;
const LOG = true;

app.get('/', (req, res) => {
    res.json({ status: 'OK', app_version: '2.1.0', timestamp: new Date().toLocaleString() });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

app.get('/v2', async (req, res) => {
    const { url, selectors = 'body' } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Missing URL' });

    try {
        const result = await loadPage({ url, selectors });
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
        if (LOG) console.log(err);
        return res.status(500).json({
            success: false,
            error: err.code || "SCRAPE_FAILED",
        });
    }
});

async function loadPage({ url, selectors }) {
    if (!url) throw new Error('url is required');

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
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });

        if (!Array.isArray(selectors) || selectors.length === 0) {
            await browser.close();
            return {};
        }

        const results = [];
        for (const item of selectors) {
            const { key, selector } = item || {};

            if (!key || !selector) {
                continue;
            }
            let result = {
                success: true,
                error: null,
                data: {
                    key: key,
                    selector: selector,
                    value: null
                }
            };

            try {
                const elHandle = page.locator(selector);
                const value = await elHandle.evaluate(node => node.innerHTML, undefined, { timeout: 30000 });
                result.data.value = parsePrice(value);
            } catch (error) {
                if (LOG) console.log(error);
                result.success = false;
                result.error = "SCRAPE_FAILED"
            }
            results.push(result);
        }

        await browser.close();
        return results;
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