#!/bin/bash
# 第 2 批：生成 SVG 并用 Chrome 渲染预览   ./render_b1.sh [UI01 UI02 ...]
cd "$(dirname "$0")"; export FONTCONFIG_FILE=/workspace/fonts/fonts.conf
OUT=/workspace/erp-3d/fullsys/ui/src; mkdir -p "$OUT"
cat gen_full.mjs gen_b1.mjs gen_b2.mjs > .allsrc.txt && python3 measure.py .allsrc.txt adv_full.json && node gen_b2.mjs "$@" || exit 1
for n in UI12 UI13 UI14 UI15 UI16 UI17 UI18 UI19 UI20; do f="$OUT/$n.svg"; [ -f "$f" ] || continue; [ -n "$1" ] && [[ " $* " != *" $n "* ]] && continue
  wh=$(grep -o 'viewBox="0 0 [0-9]* [0-9]*"' "$f" | head -1 | awk '{print $3","$4}' | tr -d '"')
  google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size="$wh" --screenshot="$OUT/prev_$n.png" "file://$f" >/dev/null 2>&1; echo "$n $wh $(stat -c %s "$f")"; done
