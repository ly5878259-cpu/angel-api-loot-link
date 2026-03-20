import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const delay = (ms) => new Promise(res => setTimeout(res, ms));

// limit browsers (prevents crashes)
let active = 0;
const MAX = 2;

async function waitSlot() {
  while (active >= MAX) {
    await delay(500);
  }
}

export default async function handler(req, res) {
  let browser;

  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ error: "Use ?url=" });
    }

    await waitSlot();
    active++;

    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await page.waitForSelector("body");

    let clicked = false;

    // 🔍 click "?"
    const els = await page.$$("a, button, div, span");

    for (const el of els) {
      const text = await page.evaluate(e => e.innerText || "", el);

      if (text.includes("?")) {
        try {
          await el.click();
          clicked = true;
          await delay(2000);
        } catch {}
      }
    }

    // 🔁 fallback
    if (!clicked) {
      const words = [
        "COMPLETE AND GET REWARDED",
        "ALLOW NOTIFICATIONS",
        "REGISTER NOW",
        "PLACE YOUR BET"
      ];

      for (const w of words) {
        const found = await page.$x(`//*[contains(text(), "${w}")]`);

        if (found.length) {
          try {
            await found[0].click();
            await delay(2000);
          } catch {}
        }
      }
    }

    // 🔥 click HI once
    let hi = await page.$x(`//*[contains(text(), "UNLOCK CONTENT")]`);
    if (hi.length) {
      try {
        await hi[0].click();
        await delay(2000);
      } catch {}
    }

    // 🔁 loop HI every 4s
    for (let i = 0; i < 8; i++) {
      hi = await page.$x(`//*[contains(text(), "UNLOCK CONTENT")]`);

      if (hi.length) {
        try {
          await hi[0].click();
        } catch {}
      }

      await delay(4000);
    }

    res.json({ success: true });

  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (browser) await browser.close();
    active--;
  }
}
