import { stageManager } from "./StageManager";
import gsap from "gsap";

export const stagePresets = {
  /**
   * 基础位移组件
   */
  "cam.move": (p: any) => {
    const duration = p.duration ?? p.d ?? p[2] ?? 0;
    gsap.killTweensOf(stageManager.camera, "x,y");
    if (duration === 0) {
      stageManager.camera.x = p.x ?? p[0] ?? stageManager.camera.x;
      stageManager.camera.y = p.y ?? p[1] ?? stageManager.camera.y;
      return;
    }
    return gsap.to(stageManager.camera, {
      x: p.x ?? p[0],
      y: p.y ?? p[1],
      duration,
      ease: "power2.inOut",
      overwrite: "auto"
    });
  },

  /**
   * 变焦组件
   */
  "cam.zoom": (p: any) => {
    const duration = p.duration ?? p.d ?? p[1] ?? 0;
    gsap.killTweensOf(stageManager.camera, "zoom");
    if (duration === 0) {
      stageManager.camera.zoom = p.val ?? p[0] ?? stageManager.camera.zoom;
      return;
    }
    return gsap.to(stageManager.camera, {
      zoom: p.val ?? p[0],
      duration,
      ease: "power2.inOut",
      overwrite: "auto"
    });
  },

  /**
   * 旋转组件
   */
  "cam.rotate": (p: any) => {
    const duration = p.duration ?? p.d ?? p[1] ?? 0;
    gsap.killTweensOf(stageManager.camera, "rotation");
    if (duration === 0) {
      stageManager.camera.rotation = p.val ?? p[0] ?? stageManager.camera.rotation;
      return;
    }
    return gsap.to(stageManager.camera, {
      rotation: p.val ?? p[0],
      duration,
      ease: "power2.inOut",
      overwrite: "auto"
    });
  },

  /**
   * 绝对聚焦组件 (桥接逻辑)
   */
  "cam.focus": (p: any) => {
    const absX = p.x ?? p[0];
    const absY = p.y ?? p[1];
    const duration = p.duration ?? p.d ?? p[2] ?? 0;
    
    // 换算为偏移量
    const offX = absX - stageManager.designWidth / 2;
    const offY = absY - stageManager.designHeight / 2;
    
    // 委托给 move 逻辑
    return stagePresets["cam.move"]({ x: offX, y: offY, duration });
  },

  /**
   * 状态重置组件
   */
  "cam.reset": (p: any) => {
    const duration = p.duration ?? p.d ?? p[0] ?? 0;
    stageManager.clearModifiers();
    return Promise.all([
      stagePresets["cam.move"]({ x: 0, y: 0, duration }),
      stagePresets["cam.zoom"]({ val: 1, duration }),
      stagePresets["cam.rotate"]({ val: 0, duration })
    ]);
  },

  /**
   * 震动组件 (Modifier 模式)
   */
  "cam.shake": (p: any) => {
    const strength = p.strength ?? p[0] ?? 5;
    const duration = p.duration ?? p.d ?? p[1] ?? 0.5;
    const state = { s: strength };
    
    stageManager.addModifier("shake", () => ({
      x: (Math.random() - 0.5) * state.s * 2,
      y: (Math.random() - 0.5) * state.s * 2,
    }));

    return gsap.to(state, {
      s: 0, duration, ease: "power2.out",
      onComplete: () => stageManager.removeModifier("shake")
    });
  },

  /**
   * 呼吸感组件 (Modifier 模式)
   */
  "cam.drift": (p: any) => {
    const strength = p.strength ?? p[0] ?? 5;
    const speed = p.speed ?? p[1] ?? 0.001;
    
    if (strength === 0) {
      stageManager.removeModifier("drift");
      return;
    }

    stageManager.addModifier("drift", (time) => ({
      x: Math.sin(time * speed) * strength,
      y: Math.cos(time * speed * 0.8) * strength,
      rotation: Math.sin(time * speed * 0.5) * 0.01
    }));
  },

  /**
   * 流程阻断组件
   */
  "wait": (p: any) => {
    const duration = p.duration ?? p.d ?? p[0] ?? 1;
    return new Promise<void>(resolve => {
      gsap.delayedCall(duration, resolve);
    });
  }
};

export function initStagePresets() {
  Object.entries(stagePresets).forEach(([name, fn]) => {
    stageManager.register(name, fn as any);
  });
}
