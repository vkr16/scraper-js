const playwright = require('playwright');

const HEADLESS = process.env.HEADLESS !== 'false';

async function scrapeHtmlSection({ url, selectors }) {
    if (!url) throw new Error('url is required');

    const browser = await playwright.chromium.launch({ headless: HEADLESS, args: ['--no-sandbox'] });
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
                const value = await elHandle.evaluate(node => node.innerHTML, undefined, { timeout: 15000 });
                result.data.value = value;
            } catch (error) {
                result.success = false;
                result.error = "SCRAPE_FAILED"
            }
            results.push(result);
        }

        await browser.close();
        return results;
    } catch (err) {
        try { await browser.close(); } catch (_) { }
        throw err;
    }
}

module.exports = { scrapeHtmlSection };
