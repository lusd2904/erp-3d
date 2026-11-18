import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1600,'height':900})
        await pg.goto('http://127.0.0.1:8765/tools/modules-harness.html?m=' + sys.argv[1]); await pg.wait_for_function('window.__ready'); await pg.wait_for_timeout(1200)
        print(await pg.evaluate(sys.argv[2]))
        await b.close()
asyncio.run(main())
