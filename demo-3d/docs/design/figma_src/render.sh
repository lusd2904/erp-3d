#!/bin/bash
cd "$(dirname "$0")"; export FONTCONFIG_FILE=/workspace/fonts/fonts.conf
python3 measure.py gen.mjs adv.json && node gen.mjs || exit 1
for p in "设备详情弹窗:prev_detail" "登录页:prev_login"; do google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size=1920,1080 --screenshot="${p#*:}.png" "file://$PWD/${p%%:*}.svg" 2>/dev/null | tail -1; done
ls -la *.svg prev_detail.png prev_login.png
