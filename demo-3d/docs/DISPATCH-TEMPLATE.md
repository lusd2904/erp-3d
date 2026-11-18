# 设备建模派活通用要求（电子元器件ERP）
1. 先读规范 /workspace/erp-3d/docs/DEVICE-SPEC.md，完全照做；只写一个文件 /workspace/erp-3d/src/three/devices/<type>.js，不动其他文件。
2. 参考已验收的 /workspace/erp-3d/src/three/devices/mounter.js 写法（PartBuilder/材质/灯塔/userData.animate）。
3. 配色按 /workspace/erp-3d/docs/design/设备参考图.png：机身白 #F4F7FB、机身灰 #CBD5E1、主色蓝 #2563EB、强调青 #22D3EE、玻璃 #BAE6FD 30%、告警橙 #FB923C，整体浅色，不要饱和深色。
4. 网格 ≤40；输送面高 0.90 m；三色灯顶端高出机顶 ≤0.35 m；操作屏用 CanvasTexture 画浅色界面（数字为演示值），不能是纯色块。
5. run 状态要有合理动画，idle 静止；不能穿模、悬空、比例失真。
6. 写完运行：cd /workspace/erp-3d && python3 tools/shot_device.py <type> run ，确认 console 报错 0，自己看三张截图，有问题先改。
7. 完成后发消息给 电子元器件ERP：网格数、尺寸、截图路径、已知问题，并说明哪些是模型写的、哪些人工改的。
