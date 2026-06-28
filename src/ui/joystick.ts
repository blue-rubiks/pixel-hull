/**
 * 手機殼上的浮動虛擬搖桿（取代固定底座）。
 * 按下控制區任一點即把底座浮到拇指下（拇指不用找位置），只取「拖曳方向」以固定速度驅動移動
 * （不做力度=速度），好控、不影響難度平衡。
 * 純 DOM 元件，方向向量寫進 joystickVector 供 GameScene.movePlayer 讀取。
 */

/** 正規化方向向量（放開時歸零）；x 右為正、y 下為正，與遊戲座標一致 */
export const joystickVector = { x: 0, y: 0 };

const DEAD_ZONE = 6; // 距按下點的死區（px），避免微小抖動誤觸

export function initJoystick(): void {
  const zone = document.querySelector<HTMLElement>('.joystick');
  const base = zone?.querySelector<HTMLElement>('.joystick-base');
  const knob = base?.querySelector<HTMLElement>('.joystick-knob');
  if (!zone || !base || !knob) return;

  let active = false;
  let originX = 0; // 按下點＝搖桿圓心
  let originY = 0;
  let maxDraw = 0; // 搖桿頭視覺位移上限（底座半徑），按下時依當前尺寸決定

  const update = (clientX: number, clientY: number): void => {
    const dx = clientX - originX;
    const dy = clientY - originY;
    const len = Math.hypot(dx, dy);
    const ux = len > 0 ? dx / len : 0;
    const uy = len > 0 ? dy / len : 0;
    const draw = Math.min(len, maxDraw); // 搖桿頭視覺位移限制在底座內
    knob.style.transform = `translate(${ux * draw}px, ${uy * draw}px)`;
    if (len < DEAD_ZONE) {
      joystickVector.x = 0;
      joystickVector.y = 0;
    } else {
      joystickVector.x = ux;
      joystickVector.y = uy;
    }
  };

  const reset = (): void => {
    active = false;
    base.classList.remove('active');
    base.style.left = ''; // 滑回 CSS 預設停靠位（左側中央）
    base.style.top = '';
    knob.style.transform = 'translate(0, 0)';
    joystickVector.x = 0;
    joystickVector.y = 0;
  };

  zone.addEventListener('pointerdown', (e) => {
    active = true;
    originX = e.clientX;
    originY = e.clientY;
    maxDraw = base.offsetWidth / 2;
    // 底座浮到按下處（相對觸控區的座標）
    const rect = zone.getBoundingClientRect();
    base.style.left = `${e.clientX - rect.left}px`;
    base.style.top = `${e.clientY - rect.top}px`;
    base.classList.add('active');
    zone.setPointerCapture(e.pointerId); // 拖出觸控區也能持續控制
    update(e.clientX, e.clientY);
  });
  zone.addEventListener('pointermove', (e) => {
    if (active) update(e.clientX, e.clientY);
  });
  zone.addEventListener('pointerup', reset);
  zone.addEventListener('pointercancel', reset);
}
