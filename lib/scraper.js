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
                const value = await elHandle.evaluate(node => node.innerHTML, undefined, { timeout: 30000 });
                result.data.value = value;
            } catch (error) {
                result.success = false;
                result.error = "SCRAPE_FAILED"
                console.log(error)
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

async function scrapeHtmlSectionV3({ url, selector }) {
    if (!url) throw new Error('url is required');
    if (!selector) throw new Error('selector is required');

    const browser = await playwright.chromium.launch({
        headless: HEADLESS,
        args: ['--no-sandbox']
    });

    const page = await browser.newPage();

    try {
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        });

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 0
        });

        const result = {
            success: true,
            error: null,
            data: {
                selector,
                value: null
            }
        };

        try {
            const elHandle = page.locator(selector);
            const value = await elHandle.evaluate(
                node => node.innerHTML,
                undefined,
                { timeout: 30000 }
            );
            result.data.value = parsePrice(value);
        } catch (error) {
            result.success = false;
            result.error = 'SCRAPE_FAILED';
            console.log(error);
        }

        await browser.close();
        return result;

    } catch (err) {
        try { await browser.close(); } catch (_) { }
        throw err;
    }
}

function parsePrice(value) {
    if (!value) return null;

    // 1. Keep only digits, dot, comma
    let cleaned = value.replace(/[^0-9.,]/g, '');

    // 2. If both comma and dot exist → detect decimal separator (last occurrence)
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');

    let decimalSeparator = null;

    if (lastDot > -1 && lastComma > -1) {
        decimalSeparator = lastDot > lastComma ? '.' : ',';
    } else if (lastComma > -1) {
        // If only comma → could be decimal OR thousand
        // Assume decimal if it's not grouping every 3 digits
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

    // 3. Remove thousand separators
    let normalized = cleaned;

    if (decimalSeparator) {
        const regex = decimalSeparator === '.' ? /,/g : /\./g;
        normalized = normalized.replace(regex, '');

        // Replace decimal separator with dot
        if (decimalSeparator === ',') {
            normalized = normalized.replace(',', '.');
        }
    } else {
        // No decimal → remove all separators
        normalized = normalized.replace(/[.,]/g, '');
    }

    // 4. Convert to number
    const result = Number(normalized);

    return isNaN(result) ? null : result;
}

module.exports = { scrapeHtmlSection, scrapeHtmlSectionV3 };
