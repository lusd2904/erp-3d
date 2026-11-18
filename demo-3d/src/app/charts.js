// ECharts 浅色主题 'erpLight' 注册与图表辅助
import * as echarts from 'echarts';
const FONT = "'PingFang SC','Microsoft YaHei','Noto Sans CJK SC',sans-serif";
export const PALETTE = ['#2563eb', '#22d3ee', '#16b364', '#fb923c', '#8b5cf6', '#f04438', '#0ea5e9', '#f59e0b'];
echarts.registerTheme('erpLight', {
  color: PALETTE, backgroundColor: 'transparent',
  textStyle: { fontFamily: FONT, color: '#56637a' },
  title: { textStyle: { color: '#1f2a3d', fontFamily: FONT, fontSize: 14 } },
  legend: { textStyle: { color: '#56637a', fontSize: 11 }, itemWidth: 10, itemHeight: 6, icon: 'roundRect' },
  tooltip: { backgroundColor: 'rgba(255,255,255,.96)', borderColor: '#e3e8f0', textStyle: { color: '#1f2a3d', fontSize: 12 }, extraCssText: 'box-shadow:0 4px 16px rgba(31,58,105,.12);border-radius:8px;' },
  categoryAxis: { axisLine: { lineStyle: { color: '#d3dbe7' } }, axisTick: { show: false }, axisLabel: { color: '#8a96a8', fontSize: 10 }, splitLine: { show: false } },
  valueAxis: { axisLine: { show: false }, axisLabel: { color: '#8a96a8', fontSize: 10 }, splitLine: { lineStyle: { color: '#eef1f6', type: 'dashed' } } },
  bar: { itemStyle: { borderRadius: [3, 3, 0, 0] } },
  line: { smooth: true, symbolSize: 5 },
});
export { echarts };
export function chart(el, option) {
  const c = echarts.init(el, 'erpLight', { renderer: 'canvas' });
  c.setOption(option);
  const ro = new ResizeObserver(() => c.resize()); ro.observe(el);
  c.__ro = ro; return c;
}
export function disposeChart(c) { if (!c) return; c.__ro?.disconnect(); c.dispose(); }
export const grad = (a, b) => new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: a }, { offset: 1, color: b }]);
