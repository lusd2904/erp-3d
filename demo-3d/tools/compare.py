# 并排对比图：python3 tools/compare.py
from PIL import Image, ImageDraw, ImageFont
S = '/workspace/erp-3d/screenshots'
F = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 28)
def pair(a, b, la, lb, out, w=1600):
    A, B = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
    A = A.resize((w, int(A.height * w / A.width))); B = B.resize((w, int(B.height * w / B.width)))
    H = max(A.height, B.height) + 56
    C = Image.new('RGB', (w * 2 + 24, H), (241, 245, 249)); d = ImageDraw.Draw(C)
    d.text((16, 12), la, font=F, fill=(20, 50, 95)); d.text((w + 40, 12), lb, font=F, fill=(20, 50, 95))
    C.paste(A, (0, 56)); C.paste(B, (w + 24, 56)); C.save(out); print(out)
pair(f'{S}/g_01_cockpit.png', f'{S}/ref/ref_00_home.png', '我们：三维驾驶舱（浅色，演示数据）', '参考页：管理驾驶舱（深色）', f'{S}/compare_cockpit_vs_ref.png')
pair(f'{S}/g_06_view_L2.png', f'{S}/ref/ref_1.png', '我们：三维车间 SMT 二线近景', '参考页：3D 工艺监控', f'{S}/compare_workshop_vs_ref.png')
pair(f'{S}/g_04_campus.png', f'{S}/ref/ref_00_home.png', '我们：园区全景（屋面+建筑标签）', '参考页：厂区总览', f'{S}/compare_campus_vs_ref.png')
pair(f'{S}/g_01_cockpit.png', '/workspace/erp-3d/docs/design/驾驶舱.png', '我们：三维驾驶舱实现', '设计稿：驾驶舱.png', f'{S}/compare_cockpit_vs_design.png')
