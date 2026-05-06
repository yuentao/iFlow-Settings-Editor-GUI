# iFlow Mod 管理格式修改说明

## 修改日期
2026-05-06

## 修改内容

### 1. 导出格式调整
- **修改前**：导出的文件名为 `{mod-name}-v{version}.iflow-mod.zip`
- **修改后**：导出的文件名为 `{mod-name}-v{version}.iflow-mod`
- **说明**：移除 `.zip` 扩展名，直接使用 `.iflow-mod` 作为文件扩展名，但内部仍使用 ZIP 格式压缩

### 2. 导入格式兼容性
- **修改前**：仅支持 `.iflow-mod` 格式
- **修改后**：同时支持 `.zip` 和 `.iflow-mod` 两种格式
- **说明**：向后兼容，用户可以使用旧版 ZIP 包或新版 .iflow-mod 包导入

### 3. 具体修改位置

#### 3.1 导入验证规则
- 文件过滤器更新为 `.zip, .iflow-mod`
- 导入对话框的文件输入框 accept 属性更新为 `.zip,.iflow-mod`

#### 3.2 导出文件名生成
- 文件名生成规则从 `{mod-name}-v{version}.iflow-mod.zip` 改为 `{mod-name}-v{version}.iflow-mod`
- 文件名预览组件添加 `fileName` 计算属性，自动生成符合规范的文件名
- 特殊字符处理：将空格、中文等替换为连字符，确保文件名安全

#### 3.3 UI 交互更新
- 导入对话框的文件选择对话框标题从"选择 Mod ZIP 文件"改为"选择 Mod 文件"
- 文件过滤器从 `[{ name: 'ZIP', extensions: ['zip'] }]` 改为 `[{ name: 'ZIP & iFlow Mod', extensions: ['zip', 'iflow-mod'] }]`

#### 3.4 文档更新
- Phase 1 验证步骤：添加"导入 Mod 包（.zip 或 .iflow-mod 格式）"
- Phase 2 文档说明：添加"说明支持 .zip 和 .iflow-mod 两种导入格式"
- 验收标准第3条：明确导出为标准化 `.iflow-mod` 文件

## 技术实现说明

### 导出流程
1. 读取 Mod 配置和文件
2. 创建 ZIP 压缩包
3. 生成文件名：`{mod-name}-v{version}.iflow-mod`
4. 弹出"另存为"对话框
5. 写入 ZIP 文件（内部仍为 ZIP 格式，只是扩展名改为 .iflow-mod）

### 导入流程
1. 使用 `adm-zip` 库解压文件（自动识别 .zip 和 .iflow-mod 格式）
2. 验证 mod.json 和主体文件
3. 移动文件到 `~/.iflow/mods/iflow/{mod-id}/`
4. 更新 `mods.json` 中的 Mod 元数据

### 向后兼容性
- 导入时自动识别文件格式（通过文件扩展名判断）
- 如果扩展名为 `.zip`，直接解压
- 如果扩展名为 `.iflow-mod`，也直接解压（内部仍是 ZIP 格式）
- 用户可以自由切换使用旧版 ZIP 包或新版 .iflow-mod 包

## 优势

1. **格式统一**：导出格式更简洁，只使用 `.iflow-mod` 扩展名
2. **向后兼容**：支持旧的 ZIP 格式导入，不影响现有用户
3. **用户友好**：文件名更直观，不包含冗余的 `.zip` 扩展名
4. **扩展性强**：未来可以扩展 .iflow-mod 格式支持更多特性（如签名、版本元数据等）

## 注意事项

1. 导出的 `.iflow-mod` 文件内部仍然是 ZIP 格式，只是扩展名不同
2. 导入时通过扩展名自动识别格式，无需用户手动选择
3. 文件名中的特殊字符会被替换为连字符，确保文件系统兼容性
4. Mod 包总大小限制仍为 50MB
