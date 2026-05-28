# iFlow-Settings-Editor-GUI dependsOn 支持方案

## 概述
为 iFlow-Settings-Editor-GUI 添加 mod.json 的 `dependsOn` 属性支持，包括：
- 读取和保存 dependsOn 字段
- 启用 MOD 时检查依赖是否已安装
- 删除 MOD 时检查是否有其他 MOD 依赖它

## 需要修改的文件

| 优先级 | 文件 | 修改内容 |
|--------|------|----------|
| P0 | `src/shared/types.ts` | 在 `IflowMod` 接口添加 `dependsOn?: string[]` |
| P0 | `src/main/services/iflowService.js` | 验证 dependsOn 是可选数组 |
| P0 | `src/main/ipc/iflow.js` | 导入时保存 dependsOn 字段 |
| P1 | `src/main/ipc/iflow.js` | 启用 MOD 时检查依赖是否已安装 |
| P1 | `src/main/ipc/iflow.js` | 删除 MOD 时检查是否有依赖 |
| P2 | `src/views/IflowModsView.vue` | 详情页显示依赖列表 |
| P2 | `src/locales/en-US.js` | 添加翻译文本 |

## 修改详情

### 1. src/shared/types.ts
在 `IflowMod` 接口中添加：
```typescript
dependsOn?: string[]  // 依赖的其他 MOD ID
```

### 2. src/main/services/iflowService.js
在 `validateModPackage` 函数中添加验证：
```javascript
// dependsOn 是可选字段
if (metadata.dependsOn !== undefined) {
  if (!Array.isArray(metadata.dependsOn)) {
    return { valid: false, error: t('iflow.errors.invalidDependsOn') }
  }
  if (!metadata.dependsOn.every(item => typeof item === 'string')) {
    return { valid: false, error: t('iflow.errors.invalidDependsOnItems') }
  }
}
```

### 3. src/main/ipc/iflow.js

#### 3.1 导入时保存 dependsOn
在 modRecord 对象构建时添加：
```javascript
dependsOn: metadata.dependsOn || undefined,
```

#### 3.2 启用时检查依赖
在 `iflow:enable-mod` 处理函数中添加：
```javascript
if (enabled && mod.dependsOn && mod.dependsOn.length > 0) {
  const metadata = readModsMetadata()
  const missingDeps = mod.dependsOn.filter(depId => {
    return !metadata.mods.find(m => m.id === depId)
  })
  
  if (missingDeps.length > 0) {
    return errorResult(
      t('iflow.errors.missingDependencies', { deps: missingDeps.join(', ') }),
      'IFLOW_MISSING_DEPENDENCIES'
    )
  }
}
```

#### 3.3 删除时检查依赖
在 `iflow:delete-mod` 处理函数中添加：
```javascript
const dependentMods = metadata.mods.filter(m => 
  m.dependsOn && m.dependsOn.includes(modId) && m.id !== modId
)

if (dependentMods.length > 0) {
  const depNames = dependentMods.map(m => m.name).join(', ')
  return errorResult(
    t('iflow.errors.cannotDeleteDependent', { mods: depNames }),
    'IFLOW_DEPENDENT_MODS_EXIST'
  )
}
```

### 4. src/views/IflowModsView.vue
在详情模态框中添加依赖显示：
```vue
<div class=\"detail-field\">
  <div class=\"detail-field-label\">{{ $t('iflow.mods.detail.dependsOn') }}</div>
  <div class=\"detail-field-value\">
    <template v-if=\"detailMod.dependsOn && detailMod.dependsOn.length\">
      <span class=\"detail-tag\" v-for=\"dep in detailMod.dependsOn\" :key=\"dep\">{{ dep }}</span>
    </template>
    <span v-else class=\"detail-empty\">-</span>
  </div>
</div>
```

### 5. src/locales/en-US.js
添加翻译文本：
```javascript
// detail 部分
detail: {
  // ...
  dependsOn: 'Depends On',
}

// errors 部分
errors: {
  // ...
  invalidDependsOn: 'dependsOn must be an array',
  invalidDependsOnItems: 'dependsOn array must contain only strings',
  missingDependencies: 'Missing dependencies: {deps}. Please install them first.',
  cannotDeleteDependent: 'Cannot delete {mods} - other mods depend on it',
}
```
