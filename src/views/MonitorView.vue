<template>
  <div class="view-container monitor-view">
    <div class="tabs">
      <div 
        class="tab" 
        :class="{ active: activeTab === 'audit' }" 
        @click="activeTab = 'audit'"
      >镜头审计</div>
      <div 
        class="tab" 
        :class="{ active: activeTab === 'vars' }" 
        @click="activeTab = 'vars'"
      >实时变量</div>
      <div 
        class="tab" 
        :class="{ active: activeTab === 'layout' }" 
        @click="activeTab = 'layout'"
      >布局审计</div>
    </div>

    <div class="tab-content">
      <div v-if="activeTab === 'audit'" class="audit-log">
        <div v-if="auditLog.length === 0" class="empty">等待播放...</div>
        <div v-for="(item, idx) in auditLog" :key="idx" class="log-item">
          <span class="time">{{ item.time }}</span>
          <span class="effect">{{ item.effect }}</span>
          <div class="params">{{ JSON.stringify(item.params) }}</div>
        </div>
      </div>
      
      <div v-if="activeTab === 'vars'" class="vars-list">
        <div v-if="Object.keys(markers).length === 0" class="empty">无变量数据</div>
        <div v-for="(val, key) in markers" :key="key" class="var-item">
          <span class="var-key">{{ key }}</span>
          <span class="var-val">{{ val.x.toFixed(1) }}, {{ val.y.toFixed(1) }}</span>
        </div>
      </div>

      <div v-if="activeTab === 'layout'" class="layout-audit">
        <div v-if="store.layoutAuditLog.length === 0" class="empty">暂无布局变更记录</div>
        <div v-for="(log, idx) in store.layoutAuditLog" :key="idx" class="log-item" :class="log.action">
          <div class="log-header">
            <span class="time">{{ log.time }}</span>
            <span class="action">{{ log.action }}</span>
          </div>
          <div class="log-details">
            <div v-if="log.actualSizes" class="sizes-info">
              ID: {{ log.nodeId }} | 实际比例: {{ (log.actualSizes as number[]).map(s => s.toFixed(1) + '%').join(' : ') }}
            </div>
            <div v-else class="tree-diff">
              <details>
                <summary>查看树快照</summary>
                <pre>{{ JSON.stringify(log.after, null, 2) }}</pre>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { stageManager } from '../core/stage/StageManager';
import { layout } from '../core/layout/LayoutEngine';
import { useEditorStore } from '../store/editorStore';

const store = useEditorStore();
const activeTab = ref('audit');
const auditLog = ref<any[]>([]);
const markers = ref<any>({});

let timer: any = null;

onMounted(() => {
  timer = setInterval(() => {
    auditLog.value = [...stageManager.camAuditLog].reverse().slice(0, 50);
    // 浅拷贝 markers 对象
    const currentMarkers: any = {};
    layout.globalMarkers.forEach((v, k) => {
      currentMarkers[k] = v;
    });
    markers.value = currentMarkers;
  }, 500);
});

onUnmounted(() => {
  clearInterval(timer);
});
</script>

<style scoped>
.monitor-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-sidebar);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
}

.tabs {
  display: flex;
  background: var(--bg-header);
  border-bottom: 1px solid var(--border-dark);
}

.tab {
  padding: 6px 15px;
  cursor: pointer;
  color: var(--text-dim);
  border-right: 1px solid var(--border-dark);
}

.tab:hover {
  background: var(--bg-active);
}

.tab.active {
  background: var(--bg-editor);
  color: var(--accent-primary);
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.empty {
  color: var(--text-dim);
  font-style: italic;
  text-align: center;
  margin-top: 20px;
}

.log-item {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-main);
}

.time { color: var(--accent-secondary); margin-right: 8px; }
.effect, .action { color: #dcdcaa; font-weight: bold; }
.params { color: #ce9178; font-size: 10px; margin-top: 2px; }

.REALTIME_RESIZE {
  opacity: 0.6;
  font-size: 9px;
  border-bottom: none !important;
  margin-bottom: 2px !important;
  padding-bottom: 0 !important;
}

.REALTIME_RESIZE .action {
  color: var(--text-dim);
  font-weight: normal;
}

.sizes-info {
  color: #b5cea8;
  padding-left: 10px;
}

.layout-audit pre {
  background: var(--border-dark);
  padding: 8px;
  border-radius: 4px;
  color: #9cdcfe;
  font-size: 10px;
  max-height: 200px;
  overflow: auto;
}

.tree-diff summary {
  cursor: pointer;
  color: var(--text-dim);
  margin-top: 4px;
}

.var-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.var-key { color: #9cdcfe; }
.var-val { color: #b5cea8; }
</style>
