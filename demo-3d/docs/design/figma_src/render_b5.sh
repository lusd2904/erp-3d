#!/bin/bash
# 第 5 批：生成 SVG 并用 Chrome 渲染预览   ./render_b1.sh [UI01 UI02 ...]
cd "$(dirname "$0")"; export FONTCONFIG_FILE=/workspace/fonts/fonts.conf
OUT=/workspace/erp-3d/fullsys/ui/src; mkdir -p "$OUT"
cat gen_full.mjs gen_b1.mjs gen_b2.mjs gen_b3.mjs gen_b4.mjs gen_b5.mjs > .allsrc.txt && python3 measure.py .allsrc.txt adv_full.json && node gen_b5.mjs "$@" || exit 1
for n in UI41 UI42 UI43 UI44 UI45 UI46 UI47 UI48; do f="$OUT/$n.svg"; [ -f "$f" ] || continue; [ -n "$1" ] && [[ " $* " != *" $n "* ]] && continue
  wh=$(grep -o 'viewBox="0 0 [0-9]* [0-9]*"' "$f" | head -1 | awk '{print $3","$4}' | tr -d '"')
  google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size="$wh" --screenshot="$OUT/prev_$n.png" "file://$f" >/dev/null 2>&1; echo "$n $wh $(stat -c %s "$f")"; done
