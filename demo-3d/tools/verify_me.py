import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        errs=[]
        for w,h in [(1920,1080),(1366,768)]:
            pg = await b.new_page(viewport={"width":w,"height":h})
            pg.on("console", lambda m: errs.append(f"{w} {m.type}: {m.text}") if m.type=="error" else None)
            pg.on("pageerror", lambda e: errs.append(f"{w} pageerror: {e}"))
            await pg.goto("http://127.0.0.1:8090/index.html", timeout=120000)
            await pg.wait_for_timeout(15000)
            await pg.screenshot(path=f"screenshots/verify/cockpit_{w}.png")
            if w==1920:
                for h_ in ["#/workshop","#/mo","#/trace","#/inventory"]:
                    await pg.evaluate(f"location.hash='{h_}'")
                    await pg.wait_for_timeout(9000)
                    await pg.screenshot(path=f"screenshots/verify/{h_[2:]}_{w}.png")
            await pg.close()
        await b.close()
        print("ERRORS", len(errs)); [print(e) for e in errs[:20]]
asyncio.run(main())
