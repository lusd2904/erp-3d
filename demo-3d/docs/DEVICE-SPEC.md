# 设备三维模型外包规范（模型部 bot 使用）

每台设备一个 ES module 文件，放 /workspace/erp-3d/src/three/devices/<type>.js。只写自己分到的那个文件，不改别的任何文件，不改 reference/，不用 /tmp。

## 必须导出
```js
import * as THREE from 'three';              // 页面 importmap 已映射到 vendor/three/three.module.js
import { M, lampMat, statusColor } from '../materials.js';   // 共享浅色工业材质库（只读引用）
import { PartBuilder, roundedBoxGeo, textTexture } from '../builder.js';
import { signalTower, applyLamps, statusRing, setRingStatus, monitorArm } from '../common.js';

export const meta = { type: '<type>', name: '中文名', refs: ['参考的真实机型/资料链接'], size: { w, d, h } };
export function build(device) {   // device = { id, name, status: 'run'|'idle'|'fault'|'maint', ... }
  const group = new THREE.Group(); group.name = device.id;
  // ...用 PartBuilder 组合精细部件：pb = new PartBuilder(); pb.box(...); pb.build(group);
  // 运动部件（贴装头、传送带上的 PCB、转塔、堆垛机载货台等）单独做成 Mesh/Group，不要合并进 PartBuilder
  group.userData.lamps = signalTower(group, x, y, z);    // 机顶信号灯塔
  group.userData.ring = statusRing(w, d); group.add(group.userData.ring);
  applyLamps(group.userData.lamps, device.status); setRingStatus(group.userData.ring, device.status);
  group.userData.animate = (t, dt, status) => { /* 仅 status==='run' 时动；t 秒 */ };
  group.userData.size = { w, d, h };
  return group;
}
```
## 坐标与尺寸
- 单位米；原点在设备底面中心，地面 y=0；PCB 传送方向为 +X（入口 -X，出口 +X），操作面朝 +Z。
- SMT 线传送高度统一 0.90 m（入口/出口传送导轨在 x=±w/2 处露出）。
- 尺寸按真实机型近似（先查真实设备照片/规格再建模，把参考写进 meta.refs）。
## 质量要求（老板："起码要参考页那种级别，别整太随便"）
- 不能是方块堆砌：要有机身圆角盖板、透明/半透明观察窗、内部可见机构、操作屏与支臂、铭牌文字、散热格栅、地脚、线缆槽、急停按钮等细节，一眼能认出是什么设备。
- 浅色工业配色为主（白/浅灰机身，蓝/青点缀），沿用 M 材质库；需要新材质在文件内自建。
- 网格总数控制：PartBuilder 合并后每台设备 draw call ≤ 40。
- 不能有 console 报错；不能依赖外网。
## 自测
写 /workspace/erp-3d/tools/device-preview.html?type=<type>（如已存在则直接用，不要改别人的），用 playwright（chromium headless，--use-gl=swiftshader）截 3 个角度（等距、正面、俯视）到 /workspace/erp-3d/screenshots/devices/<type>-*.png，亲自看图确认。
## 交付
回复：文件路径、截图路径、参考了哪些真实机型、draw call 数、已知问题。

## 预览工具（已就绪，主助手提供，勿改）
- 本地服务 http://127.0.0.1:8090 已指向 /workspace/erp-3d
- 预览页：tools/device-preview.html?type=<type>&view=iso|front|top&status=run|idle|fault|maint
- 截图脚本：cd /workspace/erp-3d && python3 tools/shot_device.py <type> [status]  → screenshots/devices/<type>-{iso,front,top}.png，并打印网格数与 console 错误（必须为 0）
- 接口样例：src/three/devices/_sample.js（注意 build 必须直接返回 THREE.Group）
