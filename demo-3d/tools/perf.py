import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':1600,'height':900})
        await pg.goto('http://127.0.0.1:8090/index.html#/workshop')
        await pg.wait_for_selector('body[data-ready="1"]', timeout=90000)
        await pg.wait_for_timeout(3000)
        r = await pg.evaluate("""(()=>{const w=window.__erp.world;w.running=false;const out={};
          const T=()=>{const t=performance.now();w.renderer.render(w.scene,w.camera);const gl=w.renderer.getContext();gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));return Math.round(performance.now()-t)};
          T();out.full=T();w.setView('L2',true);w.controls.update();T();out.L2=T();w.setView('workshop',true);out.calls=w.renderer.info.render.calls;out.dpr=w.renderer.getPixelRatio();
          w.renderer.shadowMap.autoUpdate=false;out.noShadowUpdate=T();w.renderer.shadowMap.autoUpdate=true;w.renderer.shadowMap.enabled=false;w.scene.traverse(o=>{if(o.material)o.material.needsUpdate=true});T();out.noShadow=T();
          let n=0,inst=0,meshes={};w.scene.traverse(o=>{if(o.isMesh){n++; if(o.isInstancedMesh)inst++;}});out.meshes=n;
          for(const [id,g] of Object.entries(w.devices)){let c=0;g.traverse(o=>{if(o.isMesh)c++});meshes[id]=c}
          out.per=meshes;return out})()""")
        print(r)
        await b.close()
asyncio.run(main())
