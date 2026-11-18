#!/bin/bash
# 生成 fullsys UI SVG 并用 Chrome 渲染预览
cd "$(dirname "$0")"; export FONTCONFIG_FILE=/workspace/fonts/fonts.conf
OUT=/workspace/erp-3d/fullsys/ui/src; mkdir -p "$OUT"
python3 measure.py gen_full.mjs adv_full.json && node gen_full.mjs "$@" || exit 1
for f in "$OUT"/UI*.svg; do n=$(basename "$f" .svg); [ -n "$1" ] && [[ " $* " != *" $n "* ]] && continue
  wh=$(grep -o 'viewBox="0 0 [0-9]* [0-9]*"' "$f" | head -1 | awk '{print $3","$4}' | tr -d '"')
  google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size="$wh" --screenshot="$OUT/prev_$n.png" "file://$f" >/dev/null 2>&1; echo "$n $wh $(stat -c %s "$f")"; done
