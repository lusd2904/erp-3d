// src/three/devices/charger.js
// 网格数预算表（必须 ≤ 15）：
// - PartBuilder 合并后 8 个 mesh（8 种材质：white, graphite, gray, blue, darkGray, orange, copper, red）
// - display screen: 1 mesh
// - status light: 1 mesh
// - floor parking zone: 1 mesh
// - status ring: 2 mesh (inner fill + outer ring)
// 总计: 13 个 THREE.Mesh = 13 个 draw call（符合 ≤15 要求）

import * as THREE from 'three';
import { M, statusColor } from '../materials.js';
import { PartBuilder, roundedBoxGeo } from '../builder.js';
import { statusRing, setRingStatus } from '../common.js';

export const meta = {
  type: 'charger',
  name: 'AGV自动充电桩',
  refs: [
    'Hikrobot AGV auto charging station — https://www.hikrobotics.com/en/mobilerobot/',
    'Geek+ robot charging station — https://www.geekplus.com/'
  ],
  size: { w: 0.45, d: 0.30, h: 0.80 }
};

// 尺寸常量
const W = 0.45;  // 宽（X）
const D = 0.30;  // 深（Z）
const H = 0.80;  // 高（Y）

export function build(device) {
  const group = new THREE.Group();
  group.name = device.id;

  const status = device.status || 'run';

  // === 1. PartBuilder 构建所有部件 ===
  const pb = new PartBuilder();

  // 1. 主体机身柜体（白色圆角箱体）
  // 修正：roundedBoxGeo 外高度为 H - 0.06 - 0.04 = 0.74，居中 y = 0.06 + (H - 0.06) / 2 = 0.43
  pb.add(
    roundedBoxGeo(W - 0.04, H - 0.06 - 0.04, D - 0.04, 0.05),
    M.white,
    0, 0.06 + (H - 0.06) / 2, 0
  );

  // 2. 深灰色底座/底座板
  pb.boxC(W - 0.02, 0.06, D - 0.02, 0, 0.03, 0, M.graphite);

  // 3. 前面板灰色凹台（显示屏前方）
  pb.boxC(W - 0.08, 0.50, 0.006, 0, 0.46, D / 2 + 0.003, M.gray);

  // 4. 顶部灰色盖板
  pb.boxC(W + 0.01, 0.025, D + 0.01, 0, H + 0.0125, 0, M.gray);

  // 5. 前面板蓝色装饰条
  pb.boxC(W - 0.08, 0.012, 0.007, 0, 0.72, D / 2 + 0.0035, M.blue);

  // 6. 显示屏金属框（深灰）
  pb.boxC(0.26, 0.16, 0.010, 0, 0.56, D / 2 + 0.007, M.darkGray);

  // 7. 侧面散热格栅（深灰短条）
  for (let i = 0; i < 6; i++) {
    // 左侧 x = -(W/2 + 0.002)
    pb.boxC(0.006, 0.010, 0.16, -(W / 2 + 0.002), 0.30 + i * 0.03, 0, M.darkGray);
    // 右侧 x = +(W/2 + 0.002)
    pb.boxC(0.006, 0.010, 0.16, (W / 2 + 0.002), 0.30 + i * 0.03, 0, M.darkGray);
  }

  // 9. 充电刷组件（底部前端伸出）
  // 9.1 安装块（深灰）
  pb.boxC(0.30, 0.07, 0.06, 0, 0.075, D / 2 + 0.03, M.darkGray);

  // 9.2 绝缘前片（橙色警示）
  pb.boxC(0.28, 0.05, 0.008, 0, 0.075, D / 2 + 0.064, M.orange);

  // 9.3 两个铜色充电刷垫
  pb.boxC(0.07, 0.022, 0.020, -0.07, 0.075, D / 2 + 0.078, M.copper);
  pb.boxC(0.07, 0.022, 0.020, 0.07, 0.075, D / 2 + 0.078, M.copper);

  // 9.4 警示黄色标签条
  pb.boxC(0.30, 0.012, 0.004, 0, 0.125, D / 2 + 0.062, M.orange);

  // 10. 急停按钮（右侧前板）
  // 黄色底座 - 使用橙色代替黄色以减少材质
  pb.cyl(0.024, 0.012, 0.15, 0.30, D / 2 + 0.012, M.orange, 16, Math.PI / 2, 0, 0);
  // 红色顶部
  pb.cyl(0.017, 0.018, 0.15, 0.30, D / 2 + 0.027, M.red, 16, Math.PI / 2, 0, 0);

  // 11. 后墙线缆槽
  pb.boxC(0.08, 0.60, 0.04, 0, 0.40, -D / 2 - 0.02, M.gray);

  // 合并构建
  pb.build(group);

  // === 2. 显示屏（独立 Mesh）===
  {
    const screenW = 0.24;
    const screenH = 0.14;
    const screenZ = D / 2 + 0.0125;
    const screenY = 0.56;

    // 创建 Canvas 贴图
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    // 背景
    ctx.fillStyle = '#F4F7FB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 标题栏（蓝色）
    ctx.fillStyle = '#2563EB';
    ctx.fillRect(0, 0, canvas.width, 56);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('自动充电桩 CH-03', canvas.width / 2, 28);

    // 电池图标（左侧）
    const batX = 40;
    const batY = 92;
    const batW = 150;
    const batH = 84;

    // 电池外框
    ctx.strokeStyle = '#1D3F72';
    ctx.lineWidth = 6;
    ctx.strokeRect(batX, batY, batW, batH);

    // 电池端子
    ctx.fillStyle = '#1D3F72';
    ctx.fillRect(batX + batW, batY + 42, 12, 36);

    // 电池填充（76%）
    ctx.fillStyle = '#22D3EE';
    ctx.fillRect(batX + 8, batY + 14, batW * 0.76, batH - 28);

    // 大文本 "76%"
    ctx.fillStyle = '#1D3F72';
    ctx.font = 'bold 104px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('76%', 360, 136);

    // 状态文本（底部）
    let statusText = '● 待机';
    let statusClr = '#FB923C';
    if (status === 'run') {
      statusText = '● 充电中';
      statusClr = '#16B364';
    } else if (status === 'fault') {
      statusText = '● 故障';
      statusClr = '#F04438';
    } else if (status === 'maint') {
      statusText = '● 维护';
      statusClr = '#2E90FA';
    }
    ctx.fillStyle = statusClr;
    ctx.font = 'bold 40px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(statusText, 256, 240);

    // 分隔线
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 198);
    ctx.lineTo(472, 198);
    ctx.stroke();

    const screenTex = new THREE.CanvasTexture(canvas);
    screenTex.colorSpace = THREE.SRGBColorSpace;

    const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(screenW, screenH),
      screenMat
    );
    screenMesh.position.set(0, screenY, screenZ);
    group.add(screenMesh);
  }

  // === 3. 状态指示灯（独立 Mesh）===
  {
    const lightW = 0.20;
    const lightH = 0.016;
    const lightZ = D / 2 + 0.011;  // 前于显示屏金属框（D/2+0.007）约 0.004m
    const lightY = 0.68;

    const lightMat = new THREE.MeshStandardMaterial({
      color: statusColor[status],
      emissive: statusColor[status],
      emissiveIntensity: 1.2
    });

    const lightMesh = new THREE.Mesh(
      new THREE.BoxGeometry(lightW, lightH, 0.010),
      lightMat
    );
    lightMesh.position.set(0, lightY, lightZ);
    group.add(lightMesh);

    // 保存引用供动画使用
    group.userData.lightMat = lightMat;
  }

  // === 4. 地面停靠区域（独立 Mesh）===
  {
    const zoneW = 0.9;
    const zoneD = 1.2;
    const zoneCenterZ = D / 2 + 0.65;

    const zoneGeo = new THREE.PlaneGeometry(zoneW, zoneD);
    const zoneMat = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    const zoneCanvas = document.createElement('canvas');
    zoneCanvas.width = 360;
    zoneCanvas.height = 480;
    const zctx = zoneCanvas.getContext('2d');

    // 1. 清空画布（透明背景）
    zctx.clearRect(0, 0, 360, 480);

    // 2. 画黄色完整背景
    zctx.fillStyle = '#F6C343';
    zctx.fillRect(0, 0, 360, 480);

    // 3. 切掉内部区域（留下边框）
    const B = 30;
    zctx.clearRect(B, B, 360 - 2 * B, 480 - 2 * B);

    // 4. 画黑色对角线条纹（只在边界带内）
    zctx.save();
    zctx.beginPath();
    zctx.rect(0, 0, 360, 480);
    zctx.rect(B, B, 360 - 2 * B, 480 - 2 * B);
    zctx.clip('evenodd');

    const stripeHeight = 40;
    for (let k = -480; k < 840; k += stripeHeight * 2) {
      zctx.fillStyle = '#1D2127';
      zctx.beginPath();
      zctx.moveTo(k, 0);
      zctx.lineTo(k + 20, 0);
      zctx.lineTo(k + 20 - 480, 480);
      zctx.lineTo(k - 480, 480);
      zctx.closePath();
      zctx.fill();
    }
    zctx.restore();

    // 5. 中心文字 "AGV 充电位"（移动到 y = 310）
    zctx.fillStyle = '#1D2127';
    zctx.font = 'bold 40px "PingFang SC","Microsoft YaHei",sans-serif';
    zctx.textAlign = 'center';
    zctx.textBaseline = 'middle';
    zctx.fillText('AGV 充电位', 180, 310);

    // 6. 画箭头（指向充电桩，即上方 -Z）
    // 箭头三角形
    const arrowTipY = 120;
    const arrowBaseY = 190;
    const arrowWidth = 70;
    zctx.fillStyle = '#F6C343';
    zctx.strokeStyle = '#1D2127';
    zctx.lineWidth = 2;
    zctx.beginPath();
    zctx.moveTo(180, arrowTipY);
    zctx.lineTo(180 - arrowWidth / 2, arrowBaseY);
    zctx.lineTo(180 + arrowWidth / 2, arrowBaseY);
    zctx.closePath();
    zctx.stroke();
    zctx.fill();

    // 箭杆（带描边）
    zctx.fillStyle = '#F6C343';
    zctx.strokeStyle = '#1D2127';
    zctx.lineWidth = 2;
    zctx.fillRect(180 - 12, arrowBaseY, 24, 50);  // [人工修正] 补回箭杆填充（第3轮被模型删掉）
    zctx.strokeRect(180 - 12, arrowBaseY, 24, 50);

    const zoneTex = new THREE.CanvasTexture(zoneCanvas);
    zoneTex.colorSpace = THREE.SRGBColorSpace;
    zoneTex.anisotropy = 4;
    zoneMat.map = zoneTex;

    const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
    zoneMesh.rotation.x = -Math.PI / 2;
    zoneMesh.position.set(0, 0.003, zoneCenterZ);
    zoneMesh.renderOrder = 0;
    zoneMesh.userData.noPick = true;

    group.add(zoneMesh);
  }

  // === 5. 状态光环 ===
  const ring = statusRing(0.9, D + 0.05 + 1.2);
  ring.position.z = (D + 0.05 + 1.2) / 2 - D / 2;
  group.userData.ring = ring;
  group.add(ring);
  setRingStatus(ring, status);

  // === 6. 动画 ===
  group.userData.animate = (t, dt, st) => {
    if (st !== 'run') {
      if (group.userData.lightMat) {
        group.userData.lightMat.emissiveIntensity = 1.2;
      }
      return;
    }
    // 呼吸灯效果
    if (group.userData.lightMat) {
      group.userData.lightMat.emissiveIntensity = 0.4 + 1.0 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 2.0));
    }
  };

  group.userData.size = { w: W, d: D, h: H };
  return group;
}

