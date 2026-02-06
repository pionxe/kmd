<template>
  <div ref="canvasContainer" class="canvas-container">
    <!-- Pixi 的 Canvas 会被插入到这里 -->
    <div v-if="!isReady" class="loading">Engine Loading...</div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from "vue";
  import { readerApp } from "../core/App";
  // import { effectManager } from "../core/effects/EffectManager";
  // import { layout } from "../core/layout/LayoutEngine";
  import { ScriptPlayer } from "../core/player/ScriptPlayer";
  import { layout } from "../core/layout/LayoutEngine";
  import { stageManager } from "../core/stage/StageManager";

  const canvasContainer = ref<HTMLElement | null>(null);
  const isReady = ref(false);


  onMounted(async () => {
    if (!canvasContainer.value) return;
    await readerApp.init(canvasContainer.value);
    
    // 初始化排版引擎 (挂载到 StageManager 的内容层)
    layout.init(stageManager.contentLayer, 100);
    isReady.value = true;
    
    // 使用升级后的 ScriptPlayer
    const player = new ScriptPlayer(stageManager.contentLayer);
    
    // 1. 从 KMD 文件加载 (也可以直接传字符串)
    await player.load("/test-markdown.kmd");
    
    // 2. 设置模式
    player.setMode("stage"); 
    
    // 3. 开启自动播放
    player.toggleAutoPlay(true);
    
    // 4. 手动控制：按下 'A' 键切换自动播放
    window.addEventListener("keydown", (e) => {
      if (e.key === "a" || e.key === "A") {
        player.toggleAutoPlay();
        console.log("AutoPlay:", player.autoPlay);
      }
    });
    
    console.log("Player initialized. Press SPACE/Enter for next, 'A' to toggle auto.");
  });

  onUnmounted(() => {
    // 组件销毁时的清理逻辑，视需求而定
  });
</script>

<style scoped>
  .canvas-container {
    width: 100%;
    height: 100%; /* 全屏 */
    background: #000;
    overflow: hidden;
    position: relative;
    flex: auto;
  }
  .loading {
    color: white;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
</style>
