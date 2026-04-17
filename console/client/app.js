const operatorInput = document.getElementById('operatorInput');
const roleInput = document.getElementById('roleInput');
const accessForm = document.getElementById('accessForm');
const app = document.getElementById('app');
const pageTitle = document.getElementById('pageTitle');
const identityMeta = document.getElementById('identityMeta');
const sidebarToggle = document.getElementById('sidebarToggle');
const shell = document.querySelector('.shell');

const STORAGE_KEY = 'acdp_console_access';
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'acdp_console_sidebar_collapsed';
const NAV_GROUP_STATE_STORAGE_KEY = 'acdp_console_nav_groups';
const RUNTIME_AUTO_REFRESH_STORAGE_KEY = 'acdp_runtime_auto_refresh';
const RUNTIME_NODES_REFRESH_INTERVAL_MS = 5000;
const ACCESS_META_CACHE_TTL_MS = 60000;
const ROUTE_RENDER_CACHE_TTL_MS = 45000;
const ROUTE_RENDER_CACHE_MAX = 24;
const DEFAULT_OVERVIEW_SIMULATION_TEXT = '我想咨询旗顺路和工商认定的办理材料。';
const DEFAULT_OVERVIEW_SIMULATION_TRAFFIC_KEY = 'console-demo-001';
const STRUCTURED_TERM_IMPORT_TEMPLATE_CODE = 'structured_terms_csv_v2';

const TERM_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'pending_review', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'disabled', label: '已停用' },
];

const REVIEW_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
];

const REVIEW_TARGET_OPTIONS = [
  { value: '', label: '全部目标类型' },
  { value: 'term', label: '词条' },
  { value: 'release', label: '版本发布' },
  { value: 'pinyin_candidate', label: '拼音候选' },
];

const RISK_OPTIONS = [
  { value: 'low', label: '低风险（low）' },
  { value: 'medium', label: '中风险（medium）' },
  { value: 'high', label: '高风险（high）' },
];

const REPLACE_MODE_OPTIONS = [
  { value: 'replace', label: '直接替换（replace）' },
  { value: 'candidate', label: '只出候选（candidate）' },
  { value: 'block', label: '阻断（block）' },
];

const PINYIN_MODE_OPTIONS = [
  { value: 'off', label: '关闭（off）' },
  { value: 'candidate', label: '候选模式（candidate）' },
  { value: 'replace', label: '直接替换（replace）' },
];

const SOURCE_TYPE_OPTIONS = [
  { value: 'manual', label: '人工录入（manual）' },
  { value: 'demo_seed', label: '演示种子（demo_seed）' },
  { value: 'import_csv', label: '结构化导入（import_csv）' },
  { value: 'import_alias', label: '错误词补录（import_alias）' },
  { value: 'raw_roads', label: '原始路名（raw_roads）' },
  { value: 'raw_government', label: '原始政府数据（raw_government）' },
  { value: 'qa_feedback', label: 'QA 反馈（qa_feedback）' },
  { value: 'online_feedback', label: '线上反馈（online_feedback）' },
  { value: 'cg3', label: 'CG3 回流（cg3）' },
  { value: 'validation_import', label: '样本导入（validation_import）' },
];

const SOURCE_FILTER_OPTIONS = [
  { value: '', label: '全部来源' },
  ...SOURCE_TYPE_OPTIONS,
];

const TERM_SORT_OPTIONS = [
  { value: 'updated_at:desc', label: '最近更新优先' },
  { value: 'priority:desc', label: '优先级高到低' },
  { value: 'priority:asc', label: '优先级低到高' },
  { value: 'canonical_text:asc', label: '标准词 A-Z / 拼音顺序' },
  { value: 'created_at:desc', label: '最近创建优先' },
];

const IMPORT_STATUS_OPTIONS = [
  { value: '', label: '全部批次状态' },
  { value: 'preview_ready', label: '待确认导入' },
  { value: 'imported', label: '已导入' },
  { value: 'cancelled', label: '已取消' },
];

const RELEASE_STATUS_OPTIONS = [
  { value: '', label: '全部发布状态' },
  { value: 'built', label: '已构建' },
  { value: 'canary', label: '灰度中' },
  { value: 'published', label: '已发布' },
];

const RUNTIME_NODE_STATUS_OPTIONS = [
  { value: '', label: '全部节点状态' },
  { value: 'not_registered', label: '未注册' },
  { value: 'online', label: '在线' },
  { value: 'offline', label: '离线' },
  { value: 'unknown', label: '未知' },
];

const ENABLED_FILTER_OPTIONS = [
  { value: '', label: '全部启用状态' },
  { value: 'true', label: '仅启用' },
  { value: 'false', label: '仅停用' },
];

const IMPORT_ROW_STATUS_OPTIONS = [
  { value: '', label: '全部预览状态' },
  { value: 'ready', label: '可直接导入' },
  { value: 'warning', label: '需人工确认' },
  { value: 'error', label: '错误行' },
  { value: 'imported', label: '已导入' },
];

const IMPORT_ROW_DECISION_OPTIONS = [
  { value: '', label: '全部处理决策' },
  { value: 'accept', label: '直接接收（accept）' },
  { value: 'merge_existing', label: '合并已有词条（merge_existing）' },
  { value: 'pending', label: '待人工确认（pending）' },
];

const VALIDATION_IMPORT_MODE_OPTIONS = [
  { value: 'upsert', label: '更新或新增（upsert）' },
  { value: 'insert_only', label: '仅新增，不覆盖已有（insert_only）' },
];

const VALIDATION_IMPORT_TEMPLATE_CODE = 'validation_cases_csv_v1';

const TERM_BULK_ACTION_OPTIONS = [
  { value: 'submit-review', label: '批量提交审核' },
  { value: 'disable', label: '批量停用词条' },
];

const VALIDATION_BULK_ACTION_OPTIONS = [
  { value: 'disable', label: '批量停用样本' },
];

const REVIEW_BULK_ACTION_OPTIONS = [
  { value: 'approve', label: '批量审核通过' },
  { value: 'reject', label: '批量驳回' },
];

const BULK_SCOPE_OPTIONS = [
  { value: 'current_page', label: '当前页勾选' },
  { value: 'current_filter', label: '当前筛选结果' },
];

const DISPLAY_LABELS = {
  draft: '草稿',
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  disabled: '已停用',
  preview_ready: '待确认导入',
  imported: '已导入',
  cancelled: '已取消',
  built: '已构建',
  published: '已发布',
  canary: '灰度中',
  online: '在线',
  offline: '离线',
  unknown: '未知',
  heartbeat_ok: '心跳正常',
  heartbeat_timeout: '心跳超时',
  not_registered: '未注册',
  unregistered_runtime: '未备案',
  success: '成功',
  failed: '失败',
  rolled_back: '已回滚',
  blocked: '阻塞',
  stable: '正式版本',
  not_published: '未发布',
  not_submitted: '未提交',
  partially_approved: '部分通过',
  ready: '可直接导入',
  warning: '需人工确认',
  error: '错误',
  enabled: '启用',
  manual: '人工录入',
  import_csv: '结构化导入',
  import_alias: '错误词补录',
  raw_roads: '原始路名',
  raw_government: '原始政府数据',
  qa_feedback: 'QA 反馈',
  online_feedback: '线上反馈',
  validation_import: '样本导入',
  cg3: 'CG3 回流',
  proper_noun: '常用词',
  gov_term: '政府部门',
  poi_road: '路名',
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  raw_roads_text_v1: '原始路名文本模板',
  gov_departments_csv_v1: '政府部门结构化模板',
  structured_terms_csv_v1: '结构化词条模板',
  structured_terms_csv_v2: '统一结构化词条模板',
  term_aliases_csv_v1: '错误词批量补录模板',
  validation_cases_csv_v1: '验证样本批量导入模板',
  gov_departments: '政府部门导入',
  structured_terms: '结构化词条导入',
  term_aliases: '错误词批量补录',
  validation_cases: '验证样本导入',
  term_review: '词条审核',
  release_publish_review: '发布审核',
  pinyin_candidate_review: '拼音候选审核',
  term: '词条',
  release: '版本发布',
  pinyin_candidate: '拼音候选',
  healthy: '正常',
  recovered: '已恢复',
  release_term_status_invalid: '词条状态不满足发布条件',
  pending_term_review: '存在待审核词条',
  pending_pinyin_candidate_review: '存在待审核拼音候选',
  release_validation_smoke_failed: '词条冒烟验证失败',
  release_validation_business_sample_failed: '业务样本验证失败',
  release_snapshot_missing: '版本快照缺失',
  release_snapshot_load_failed: '版本快照加载失败',
  term_smoke: '词条冒烟验证',
  business_sample: '业务样本验证',
  expected_canonical_not_detected_in_business_sample: '业务样本未命中期望标准词',
  term_not_detected_in_smoke_simulation: '词条冒烟验证未命中目标词条',
  no_noncanonical_smoke_sample_available: '当前词条缺少可用的冒烟样本',
  gray_enabled: '灰度生效中',
  gray_enabled_other: '灰度生效中',
  gray_closed: '灰度已关闭',
  no_gray: '当前无灰度',
};

const CONSOLE_ERROR_MESSAGES = {
  permission_denied: '当前身份没有执行该操作的权限，请切换角色或用户后重试。',
  release_review_submitter_conflict: '当前发布审核要求提交人与审核人为不同操作人，请切换顶部当前身份后再审核通过。',
  release_review_duplicate_reviewer: '当前发布审核需要由不同审核人分别通过，请切换其他审核人后再继续。',
  release_review_required: '当前版本还未满足发布审核要求，请先完成发布审核。',
  release_gate_blocked: '当前版本仍有版本校验阻断项，请先进入版本详情查看阻断原因和验证结果。',
  release_separation_required: '发布人与审核人必须分离，请切换为非审核人的身份后再正式发布。',
  release_review_already_satisfied: '当前版本所需审批已满足，无需重复提交发布审核。',
  release_status_invalid: '当前版本状态不允许执行该操作，请刷新页面确认状态后重试。',
  runtime_not_ready: '运行时当前还未就绪，请先确认目标版本已下发并完成本地切换。',
  missing_text: '请输入需要模拟或纠错的文本。',
  template_not_found: '未找到对应导入模板，请刷新页面后重试。',
  missing_file_content: '缺少导入文件内容，请重新选择文件后重试。',
  invalid_file_extension: '文件类型不符合模板要求，请使用正确的模板文件。',
  import_job_not_found: '未找到对应导入批次，可能已失效或被清理。',
  import_job_status_invalid: '当前导入批次状态不允许执行该操作，请刷新页面确认状态后重试。',
  term_review_status_invalid: '当前词条状态不允许提交审核，请先刷新页面确认状态后重试。',
  term_review_already_satisfied: '当前词条已审核通过，且通过后没有新改动，无需重复提交审核。',
  validation_case_exists: '样本 ID 已存在，请改用新的样本 ID 或切换到更新导入。',
  invalid_validation_case: '样本内容不完整或格式不正确，请检查文本与期望标准词后重试。',
  pinyin_candidate_not_found: '未找到对应拼音候选，请重新生成候选后再提交。',
  pinyin_candidate_review_already_satisfied: '当前拼音候选已审核通过，无需重复提交审核。',
  runtime_verify_target_mode_invalid: '当前验证页面暂只支持 cluster_current 口径，指定节点与灰度对比后续再开放。',
  runtime_control_release_not_found: '未找到对应目标版本，请刷新页面确认后重试。',
  runtime_control_node_not_found: '未找到对应运行节点，请刷新页面后重试。',
  'runtime control evidence not found': '未找到对应的运行验证证据，请返回版本详情刷新后重试。',
  access_control_user_id_required: '用户 ID 不能为空，请补齐后再保存。',
  access_control_user_roles_required: '请至少为当前用户选择一个角色。',
  access_control_role_id_required: '角色 ID 不能为空，请补齐后再保存。',
  access_control_role_permissions_required: '请至少为当前角色分配一个权限。',
  business_property_value_required: '业务属性编码不能为空，请补齐后再保存。',
  business_property_not_found: '未找到对应业务属性，请刷新页面后重试。',
  review_batch_scope_invalid: '当前批量审核范围不受支持，请刷新页面后重试。',
  review_batch_task_ids_required: '请先勾选至少一个词条审核任务。',
  review_batch_import_job_id_required: '缺少导入批次上下文，请从导入详情重新进入本批审核页面。',
};

let flashState = null;
const FORM_SUBMITTING_TEXT = '处理中...';
let currentAccessMeta = null;
let currentAccessMetaFetchedAt = 0;
let currentAccessMetaCacheKey = '';
let routeRefreshTimer = null;
const routeRenderCache = new Map();
let currentKnownUsers = [];
let currentRoleDefinitions = [];
let currentPermissionDefinitions = [];
let preferredAccessContext = {
  operator: 'console_user',
  role: 'dict_admin',
};
let overviewSimulationState = {
  text: DEFAULT_OVERVIEW_SIMULATION_TEXT,
  trafficKey: DEFAULT_OVERVIEW_SIMULATION_TRAFFIC_KEY,
  lastResult: null,
  lastError: '',
  updatedAt: '',
};
let runtimeVerifyState = {
  text: DEFAULT_OVERVIEW_SIMULATION_TEXT,
  trafficKey: DEFAULT_OVERVIEW_SIMULATION_TRAFFIC_KEY,
  lastCorrectResult: null,
  lastCorrectCandResult: null,
  lastError: '',
  updatedAt: '',
};
let businessPropertiesMeta = {
  items: [],
  fetchedAt: 0,
};
let businessPropertyDefinitionsMeta = {
  items: [],
  configPath: '',
  fetchedAt: 0,
};
let sourceTypeDefinitionsMeta = {
  items: [],
  configPath: '',
  fetchedAt: 0,
};
const sourceTypeMetaCache = new Map();
let runtimeNodeDeploymentGuideMeta = {
  nodeId: '',
  adminBaseUrl: '',
  runtimeTokenConfigured: false,
  runtimeTokenValue: '',
  note: '',
  fetchedAt: 0,
};
let accessControlMeta = {
  users: [],
  roles: [],
  permissions: [],
  configPath: '',
  fetchedAt: 0,
};
let governancePoliciesMeta = {
  releasePolicies: {},
  configPath: '',
  fetchedAt: 0,
};
const CONSOLE_DIAGNOSTIC_LIMIT = 120;

/**
 * 功能：把任意诊断值转换为可记录文本。
 * 输入：任意值。
 * 输出：适合写入诊断日志的字符串。
 */
function diagnosticText(value) {
  if (value instanceof Error) {
    return value.message || value.name || 'Error';
  }
  if (value && typeof value === 'object' && typeof value.message === 'string') {
    return value.message || 'Error';
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * 功能：读取或初始化当前控制台的前端诊断对象。
 * 输入：无。
 * 输出：包含 `routeLoads/startupErrors/consoleErrors` 的诊断对象。
 */
function consoleDiagnosticsState() {
  if (!window.__acdpConsoleDiagnostics || typeof window.__acdpConsoleDiagnostics !== 'object') {
    window.__acdpConsoleDiagnostics = {
      routeLoads: [],
      startupErrors: [],
      consoleErrors: [],
      lastUpdatedAt: '',
    };
  }
  return window.__acdpConsoleDiagnostics;
}

/**
 * 功能：向指定诊断列表追加一条记录，并限制保留数量。
 * 输入：列表键和记录对象。
 * 输出：更新后的诊断对象。
 */
function appendConsoleDiagnostic(listKey, entry) {
  const state = consoleDiagnosticsState();
  const nextList = Array.isArray(state[listKey]) ? [...state[listKey]] : [];
  nextList.push(entry);
  if (nextList.length > CONSOLE_DIAGNOSTIC_LIMIT) {
    nextList.splice(0, nextList.length - CONSOLE_DIAGNOSTIC_LIMIT);
  }
  state[listKey] = nextList;
  state.lastUpdatedAt = new Date().toISOString();
  window.__acdpConsoleDiagnostics = state;
  return state;
}

/**
 * 功能：记录当前路由的渲染结果与耗时。
 * 输入：控制台路径和附加信息对象。
 * 输出：无显式返回。
 */
function recordRouteLoadMetric(pathname, payload = {}) {
  appendConsoleDiagnostic('routeLoads', {
    at: new Date().toISOString(),
    path: String(pathname || '/'),
    ...payload,
  });
}

/**
 * 功能：安装控制台前端诊断采集，包括启动异常和 `console.error` 留档。
 * 输入：无。
 * 输出：无显式返回。
 */
function installConsoleDiagnostics() {
  if (window.__acdpConsoleDiagnosticsInstalled === true) {
    return;
  }
  window.__acdpConsoleDiagnosticsInstalled = true;
  consoleDiagnosticsState();

  const originalConsoleError = typeof console.error === 'function'
    ? console.error.bind(console)
    : null;
  if (originalConsoleError) {
    console.error = (...args) => {
      appendConsoleDiagnostic('consoleErrors', {
        at: new Date().toISOString(),
        messages: args.map((item) => diagnosticText(item)),
      });
      return originalConsoleError(...args);
    };
  }

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('error', (event) => {
      appendConsoleDiagnostic('startupErrors', {
        at: new Date().toISOString(),
        type: 'error',
        message: diagnosticText(event && event.message),
        filename: String((event && event.filename) || ''),
        lineno: Number((event && event.lineno) || 0),
        colno: Number((event && event.colno) || 0),
      });
    });
    window.addEventListener('unhandledrejection', (event) => {
      appendConsoleDiagnostic('startupErrors', {
        at: new Date().toISOString(),
        type: 'unhandledrejection',
        message: diagnosticText(event && event.reason),
      });
    });
  }
}

/**
 * 功能：向测试环境暴露控制台前端诊断相关钩子。
 * 输入：无。
 * 输出：无显式返回。
 */
function publishConsoleTestHooks() {
  if (typeof window !== 'object' || !window) {
    return;
  }
  window.__acdpConsoleTestHooks = {
    consoleDiagnosticsState,
    appendConsoleDiagnostic,
    recordRouteLoadMetric,
    installConsoleDiagnostics,
  };
}

/**
 * 功能：从本地缓存恢复控制台访问身份。
 * 输入：无。
 * 输出：无显式返回；会回填顶部身份表单。
 */
function loadAccessContext() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    preferredAccessContext = {
      operator: String(stored.operator || 'console_user'),
      role: String(stored.role || 'dict_admin'),
    };
    operatorInput.innerHTML = `<option value="${escapeHtml(preferredAccessContext.operator)}">${escapeHtml(preferredAccessContext.operator)}（${escapeHtml(preferredAccessContext.operator)}）</option>`;
    operatorInput.value = preferredAccessContext.operator;
    roleInput.value = preferredAccessContext.role;
  } catch {}
}

/**
 * 功能：把当前访问身份写入本地缓存。
 * 输入：无。
 * 输出：无显式返回。
 */
function saveAccessContext() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    operator: operatorInput.value || 'console_user',
    role: roleInput.value || 'dict_admin',
  }));
}

/**
 * 功能：读取左侧导航分组的本地展开状态。
 * 输入：无。
 * 输出：`groupKey -> open` 的对象。
 */
function loadNavGroupState() {
  try {
    return JSON.parse(localStorage.getItem(NAV_GROUP_STATE_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * 功能：持久化左侧导航分组的展开状态。
 * 输入：状态对象。
 * 输出：无显式返回。
 */
function saveNavGroupState(state = {}) {
  localStorage.setItem(NAV_GROUP_STATE_STORAGE_KEY, JSON.stringify(state));
}

/**
 * 功能：应用左侧导航整体折叠状态。
 * 输入：是否折叠。
 * 输出：无显式返回。
 */
function applySidebarCollapsed(collapsed) {
  if (!shell) {
    return;
  }
  shell.classList.toggle('sidebar-collapsed', collapsed === true);
  if (sidebarToggle) {
    sidebarToggle.textContent = collapsed === true ? '展开' : '收起';
  }
}

/**
 * 功能：从本地缓存恢复左侧导航的整体与分组展开状态。
 * 输入：无。
 * 输出：无显式返回。
 */
function loadSidebarState() {
  const collapsed = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1';
  applySidebarCollapsed(collapsed);
  const groupState = loadNavGroupState();
  document.querySelectorAll('#mainNav [data-nav-group]').forEach((group) => {
    const key = group.getAttribute('data-nav-group');
    if (Object.prototype.hasOwnProperty.call(groupState, key)) {
      group.open = groupState[key] === true;
    }
  });
}

/**
 * 功能：绑定左侧导航的折叠与分组展开事件。
 * 输入：无。
 * 输出：无显式返回。
 */
function bindSidebarTreeEvents() {
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      const collapsed = !shell.classList.contains('sidebar-collapsed');
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
      applySidebarCollapsed(collapsed);
    });
  }
  document.querySelectorAll('#mainNav [data-nav-group]').forEach((group) => {
    group.addEventListener('toggle', () => {
      const current = loadNavGroupState();
      current[group.getAttribute('data-nav-group')] = group.open === true;
      saveNavGroupState(current);
    });
  });
}

/**
 * 功能：为控制台请求拼装统一鉴权请求头。
 * 输入：可选扩展请求头对象。
 * 输出：包含操作人与角色的请求头对象。
 */
function requestHeaders(extra = {}) {
  return {
    'x-user-id': operatorInput.value || 'console_user',
    'x-operator': operatorInput.value || 'console_user',
    'x-role': roleInput.value || 'dict_admin',
    ...extra,
  };
}

/**
 * 功能：根据用户 ID 查找当前已知试用用户。
 * 输入：用户 ID 字符串。
 * 输出：匹配到的已知用户对象；不存在时返回 `null`。
 */
function findKnownUser(userId = '') {
  return currentKnownUsers.find((item) => String(item.userId || '') === String(userId || '')) || null;
}

/**
 * 功能：根据角色编码查找当前权限元数据中的角色定义。
 * 输入：角色编码。
 * 输出：角色定义对象；未命中时返回 `null`。
 */
function findRoleDefinition(roleId = '') {
  return currentRoleDefinitions.find((item) => String(item.roleId || '') === String(roleId || '')) || null;
}

/**
 * 功能：把角色定义转换为顶部身份切换可消费的选项数组。
 * 输入：角色编码数组。
 * 输出：角色选项数组。
 */
function roleOptionsForIds(roleIds = []) {
  const normalizedIds = Array.isArray(roleIds) && roleIds.length
    ? roleIds
    : currentRoleDefinitions.map((item) => item.roleId);
  return normalizedIds
    .map((roleId) => {
      const definition = findRoleDefinition(roleId);
      return {
        value: roleId,
        label: definition && definition.displayName ? definition.displayName : roleId,
      };
    })
    .filter((item, index, items) => item.value && items.findIndex((candidate) => candidate.value === item.value) === index);
}

/**
 * 功能：同步`role options`相关逻辑。
 * 输入：`availableRoles`（调用参数）、`currentRole`（当前角色）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function syncRoleOptions(availableRoles = [], currentRole = '') {
  const allowed = roleOptionsForIds(availableRoles);
  roleInput.innerHTML = allowed.map((item) => `
    <option value="${escapeHtml(item.value)}" ${item.value === currentRole ? 'selected' : ''}>${escapeHtml(item.label)}（${escapeHtml(item.value)}）</option>
  `).join('');
  if (currentRole && allowed.some((item) => item.value === currentRole)) {
    roleInput.value = currentRole;
  }
}

/**
 * 功能：根据当前选中的试用用户刷新角色下拉框。
 * 输入：可选首选角色编码。
 * 输出：无显式返回。
 */
function syncRoleOptionsForSelectedUser(preferredRole = '') {
  const user = findKnownUser(operatorInput.value);
  const availableRoles = user && Array.isArray(user.assignedRoles) && user.assignedRoles.length
    ? user.assignedRoles
    : currentRoleDefinitions.map((item) => item.roleId);
  const nextRole = availableRoles.includes(preferredRole)
    ? preferredRole
    : (user && user.defaultRole ? user.defaultRole : availableRoles[0] || 'dict_admin');
  roleInput.disabled = availableRoles.length <= 1;
  syncRoleOptions(availableRoles, nextRole);
}

/**
 * 功能：同步顶部“当前用户”选择框，并按所选用户联动角色列表。
 * 输入：已知用户数组、可选首选用户 ID、可选首选角色编码。
 * 输出：无显式返回。
 */
function syncKnownUsers(users = [], preferredOperator = '', preferredRole = '') {
  currentKnownUsers = Array.isArray(users) ? users : [];
  const fallbackUsers = currentKnownUsers.length
    ? currentKnownUsers
    : [{
      userId: 'console_user',
      displayName: '控制台试用用户',
      defaultRole: 'dict_admin',
      assignedRoles: ['dict_admin'],
    }];
  const selectedUser = fallbackUsers.find((item) => item.userId === preferredOperator)
    || fallbackUsers.find((item) => item.userId === preferredAccessContext.operator)
    || fallbackUsers.find((item) => item.userId === 'console_user')
    || fallbackUsers[0];
  operatorInput.innerHTML = fallbackUsers.map((item) => `
    <option value="${escapeHtml(item.userId)}">${escapeHtml(item.displayName || item.userId)}（${escapeHtml(item.userId)}）</option>
  `).join('');
  operatorInput.value = selectedUser.userId;
  syncRoleOptionsForSelectedUser(preferredRole || preferredAccessContext.role || selectedUser.defaultRole || 'dict_admin');
}

/**
 * 功能：应用`page access`相关逻辑。
 * 输入：无。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function applyPageAccess() {
  const access = currentAccessMeta && currentAccessMeta.pageAccess ? currentAccessMeta.pageAccess : {};
  document.querySelectorAll('#mainNav a').forEach((anchor) => {
    const key = anchor.getAttribute('data-nav');
    const pageKey = pageKeyForPath(String(key || '').split('?')[0] || '/');
    anchor.style.display = access[pageKey] ? '' : 'none';
  });
  document.querySelectorAll('#mainNav [data-nav-group]').forEach((group) => {
    const visibleChildren = Array.from(group.querySelectorAll('a')).some((anchor) => anchor.style.display !== 'none');
    group.style.display = visibleChildren ? '' : 'none';
  });
}

/**
 * 功能：刷新`access meta`相关逻辑。
 * 输入：无。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function refreshAccessMeta() {
  const cacheKey = `${operatorInput.value || 'console_user'}::${roleInput.value || 'dict_admin'}`;
  if (
    currentAccessMeta
    && currentAccessMetaCacheKey === cacheKey
    && Date.now() - currentAccessMetaFetchedAt < ACCESS_META_CACHE_TTL_MS
  ) {
    applyPageAccess();
    return currentAccessMeta;
  }
  const data = await fetchJson('/api/admin/me');
  currentAccessMeta = data;
  currentAccessMetaFetchedAt = Date.now();
  currentAccessMetaCacheKey = cacheKey;
  preferredAccessContext = {
    operator: String(data.userId || operatorInput.value || 'console_user'),
    role: String(data.role || roleInput.value || 'dict_admin'),
  };
  currentRoleDefinitions = Array.isArray(data.roleDefinitions) ? data.roleDefinitions : [];
  currentPermissionDefinitions = Array.isArray(data.permissionDefinitions) ? data.permissionDefinitions : [];
  syncKnownUsers(data.knownUsers || [], preferredAccessContext.operator, preferredAccessContext.role);
  if (identityMeta) {
    identityMeta.textContent = `${data.userDisplayName || data.userId || '未识别用户'} / ${roleLabel(data.role, data.role || '未分配角色')}`;
  }
  applyPageAccess();
  return data;
}

/**
 * 功能：强制刷新当前身份信息缓存。
 * 输入：无。
 * 输出：最新身份信息对象。
 */
async function forceRefreshAccessMeta() {
  currentAccessMetaFetchedAt = 0;
  currentAccessMetaCacheKey = '';
  return refreshAccessMeta();
}

/**
 * 功能：读取控制台当前启用的业务属性配置，并做短时缓存。
 * 输入：可选 `force`，为 `true` 时强制重新拉取。
 * 输出：包含业务属性数组的对象。
 */
async function refreshBusinessPropertiesMeta(force = false) {
  if (
    !force
    && Array.isArray(businessPropertiesMeta.items)
    && businessPropertiesMeta.items.length
    && Date.now() - Number(businessPropertiesMeta.fetchedAt || 0) < ACCESS_META_CACHE_TTL_MS
  ) {
    return businessPropertiesMeta;
  }
  const data = await fetchJson('/api/console/dictionary-config/business-attributes');
  businessPropertiesMeta = {
    items: Array.isArray(data.items) ? data.items : [],
    fetchedAt: Date.now(),
  };
  return businessPropertiesMeta;
}

/**
 * 功能：读取业务属性完整配置定义，并做短时缓存。
 * 输入：可选 `force`，为 `true` 时强制重新拉取。
 * 输出：包含全部业务属性定义和配置路径的对象。
 */
async function refreshBusinessPropertyDefinitionsMeta(force = false) {
  if (
    !force
    && Array.isArray(businessPropertyDefinitionsMeta.items)
    && Date.now() - Number(businessPropertyDefinitionsMeta.fetchedAt || 0) < ACCESS_META_CACHE_TTL_MS
  ) {
    return businessPropertyDefinitionsMeta;
  }
  const data = await fetchJson('/api/console/dictionary-config/business-attributes?includeDisabled=true');
  businessPropertyDefinitionsMeta = {
    items: Array.isArray(data.items) ? data.items : [],
    configPath: String(data.configPath || '').trim(),
    fetchedAt: Date.now(),
  };
  return businessPropertyDefinitionsMeta;
}

/**
 * 功能：读取来源类型配置定义，并按过滤条件做短时缓存。
 * 输入：过滤条件与可选 `force`。
 * 输出：包含来源类型数组和配置路径的对象。
 */
async function refreshSourceTypeMeta(filters = {}, force = false) {
  const key = JSON.stringify({
    includeDisabled: filters.includeDisabled === true,
    scope: String(filters.scope || '').trim(),
    entryMode: String(filters.entryMode || '').trim(),
  });
  const cached = sourceTypeMetaCache.get(key);
  if (
    !force
    && cached
    && Array.isArray(cached.items)
    && Date.now() - Number(cached.fetchedAt || 0) < ACCESS_META_CACHE_TTL_MS
  ) {
    return cached;
  }
  const query = new URLSearchParams();
  if (filters.includeDisabled === true) {
    query.set('includeDisabled', 'true');
  }
  if (filters.scope) {
    query.set('scope', String(filters.scope).trim());
  }
  if (filters.entryMode) {
    query.set('entryMode', String(filters.entryMode).trim());
  }
  const data = await fetchJson(`/api/console/dictionary-config/source-types${query.toString() ? `?${query.toString()}` : ''}`);
  const next = {
    items: Array.isArray(data.items) ? data.items : [],
    configPath: String(data.configPath || '').trim(),
    fetchedAt: Date.now(),
  };
  sourceTypeMetaCache.set(key, next);
  if (filters.includeDisabled === true) {
    sourceTypeDefinitionsMeta = next;
  }
  return next;
}

/**
 * 功能：按指定来源类型列表生成表单选项。
 * 输入：来源类型数组和可选展示参数。
 * 输出：适合表单组件消费的选项数组。
 */
function sourceTypeOptionsFromItems(items = [], options = {}) {
  const includeAll = options.includeAll === true;
  const allLabel = String(options.allLabel || '全部来源类型');
  const mapped = (Array.isArray(items) ? items : []).map((item) => ({
    value: item.code || item.value,
    label: `${item.label}${options.withCode === false ? '' : `（${item.code || item.value}）`}`,
  }));
  return includeAll ? [{ value: '', label: allLabel }, ...mapped] : mapped;
}

/**
 * 功能：把来源类型编码转换为当前配置中的中文标签。
 * 输入：来源类型编码与后备值。
 * 输出：中文标签；未命中时返回后备值或原编码。
 */
function sourceTypeLabel(value, fallback = '') {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return String(fallback || '');
  }
  const allItems = [
    ...(Array.isArray(sourceTypeDefinitionsMeta.items) ? sourceTypeDefinitionsMeta.items : []),
    ...Array.from(sourceTypeMetaCache.values()).flatMap((item) => (Array.isArray(item.items) ? item.items : [])),
  ];
  const match = allItems.find((item) => String(item.code || item.value || '').trim() === normalized);
  if (!match) {
    return displayLabel(normalized) || String(fallback || normalized);
  }
  return match.label || displayLabel(normalized) || String(fallback || normalized);
}

/**
 * 功能：读取系统管理使用的权限配置元数据，并做短时缓存。
 * 输入：可选 `force`，为 `true` 时强制重新拉取。
 * 输出：包含用户、角色、权限和配置路径的对象。
 */
async function refreshAccessControlMeta(force = false) {
  if (
    !force
    && Array.isArray(accessControlMeta.roles)
    && accessControlMeta.roles.length
    && Date.now() - Number(accessControlMeta.fetchedAt || 0) < ACCESS_META_CACHE_TTL_MS
  ) {
    return accessControlMeta;
  }
  const data = await fetchJson('/api/console/system/access-control');
  accessControlMeta = {
    users: Array.isArray(data.users) ? data.users : [],
    roles: Array.isArray(data.roles) ? data.roles : [],
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    configPath: String(data.configPath || '').trim(),
    fetchedAt: Date.now(),
  };
  return accessControlMeta;
}

/**
 * 功能：读取系统管理使用的治理策略元数据，并做短时缓存。
 * 输入：可选 `force`，为 `true` 时强制重新拉取。
 * 输出：包含治理策略和配置路径的对象。
 */
async function refreshGovernancePoliciesMeta(force = false) {
  if (
    !force
    && governancePoliciesMeta.releasePolicies
    && Object.keys(governancePoliciesMeta.releasePolicies).length
    && Date.now() - Number(governancePoliciesMeta.fetchedAt || 0) < ACCESS_META_CACHE_TTL_MS
  ) {
    return governancePoliciesMeta;
  }
  const data = await fetchJson('/api/console/system/governance-policies');
  governancePoliciesMeta = {
    releasePolicies: data.releasePolicies || {},
    configPath: String(data.configPath || '').trim(),
    fetchedAt: Date.now(),
  };
  return governancePoliciesMeta;
}

/**
 * 功能：按当前缓存返回业务属性下拉选项。
 * 输入：可选 `options`，支持控制是否添加空选项。
 * 输出：适合表单组件消费的选项数组。
 */
function businessPropertyOptions(options = {}) {
  const includeAll = options.includeAll === true;
  const allLabel = String(options.allLabel || '全部业务属性');
  const items = Array.isArray(businessPropertiesMeta.items) ? businessPropertiesMeta.items : [];
  const mapped = items.map((item) => ({
    value: item.value,
    label: `${item.label}${options.withCode === false ? '' : `（${item.value}）`}`,
  }));
  return includeAll ? [{ value: '', label: allLabel }, ...mapped] : mapped;
}

/**
 * 功能：把业务属性编码转换为当前配置中的中文标签。
 * 输入：业务属性编码与后备值。
 * 输出：中文标签；未命中时返回后备值或原编码。
 */
function businessPropertyLabel(value, fallback = '') {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return String(fallback || '');
  }
  const match = (businessPropertiesMeta.items || []).find((item) => String(item.value || '').trim() === normalized || String(item.legacyCategoryCode || '').trim() === normalized);
  if (!match) {
    return displayLabel(normalized) || String(fallback || normalized);
  }
  return match.label || displayLabel(normalized) || String(fallback || normalized);
}

/**
 * 功能：把角色编码转换为当前权限配置中的中文标签。
 * 输入：角色编码与后备值。
 * 输出：角色中文标签；未命中时返回后备值或原编码。
 */
function roleLabel(value, fallback = '') {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return String(fallback || '');
  }
  const match = findRoleDefinition(normalized);
  if (match && match.displayName) {
    return match.displayName;
  }
  return displayLabel(normalized) || String(fallback || normalized);
}

/**
 * 功能：生成当前路由在本地渲染缓存中的键。
 * 输入：可选路由对象。
 * 输出：带身份维度的缓存键字符串。
 */
function routeRenderCacheKey(route = currentRouteContext()) {
  const operator = operatorInput.value.trim() || 'console_user';
  const role = roleInput.value || 'dict_admin';
  return `${operator}::${role}::${route.path}::${route.query.toString()}`;
}

/**
 * 功能：清理本地页面渲染缓存中过期或超量的条目。
 * 输入：无。
 * 输出：无显式返回。
 */
function pruneRouteRenderCache() {
  const now = Date.now();
  Array.from(routeRenderCache.entries()).forEach(([key, value]) => {
    if (!value || now - Number(value.cachedAt || 0) > ROUTE_RENDER_CACHE_TTL_MS) {
      routeRenderCache.delete(key);
    }
  });
  const entries = Array.from(routeRenderCache.entries())
    .sort((left, right) => Number((right[1] || {}).cachedAt || 0) - Number((left[1] || {}).cachedAt || 0));
  entries.slice(ROUTE_RENDER_CACHE_MAX).forEach(([key]) => {
    routeRenderCache.delete(key);
  });
}

/**
 * 功能：移除页面缓存中不应复用的一次性提示区块。
 * 输入：HTML 字符串。
 * 输出：可安全复用的 HTML 字符串。
 */
function sanitizeCachedRouteHtml(html = '') {
  if (!html) {
    return '';
  }
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll('[data-transient-flash="true"], [data-transient-cache-notice="true"]').forEach((node) => {
    node.remove();
  });
  return template.innerHTML.trim();
}

/**
 * 功能：读取当前路由的本地渲染缓存。
 * 输入：可选路由对象。
 * 输出：缓存对象；不存在或过期时返回 `null`。
 */
function readRouteRenderCache(route = currentRouteContext()) {
  pruneRouteRenderCache();
  const key = routeRenderCacheKey(route);
  const cached = routeRenderCache.get(key) || null;
  if (!cached) {
    return null;
  }
  if (Date.now() - Number(cached.cachedAt || 0) > ROUTE_RENDER_CACHE_TTL_MS) {
    routeRenderCache.delete(key);
    return null;
  }
  return cached;
}

/**
 * 功能：把当前页面内容写入本地渲染缓存，用于下次先回显后刷新。
 * 输入：可选路由对象。
 * 输出：无显式返回。
 */
function writeRouteRenderCache(route = currentRouteContext()) {
  const html = sanitizeCachedRouteHtml(app.innerHTML);
  if (!html) {
    return;
  }
  routeRenderCache.set(routeRenderCacheKey(route), {
    title: pageTitle.textContent || '',
    html,
    cachedAt: Date.now(),
  });
  pruneRouteRenderCache();
}

/**
 * 功能：发送 JSON/文本请求并统一解析返回体。
 * 输入：请求地址、可选 fetch 配置。
 * 输出：解析后的响应对象；失败时抛出错误。
 */
async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: requestHeaders(options.headers || {}),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = null;
  }
  if (!res.ok) {
    const error = new Error((data && data.error) || text || `request failed: ${res.status}`);
    error.statusCode = res.status;
    error.data = data || null;
    throw error;
  }
  return data || {};
}

/**
 * 功能：发送 JSON 请求。
 * 输入：请求地址、请求体、HTTP 方法。
 * 输出：解析后的 JSON 对象。
 */
async function postJson(url, body = {}, method = 'POST') {
  return fetchJson(url, {
    method,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
}

/**
 * 功能：发送表单数据请求。
 * 输入：请求地址、`FormData` 对象。
 * 输出：解析后的 JSON 对象。
 */
async function postForm(url, formData) {
  return fetchJson(url, {
    method: 'POST',
    body: formData,
  });
}

/**
 * 功能：转义 HTML 特殊字符，避免直接注入页面。
 * 输入：任意字符串值。
 * 输出：安全的 HTML 文本。
 */
function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * 功能：把 ISO 时间格式化为简洁中文显示。
 * 输入：ISO 时间字符串。
 * 输出：格式化后的本地时间文本。
 */
function formatDateTime(value) {
  if (!value) {
    return '未记录';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const pad = (item) => String(item).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * 功能：把秒数格式化为简短可读文本。
 * 输入：秒数值。
 * 输出：如 `15s`、`2m 03s`、`1h 02m` 的文本；无值时返回 `未记录`。
 */
function formatDurationSeconds(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '未记录';
  }
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = Math.floor(seconds % 60);
  if (minutes < 60) {
    return `${minutes}m ${String(remainSeconds).padStart(2, '0')}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return `${hours}h ${String(remainMinutes).padStart(2, '0')}m`;
}

/**
 * 功能：把状态、类型等代码转换为中文展示文案。
 * 输入：代码值。
 * 输出：展示文案；无映射时返回原值。
 */
function displayLabel(value) {
  return DISPLAY_LABELS[String(value || '').trim()] || String(value || '');
}

/**
 * 功能：按选项数组把代码值转换为界面标签。
 * 输入：代码值、选项数组和可选后备文案。
 * 输出：优先返回选项标签，其次返回统一显示文案或后备文案。
 */
function displayOptionLabel(value, options = [], fallback = '') {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return fallback || '';
  }
  const matched = (options || []).find((item) => String(item.value || '').trim() === normalized);
  return matched ? matched.label : (displayLabel(normalized) || fallback || normalized);
}

/**
 * 功能：根据状态返回徽标样式类。
 * 输入：状态值。
 * 输出：徽标 CSS 类名。
 */
function badgeClass(value = '') {
  if (['approved', 'published', 'stable', 'ready', 'imported', 'enabled', 'healthy', 'recovered'].includes(value)) {
    return 'badge success';
  }
  if (['blocked', 'failed', 'disabled', 'rejected', 'error', 'cancelled'].includes(value)) {
    return 'badge danger';
  }
  if (['pending', 'canary', 'warning', 'partially_approved', 'preview_ready', 'draft', 'not_submitted'].includes(value)) {
    return 'badge warning';
  }
  return 'badge';
}

/**
 * 功能：渲染统一状态徽标。
 * 输入：状态值。
 * 输出：状态徽标 HTML。
 */
function renderBadge(value = '') {
  const safeValue = String(value || '').trim();
  return `<span class="${badgeClass(safeValue)}">${escapeHtml(displayLabel(safeValue) || '未标注')}</span>`;
}

/**
 * 功能：渲染带明确语义颜色的自定义徽标。
 * 输入：显示文本和语义类型。
 * 输出：徽标 HTML。
 */
function renderToneBadge(label = '', tone = 'neutral') {
  const classMap = {
    success: 'badge success',
    warning: 'badge warning',
    danger: 'badge danger',
    neutral: 'badge',
  };
  return `<span class="${classMap[tone] || classMap.neutral}">${escapeHtml(label || '未标注')}</span>`;
}

/**
 * 功能：构造单个指标卡片。
 * 输入：标题和数值。
 * 输出：指标卡 HTML。
 */
function metricCard(label, value) {
  return `
    <div class="card">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(String(value))}</div>
    </div>
  `;
}

/**
 * 功能：按页面规则渲染顶部指标卡片组，可隐藏值为 0 的次级卡片。
 * 输入：卡片定义数组。
 * 输出：指标卡片组 HTML。
 */
function renderMetricCardGrid(items = []) {
  const visibleItems = (items || []).filter((item) => {
    if (!item) {
      return false;
    }
    if (item.hideWhenZero !== true) {
      return true;
    }
    if (typeof item.value === 'number') {
      return item.value !== 0;
    }
    const normalized = String(item.value == null ? '' : item.value).trim();
    return normalized !== '' && normalized !== '0';
  });
  if (!visibleItems.length) {
    return '';
  }
  return `
    <div class="grid cards compact">
      ${visibleItems.map((item) => metricCard(item.label, item.value)).join('')}
    </div>
  `;
}

/**
 * 功能：判断词条当前是否仍需要显示“提交审核”动作。
 * 输入：词条状态、当前修订号和审核摘要。
 * 输出：布尔值。
 */
function canSubmitTermReview(termStatus = '', termRevision = null, reviewSummary = {}) {
  if (String(termStatus || '').trim() === 'disabled') {
    return false;
  }
  if (String((reviewSummary || {}).latestStatus || '').trim() === 'pending') {
    return false;
  }
  if (String((reviewSummary || {}).latestStatus || '').trim() === 'approved') {
    const currentRevision = Number(termRevision);
    const latestSnapshotRevision = Number((reviewSummary || {}).latestSnapshotRevision);
    if (Number.isFinite(currentRevision) && Number.isFinite(latestSnapshotRevision) && currentRevision <= latestSnapshotRevision) {
      return false;
    }
  }
  return true;
}

/**
 * 功能：生成批量词条审核执行结果说明文本。
 * 输入：批量范围、动作和后端返回的处理汇总。
 * 输出：适合页面提示使用的说明文本。
 */
function describeBulkReviewResult(scope = 'selected_tasks', action = 'approve', item = {}) {
  const totalRequested = Number(item.totalRequested || 0);
  const approvedCount = Number(item.approvedCount || 0);
  const rejectedCount = Number(item.rejectedCount || 0);
  const skippedNonPendingCount = Number(item.skippedNonPendingCount || 0);
  const skippedNotFoundCount = Number(item.skippedNotFoundCount || 0);

  if (scope === 'import_job' && totalRequested === 0) {
    return '当前导入批次已无待审核任务，本次未执行任何批量审核动作。';
  }

  const scopePrefix = scope === 'import_job'
    ? `按当前导入批次待审核任务执行，共命中 ${totalRequested} 条`
    : `共请求 ${totalRequested} 条`;
  const actionText = action === 'reject'
    ? `实际驳回 ${rejectedCount} 条`
    : `实际通过 ${approvedCount} 条`;
  const skippedParts = [];
  if (skippedNonPendingCount > 0) {
    skippedParts.push(`执行时已非待审 ${skippedNonPendingCount} 条`);
  }
  if (skippedNotFoundCount > 0) {
    skippedParts.push(`未找到 ${skippedNotFoundCount} 条`);
  }
  return `${scopePrefix}，${actionText}${skippedParts.length ? `，${skippedParts.join('，')}` : ''}。`;
}

/**
 * 功能：渲染空态容器。
 * 输入：空态说明文本。
 * 输出：空态 HTML。
 */
function renderEmptyState(text) {
  return `<div class="empty-state">${escapeHtml(text)}</div>`;
}

/**
 * 功能：渲染统一的加载卡片。
 * 输入：标题和说明文本。
 * 输出：加载状态 HTML。
 */
function renderLoadingCard(title = '正在加载，请稍候...', description = '系统正在读取当前页面所需数据。') {
  return `
    <section class="loading-card">
      <h2 class="loading-title">${escapeHtml(title)}</h2>
      <div class="loading-desc">${escapeHtml(description)}</div>
    </section>
  `;
}

/**
 * 功能：渲染“已先展示缓存，后台正在刷新”的统一提示。
 * 输入：缓存时间戳。
 * 输出：缓存提示 HTML。
 */
function renderRouteCacheNotice(cachedAt = 0) {
  return `
    <section class="inline-notice" data-transient-cache-notice="true">
      <div class="inline-notice-title">已先展示最近一次页面结果</div>
      <div class="inline-notice-desc">
        后台正在刷新当前页面，避免进入页面时长时间空白等待。
        ${cachedAt ? `缓存时间：${escapeHtml(formatDateTime(new Date(cachedAt).toISOString()))}` : ''}
      </div>
    </section>
  `;
}

/**
 * 功能：根据拼音候选审核状态判断是否仍可重复提交。
 * 输入：审核状态值。
 * 输出：布尔值。
 */
function canSubmitPinyinCandidate(reviewStatus = '') {
  return ['', 'not_submitted', 'rejected'].includes(String(reviewStatus || '').trim());
}

/**
 * 功能：构造词典记录列表页当前使用的查询状态对象。
 * 输入：可选查询参数对象。
 * 输出：词典记录列表查询状态对象。
 */
function normalizeTermListQueryState(params = {}) {
  return {
    page: normalizePage(params.page),
    query: String(params.query || '').trim(),
    categoryCode: String(params.categoryCode || '').trim(),
    status: String(params.status || '').trim(),
    sourceType: String(params.sourceType || '').trim(),
    riskLevel: String(params.riskLevel || '').trim(),
    sortValue: String(params.sort || 'updated_at:desc').trim() || 'updated_at:desc',
  };
}

/**
 * 功能：根据词典记录列表查询状态拉取当前结果集与导出链接。
 * 输入：词典记录列表查询状态对象。
 * 输出：包含分页结果和导出链接的对象。
 */
async function fetchTermListViewData(state = {}) {
  const queryState = normalizeTermListQueryState(state);
  const { sortBy, sortDirection } = parseSortOption(queryState.sortValue);
  const exportUrl = buildApiUrl('/api/console/dictionary/terms/export', {
    query: queryState.query,
    categoryCode: queryState.categoryCode,
    status: queryState.status,
    sourceType: queryState.sourceType,
    riskLevel: queryState.riskLevel,
    sortBy,
    sortDirection,
  });
  const pageSize = 20;
  const data = await fetchJson(`/api/console/dictionary/terms?page=${encodeURIComponent(queryState.page)}&pageSize=${pageSize}&query=${encodeURIComponent(queryState.query)}&categoryCode=${encodeURIComponent(queryState.categoryCode)}&status=${encodeURIComponent(queryState.status)}&sourceType=${encodeURIComponent(queryState.sourceType)}&riskLevel=${encodeURIComponent(queryState.riskLevel)}&sortBy=${encodeURIComponent(sortBy)}&sortDirection=${encodeURIComponent(sortDirection)}`);
  return {
    ...queryState,
    sortBy,
    sortDirection,
    exportUrl,
    data,
    items: data.items || [],
    summary: data.summary || {},
    filteredSummary: data.filteredSummary || {},
  };
}

/**
 * 功能：渲染词典记录列表页的结果区块。
 * 输入：词典记录列表视图数据对象。
 * 输出：结果区块 HTML。
 */
function renderTermsResultsSurface(view = {}) {
  const data = view.data || {};
  const items = view.items || [];
  const filteredSummary = view.filteredSummary || {};
  return `
    <section id="termsResultsSurface" class="surface-block surface-block-terms-results">
      <div class="surface-head">
        <div>
          <h3 class="surface-title">结果列表</h3>
          <div class="surface-desc">当前筛选共 ${escapeHtml(String(data.total || 0))} 条结果，当前页展示 ${escapeHtml(String(items.length))} 条；行内动作只保留详情和送审，避免操作区膨胀。</div>
        </div>
      </div>
      <div class="review-summary-strip">
        <div class="summary-chip">筛选结果：${escapeHtml(String(data.total || 0))}</div>
        <div class="summary-chip">当前页：${escapeHtml(String(items.length))}</div>
        <div class="summary-chip">已通过：${escapeHtml(String(filteredSummary.approvedCount || 0))}</div>
        <div class="summary-chip">待审核：${escapeHtml(String(filteredSummary.pendingReviewCount || 0))}</div>
        <div class="summary-chip">高风险：${escapeHtml(String(filteredSummary.highRiskCount || 0))}</div>
      </div>
      ${renderDenseTable([
        {
          label: '<input type="checkbox" data-toggle-bulk="terms" aria-label="全选当前页词条">',
          render: (item) => `<input type="checkbox" data-bulk-item="terms" value="${escapeHtml(item.termId)}" aria-label="选择词条 ${escapeHtml(item.canonicalText)}">`,
        },
        { label: '标准词', render: (item) => `<a class="primary-link nowrap" data-link href="/console/dictionary/terms/${encodeURIComponent(item.termId)}">${escapeHtml(item.canonicalText)}</a>` },
        { label: '业务属性', render: (item) => escapeHtml(businessPropertyLabel(item.categoryCode, item.categoryCode)) },
        { label: '来源', render: (item) => escapeHtml(sourceTypeLabel(item.sourceType, item.sourceType)) },
        { label: '记录状态', render: (item) => renderBadge(item.status) },
        { label: '错误词数', render: (item) => escapeHtml(String(item.aliasCount)) },
        { label: '风险等级', render: (item) => escapeHtml(displayLabel(item.riskLevel) || item.riskLevel) },
        { label: '审核状态', render: (item) => renderBadge(item.latestReviewStatus) },
        { label: '更新时间', render: (item) => escapeHtml(formatDateTime(item.updatedAt)) },
        {
          label: '操作',
          render: (item) => `
            <div class="inline-actions">
              <a class="button-link secondary-button" data-link href="/console/dictionary/terms/${encodeURIComponent(item.termId)}">查看详情</a>
              ${canSubmitTermReview(item.status, item.revision, {
                latestStatus: item.latestReviewStatus,
                latestSnapshotRevision: item.latestReviewSnapshotRevision,
              })
                ? renderFeatureAction('terms.review.submit', `<form data-action="submit-term-review" action="/api/console/dictionary/terms/${encodeURIComponent(item.termId)}/submit-review"><button type="submit">提交审核</button></form>`, '提交审核', '当前身份不能提交词条审核。')
                : ''}
            </div>
          `,
        },
      ], items, '当前筛选条件下没有词条。', {
        scrollSizeClass: 'panel-scroll-large',
        collapseThreshold: 10,
        collapsedSummary: '词条列表结果较多，默认收起明细',
        tableOptions: {
          wrapClass: 'table-wrap-wide',
          tableClass: 'table-terms-list',
          minWidth: 1180,
          horizontalHint: '当前结果列较多，可左右滚动；已固定勾选列和标准词列，便于横向查看时保持定位。',
        },
      })}
      ${renderPagination('/dictionary/terms', {
        query: view.query,
        categoryCode: view.categoryCode,
        status: view.status,
        sourceType: view.sourceType,
        riskLevel: view.riskLevel,
        sort: view.sortValue,
      }, data)}
    </section>
  `;
}

/**
 * 功能：只刷新词典记录页的结果区块，并同步 URL 与导出链接。
 * 输入：词典记录列表查询状态对象。
 * 输出：无显式返回；直接更新结果区块。
 */
async function refreshTermsResultsOnly(params = {}) {
  const view = await fetchTermListViewData(params);
  const resultSurface = document.getElementById('termsResultsSurface');
  if (resultSurface) {
    resultSurface.outerHTML = renderTermsResultsSurface(view);
  }
  const exportAnchor = document.querySelector('[data-term-export-link]');
  if (exportAnchor) {
    exportAnchor.setAttribute('href', view.exportUrl);
  }
  history.pushState({}, '', buildConsoleUrl('/dictionary/terms', {
    page: view.page > 1 ? view.page : '',
    query: view.query,
    categoryCode: view.categoryCode,
    status: view.status,
    sourceType: view.sourceType,
    riskLevel: view.riskLevel,
    sort: view.sortValue,
  }));
}

/**
 * 功能：从词典记录列表页的分页链接提取查询状态。
 * 输入：分页链接 href。
 * 输出：词典记录列表查询状态对象。
 */
function termListQueryStateFromHref(href = '') {
  const target = new URL(String(href || '/console/dictionary/terms'), location.origin);
  return {
    page: target.searchParams.get('page') || 1,
    query: target.searchParams.get('query') || '',
    categoryCode: target.searchParams.get('categoryCode') || '',
    status: target.searchParams.get('status') || '',
    sourceType: target.searchParams.get('sourceType') || '',
    riskLevel: target.searchParams.get('riskLevel') || '',
    sort: target.searchParams.get('sort') || 'updated_at:desc',
  };
}

/**
 * 功能：构造批量导入首页当前使用的查询状态对象。
 * 输入：可选查询参数对象。
 * 输出：批量导入列表查询状态对象。
 */
function normalizeImportListQueryState(params = {}) {
  return {
    page: normalizePage(params.page),
    status: String(params.status || '').trim(),
    sourceType: String(params.sourceType || '').trim(),
  };
}

/**
 * 功能：根据批量导入列表查询状态拉取当前结果集。
 * 输入：批量导入列表查询状态对象。
 * 输出：包含分页结果的对象。
 */
async function fetchImportListViewData(state = {}) {
  const queryState = normalizeImportListQueryState(state);
  const pageSize = 10;
  const data = await fetchJson(`/api/console/dictionary/import-jobs?page=${encodeURIComponent(queryState.page)}&pageSize=${pageSize}&status=${encodeURIComponent(queryState.status)}&sourceType=${encodeURIComponent(queryState.sourceType)}`);
  return {
    ...queryState,
    data,
    items: data.items || [],
    summary: data.summary || {},
    filteredSummary: data.filteredSummary || {},
  };
}

/**
 * 功能：渲染批量导入首页的结果区块。
 * 输入：批量导入列表视图数据对象。
 * 输出：结果区块 HTML。
 */
function renderImportResultsSurface(view = {}) {
  const data = view.data || {};
  const items = view.items || [];
  const filteredSummary = view.filteredSummary || {};
  return `
    <section id="importResultsSurface" class="surface-block surface-block-import-results">
      <div class="surface-head">
        <div>
          <h3 class="surface-title">批次结果</h3>
          <div class="surface-desc">当前筛选共 ${escapeHtml(String(data.total || 0))} 个批次，当前页展示 ${escapeHtml(String(items.length))} 个。</div>
        </div>
      </div>
      <div class="review-summary-strip">
        <div class="summary-chip">筛选结果：${escapeHtml(String(data.total || 0))}</div>
        <div class="summary-chip">当前页：${escapeHtml(String(items.length))}</div>
        <div class="summary-chip">待确认：${escapeHtml(String(filteredSummary.previewReadyCount || 0))}</div>
        <div class="summary-chip">已完成：${escapeHtml(String(filteredSummary.importedCount || 0))}</div>
        <div class="summary-chip">已取消：${escapeHtml(String(filteredSummary.cancelledCount || 0))}</div>
      </div>
      ${renderDenseTable([
        { label: '批次 ID', render: (item) => `<a class="primary-link" data-link href="/console/dictionary/import-jobs/${encodeURIComponent(item.jobId)}">${escapeHtml(item.jobId)}</a>` },
        { label: '批次类型', render: (item) => escapeHtml(displayLabel(item.jobType) || item.jobType || '未记录') },
        { label: '来源类型', render: (item) => escapeHtml(sourceTypeLabel(item.sourceType, item.sourceType || '未记录')) },
        { label: '批次状态', render: (item) => renderBadge(item.status) },
        { label: '批次摘要', render: (item) => importJobSummaryText(item) },
        { label: '创建时间', render: (item) => escapeHtml(formatDateTime(item.createdAt)) },
      ], items, '当前还没有导入批次。', { scrollSizeClass: 'panel-scroll-medium', collapseThreshold: 8, collapsedSummary: '导入批次较多，默认收起明细' })}
      ${renderPagination('/dictionary/import-jobs', { status: view.status, sourceType: view.sourceType }, data)}
    </section>
  `;
}

/**
 * 功能：只刷新批量导入首页的结果区块，并同步 URL。
 * 输入：批量导入列表查询状态对象。
 * 输出：无显式返回；直接更新结果区块。
 */
async function refreshImportResultsOnly(params = {}) {
  const view = await fetchImportListViewData(params);
  const resultSurface = document.getElementById('importResultsSurface');
  if (resultSurface) {
    resultSurface.outerHTML = renderImportResultsSurface(view);
  }
  history.pushState({}, '', buildConsoleUrl('/dictionary/import-jobs', {
    page: view.page > 1 ? view.page : '',
    status: view.status,
    sourceType: view.sourceType,
  }));
}

/**
 * 功能：从批量导入首页分页链接提取查询状态。
 * 输入：分页链接 href。
 * 输出：批量导入列表查询状态对象。
 */
function importListQueryStateFromHref(href = '') {
  const target = new URL(String(href || '/console/dictionary/import-jobs'), location.origin);
  return {
    page: target.searchParams.get('page') || 1,
    status: target.searchParams.get('status') || '',
    sourceType: target.searchParams.get('sourceType') || '',
  };
}

/**
 * 功能：构造导入批次详情中预览行列表的查询状态。
 * 输入：导入批次 ID 和可选查询参数对象。
 * 输出：导入批次预览行查询状态对象。
 */
function normalizeImportRowsQueryState(jobId, params = {}) {
  return {
    jobId: String(jobId || '').trim(),
    page: normalizePage(params.page),
    rowStatus: String(params.rowStatus || '').trim(),
    rowDecision: String(params.rowDecision || '').trim(),
  };
}

/**
 * 功能：根据导入批次预览行查询状态拉取当前结果集。
 * 输入：导入批次预览行查询状态对象。
 * 输出：包含分页结果的对象。
 */
async function fetchImportRowsViewData(state = {}) {
  const queryState = normalizeImportRowsQueryState(state.jobId, state);
  const pageSize = 50;
  const data = await fetchJson(`/api/console/dictionary/import-jobs/${encodeURIComponent(queryState.jobId)}/rows?page=${encodeURIComponent(queryState.page)}&pageSize=${pageSize}&status=${encodeURIComponent(queryState.rowStatus)}&decision=${encodeURIComponent(queryState.rowDecision)}`);
  return {
    ...queryState,
    data,
    items: data.items || [],
  };
}

/**
 * 功能：渲染导入批次详情中的预览行结果区块。
 * 输入：导入批次预览行视图数据对象。
 * 输出：结果区块 HTML。
 */
function renderImportRowsResultsSurface(view = {}) {
  const data = view.data || {};
  const items = view.items || [];
  return `
    <section id="importRowsResultsSurface" class="surface-block surface-block-import-results">
      <div class="surface-head">
        <div>
          <h3 class="surface-title">预览行结果</h3>
          <div class="surface-desc">当前筛选共 ${escapeHtml(String(data.total || 0))} 行，当前页展示 ${escapeHtml(String(items.length))} 行。</div>
        </div>
      </div>
      <div class="review-summary-strip">
        <div class="summary-chip">筛选结果：${escapeHtml(String(data.total || 0))}</div>
        <div class="summary-chip">当前页：${escapeHtml(String(items.length))}</div>
      </div>
      ${renderDenseTable([
        { label: '行号', render: (entry) => escapeHtml(String(entry.rowNo)) },
        { label: '预览状态', render: (entry) => renderBadge(entry.status) },
        { label: '处理决策', render: (entry) => escapeHtml(displayOptionLabel(entry.decision, IMPORT_ROW_DECISION_OPTIONS, '未记录')) },
        { label: '目标键', render: (entry) => escapeHtml(entry.targetTermKey || '') },
        { label: '预览数据', render: (entry) => `<span class="mono">${escapeHtml(JSON.stringify(entry.normalizedPayload || {}))}</span>` },
        { label: '准入问题', render: (entry) => Array.isArray(entry.issues) && entry.issues.length ? escapeHtml(entry.issues.map((issue) => {
          const trace = issue.trace ? [issue.trace.termId, issue.trace.canonicalText, issue.trace.importJobId, issue.trace.sourceFileName, issue.trace.sourceRowNo].filter(Boolean).join('/') : '';
          return `${issue.code}: ${issue.message}${trace ? ` [${trace}]` : ''}`;
        }).join(' | ')) : escapeHtml(entry.errorMessage || '') },
      ], items, '当前没有预览行。', { scrollSizeClass: 'panel-scroll-large', collapseThreshold: 12, collapsedSummary: '预览行较多，默认收起明细' })}
      ${renderPagination(`/dictionary/import-jobs/${encodeURIComponent(view.jobId)}`, { rowStatus: view.rowStatus, rowDecision: view.rowDecision }, data)}
    </section>
  `;
}

/**
 * 功能：只刷新导入批次详情中的预览行结果区块，并同步 URL。
 * 输入：导入批次预览行查询状态对象。
 * 输出：无显式返回；直接更新结果区块。
 */
async function refreshImportRowsResultsOnly(params = {}) {
  const view = await fetchImportRowsViewData(params);
  const resultSurface = document.getElementById('importRowsResultsSurface');
  if (resultSurface) {
    resultSurface.outerHTML = renderImportRowsResultsSurface(view);
  }
  history.pushState({}, '', buildConsoleUrl(`/dictionary/import-jobs/${encodeURIComponent(view.jobId)}`, {
    page: view.page > 1 ? view.page : '',
    rowStatus: view.rowStatus,
    rowDecision: view.rowDecision,
  }));
}

/**
 * 功能：从导入批次详情分页链接提取预览行查询状态。
 * 输入：分页链接 href。
 * 输出：导入批次预览行查询状态对象。
 */
function importRowsQueryStateFromHref(href = '') {
  const target = new URL(String(href || location.href), location.origin);
  const routePath = target.pathname.replace(/^\/console/, '') || '/';
  const segments = routePath.split('/');
  return {
    jobId: decodeURIComponent(segments[3] || ''),
    page: target.searchParams.get('page') || 1,
    rowStatus: target.searchParams.get('rowStatus') || '',
    rowDecision: target.searchParams.get('rowDecision') || '',
  };
}

/**
 * 功能：构造词条审核列表当前使用的查询状态。
 * 输入：可选查询参数对象。
 * 输出：词条审核列表查询状态对象。
 */
function normalizeReviewListQueryState(params = {}) {
  const requestedView = String(params.view || '').trim();
  const currentView = requestedView === 'pinyin' ? 'pinyin' : 'terms';
  return {
    view: currentView,
    page: normalizePage(params.page),
    status: String(params.status || '').trim(),
    importJobId: currentView === 'terms' ? String(params.importJobId || '').trim() : '',
  };
}

/**
 * 功能：根据词条审核列表查询状态拉取当前结果集。
 * 输入：词条审核列表查询状态对象。
 * 输出：包含分页结果的对象。
 */
async function fetchReviewListViewData(state = {}) {
  const queryState = normalizeReviewListQueryState(state);
  const fixedTaskType = queryState.view === 'pinyin' ? 'pinyin_candidate_review' : 'term_review';
  const fixedTargetType = queryState.view === 'pinyin' ? 'pinyin_candidate' : 'term';
  const pageSize = 20;
  const data = await fetchJson(`/api/console/dictionary/reviews?page=${encodeURIComponent(queryState.page)}&pageSize=${pageSize}&status=${encodeURIComponent(queryState.status)}&taskType=${encodeURIComponent(fixedTaskType)}&targetType=${encodeURIComponent(fixedTargetType)}&importJobId=${encodeURIComponent(queryState.importJobId)}`);
  return {
    ...queryState,
    fixedTaskType,
    fixedTargetType,
    data,
    items: data.items || [],
    summary: data.summary || {},
    filteredSummary: data.filteredSummary || {},
    importJobContext: data.importJobContext || null,
  };
}

/**
 * 功能：渲染词条审核页的结果区块。
 * 输入：词条审核列表视图数据对象。
 * 输出：结果区块 HTML。
 */
function renderReviewResultsSurface(view = {}) {
  const data = view.data || {};
  const items = view.items || [];
  const filteredSummary = view.filteredSummary || {};
  return `
    <section id="reviewResultsSurface" class="surface-block surface-block-review-results">
      <div class="surface-head">
        <div>
          <h3 class="surface-title">任务状态概览</h3>
          <div class="surface-desc">${escapeHtml(view.view === 'pinyin'
            ? '拼音审核的审批动作和普通跳转动作在卡片里分区呈现，避免误点高风险决策。'
            : '词条审核的审批动作和普通跳转动作在卡片里分区呈现，避免误点高风险决策。')}</div>
        </div>
      </div>
      <div class="review-summary-strip">
        <div class="summary-chip">筛选结果：${escapeHtml(String(data.total || 0))}</div>
        <div class="summary-chip">当前页：${escapeHtml(String(items.length))}</div>
        <div class="summary-chip">待审核：${escapeHtml(String(filteredSummary.pendingCount || 0))}</div>
        <div class="summary-chip">已通过：${escapeHtml(String(filteredSummary.approvedCount || 0))}</div>
        <div class="summary-chip">已驳回：${escapeHtml(String(filteredSummary.rejectedCount || 0))}</div>
      </div>
      ${renderReviewBoard(items)}
      ${renderPagination('/dictionary/reviews', { status: view.status, view: view.view, importJobId: view.importJobId }, data)}
    </section>
  `;
}

/**
 * 功能：只刷新词条审核页的结果区块，并同步 URL。
 * 输入：词条审核列表查询状态对象。
 * 输出：无显式返回；直接更新结果区块。
 */
async function refreshReviewResultsOnly(params = {}) {
  const view = await fetchReviewListViewData(params);
  const resultSurface = document.getElementById('reviewResultsSurface');
  if (resultSurface) {
    resultSurface.outerHTML = renderReviewResultsSurface(view);
  }
  history.pushState({}, '', buildConsoleUrl('/dictionary/reviews', {
    page: view.page > 1 ? view.page : '',
    view: view.view,
    status: view.status,
    importJobId: view.importJobId,
  }));
}

/**
 * 功能：从词条审核页分页链接提取查询状态。
 * 输入：分页链接 href。
 * 输出：词条审核列表查询状态对象。
 */
function reviewListQueryStateFromHref(href = '') {
  const target = new URL(String(href || '/console/dictionary/reviews'), location.origin);
  return {
    page: target.searchParams.get('page') || 1,
    view: target.searchParams.get('view') || '',
    status: target.searchParams.get('status') || '',
    importJobId: target.searchParams.get('importJobId') || '',
  };
}

/**
 * 功能：构造节点备案列表当前使用的查询状态。
 * 输入：可选查询参数对象。
 * 输出：节点备案列表查询状态对象。
 */
function normalizeRuntimeNodeRegistryListQueryState(params = {}) {
  return {
    page: normalizePage(params.page),
    nodeId: String(params.nodeId || '').trim(),
  };
}

/**
 * 功能：根据节点备案列表查询状态拉取当前结果集。
 * 输入：节点备案列表查询状态对象。
 * 输出：包含分页结果的对象。
 */
async function fetchRuntimeNodeRegistryListViewData(state = {}) {
  const queryState = normalizeRuntimeNodeRegistryListQueryState(state);
  const data = await fetchJson(`/api/console/runtime-node-registry?page=${encodeURIComponent(queryState.page)}&pageSize=50`);
  return {
    ...queryState,
    data,
    items: data.items || [],
  };
}

/**
 * 功能：渲染节点备案页的列表结果区块。
 * 输入：节点备案列表视图数据对象。
 * 输出：结果区块 HTML。
 */
function renderRuntimeNodeRegistryResultsSurface(view = {}) {
  const data = view.data || {};
  const items = view.items || [];
  return `
    <section id="runtimeNodeRegistryResultsSurface" class="panel">
      <div class="section-head">
        <div>
          <h2 class="section-title">备案节点列表</h2>
          <div class="section-desc">先在 admin 侧备案节点，再允许 runtime 以节点级密钥注册、心跳和拉取控制状态。</div>
        </div>
        ${renderPageHelpLink('page-runtime-node-registry', '查看节点备案帮助')}
      </div>
      ${renderDenseTable([
        { label: '节点', render: (entry) => `<a class="primary-link" data-link href="/console/runtime-node-registry?nodeId=${encodeURIComponent(entry.nodeId)}">${escapeHtml(entry.nodeId)}</a>` },
        { label: '名称', render: (entry) => escapeHtml(entry.nodeName || '') },
        { label: '备案状态', render: (entry) => entry.enabled ? '<span class="badge success">备案已启用</span>' : '<span class="badge warning">备案已禁用</span>' },
        { label: '注册状态', render: (entry) => entry.registrationStatus === 'registered' ? '<span class="badge success">已注册</span>' : '<span class="badge warning">未注册</span>' },
        { label: '实时状态', render: (entry) => entry.registrationStatus === 'registered' ? renderBadge(entry.liveStatus || 'unknown') : '<span class="subtle">尚未产生</span>' },
        { label: '地址', render: (entry) => `<span class="mono">${escapeHtml(entry.address || '')}</span>` },
        { label: '最近心跳', render: (entry) => entry.lastHeartbeatAt ? escapeHtml(formatDateTime(entry.lastHeartbeatAt)) : '<span class="subtle">未记录</span>' },
        { label: '密钥指纹', render: (entry) => `<span class="mono">${escapeHtml(entry.secretFingerprint || '')}</span>` },
      ], items, '当前没有备案节点。', { scrollSizeClass: 'panel-scroll-large', collapseThreshold: 10, collapsedSummary: '备案节点较多，默认收起明细' })}
      ${renderPagination('/runtime-node-registry', { nodeId: view.nodeId }, data)}
    </section>
  `;
}

/**
 * 功能：只刷新节点备案页的列表结果区块，并同步 URL。
 * 输入：节点备案列表查询状态对象。
 * 输出：无显式返回；直接更新结果区块。
 */
async function refreshRuntimeNodeRegistryResultsOnly(params = {}) {
  const view = await fetchRuntimeNodeRegistryListViewData(params);
  const resultSurface = document.getElementById('runtimeNodeRegistryResultsSurface');
  if (resultSurface) {
    resultSurface.outerHTML = renderRuntimeNodeRegistryResultsSurface(view);
  }
  history.pushState({}, '', buildConsoleUrl('/runtime-node-registry', {
    page: view.page > 1 ? view.page : '',
    nodeId: view.nodeId,
  }));
}

/**
 * 功能：从节点备案页的分页链接提取查询状态。
 * 输入：分页链接 href。
 * 输出：节点备案列表查询状态对象。
 */
function runtimeNodeRegistryQueryStateFromHref(href = '') {
  const target = new URL(String(href || '/console/runtime-node-registry'), location.origin);
  return {
    page: target.searchParams.get('page') || 1,
    nodeId: target.searchParams.get('nodeId') || '',
  };
}

/**
 * 功能：构造运行节点列表当前使用的查询状态。
 * 输入：可选查询参数对象。
 * 输出：运行节点列表查询状态对象。
 */
function normalizeRuntimeNodeListQueryState(params = {}) {
  return {
    page: normalizePage(params.page),
    status: String(params.status || '').trim(),
    env: String(params.env || '').trim(),
  };
}

/**
 * 功能：根据运行节点列表查询状态拉取当前结果集。
 * 输入：运行节点列表查询状态对象。
 * 输出：包含分页结果的对象。
 */
async function fetchRuntimeNodesViewData(state = {}) {
  const queryState = normalizeRuntimeNodeListQueryState(state);
  const pageSize = 20;
  const data = await fetchJson(`/api/console/runtime-nodes?page=${encodeURIComponent(queryState.page)}&pageSize=${pageSize}&status=${encodeURIComponent(queryState.status)}&env=${encodeURIComponent(queryState.env)}`);
  return {
    ...queryState,
    data,
    items: data.items || [],
    issueSummary: data.issueSummary || {},
    summary: data.summary || {},
    filteredSummary: data.filteredSummary || {},
  };
}

/**
 * 功能：渲染运行节点页的结果区块。
 * 输入：运行节点列表视图数据对象。
 * 输出：结果区块 HTML。
 */
function renderRuntimeNodesResultsSurface(view = {}) {
  const data = view.data || {};
  const items = view.items || [];
  const filteredSummary = view.filteredSummary || {};
  const issueSummary = view.issueSummary || {};
  const activeIssueCount = Number(filteredSummary.activeIssueCount || issueSummary.activeCount || 0);
  return `
    <section id="runtimeNodesResultsSurface" class="surface-block">
      <div class="surface-head">
        <div>
          <h3 class="surface-title">节点状态结果</h3>
          <div class="surface-desc">当前筛选共 ${escapeHtml(String(data.total || 0))} 个备案节点，当前页展示 ${escapeHtml(String(items.length))} 个；先看是否已注册，再看健康、版本和最近心跳。</div>
        </div>
      </div>
      <div class="review-summary-strip">
        <div class="summary-chip">筛选结果：${escapeHtml(String(data.total || 0))}</div>
        <div class="summary-chip">当前页：${escapeHtml(String(items.length))}</div>
        <div class="summary-chip">在线：${escapeHtml(String(filteredSummary.onlineCount || 0))}</div>
        <div class="summary-chip">离线：${escapeHtml(String(filteredSummary.offlineCount || 0))}</div>
        <div class="summary-chip">异常：${escapeHtml(String(activeIssueCount || 0))}</div>
      </div>
      ${renderDenseTable([
        {
          label: '节点',
          render: (item) => `
            <div class="cell-stack">
              <a class="primary-link nowrap" data-link href="/console/runtime-nodes/${encodeURIComponent(item.nodeId)}">${escapeHtml(item.nodeName || item.nodeId)}</a>
              <span class="subtle">${escapeHtml(item.env || '未标注')} / ${escapeHtml(item.address || '未记录')}</span>
            </div>
          `,
        },
        { label: '备案状态', render: (item) => renderRuntimeRegistryState(item) },
        {
          label: '注册状态',
          render: (item) => `
            <div class="cell-stack">
              <span class="${String(item.registrationStatus || '').trim() === 'registered' ? 'badge success' : 'badge warning'}">${escapeHtml(item.registrationLabel || displayLabel(item.registrationStatus) || '未注册')}</span>
              <span class="subtle">${escapeHtml((((item.registration || {}).detail) || '未记录'))}</span>
            </div>
          `,
        },
        { label: '实时状态', render: (item) => renderRuntimeRealtimeState(item) },
        { label: '目标状态', render: (item) => renderRuntimeVersionAlignment(item) },
        { label: '最近动作', render: (item) => renderRuntimeRecentAction(item) },
        { label: '历史异常', render: (item) => renderRuntimeHistoryIssue(item) },
        { label: '操作', render: (item) => `<a class="button-link secondary-button" data-link href="/console/runtime-nodes/${encodeURIComponent(item.nodeId)}">查看详情</a>` },
      ], items, '当前没有备案节点。', { scrollSizeClass: 'panel-scroll-large', collapseThreshold: 10, collapsedSummary: '备案节点较多，默认收起列表' })}
      ${renderPagination('/runtime-nodes', { status: view.status, env: view.env }, data)}
    </section>
  `;
}

/**
 * 功能：只刷新运行节点页的结果区块，并同步 URL。
 * 输入：运行节点列表查询状态对象。
 * 输出：无显式返回；直接更新结果区块。
 */
async function refreshRuntimeNodesResultsOnly(params = {}) {
  const view = await fetchRuntimeNodesViewData(params);
  const resultSurface = document.getElementById('runtimeNodesResultsSurface');
  if (resultSurface) {
    resultSurface.outerHTML = renderRuntimeNodesResultsSurface(view);
  }
  history.pushState({}, '', buildConsoleUrl('/runtime-nodes', {
    page: view.page > 1 ? view.page : '',
    status: view.status,
    env: view.env,
  }));
}

/**
 * 功能：从运行节点页的分页链接提取查询状态。
 * 输入：分页链接 href。
 * 输出：运行节点列表查询状态对象。
 */
function runtimeNodesQueryStateFromHref(href = '') {
  const target = new URL(String(href || '/console/runtime-nodes'), location.origin);
  return {
    page: target.searchParams.get('page') || 1,
    status: target.searchParams.get('status') || '',
    env: target.searchParams.get('env') || '',
  };
}

/**
 * 功能：规范化版本列表视图编码。
 * 输入：原始视图编码。
 * 输出：规范后的版本视图编码。
 */
function normalizeReleaseListView(value = '') {
  return ['review', 'canary', 'risk', 'rollback'].includes(String(value || '').trim()) ? String(value || '').trim() : 'list';
}

/**
 * 功能：根据版本视图编码返回视图元信息。
 * 输入：版本视图编码。
 * 输出：视图标题、说明和帮助文案对象。
 */
function releaseListViewMeta(view = 'list') {
  return {
    list: {
      title: '版本列表',
      sectionTitle: '版本列表',
      description: '当前视图先看版本状态、审批状态和流量状态，再决定是否进入详情页继续处理。',
      helpText: '从版本列表进入详情页，继续处理发布审核、灰度、风险或回滚。',
    },
    review: {
      title: '发布审核',
      sectionTitle: '发布审核',
      description: '当前视图只聚焦版本审批进度，优先处理未提审、待审核和审批未满足的版本。',
      helpText: '进入详情页中的发布审核区，继续完成提审或审批动作。',
    },
    canary: {
      title: '灰度发布',
      sectionTitle: '灰度发布',
      description: '当前视图只聚焦可灰度版本和当前灰度版本，优先判断是否继续灰度或切换其他版本。',
      helpText: '进入详情页中的灰度区，继续设置灰度或查看当前流量状态。',
    },
    risk: {
      title: '发布后风险',
      sectionTitle: '发布后风险',
      description: '当前视图只聚焦已发布版本和风险摘要，优先判断是否需要继续观察、修复或回滚。',
      helpText: '进入详情页中的发布后风险区，继续查看风险项、验证结果和节点收敛。',
    },
    rollback: {
      title: '回滚记录',
      sectionTitle: '回滚记录',
      description: '当前视图聚焦可回滚版本和相关入口，先确认目标版本，再进入详情页处理回滚。',
      helpText: '进入详情页查看回滚相关信息和具体回滚动作。',
    },
  }[view];
}

/**
 * 功能：根据版本视图编码构造列表列定义。
 * 输入：版本视图编码。
 * 输出：版本列表列定义数组。
 */
function releaseColumnsForView(view = 'list') {
  if (view === 'review') {
    return [
      {
        label: '版本',
        render: (item) => `
          <div class="cell-stack">
            <a class="primary-link" data-link href="/console/releases/${encodeURIComponent(item.releaseId)}">${escapeHtml(item.version)}</a>
            <span class="subtle">${escapeHtml(item.summary || '未填写摘要')}</span>
          </div>
        `,
      },
      { label: '版本状态', render: (item) => renderBadge((item.releaseState || {}).status || item.status) },
      { label: '发布审批', render: (item) => renderReleaseApprovalSummary(item.approval || {}) },
      { label: '下一步', render: (item) => escapeHtml(String((item.approval || {}).status || '') === 'approved' ? '进入详情页决定灰度、下发或正式发布' : '进入详情页继续处理发布审核') },
      { label: '操作', render: (item) => `<a class="button-link secondary-button" data-link href="/console/releases/${encodeURIComponent(item.releaseId)}">查看详情</a>` },
    ];
  }
  if (view === 'canary') {
    return [
      {
        label: '版本',
        render: (item) => `
          <div class="cell-stack">
            <a class="primary-link" data-link href="/console/releases/${encodeURIComponent(item.releaseId)}">${escapeHtml(item.version)}</a>
            <span class="subtle">${escapeHtml(item.summary || '未填写摘要')}</span>
          </div>
        `,
      },
      { label: '版本状态', render: (item) => renderBadge((item.releaseState || {}).status || item.status) },
      { label: '流量状态', render: (item) => renderReleaseTrafficSummary(item.traffic || {}) },
      { label: '发布审批', render: (item) => renderReleaseApprovalSummary(item.approval || {}) },
      { label: '操作', render: (item) => `<a class="button-link secondary-button" data-link href="/console/releases/${encodeURIComponent(item.releaseId)}">查看详情</a>` },
    ];
  }
  if (view === 'risk') {
    return [
      {
        label: '版本',
        render: (item) => `
          <div class="cell-stack">
            <a class="primary-link" data-link href="/console/releases/${encodeURIComponent(item.releaseId)}">${escapeHtml(item.version)}</a>
            <span class="subtle">${escapeHtml(item.summary || '未填写摘要')}</span>
          </div>
        `,
      },
      { label: '版本状态', render: (item) => renderBadge((item.releaseState || {}).status || item.status) },
      { label: '流量状态', render: (item) => renderReleaseTrafficSummary(item.traffic || {}) },
      { label: '发布后风险', render: (item) => renderReleaseCheckSummary(item) },
      { label: '操作', render: (item) => `<a class="button-link secondary-button" data-link href="/console/releases/${encodeURIComponent(item.releaseId)}">查看详情</a>` },
    ];
  }
  if (view === 'rollback') {
    return [
      {
        label: '版本',
        render: (item) => `
          <div class="cell-stack">
            <a class="primary-link" data-link href="/console/releases/${encodeURIComponent(item.releaseId)}">${escapeHtml(item.version)}</a>
            <span class="subtle">${escapeHtml(item.summary || '未填写摘要')}</span>
          </div>
        `,
      },
      { label: '版本状态', render: (item) => renderBadge((item.releaseState || {}).status || item.status) },
      { label: '流量状态', render: (item) => renderReleaseTrafficSummary(item.traffic || {}) },
      { label: '回滚入口说明', render: () => '进入详情页查看回滚相关信息和执行回滚' },
      { label: '操作', render: (item) => `<a class="button-link secondary-button" data-link href="/console/releases/${encodeURIComponent(item.releaseId)}">查看详情</a>` },
    ];
  }
  return [
    {
      label: '版本',
      render: (item) => `
        <div class="cell-stack">
          <a class="primary-link" data-link href="/console/releases/${encodeURIComponent(item.releaseId)}">${escapeHtml(item.version)}</a>
          <span class="subtle">词条数：${escapeHtml(String(item.termCount))}</span>
          <span class="subtle">${escapeHtml(item.summary || '未填写摘要')}</span>
        </div>
      `,
    },
    { label: '版本状态', render: (item) => `
      <div class="cell-stack">
        <div class="inline-badge-row">
          ${renderBadge((item.releaseState || {}).status || item.status)}
          ${renderReleaseIdentityFlags(item)}
        </div>
        <div class="subtle">${escapeHtml(releaseVersionDescriptor(item).detail)}</div>
      </div>
    ` },
    { label: '发布审批', render: (item) => renderReleaseApprovalSummary(item.approval || {}) },
    { label: '流量状态', render: (item) => renderReleaseTrafficSummary(item.traffic || {}) },
    { label: '版本校验 / 风险', render: (item) => renderReleaseCheckSummary(item) },
    { label: '创建时间', render: (item) => escapeHtml(formatDateTime(item.createdAt)) },
    { label: '操作', render: (item) => `<a class="button-link secondary-button" data-link href="/console/releases/${encodeURIComponent(item.releaseId)}">查看详情</a>` },
  ];
}

/**
 * 功能：构造版本列表当前使用的查询状态。
 * 输入：可选查询参数对象。
 * 输出：版本列表查询状态对象。
 */
function normalizeReleaseListQueryState(params = {}) {
  const view = normalizeReleaseListView(params.view);
  return {
    view,
    page: normalizePage(params.page),
    status: String(params.status || '').trim(),
  };
}

/**
 * 功能：根据版本列表查询状态拉取当前结果集。
 * 输入：版本列表查询状态对象。
 * 输出：包含分页结果的对象。
 */
async function fetchReleaseListViewData(state = {}) {
  const queryState = normalizeReleaseListQueryState(state);
  const pageSize = 10;
  const data = await fetchJson(`/api/console/releases?page=${encodeURIComponent(queryState.page)}&pageSize=${pageSize}&status=${encodeURIComponent(queryState.status)}&view=${encodeURIComponent(queryState.view)}`);
  return {
    ...queryState,
    data,
    items: data.items || [],
    summary: data.summary || {},
    filteredSummary: data.filteredSummary || {},
    viewMeta: releaseListViewMeta(queryState.view),
    releaseColumns: releaseColumnsForView(queryState.view),
  };
}

/**
 * 功能：渲染版本列表页的结果区块。
 * 输入：版本列表视图数据对象。
 * 输出：结果区块 HTML。
 */
function renderReleaseResultsSurface(view = {}) {
  const data = view.data || {};
  const items = view.items || [];
  const filteredSummary = view.filteredSummary || {};
  const viewMeta = view.viewMeta || releaseListViewMeta(view.view || 'list');
  return `
    <section id="releaseResultsSurface" class="surface-block">
      <div class="surface-head">
        <div>
          <h3 class="surface-title">${escapeHtml(viewMeta.sectionTitle)}结果</h3>
          <div class="surface-desc">当前视图筛选后共 ${escapeHtml(String(data.total || 0))} 个版本，当前页展示 ${escapeHtml(String(items.length))} 个。${escapeHtml(viewMeta.helpText)}</div>
        </div>
      </div>
      <div class="review-summary-strip">
        <div class="summary-chip">当前视图：${escapeHtml(viewMeta.title)}</div>
        <div class="summary-chip">筛选结果：${escapeHtml(String(data.total || 0))}</div>
        <div class="summary-chip">当前页：${escapeHtml(String(items.length))}</div>
        <div class="summary-chip">已构建：${escapeHtml(String(filteredSummary.builtCount || 0))}</div>
        <div class="summary-chip">灰度中：${escapeHtml(String(filteredSummary.canaryCount || 0))}</div>
        <div class="summary-chip">已发布：${escapeHtml(String(filteredSummary.publishedCount || 0))}</div>
      </div>
      ${renderDenseTable(view.releaseColumns || releaseColumnsForView(view.view || 'list'), items, '当前视图下没有版本记录。', { scrollSizeClass: 'panel-scroll-large', collapseThreshold: 8, collapsedSummary: `${viewMeta.title}结果较多，默认收起明细` })}
      ${renderPagination('/releases', { status: view.status, view: view.view === 'list' ? '' : view.view }, data)}
    </section>
  `;
}

/**
 * 功能：只刷新版本列表页的结果区块，并同步 URL。
 * 输入：版本列表查询状态对象。
 * 输出：无显式返回；直接更新结果区块。
 */
async function refreshReleaseResultsOnly(params = {}) {
  const view = await fetchReleaseListViewData(params);
  const resultSurface = document.getElementById('releaseResultsSurface');
  if (resultSurface) {
    resultSurface.outerHTML = renderReleaseResultsSurface(view);
  }
  history.pushState({}, '', buildConsoleUrl('/releases', {
    page: view.page > 1 ? view.page : '',
    view: view.view === 'list' ? '' : view.view,
    status: view.status,
  }));
}

/**
 * 功能：从版本列表页的分页链接提取查询状态。
 * 输入：分页链接 href。
 * 输出：版本列表查询状态对象。
 */
function releaseListQueryStateFromHref(href = '') {
  const target = new URL(String(href || '/console/releases'), location.origin);
  return {
    page: target.searchParams.get('page') || 1,
    view: target.searchParams.get('view') || '',
    status: target.searchParams.get('status') || '',
  };
}

/**
 * 功能：构造验证样本列表当前使用的查询状态。
 * 输入：可选查询参数对象。
 * 输出：验证样本列表查询状态对象。
 */
function normalizeValidationCaseListQueryState(params = {}) {
  return {
    page: normalizePage(params.page),
    query: String(params.query || '').trim(),
    sourceType: String(params.sourceType || '').trim(),
    enabled: String(params.enabled || '').trim(),
  };
}

/**
 * 功能：根据验证样本列表查询状态拉取当前结果集。
 * 输入：验证样本列表查询状态对象。
 * 输出：包含分页结果和导出地址的对象。
 */
async function fetchValidationCaseListViewData(state = {}) {
  const queryState = normalizeValidationCaseListQueryState(state);
  const pageSize = 20;
  const data = await fetchJson(`/api/console/validation/cases?page=${encodeURIComponent(queryState.page)}&pageSize=${pageSize}&query=${encodeURIComponent(queryState.query)}&sourceType=${encodeURIComponent(queryState.sourceType)}&enabled=${encodeURIComponent(queryState.enabled)}`);
  return {
    ...queryState,
    data,
    items: data.items || [],
    summary: data.summary || {},
    filteredSummary: data.filteredSummary || {},
    exportUrl: buildApiUrl('/api/console/validation/cases/export', {
      query: queryState.query,
      sourceType: queryState.sourceType,
      enabled: queryState.enabled,
    }),
  };
}

/**
 * 功能：渲染验证样本页的结果区块。
 * 输入：验证样本列表视图数据对象。
 * 输出：结果区块 HTML。
 */
function renderValidationCaseResultsSurface(view = {}) {
  const data = view.data || {};
  const items = view.items || [];
  const filteredSummary = view.filteredSummary || {};
  return `
    <section id="validationCaseResultsSurface" class="surface-block">
      <div class="surface-head">
        <div>
          <h3 class="surface-title">样本结果列表</h3>
          <div class="surface-desc">当前筛选共 ${escapeHtml(String(data.total || 0))} 条样本，当前页展示 ${escapeHtml(String(items.length))} 条；结果列表保持主工作区优先，先看状态、来源和期望标准词，再决定是否进入详情。</div>
        </div>
      </div>
      <div class="review-summary-strip">
        <div class="summary-chip">筛选结果：${escapeHtml(String(data.total || 0))}</div>
        <div class="summary-chip">当前页：${escapeHtml(String(items.length))}</div>
        <div class="summary-chip">启用：${escapeHtml(String(filteredSummary.enabledCount || 0))}</div>
        <div class="summary-chip">停用：${escapeHtml(String(filteredSummary.disabledCount || 0))}</div>
        <div class="summary-chip">外部回流：${escapeHtml(String(filteredSummary.feedbackCount || 0))}</div>
      </div>
      ${renderDenseTable([
        {
          label: '<input type="checkbox" data-toggle-bulk="validation-cases" aria-label="全选当前页样本">',
          render: (item) => `<input type="checkbox" data-bulk-item="validation-cases" value="${escapeHtml(item.caseId)}" aria-label="选择样本 ${escapeHtml(item.caseId)}">`,
        },
        {
          label: '样本',
          render: (item) => `
            <div class="cell-stack">
              <a class="primary-link" data-link href="/console/validation/cases/${encodeURIComponent(item.caseId)}">${escapeHtml(item.caseId)}</a>
              <span class="subtle">${escapeHtml(item.description || '未填写样本说明')}</span>
            </div>
          `,
        },
        { label: '来源类型', render: (item) => escapeHtml(sourceTypeLabel(item.sourceType, item.sourceType || '未记录')) },
        { label: '启用状态', render: (item) => item.enabled ? '<span class="badge success">启用</span>' : '<span class="badge danger">已停用</span>' },
        { label: '期望标准词数', render: (item) => escapeHtml(String((item.expectedCanonicals || []).length)) },
        { label: '更新时间', render: (item) => escapeHtml(formatDateTime(item.updatedAt)) },
      ], items, '当前没有验证样本。', { scrollSizeClass: 'panel-scroll-large', collapseThreshold: 10, collapsedSummary: '验证样本较多，默认收起明细' })}
      ${renderPagination('/validation/cases', { query: view.query, sourceType: view.sourceType, enabled: view.enabled }, data)}
    </section>
  `;
}

/**
 * 功能：只刷新验证样本页的结果区块，并同步 URL。
 * 输入：验证样本列表查询状态对象。
 * 输出：无显式返回；直接更新结果区块。
 */
async function refreshValidationCaseResultsOnly(params = {}) {
  const view = await fetchValidationCaseListViewData(params);
  const resultSurface = document.getElementById('validationCaseResultsSurface');
  if (resultSurface) {
    resultSurface.outerHTML = renderValidationCaseResultsSurface(view);
  }
  const exportAnchor = document.querySelector('[data-validation-export-link]');
  if (exportAnchor) {
    exportAnchor.setAttribute('href', view.exportUrl);
  }
  history.pushState({}, '', buildConsoleUrl('/validation/cases', {
    page: view.page > 1 ? view.page : '',
    query: view.query,
    sourceType: view.sourceType,
    enabled: view.enabled,
  }));
}

/**
 * 功能：从验证样本页的分页链接提取查询状态。
 * 输入：分页链接 href。
 * 输出：验证样本列表查询状态对象。
 */
function validationCaseListQueryStateFromHref(href = '') {
  const target = new URL(String(href || '/console/validation/cases'), location.origin);
  return {
    page: target.searchParams.get('page') || 1,
    query: target.searchParams.get('query') || '',
    sourceType: target.searchParams.get('sourceType') || '',
    enabled: target.searchParams.get('enabled') || '',
  };
}

/**
 * 功能：把不可执行动作渲染为禁用态提示。
 * 输入：标签和提示原因。
 * 输出：禁用态 HTML。
 */
function renderDisabledAction(label, reason = '') {
  return `<span class="button-link secondary-button disabled" title="${escapeHtml(reason)}">${escapeHtml(label)}</span>`;
}

/**
 * 功能：渲染可折叠的技术详情块，避免原始技术信息直接占据主阅读区域。
 * 输入：摘要标题和技术详情文本。
 * 输出：技术详情 HTML；无内容时返回空字符串。
 */
function renderTechnicalDetails(summary = '查看技术详情', content = '') {
  const normalizedContent = String(content || '').trim();
  if (!normalizedContent) {
    return '';
  }
  return `
    <details class="technical-details">
      <summary>${escapeHtml(summary)}</summary>
      <pre class="mono">${escapeHtml(normalizedContent)}</pre>
    </details>
  `;
}

/**
 * 功能：渲染 release gate 明细项，优先展示业务说明，再按需折叠技术细节。
 * 输入：release gate 明细项数组。
 * 输出：可直接嵌入表格单元格的 HTML 字符串。
 */
function renderReleaseGateBlockerItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return '<span class="subtle">当前没有明细。</span>';
  }
  return items.map((item) => {
    const title = escapeHtml(item.title || '发布阻断项');
    const titleHtml = item.href
      ? `<a class="primary-link" data-link href="${escapeHtml(item.href)}">${title}</a>`
      : title;
    const detailHtml = item.detail
      ? `<div class="subtle">${escapeHtml(item.detail)}</div>`
      : '';
    const technicalHtml = item.technicalDetails
      ? renderTechnicalDetails('查看技术详情', JSON.stringify(item.technicalDetails, null, 2))
      : '';
    return `<div>${titleHtml}${detailHtml}${technicalHtml}</div>`;
  }).join('');
}

/**
 * 功能：渲染 release validation 结果中的验证目标入口。
 * 输入：单个 validation 结果对象。
 * 输出：验证目标的 HTML 字符串。
 */
function renderReleaseValidationTarget(item = {}) {
  const label = escapeHtml(item.targetLabel || item.caseId || item.canonicalText || '未标识验证项');
  if (item.targetHref) {
    return `<a class="primary-link" data-link href="${escapeHtml(item.targetHref)}">${label}</a>`;
  }
  return label;
}

/**
 * 功能：渲染 release validation 结果的业务说明与技术详情。
 * 输入：单个 validation 结果对象。
 * 输出：验证说明 HTML 字符串。
 */
function renderReleaseValidationResultDetail(item = {}) {
  const detailHtml = item.resultDetail
    ? `<div>${escapeHtml(item.resultDetail)}</div>`
    : '';
  const reasonHtml = item.reasonLabel
    ? `<div class="subtle">${escapeHtml(item.reasonLabel)}</div>`
    : '';
  const technicalHtml = item.technicalDetails
    ? renderTechnicalDetails('查看技术详情', JSON.stringify(item.technicalDetails, null, 2))
    : '';
  return `${detailHtml}${reasonHtml}${technicalHtml}`;
}

/**
 * 功能：根据 release confirmation 状态返回提示卡样式。
 * 输入：确认状态值。
 * 输出：提示卡 CSS 类名。
 */
function releaseConfirmationCalloutClass(status = '') {
  const normalized = String(status || '').trim();
  if (normalized === 'blocked') {
    return 'callout danger';
  }
  if (normalized === 'warning') {
    return 'callout warning';
  }
  if (normalized === 'success') {
    return 'callout success';
  }
  return 'callout';
}

/**
 * 功能：判断当前 release 是否已经处于正式发布状态。
 * 输入：release 详情或摘要对象。
 * 输出：布尔值。
 */
function isPublishedRelease(item = {}) {
  return String(((item.releaseState || {}).status || item.status || '')).trim() === 'published';
}

/**
 * 功能：根据当前 release 状态返回“发布门禁”或“发布后风险”主标题。
 * 输入：release 详情或摘要对象。
 * 输出：中文标题字符串。
 */
function releaseRiskSectionTitle(item = {}) {
  return isPublishedRelease(item) ? '发布后风险' : '版本校验';
}

/**
 * 功能：根据当前 release 状态返回“发布门禁”或“发布后风险”说明文案。
 * 输入：release 详情或摘要对象。
 * 输出：中文说明字符串。
 */
function releaseRiskSectionDescription(item = {}) {
  return isPublishedRelease(item)
    ? '当前版本已正式发布，这里用于持续观察发布后风险，不再作为版本状态的一部分混读。'
    : '如果这里未通过，当前版本不应继续升级到灰度或正式发布。这里的结果只基于当前 release 快照本身。';
}

/**
 * 功能：为 release confirmation 生成当前页面的优先处理建议。
 * 输入：release 详情对象。
 * 输出：包含标题、说明、入口链接和按钮文案的建议对象。
 */
function releaseConfirmationGuidance(item = {}) {
  const confirmation = item.confirmation || {};
  const issues = Array.isArray(confirmation.issues) ? confirmation.issues : [];
  const primaryIssue = issues.find((entry) => String(entry.severity || '').trim() === 'blocked') || issues[0] || null;
  if (primaryIssue) {
    let actionLabel = '前往处理';
    if (String(primaryIssue.href || '').trim() === '/console/runtime-nodes') {
      actionLabel = '查看运行节点';
    } else if (String(primaryIssue.href || '').trim() === `/console/releases/${encodeURIComponent(((item.release || {}).releaseId) || '')}`) {
      actionLabel = '查看当前版本详情';
    }
    return {
      title: `建议先处理：${primaryIssue.title || '当前异常项'}`,
      description: primaryIssue.detail || '请先处理当前确认链路中的首要异常项。',
      href: primaryIssue.href || '',
      actionLabel,
      status: confirmation.status || 'warning',
    };
  }
  if (confirmation.status === 'success') {
    return {
      title: '当前版本已完成主要确认项',
      description: isPublishedRelease(item)
        ? '当前正式版本没有新增发布后风险；后续可继续关注运行节点趋势与验证证据。'
        : '升级前置条件、验证结果和节点收敛当前没有阻断项；后续可继续推进下发、灰度或正式发布。',
      href: '/console/runtime-nodes',
      actionLabel: '查看运行节点',
      status: 'success',
    };
  }
  return {
    title: '建议继续检查发布确认细项',
    description: isPublishedRelease(item)
      ? '请继续核对发布后风险、节点收敛和验证证据，确认当前正式版本是否需要处置或回滚。'
      : '请继续核对升级前置条件、节点收敛和验证证据，确认当前版本是否适合继续推进。',
    href: '',
    actionLabel: '',
    status: confirmation.status || 'warning',
  };
}

/**
 * 功能：根据 release 状态、审批和门禁结果生成阶段摘要。
 * 输入：release 列表项或详情中的 release 概要对象。
 * 输出：包含阶段标题、说明和强调色的摘要对象。
 */
function releaseStageDescriptor(item = {}) {
  const status = String(((item.releaseState || {}).status || item.status || '')).trim();
  const approvalStatus = String((((item || {}).approval) || {}).status || '').trim();
  const releaseCheck = isPublishedRelease(item) ? (((item || {}).postPublishRisk) || {}) : (((item || {}).releaseCheck) || ((item || {}).gate) || {});
  const blockerCount = Number(releaseCheck.blockerCount || releaseCheck.issueCount || 0);
  if (releaseCheck.blocked || releaseCheck.active) {
    return {
      title: status === 'published' ? '存在发布后风险' : '版本校验未通过',
      detail: blockerCount > 0
        ? (status === 'published' ? `当前已有 ${blockerCount} 个发布后风险项。` : `当前还有 ${blockerCount} 个版本校验阻断项。`)
        : (status === 'published' ? '当前已发现发布后风险。' : '当前版本校验尚未通过。'),
      toneClass: 'badge danger',
    };
  }
  if (approvalStatus && approvalStatus !== 'approved') {
    return {
      title: approvalStatus === 'rejected' ? '审核未通过' : '等待审核通过',
      detail: approvalStatus === 'partially_approved'
        ? '当前版本已有部分审核通过，仍需补齐剩余审批。'
        : '当前版本还不能继续发布，需先完成审核流程。',
      toneClass: approvalStatus === 'rejected' ? 'badge danger' : 'badge warning',
    };
  }
  if (status === 'canary') {
    return {
      title: '灰度观察中',
      detail: '当前版本已进入灰度阶段，继续关注升级前置条件、运行节点收敛与验证结果。',
      toneClass: 'badge warning',
    };
  }
  if (status === 'published') {
    return {
      title: '已正式发布',
      detail: '当前版本已进入正式版；后续主要关注发布后风险、运行节点与验证结果。',
      toneClass: 'badge success',
    };
  }
  if (status === 'built') {
    return {
      title: '候选快照已就绪',
      detail: '当前版本已构建完成。构建阶段本身不受词典建设域历史门禁反向阻断；后续能否进入灰度或正式发布，取决于版本校验和发布审核是否通过。',
      toneClass: 'badge success',
    };
  }
  return {
    title: displayLabel(status) || status || '版本状态',
    detail: '请结合审批、版本校验/发布后风险和运行节点收敛状态继续判断下一步。',
    toneClass: 'badge',
  };
}

/**
 * 功能：只根据 release 自身状态生成版本状态说明，不混入审批或门禁语义。
 * 输入：releaseState 或包含 status 的对象。
 * 输出：版本状态摘要对象。
 */
function releaseVersionDescriptor(item = {}) {
  const status = String(((item.releaseState || {}).status || item.status || '')).trim();
  if (status === 'published') {
    return {
      title: '当前正式稳定版本',
      detail: '该版本当前处于正式发布状态。',
    };
  }
  if (status === 'canary') {
    return {
      title: '当前灰度目标版本',
      detail: '该版本当前处于 canary 状态。',
    };
  }
  if (status === 'built') {
    return {
      title: '已构建完成',
      detail: '该版本是候选快照，可继续提审、下发或进入灰度。',
    };
  }
  return {
    title: displayLabel(status) || status || '版本状态',
    detail: '请结合当前状态继续判断下一步。',
  };
}

/**
 * 功能：返回 release 的当前身份标记，例如“当前正式”或“当前灰度”。
 * 输入：release 列表项或详情对象。
 * 输出：徽标 HTML 字符串。
 */
function renderReleaseIdentityFlags(item = {}) {
  const releaseState = item.releaseState || {};
  const flags = [];
  if (releaseState.isCurrentPublished) {
    flags.push(renderToneBadge('当前正式', 'success'));
  }
  if (releaseState.isCurrentCanary) {
    flags.push(renderToneBadge('当前灰度', 'warning'));
  }
  return flags.join(' ');
}

/**
 * 功能：构造 release 流量状态的展示摘要。
 * 输入：traffic 状态对象。
 * 输出：包含文案与语义色的摘要对象。
 */
function releaseTrafficDescriptor(traffic = {}) {
  const percentage = Number(traffic.percentage || 0);
  if (traffic.grayEnabled && traffic.isCurrentCanary) {
    return {
      label: '灰度生效中',
      tone: 'success',
      detail: percentage > 0 ? `当前灰度指向本版本，比例 ${percentage}%` : '当前灰度指向本版本。',
    };
  }
  if (traffic.grayEnabled) {
    return {
      label: '灰度生效中',
      tone: 'warning',
      detail: percentage > 0 ? `当前灰度指向其他版本，比例 ${percentage}%` : '当前灰度指向其他版本。',
    };
  }
  if (String(traffic.status || '').trim() === 'gray_closed') {
    return {
      label: '灰度已关闭',
      tone: 'warning',
      detail: '当前没有启用中的灰度策略。',
    };
  }
  return {
    label: '当前无灰度',
    tone: 'neutral',
    detail: '当前没有启用中的灰度策略。',
  };
}

/**
 * 功能：渲染 release 的审批状态摘要。
 * 输入：approval 对象。
 * 输出：审批摘要 HTML。
 */
function renderReleaseApprovalSummary(approval = {}) {
  const approvedCount = Number(approval.approvedCount || 0);
  const requiredApprovals = Math.max(1, Number(approval.requiredApprovals || 1));
  return `
    <div class="cell-stack">
      <div class="inline-badge-row">${renderBadge(approval.status || 'not_submitted')}</div>
      <div class="subtle">已通过 ${escapeHtml(String(approvedCount))} / 要求 ${escapeHtml(String(requiredApprovals))}</div>
      ${approval.taskId ? `<div class="subtle mono">${escapeHtml(approval.taskId)}</div>` : '<div class="subtle">当前无审核任务</div>'}
    </div>
  `;
}

/**
 * 功能：渲染 release 的流量状态摘要。
 * 输入：traffic 对象。
 * 输出：流量摘要 HTML。
 */
function renderReleaseTrafficSummary(traffic = {}) {
  const descriptor = releaseTrafficDescriptor(traffic);
  const suffix = traffic.grayEnabled && traffic.scopeType
    ? ` / ${escapeHtml(traffic.scopeType)}`
    : '';
  return `
    <div class="cell-stack">
      <div class="inline-badge-row">${renderToneBadge(descriptor.label, descriptor.tone)}</div>
      <div class="subtle">${escapeHtml(descriptor.detail)}${suffix}</div>
    </div>
  `;
}

/**
 * 功能：把 release 列表中的阶段信息渲染为稳定阅读区块。
 * 输入：release 列表项对象。
 * 输出：阶段信息 HTML。
 */
function renderReleaseStageSummary(item = {}) {
  const descriptor = releaseStageDescriptor(item);
  const riskTitle = releaseRiskSectionTitle(item);
  const riskState = isPublishedRelease(item) ? (item.postPublishRisk || {}) : ((item.releaseCheck || item.gate || {}));
  return `
    <div class="cell-stack stage-stack">
      <div class="inline-badge-row">
        ${renderBadge((item.releaseState || {}).status || item.status)}
        ${renderReleaseIdentityFlags(item)}
      </div>
      <div class="stage-summary-title">${escapeHtml(descriptor.title)}</div>
      <div class="subtle">${escapeHtml(descriptor.detail)}</div>
      <div class="subtle">审批：${escapeHtml(displayLabel((((item || {}).approval) || {}).status || 'not_submitted'))} / ${escapeHtml(riskTitle)}：${riskState.blocked || riskState.active ? '存在阻断' : '已通过'}</div>
    </div>
  `;
}

/**
 * 功能：渲染 release 的版本校验或发布后风险摘要。
 * 输入：release 列表项对象。
 * 输出：状态摘要 HTML。
 */
function renderReleaseCheckSummary(item = {}) {
  const riskTitle = releaseRiskSectionTitle(item);
  const riskState = isPublishedRelease(item) ? (item.postPublishRisk || {}) : ((item.releaseCheck || item.gate || {}));
  const blockerCount = Number(riskState.blockerCount || riskState.issueCount || 0);
  return `
    <div class="cell-stack">
      <div class="inline-badge-row">${riskState.blocked || riskState.active ? '<span class="badge danger">存在阻断</span>' : '<span class="badge success">已通过</span>'}</div>
      <div class="subtle">${escapeHtml(riskTitle)}：${blockerCount > 0 ? `${blockerCount} 项` : '当前无阻断'}</div>
    </div>
  `;
}

/**
 * 功能：渲染审核中心中 release publish review 的三层状态摘要。
 * 输入：release target summary 对象。
 * 输出：状态摘要 HTML；非 release 目标时返回空字符串。
 */
function renderReviewReleaseLayerSummary(summary = {}) {
  if (!summary || !summary.releaseState) {
    return '';
  }
  const traffic = releaseTrafficDescriptor(summary.traffic || {});
  return `
    <div class="summary-list" style="margin-top:8px;">
      <div class="summary-row"><span class="subtle">版本状态</span><span>${renderBadge(summary.releaseState.status || '')}</span></div>
      <div class="summary-row"><span class="subtle">审批状态</span><span>${renderBadge((((summary || {}).approval) || {}).status || 'not_submitted')}</span></div>
      <div class="summary-row"><span class="subtle">流量状态</span><span>${renderToneBadge(traffic.label, traffic.tone)}</span></div>
    </div>
  `;
}

/**
 * 功能：判断当前身份是否拥有指定页面访问权。
 * 输入：页面 key。
 * 输出：具备访问权时返回 `true`，否则返回 `false`。
 */
function hasPageAccess(pageKey = '') {
  if (!pageKey) {
    return true;
  }
  return Boolean((currentAccessMeta && currentAccessMeta.pageAccess || {})[pageKey]);
}

/**
 * 功能：判断当前身份是否拥有指定页面功能点。
 * 输入：功能点 key。
 * 输出：具备功能权限时返回 `true`，否则返回 `false`。
 */
function hasPageFeature(featureKey) {
  return Boolean((currentAccessMeta && currentAccessMeta.pageFeatures || []).some((item) => item.featureKey === featureKey));
}

/**
 * 功能：按页面功能权限渲染可执行动作或禁用提示。
 * 输入：功能点 key、允许态 HTML、按钮标签和禁用原因。
 * 输出：最终动作 HTML。
 */
function renderFeatureAction(featureKey, allowedHtml, label, reason) {
  return hasPageFeature(featureKey) ? allowedHtml : renderDisabledAction(label, reason || '当前身份无此页面功能权限。');
}

/**
 * 功能：把工作台事项数组渲染为可复用的事项列表内容。
 * 输入：事项数组、空态文案和滚动容器尺寸类名。
 * 输出：事项列表 HTML。
 */
function renderWorkbenchList(items = [], emptyText = '当前没有待处理事项。', scrollSizeClass = 'panel-scroll-medium') {
  const normalizedItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!normalizedItems.length) {
    return renderEmptyState(emptyText);
  }
  return renderScrollableBlock(`
    <div class="workbench-list">
      ${normalizedItems.map((item) => `
        <article class="workbench-item">
          <div class="workbench-item-main">
            <div class="workbench-item-head">
              ${item.href ? `<a class="primary-link" data-link href="${escapeHtml(item.href)}">${escapeHtml(item.title || '未命名事项')}</a>` : `<span>${escapeHtml(item.title || '未命名事项')}</span>`}
              ${item.status ? renderBadge(item.status) : ''}
            </div>
            ${item.subtitle ? `<div class="workbench-item-subtitle">${escapeHtml(item.subtitle)}</div>` : ''}
            ${item.detail ? `<div class="workbench-item-detail">${escapeHtml(item.detail)}</div>` : ''}
          </div>
        </article>
      `).join('')}
    </div>
  `, scrollSizeClass);
}

/**
 * 功能：把工作台事项列表渲染为首页分组区块。
 * 输入：分组标题、副标题、事项数组、空态文本、页级访问 key 和可选展示配置。
 * 输出：工作台区块 HTML。
 */
function renderWorkbenchSection(title, description, items = [], emptyText = '当前没有待处理事项。', pageKey = '', options = {}) {
  if (pageKey && !hasPageAccess(pageKey)) {
    return '';
  }
  const normalizedItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (options.hideWhenEmpty && !normalizedItems.length) {
    return '';
  }
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <h2 class="section-title">${escapeHtml(title)}</h2>
          <div class="section-desc">${escapeHtml(description)}</div>
        </div>
      </div>
      ${renderWorkbenchList(normalizedItems, emptyText, String(options.scrollSizeClass || 'panel-scroll-medium').trim() || 'panel-scroll-medium')}
    </section>
  `;
}

/**
 * 功能：把工作台优先事项摘要渲染为首页可点击卡片。
 * 输入：优先事项数组。
 * 输出：优先事项区块 HTML。
 */
function renderWorkbenchHighlights(items = []) {
  const normalizedItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!normalizedItems.length) {
    return renderEmptyState('当前没有需要优先处理的事项，可直接从快速入口进入目标页面。');
  }
  return `
    <div class="priority-list">
      ${normalizedItems.map((item) => `
        <article class="priority-item">
          <div class="priority-item-head">
            <div class="priority-item-title">${escapeHtml(item.title || '当前优先事项')}</div>
            <span class="summary-chip">${escapeHtml(String(item.count || 0))} 项</span>
          </div>
          <div class="priority-item-desc">${escapeHtml(item.description || '请优先进入对应页面处理当前事项。')}</div>
          <div class="priority-item-actions">
            ${item.status ? renderBadge(item.status) : ''}
            ${item.href ? `<a class="primary-link" data-link href="${escapeHtml(item.href)}">前往处理</a>` : ''}
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

/**
 * 功能：确保首页纠错演示状态具有完整默认值。
 * 输入：无。
 * 输出：当前首页纠错演示状态对象。
 */
function currentOverviewSimulationState() {
  if (!overviewSimulationState || typeof overviewSimulationState !== 'object') {
    overviewSimulationState = {};
  }
  overviewSimulationState = {
    text: String(overviewSimulationState.text || DEFAULT_OVERVIEW_SIMULATION_TEXT),
    trafficKey: String(overviewSimulationState.trafficKey || DEFAULT_OVERVIEW_SIMULATION_TRAFFIC_KEY),
    lastResult: overviewSimulationState.lastResult || null,
    lastError: String(overviewSimulationState.lastError || ''),
    updatedAt: String(overviewSimulationState.updatedAt || ''),
  };
  return overviewSimulationState;
}

function currentRuntimeVerifyState() {
  if (!runtimeVerifyState || typeof runtimeVerifyState !== 'object') {
    runtimeVerifyState = {};
  }
  runtimeVerifyState = {
    text: String(runtimeVerifyState.text || DEFAULT_OVERVIEW_SIMULATION_TEXT),
    trafficKey: String(runtimeVerifyState.trafficKey || DEFAULT_OVERVIEW_SIMULATION_TRAFFIC_KEY),
    lastCorrectResult: runtimeVerifyState.lastCorrectResult || null,
    lastCorrectCandResult: runtimeVerifyState.lastCorrectCandResult || null,
    lastError: String(runtimeVerifyState.lastError || ''),
    updatedAt: String(runtimeVerifyState.updatedAt || ''),
  };
  return runtimeVerifyState;
}

/**
 * 功能：把首页纠错演示结果渲染为结构化区块。
 * 输入：纠错结果对象。
 * 输出：结果区块 HTML。
 */
function renderOverviewSimulationResult(result = null) {
  if (!result) {
    return renderEmptyState('输入一句业务文本后执行试跑，这里会展示纠错结果、命中项和候选项。');
  }
  const matches = result.matches || [];
  const candidates = result.candidates || [];
  const blocked = result.blocked || [];
  return `
    <div class="demo-result-stack">
      <div class="grid cards compact">
        ${metricCard('命中替换', matches.length)}
        ${metricCard('候选提示', candidates.length)}
        ${metricCard('阻断项', blocked.length)}
        ${metricCard('命中路由', displayLabel(result.route) || result.route || '正式')}
      </div>
      <section class="callout success">
        <h3 class="callout-title">纠错结果</h3>
        <div class="demo-diff">
          <div class="demo-diff-row">
            <span class="subtle">输入文本</span>
            <div>${escapeHtml(result.rawText || '')}</div>
          </div>
          <div class="demo-diff-row">
            <span class="subtle">纠错输出</span>
            <div class="demo-corrected-text">${escapeHtml(result.correctedText || '')}</div>
          </div>
          <div class="demo-diff-row">
            <span class="subtle">版本</span>
            <div class="mono">${escapeHtml(result.dictVersion || '未记录')}</div>
          </div>
          <div class="demo-diff-row">
            <span class="subtle">trafficKey / bucket</span>
            <div class="mono">${escapeHtml(result.trafficKey || '未记录')} / ${escapeHtml(String(result.bucket == null ? '未记录' : result.bucket))}</div>
          </div>
        </div>
      </section>
      ${matches.length ? `
        <section class="panel panel-soft">
          <h3 class="section-title">命中替换项</h3>
          ${renderDenseTable([
            { label: '原文本', render: (item) => escapeHtml(item.orig || '') },
            { label: '标准词', render: (item) => `<span class="mono">${escapeHtml(item.canonical || '')}</span>` },
            { label: '通道', render: (item) => renderBadge(item.channel || 'literal') },
            { label: '置信度', render: (item) => escapeHtml(String(item.confidence == null ? '' : item.confidence)) },
          ], matches, '当前没有替换命中。', { scrollSizeClass: 'panel-scroll-small', collapseThreshold: 8, collapsedSummary: '命中替换项较多，默认收起明细' })}
        </section>
      ` : ''}
      ${candidates.length ? `
        <section class="panel panel-soft">
          <h3 class="section-title">候选提示项</h3>
          ${renderDenseTable([
            { label: '原文本', render: (item) => escapeHtml(item.orig || '') },
            { label: '候选标准词', render: (item) => `<span class="mono">${escapeHtml(item.canonical || '')}</span>` },
            { label: '通道', render: (item) => renderBadge(item.channel || 'pinyin') },
            { label: '原因', render: (item) => escapeHtml((item.reasons || []).join(' / ') || '未记录') },
          ], candidates, '当前没有候选提示。', { scrollSizeClass: 'panel-scroll-small', collapseThreshold: 8, collapsedSummary: '候选提示较多，默认收起明细' })}
        </section>
      ` : ''}
      ${blocked.length ? `
        <section class="panel panel-soft">
          <h3 class="section-title">阻断项</h3>
          ${renderDenseTable([
            { label: '原文本', render: (item) => escapeHtml(item.orig || '') },
            { label: '标准词', render: (item) => `<span class="mono">${escapeHtml(item.canonical || '')}</span>` },
            { label: '原因', render: (item) => escapeHtml((item.reasons || []).join(' / ') || '未记录') },
          ], blocked, '当前没有阻断项。', { scrollSizeClass: 'panel-scroll-small', collapseThreshold: 6, collapsedSummary: '阻断项较多，默认收起明细' })}
        </section>
      ` : ''}
    </div>
  `;
}

function renderCorrectedTextsResult(correctedTexts = []) {
  const items = Array.isArray(correctedTexts)
    ? correctedTexts.filter((entry) => String(entry || '').trim()).map((entry, index) => ({ rank: index + 1, text: entry }))
    : [];
  if (!items.length) {
    return renderEmptyState('执行接口验证后，这里会展示当前返回的整句结果集合。');
  }
  return renderDenseTable([
    { label: '序号', render: (entry) => escapeHtml(String(entry.rank || '')) },
    { label: '整句结果', render: (entry) => `<span class="mono">${escapeHtml(entry.text || '')}</span>` },
  ], items, '当前没有结果。', { scrollSizeClass: 'panel-scroll-small', collapseThreshold: 6, collapsedSummary: '结果较多，默认收起明细' });
}

function renderCorrectedTextResult(result = null) {
  if (!result) {
    return renderEmptyState('执行正式纠错接口后，这里会展示当前主结果。');
  }
  return `
    <section class="callout success">
      <h3 class="callout-title">正式纠错输出</h3>
      <div class="demo-diff">
        <div class="demo-diff-row">
          <span class="subtle">输入文本</span>
          <div>${escapeHtml(result.inputText || '')}</div>
        </div>
        <div class="demo-diff-row">
          <span class="subtle">纠错输出</span>
          <div class="demo-corrected-text">${escapeHtml(result.correctedText || '')}</div>
        </div>
        <div class="demo-diff-row">
          <span class="subtle">trafficKey</span>
          <div class="mono">${escapeHtml(result.trafficKey || '未记录')}</div>
        </div>
      </div>
    </section>
  `;
}

function renderOverviewRuntimeVerifyEntry(runtimeCurrent = {}) {
  if (!hasPageFeature('runtimeVerify.view')) {
    return '';
  }
  const stableVersion = (((runtimeCurrent || {}).stable) || {}).version || '未加载';
  const canaryVersion = (((runtimeCurrent || {}).canary) || {}).version || '当前无灰度';
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <h2 class="section-title">运行验证</h2>
          <div class="section-desc">正式纠错验证已拆到独立页面，避免在工作台堆叠重交互。</div>
        </div>
      </div>
      <div class="summary-list" style="margin-bottom:14px;">
        <div class="summary-row"><span class="subtle">正式版本</span><span class="mono">${escapeHtml(stableVersion)}</span></div>
        <div class="summary-row"><span class="subtle">灰度版本</span><span class="mono">${escapeHtml(canaryVersion)}</span></div>
      </div>
      <div class="inline-actions">
        <a class="button-link" data-link href="/console/runtime-verify">前往运行验证</a>
      </div>
    </section>
  `;
}

/**
 * 功能：渲染首页“输入与纠错演示”区块。
 * 输入：runtime 当前版本对象。
 * 输出：演示区块 HTML。
 */
function renderOverviewSimulationPanel(runtimeCurrent = {}) {
  if (!hasPageFeature('overview.runtimeDemo.view')) {
    return '';
  }
  const demoState = currentOverviewSimulationState();
  const stableVersion = (((runtimeCurrent || {}).stable) || {}).version || '未加载';
  const canaryVersion = (((runtimeCurrent || {}).canary) || {}).version || '当前无灰度';
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <h2 class="section-title">输入与纠错演示</h2>
          <div class="section-desc">可直接输入一句业务文本，现场展示当前运行版本的纠错效果。</div>
        </div>
      </div>
      <div class="summary-list" style="margin-bottom:14px;">
        <div class="summary-row"><span class="subtle">正式版本</span><span class="mono">${escapeHtml(stableVersion)}</span></div>
        <div class="summary-row"><span class="subtle">灰度版本</span><span class="mono">${escapeHtml(canaryVersion)}</span></div>
        <div class="summary-row"><span class="subtle">上次试跑</span><span>${escapeHtml(formatDateTime(demoState.updatedAt || ''))}</span></div>
      </div>
      <form data-action="run-overview-simulation" class="form-grid">
        ${textareaField({
          label: '演示输入文本',
          name: 'text',
          value: demoState.text,
          placeholder: '输入一段包含错误词或近音词的业务文本',
          help: '建议使用包含错词、近音词或道路/机构名称的句子，现场效果更明显。',
        })}
        ${inputField({
          label: 'trafficKey',
          name: 'trafficKey',
          value: demoState.trafficKey,
          placeholder: '例如：console-demo-001',
          help: '若存在灰度策略，相同 trafficKey 会稳定命中同一流量桶。',
        })}
        <div class="form-actions">
          ${renderFeatureAction('overview.runtimeDemo.run', '<button type="submit">执行试跑</button>', '执行试跑', '当前身份不能执行首页纠错试跑。')}
        </div>
      </form>
      ${demoState.lastError ? `
        <section class="callout danger" style="margin-top:14px;">
          <h3 class="callout-title">试跑失败</h3>
          <p>${escapeHtml(demoState.lastError)}</p>
        </section>
      ` : ''}
      <div style="margin-top:14px;">
        ${renderOverviewSimulationResult(demoState.lastResult)}
      </div>
    </section>
  `;
}

const ACTION_FEATURE_MAP = {
  'navigate-console': '',
  'run-overview-simulation': 'overview.runtimeDemo.run',
  'run-runtime-verify-correct': 'runtimeVerify.correct',
  'run-runtime-verify-correct-cand': 'runtimeVerify.correctCand',
  'create-runtime-node-registry': 'runtimeNodeRegistry.manage',
  'update-runtime-node-registry': 'runtimeNodeRegistry.manage',
  'enable-runtime-node-registry': 'runtimeNodeRegistry.manage',
  'disable-runtime-node-registry': 'runtimeNodeRegistry.manage',
  'rotate-runtime-node-secret': 'runtimeNodeRegistry.manage',
  'create-business-property': 'businessProperties.manage',
  'update-business-property': 'businessProperties.manage',
  'enable-business-property': 'businessProperties.manage',
  'disable-business-property': 'businessProperties.manage',
  'delete-business-property': 'businessProperties.manage',
  'create-source-type': 'businessProperties.manage',
  'update-source-type': 'businessProperties.manage',
  'enable-source-type': 'businessProperties.manage',
  'disable-source-type': 'businessProperties.manage',
  'create-system-user': 'users.manage',
  'update-system-user': 'users.manage',
  'create-system-role': 'roles.manage',
  'update-system-role': 'roles.manage',
  'update-governance-policies': 'governance.manage',
  'create-term': 'terms.create',
  'bulk-term-action': 'terms.bulk.submitReview',
  'update-term-basic': 'terms.detail.editBasic',
  'update-term-rules': 'terms.detail.editRules',
  'update-term-pinyin': 'terms.detail.editPinyin',
  'submit-term-review': 'terms.review.submit',
  'disable-term': 'terms.disable',
  'generate-pinyin-candidates': 'terms.pinyin.generate',
  'submit-pinyin-candidate': 'terms.pinyin.submit',
  'create-import-job': 'import.write',
  'confirm-import-job': 'import.confirm',
  'cancel-import-job': 'import.cancel',
  'bulk-review-action': 'reviews.bulk.approve',
  'approve-review': 'reviews.approve',
  'reject-review': 'reviews.reject',
  'build-release': 'releases.build',
  'submit-release-review': 'releases.submitReview',
  'rollout-release': 'releases.rollout',
  'canary-release': 'releases.canary',
  'reissue-runtime-rollout': 'releases.rollout',
  'publish-release': 'releases.publish',
  'rollback-release': 'releases.rollback',
  'create-validation-case': 'validation.write',
  'import-validation-cases': 'validation.import',
  'disable-validation-case': 'validation.disable',
  'bulk-validation-case-action': 'validation.bulk.disable',
};

/**
 * 功能：汇总当前发布审核任务在前端需要展示的审批护栏与提示文案。
 * 输入：审核任务对象。
 * 输出：包含是否阻断、阻断原因、提示文案和当前审批进度的对象。
 */
function getReleaseReviewApprovalGuard(item = {}) {
  const fallback = {
    blocked: false,
    reason: '',
    buttonMessage: '',
    calloutTitle: '',
    calloutMessage: '',
    hintMessage: '',
    requiredApprovals: 1,
    approvedCount: 0,
    approvedReviewers: [],
  };
  const currentOperator = operatorInput.value.trim() || 'console_user';
  const isPendingReleaseReview = item.status === 'pending'
    && item.targetType === 'release'
    && item.taskType === 'release_publish_review';
  if (!isPendingReleaseReview) {
    return fallback;
  }
  const snapshot = item.targetSnapshot || {};
  const approvalPolicy = snapshot.approvalPolicy || {};
  const approvalSummary = snapshot.approvalSummary || {};
  const governancePolicy = snapshot.governancePolicy || {};
  const approvedReviewers = Array.isArray(approvalSummary.approvedReviewers)
    ? approvalSummary.approvedReviewers
      .map((reviewer) => String(reviewer || '').trim())
      .filter(Boolean)
    : [];
  const requiredApprovals = Math.max(1, Number(approvalPolicy.requiredApprovals || approvalSummary.requiredApprovals || 1));
  const approvedCount = Math.max(Number(approvalSummary.approvedCount || 0), approvedReviewers.length);
  const remainingApprovals = Math.max(requiredApprovals - approvedCount, 0);
  const approvedReviewerText = approvedReviewers.length ? approvedReviewers.join('、') : '暂无';

  if (governancePolicy.submitterReviewerSeparationRequired !== false && String(item.submittedBy || '') === currentOperator) {
    return {
      blocked: true,
      reason: 'submitter_conflict',
      buttonMessage: '当前发布审核要求提交人与审核人不同，请切换为其他操作人。',
      calloutTitle: '当前不可直接审核通过',
      calloutMessage: '该任务属于发布审核，系统要求提交人与审核人为不同操作人。请先切换顶部“当前操作人”，再执行审核通过。',
      hintMessage: requiredApprovals > 1 ? `当前版本需要 ${requiredApprovals} 位不同审核人完成审批。` : '',
      requiredApprovals,
      approvedCount,
      approvedReviewers,
    };
  }

  if (
    governancePolicy.distinctApprovalReviewersRequired !== false
    && requiredApprovals > 1
    && approvedReviewers.includes(currentOperator)
    && remainingApprovals > 0
  ) {
    return {
      blocked: true,
      reason: 'duplicate_reviewer',
      buttonMessage: '当前版本还需要不同审核人继续审批；当前操作人已在已通过审核人名单中，请切换其他审核人。',
      calloutTitle: '当前不可重复审核通过',
      calloutMessage: `该版本当前已由 ${approvedReviewerText} 审核通过，剩余审批必须由不同审核人完成。请先切换顶部“当前操作人”，再执行审核通过。`,
      hintMessage: `当前版本仍需 ${remainingApprovals} 位不同审核人继续审批。`,
      requiredApprovals,
      approvedCount,
      approvedReviewers,
    };
  }

  let hintMessage = '';
  if (requiredApprovals > 1) {
    if (approvedCount > 0 && remainingApprovals > 0) {
      hintMessage = `当前版本仍需 ${remainingApprovals} 位不同审核人继续审批；已通过：${approvedReviewerText}。`;
    } else if (approvedCount === 0) {
      hintMessage = `当前版本属于双人发布审核，需 ${requiredApprovals} 位不同审核人依次通过。`;
    }
  }

  return {
    blocked: false,
    reason: '',
    buttonMessage: '',
    calloutTitle: '',
    calloutMessage: '',
    hintMessage,
    requiredApprovals,
    approvedCount,
    approvedReviewers,
  };
}

/**
 * 功能：把字符串按 `|` 进行清洗并拆分成数组。
 * 输入：原始字符串值。
 * 输出：去空格、去空项后的数组。
 */
function splitPipeList(value) {
  return String(value || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * 功能：把组合排序值拆分为 `sortBy/sortDirection`。
 * 输入：形如 `updated_at:desc` 的排序值。
 * 输出：排序字段与方向对象。
 */
function parseSortOption(value) {
  const [sortBy = 'updated_at', sortDirection = 'desc'] = String(value || 'updated_at:desc').split(':');
  return {
    sortBy,
    sortDirection: sortDirection === 'asc' ? 'asc' : 'desc',
  };
}

/**
 * 功能：把查询参数中的页码规范为正整数。
 * 输入：任意页码值。
 * 输出：大于等于 1 的整数页码。
 */
function normalizePage(value) {
  const page = Number.parseInt(String(value || '1'), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

/**
 * 功能：读取当前控制台路由上下文。
 * 输入：无。
 * 输出：包含路径和查询参数的对象。
 */
function currentRouteContext() {
  const url = new URL(location.href);
  const path = url.pathname.replace(/^\/console/, '') || '/';
  const queryString = url.searchParams.toString();
  return {
    path,
    fullPath: `${path}${queryString ? `?${queryString}` : ''}`,
    query: url.searchParams,
  };
}

/**
 * 功能：为控制台 SPA 构造带查询参数的跳转地址。
 * 输入：路径和查询参数对象。
 * 输出：最终的 `/console/...` URL 字符串。
 */
function buildConsoleUrl(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && String(value).trim() !== '') {
      query.set(key, String(value));
    }
  });
  const queryString = query.toString();
  return `/console${path}${queryString ? `?${queryString}` : ''}`;
}

/**
 * 功能：处理`pageKeyForPath`相关逻辑。
 * 输入：`pathname`（路径名）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function pageKeyForPath(pathname = '/') {
  const normalized = String(pathname || '/').trim() || '/';
  if (normalized === '/' || normalized === '') return '/';
  if (normalized === '/runtime' || normalized.startsWith('/runtime/')) return '/runtime';
  if (normalized === '/system' || normalized.startsWith('/system/')) return '/system';
  if (normalized === '/users' || normalized.startsWith('/users/')) return '/users';
  if (normalized === '/roles' || normalized.startsWith('/roles/')) return '/roles';
  if (normalized === '/permissions' || normalized.startsWith('/permissions/')) return '/permissions';
  if (normalized === '/governance-policies' || normalized.startsWith('/governance-policies/')) return '/governance-policies';
  if (normalized === '/dictionary/config' || normalized.startsWith('/dictionary/config/')) return '/dictionary/config';
  if (normalized === '/runtime-verify' || normalized.startsWith('/runtime-verify/')) return '/runtime-verify';
  if (normalized === '/runtime-node-registry' || normalized.startsWith('/runtime-node-registry/')) return '/runtime-node-registry';
  if (normalized === '/runtime-nodes' || normalized.startsWith('/runtime-nodes/')) return '/runtime-nodes';
  if (normalized === '/dictionary/terms' || normalized.startsWith('/dictionary/terms/')) return '/dictionary/terms';
  if (normalized === '/dictionary/import-jobs' || normalized.startsWith('/dictionary/import-jobs/')) return '/dictionary/import-jobs';
  if (normalized === '/dictionary/reviews' || normalized.startsWith('/dictionary/reviews/')) return '/dictionary/reviews';
  if (normalized === '/releases' || normalized.startsWith('/releases/')) return '/releases';
  if (normalized === '/validation/cases' || normalized.startsWith('/validation/cases/')) return '/validation/cases';
  if (normalized === '/help' || normalized.startsWith('/help/')) return '/help';
  return '';
}

/**
 * 功能：根据控制台路由判定当前页面所属视觉家族。
 * 输入：控制台路径。
 * 输出：`overview/workspace/support/detail` 之一。
 */
function pageFamilyForPath(pathname = '/') {
  const normalized = String(pathname || '/').trim() || '/';
  if (normalized === '/' || normalized === '') {
    return 'overview';
  }
  if (normalized === '/help' || normalized.startsWith('/help/')) {
    return 'support';
  }
  if (normalized === '/system' || normalized.startsWith('/system/')) {
    return 'workspace';
  }
  if (normalized === '/runtime' || normalized.startsWith('/runtime/')) {
    return 'workspace';
  }
  if (
    /^\/dictionary\/terms\/[^/]+/.test(normalized)
    || /^\/runtime-verify\/[^/]+/.test(normalized)
    || /^\/users\/[^/]+/.test(normalized)
    || /^\/roles\/[^/]+/.test(normalized)
    || /^\/permissions\/[^/]+/.test(normalized)
    || /^\/governance-policies\/[^/]+/.test(normalized)
    || /^\/dictionary\/config\/[^/]+/.test(normalized)
    || /^\/runtime-node-registry\/[^/]+/.test(normalized)
    || /^\/runtime-nodes\/[^/]+/.test(normalized)
    || /^\/releases\/[^/]+/.test(normalized)
    || /^\/validation\/cases\/[^/]+/.test(normalized)
    || /^\/dictionary\/reviews\/[^/]+/.test(normalized)
    || /^\/import\/templates\/[^/]+/.test(normalized)
    || /^\/dictionary\/import-jobs\/[^/]+/.test(normalized)
  ) {
    return 'detail';
  }
  return 'workspace';
}

/**
 * 功能：把当前路由的视觉家族标记同步到控制台 DOM，供共享样式系统使用。
 * 输入：控制台路径。
 * 输出：无显式返回。
 */
function applyPageFamilyAppearance(pathname = '/') {
  const family = pageFamilyForPath(pathname);
  document.body.dataset.consolePageFamily = family;
  app.dataset.pageFamily = family;
}

/**
 * 功能：判断指定控制台路由是否需要开启自动轮询刷新。
 * 输入：控制台路由路径。
 * 输出：布尔值。
 */
function shouldAutoRefreshRoute(pathname = '/') {
  return pathname === '/runtime-nodes' || /^\/runtime-nodes\/[^/]+$/.test(String(pathname || ''));
}

/**
 * 功能：停止当前页面的自动刷新定时器。
 * 输入：无。
 * 输出：无显式返回。
 */
function clearRouteRefreshTimer() {
  if (routeRefreshTimer) {
    clearInterval(routeRefreshTimer);
    routeRefreshTimer = null;
  }
}

/**
 * 功能：读取 runtime 页自动刷新开关。
 * 输入：无。
 * 输出：布尔值；未配置时默认返回 `false`。
 */
function runtimeAutoRefreshEnabled() {
  return localStorage.getItem(RUNTIME_AUTO_REFRESH_STORAGE_KEY) === 'true';
}

/**
 * 功能：写入 runtime 页自动刷新开关。
 * 输入：布尔值。
 * 输出：无显式返回。
 */
function setRuntimeAutoRefreshEnabled(enabled) {
  localStorage.setItem(RUNTIME_AUTO_REFRESH_STORAGE_KEY, enabled ? 'true' : 'false');
}

/**
 * 功能：为需要实时状态的路由开启定时刷新。
 * 输入：控制台路由路径。
 * 输出：无显式返回。
 */
function scheduleRouteAutoRefresh(pathname = '/') {
  clearRouteRefreshTimer();
  if (!shouldAutoRefreshRoute(pathname) || !runtimeAutoRefreshEnabled()) {
    return;
  }
  routeRefreshTimer = setInterval(() => {
    if (!document.hidden) {
      renderRoute({ background: true });
    }
  }, RUNTIME_NODES_REFRESH_INTERVAL_MS);
}

/**
 * 功能：渲染`access denied`相关逻辑。
 * 输入：`pageKey`（页面键）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function renderAccessDenied(pageKey) {
  pageTitle.textContent = '访问受限';
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      <section class="flash danger">
        <h2 class="flash-title">当前身份无页面访问权限</h2>
        <div class="flash-desc">页面：${escapeHtml(pageKey || '未知页面')}。请切换为具备权限的角色或用户后重试。</div>
      </section>
    </div>
  `;
}

/**
 * 功能：为控制台 API 构造带查询参数的请求地址。
 * 输入：接口路径和查询参数对象。
 * 输出：最终 API URL 字符串。
 */
function buildApiUrl(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && String(value).trim() !== '') {
      query.set(key, String(value));
    }
  });
  const queryString = query.toString();
  return `${path}${queryString ? `?${queryString}` : ''}`;
}

/**
 * 功能：根据 runtime 节点状态或错误文本生成统一异常描述。
 * 输入：runtime 节点对象或错误文本。
 * 输出：包含生命周期、标题、说明和建议动作的异常描述对象。
 */
function runtimeIssueDescriptor(input = {}) {
  if (input && typeof input === 'object' && input.issue) {
    return {
      lifecycle: input.issue.lifecycle || 'none',
      status: input.issue.status || 'healthy',
      title: input.issue.title || '当前无异常',
      detail: input.issue.detail || '',
      recovery: input.issue.recovery || '',
      rawMessage: String(input.lastError || '').trim(),
    };
  }
  const item = input && typeof input === 'object' ? input : { lastError: input };
  const message = String(item.lastError || '').trim();
  if (!message) {
    return {
      lifecycle: 'none',
      status: 'healthy',
      title: '运行异常',
      detail: '',
      recovery: '',
      rawMessage: '',
    };
  }
  const lastApplyStatus = String(item.lastApplyStatus || '').trim();
  const status = String(item.status || '').trim();
  const desiredVersion = String(item.desiredVersion || '').trim();
  const currentVersion = String(item.currentVersion || '').trim();
  const aligned = Boolean(desiredVersion) && desiredVersion === currentVersion;
  const activeFailure = ['failed', 'rolled_back'].includes(lastApplyStatus);
  const pendingOffline = status === 'offline' && Boolean(desiredVersion) && currentVersion !== desiredVersion;
  const recovered = !activeFailure && (lastApplyStatus === 'success' || aligned);
  if (/artifact download failed:\s*404/i.test(message)) {
    return {
      lifecycle: recovered ? 'recovered' : (activeFailure || pendingOffline ? 'active' : 'warning'),
      status: recovered ? 'recovered' : (activeFailure || pendingOffline ? 'failed' : 'warning'),
      title: '制品下载失败（404）',
      detail: '目标版本对应的制品对象不存在，或下载 URL 已失效。',
      recovery: '建议重新下发当前目标版本，并检查 MinIO 中对应 release 制品是否已成功同步。',
      rawMessage: message,
    };
  }
  if (/artifact download failed:\s*401|403/i.test(message)) {
    return {
      lifecycle: recovered ? 'recovered' : (activeFailure || pendingOffline ? 'active' : 'warning'),
      status: recovered ? 'recovered' : (activeFailure || pendingOffline ? 'failed' : 'warning'),
      title: '制品下载鉴权失败',
      detail: '运行节点拉取制品时没有拿到有效的下载授权。',
      recovery: '建议检查 MinIO 凭据、预签名 URL 生成逻辑和对象访问权限。',
      rawMessage: message,
    };
  }
  if (/runtime_control_empty/i.test(message)) {
    return {
      lifecycle: recovered ? 'recovered' : (activeFailure || pendingOffline ? 'active' : 'warning'),
      status: recovered ? 'recovered' : (activeFailure || pendingOffline ? 'failed' : 'warning'),
      title: '控制面未下发目标版本',
      detail: '当前节点没有拿到目标版本或对应制品元数据。',
      recovery: '建议先在版本发布中把目标版本下发到运行节点。',
      rawMessage: message,
    };
  }
  return {
    lifecycle: recovered ? 'recovered' : (activeFailure || pendingOffline ? 'active' : 'warning'),
    status: recovered ? 'recovered' : (activeFailure || pendingOffline ? 'failed' : 'warning'),
    title: '运行异常',
    detail: message,
    recovery: '建议进入运行节点详情查看当前版本、目标版本和最近应用记录，再决定是否重新下发目标版本。',
    rawMessage: message,
  };
}

/**
 * 功能：把 runtime 异常生命周期转换为醒目的说明徽标。
 * 输入：runtime 节点对象。
 * 输出：异常状态 HTML。
 */
function renderRuntimeIssueSummary(item = {}) {
  if (String((item.registrationStatus || '').trim()) === 'not_registered') {
    return `
      <div class="cell-stack">
        <span class="badge warning">未注册</span>
        <span class="subtle">admin 尚未收到注册或心跳</span>
      </div>
    `;
  }
  const issue = runtimeIssueDescriptor(item);
  if (issue.lifecycle === 'none') {
    return '<span class="subtle">当前无异常</span>';
  }
  const badgeText = issue.lifecycle === 'recovered' ? '历史异常' : '当前异常';
  return `
    <div class="cell-stack">
      <span class="${badgeClass(issue.status)}">${escapeHtml(badgeText)}</span>
      <span class="subtle">${escapeHtml(issue.title)}</span>
    </div>
  `;
}

/**
 * 功能：把 runtime 当前版本和目标版本的对齐状态渲染为结构化摘要。
 * 输入：runtime 节点对象。
 * 输出：版本对齐摘要 HTML。
 */
function renderRuntimeVersionAlignment(item = {}) {
  if (String((item.registrationStatus || '').trim()) === 'not_registered') {
    return `
      <div class="cell-stack">
        <span class="badge warning">未注册</span>
        <span class="subtle">尚未拿到目标版本</span>
      </div>
    `;
  }
  const desiredVersion = String(item.desiredVersion || '').trim();
  const currentVersion = String(item.currentVersion || '').trim();
  if (!desiredVersion) {
    return `
      <div class="cell-stack">
        <span class="badge">尚未下发</span>
        <span class="mono">${escapeHtml(currentVersion || '未安装')}</span>
      </div>
    `;
  }
  if (!currentVersion) {
    return `
      <div class="cell-stack">
        <span class="badge warning">待安装</span>
        <span class="mono">目标：${escapeHtml(desiredVersion)}</span>
      </div>
    `;
  }
  const aligned = currentVersion === desiredVersion;
  return `
    <div class="cell-stack">
      <span class="${aligned ? 'badge success' : 'badge warning'}">${aligned ? '已对齐' : '待收敛'}</span>
      <span class="mono">当前：${escapeHtml(currentVersion)}</span>
      <span class="subtle">目标：${escapeHtml(desiredVersion)}</span>
    </div>
  `;
}

/**
 * 功能：渲染备案状态摘要。
 * 输入：运行治理节点对象。
 * 输出：备案状态 HTML。
 */
function renderRuntimeRegistryState(item = {}) {
  const registry = item.registry || {};
  return `
    <div class="cell-stack">
      <span class="${registry.enabled === false ? 'badge warning' : 'badge success'}">${escapeHtml(registry.label || (registry.enabled === false ? '备案已禁用' : '备案已启用'))}</span>
      <span class="subtle">地址：${escapeHtml(item.address || '')}</span>
    </div>
  `;
}

/**
 * 功能：渲染运行节点实时状态摘要。
 * 输入：运行治理节点对象。
 * 输出：实时状态 HTML。
 */
function renderRuntimeRealtimeState(item = {}) {
  const realtime = item.realtime || {};
  if (String((item.registrationStatus || '').trim()) === 'not_registered') {
    return `
      <div class="cell-stack">
        <span class="badge warning">未注册</span>
        <span class="subtle">尚未产生实时状态</span>
      </div>
    `;
  }
  return `
    <div class="cell-stack">
      ${renderBadge(realtime.status || item.status)}
      <span class="subtle">最近心跳：${escapeHtml(formatDateTime(realtime.lastHeartbeatAt || item.lastHeartbeatAt))}</span>
      <span class="subtle">距今 / 阈值：${escapeHtml(formatDurationSeconds(realtime.heartbeatAgeSeconds || item.heartbeatAgeSeconds))} / ${escapeHtml(formatDurationSeconds(realtime.offlineThresholdSeconds || item.offlineThresholdSeconds))}</span>
    </div>
  `;
}

/**
 * 功能：渲染最近动作结果摘要。
 * 输入：运行治理节点对象。
 * 输出：最近动作 HTML。
 */
function renderRuntimeRecentAction(item = {}) {
  const recentAction = item.recentAction || {};
  return `
    <div class="cell-stack">
      <span>${recentAction.lastApplyStatus ? renderBadge(recentAction.lastApplyStatus) : '未记录应用'}</span>
      <span class="subtle">最近应用：${escapeHtml(formatDateTime(recentAction.lastApplyAt || item.lastApplyAt))}</span>
    </div>
  `;
}

/**
 * 功能：渲染历史异常摘要。
 * 输入：运行治理节点对象。
 * 输出：历史异常 HTML。
 */
function renderRuntimeHistoryIssue(item = {}) {
  const historyIssue = (((item || {}).issues) || {}).history || null;
  if (!historyIssue) {
    return '<span class="subtle">当前无历史异常</span>';
  }
  return `
    <div class="cell-stack">
      <span class="badge success">历史异常</span>
      <span class="subtle">${escapeHtml(historyIssue.title || '已恢复')}</span>
    </div>
  `;
}

/**
 * 功能：根据 runtime 异常生命周期返回统一提示框样式。
 * 输入：异常描述对象。
 * 输出：提示框 className 字符串。
 */
function runtimeIssueCalloutClass(issue = {}) {
  if (issue.lifecycle === 'recovered') {
    return 'callout success';
  }
  if (issue.lifecycle === 'active') {
    return 'callout danger';
  }
  if (issue.lifecycle === 'warning') {
    return 'callout warning';
  }
  return 'callout';
}

/**
 * 功能：根据 runtime 列表的异常分布生成页内引导说明。
 * 输入：runtime 异常分布摘要对象。
 * 输出：运行异常引导区 HTML。
 */
function renderRuntimeIssueFocus(summary = {}) {
  const notRegisteredCount = Number(summary.notRegisteredCount || 0);
  const activeCount = Number(summary.activeCount || 0);
  const warningCount = Number(summary.warningCount || 0);
  const recoveredCount = Number(summary.recoveredCount || 0);
  const disabledRegistryCount = Number(summary.disabledRegistryCount || 0);
  const orphanRuntimeCount = Number(summary.orphanRuntimeCount || 0);
  if (notRegisteredCount > 0) {
    return `
      <section class="callout warning" style="margin-bottom:14px;">
        <h3 class="callout-title">有备案节点尚未注册</h3>
        <p>当前有 ${escapeHtml(String(notRegisteredCount))} 个已备案节点还没有成功注册到 admin。建议优先核对 nodeId、nodeAddress、registration-secret，以及当前 admin 是否启用了 runtime token。${disabledRegistryCount > 0 ? `另有 ${escapeHtml(String(disabledRegistryCount))} 个节点的备案当前处于禁用状态。` : ''}${orphanRuntimeCount > 0 ? `同时发现 ${escapeHtml(String(orphanRuntimeCount))} 个未备案 runtime 接入事件，它们不会进入主列表。` : ''}</p>
      </section>
    `;
  }
  if (activeCount > 0) {
    return `
      <section class="callout danger" style="margin-bottom:14px;">
        <h3 class="callout-title">当前运行异常需要优先处理</h3>
        <p>当前有 ${escapeHtml(String(activeCount))} 个节点存在正在影响下发或版本收敛的异常。${warningCount > 0 ? `另外还有 ${escapeHtml(String(warningCount))} 个节点需要继续观察。` : ''}${recoveredCount > 0 ? `已恢复的历史异常节点还有 ${escapeHtml(String(recoveredCount))} 个，仅保留用于追溯。` : ''}${orphanRuntimeCount > 0 ? `未备案 runtime 接入事件共 ${escapeHtml(String(orphanRuntimeCount))} 个，需单独处置。` : ''}</p>
        <p>列表已按“当前异常 → 需观察 → 历史异常”的顺序排列，建议先处理靠前节点。</p>
      </section>
    `;
  }
  if (warningCount > 0) {
    return `
      <section class="callout warning" style="margin-bottom:14px;">
        <h3 class="callout-title">当前节点仍需继续观察</h3>
        <p>当前有 ${escapeHtml(String(warningCount))} 个节点还没有完全稳定。${recoveredCount > 0 ? `另有 ${escapeHtml(String(recoveredCount))} 个节点只保留历史异常记录。` : ''}</p>
        <p>建议继续查看靠前节点的当前版本、目标版本和最近应用结果。</p>
      </section>
    `;
  }
  if (recoveredCount > 0) {
    return `
      <section class="callout success" style="margin-bottom:14px;">
        <h3 class="callout-title">当前没有阻断类运行异常</h3>
        <p>当前筛选结果里没有正在阻断收敛的节点；仍有 ${escapeHtml(String(recoveredCount))} 个节点保留历史异常记录，仅用于问题追溯。</p>
      </section>
    `;
  }
  return `
    <section class="callout success" style="margin-bottom:14px;">
      <h3 class="callout-title">当前运行状态稳定</h3>
      <p>当前筛选结果里没有运行异常，也没有需要追溯的历史异常记录。</p>
    </section>
  `;
}

/**
 * 功能：从当前路由提取词条列表的筛选参数。
 * 输入：无。
 * 输出：词条筛选对象。
 */
function currentTermFiltersFromRoute() {
  const route = currentRouteContext();
  const sortValue = route.query.get('sort') || 'updated_at:desc';
  const { sortBy, sortDirection } = parseSortOption(sortValue);
  return {
    query: route.query.get('query') || '',
    categoryCode: route.query.get('categoryCode') || '',
    status: route.query.get('status') || '',
    sourceType: route.query.get('sourceType') || '',
    riskLevel: route.query.get('riskLevel') || '',
    sortBy,
    sortDirection,
  };
}

/**
 * 功能：从当前路由提取验证样本列表的筛选参数。
 * 输入：无。
 * 输出：验证样本筛选对象。
 */
function currentValidationFiltersFromRoute() {
  const route = currentRouteContext();
  return {
    query: route.query.get('query') || '',
    sourceType: route.query.get('sourceType') || '',
    enabled: route.query.get('enabled') || '',
  };
}

/**
 * 功能：从当前路由提取词条审核列表的筛选参数。
 * 输入：无。
 * 输出：词条审核筛选对象。
 */
function currentReviewFiltersFromRoute() {
  const route = currentRouteContext();
  return {
    status: route.query.get('status') || '',
    taskType: 'term_review',
    targetType: 'term',
  };
}

/**
 * 功能：判断导入批次是否为验证样本导入。
 * 输入：导入批次对象。
 * 输出：布尔值。
 */
function isValidationImportJob(job = {}) {
  return String(job.jobType || '').trim() === 'validation_cases'
    || String(job.templateCode || '').trim() === VALIDATION_IMPORT_TEMPLATE_CODE;
}

/**
 * 功能：生成导入中心列表使用的批次摘要文本。
 * 输入：导入批次列表项。
 * 输出：摘要文本。
 */
function importJobSummaryText(item = {}) {
  if (item.status === 'imported') {
    if (isValidationImportJob(item)) {
      return `新增样本 ${escapeHtml(String((item.resultSummary || {}).newTermCount || 0))} / 更新样本 ${escapeHtml(String((item.resultSummary || {}).updatedTermCount || 0))} / 错误 ${escapeHtml(String((item.resultSummary || {}).errorCount || 0))}`;
    }
    return `新增词条 ${escapeHtml(String((item.resultSummary || {}).newTermCount || 0))} / 更新词条 ${escapeHtml(String((item.resultSummary || {}).updatedTermCount || 0))} / 错误 ${escapeHtml(String((item.resultSummary || {}).errorCount || 0))}`;
  }
  return `可导入 ${escapeHtml(String((item.previewSummary || {}).readyRows || 0))} / 需确认 ${escapeHtml(String((item.previewSummary || {}).warningRows || 0))} / 错误 ${escapeHtml(String((item.previewSummary || {}).errorRows || 0))}`;
}

/**
 * 功能：执行控制台内部路由跳转。
 * 输入：目标路径。
 * 输出：无显式返回；会刷新当前路由页面。
 */
function navigate(pathname) {
  history.pushState({}, '', pathname);
  renderRoute();
}

/**
 * 功能：根据当前路径高亮左侧主导航。
 * 输入：无。
 * 输出：无显式返回。
 */
function setActiveNav() {
  const route = currentRouteContext();
  const path = route.path;
  const fullPath = route.fullPath || path;
  const groupState = loadNavGroupState();
  document.querySelectorAll('#mainNav [data-nav-group]').forEach((group) => {
    group.classList.remove('active-group');
  });
  document.querySelectorAll('#mainNav a').forEach((anchor) => {
    const key = anchor.getAttribute('data-nav');
    const active = key.includes('?')
      ? fullPath === key
      : (key === '/'
        ? path === '/'
        : path === key || path.startsWith(`${key}/`));
    anchor.classList.toggle('active', active);
    if (active) {
      const group = anchor.closest('[data-nav-group]');
      if (group) {
        group.open = true;
        group.classList.add('active-group');
        groupState[group.getAttribute('data-nav-group')] = true;
      }
    }
  });
  saveNavGroupState(groupState);
}

/**
 * 功能：拆解控制台错误文本中的错误码与原始说明。
 * 输入：错误对象或错误文本。
 * 输出：包含 `raw/code/detail` 的错误描述对象。
 */
function parseConsoleError(error) {
  const raw = String(error instanceof Error ? error.message : (error || '未知错误')).trim();
  const match = raw.match(/^([a-z0-9_]+):\s*(.+)$/i);
  if (!match) {
    return {
      raw,
      code: '',
      detail: raw,
    };
  }
  return {
    raw,
    code: String(match[1] || '').trim(),
    detail: String(match[2] || '').trim(),
  };
}

/**
 * 功能：把后台返回的错误文本转换为更适合控制台展示的中文说明。
 * 输入：错误对象或错误文本。
 * 输出：包含展示标题、说明和原始信息的对象。
 */
function normalizeConsoleError(error) {
  const parsed = parseConsoleError(error);
  const payload = error && typeof error === 'object' ? error.data || null : null;
  const directMessage = CONSOLE_ERROR_MESSAGES[parsed.raw] || '';
  const codeMessage = parsed.code ? (CONSOLE_ERROR_MESSAGES[parsed.code] || '') : '';
  const description = directMessage || codeMessage || (payload && payload.error ? payload.error : '') || parsed.raw || '未知错误';
  return {
    title: '操作失败',
    description,
    raw: parsed.raw,
    code: parsed.code,
    detail: parsed.detail,
    issues: payload && Array.isArray(payload.issues) ? payload.issues : [],
    blockedCount: payload && payload.blockedCount != null ? Number(payload.blockedCount || 0) : null,
    warningCount: payload && payload.warningCount != null ? Number(payload.warningCount || 0) : null,
  };
}

function renderIssueListHtml(issues = []) {
  if (!issues.length) {
    return '';
  }
  return `
    <div class="flash-issue-list">
      ${issues.slice(0, 6).map((entry) => `
        <div class="flash-issue-item">
          <div><span class="badge ${entry.level === 'blocked' ? 'danger' : 'warning'}">${escapeHtml(entry.level || 'warning')}</span> <span class="mono">${escapeHtml(entry.code || '')}</span></div>
          <div class="subtle">${escapeHtml(entry.message || '')}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function admissionCalloutClass(level = '') {
  if (level === 'blocked') return 'callout danger';
  if (level === 'warning') return 'callout warning';
  return 'callout success';
}

function renderAdmissionTrace(trace = null) {
  if (!trace || typeof trace !== 'object') {
    return '<span class="subtle">无</span>';
  }
  const parts = [
    trace.termId ? `term=${trace.termId}` : '',
    trace.categoryCode ? `category=${trace.categoryCode}` : '',
    trace.canonicalText ? `canonical=${trace.canonicalText}` : '',
    trace.aliasText ? `alias=${trace.aliasText}` : '',
    trace.importJobId ? `job=${trace.importJobId}` : '',
    trace.sourceFileName ? `file=${trace.sourceFileName}` : '',
    trace.sourceRowNo != null && trace.sourceRowNo !== '' ? `row=${trace.sourceRowNo}` : '',
  ].filter(Boolean);
  return parts.length ? `<span class="mono">${escapeHtml(parts.join(' | '))}</span>` : '<span class="subtle">无</span>';
}

function renderAdmissionSummaryBlock(summary = {}, title = '统一准入摘要') {
  const issues = Array.isArray(summary.issues) ? summary.issues : [];
  if (!issues.length && summary.level !== 'blocked' && summary.level !== 'warning') {
    return `
      <section class="callout success">
        <h3 class="callout-title">${escapeHtml(title)}</h3>
        <p>当前未命中阻断或警示项，准入口径保持通过。</p>
      </section>
    `;
  }
  return `
    <section class="${admissionCalloutClass(summary.level)}">
      <h3 class="callout-title">${escapeHtml(title)}</h3>
      <p>当前 level=${escapeHtml(summary.level || 'ready')}，blocked=${escapeHtml(String(summary.blockedCount || 0))}，warning=${escapeHtml(String(summary.warningCount || 0))}。</p>
      ${renderDenseTable([
        { label: '级别', render: (entry) => renderBadge(entry.level || 'warning') },
        { label: '编码', render: (entry) => `<span class="mono">${escapeHtml(entry.code || '')}</span>` },
        { label: '字段', render: (entry) => escapeHtml(entry.field || '') },
        { label: '说明', render: (entry) => escapeHtml(entry.message || '') },
        { label: '追溯', render: (entry) => renderAdmissionTrace(entry.trace) },
      ], issues, '当前没有异常项。', { scrollSizeClass: 'panel-scroll-small', collapseThreshold: 6, collapsedSummary: '准入问题较多，默认收起明细' })}
    </section>
  `;
}

/**
 * 功能：设置一次性成功/提示消息。
 * 输入：消息对象。
 * 输出：无显式返回。
 */
function setFlash(message) {
  flashState = message;
}

/**
 * 功能：把一次性消息渲染为页面顶部提示并立即消费。
 * 输入：无。
 * 输出：提示 HTML；无消息时返回空字符串。
 */
function consumeFlashHtml() {
  const message = flashState;
  flashState = null;
  if (!message) {
    return '';
  }
  const actions = (message.actions || []).map((action) => {
    if (action.href) {
      return `<a class="${action.className || 'button-link'}" ${action.dataLink === false ? '' : 'data-link'} href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`;
    }
    if (action.formAction) {
      return `
        <form data-action="${escapeHtml(action.dataAction || '')}" action="${escapeHtml(action.formAction)}">
          <button type="submit" class="${escapeHtml(action.className || '')}">${escapeHtml(action.label)}</button>
        </form>
      `;
    }
    return '';
  }).join('');
  return `
    <section class="flash ${escapeHtml(message.type || 'success')}" data-transient-flash="true">
      <h2 class="flash-title">${escapeHtml(message.title || '操作完成')}</h2>
      ${message.description ? `<div class="flash-desc">${escapeHtml(message.description)}</div>` : ''}
      ${actions ? `<div class="flash-actions">${actions}</div>` : ''}
    </section>
  `;
}

/**
 * 功能：在当前页面顶部渲染操作失败提示。
 * 输入：错误对象或错误文本。
 * 输出：无显式返回。
 */
function showActionError(error) {
  const message = normalizeConsoleError(error);
  app.insertAdjacentHTML('afterbegin', `
    <section class="flash danger" data-transient-flash="true">
      <h2 class="flash-title">${escapeHtml(message.title)}</h2>
      <div class="flash-desc">${escapeHtml(message.description)}</div>
      ${(message.blockedCount != null || message.warningCount != null) ? `<div class="flash-desc">blocked=${escapeHtml(String(message.blockedCount || 0))}，warning=${escapeHtml(String(message.warningCount || 0))}</div>` : ''}
      ${renderIssueListHtml(message.issues || [])}
    </section>
  `);
}

/**
 * 功能：判断某个表单动作是否需要二次确认。
 * 输入：动作名、表单对象。
 * 输出：确认提示文本；无需确认时返回空字符串。
 */
function confirmationMessageFor(action, form) {
  if (action === 'disable-term') {
    return '确认停用当前词条？停用后该词条将退出后续发布链路。';
  }
  if (action === 'bulk-term-action') {
    const formData = new FormData(form);
    if (String(formData.get('bulkAction') || '') === 'disable') {
      return '确认批量停用当前选中的词条或当前筛选结果？';
    }
  }
  if (action === 'confirm-import-job') {
    return '确认导入当前批次？该操作会把预览结果真正写入正式库。';
  }
  if (action === 'cancel-import-job') {
    return '确认取消当前导入批次？取消后需要重新上传文件生成预览。';
  }
  if (action === 'approve-review') {
    return '确认审核通过当前任务？';
  }
  if (action === 'reject-review') {
    return '确认驳回当前任务？驳回后目标对象需要修正后重新提审。';
  }
  if (action === 'bulk-review-action') {
    const formData = new FormData(form);
    const bulkAction = String(formData.get('bulkAction') || 'approve');
    const bulkScope = String(formData.get('bulkScope') || 'selected_tasks');
    const importJobId = String(formData.get('importJobId') || '').trim();
    const selectedCount = checkedBulkValues('reviews').length;
    if (bulkScope === 'import_job' && importJobId) {
      return bulkAction === 'reject'
        ? `确认批量驳回导入批次 ${importJobId} 下的全部待审核词条任务？驳回后需回到词典建设修正后重新提交审核。`
        : `确认批量审核通过导入批次 ${importJobId} 下的全部待审核词条任务？`;
    }
    if (bulkScope === 'current_filter') {
      return bulkAction === 'reject'
        ? '确认批量驳回当前筛选结果中的词条审核任务？驳回后需回到词典建设修正后重新提交审核。'
        : '确认批量审核通过当前筛选结果中的词条审核任务？';
    }
    return bulkAction === 'reject'
      ? `确认批量驳回当前勾选的 ${selectedCount} 条词条审核任务？驳回后需回到词典建设修正后重新提交审核。`
      : `确认批量审核通过当前勾选的 ${selectedCount} 条词条审核任务？`;
  }
  if (action === 'publish-release') {
    return '确认正式发布当前版本？请先确认 Gate 和 Validation 已通过。';
  }
  if (action === 'rollout-release') {
    return '确认把当前版本下发为运行节点目标版本？节点会在下一次控制同步时开始收敛。';
  }
  if (action === 'canary-release') {
    return '确认把当前版本设为灰度版本？默认会启用 5% trafficKey 灰度。';
  }
  if (action === 'reissue-runtime-rollout') {
    return '确认重新下发当前目标版本？该操作会刷新 control configVersion，用于推动节点重新收敛。';
  }
  if (action === 'rollback-release') {
    return '确认回滚到当前版本？该操作会影响正式运行版本。';
  }
  if (action === 'update-governance-policies') {
    return '确认保存新的治理策略？发布审核人与发布执行约束会立即按新策略生效。';
  }
  if (action === 'disable-business-property') {
    return '确认停用当前业务属性？停用后它会从词条和批量导入的可选项中隐藏。';
  }
  if (action === 'enable-business-property') {
    return '确认启用当前业务属性？启用后它会重新出现在词条和批量导入的可选项中。';
  }
  if (action === 'delete-business-property') {
    return '确认删除当前业务属性？删除后它会从配置文件中移除。';
  }
  if (action === 'disable-source-type') {
    return '确认停用当前来源类型？停用后它会从对应域的可选项中隐藏。';
  }
  if (action === 'enable-source-type') {
    return '确认启用当前来源类型？启用后它会重新出现在对应域的可选项中。';
  }
  if (action === 'disable-validation-case') {
    return '确认停用当前样本？停用后它将不再参与后续验证链路。';
  }
  if (action === 'bulk-validation-case-action') {
    return '确认批量停用当前选中的样本或当前筛选结果？';
  }
  return '';
}

/**
 * 功能：给提交中的表单按钮加锁，避免重复提交。
 * 输入：表单元素与提交状态。
 * 输出：无显式返回。
 */
function setFormSubmitting(form, submitting) {
  const buttons = Array.from(form.querySelectorAll('button'));
  form.dataset.submitting = submitting ? 'true' : 'false';
  buttons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel = button.textContent || '';
    }
    button.disabled = submitting;
    button.textContent = submitting ? FORM_SUBMITTING_TEXT : button.dataset.originalLabel;
  });
}

/**
 * 功能：渲染文本输入字段。
 * 输入：字段配置对象。
 * 输出：字段 HTML。
 */
function inputField(options = {}) {
  const {
    label,
    name,
    value = '',
    type = 'text',
    placeholder = '',
    step = '',
    min = '',
    help = '',
    required = false,
    readonly = false,
    className = '',
  } = options;
  return `
    <label class="field ${escapeHtml(className)}">
      <span class="field-label">${escapeHtml(label)}</span>
      <input
        name="${escapeHtml(name)}"
        type="${escapeHtml(type)}"
        value="${escapeHtml(String(value))}"
        placeholder="${escapeHtml(placeholder)}"
        ${step ? `step="${escapeHtml(String(step))}"` : ''}
        ${min !== '' ? `min="${escapeHtml(String(min))}"` : ''}
        ${required ? 'required' : ''}
        ${readonly ? 'readonly' : ''}
      >
      ${help ? `<span class="field-help">${escapeHtml(help)}</span>` : ''}
    </label>
  `;
}

/**
 * 功能：渲染下拉选择字段。
 * 输入：字段配置对象。
 * 输出：字段 HTML。
 */
function selectField(options = {}) {
  const {
    label,
    name,
    value = '',
    options: items = [],
    help = '',
    className = '',
  } = options;
  return `
    <label class="field ${escapeHtml(className)}">
      <span class="field-label">${escapeHtml(label)}</span>
      <select name="${escapeHtml(name)}">
        ${items.map((item) => `<option value="${escapeHtml(item.value)}" ${String(item.value) === String(value) ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}
      </select>
      ${help ? `<span class="field-help">${escapeHtml(help)}</span>` : ''}
    </label>
  `;
}

/**
 * 功能：渲染复选项分组字段。
 * 输入：字段配置对象。
 * 输出：字段 HTML。
 */
function checkboxGroupField(options = {}) {
  const {
    label,
    name,
    values = [],
    items = [],
    help = '',
    className = '',
  } = options;
  const normalizedValues = Array.isArray(values) ? values.map((item) => String(item)) : [];
  return `
    <label class="field ${escapeHtml(className)}">
      <span class="field-label">${escapeHtml(label)}</span>
      <div class="checkbox-group">
        ${items.map((item) => `
          <label class="checkbox-row">
            <input name="${escapeHtml(name)}" type="checkbox" value="${escapeHtml(String(item.value))}" ${normalizedValues.includes(String(item.value)) ? 'checked' : ''}>
            <span>${escapeHtml(item.label)}</span>
          </label>
        `).join('')}
      </div>
      ${help ? `<span class="field-help">${escapeHtml(help)}</span>` : ''}
    </label>
  `;
}

/**
 * 功能：渲染多行文本字段。
 * 输入：字段配置对象。
 * 输出：字段 HTML。
 */
function textareaField(options = {}) {
  const {
    label,
    name,
    value = '',
    placeholder = '',
    help = '',
    className = '',
  } = options;
  return `
    <label class="field ${escapeHtml(className)}">
      <span class="field-label">${escapeHtml(label)}</span>
      <textarea name="${escapeHtml(name)}" class="editor" placeholder="${escapeHtml(placeholder)}">${escapeHtml(String(value))}</textarea>
      ${help ? `<span class="field-help">${escapeHtml(help)}</span>` : ''}
    </label>
  `;
}

/**
 * 功能：渲染文件上传字段。
 * 输入：字段配置对象。
 * 输出：字段 HTML。
 */
function fileField(options = {}) {
  const {
    label,
    name,
    help = '',
  } = options;
  return `
    <label class="field">
      <span class="field-label">${escapeHtml(label)}</span>
      <input class="file-input" name="${escapeHtml(name)}" type="file" required>
      ${help ? `<span class="field-help">${escapeHtml(help)}</span>` : ''}
    </label>
  `;
}

/**
 * 功能：渲染路径面包屑。
 * 输入：面包屑项数组。
 * 输出：面包屑 HTML。
 */
function renderBreadcrumbs(items = []) {
  if (!items.length) {
    return '';
  }
  return `
    <nav class="breadcrumbs" aria-label="页面导航路径">
      ${items.map((item, index) => {
        const html = item.href
          ? `<a class="breadcrumbs-link" data-link href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`
          : `<span class="breadcrumbs-current">${escapeHtml(item.label)}</span>`;
        return `${index > 0 ? '<span class="breadcrumbs-sep">/</span>' : ''}${html}`;
      }).join('')}
    </nav>
  `;
}

/**
 * 功能：渲染页面内帮助入口链接。
 * 输入：帮助 `slug`、入口文案，以及可选样式类。
 * 输出：帮助入口 HTML。
 */
function renderPageHelpLink(slug = '', label = '查看说明', options = {}) {
  const normalizedSlug = String(slug || '').trim();
  if (!normalizedSlug) {
    return '';
  }
  const className = String(options.className || 'ghost-link').trim() || 'ghost-link';
  return `<a class="${escapeHtml(className)}" data-link href="/console/help/${encodeURIComponent(normalizedSlug)}">${escapeHtml(label)}</a>`;
}

/**
 * 功能：渲染统一表格。
 * 输入：列配置、数据数组、空态文本，以及表格扩展配置。
 * 输出：表格 HTML。
 */
function renderTable(columns, items, emptyText = '暂无数据。', options = {}) {
  if (!items.length) {
    return renderEmptyState(emptyText);
  }
  const wrapClass = String(options.wrapClass || '').trim();
  const tableClass = String(options.tableClass || '').trim();
  const minWidth = Number.isFinite(Number(options.minWidth))
    ? Math.max(0, Number(options.minWidth))
    : 0;
  const horizontalHint = String(options.horizontalHint || '').trim();
  const wrapClassName = ['table-wrap', wrapClass].filter(Boolean).join(' ');
  const tableClassName = ['table', tableClass].filter(Boolean).join(' ');
  const tableStyle = minWidth > 0 ? ` style="min-width:${escapeHtml(String(minWidth))}px"` : '';
  const hintHtml = horizontalHint
    ? `<div class="table-scroll-hint">${escapeHtml(horizontalHint)}</div>`
    : '';
  return `
    <div class="${wrapClassName}">
      <table class="${tableClassName}"${tableStyle}>
        <thead>
          <tr>${columns.map((column) => `<th>${column.label}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${items.map((item) => `
            <tr>${columns.map((column) => `<td>${column.render(item)}</td>`).join('')}</tr>
          `).join('')}
        </tbody>
      </table>
      ${hintHtml}
    </div>
  `;
}

/**
 * 功能：为多数据区块包裹统一的卡片内滚动容器。
 * 输入：区块 HTML 和可选尺寸样式类。
 * 输出：带统一滚动收边样式的 HTML。
 */
function renderScrollableBlock(content, sizeClass = 'panel-scroll-medium') {
  return `<div class="panel-scroll ${escapeHtml(sizeClass)}">${content}</div>`;
}

/**
 * 功能：渲染统一的高密度表格区块，提供卡片内滚动和“大数据量默认折叠”能力。
 * 输入：列配置、数据数组、空态文本，以及滚动尺寸/折叠阈值/摘要文案/表格扩展配置等选项。
 * 输出：可直接嵌入页面的高密度表格 HTML。
 */
function renderDenseTable(columns, items, emptyText = '暂无数据。', options = {}) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const scrollSizeClass = String(options.scrollSizeClass || 'panel-scroll-medium').trim() || 'panel-scroll-medium';
  const collapseThreshold = Number.isFinite(Number(options.collapseThreshold))
    ? Math.max(0, Number(options.collapseThreshold))
    : 12;
  const collapsedSummary = String(options.collapsedSummary || '').trim();
  const collapsedHint = String(options.collapsedHint || '').trim();
  const tableHtml = renderScrollableBlock(renderTable(columns, normalizedItems, emptyText, options.tableOptions || {}), scrollSizeClass);
  if (!normalizedItems.length || collapseThreshold === 0 || normalizedItems.length <= collapseThreshold) {
    return tableHtml;
  }
  const summaryText = collapsedSummary || `当前数据较多，默认收起明细（共 ${normalizedItems.length} 条）`;
  const hintText = collapsedHint || '展开后可在卡片内滚动查看，避免当前页面继续向下无限拉长。';
  return `
    <details class="dense-section">
      <summary class="dense-section-summary">
        <span>${escapeHtml(summaryText)}</span>
        <span class="dense-section-hint">${escapeHtml(hintText)}</span>
      </summary>
      <div class="dense-section-content">
        ${tableHtml}
      </div>
    </details>
  `;
}

/**
 * 功能：渲染统一分页栏。
 * 输入：路径、查询参数对象和分页信息。
 * 输出：分页栏 HTML；单页时返回空字符串。
 */
function renderPagination(path, params = {}, pagination = {}) {
  const page = normalizePage(pagination.page);
  const pageSize = Math.max(1, Number(pagination.pageSize || 20));
  const total = Math.max(0, Number(pagination.total || 0));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) {
    return '';
  }
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  const baseParams = { ...params };
  delete baseParams.page;
  return `
    <div class="pagination">
      <div class="pagination-summary">
        第 ${escapeHtml(String(page))} / ${escapeHtml(String(totalPages))} 页，共 ${escapeHtml(String(total))} 条
      </div>
      <div class="pagination-actions">
        ${prevDisabled
          ? '<span class="button-link secondary-button disabled">上一页</span>'
          : `<a class="button-link secondary-button" data-link href="${escapeHtml(buildConsoleUrl(path, { ...baseParams, page: page - 1 }))}">上一页</a>`}
        ${nextDisabled
          ? '<span class="button-link secondary-button disabled">下一页</span>'
          : `<a class="button-link secondary-button" data-link href="${escapeHtml(buildConsoleUrl(path, { ...baseParams, page: page + 1 }))}">下一页</a>`}
      </div>
    </div>
  `;
}

/**
 * 功能：读取当前页被勾选的批量操作项 ID。
 * 输入：批量作用域标识。
 * 输出：已勾选值数组。
 */
function checkedBulkValues(scope) {
  return Array.from(document.querySelectorAll(`input[data-bulk-item="${scope}"]:checked`))
    .map((input) => input.value)
    .filter(Boolean);
}

/**
 * 功能：渲染帮助文章的结构化区块。
 * 输入：帮助区块数组。
 * 输出：帮助区块 HTML。
 */
function renderHelpSections(sections = []) {
  return sections.map((section) => {
    if (section.type === 'key_values') {
      return `
        <section class="panel panel-soft">
          <div class="section-head">
            <div>
              <h2 class="section-title">${escapeHtml(section.title)}</h2>
            </div>
          </div>
          <div class="key-value-list">
            ${(section.items || []).map((item) => `
              <div class="key-value-row">
                <div class="subtle">${escapeHtml(item.label)}</div>
                <div>${escapeHtml(item.value)}</div>
              </div>
            `).join('')}
          </div>
        </section>
      `;
    }
    if (section.type === 'steps') {
      return `
        <section class="panel panel-soft">
          <h2 class="section-title">${escapeHtml(section.title)}</h2>
          <ol class="help-steps">
            ${(section.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ol>
        </section>
      `;
    }
    if (section.type === 'code_list') {
      return `
        <section class="panel panel-soft">
          <h2 class="section-title">${escapeHtml(section.title)}</h2>
          <div class="help-code">
            ${(section.items || []).map((item) => `<div class="code-block mono">${escapeHtml(item)}</div>`).join('')}
          </div>
        </section>
      `;
    }
    return `
      <section class="panel panel-soft">
        <h2 class="section-title">${escapeHtml(section.title)}</h2>
        <ul class="help-list">
          ${(section.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </section>
    `;
  }).join('');
}

/**
 * 功能：把 Markdown 帮助文档渲染为控制台内可读 HTML。
 * 输入：Markdown 文本。
 * 输出：帮助正文 HTML。
 */
function renderHelpMarkdown(markdown = '') {
  const text = String(markdown || '').trim();
  if (!text) {
    return renderEmptyState('当前帮助文档还没有正文内容。');
  }
  const blocks = text.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  return blocks.map((block) => {
    const lines = block.split('\n');
    const firstLine = lines[0] || '';
    if (firstLine.startsWith('```') && lines[lines.length - 1].startsWith('```')) {
      return `<section class="panel panel-soft"><pre class="mono">${escapeHtml(lines.slice(1, -1).join('\n'))}</pre></section>`;
    }
    if (firstLine.startsWith('# ')) {
      return `<section class="panel panel-soft"><h2 class="section-title">${escapeHtml(firstLine.replace(/^#\s+/, ''))}</h2>${lines.slice(1).length ? `<div class="subtle">${escapeHtml(lines.slice(1).join(' '))}</div>` : ''}</section>`;
    }
    if (firstLine.startsWith('## ')) {
      return `<section class="panel panel-soft"><h2 class="section-title">${escapeHtml(firstLine.replace(/^##\s+/, ''))}</h2>${lines.slice(1).length ? `<div class="subtle">${escapeHtml(lines.slice(1).join(' '))}</div>` : ''}</section>`;
    }
    if (lines.every((line) => /^(-|\*|\d+\.)\s+/.test(line))) {
      return `
        <section class="panel panel-soft">
          <ul class="help-list">
            ${lines.map((line) => `<li>${escapeHtml(line.replace(/^(-|\*|\d+\.)\s+/, ''))}</li>`).join('')}
          </ul>
        </section>
      `;
    }
    return `<section class="panel panel-soft"><div class="help-paragraph">${escapeHtml(lines.join(' '))}</div></section>`;
  }).join('');
}

/**
 * 功能：渲染审核任务卡片列表。
 * 输入：审核任务数组。
 * 输出：审核卡片区 HTML。
 */
function renderReviewBoard(items = []) {
  if (!items.length) {
    return renderEmptyState('当前没有审核任务。');
  }
  return `
    <div class="review-board">
      ${items.map((item) => {
        const approvalGuard = getReleaseReviewApprovalGuard(item);
        const selectable = item.taskType === 'term_review' && item.targetType === 'term' && item.status === 'pending';
        const passiveActions = `
          <a class="button-link secondary-button" data-link href="/console/dictionary/reviews/${encodeURIComponent(item.taskId)}">查看详情</a>
          ${item.targetSummary.targetPath ? `<a class="button-link secondary-button" data-link href="${escapeHtml(item.targetSummary.targetPath)}">查看目标对象</a>` : ''}
        `;
        const decisionActions = item.status === 'pending'
          ? `
            ${approvalGuard.blocked
              ? renderDisabledAction('审核通过', approvalGuard.buttonMessage)
              : renderFeatureAction('reviews.approve', `
                <form data-action="approve-review" action="/api/console/dictionary/reviews/${encodeURIComponent(item.taskId)}/approve">
                  <button type="submit">审核通过</button>
                </form>
              `, '审核通过', '当前身份不能执行审核通过。')}
            ${renderFeatureAction('reviews.reject', `<form data-action="reject-review" action="/api/console/dictionary/reviews/${encodeURIComponent(item.taskId)}/reject">
              <button type="submit" class="danger-button">驳回任务</button>
            </form>`, '驳回任务', '当前身份不能执行审核驳回。')}
          `
          : '';
        return `
        <article class="review-card">
          <div class="review-card-main">
            <div class="review-select-row">
              ${selectable
                ? `<input type="checkbox" data-bulk-item="reviews" value="${escapeHtml(item.taskId)}" aria-label="选择审核任务 ${escapeHtml(item.taskId)}">`
                : '<span class="subtle">当前任务不可批量处理</span>'}
            </div>
            <div class="review-card-status-row">
              ${renderBadge(item.status)}
              <span class="subtle">${escapeHtml(displayLabel(item.taskType) || item.taskType || '审核任务')}</span>
            </div>
            <div class="review-card-target">
              <h3>${escapeHtml(item.targetSummary.title || item.taskId)}</h3>
              <div class="review-target-subtitle">${escapeHtml(item.targetSummary.subtitle || displayLabel(item.targetType) || '目标对象')}</div>
            </div>
            <div class="review-desc">
              <div>${escapeHtml(item.targetSummary.detail || '暂无更多说明')}</div>
              ${item.targetSummary.workflow ? `
                <div class="subtle">本步目的：${escapeHtml(item.targetSummary.workflow.purpose || '未说明')}</div>
                <div class="subtle">通过后下一步：${escapeHtml(item.targetSummary.workflow.approveNext || '未说明')}</div>
              ` : ''}
              ${renderReviewReleaseLayerSummary(item.targetSummary)}
              ${approvalGuard.blocked
                ? `<div class="subtle">${escapeHtml(approvalGuard.calloutMessage)}</div>`
                : (approvalGuard.hintMessage ? `<div class="subtle">${escapeHtml(approvalGuard.hintMessage)}</div>` : '')}
            </div>
            <div class="review-meta review-meta-grid">
              <span>任务 ID：${escapeHtml(item.taskId)}</span>
              <span>目标类型：${escapeHtml(displayLabel(item.targetType))}</span>
              <span>提交人：${escapeHtml(item.submittedBy || '未记录')}</span>
              <span>审核人：${escapeHtml(item.reviewedBy || '尚未审核')}</span>
            </div>
          </div>
          <div class="review-actions">
            <div class="review-action-group">
              <div class="review-action-label">查看与跳转</div>
              <div class="review-action-list">${passiveActions}</div>
            </div>
            ${decisionActions ? `
              <div class="review-action-group risk">
                <div class="review-action-label">审核决策</div>
                <div class="review-action-list">${decisionActions}</div>
              </div>
            ` : ''}
          </div>
        </article>
      `;
      }).join('')}
    </div>
  `;
}

/**
 * 功能：渲染控制台首页。
 * 输入：无。
 * 输出：无显式返回；直接写入页面。
 */
async function renderOverview() {
  pageTitle.textContent = '工作台';
  const [overviewData, workbenchData] = await Promise.all([
    fetchJson('/api/console/overview'),
    fetchJson('/api/console/workbench'),
  ]);
  const overview = overviewData.item.overview;
  const workbench = workbenchData.item;
  const pendingItems = [
    ...(hasPageAccess('/reviews') ? (((workbench.reviews || {}).items) || []) : []),
    ...(hasPageAccess('/import') ? (((workbench.imports || {}).items) || []) : []),
    ...(hasPageAccess('/releases') ? (((workbench.blockedReleases || {}).items) || []) : []),
  ];
  const alertItems = [
    ...(hasPageAccess('/runtime-nodes') ? (((workbench.offlineRuntimeNodes || {}).items) || []) : []),
    ...(hasPageAccess('/runtime-nodes') ? (((workbench.failedRuntimeApplies || {}).items) || []) : []),
    ...(hasPageAccess('/validation-cases') ? (((workbench.attentionValidationCases || {}).items) || []) : []),
  ];
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      <div class="grid cards compact">
        ${metricCard('词条总数', overview.totalTerms)}
        ${metricCard('错误词总数', overview.totalAliases)}
        ${metricCard('待处理审核', overview.pendingReviewCount)}
        ${metricCard('最近导入批次', overview.recentImportJobCount)}
        ${metricCard('阻塞版本', (workbench.summary || {}).blockedReleaseCount || 0)}
        ${metricCard('离线节点', (workbench.summary || {}).offlineRuntimeNodeCount || 0)}
      </div>
      <div class="page-layout with-aside layout-priority-main import-home-layout">
        <div class="page-main">
          <section class="panel page-hero">
            <div class="section-head">
              <div class="page-hero-copy">
                <div class="page-hero-kicker">工作台</div>
                <h2 class="page-hero-title">当前值守重点</h2>
                <div class="page-hero-desc">工作台只负责稳定聚合、待办引导和风险提醒，不再承担运行验证或跨域解释工作。</div>
              </div>
            </div>
            ${renderWorkbenchHighlights(workbench.highlights || [])}
          </section>
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">待办与活动告警</h2>
                <div class="section-desc">先处理待审核、待确认和版本校验阻断，再继续检查运行异常和待关注样本。</div>
              </div>
            </div>
            <div class="panel-stack">
              <section class="surface-block">
                <div class="surface-head">
                  <div>
                    <h3 class="surface-title">待办工作</h3>
                    <div class="surface-desc">聚合审核、导入和发布链路里当前最需要处理的事项。</div>
                  </div>
                </div>
                ${renderWorkbenchList(pendingItems, '当前没有待处理审核、导入或阻塞发布事项。')}
              </section>
              <section class="surface-block surface-block-soft">
                <div class="surface-head">
                  <div>
                    <h3 class="surface-title">风险提醒</h3>
                    <div class="surface-desc">优先查看离线节点、应用异常和当前仍未关联词条的验证样本。</div>
                  </div>
                </div>
                ${renderWorkbenchList(alertItems, '当前没有需要优先处理的运行异常或样本问题。')}
              </section>
            </div>
          </section>
        </div>
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">当前版本</h2>
                <div class="section-desc">这里只保留当前正式版、灰度版和阻断数量，不在首页展开发布细节。</div>
              </div>
            </div>
            <div class="summary-list">
              <div class="summary-row"><span class="subtle">正式版本</span><span>${overview.currentStableRelease ? escapeHtml(overview.currentStableRelease.version) : '尚未发布'}</span></div>
              <div class="summary-row"><span class="subtle">灰度版本</span><span>${overview.currentCanaryRelease ? escapeHtml(overview.currentCanaryRelease.version) : '当前无灰度'}</span></div>
              <div class="summary-row"><span class="subtle">阻塞版本</span><span>${escapeHtml(String((workbench.summary || {}).blockedReleaseCount || 0))}</span></div>
              <div class="summary-row"><span class="subtle">离线节点</span><span>${escapeHtml(String((workbench.summary || {}).offlineRuntimeNodeCount || 0))}</span></div>
            </div>
          </section>
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">快速入口</h2>
                <div class="section-desc">保留原有入口，但放到首屏次级区域，减少与待办/告警混读。</div>
              </div>
            </div>
            <div class="flash-actions">
              ${renderFeatureAction('overview.quick.termCreate', '<a class="button-link" data-link href="/console/dictionary/terms">新建词典记录</a>', '新建词典记录', '当前身份不能从工作台快捷创建词典记录。')}
              ${renderFeatureAction('overview.quick.import', '<a class="button-link secondary-button" data-link href="/console/dictionary/import-jobs">进入批量导入</a>', '进入批量导入', '当前身份不能进入词典导入。')}
              ${renderFeatureAction('overview.quick.review', '<a class="button-link secondary-button" data-link href="/console/dictionary/reviews">处理词典审核</a>', '处理词典审核', '当前身份不能进入词典审核。')}
              ${hasPageAccess('/releases') ? '<a class="button-link secondary-button" data-link href="/console/releases">查看版本列表</a>' : ''}
              ${hasPageAccess('/runtime-nodes') ? '<a class="button-link secondary-button" data-link href="/console/runtime-nodes">查看运行节点</a>' : ''}
              <a class="button-link secondary-button" data-link href="/console/help/page-workbench-home">查看工作台帮助</a>
            </div>
          </section>
        </div>
      </div>
      <div class="page-layout equal">
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">词典规模</h2>
              <div class="section-desc">按类别查看当前词条数量。</div>
            </div>
          </div>
          <div class="summary-list">
            ${(overviewData.item.dictionary.byCategory || []).map((entry) => `
              <div class="summary-row">
                <span class="subtle">${escapeHtml(businessPropertyLabel(entry.categoryCode, entry.categoryCode))}</span>
                <span>${escapeHtml(String(entry.count))}</span>
              </div>
            `).join('') || '<div class="subtle">暂无数据。</div>'}
          </div>
        </section>
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">近期高频命中词</h2>
              <div class="section-desc">用于快速感知当前运行时的关注重点。</div>
            </div>
          </div>
          <div class="summary-list">
            ${(overviewData.item.runtime.topHitTerms || []).map((entry) => `
              <div class="summary-row">
                <span class="subtle">${escapeHtml(entry.canonicalText)}</span>
                <span>${escapeHtml(String(entry.hitCount))}</span>
              </div>
            `).join('') || '<div class="subtle">暂无数据。</div>'}
          </div>
        </section>
      </div>
    </div>
  `;
}

async function renderRuntimeVerify() {
  pageTitle.textContent = '运行验证';
  const runtimeCurrent = await fetchJson('/api/console/runtime-verify/current');
  const state = currentRuntimeVerifyState();
  const stableVersion = (((runtimeCurrent || {}).stable) || {}).version || '未加载';
  const canaryVersion = (((runtimeCurrent || {}).canary) || {}).version || '当前无灰度';
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '运行治理', href: '/console/runtime' }, { label: '运行验证' }])}
      <div class="page-layout with-aside layout-priority-main">
        <div class="page-main">
          <section class="panel page-hero">
            <div class="section-head">
              <div class="page-hero-copy">
                <div class="page-hero-kicker">运行治理</div>
                <h2 class="page-hero-title">运行验证</h2>
                <div class="page-hero-desc">同页验证 correct 与 correct_cand 两条 POST 接口，先看当前版本，再执行运行验证。</div>
              </div>
              ${renderPageHelpLink('page-runtime-verify', '查看运行验证帮助')}
            </div>
            <div class="inline-badge-row" style="margin-bottom:14px;">
              <span class="badge">stable=${escapeHtml(stableVersion)}</span>
              <span class="badge">canary=${escapeHtml(canaryVersion)}</span>
            </div>
            ${state.lastError ? `
              <section class="callout danger">
                <h3 class="callout-title">最近一次验证失败</h3>
                <p>${escapeHtml(state.lastError)}</p>
              </section>
            ` : ''}
          </section>
          <div class="page-layout equal">
            <section class="panel">
              <div class="section-head">
                <div>
                  <h2 class="section-title">correct 验证</h2>
                  <div class="section-desc">验证正式黑盒接口，仅返回单条主纠错结果。</div>
                </div>
              </div>
              <form data-action="run-runtime-verify-correct" class="form-grid">
                ${textareaField({
                  label: '输入文本',
                  name: 'text',
                  value: state.text,
                  placeholder: '输入一段包含错误词或近音词的业务文本',
                })}
                ${inputField({
                  label: 'trafficKey',
                  name: 'trafficKey',
                  value: state.trafficKey,
                  placeholder: '例如：console-verify-001',
                })}
                <div class="form-actions">
                  ${renderFeatureAction('runtimeVerify.correct', '<button type="submit">执行 correct</button>', '执行 correct', '当前身份不能执行正式纠错验证。')}
                </div>
              </form>
              <div style="margin-top:14px;">
                ${renderCorrectedTextResult(state.lastCorrectResult)}
              </div>
            </section>
            <section class="panel">
              <div class="section-head">
                <div>
                  <h2 class="section-title">correct_cand 验证</h2>
                  <div class="section-desc">验证候选接口，返回主结果加最多 3 条整句推荐。</div>
                </div>
              </div>
              <form data-action="run-runtime-verify-correct-cand" class="form-grid">
                ${textareaField({
                  label: '输入文本',
                  name: 'text',
                  value: state.text,
                  placeholder: '输入一段包含错误词或近音词的业务文本',
                })}
                ${inputField({
                  label: 'trafficKey',
                  name: 'trafficKey',
                  value: state.trafficKey,
                  placeholder: '例如：console-verify-001',
                })}
                <div class="form-actions">
                  ${renderFeatureAction('runtimeVerify.correctCand', '<button type="submit">执行 correct_cand</button>', '执行 correct_cand', '当前身份不能执行候选纠错验证。')}
                </div>
              </form>
              <div style="margin-top:14px;">
                ${renderCorrectedTextsResult((state.lastCorrectCandResult || {}).correctedTexts || [])}
              </div>
            </section>
          </div>
        </div>
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">当前版本</h2>
                <div class="section-desc">后续若扩到指定节点验证或灰度验证，这里会继续保留目标摘要。</div>
              </div>
            </div>
            <div class="summary-list">
              <div class="summary-row"><span class="subtle">正式版本</span><span class="mono">${escapeHtml(stableVersion)}</span></div>
              <div class="summary-row"><span class="subtle">灰度版本</span><span class="mono">${escapeHtml(canaryVersion)}</span></div>
              <div class="summary-row"><span class="subtle">上次验证</span><span>${escapeHtml(formatDateTime(state.updatedAt || ''))}</span></div>
            </div>
          </section>
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">后续扩展位</h2>
                <div class="section-desc">本页后续会扩到指定 runtime 节点验证和灰度验证，当前先收口 cluster 当前口径。</div>
              </div>
            </div>
            <div class="callout">
              <h3 class="callout-title">当前范围</h3>
              <ol>
                <li>先验证 correct 主结果。</li>
                <li>再验证 correct_cand 候选整句集合。</li>
                <li>后续再接指定节点与灰度对比，不在本轮混做。</li>
              </ol>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

/**
 * 功能：根据当前备案节点生成运行时部署配置说明。
 * 输入：节点备案对象。
 * 输出：包含管理面地址、节点端口、环境变量模板和启动命令的对象。
 */
function buildRuntimeNodeDeploymentGuide(node = {}) {
  const deploymentMeta = runtimeNodeDeploymentGuideMeta || {};
  const nodeAddress = String(node.address || '').trim();
  let parsedAddress = null;
  try {
    parsedAddress = nodeAddress ? new URL(nodeAddress) : null;
  } catch {
    parsedAddress = null;
  }
  const adminBaseUrl = String(deploymentMeta.adminBaseUrl || location.origin || '').trim() || 'http://127.0.0.1:8788';
  const runtimePort = parsedAddress && parsedAddress.port ? parsedAddress.port : '8787';
  const instanceId = String(node.nodeId || 'runtime-node').trim() || 'runtime-node';
  const nodeName = String(node.nodeName || '').trim();
  const nodeEnv = String(node.env || '').trim();
  const runtimeTokenConfigured = deploymentMeta.runtimeTokenConfigured === true;
  const runtimeTokenValue = String(deploymentMeta.runtimeTokenValue || '').trim();
  const runtimeDeliveryMode = String(deploymentMeta.runtimeDeliveryMode || '').trim() || 'file';
  const runtimeArtifactBaseUrl = String(deploymentMeta.runtimeArtifactBaseUrl || '').trim() || adminBaseUrl;
  const runtimeArtifactSignedUrlConfigured = deploymentMeta.runtimeArtifactSignedUrlConfigured === true;
  const envLines = [
    runtimeTokenConfigured ? `ACDP_RUNTIME_TOKEN=${runtimeTokenValue}` : '',
    `ACDP_RUNTIME_PORT=${runtimePort}`,
    `ACDP_RUNTIME_CONTROL_ADMIN_BASE_URL=${adminBaseUrl}`,
    `ACDP_RUNTIME_ARTIFACT_BASE_URL=${runtimeArtifactBaseUrl}`,
    `ACDP_RUNTIME_CONTROL_NODE_ID=${String(node.nodeId || '').trim()}`,
    `ACDP_RUNTIME_CONTROL_NODE_NAME=${nodeName}`,
    `ACDP_RUNTIME_CONTROL_NODE_ENV=${nodeEnv}`,
    `ACDP_RUNTIME_CONTROL_NODE_ADDRESS=${nodeAddress}`,
    'ACDP_RUNTIME_CONTROL_REGISTRATION_SECRET=<创建或轮换时返回的明文密钥>',
  ].filter(Boolean);
  return {
    adminBaseUrl,
    instanceId,
    runtimePort,
    runtimeTokenConfigured,
    runtimeTokenValue,
    runtimeDeliveryMode,
    runtimeArtifactBaseUrl,
    runtimeArtifactSignedUrlConfigured,
    currentReleaseId: String(deploymentMeta.currentReleaseId || '').trim(),
    currentDesiredVersion: String(deploymentMeta.currentDesiredVersion || '').trim(),
    currentArtifactKind: String(deploymentMeta.currentArtifactKind || '').trim(),
    currentArtifactUrl: String(deploymentMeta.currentArtifactUrl || '').trim(),
    currentArtifactDownloadPathPattern: String(deploymentMeta.currentArtifactDownloadPathPattern || '').trim(),
    note: String(deploymentMeta.note || '').trim(),
    envLines,
    shellCommand: `${envLines.join(' ')} npm run start:runtime`,
    instanceCommand: `${runtimeTokenConfigured ? `ACDP_RUNTIME_TOKEN=${runtimeTokenValue} ` : ''}npm run start:runtime:instance -- --instance ${instanceId} --port ${runtimePort} --node-id ${String(node.nodeId || '').trim()} --node-name "${nodeName}" --node-env ${nodeEnv} --node-address ${nodeAddress} --admin-base-url ${adminBaseUrl} --registration-secret <创建或轮换时返回的明文密钥>`,
    serviceCommand: `${runtimeTokenConfigured ? `ACDP_RUNTIME_TOKEN=${runtimeTokenValue} ` : ''}npm run service:start:runtime -- --port ${runtimePort} --node-id ${String(node.nodeId || '').trim()} --node-name "${String(node.nodeName || '').trim()}" --node-env ${String(node.env || '').trim()} --node-address ${nodeAddress} --admin-base-url ${adminBaseUrl} --registration-secret <创建或轮换时返回的明文密钥>`,
  };
}

async function renderRuntimeNodeRegistry() {
  pageTitle.textContent = '节点备案';
  const route = currentRouteContext();
  const listView = await fetchRuntimeNodeRegistryListViewData({
    page: route.query.get('page') || 1,
    nodeId: route.query.get('nodeId') || '',
  });
  const { nodeId, data } = listView;
  const detail = nodeId ? await fetchJson(`/api/console/runtime-node-registry/${encodeURIComponent(nodeId)}`) : null;
  const editing = detail ? detail.item : null;
  runtimeNodeDeploymentGuideMeta = {
    nodeId: '',
    adminBaseUrl: '',
    runtimeTokenConfigured: false,
    runtimeTokenValue: '',
    runtimeDeliveryMode: 'file',
    runtimeArtifactBaseUrl: '',
    runtimeArtifactSignedUrlConfigured: false,
    currentReleaseId: '',
    currentDesiredVersion: '',
    currentArtifactKind: '',
    currentArtifactUrl: '',
    currentArtifactDownloadPathPattern: '',
    note: '',
    fetchedAt: 0,
  };
  if (editing && hasPageFeature('runtimeNodeRegistry.manage')) {
    try {
      const deploymentGuide = await fetchJson(`/api/console/runtime-node-registry/${encodeURIComponent(editing.nodeId)}/deployment-guide`);
      runtimeNodeDeploymentGuideMeta = {
        ...(deploymentGuide.item || {}),
        fetchedAt: Date.now(),
      };
    } catch {}
  }
  const deploymentGuide = editing ? buildRuntimeNodeDeploymentGuide(editing) : null;
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '运行治理', href: '/console/runtime' }, { label: '节点备案' }])}
      <div class="page-layout with-aside layout-priority-main">
        <div class="page-main">
          ${(data.orphanRuntimeCount || 0) > 0 ? `
            <section class="callout warning">
              <h3 class="callout-title">发现未备案 runtime 接入事件</h3>
              <p>当前有 ${escapeHtml(String(data.orphanRuntimeCount || 0))} 个 runtime 正在上报，但不在备案台账中。它们不会进入“运行节点”主列表，请先确认是否需要补备案，或清理异常进程。</p>
              ${renderTechnicalDetails('查看未备案接入事件', JSON.stringify(data.orphanRuntimeEvents || [], null, 2))}
            </section>
          ` : ''}
          ${renderRuntimeNodeRegistryResultsSurface(listView)}
        </div>
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">${editing ? '编辑备案节点' : '新增备案节点'}</h2>
                <div class="section-desc">首次创建会返回一次性明文密钥；轮换后旧密钥立即失效。</div>
              </div>
            </div>
            ${hasPageFeature('runtimeNodeRegistry.manage') ? `<form data-action="${editing ? 'update-runtime-node-registry' : 'create-runtime-node-registry'}" action="${editing ? `/api/console/runtime-node-registry/${encodeURIComponent(editing.nodeId)}` : '/api/console/runtime-node-registry'}" class="form-grid compact">
              ${inputField({ label: '节点 ID', name: 'nodeId', value: editing ? editing.nodeId : '', required: true, readonly: editing ? true : false })}
              ${inputField({ label: '节点名称', name: 'nodeName', value: editing ? editing.nodeName : '', required: true })}
              ${inputField({ label: '环境', name: 'env', value: editing ? editing.env : 'test' })}
              ${inputField({ label: '地址', name: 'address', value: editing ? editing.address : 'http://127.0.0.1:8787', required: true })}
              ${textareaField({ label: '备注', name: 'remarks', value: editing ? editing.remarks : '', placeholder: '记录宿主、用途或接入说明。' })}
              <div class="form-actions">
                <button type="submit">${editing ? '保存备案' : '创建备案'}</button>
                ${editing ? `<a class="button-link secondary-button" data-link href="/console/runtime-node-registry">新建其他节点</a>` : ''}
              </div>
            </form>` : renderEmptyState('当前身份没有“维护节点备案台账”页面功能。')}
          </section>
          ${editing ? `<section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">节点操作</h2>
                <div class="section-desc">启停备案和轮换密钥都属于高风险动作，单独放到次级区域。</div>
              </div>
            </div>
            <div class="inline-actions">
              ${editing.enabled
                ? renderFeatureAction('runtimeNodeRegistry.manage', `<form data-action="disable-runtime-node-registry" action="/api/console/runtime-node-registry/${encodeURIComponent(editing.nodeId)}/disable"><button type="submit" class="danger-button">禁用备案</button></form>`, '禁用备案', '当前身份不能禁用节点备案。')
                : renderFeatureAction('runtimeNodeRegistry.manage', `<form data-action="enable-runtime-node-registry" action="/api/console/runtime-node-registry/${encodeURIComponent(editing.nodeId)}/enable"><button type="submit">启用备案</button></form>`, '启用备案', '当前身份不能启用节点备案。')}
              ${renderFeatureAction('runtimeNodeRegistry.manage', `<form data-action="rotate-runtime-node-secret" action="/api/console/runtime-node-registry/${encodeURIComponent(editing.nodeId)}/rotate-secret"><button type="submit" class="secondary-button">轮换密钥</button></form>`, '轮换密钥', '当前身份不能轮换节点密钥。')}
              <a class="button-link secondary-button" data-link href="/console/runtime-nodes">查看运行节点</a>
            </div>
          </section>
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">部署与注册说明</h2>
                <div class="section-desc">针对当前节点，直接给出运行时接入 admin 所需的关键配置项、启动示例和注册注意事项。</div>
              </div>
              ${renderPageHelpLink('page-runtime-node-registry', '查看节点备案帮助')}
            </div>
            <div class="summary-list">
              <div class="summary-row"><span class="subtle">节点 ID</span><span class="mono">${escapeHtml(editing.nodeId)}</span></div>
              <div class="summary-row"><span class="subtle">节点名称</span><span>${escapeHtml(editing.nodeName || editing.nodeId)}</span></div>
              <div class="summary-row"><span class="subtle">环境</span><span>${escapeHtml(editing.env || '未标注')}</span></div>
                <div class="summary-row"><span class="subtle">节点地址</span><span class="mono">${escapeHtml(editing.address || '')}</span></div>
                <div class="summary-row"><span class="subtle">管理面地址</span><span class="mono">${escapeHtml((deploymentGuide || {}).adminBaseUrl || '')}</span></div>
                <div class="summary-row"><span class="subtle">下发模式</span><span><span class="badge info">${escapeHtml((deploymentGuide || {}).runtimeDeliveryMode || '未记录')}</span></span></div>
                <div class="summary-row"><span class="subtle">制品下载基准地址</span><span class="mono">${escapeHtml((deploymentGuide || {}).runtimeArtifactBaseUrl || '')}</span></div>
                <div class="summary-row"><span class="subtle">实例 ID</span><span class="mono">${escapeHtml((deploymentGuide || {}).instanceId || '')}</span></div>
                <div class="summary-row"><span class="subtle">运行端口</span><span class="mono">${escapeHtml((deploymentGuide || {}).runtimePort || '')}</span></div>
                <div class="summary-row"><span class="subtle">runtime token</span><span>${(deploymentGuide || {}).runtimeTokenConfigured ? '<span class="badge success">已注入</span>' : '<span class="badge">未启用</span>'}</span></div>
                <div class="summary-row"><span class="subtle">签名密钥状态</span><span>${(deploymentGuide || {}).runtimeArtifactSignedUrlConfigured ? '<span class="badge success">admin 已配置</span>' : '<span class="badge">admin 未配置</span>'}</span></div>
              </div>
            <section class="callout warning" style="margin-top:14px;">
              <h3 class="callout-title">密钥提示</h3>
              <p>当前页面不会回显历史明文密钥。部署时请使用“创建备案”或“轮换密钥”动作返回的明文 registrationSecret；如果已经遗失，请先轮换再部署。</p>
            </section>
            ${(deploymentGuide || {}).note ? `
              <section class="callout" style="margin-top:14px;">
                <h3 class="callout-title">当前 admin 鉴权提示</h3>
                <p>${escapeHtml((deploymentGuide || {}).note)}</p>
              </section>
            ` : ''}
            ${renderTechnicalDetails('查看环境变量模板', (((deploymentGuide || {}).envLines) || []).join('\n'))}
            ${renderTechnicalDetails('查看直接启动命令示例', (deploymentGuide || {}).shellCommand || '')}
            ${renderTechnicalDetails('查看 runtime 实例启动命令示例', (deploymentGuide || {}).instanceCommand || '')}
            ${renderTechnicalDetails('查看守护启动命令示例', (deploymentGuide || {}).serviceCommand || '')}
            ${renderTechnicalDetails('查看制品下载地址', (deploymentGuide || {}).currentArtifactUrl || '')}
            ${renderTechnicalDetails('查看制品下载地址模式', (deploymentGuide || {}).currentArtifactDownloadPathPattern || '')}
          </section>` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * 功能：渲染`runtime nodes`相关逻辑。
 * 输入：无。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function renderRuntimeNodes() {
  const route = currentRouteContext();
  pageTitle.textContent = '运行节点';
  const refreshedAt = new Date().toISOString();
  const [view, rolloutData] = await Promise.all([
    fetchRuntimeNodesViewData({
      page: route.query.get('page') || 1,
      status: route.query.get('status') || '',
      env: route.query.get('env') || '',
    }),
    fetchJson('/api/console/runtime-control'),
  ]);
  const { status, env, data, issueSummary, summary } = view;
  const rollout = rolloutData.item || {};
  const recoveredIssueCount = Number(issueSummary.recoveredCount || 0);
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '运行治理', href: '/console/runtime' }, { label: '运行节点' }])}
      ${renderMetricCardGrid([
        { label: '备案节点数', value: summary.totalCount || 0 },
        { label: '已禁用备案', value: summary.disabledRegistryCount || 0, hideWhenZero: true },
        { label: '未注册节点', value: summary.notRegisteredCount || 0, hideWhenZero: true },
        { label: '在线节点', value: summary.onlineCount || 0, hideWhenZero: true },
        { label: '离线节点', value: summary.offlineCount || 0, hideWhenZero: true },
        { label: '当前异常节点', value: summary.activeIssueCount || 0, hideWhenZero: true },
        { label: '未备案接入事件', value: summary.orphanRuntimeCount || 0, hideWhenZero: true },
      ])}
      <div class="page-layout import-home-stacked">
        <div class="page-main">
          <section class="panel page-hero">
            <div class="section-head">
              <div class="page-hero-copy">
                <div class="page-hero-kicker">运行治理</div>
                <h2 class="page-hero-title">备案节点治理视图</h2>
                <div class="page-hero-desc">主列表只展示已备案节点，先看备案与注册，再看实时状态、目标版本、最近动作和历史异常；未备案 runtime 只作为异常接入事件处理。</div>
              </div>
              ${renderPageHelpLink('page-runtime-nodes', '查看运行节点帮助')}
            </div>
            ${renderRuntimeIssueFocus(issueSummary)}
          </section>
          ${(data.orphanRuntimeCount || 0) > 0 ? `
            <section class="callout warning">
              <h3 class="callout-title">未备案运行时接入事件</h3>
              <p>当前有 ${escapeHtml(String(data.orphanRuntimeCount || 0))} 个 runtime 仍在上报，但不在备案台账中。它们不会进入主列表，请先回到节点备案确认是否需要补备案，或清理异常进程。</p>
              ${renderTechnicalDetails('查看未备案接入事件', JSON.stringify(data.orphanRuntimeEvents || [], null, 2))}
            </section>
          ` : ''}
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">运行节点列表</h2>
                <div class="section-desc">列表按“备案状态 → 注册状态 → 实时状态 → 目标状态 → 最近动作 → 历史异常”的顺序展开，避免再把历史和实时混读。</div>
              </div>
            </div>
            <div class="panel-stack">
              <section class="surface-block surface-block-soft">
                <div class="surface-head">
                  <div>
                    <h3 class="surface-title">筛选条件</h3>
                    <div class="surface-desc">筛选后的排序规则和分页布局保持一致，便于在不同视图之间切换。</div>
                  </div>
                </div>
                <form data-action="filter-runtime-nodes" class="toolbar-form toolbar-form-inline">
                  ${selectField({ label: '节点状态', name: 'status', value: status, options: RUNTIME_NODE_STATUS_OPTIONS })}
                  ${inputField({ label: '环境标识', name: 'env', value: env, placeholder: '例如：test / prod' })}
                  <div class="form-actions">
                    <button type="submit">应用筛选</button>
                    <button type="button" class="secondary-button" data-action="clear-runtime-node-filters">清空筛选</button>
                  </div>
                </form>
              </section>
              ${renderRuntimeNodesResultsSurface(view)}
            </div>
          </section>
        </div>
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">当前下发目标版本</h2>
                <div class="section-desc">收敛状态和控制动作放在同一块，便于在看完异常后直接处理。</div>
              </div>
            </div>
            <div class="summary-list" style="margin-bottom:14px;">
              <div class="summary-row"><span class="subtle">上次刷新</span><span>${escapeHtml(formatDateTime(refreshedAt))}</span></div>
              <div class="summary-row"><span class="subtle">自动刷新</span><span>${runtimeAutoRefreshEnabled() ? '已开启（5s）' : '已关闭'}</span></div>
              <div class="summary-row"><span class="subtle">历史异常节点</span><span>${escapeHtml(String(recoveredIssueCount))}</span></div>
            </div>
            ${rollout.control ? `
              <div class="grid cards compact">
                ${metricCard('目标版本', rollout.control.desiredVersion || '未下发')}
                ${metricCard('已对齐节点', (rollout.summary || {}).alignedNodes || 0)}
                ${metricCard('待收敛节点', (rollout.summary || {}).pendingNodes || 0)}
                ${metricCard('失败节点', (rollout.summary || {}).failedNodes || 0)}
              </div>
              <div class="summary-list" style="margin-top:14px;">
                <div class="summary-row"><span class="subtle">发布 ID</span><span class="mono">${escapeHtml((rollout.control || {}).releaseId || '未记录')}</span></div>
                <div class="summary-row"><span class="subtle">下发时间</span><span>${escapeHtml(formatDateTime((rollout.control || {}).issuedAt))}</span></div>
                <div class="summary-row"><span class="subtle">配置版本</span><span>${escapeHtml(String((rollout.control || {}).configVersion || 0))}</span></div>
                <div class="summary-row"><span class="subtle">目标已下发节点</span><span>${escapeHtml(String((rollout.summary || {}).desiredNodes || 0))}</span></div>
                <div class="summary-row"><span class="subtle">尚未切到目标</span><span>${escapeHtml(String((rollout.summary || {}).untouchedNodes || 0))}</span></div>
              </div>
              <div class="action-zone" style="margin-top:14px;">
                <div class="action-zone-title">控制动作</div>
                <div class="action-zone-desc">先看当前目标版本，再决定是否重新下发。</div>
                <div class="inline-actions">
                  <form data-action="refresh-current-route" action="/console/runtime-nodes">
                    <button type="submit" class="secondary-button">手动刷新</button>
                  </form>
                  <form data-action="toggle-runtime-auto-refresh" action="/console/runtime-nodes">
                    <input type="hidden" name="enabled" value="${runtimeAutoRefreshEnabled() ? 'false' : 'true'}">
                    <button type="submit" class="secondary-button">${runtimeAutoRefreshEnabled() ? '关闭自动刷新' : '开启自动刷新'}</button>
                  </form>
                  ${hasPageAccess('/runtime-node-registry') ? '<a class="button-link secondary-button" data-link href="/console/runtime-node-registry">查看节点备案</a>' : ''}
                  ${rollout.control && hasPageAccess('/releases') ? `<a class="button-link secondary-button" data-link href="/console/releases/${encodeURIComponent((rollout.control || {}).releaseId || '')}">查看目标版本</a>` : ''}
                  ${renderFeatureAction('releases.rollout', `
                    <form data-action="reissue-runtime-rollout" action="/api/console/runtime-control/desired-version">
                      <input type="hidden" name="releaseId" value="${escapeHtml((rollout.control || {}).releaseId || '')}">
                      <button type="submit">重新下发当前目标版本</button>
                    </form>
                  `, '重新下发当前目标版本', '当前身份不能执行目标版本下发。')}
                </div>
              </div>
            ` : renderEmptyState('当前控制面还没有下发目标版本。')}
          </section>
        </div>
      </div>
    </div>
  `;
}

/**
 * 功能：渲染`runtime node detail`相关逻辑。
 * 输入：`nodeId`（运行节点 ID）。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function renderRuntimeNodeDetail(nodeId) {
  pageTitle.textContent = '运行节点详情';
  const refreshedAt = new Date().toISOString();
  const data = await fetchJson(`/api/console/runtime-nodes/${encodeURIComponent(nodeId)}`);
  const item = data.item;
  const runtimeCurrentIssue = (((item || {}).issues) || {}).current || null;
  const runtimeHistoryIssueRaw = (((item || {}).issues) || {}).history || null;
  const runtimeIssue = runtimeCurrentIssue
    ? runtimeIssueDescriptor({ issue: runtimeCurrentIssue, lastError: (((item || {}).issues) || {}).lastError || ((item.basic || {}).lastError || '') })
    : { lifecycle: 'none', status: 'healthy', title: '当前无异常', detail: '', recovery: '', rawMessage: '' };
  const runtimeHistoryIssue = runtimeHistoryIssueRaw
    ? runtimeIssueDescriptor({ issue: runtimeHistoryIssueRaw, lastError: (((item || {}).issues) || {}).lastError || ((item.basic || {}).lastError || '') })
    : { lifecycle: 'none', status: 'healthy', title: '当前无历史异常', detail: '', recovery: '', rawMessage: '' };
  const artifactUrl = (((item.control || {}).artifactMetadata || {}).primaryArtifact || {}).artifactUrl || '';
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '运行治理', href: '/console/runtime' }, { label: '运行节点', href: '/console/runtime-nodes' }, { label: item.basic.nodeName || item.basic.nodeId }])}
      <div class="grid cards compact">
        ${metricCard('近 24h 请求', (item.requestSummary || {}).requestCount24h || 0)}
        ${metricCard('近 24h 命中', (item.requestSummary || {}).hitTermCount24h || 0)}
        ${metricCard('历史峰值并发', (item.peak || {}).peakConcurrency || 0)}
        ${metricCard('配置版本', item.control ? item.control.configVersion : 0)}
      </div>
      <div class="page-layout with-aside layout-priority-main">
        <div class="page-main">
          <section class="panel page-hero">
            <div class="section-head">
              <div class="page-hero-copy">
                <div class="page-hero-kicker">运行治理</div>
                <h2 class="page-hero-title">备案节点状态详情</h2>
                <div class="page-hero-desc">详情页先看备案与注册，再看实时状态、目标版本、最近动作和历史异常。历史异常只用于追溯，不再冒充当前状态。</div>
              </div>
            </div>
            <div class="inline-badge-row" style="margin-bottom:14px;">
              <span class="${(((item.registry || {}).enabled) === false) ? 'badge warning' : 'badge success'}">${escapeHtml(((item.registry || {}).label) || '备案已启用')}</span>
              <span class="${item.isRegistryOnly ? 'badge warning' : 'badge success'}">${escapeHtml(((item.registration || {}).label) || (item.isRegistryOnly ? '未注册' : '已注册'))}</span>
              ${renderBadge((item.basic || {}).status)}
              <span class="${(((item.target || {}).alignmentStatus) === 'aligned') ? 'badge success' : 'badge warning'}">${escapeHtml(((item.target || {}).alignmentLabel) || '尚未下发')}</span>
              ${runtimeIssue.lifecycle !== 'none'
                ? `<span class="${badgeClass(runtimeIssue.status)}">当前异常</span>`
                : '<span class="badge success">当前无异常</span>'}
              ${runtimeHistoryIssue.lifecycle !== 'none'
                ? '<span class="badge success">存在历史异常</span>'
                : ''}
            </div>
            <div class="summary-list">
              <div class="summary-row"><span class="subtle">节点名称</span><span>${escapeHtml(item.basic.nodeName || item.basic.nodeId)}</span></div>
              <div class="summary-row"><span class="subtle">节点 ID</span><span class="mono">${escapeHtml(item.basic.nodeId)}</span></div>
              <div class="summary-row"><span class="subtle">环境 / 地址</span><span>${escapeHtml(item.basic.env || '未标注')} / ${escapeHtml(item.basic.address || '未记录')}</span></div>
              <div class="summary-row"><span class="subtle">备案状态</span><span>${escapeHtml(((item.registry || {}).label) || '未记录')}</span></div>
              <div class="summary-row"><span class="subtle">注册状态</span><span>${escapeHtml(((item.registration || {}).label) || (item.isRegistryOnly ? '未注册' : '已注册'))}</span></div>
              <div class="summary-row"><span class="subtle">注册说明</span><span>${escapeHtml(((item.registration || {}).detail) || '未记录')}</span></div>
              <div class="summary-row"><span class="subtle">目标对齐</span><span>${escapeHtml(((item.target || {}).alignmentLabel) || '未记录')}</span></div>
              <div class="summary-row"><span class="subtle">状态原因</span><span>${escapeHtml(displayLabel(item.basic.statusReason) || item.basic.statusReason || '未记录')}</span></div>
              <div class="summary-row"><span class="subtle">最近心跳</span><span>${escapeHtml(formatDateTime(item.basic.lastHeartbeatAt))}</span></div>
              <div class="summary-row"><span class="subtle">心跳距今 / 阈值</span><span class="mono">${escapeHtml(formatDurationSeconds(item.basic.heartbeatAgeSeconds))} / ${escapeHtml(formatDurationSeconds(item.basic.offlineThresholdSeconds))}</span></div>
              <div class="summary-row"><span class="subtle">最近应用时间</span><span>${escapeHtml(formatDateTime(item.basic.lastApplyAt))}</span></div>
            </div>
            <div class="grid cards compact" style="margin-top:14px;">
              ${metricCard('当前版本', item.basic.currentVersion || '未安装')}
              ${metricCard('目标版本', item.basic.desiredVersion || '未下发')}
              ${metricCard('最近应用', displayLabel(item.basic.lastApplyStatus) || item.basic.lastApplyStatus || '未记录')}
              ${metricCard('心跳距今', formatDurationSeconds(item.basic.heartbeatAgeSeconds))}
            </div>
            ${runtimeIssue.lifecycle !== 'none' ? `
              <section class="${escapeHtml(runtimeIssueCalloutClass(runtimeIssue))}" style="margin-top:14px;">
                <h3 class="callout-title">${escapeHtml(runtimeIssue.title || '当前异常')}</h3>
                ${runtimeIssue.detail ? `<p>${escapeHtml(runtimeIssue.detail)}</p>` : ''}
                ${runtimeIssue.recovery ? `<p>${escapeHtml(runtimeIssue.recovery)}</p>` : ''}
                ${renderTechnicalDetails('查看原始错误信息', runtimeIssue.rawMessage)}
              </section>
            ` : ''}
            ${runtimeHistoryIssue.lifecycle !== 'none' ? `
              <section class="callout success" style="margin-top:14px;">
                <h3 class="callout-title">${escapeHtml(runtimeHistoryIssue.title || '历史异常')}</h3>
                ${runtimeHistoryIssue.detail ? `<p>${escapeHtml(runtimeHistoryIssue.detail)}</p>` : ''}
                ${renderTechnicalDetails('查看历史异常原始信息', runtimeHistoryIssue.rawMessage)}
              </section>
            ` : ''}
          </section>
          <div class="page-layout equal">
            <section class="panel">
              <div class="section-head">
                <div>
                  <h2 class="section-title">实时状态与目标版本</h2>
                  <div class="section-desc">先明确当前实时状态和目标版本，再决定是否需要重新下发或排查控制面。</div>
                </div>
              </div>
              ${item.isRegistryOnly ? renderEmptyState('该节点当前还没有成功注册到 admin，因此还没有控制面状态、制品元数据和运行统计。请先回到“节点备案”检查部署配置说明。') : item.control ? `
                <div class="summary-list">
                  <div class="summary-row"><span class="subtle">实时状态</span><span>${renderBadge((item.realtime || {}).status || item.basic.status)}</span></div>
                  <div class="summary-row"><span class="subtle">运行时版本</span><span>${escapeHtml((item.realtime || {}).runtimeVersion || item.basic.runtimeVersion || '未记录')}</span></div>
                  <div class="summary-row"><span class="subtle">当前版本</span><span class="mono">${escapeHtml((item.target || {}).currentVersion || item.basic.currentVersion || '未安装')}</span></div>
                  <div class="summary-row"><span class="subtle">目标版本</span><span class="mono">${escapeHtml(item.control.desiredVersion || '未下发')}</span></div>
                  <div class="summary-row"><span class="subtle">目标对齐</span><span>${escapeHtml(((item.target || {}).alignmentLabel) || '未记录')}</span></div>
                  <div class="summary-row"><span class="subtle">下发时间</span><span>${escapeHtml(formatDateTime(item.control.issuedAt))}</span></div>
                  <div class="summary-row"><span class="subtle">配置版本</span><span>${escapeHtml(String(item.control.configVersion || 0))}</span></div>
                  <div class="summary-row"><span class="subtle">主制品</span><span class="mono">${escapeHtml((((item.control || {}).artifactMetadata || {}).primaryArtifact || {}).kind || '未记录')}</span></div>
                  <div class="summary-row"><span class="subtle">下载地址</span><span>${artifactUrl ? '<span class="badge success">已生成临时下载地址</span>' : '<span class="badge">未记录</span>'}</span></div>
                </div>
                ${renderTechnicalDetails('查看制品下载地址', artifactUrl)}
              ` : renderEmptyState('当前控制面还没有下发版本状态。')}
            </section>
            <section class="panel">
              <div class="section-head">
                <div>
                  <h2 class="section-title">最近动作结果</h2>
                  <div class="section-desc">最近动作只表示“最近一次应用发生了什么”，不再和当前实时状态混读。</div>
                </div>
              </div>
              <div class="summary-list">
                <div class="summary-row"><span class="subtle">最近应用结果</span><span>${(item.recentAction || {}).lastApplyStatus ? renderBadge((item.recentAction || {}).lastApplyStatus) : '未记录应用'}</span></div>
                <div class="summary-row"><span class="subtle">最近应用时间</span><span>${escapeHtml(formatDateTime((item.recentAction || {}).lastApplyAt || item.basic.lastApplyAt))}</span></div>
                <div class="summary-row"><span class="subtle">历史异常</span><span>${runtimeHistoryIssue.lifecycle !== 'none' ? '存在历史异常' : '当前无历史异常'}</span></div>
              </div>
            </section>
          </div>
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">Top 命中词条</h2>
                <div class="section-desc">查看该节点最近累计最常命中的词条。</div>
              </div>
            </div>
            ${item.isRegistryOnly ? renderEmptyState('该节点当前尚未注册，因此还没有命中统计。') : renderDenseTable([
              { label: '标准词', render: (entry) => escapeHtml(entry.canonicalText) },
              { label: '命中次数', render: (entry) => escapeHtml(String(entry.hitCount || 0)) },
            ], item.topTerms || [], '当前节点还没有词条命中统计。', { scrollSizeClass: 'panel-scroll-small', collapseThreshold: 8, collapsedSummary: '高频命中词较多，默认收起明细' })}
          </section>
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">最近 24 小时</h2>
                <div class="section-desc">查看节点级请求与命中摘要。</div>
              </div>
            </div>
            ${item.isRegistryOnly ? renderEmptyState('该节点当前尚未注册，因此还没有 24 小时请求统计。') : renderDenseTable([
              { label: '小时', render: (entry) => `<span class="mono">${escapeHtml(entry.hourKey)}</span>` },
              { label: '总请求', render: (entry) => escapeHtml(String(entry.requestCount || 0)) },
              { label: 'HTTP', render: (entry) => escapeHtml(String(entry.httpRequestCount || 0)) },
              { label: 'WS', render: (entry) => escapeHtml(String(entry.wsRequestCount || 0)) },
              { label: '命中数', render: (entry) => escapeHtml(String(entry.hitTermCount || 0)) },
            ], item.hourly || [], '当前节点还没有统计回传。', { scrollSizeClass: 'panel-scroll-medium', collapseThreshold: 10, collapsedSummary: '最近 24 小时统计较多，默认收起明细' })}
          </section>
        </div>
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">一线处置</h2>
                <div class="section-desc">控制信息和操作靠近顶层诊断区，先支持定位和处置，再去看下方趋势数据。</div>
              </div>
            </div>
            <div class="summary-list" style="margin-bottom:14px;">
              <div class="summary-row"><span class="subtle">目标版本</span><span class="mono">${escapeHtml((item.control || {}).desiredVersion || item.basic.desiredVersion || '未下发')}</span></div>
              <div class="summary-row"><span class="subtle">下发时间</span><span>${escapeHtml(formatDateTime((item.control || {}).issuedAt))}</span></div>
              <div class="summary-row"><span class="subtle">配置版本</span><span>${escapeHtml(String((item.control || {}).configVersion || 0))}</span></div>
              <div class="summary-row"><span class="subtle">下载地址</span><span>${artifactUrl ? '<span class="badge success">已生成</span>' : '<span class="badge">未记录</span>'}</span></div>
              <div class="summary-row"><span class="subtle">上次刷新</span><span>${escapeHtml(formatDateTime(refreshedAt))}</span></div>
              <div class="summary-row"><span class="subtle">自动刷新</span><span>${runtimeAutoRefreshEnabled() ? '已开启（5s）' : '已关闭'}</span></div>
              <div class="summary-row"><span class="subtle">本地统计游标</span><span class="mono">${escapeHtml(String(item.basic.runtimeStatsCursor || '0'))}</span></div>
              <div class="summary-row"><span class="subtle">运行时版本</span><span>${escapeHtml(item.basic.runtimeVersion || '未记录')}</span></div>
            </div>
            <div class="action-zone">
              <div class="action-zone-title">控制动作</div>
              <div class="action-zone-desc">这些动作直接服务当前节点的观察和目标版本确认。</div>
              <div class="inline-actions">
                <form data-action="refresh-current-route" action="/console/runtime-nodes/${encodeURIComponent(nodeId)}">
                  <button type="submit" class="secondary-button">手动刷新</button>
                </form>
                <form data-action="toggle-runtime-auto-refresh" action="/console/runtime-nodes/${encodeURIComponent(nodeId)}">
                  <input type="hidden" name="enabled" value="${runtimeAutoRefreshEnabled() ? 'false' : 'true'}">
                  <button type="submit" class="secondary-button">${runtimeAutoRefreshEnabled() ? '关闭自动刷新' : '开启自动刷新'}</button>
                </form>
                ${item.isRegistryOnly && hasPageAccess('/runtime-node-registry')
                  ? `<a class="button-link secondary-button" data-link href="/console/runtime-node-registry?nodeId=${encodeURIComponent(item.basic.nodeId)}">查看节点备案</a>`
                  : ''}
                ${item.control && item.control.releaseId && hasPageAccess('/releases')
                  ? `<a class="button-link secondary-button" data-link href="/console/releases/${encodeURIComponent(item.control.releaseId)}">查看目标版本</a>`
                  : ''}
                <a class="button-link secondary-button" data-link href="/console/runtime-nodes">返回运行节点</a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

/**
 * 功能：渲染运行治理首页。
 * 输入：无。
 * 输出：无显式返回；直接写入页面。
 */
async function renderRuntimeHome() {
  pageTitle.textContent = '运行治理';
  const [registryData, runtimeData, runtimeCurrentData] = await Promise.all([
    hasPageAccess('/runtime-node-registry')
      ? fetchJson('/api/console/runtime-node-registry?page=1&pageSize=100')
      : Promise.resolve({ items: [], total: 0, orphanRuntimeCount: 0, orphanRuntimeEvents: [] }),
    hasPageAccess('/runtime-nodes')
      ? fetchJson('/api/console/runtime-nodes?page=1&pageSize=100')
      : Promise.resolve({ items: [], total: 0, issueSummary: {}, orphanRuntimeCount: 0, orphanRuntimeEvents: [] }),
    hasPageAccess('/runtime-verify')
      ? fetchJson('/api/console/runtime-verify/current')
      : Promise.resolve({ item: { stable: null, canary: null, grayPolicy: null } }),
  ]);
  const issueSummary = runtimeData.issueSummary || {};
  const runtimeCurrent = runtimeCurrentData.item || {};
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '运行治理' }])}
      <section class="panel page-hero">
        <div class="section-head">
          <div class="page-hero-copy">
            <div class="page-hero-kicker">运行治理</div>
            <h2 class="page-hero-title">备案、注册、收敛与验证</h2>
            <div class="page-hero-desc">运行治理先以备案节点为主对象，再叠加注册状态、实时状态、版本对齐、最近动作和历史异常，避免把历史结果继续混成当前状态。</div>
          </div>
          ${renderPageHelpLink('page-runtime-home', '查看运行治理帮助')}
        </div>
      </section>
      <div class="grid cards compact">
        ${metricCard('备案节点', registryData.total || 0)}
        ${metricCard('未注册节点', issueSummary.notRegisteredCount || 0)}
        ${metricCard('当前异常节点', issueSummary.activeCount || 0)}
        ${metricCard('需观察节点', issueSummary.warningCount || 0)}
        ${metricCard('历史异常节点', issueSummary.recoveredCount || 0)}
        ${metricCard('未备案接入事件', runtimeData.orphanRuntimeCount || 0)}
      </div>
      ${(runtimeData.orphanRuntimeCount || 0) > 0 ? `
        <section class="callout warning">
          <h3 class="callout-title">发现未备案运行时接入事件</h3>
          <p>当前有 ${escapeHtml(String(runtimeData.orphanRuntimeCount || 0))} 个 runtime 在上报，但不在备案台账中。它们不会进入“运行节点”主列表，应先回到节点备案确认是否需要补备案或清理异常进程。</p>
          ${renderTechnicalDetails('查看未备案接入事件', JSON.stringify(runtimeData.orphanRuntimeEvents || [], null, 2))}
        </section>
      ` : ''}
      <div class="page-layout equal">
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">节点备案</h2>
              <div class="section-desc">先建立节点台账，部署时使用该节点的唯一 <span class="mono">nodeId</span>、<span class="mono">nodeAddress</span> 和一次性明文 <span class="mono">registration-secret</span>。</div>
            </div>
          </div>
          <div class="summary-list">
            <div class="summary-row"><span class="subtle">当前备案数</span><span>${escapeHtml(String(registryData.total || 0))}</span></div>
            <div class="summary-row"><span class="subtle">已注册节点</span><span>${escapeHtml(String((runtimeData.total || 0) - Number(issueSummary.notRegisteredCount || 0)))}</span></div>
            <div class="summary-row"><span class="subtle">已禁用备案</span><span>${escapeHtml(String(issueSummary.disabledRegistryCount || 0))}</span></div>
          </div>
          <div class="inline-actions" style="margin-top:14px;">
            ${hasPageAccess('/runtime-node-registry') ? '<a class="button-link" data-link href="/console/runtime-node-registry">进入节点备案</a>' : ''}
          </div>
        </section>
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">运行节点</h2>
              <div class="section-desc">主列表只展示备案节点；优先看未注册、当前异常、实时状态和目标版本对齐。</div>
            </div>
          </div>
          <div class="summary-list">
            <div class="summary-row"><span class="subtle">当前在线</span><span>${escapeHtml(String(runtimeData.items.filter((item) => String(((item.realtime || {}).status || item.status || '').trim()) === 'online').length))}</span></div>
            <div class="summary-row"><span class="subtle">当前离线</span><span>${escapeHtml(String(runtimeData.items.filter((item) => String(((item.realtime || {}).status || item.status || '').trim()) === 'offline').length))}</span></div>
            <div class="summary-row"><span class="subtle">当前目标版本</span><span class="mono">${escapeHtml((runtimeCurrent.stable || {}).version || '未记录')}</span></div>
          </div>
          <div class="inline-actions" style="margin-top:14px;">
            ${hasPageAccess('/runtime-nodes') ? '<a class="button-link" data-link href="/console/runtime-nodes">进入运行节点</a>' : ''}
          </div>
        </section>
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">运行验证</h2>
              <div class="section-desc">当前先验证 cluster 当前口径下的 <span class="mono">correct</span> 与 <span class="mono">correct_cand</span>；后续再扩到指定节点与灰度验证。</div>
            </div>
          </div>
          <div class="summary-list">
            <div class="summary-row"><span class="subtle">当前 stable</span><span class="mono">${escapeHtml((runtimeCurrent.stable || {}).version || '未记录')}</span></div>
            <div class="summary-row"><span class="subtle">当前 canary</span><span class="mono">${escapeHtml((runtimeCurrent.canary || {}).version || '未启用')}</span></div>
            <div class="summary-row"><span class="subtle">灰度状态</span><span>${runtimeCurrent.grayPolicy && runtimeCurrent.grayPolicy.enabled ? '已启用' : '未启用'}</span></div>
          </div>
          <div class="inline-actions" style="margin-top:14px;">
            ${hasPageAccess('/runtime-verify') ? '<a class="button-link" data-link href="/console/runtime-verify">进入运行验证</a>' : ''}
          </div>
        </section>
      </div>
    </div>
  `;
}

/**
 * 功能：渲染系统配置首页。
 * 输入：无。
 * 输出：无显式返回；直接写入页面。
 */
async function renderSystemHome() {
  pageTitle.textContent = '系统管理';
  if (hasPageAccess('/users') || hasPageAccess('/roles') || hasPageAccess('/permissions')) {
    await refreshAccessControlMeta();
  }
  if (hasPageAccess('/governance-policies')) {
    await refreshGovernancePoliciesMeta();
  }
  const releasePolicies = governancePoliciesMeta.releasePolicies || {};
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '系统管理' }])}
          <section class="panel page-hero">
            <div class="section-head">
              <div class="page-hero-copy">
                <div class="page-hero-kicker">系统管理</div>
                <h2 class="page-hero-title">系统管理总览</h2>
                <div class="page-hero-desc">统一承接用户、角色、权限和治理策略等系统级配置，不再把治理配置散落在业务页面里。</div>
              </div>
              ${renderPageHelpLink('flow-system-access-governance', '查看系统管理帮助')}
            </div>
      </section>
      <div class="grid cards compact">
        ${hasPageAccess('/users') ? metricCard('用户数', accessControlMeta.users.length) : ''}
        ${hasPageAccess('/roles') ? metricCard('角色数', accessControlMeta.roles.length) : ''}
        ${hasPageAccess('/permissions') ? metricCard('权限数', accessControlMeta.permissions.length) : ''}
        ${hasPageAccess('/governance-policies') ? metricCard('治理策略', Object.keys(releasePolicies).length) : ''}
      </div>
      <div class="page-layout equal">
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">系统管理工作页</h2>
              <div class="section-desc">系统管理首页固定为总览，用来承接用户、角色、权限和治理策略 4 类稳定入口，而不是继续做泛入口页。</div>
            </div>
          </div>
          <div class="support-card-grid">
            ${hasPageAccess('/users') ? `
              <article class="card template-card support-card">
                <div class="metric-label">系统管理</div>
                <div class="template-card-title support-card-title">用户管理</div>
                <div class="support-card-summary">维护可登录后台的用户、默认角色和可切换角色。</div>
                <div class="support-card-actions"><a class="button-link" data-link href="/console/users">进入用户管理</a></div>
              </article>
            ` : ''}
            ${hasPageAccess('/roles') ? `
              <article class="card template-card support-card">
                <div class="metric-label">系统管理</div>
                <div class="template-card-title support-card-title">角色管理</div>
                <div class="support-card-summary">维护角色说明和权限集合，不再散落硬编码。</div>
                <div class="support-card-actions"><a class="button-link" data-link href="/console/roles">进入角色管理</a></div>
              </article>
            ` : ''}
            ${hasPageAccess('/permissions') ? `
              <article class="card template-card support-card">
                <div class="metric-label">系统管理</div>
                <div class="template-card-title support-card-title">权限管理</div>
                <div class="support-card-summary">查看角色与权限映射关系，明确谁能做什么。</div>
                <div class="support-card-actions"><a class="button-link" data-link href="/console/permissions">进入权限管理</a></div>
              </article>
            ` : ''}
            ${hasPageAccess('/governance-policies') ? `
              <article class="card template-card support-card">
                <div class="metric-label">系统管理</div>
                <div class="template-card-title support-card-title">治理策略</div>
                <div class="support-card-summary">维护高风险动作的分离、审批人数和执行约束。</div>
                <div class="support-card-actions"><a class="button-link" data-link href="/console/governance-policies">进入治理策略</a></div>
              </article>
            ` : ''}
          </div>
        </section>
        <section class="panel panel-soft">
          <div class="section-head">
            <div>
              <h2 class="section-title">边界说明</h2>
              <div class="section-desc">这里固定解释 RBAC 与治理策略的边界，避免后续继续在业务页面重复解释。</div>
            </div>
          </div>
          <div class="summary-list">
            <div class="summary-row"><span class="subtle">权限回答</span><span>这个角色能不能做</span></div>
            <div class="summary-row"><span class="subtle">治理策略回答</span><span>即使能做，在什么条件下允许做</span></div>
            <div class="summary-row"><span class="subtle">发布人与审核人分离</span><span>${releasePolicies.reviewerPublisherSeparationRequired === false ? '已关闭' : '已开启'}</span></div>
            <div class="summary-row"><span class="subtle">提交人与审核人分离</span><span>${releasePolicies.submitterReviewerSeparationRequired === false ? '已关闭' : '已开启'}</span></div>
            <div class="summary-row"><span class="subtle">双人审批</span><span>${releasePolicies.highRiskReleaseRequiresDualApproval === false ? '已关闭' : `高风险版本 ${escapeHtml(String(releasePolicies.highRiskReleaseRequiredApprovals || 2))} 人`}</span></div>
          </div>
        </section>
      </div>
    </div>
  `;
}

/**
 * 功能：渲染用户页。
 * 输入：无。
 * 输出：无显式返回；直接写入页面。
 */
async function renderUsers() {
  pageTitle.textContent = '用户管理';
  const route = currentRouteContext();
  const userId = String(route.query.get('userId') || '').trim();
  await refreshAccessControlMeta(true);
  const editing = (accessControlMeta.users || []).find((item) => item.userId === userId) || null;
  const roleOptions = (accessControlMeta.roles || []).map((item) => ({ value: item.roleId, label: `${item.displayName}（${item.roleId}）` }));
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '系统管理', href: '/console/system' }, { label: '用户管理' }])}
      <div class="page-layout with-aside layout-priority-main">
        <div class="page-main">
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">用户列表</h2>
                <div class="section-desc">维护可登录控制台的用户和其默认角色、可切换角色。</div>
              </div>
              ${renderPageHelpLink('page-system-users', '查看用户帮助')}
            </div>
            ${renderDenseTable([
              { label: '用户', render: (entry) => `<a class="primary-link" data-link href="/console/users?userId=${encodeURIComponent(entry.userId)}">${escapeHtml(entry.displayName || entry.userId)}</a><div class="subtle mono">${escapeHtml(entry.userId)}</div>` },
              { label: '默认角色', render: (entry) => escapeHtml(roleLabel(entry.defaultRole, entry.defaultRole)) },
              { label: '可切换角色', render: (entry) => escapeHtml((entry.assignedRoles || []).map((roleId) => roleLabel(roleId, roleId)).join('、') || '未配置') },
            ], accessControlMeta.users || [], '当前没有用户配置。', { scrollSizeClass: 'panel-scroll-large', collapseThreshold: 10, collapsedSummary: '用户较多，默认收起明细' })}
          </section>
        </div>
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">${editing ? '编辑用户' : '新增用户'}</h2>
                <div class="section-desc">用户配置保存在权限种子文件中；保存后顶部身份切换会立即读取最新列表。</div>
              </div>
            </div>
            ${renderFeatureAction('users.manage', `<form data-action="${editing ? 'update-system-user' : 'create-system-user'}" action="${editing ? `/api/console/system/users/${encodeURIComponent(editing.userId)}` : '/api/console/system/users'}" class="form-grid compact">
              ${inputField({ label: '用户 ID', name: 'userId', value: editing ? editing.userId : '', required: true, readonly: Boolean(editing) })}
              ${inputField({ label: '显示名称', name: 'displayName', value: editing ? editing.displayName : '', required: true })}
              ${selectField({ label: '默认角色', name: 'defaultRole', value: editing ? editing.defaultRole : ((roleOptions[0] || {}).value || ''), options: roleOptions })}
              ${checkboxGroupField({ label: '可切换角色', name: 'assignedRoles', values: editing ? editing.assignedRoles : [((roleOptions[0] || {}).value || '')], items: roleOptions, help: '至少选择 1 个角色。' })}
              <div class="form-actions">
                <button type="submit">${editing ? '保存用户' : '创建用户'}</button>
                ${editing ? '<a class="button-link secondary-button" data-link href="/console/users">新建其他用户</a>' : ''}
              </div>
            </form>`, editing ? '编辑用户' : '新增用户', '当前身份没有维护用户配置的页面功能。')}
          </section>
        </div>
      </div>
    </div>
  `;
}

/**
 * 功能：渲染角色页。
 * 输入：无。
 * 输出：无显式返回；直接写入页面。
 */
async function renderRoles() {
  pageTitle.textContent = '角色管理';
  const route = currentRouteContext();
  const roleId = String(route.query.get('roleId') || '').trim();
  await refreshAccessControlMeta(true);
  const editing = (accessControlMeta.roles || []).find((item) => item.roleId === roleId) || null;
  const permissionOptions = [{ value: '*', label: '全部权限（*）' }, ...(accessControlMeta.permissions || []).map((permission) => ({ value: permission, label: permission }))];
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '系统管理', href: '/console/system' }, { label: '角色管理' }])}
      <div class="page-layout with-aside layout-priority-main">
        <div class="page-main">
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">角色列表</h2>
                <div class="section-desc">角色定义负责收口权限组合，不再把权限集合散落在代码里硬编码。</div>
              </div>
              ${renderPageHelpLink('page-system-roles', '查看角色帮助')}
            </div>
            ${renderDenseTable([
              { label: '角色', render: (entry) => `<a class="primary-link" data-link href="/console/roles?roleId=${encodeURIComponent(entry.roleId)}">${escapeHtml(entry.displayName || entry.roleId)}</a><div class="subtle mono">${escapeHtml(entry.roleId)}</div>` },
              { label: '说明', render: (entry) => escapeHtml(entry.description || '未填写') },
              { label: '权限数', render: (entry) => escapeHtml(String((entry.permissions || []).length)) },
            ], accessControlMeta.roles || [], '当前没有角色配置。', { scrollSizeClass: 'panel-scroll-large', collapseThreshold: 10, collapsedSummary: '角色较多，默认收起明细' })}
          </section>
        </div>
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">${editing ? '编辑角色' : '新增角色'}</h2>
                <div class="section-desc">高风险动作仍通过治理策略控制；角色本身只负责权限集合。</div>
              </div>
            </div>
            ${renderFeatureAction('roles.manage', `<form data-action="${editing ? 'update-system-role' : 'create-system-role'}" action="${editing ? `/api/console/system/roles/${encodeURIComponent(editing.roleId)}` : '/api/console/system/roles'}" class="form-grid compact">
              ${inputField({ label: '角色 ID', name: 'roleId', value: editing ? editing.roleId : '', required: true, readonly: Boolean(editing) })}
              ${inputField({ label: '显示名称', name: 'displayName', value: editing ? editing.displayName : '', required: true })}
              ${textareaField({ label: '说明', name: 'description', value: editing ? editing.description : '', placeholder: '说明该角色负责的业务范围。' })}
              ${checkboxGroupField({ label: '权限集合', name: 'permissions', values: editing ? editing.permissions : [], items: permissionOptions, help: '至少选择 1 个权限；管理员角色可保留 *。' })}
              <div class="form-actions">
                <button type="submit">${editing ? '保存角色' : '创建角色'}</button>
                ${editing ? '<a class="button-link secondary-button" data-link href="/console/roles">新建其他角色</a>' : ''}
              </div>
            </form>`, editing ? '编辑角色' : '新增角色', '当前身份没有维护角色配置的页面功能。')}
          </section>
        </div>
      </div>
    </div>
  `;
}

/**
 * 功能：渲染权限页。
 * 输入：无。
 * 输出：无显式返回；直接写入页面。
 */
async function renderPermissions() {
  pageTitle.textContent = '权限管理';
  await refreshAccessControlMeta(true);
  const roleItems = accessControlMeta.roles || [];
  const permissionRows = (accessControlMeta.permissions || []).map((permission) => ({
    permission,
    roleLabels: roleItems.filter((role) => (role.permissions || []).includes(permission) || (role.permissions || []).includes('*')).map((role) => role.displayName || role.roleId),
  }));
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '系统管理', href: '/console/system' }, { label: '权限管理' }])}
      <section class="panel page-hero">
        <div class="section-head">
          <div class="page-hero-copy">
            <div class="page-hero-kicker">系统管理</div>
            <h2 class="page-hero-title">权限总览</h2>
            <div class="page-hero-desc">权限只回答“这个角色能不能查看或执行某个动作”；是否允许在当前条件下执行，还要结合治理策略判断。</div>
          </div>
          ${renderPageHelpLink('page-system-permissions', '查看权限帮助')}
        </div>
          <div class="summary-list">
            <div class="summary-row"><span class="subtle">权限总数</span><span>${escapeHtml(String((accessControlMeta.permissions || []).length))}</span></div>
            <div class="summary-row"><span class="subtle">角色总数</span><span>${escapeHtml(String(roleItems.length))}</span></div>
            <div class="summary-row"><span class="subtle">配置文件</span><span class="mono">${escapeHtml(accessControlMeta.configPath || '未记录')}</span></div>
          </div>
          <section class="callout" style="margin-top:14px;">
            <h3 class="callout-title">边界说明</h3>
            <p>权限决定“能不能做”；治理策略决定“即使能做，在什么条件下允许做”。修改权限后，如需调整发布分离、双人审批等规则，请进入治理策略页。</p>
          </section>
      </section>
      <section class="panel">
        <div class="section-head">
          <div>
            <h2 class="section-title">权限到角色映射</h2>
            <div class="section-desc">这里用于总览每个权限当前分配到了哪些角色；如需修改，请进入角色页。</div>
          </div>
        </div>
        ${renderDenseTable([
          { label: '权限编码', render: (entry) => `<span class="mono">${escapeHtml(entry.permission)}</span>` },
          { label: '已分配角色', render: (entry) => escapeHtml(entry.roleLabels.join('、') || '暂无') },
        ], permissionRows, '当前没有权限配置。', { scrollSizeClass: 'panel-scroll-large', collapseThreshold: 12, collapsedSummary: '权限较多，默认收起明细' })}
        <div class="inline-actions" style="margin-top:14px;">
          ${hasPageAccess('/roles') ? '<a class="button-link" data-link href="/console/roles">前往角色</a>' : ''}
          <a class="button-link secondary-button" data-link href="/console/system">返回系统管理</a>
        </div>
      </section>
    </div>
  `;
}

/**
 * 功能：渲染治理策略页。
 * 输入：无。
 * 输出：无显式返回；直接写入页面。
 */
async function renderGovernancePolicies() {
  pageTitle.textContent = '治理策略';
  await refreshGovernancePoliciesMeta(true);
  const releasePolicies = governancePoliciesMeta.releasePolicies || {};
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '系统管理', href: '/console/system' }, { label: '治理策略' }])}
      <div class="page-layout with-aside layout-priority-main">
        <div class="page-main">
          <section class="panel page-hero">
            <div class="section-head">
              <div class="page-hero-copy">
                <div class="page-hero-kicker">系统管理</div>
                <h2 class="page-hero-title">发布治理策略</h2>
                <div class="page-hero-desc">治理策略不负责定义角色能做什么，而是定义高风险动作在什么条件下允许执行，例如审核与发布分离、双人审批等。</div>
              </div>
              ${renderPageHelpLink('page-system-governance', '查看治理策略帮助')}
            </div>
          </section>
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">当前策略</h2>
                <div class="section-desc">修改后会立即影响发布审核与正式发布行为。建议先在试用环境验证，再进入正式环境。</div>
              </div>
            </div>
            ${renderFeatureAction('governance.manage', `<form data-action="update-governance-policies" action="/api/console/system/governance-policies" class="form-grid compact">
              <label class="checkbox-row">
                <input name="submitterReviewerSeparationRequired" type="checkbox" ${releasePolicies.submitterReviewerSeparationRequired === false ? '' : 'checked'}>
                <span>提交人与审核人必须分离</span>
              </label>
              <label class="checkbox-row">
                <input name="distinctApprovalReviewersRequired" type="checkbox" ${releasePolicies.distinctApprovalReviewersRequired === false ? '' : 'checked'}>
                <span>双人审批必须由不同审核人完成</span>
              </label>
              <label class="checkbox-row">
                <input name="reviewerPublisherSeparationRequired" type="checkbox" ${releasePolicies.reviewerPublisherSeparationRequired === false ? '' : 'checked'}>
                <span>审核通过人与正式发布执行人必须分离</span>
              </label>
              <label class="checkbox-row">
                <input name="highRiskReleaseRequiresDualApproval" type="checkbox" ${releasePolicies.highRiskReleaseRequiresDualApproval === false ? '' : 'checked'}>
                <span>高风险版本启用双人审批</span>
              </label>
              ${inputField({ label: '默认审批人数', name: 'defaultRequiredApprovals', type: 'number', min: 1, value: releasePolicies.defaultRequiredApprovals || 1 })}
              ${inputField({ label: '高风险审批人数', name: 'highRiskReleaseRequiredApprovals', type: 'number', min: 1, value: releasePolicies.highRiskReleaseRequiredApprovals || 2 })}
              <div class="form-actions">
                <button type="submit">保存治理策略</button>
              </div>
            </form>`, '保存治理策略', '当前身份没有维护治理策略的页面功能。')}
          </section>
        </div>
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">配置位置</h2>
                <div class="section-desc">当前原型先用配置文件承接治理策略，避免继续散落硬编码。</div>
              </div>
            </div>
            <div class="summary-list">
              <div class="summary-row"><span class="subtle">配置文件</span><span class="mono">${escapeHtml(governancePoliciesMeta.configPath || '未记录')}</span></div>
              <div class="summary-row"><span class="subtle">提交人与审核人分离</span><span>${releasePolicies.submitterReviewerSeparationRequired === false ? '关闭' : '开启'}</span></div>
              <div class="summary-row"><span class="subtle">双人审批不同审核人</span><span>${releasePolicies.distinctApprovalReviewersRequired === false ? '关闭' : '开启'}</span></div>
              <div class="summary-row"><span class="subtle">审核人与发布人分离</span><span>${releasePolicies.reviewerPublisherSeparationRequired === false ? '关闭' : '开启'}</span></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

/**
 * 功能：渲染词典建设基础配置页。
 * 输入：无。
 * 输出：无显式返回；直接写入页面。
 */
async function renderBusinessProperties() {
  pageTitle.textContent = '基础配置';
  const route = currentRouteContext();
  const selectedValue = String(route.query.get('value') || '').trim();
  const selectedSourceCode = String(route.query.get('sourceTypeCode') || '').trim();
  await Promise.all([
    refreshBusinessPropertyDefinitionsMeta(true),
    refreshSourceTypeMeta({ includeDisabled: true }, true),
  ]);
  const items = Array.isArray(businessPropertyDefinitionsMeta.items) ? businessPropertyDefinitionsMeta.items : [];
  const sourceTypeItems = Array.isArray(sourceTypeDefinitionsMeta.items) ? sourceTypeDefinitionsMeta.items : [];
  const editing = items.find((item) => item.value === selectedValue) || null;
  const editingSourceType = sourceTypeItems.find((item) => (item.code || item.value) === selectedSourceCode) || null;
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '词典建设' }, { label: '基础配置' }])}
      <section class="panel page-hero">
        <div class="section-head">
          <div class="page-hero-copy">
            <div class="page-hero-kicker">词典建设</div>
            <h2 class="page-hero-title">基础配置</h2>
            <div class="page-hero-desc">当前页统一维护词典建设与验证回流共用的两类基础字典：业务属性和来源类型。</div>
          </div>
        </div>
      </section>
      <div class="page-layout with-aside layout-priority-main">
        <div class="page-main">
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">配置信息</h2>
                <div class="section-desc">当前原型仍以配置文件作为基础配置的唯一持久化来源。</div>
              </div>
            </div>
            <div class="summary-list">
              <div class="summary-row"><span class="subtle">业务属性配置</span><span class="mono">${escapeHtml(businessPropertyDefinitionsMeta.configPath || '未记录')}</span></div>
              <div class="summary-row"><span class="subtle">来源类型配置</span><span class="mono">${escapeHtml(sourceTypeDefinitionsMeta.configPath || '未记录')}</span></div>
              <div class="summary-row"><span class="subtle">启用业务属性</span><span>${escapeHtml(String(items.filter((item) => item.enabled).length))}</span></div>
              <div class="summary-row"><span class="subtle">启用来源类型</span><span>${escapeHtml(String(sourceTypeItems.filter((item) => item.enabled).length))}</span></div>
            </div>
            <div class="inline-actions" style="margin-top:14px;">
              <a class="button-link secondary-button" data-link href="/console/dictionary/terms">查看词典记录</a>
              <a class="button-link secondary-button" data-link href="/console/dictionary/import-jobs">查看批量导入</a>
              <a class="button-link secondary-button" data-link href="/console/validation/cases">查看验证样本</a>
              <a class="button-link secondary-button" data-link href="/console">返回工作台</a>
            </div>
          </section>
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">业务属性配置</h2>
                <div class="section-desc">业务属性用于统一词典记录和词典导入的业务归类，不再混用“类别编码”等旧口径。</div>
              </div>
            </div>
            ${renderDenseTable([
              { label: '业务属性', render: (item) => `<a class="primary-link" data-link href="/console/dictionary/config?value=${encodeURIComponent(item.value)}">${escapeHtml(item.label)}</a><div class="subtle mono">${escapeHtml(item.value)}</div>` },
              { label: '说明', render: (item) => escapeHtml(item.description || '未填写') },
              { label: '状态', render: (item) => item.enabled ? '<span class="badge success">启用</span>' : '<span class="badge danger">停用</span>' },
              { label: '兼容旧值', render: (item) => `<span class="mono">${escapeHtml(item.legacyCategoryCode || item.value)}</span>` },
              { label: '排序', render: (item) => escapeHtml(String(item.sortOrder || 0)) },
              {
                label: '操作',
                render: (item) => {
                  const actions = [
                    `<a class="button-link secondary-button" data-link href="/console/dictionary/config?value=${encodeURIComponent(item.value)}">编辑</a>`,
                  ];
                  if (hasPageFeature('businessProperties.manage')) {
                    actions.push(item.enabled
                      ? `<form data-action="disable-business-property" action="/api/console/dictionary-config/business-attributes/${encodeURIComponent(item.value)}/disable"><button type="submit" class="secondary-button">停用</button></form>`
                      : `<form data-action="enable-business-property" action="/api/console/dictionary-config/business-attributes/${encodeURIComponent(item.value)}/enable"><button type="submit" class="secondary-button">启用</button></form>`);
                  }
                  return `<div class="inline-actions">${actions.join('')}</div>`;
                },
              },
            ], items, '当前没有业务属性。', { scrollSizeClass: 'panel-scroll-medium' })}
          </section>
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">来源类型配置</h2>
                <div class="section-desc">来源类型统一驱动词典建设与验证回流，页面通过 scope 和允许录入方式过滤可选项。</div>
              </div>
            </div>
            ${renderDenseTable([
              { label: '来源类型', render: (item) => `<a class="primary-link" data-link href="/console/dictionary/config?sourceTypeCode=${encodeURIComponent(item.code || item.value)}">${escapeHtml(item.label)}</a><div class="subtle mono">${escapeHtml(item.code || item.value)}</div>` },
              { label: '适用域', render: (item) => escapeHtml(((item.scopes || [item.scope || 'dictionary']).join(' / ')) || 'dictionary') },
              { label: '录入方式', render: (item) => escapeHtml(((item.allowedEntryModes || []).join(' / ')) || 'manual') },
              { label: '状态', render: (item) => item.enabled ? '<span class="badge success">启用</span>' : '<span class="badge danger">停用</span>' },
              { label: '排序', render: (item) => escapeHtml(String(item.sortOrder || 0)) },
              {
                label: '操作',
                render: (item) => {
                  const code = item.code || item.value;
                  const actions = [
                    `<a class="button-link secondary-button" data-link href="/console/dictionary/config?sourceTypeCode=${encodeURIComponent(code)}">编辑</a>`,
                  ];
                  if (hasPageFeature('businessProperties.manage')) {
                    actions.push(item.enabled
                      ? `<form data-action="disable-source-type" action="/api/console/dictionary-config/source-types/${encodeURIComponent(code)}/disable"><button type="submit" class="secondary-button">停用</button></form>`
                      : `<form data-action="enable-source-type" action="/api/console/dictionary-config/source-types/${encodeURIComponent(code)}/enable"><button type="submit" class="secondary-button">启用</button></form>`);
                  }
                  return `<div class="inline-actions">${actions.join('')}</div>`;
                },
              },
            ], sourceTypeItems, '当前没有来源类型。', { scrollSizeClass: 'panel-scroll-medium' })}
          </section>
        </div>
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">${editing ? '编辑业务属性' : '新增业务属性'}</h2>
                <div class="section-desc">业务属性会影响词典记录与批量导入的业务归类；本阶段统一通过启停控制生命周期。</div>
              </div>
            </div>
            ${renderFeatureAction('businessProperties.manage', `<form data-action="${editing ? 'update-business-property' : 'create-business-property'}" action="${editing ? `/api/console/dictionary-config/business-attributes/${encodeURIComponent(editing.value)}` : '/api/console/dictionary-config/business-attributes'}" class="form-grid compact">
              ${inputField({ label: '编码', name: 'value', value: editing ? editing.value : '', required: true, readonly: Boolean(editing) })}
              ${inputField({ label: '显示名称', name: 'label', value: editing ? editing.label : '', required: true })}
              ${textareaField({ label: '说明', name: 'description', value: editing ? editing.description : '', placeholder: '描述该业务属性适用于哪些词条。' })}
              ${inputField({ label: '兼容旧值', name: 'legacyCategoryCode', value: editing ? editing.legacyCategoryCode : '', help: '如需兼容历史 categoryCode，可在这里指定。' })}
              ${inputField({ label: '排序', name: 'sortOrder', type: 'number', value: editing ? editing.sortOrder : 0, min: 0 })}
              <label class="checkbox-row">
                <input name="enabled" type="checkbox" ${editing ? (editing.enabled ? 'checked' : '') : 'checked'}>
                <span>启用该业务属性</span>
              </label>
              <div class="form-actions">
                <button type="submit">${editing ? '保存业务属性' : '创建业务属性'}</button>
                ${editing ? '<a class="button-link secondary-button" data-link href="/console/dictionary/config">新建其他业务属性</a>' : ''}
              </div>
            </form>`, editing ? '编辑业务属性' : '新增业务属性', '当前身份没有维护业务属性的页面功能。')}
          </section>
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">${editingSourceType ? '编辑来源类型' : '新增来源类型'}</h2>
                <div class="section-desc">来源类型需要同时明确适用域和允许录入方式，避免词典建设与验证回流交叉混用。</div>
              </div>
            </div>
            ${renderFeatureAction('businessProperties.manage', `<form data-action="${editingSourceType ? 'update-source-type' : 'create-source-type'}" action="${editingSourceType ? `/api/console/dictionary-config/source-types/${encodeURIComponent(editingSourceType.code || editingSourceType.value)}` : '/api/console/dictionary-config/source-types'}" class="form-grid compact">
              ${inputField({ label: '编码', name: 'code', value: editingSourceType ? (editingSourceType.code || editingSourceType.value) : '', required: true, readonly: Boolean(editingSourceType) })}
              ${inputField({ label: '显示名称', name: 'label', value: editingSourceType ? editingSourceType.label : '', required: true })}
              ${textareaField({ label: '说明', name: 'description', value: editingSourceType ? editingSourceType.description : '', placeholder: '描述该来源类型适用于哪些录入场景。' })}
              ${inputField({ label: '适用域', name: 'scopesText', value: editingSourceType ? ((editingSourceType.scopes || [editingSourceType.scope || 'dictionary']).join('|')) : 'dictionary', help: '多个值请用 | 分隔，仅支持 dictionary / validation。' })}
              ${inputField({ label: '允许录入方式', name: 'allowedEntryModesText', value: editingSourceType ? ((editingSourceType.allowedEntryModes || []).join('|')) : 'manual', help: '多个值请用 | 分隔，仅支持 manual / import。' })}
              ${inputField({ label: '排序', name: 'sortOrder', type: 'number', value: editingSourceType ? editingSourceType.sortOrder : 0, min: 0 })}
              <label class="checkbox-row">
                <input name="enabled" type="checkbox" ${editingSourceType ? (editingSourceType.enabled ? 'checked' : '') : 'checked'}>
                <span>启用该来源类型</span>
              </label>
              <div class="form-actions">
                <button type="submit">${editingSourceType ? '保存来源类型' : '创建来源类型'}</button>
                ${editingSourceType ? '<a class="button-link secondary-button" data-link href="/console/dictionary/config">新建其他来源类型</a>' : ''}
              </div>
            </form>`, editingSourceType ? '编辑来源类型' : '新增来源类型', '当前身份没有维护来源类型的页面功能。')}
          </section>
        </div>
      </div>
    </div>
  `;
}

/**
 * 功能：渲染词条列表页。
 * 输入：无。
 * 输出：无显式返回；直接写入页面。
 */
/**
 * 功能：渲染词条列表页。
 * 输入：无，内部从当前路由读取筛选、排序和分页参数。
 * 输出：无显式返回；直接写入页面。
 */
async function renderTerms() {
  const route = currentRouteContext();
  pageTitle.textContent = '词典记录';
  const [dictionarySourceTypesMeta, dictionaryManualSourceTypesMeta] = await Promise.all([
    refreshSourceTypeMeta({ scope: 'dictionary' }),
    refreshSourceTypeMeta({ scope: 'dictionary', entryMode: 'manual' }),
  ]);
  const view = await fetchTermListViewData({
    page: route.query.get('page') || 1,
    query: route.query.get('query') || '',
    categoryCode: route.query.get('categoryCode') || '',
    status: route.query.get('status') || '',
    sourceType: route.query.get('sourceType') || '',
    riskLevel: route.query.get('riskLevel') || '',
    sort: route.query.get('sort') || 'updated_at:desc',
  });
  const { query, categoryCode, status, sourceType, riskLevel, sortValue, exportUrl, data, summary } = view;
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '词典建设' }, { label: '词典记录' }])}
      ${renderMetricCardGrid([
        { label: '词典总量', value: summary.totalCount || 0 },
        { label: '已通过词条', value: summary.approvedCount || 0, hideWhenZero: true },
        { label: '待审核词条', value: summary.pendingReviewCount || 0, hideWhenZero: true },
        { label: '高风险词条', value: summary.highRiskCount || 0, hideWhenZero: true },
      ])}
      <section class="panel panel-soft">
        <div class="section-head">
          <div>
            <h2 class="section-title">新建词典记录</h2>
            <div class="section-desc">先完成词典记录录入，再回到下方列表核对是否重复、查看详情或提交词典审核。</div>
          </div>
          ${renderPageHelpLink('page-master-terms', '查看词条帮助')}
        </div>
        ${hasPageFeature('terms.create') ? `<form data-action="create-term" class="form-grid compact three-columns">
          ${selectField({ label: '业务属性', name: 'categoryCode', value: 'proper_noun', options: businessPropertyOptions({ includeAll: false }) })}
          ${inputField({ label: '标准词', name: 'canonicalText', placeholder: '例如：工伤认定', required: true })}
          ${inputField({ label: '错误词 / 别名（示例：工商认定|工伤认丁）', name: 'aliases', placeholder: '多个值请用 | 分隔' })}
          ${inputField({ label: '优先级', name: 'priority', type: 'number', value: 80, min: 1 })}
          ${selectField({ label: '风险等级', name: 'riskLevel', value: 'medium', options: RISK_OPTIONS })}
          ${selectField({ label: '替换模式', name: 'replaceMode', value: 'replace', options: REPLACE_MODE_OPTIONS })}
          ${inputField({ label: '基础置信度（取值范围建议 0 到 1）', name: 'baseConfidence', type: 'number', step: '0.01', value: 0.9 })}
          ${selectField({ label: '来源类型', name: 'sourceType', value: 'manual', options: sourceTypeOptionsFromItems(dictionaryManualSourceTypesMeta.items, { includeAll: false }) })}
          ${selectField({ label: '拼音运行模式', name: 'pinyinRuntimeMode', value: 'candidate', options: PINYIN_MODE_OPTIONS })}
          <div class="form-actions">
            <button type="submit">创建词典记录</button>
          </div>
        </form>` : renderEmptyState('当前身份没有“创建词典记录”页面功能。')}
        <section class="callout">
          <h3 class="callout-title">当前页建议用法</h3>
          <ul>
            <li>新建前先看下方列表是否已有同名词典记录，避免重复录入。</li>
            <li>如果是正式导库，请优先走批量导入，不要手工逐条补录。</li>
            <li>新建成功后，请在详情页补齐规则和拼音信息，再提交词典审核。</li>
          </ul>
        </section>
      </section>
      <section class="panel">
        <div class="section-head">
          <div>
            <h2 class="section-title">词典记录列表</h2>
          </div>
          ${renderPageHelpLink('page-master-terms', '查看词条帮助')}
        </div>
        <div class="panel-stack">
          <section class="surface-block surface-block-terms-action">
            <div class="surface-head">
              <div>
                <h3 class="surface-title">批量操作与导出</h3>
              </div>
            </div>
            <form data-action="bulk-term-action" class="bulk-action-bar bulk-action-bar-no-note">
              ${
                hasPageFeature('terms.bulk.submitReview') || hasPageFeature('terms.bulk.disable')
                  ? `
                    ${selectField({
                      label: '批量操作',
                      name: 'bulkAction',
                      value: hasPageFeature('terms.bulk.submitReview') ? 'submit-review' : 'disable',
                      options: TERM_BULK_ACTION_OPTIONS.filter((item) => (
                        (item.value === 'submit-review' && hasPageFeature('terms.bulk.submitReview'))
                        || (item.value === 'disable' && hasPageFeature('terms.bulk.disable'))
                      )),
                    })}
                    ${selectField({ label: '执行范围', name: 'bulkScope', value: 'current_page', options: BULK_SCOPE_OPTIONS })}
                    <div class="form-actions">
                      <button type="submit">执行批量操作</button>
                      <a class="button-link secondary-button" data-term-export-link href="${escapeHtml(exportUrl)}">导出当前筛选</a>
                    </div>
                  `
                  : `
                    <div class="form-actions">
                      ${renderDisabledAction('执行批量操作', '当前身份没有词条批量操作页面功能。')}
                      <a class="button-link secondary-button" data-term-export-link href="${escapeHtml(exportUrl)}">导出当前筛选</a>
                    </div>
                  `
              }
            </form>
          </section>
          <section class="surface-block surface-block-soft surface-block-terms-filter">
            <div class="surface-head">
              <div>
                <h3 class="surface-title">筛选条件</h3>
              </div>
            </div>
            <form data-action="filter-terms" class="terms-filter-form">
              <div class="terms-filter-fields">
                ${inputField({ label: '关键词检索', name: 'query', value: query, placeholder: '支持标准词与错误词检索' })}
                ${selectField({ label: '业务属性筛选', name: 'categoryCode', value: categoryCode, options: businessPropertyOptions({ includeAll: true }) })}
                ${selectField({ label: '词条状态', name: 'status', value: status, options: TERM_STATUS_OPTIONS })}
                ${selectField({ label: '来源类型', name: 'sourceType', value: sourceType, options: sourceTypeOptionsFromItems(dictionarySourceTypesMeta.items, { includeAll: true }) })}
                ${selectField({ label: '风险等级', name: 'riskLevel', value: riskLevel, options: [{ value: '', label: '全部风险等级' }, ...RISK_OPTIONS] })}
                ${selectField({ label: '排序方式', name: 'sort', value: sortValue, options: TERM_SORT_OPTIONS })}
              </div>
              <div class="terms-filter-actions">
                <button type="submit">应用筛选</button>
                <button type="button" class="secondary-button" data-action="clear-terms-filters">清空筛选</button>
              </div>
            </form>
          </section>
          ${renderTermsResultsSurface(view)}
        </div>
      </section>
    </div>
  `;
}

/**
 * 功能：渲染词条详情页。
 * 输入：`termId` 词条 ID。
 * 输出：无显式返回；直接写入页面。
 */
async function renderTermDetail(termId) {
  pageTitle.textContent = '词典记录详情';
  const dictionaryManualSourceTypesMeta = await refreshSourceTypeMeta({ scope: 'dictionary', entryMode: 'manual' });
  const [data, candidateData] = await Promise.all([
    fetchJson(`/api/console/dictionary/terms/${encodeURIComponent(termId)}`),
    postJson(`/api/console/dictionary/terms/${encodeURIComponent(termId)}/generate-pinyin-candidates`, { limit: 8 }),
  ]);
  const item = data.item;
  const aliases = (item.aliases || []).map((alias) => alias.aliasText).join('|');
  const candidates = candidateData.item && candidateData.item.items ? candidateData.item.items : [];
  const canSubmitReview = canSubmitTermReview(item.basic.status, item.basic.revision, item.reviewSummary || {});
  const canDisableTerm = item.basic.status !== 'disabled';
  const admissionSummary = item.admissionSummary || { level: 'ready', blockedCount: 0, warningCount: 0, issues: [] };
  const stateTitle = `当前状态：${escapeHtml(displayLabel(item.basic.status))}`;
  const stateDescription = item.basic.status === 'disabled'
    ? '该词条当前已停用，后续不应继续送审或进入发布链路。'
    : (item.reviewSummary.latestStatus === 'pending'
      ? '该词条当前已有待审核任务，请先完成审核再继续调整发布链路。'
      : (item.reviewSummary.latestStatus === 'approved' && !canSubmitReview
        ? '该词条当前已审核通过，且通过后无新改动，无需重复提交审核。'
        : '如果这个词条已经确认可用，下一步请点击“提交审核”；审核通过后，才会进入后续发布链路。'));
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '词典建设' }, { label: '词典记录', href: '/console/dictionary/terms' }, { label: item.basic.canonicalText }])}
      <div class="page-layout with-aside layout-priority-main">
        <div class="page-main">
          <section class="panel page-hero">
            <div class="section-head">
              <div class="page-hero-copy">
                <div class="page-hero-kicker">词典建设</div>
                <h2 class="page-hero-title">${escapeHtml(item.basic.canonicalText)}</h2>
                <div class="page-hero-desc">先看词条当前状态、送审上下文和样本关联，再继续进入规则和拼音等深层配置。</div>
              </div>
            </div>
            <div class="inline-badge-row" style="margin-bottom:14px;">
              ${renderBadge(item.basic.status)}
              ${renderBadge(item.reviewSummary.latestStatus)}
              <span class="badge">${escapeHtml(sourceTypeLabel(item.basic.sourceType, item.basic.sourceType || '未记录'))}</span>
              ${admissionSummary.level !== 'ready' ? renderBadge(admissionSummary.level) : '<span class="badge success">准入通过</span>'}
            </div>
            <div class="summary-list">
              <div class="summary-row"><span class="subtle">业务属性</span><span>${escapeHtml(businessPropertyLabel(item.basic.categoryCode, item.basic.categoryCode))}</span></div>
              <div class="summary-row"><span class="subtle">优先级 / 风险</span><span>${escapeHtml(String(item.basic.priority || 0))} / ${escapeHtml(displayLabel(item.basic.riskLevel) || item.basic.riskLevel || '未记录')}</span></div>
              <div class="summary-row"><span class="subtle">来源类型</span><span>${escapeHtml(sourceTypeLabel(item.sourceSummary.sourceType, item.sourceSummary.sourceType || '未记录'))}</span></div>
              <div class="summary-row"><span class="subtle">已绑定样本</span><span>${escapeHtml(String(item.validationSummary.relatedCaseCount || 0))}</span></div>
            </div>
            <section class="callout" style="margin-top:14px;">
              <h3 class="callout-title">${stateTitle}</h3>
              <p>${stateDescription}</p>
            </section>
            <div style="margin-top:14px;">
              ${renderAdmissionSummaryBlock(admissionSummary, '统一准入结果')}
            </div>
          </section>
        </div>
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">当前决策</h2>
                <div class="section-desc">主动作与当前状态放在同一块，避免先下钻到规则或拼音配置再回头找送审入口。</div>
              </div>
            </div>
            <div class="summary-list" style="margin-bottom:14px;">
              <div class="summary-row"><span class="subtle">词条状态</span><span>${renderBadge(item.basic.status)}</span></div>
              <div class="summary-row"><span class="subtle">最近审核状态</span><span>${renderBadge(item.reviewSummary.latestStatus)}</span></div>
              <div class="summary-row"><span class="subtle">导入批次</span><span>${item.sourceSummary.importJobId ? `<a class="summary-link" data-link href="/console/dictionary/import-jobs/${encodeURIComponent(item.sourceSummary.importJobId)}">${escapeHtml(item.sourceSummary.importJobId)}</a>` : '人工录入'}</span></div>
            </div>
            <div class="action-zone">
              <div class="action-zone-title">主操作</div>
              <div class="action-zone-desc">只有当前最重要的决策动作留在这里，深层配置放到下方。</div>
              <div class="inline-actions">
                ${canSubmitReview
                  ? renderFeatureAction('terms.review.submit', `<form data-action="submit-term-review" action="/api/console/dictionary/terms/${encodeURIComponent(termId)}/submit-review"><button type="submit">提交审核</button></form>`, '提交审核', '当前身份不能提交词条审核。')
                  : renderDisabledAction(
                    item.basic.status === 'disabled'
                      ? '已停用'
                      : (item.reviewSummary.latestStatus === 'pending' ? '审核中' : '已通过'),
                    item.basic.status === 'disabled'
                      ? '当前词条已停用，不能再发起送审。'
                      : (item.reviewSummary.latestStatus === 'pending'
                        ? '当前词条已有待审核任务，请先处理审核。'
                        : '当前词条已审核通过，且通过后没有新改动，无需重复提交审核。')
                  )}
                ${canDisableTerm
                  ? renderFeatureAction('terms.disable', `<form data-action="disable-term" action="/api/console/dictionary/terms/${encodeURIComponent(termId)}/disable"><button type="submit" class="danger-button">停用词条</button></form>`, '停用词条', '当前身份不能停用词条。')
                  : renderDisabledAction('已停用', '当前词条已经处于停用状态。')}
                <a class="button-link secondary-button" data-link href="/console/dictionary/terms/${encodeURIComponent(termId)}/validation-cases">查看关联样本</a>
                <a class="button-link secondary-button" data-link href="/console/dictionary/terms">返回词典记录</a>
              </div>
            </div>
          </section>
        </div>
      </div>
      <div class="page-layout equal">
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">基础信息</h2>
              <div class="section-desc">这里维护标准词、错误词、优先级和来源信息。</div>
            </div>
          </div>
          ${hasPageFeature('terms.detail.editBasic') ? `<form data-action="update-term-basic" action="/api/console/dictionary/terms/${encodeURIComponent(termId)}" class="form-grid two-columns">
            ${selectField({ label: '业务属性', name: 'categoryCode', value: item.basic.categoryCode, options: businessPropertyOptions({ includeAll: false }) })}
            ${inputField({ label: '标准词', name: 'canonicalText', value: item.basic.canonicalText, required: true })}
            ${inputField({ label: '错误词 / 别名', name: 'aliases', value: aliases, help: '多个值请用 | 分隔。', className: 'full' })}
            ${inputField({ label: '优先级', name: 'priority', type: 'number', value: Number(item.basic.priority || 80), min: 1 })}
            ${selectField({ label: '风险等级', name: 'riskLevel', value: item.basic.riskLevel || 'medium', options: RISK_OPTIONS })}
            ${selectField({ label: '替换模式', name: 'replaceMode', value: item.basic.replaceMode || 'replace', options: REPLACE_MODE_OPTIONS })}
            ${inputField({ label: '基础置信度', name: 'baseConfidence', type: 'number', step: '0.01', value: Number(item.basic.baseConfidence || 0.9) })}
            ${selectField({ label: '来源类型', name: 'sourceType', value: item.basic.sourceType || 'manual', options: sourceTypeOptionsFromItems(dictionaryManualSourceTypesMeta.items, { includeAll: false }) })}
            ${selectField({ label: '拼音运行模式', name: 'pinyinRuntimeMode', value: item.basic.pinyinRuntimeMode || 'candidate', options: PINYIN_MODE_OPTIONS })}
            <div class="form-actions">
              <button type="submit">保存基础信息</button>
            </div>
          </form>` : renderEmptyState('当前身份没有“编辑词条基础信息”页面功能。')}
        </section>
        <section class="panel">
          <div class="section-head">
              <div>
                <h2 class="section-title">来源与样本关联</h2>
                <div class="section-desc">这里说明当前词条来自哪里、当前审核状态如何，以及样本链路是否已经关联。</div>
              </div>
            </div>
          <div class="summary-list">
            <div class="summary-row"><span class="subtle">词条状态</span><span>${renderBadge(item.basic.status)}</span></div>
            <div class="summary-row"><span class="subtle">最近审核状态</span><span>${renderBadge(item.reviewSummary.latestStatus)}</span></div>
            <div class="summary-row"><span class="subtle">来源类型</span><span>${escapeHtml(sourceTypeLabel(item.sourceSummary.sourceType, item.sourceSummary.sourceType || '未记录'))}</span></div>
            <div class="summary-row"><span class="subtle">导入批次</span><span>${item.sourceSummary.importJobId ? `<a class="summary-link" data-link href="/console/dictionary/import-jobs/${encodeURIComponent(item.sourceSummary.importJobId)}">${escapeHtml(item.sourceSummary.importJobId)}</a>` : '人工录入'}</span></div>
            <div class="summary-row"><span class="subtle">来源文件</span><span>${escapeHtml(item.sourceSummary.sourceFileName || '未记录')}</span></div>
            <div class="summary-row"><span class="subtle">来源行号</span><span>${escapeHtml(String(item.sourceSummary.sourceRowNo || '未记录'))}</span></div>
            <div class="summary-row"><span class="subtle">已绑定样本</span><span>${escapeHtml(String(item.validationSummary.relatedCaseCount || 0))}</span></div>
          </div>
        </section>
      </div>
      <section class="panel">
        <div class="section-head">
          <div>
            <h2 class="section-title">规则治理</h2>
            <div class="section-desc">规则配置属于深层治理区，放在状态与基础信息之后，避免一进页就陷入长表单。</div>
          </div>
        </div>
        ${hasPageFeature('terms.detail.editRules') ? `<form data-action="update-term-rules" action="/api/console/dictionary/terms/${encodeURIComponent(termId)}" class="form-grid two-columns">
          <label class="checkbox-row">
            <input name="candidateOnly" type="checkbox" ${(item.rules || {}).candidateOnly ? 'checked' : ''}>
            <span>仅输出候选，不自动替换</span>
          </label>
          ${inputField({ label: '最小命中长度', name: 'minTextLen', type: 'number', value: (item.rules || {}).minTextLen ?? '', min: 1 })}
          ${inputField({ label: '最大命中长度', name: 'maxTextLen', type: 'number', value: (item.rules || {}).maxTextLen ?? '', min: 1 })}
          ${selectField({ label: '边界策略', name: 'boundaryPolicy', value: (item.rules || {}).boundaryPolicy || 'none', options: [
            { value: 'none', label: '不限制（none）' },
            { value: 'char_type', label: '按字符类型限制（char_type）' },
          ] })}
          ${inputField({ label: '左侧允许上下文', name: 'leftContextAllow', value: ((item.rules || {}).leftContextAllow || []).join('|'), help: '多个值请用 | 分隔。' })}
          ${inputField({ label: '右侧允许上下文', name: 'rightContextAllow', value: ((item.rules || {}).rightContextAllow || []).join('|'), help: '多个值请用 | 分隔。' })}
          ${inputField({ label: '左侧阻断上下文', name: 'leftContextBlock', value: ((item.rules || {}).leftContextBlock || []).join('|'), help: '多个值请用 | 分隔。' })}
          ${inputField({ label: '右侧阻断上下文', name: 'rightContextBlock', value: ((item.rules || {}).rightContextBlock || []).join('|'), help: '多个值请用 | 分隔。' })}
          ${inputField({ label: '允许正则', name: 'regexAllow', value: ((item.rules || {}).regexAllow || []).join('|'), help: '多个值请用 | 分隔。', className: 'full' })}
          ${inputField({ label: '阻断正则', name: 'regexBlock', value: ((item.rules || {}).regexBlock || []).join('|'), help: '多个值请用 | 分隔。', className: 'full' })}
          <div class="form-actions">
            <button type="submit">保存规则配置</button>
          </div>
        </form>` : renderEmptyState('当前身份没有“编辑词条规则”页面功能。')}
      </section>
      <section class="panel">
        <div class="section-head">
          <div>
            <h2 class="section-title">拼音治理</h2>
            <div class="section-desc">拼音配置和候选审核单独成区，避免与基础词条信息混成一整块长表单。</div>
          </div>
        </div>
        <div class="panel-stack">
          <section class="surface-block surface-block-soft">
            <div class="surface-head">
              <div>
                <h3 class="surface-title">当前拼音画像</h3>
                <div class="surface-desc">先确认当前运行模式、人工读音和备用读音，再决定是否继续调整。</div>
              </div>
            </div>
            <div class="summary-list">
              <div class="summary-row"><span class="subtle">拼音运行模式</span><span>${escapeHtml(displayOptionLabel((item.pinyinProfile || {}).runtimeMode || 'candidate', PINYIN_MODE_OPTIONS, (item.pinyinProfile || {}).runtimeMode || 'candidate'))}</span></div>
              <div class="summary-row"><span class="subtle">多音字策略</span><span>${escapeHtml(displayLabel((item.pinyinProfile || {}).polyphoneMode) || (item.pinyinProfile || {}).polyphoneMode || 'default')}</span></div>
              <div class="summary-row"><span class="subtle">自定义标准读音</span><span class="mono">${escapeHtml((item.pinyinProfile || {}).customFullPinyinNoTone || '未设置')}</span></div>
              <div class="summary-row"><span class="subtle">备用读音数</span><span>${escapeHtml(String(((item.pinyinProfile || {}).alternativeReadings || []).length))}</span></div>
            </div>
          </section>
          <section class="surface-block">
            <div class="surface-head">
              <div>
                <h3 class="surface-title">拼音配置</h3>
                <div class="surface-desc">这里维护标准读音、备注和多音字策略。</div>
              </div>
            </div>
            ${hasPageFeature('terms.detail.editPinyin') ? `<form data-action="update-term-pinyin" action="/api/console/dictionary/terms/${encodeURIComponent(termId)}" class="form-grid">
              ${selectField({ label: '拼音运行模式', name: 'runtimeMode', value: (item.pinyinProfile || {}).runtimeMode || 'candidate', options: PINYIN_MODE_OPTIONS })}
              ${selectField({ label: '多音字策略', name: 'polyphoneMode', value: (item.pinyinProfile || {}).polyphoneMode || 'default', options: [
                { value: 'default', label: '系统默认（default）' },
              ] })}
              ${inputField({ label: '自定义标准读音', name: 'customFullPinyinNoTone', value: (item.pinyinProfile || {}).customFullPinyinNoTone || '', placeholder: '示例：gong shang ren ding' })}
              ${inputField({ label: '备用读音', name: 'alternativeReadings', value: ((item.pinyinProfile || {}).alternativeReadings || []).join('|'), help: '多个值请用 | 分隔。' })}
              ${textareaField({ label: '备注', name: 'notes', value: (item.pinyinProfile || {}).notes || '', placeholder: '记录为什么需要人工修正拼音。' })}
              <div class="form-actions">
                <button type="submit">保存拼音配置</button>
              </div>
            </form>` : renderEmptyState('当前身份没有“编辑词条拼音”页面功能。')}
          </section>
          <section class="surface-block">
            <div class="surface-head">
              <div>
                <h3 class="surface-title">候选读音与审核</h3>
                <div class="surface-desc">候选读音属于后续处理动作，放在拼音配置之后查看和提交。</div>
              </div>
            </div>
            <div class="inline-actions" style="margin-bottom:14px;">
              ${renderFeatureAction('terms.pinyin.generate', `<form data-action="generate-pinyin-candidates" action="/api/console/dictionary/terms/${encodeURIComponent(termId)}/generate-pinyin-candidates"><button type="submit" class="secondary-button">重新生成候选</button></form>`, '重新生成候选', '当前身份不能生成拼音候选。')}
            </div>
            <div class="summary-list">
              ${candidates.length ? candidates.map((candidate) => `
                <div class="summary-row">
                  <span>
                    <span class="mono">${escapeHtml(candidate.fullPinyinNoTone)}</span>
                    <span class="subtle">（${escapeHtml(displayLabel(candidate.reviewStatus || 'not_submitted') || candidate.reviewStatus || '未提交')}）</span>
                  </span>
                  ${canSubmitPinyinCandidate(candidate.reviewStatus)
                    ? renderFeatureAction('terms.pinyin.submit', `
                      <form data-action="submit-pinyin-candidate" action="/api/console/dictionary/terms/${encodeURIComponent(termId)}/pinyin-candidates" class="inline-actions">
                        <input type="hidden" name="fullPinyinNoTone" value="${escapeHtml(candidate.fullPinyinNoTone)}">
                        <button type="submit">提交候选审核</button>
                      </form>
                    `, '提交候选审核', '当前身份不能提交拼音候选审核。')
                    : renderDisabledAction(
                      candidate.reviewStatus === 'approved' ? '已通过' : '审核中',
                      candidate.reviewStatus === 'approved'
                        ? '该候选已审核通过，无需重复提交。'
                        : '该候选已在审核流程中，请等待审核结果。'
                    )}
                </div>
              `).join('') : '<div class="subtle">当前没有可提交的拼音候选。</div>'}
            </div>
          </section>
        </div>
      </section>
    </div>
  `;
}

/**
 * 功能：渲染词条关联样本页。
 * 输入：`termId` 词条 ID。
 * 输出：无显式返回；直接写入页面。
 */
async function renderTermValidationCases(termId) {
  pageTitle.textContent = '词条关联样本';
  const [detail, data] = await Promise.all([
    fetchJson(`/api/console/dictionary/terms/${encodeURIComponent(termId)}`),
    fetchJson(`/api/console/dictionary/terms/${encodeURIComponent(termId)}/validation-cases`),
  ]);
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '词典建设' }, { label: '词典记录', href: '/console/dictionary/terms' }, { label: detail.item.basic.canonicalText, href: `/console/dictionary/terms/${encodeURIComponent(termId)}` }, { label: '关联样本' }])}
      <section class="panel">
        <div class="section-head">
          <div>
            <h2 class="section-title">关联验证样本</h2>
            <div class="section-desc">这些样本会在发布验证环节用于检查词条效果。</div>
          </div>
        </div>
        ${renderDenseTable([
          { label: '样本 ID', render: (item) => `<a class="primary-link" data-link href="/console/validation/cases/${encodeURIComponent(item.caseId)}">${escapeHtml(item.caseId)}</a>` },
          { label: '样本说明', render: (item) => escapeHtml(item.description || '未填写') },
          { label: '来源', render: (item) => escapeHtml(sourceTypeLabel(item.sourceType, item.sourceType || '未记录')) },
          { label: '期望标准词', render: (item) => escapeHtml((item.expectedCanonicals || []).join(' / ')) },
        ], data.items || [], '当前词条还没有关联样本。', { scrollSizeClass: 'panel-scroll-medium', collapseThreshold: 8, collapsedSummary: '关联样本较多，默认收起明细' })}
      </section>
    </div>
  `;
}

/**
 * 功能：渲染批量导入首页。
 * 输入：无。
 * 输出：无显式返回；直接写入页面。
 */
async function renderImportHome() {
  const route = currentRouteContext();
  pageTitle.textContent = '批量导入';
  const [dictionarySourceTypesMeta, dictionaryImportSourceTypesMeta] = await Promise.all([
    refreshSourceTypeMeta({ scope: 'dictionary' }),
    refreshSourceTypeMeta({ scope: 'dictionary', entryMode: 'import' }),
  ]);
  const view = await fetchImportListViewData({
    page: route.query.get('page') || 1,
    status: route.query.get('status') || '',
    sourceType: route.query.get('sourceType') || '',
  });
  const { status, sourceType, summary, filteredSummary } = view;
  const [templates, jobs] = await Promise.all([
    fetchJson('/api/console/import/templates'),
    Promise.resolve(view.data),
  ]);
  const allTemplates = templates.items || [];
  const primaryTemplates = allTemplates.filter((item) => item.consoleVisible !== false && item.templateCode !== VALIDATION_IMPORT_TEMPLATE_CODE);
  const legacyTemplates = allTemplates.filter((item) => item.legacy === true);
  const structuredTemplate = primaryTemplates.find((item) => item.templateCode === STRUCTURED_TERM_IMPORT_TEMPLATE_CODE)
    || primaryTemplates.find((item) => item.templateRole === 'term_import');
  const aliasTemplate = primaryTemplates.find((item) => item.templateRole === 'alias_patch');
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '词典建设' }, { label: '批量导入' }])}
      ${renderMetricCardGrid([
        { label: '导入批次总量', value: summary.totalCount || 0 },
        { label: '待确认导入', value: summary.previewReadyCount || 0, hideWhenZero: true },
        { label: '已完成导入', value: summary.importedCount || 0, hideWhenZero: true },
        { label: '已取消批次', value: summary.cancelledCount || 0, hideWhenZero: true },
      ])}
      <div class="page-layout import-home-stacked">
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">创建导入批次</h2>
                <div class="section-desc">上传文件后系统会先生成预览，你需要先看结果，再决定是否确认导入。</div>
              </div>
              ${renderPageHelpLink('page-master-import', '查看导入帮助')}
            </div>
            <div class="import-create-layout">
              <div class="import-create-main">
                ${hasPageFeature('import.write') ? `<form data-action="create-import-job" class="form-grid compact">
                  ${selectField({
                    label: '导入模板',
                    name: 'templateCode',
                    value: structuredTemplate ? structuredTemplate.templateCode : ((primaryTemplates[0] || {}).templateCode || ''),
                    options: primaryTemplates.map((item) => ({ value: item.templateCode, label: `${item.templateName}（${item.templateCode}）` })),
                  })}
                  ${selectField({
                    label: '业务属性（仅词条导入使用）',
                    name: 'defaultCategoryCode',
                    value: 'proper_noun',
                    options: businessPropertyOptions({ includeAll: false }),
                    help: '统一词条模板可通过这里设置批次默认业务属性；文件行未填写 categoryCode 时将沿用该值。其他模板会忽略该字段。',
                  })}
                  ${selectField({ label: '来源类型', name: 'sourceType', value: 'import_csv', options: sourceTypeOptionsFromItems(dictionaryImportSourceTypesMeta.items, { includeAll: false }) })}
                  ${textareaField({ label: '批次备注', name: 'comment', value: '', placeholder: '例如：2026-03-31 首轮人工补录导入。' })}
                  ${fileField({ label: '选择文件', name: 'file', help: '请先下载模板后按模板准备文件。' })}
                  <div class="form-actions">
                    <button type="submit">上传并生成预览</button>
                  </div>
                </form>` : renderEmptyState('当前身份没有“创建导入批次”页面功能。')}
              </div>
              <div class="import-create-side">
                ${structuredTemplate ? `
                  <div class="card template-card">
                    <div class="metric-label">词条主导入</div>
                    <div class="template-card-title">${escapeHtml(structuredTemplate.templateName)}</div>
                    <div class="subtle template-card-code">${escapeHtml(structuredTemplate.templateCode || '')}</div>
                    <div class="subtle" style="margin-top:8px;">${escapeHtml(structuredTemplate.description || '')}</div>
                    <div class="inline-actions" style="margin-top:12px;">
                      <a class="button-link secondary-button" data-link href="/console/import/templates/${encodeURIComponent(structuredTemplate.templateCode)}">查看字段说明</a>
                      <a class="button-link" href="/api/console/import/templates/${encodeURIComponent(structuredTemplate.templateCode)}/download?kind=example" download>下载模板及示例</a>
                    </div>
                  </div>
                ` : ''}
                ${aliasTemplate ? `
                  <div class="card template-card">
                    <div class="metric-label">增量补录</div>
                    <div class="template-card-title">${escapeHtml(aliasTemplate.templateName)}</div>
                    <div class="subtle template-card-code">${escapeHtml(aliasTemplate.templateCode || '')}</div>
                    <div class="subtle" style="margin-top:8px;">${escapeHtml(aliasTemplate.description || '')}</div>
                    <div class="inline-actions" style="margin-top:12px;">
                      <a class="button-link secondary-button" data-link href="/console/import/templates/${encodeURIComponent(aliasTemplate.templateCode)}">查看字段说明</a>
                      <a class="button-link" href="/api/console/import/templates/${encodeURIComponent(aliasTemplate.templateCode)}/download?kind=example" download>下载模板及示例</a>
                    </div>
                  </div>
                ` : ''}
                <section class="callout">
                  <h3 class="callout-title">导入链路说明</h3>
                  <ol>
                    <li>词条导入统一使用结构化词条模板；先选业务属性，再按统一字段准备 CSV。</li>
                    <li>上传文件后查看预览统计、错误行和警告行。</li>
                    <li>确认无误后点击“确认导入”，系统才会真正入库。</li>
                  </ol>
                </section>
              </div>
            </div>
          </section>
        </div>
        <div class="page-main">
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">最近导入批次</h2>
                <div class="section-desc">最近批次跟进独立成一个稳定区块，便于持续查看预览、导入结果和后续审核闭环。</div>
              </div>
            </div>
            <div class="panel-stack">
              <section class="surface-block surface-block-soft surface-block-import-filter">
                <div class="surface-head">
                  <div>
                    <h3 class="surface-title">筛选条件</h3>
                  </div>
                </div>
                <form data-action="filter-import-jobs" class="import-filter-row">
                  ${selectField({ label: '批次状态', name: 'status', value: status, options: IMPORT_STATUS_OPTIONS })}
                  ${selectField({ label: '来源类型', name: 'sourceType', value: sourceType, options: sourceTypeOptionsFromItems(dictionarySourceTypesMeta.items, { includeAll: true }) })}
                  <button type="submit">应用筛选</button>
                  <button type="button" class="secondary-button" data-action="clear-import-filters">清空筛选</button>
                </form>
              </section>
              ${renderImportResultsSurface(view)}
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

/**
 * 功能：渲染模板详情页。
 * 输入：`templateCode` 模板编码。
 * 输出：无显式返回；直接写入页面。
 */
async function renderImportTemplateDetail(templateCode) {
  pageTitle.textContent = '导入模板详情';
  const data = await fetchJson(`/api/console/import/templates/${encodeURIComponent(templateCode)}`);
  const item = data.item;
  const fields = Array.isArray(item.fields) ? item.fields : [];
  const requiredFieldCount = fields.filter((field) => field.required).length;
  const businessCategoryOptions = Array.isArray(item.businessCategoryOptions) ? item.businessCategoryOptions : [];
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '词典建设' }, { label: '批量导入', href: '/console/dictionary/import-jobs' }, { label: item.templateName }])}
      <div class="grid cards compact">
        ${metricCard('字段数', fields.length)}
        ${metricCard('必填字段', requiredFieldCount)}
        ${metricCard('规则数', (item.rules || []).length)}
        ${metricCard('模板版本', item.templateVersion || '未记录')}
        ${metricCard('文件格式', String(item.fileFormat || '').toUpperCase() || '未记录')}
        ${item.legacy ? metricCard('模板状态', '兼容旧版') : ''}
      </div>
      <section class="panel page-hero">
        <div class="section-head">
          <div class="page-hero-copy">
                <div class="page-hero-kicker">词典建设</div>
            <h2 class="page-hero-title">${escapeHtml(item.templateName)}</h2>
            <div class="page-hero-desc">${item.legacy
              ? '当前模板仅保留兼容入口，建议优先回到批量导入使用统一结构化词条导入主路径。'
              : '模板详情统一成同一套参考结构：先看元数据和下载入口，再看字段说明，最后核对导入规则。'}</div>
          </div>
        </div>
      </section>
      <div class="page-layout with-aside layout-priority-main">
        <div class="page-main">
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">字段说明</h2>
                <div class="section-desc">模板详情改成结构化检查布局，优先看字段，再看规则，不再堆成长文本描述。</div>
              </div>
            </div>
            ${renderDenseTable([
              { label: '字段名', render: (field) => `<span class="mono">${escapeHtml(field.fieldName)}</span>` },
              { label: '中文名称', render: (field) => escapeHtml(field.label || '') },
              { label: '是否必填', render: (field) => field.required ? '<span class="badge warning">必填</span>' : '<span class="badge">选填</span>' },
              { label: '字段类型', render: (field) => escapeHtml(field.type || '') },
              { label: '说明', render: (field) => escapeHtml(field.description || '') },
              { label: '示例', render: (field) => `<span class="mono">${escapeHtml(field.example || '')}</span>` },
            ], item.fields || [], '当前模板没有结构化字段。', { scrollSizeClass: 'panel-scroll-large', collapseThreshold: 8, collapsedSummary: '字段说明较多，默认收起明细' })}
          </section>
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">导入规则</h2>
                <div class="section-desc">上传前请逐条确认这些规则已经满足。</div>
              </div>
            </div>
            <ul class="help-list">
              ${(item.rules || []).map((entry) => `<li>${escapeHtml(entry)}</li>`).join('') || '<li>暂无规则说明。</li>'}
            </ul>
          </section>
          ${businessCategoryOptions.length ? `
            <section class="panel">
              <div class="section-head">
                <div>
                  <h2 class="section-title">业务属性选项</h2>
                  <div class="section-desc">统一词条导入通过业务属性承接路名、政府部门、常用词差异，不再维护多套并列词条导入模板。</div>
                </div>
              </div>
              <ul class="help-list">
                ${businessCategoryOptions.map((entry) => `<li>${escapeHtml(entry.label || entry.value || '')}</li>`).join('')}
              </ul>
            </section>
          ` : ''}
        </div>
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">模板信息</h2>
                <div class="section-desc">下载、示例和返回入口固定放在同一位置，避免不同模板页跳来跳去。</div>
              </div>
            </div>
            <div class="summary-list">
              <div class="summary-row"><span class="subtle">模板编码</span><span>${escapeHtml(item.templateCode)}</span></div>
              <div class="summary-row"><span class="subtle">模板名称</span><span>${escapeHtml(item.templateName)}</span></div>
              <div class="summary-row"><span class="subtle">模板版本</span><span>${escapeHtml(item.templateVersion)}</span></div>
              <div class="summary-row"><span class="subtle">文件格式</span><span>${escapeHtml(String(item.fileFormat || '').toUpperCase())}</span></div>
              <div class="summary-row"><span class="subtle">模板状态</span><span>${item.legacy ? '兼容旧版' : '主路径'}</span></div>
              <div class="summary-row"><span class="subtle">字段数 / 必填</span><span>${escapeHtml(String(fields.length))} / ${escapeHtml(String(requiredFieldCount))}</span></div>
            </div>
            <div class="action-zone" style="margin-top:14px;">
              <div class="action-zone-title">参考与下载</div>
              <div class="action-zone-desc">所有模板详情页都沿用同一组参考动作。</div>
              <div class="inline-actions">
                ${(item.templateCode === STRUCTURED_TERM_IMPORT_TEMPLATE_CODE || item.templateCode === 'term_aliases_csv_v1')
                  ? `<a class="button-link" href="/api/console/import/templates/${encodeURIComponent(item.templateCode)}/download?kind=example" download>下载模板及示例</a>`
                  : `<a class="button-link" href="/api/console/import/templates/${encodeURIComponent(item.templateCode)}/download" download>下载模板</a>
                <a class="button-link secondary-button" href="/api/console/import/templates/${encodeURIComponent(item.templateCode)}/download?kind=example" download>下载示例</a>`}
                <a class="button-link secondary-button" data-link href="/console/dictionary/import-jobs">返回批量导入</a>
              </div>
            </div>
          </section>
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">检查顺序</h2>
                <div class="section-desc">稀疏模板和字段多的模板都沿用同一套阅读顺序，避免不同模板页出现不同视觉系统。</div>
              </div>
            </div>
            <div class="callout">
              <h3 class="callout-title">推荐检查路径</h3>
              <ol>
                <li>先确认模板编码、版本和文件格式是否符合当前导入任务。</li>
                <li>再下载模板及示例，对照字段说明检查列名、类型和必填约束。</li>
                <li>最后回看导入规则，确认上传前的前置条件已经满足。</li>
              </ol>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

/**
 * 功能：渲染导入批次详情页。
 * 输入：`jobId` 导入批次 ID。
 * 输出：无显式返回；直接写入页面。
 */
async function renderImportJobDetail(jobId) {
  const route = currentRouteContext();
  pageTitle.textContent = '导入批次详情';
  const importRowsView = await fetchImportRowsViewData({
    jobId,
    page: route.query.get('page') || 1,
    rowStatus: route.query.get('rowStatus') || '',
    rowDecision: route.query.get('rowDecision') || '',
  });
  const { rowStatus, rowDecision, data: rows } = importRowsView;
  const data = await fetchJson(`/api/console/dictionary/import-jobs/${encodeURIComponent(jobId)}`);
  const item = data.item;
  const template = item.template || null;
  const categoryCodes = Array.isArray(item.categoryCodes) ? item.categoryCodes : [];
  const jobStatus = item.job.status;
  const validationImport = isValidationImportJob(item.job);
  const hasErrorRows = Number((item.previewSummary || {}).errorRows || 0) > 0 || Number((item.resultSummary || {}).errorCount || 0) > 0;
  const canConfirm = item.canConfirm === true;
  const pendingReviewTasks = (item.createdReviewTasks || []).filter((entry) => entry.taskType === 'term_review' && entry.status === 'pending');
  const businessCategorySummary = categoryCodes.length
    ? categoryCodes.map((entry) => businessPropertyLabel(entry, entry)).join(' / ')
    : '未识别';
  const summaryCards = jobStatus === 'imported'
    ? `
      <div class="grid cards compact">
        ${metricCard(validationImport ? '新增样本' : '新增词条', (item.resultSummary || {}).newTermCount || 0)}
        ${metricCard(validationImport ? '更新样本' : '更新词条', (item.resultSummary || {}).updatedTermCount || 0)}
        ${metricCard(validationImport ? '跳过样本' : '新增错误词', validationImport ? ((item.resultSummary || {}).skippedCount || 0) : ((item.resultSummary || {}).newAliasCount || 0))}
        ${metricCard('错误数', (item.resultSummary || {}).errorCount || 0)}
      </div>
    `
    : `
      <div class="grid cards compact">
        ${metricCard('预览总行数', item.previewSummary.totalRows)}
        ${metricCard('可直接导入', item.previewSummary.readyRows)}
        ${metricCard('需人工确认', item.previewSummary.warningRows)}
        ${metricCard('错误行', item.previewSummary.errorRows)}
      </div>
    `;
  const nextStepHtml = jobStatus === 'preview_ready'
    ? `
      <section class="callout">
        <h3 class="callout-title">下一步建议</h3>
        <p>当前批次还没有真正入库。请先核对预览结果，再点击“确认导入”。如果预览明显不对，请取消批次并重新准备文件。</p>
      </section>
    `
      : jobStatus === 'imported'
      ? `
        <section class="callout">
          <h3 class="callout-title">导入已完成</h3>
          <p>${validationImport ? '下一步建议回到“验证样本”，按来源类型或关键字筛查刚导入的样本，确认样本已正确参与后续验证链路。' : '下一步请检查“影响词条”和“生成的审核任务”；若当前批次生成了大量词条审核任务，建议直接进入“本批词条审核”视图集中处理。'}</p>
        </section>
      `
      : '';
  const legacyTemplateHtml = template && template.legacy
    ? `
      <section class="callout">
        <h3 class="callout-title">兼容模板提示</h3>
        <p>当前批次使用 legacy 模板创建，仅用于兼容旧导入链路和历史批次理解。后续新导入请优先改用统一结构化词条主路径。</p>
        ${template.supersededBy ? `<div class="inline-actions" style="margin-top:12px;"><a class="button-link secondary-button" data-link href="/console/import/templates/${encodeURIComponent(template.supersededBy)}">查看当前主模板</a></div>` : ''}
      </section>
    `
    : '';
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '词典建设' }, { label: '批量导入', href: '/console/dictionary/import-jobs' }, { label: item.job.jobId }])}
      ${nextStepHtml}
      ${legacyTemplateHtml}
      ${summaryCards}
      <div class="page-layout equal">
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">批次摘要</h2>
              <div class="section-desc">批次状态和关键入口都集中在这里。</div>
            </div>
          </div>
          <div class="summary-list">
            <div class="summary-row"><span class="subtle">批次 ID</span><span>${escapeHtml(item.job.jobId)}</span></div>
            <div class="summary-row"><span class="subtle">批次状态</span><span>${renderBadge(item.job.status)}</span></div>
            <div class="summary-row"><span class="subtle">模板编码</span><span>${escapeHtml(item.job.templateCode)}</span></div>
            <div class="summary-row"><span class="subtle">模板状态</span><span>${template ? (template.legacy ? '兼容旧版' : '主路径') : '未记录'}</span></div>
            <div class="summary-row"><span class="subtle">来源类型</span><span>${escapeHtml(sourceTypeLabel(item.job.sourceType, item.job.sourceType || '未记录'))}</span></div>
            ${!validationImport ? `<div class="summary-row"><span class="subtle">业务属性</span><span>${escapeHtml(businessCategorySummary)}</span></div>` : ''}
          </div>
          <div class="inline-actions" style="margin-top:14px;">
            ${item.job.status === 'preview_ready' ? `
              ${canConfirm
                ? renderFeatureAction('import.confirm', `<form data-action="confirm-import-job" action="/api/console/dictionary/import-jobs/${encodeURIComponent(jobId)}/confirm"><button type="submit">确认导入</button></form>`, '确认导入', '当前身份不能确认导入批次。')
                : renderDisabledAction('确认导入', '当前批次仍存在 blocked/error 行，必须先修正文件后重新生成预览。')}
              ${renderFeatureAction('import.cancel', `<form data-action="cancel-import-job" action="/api/console/dictionary/import-jobs/${encodeURIComponent(jobId)}/cancel"><button type="submit" class="secondary-button">取消批次</button></form>`, '取消批次', '当前身份不能取消导入批次。')}
            ` : ''}
            ${hasErrorRows
              ? `<a class="button-link secondary-button" href="/api/console/dictionary/import-jobs/${encodeURIComponent(jobId)}/errors/download" download>下载错误报表</a>`
              : renderDisabledAction('无错误报表', '当前批次没有错误行，无需下载错误报表。')}
            ${!validationImport && pendingReviewTasks.length
              ? `<a class="button-link" data-link href="${escapeHtml(buildConsoleUrl('/dictionary/reviews', { view: 'terms', importJobId: jobId }))}">前往词条审核本批任务</a>`
              : ''}
          </div>
        </section>
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">文件信息</h2>
              <div class="section-desc">便于核对上传文件是否正确。</div>
            </div>
          </div>
          ${item.file ? `
            <div class="summary-list">
              <div class="summary-row"><span class="subtle">原始文件名</span><span>${escapeHtml(item.file.originalName)}</span></div>
              <div class="summary-row"><span class="subtle">文件大小</span><span>${escapeHtml(String(item.file.fileSize))} 字节</span></div>
              ${template ? `<div class="summary-row"><span class="subtle">模板名称</span><span>${escapeHtml(template.templateName || item.job.templateCode)}</span></div>` : ''}
            </div>
          ` : '<div class="subtle">暂无文件信息。</div>'}
        </section>
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">预览汇总</h2>
              <div class="section-desc">确认导入前，请重点看这里。</div>
            </div>
          </div>
          <div class="summary-list">
            <div class="summary-row"><span class="subtle">总行数</span><span>${escapeHtml(String(item.previewSummary.totalRows))}</span></div>
            <div class="summary-row"><span class="subtle">可直接导入</span><span>${escapeHtml(String(item.previewSummary.readyRows))}</span></div>
            <div class="summary-row"><span class="subtle">需人工确认</span><span>${escapeHtml(String(item.previewSummary.warningRows))}</span></div>
            <div class="summary-row"><span class="subtle">错误行</span><span>${escapeHtml(String(item.previewSummary.errorRows))}</span></div>
            <div class="summary-row"><span class="subtle">可导入总数</span><span>${escapeHtml(String(item.previewSummary.importableRows))}</span></div>
          </div>
          ${item.job.status === 'preview_ready' ? `<div style="margin-top:14px;">${renderAdmissionSummaryBlock({
            level: Number(item.previewSummary.errorRows || 0) > 0 ? 'blocked' : (Number(item.previewSummary.warningRows || 0) > 0 ? 'warning' : 'ready'),
            blockedCount: Number(item.previewSummary.errorRows || 0),
            warningCount: Number(item.previewSummary.warningRows || 0),
            issues: [],
          }, '批次准入摘要')}</div>` : ''}
        </section>
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">导入结果</h2>
              <div class="section-desc">${validationImport ? '样本模板导入后，这里会显示新增 / 更新 / 跳过统计。' : '只有确认导入之后，这里的统计才会真实变化。'}</div>
            </div>
          </div>
          <pre class="mono">${escapeHtml(JSON.stringify(item.resultSummary || {}, null, 2))}</pre>
        </section>
        ${validationImport
          ? `
            <section class="panel">
              <div class="section-head">
                <div>
                  <h2 class="section-title">导入后建议</h2>
                  <div class="section-desc">验证样本导入不会生成词条或审核任务，下一步请直接回到样本中心检查入库结果。</div>
                </div>
              </div>
              <div class="inline-actions">
                <a class="button-link" data-link href="/console/validation/cases?sourceType=validation_import">查看样本列表</a>
                <a class="button-link secondary-button" data-link href="/console/dictionary/import-jobs">返回批量导入</a>
              </div>
            </section>
          `
          : `
            <section class="panel">
              <div class="section-head">
                <div>
                  <h2 class="section-title">影响词条</h2>
                  <div class="section-desc">导入成功后，相关词条会列在这里。</div>
                </div>
              </div>
              ${renderDenseTable([
                { label: '标准词', render: (entry) => `<a class="primary-link" data-link href="/console/dictionary/terms/${encodeURIComponent(entry.termId)}">${escapeHtml(entry.canonicalText)}</a>` },
                { label: '业务属性', render: (entry) => escapeHtml(businessPropertyLabel(entry.categoryCode, entry.categoryCode)) },
                { label: '词条状态', render: (entry) => renderBadge(entry.status) },
              ], item.linkedTerms || [], '当前还没有关联词条。', { scrollSizeClass: 'panel-scroll-medium', collapseThreshold: 8, collapsedSummary: '影响词条较多，默认收起明细' })}
            </section>
            <section class="panel">
              <div class="section-head">
                <div>
                  <h2 class="section-title">生成的审核任务</h2>
                  <div class="section-desc">导入成功后，如有新词条或变更，会在这里生成审核任务。优先建议进入只看本批任务的词条审核视图统一处理。</div>
                </div>
              </div>
              ${pendingReviewTasks.length ? `
                <section class="callout" style="margin-bottom:14px;">
                  <h3 class="callout-title">本批审核建议</h3>
                  <p>当前批次还有 ${escapeHtml(String(pendingReviewTasks.length))} 条待审核词条任务。建议直接进入“本批词条审核”视图集中处理，避免在宽列表里逐条查找。</p>
                  <div class="inline-actions" style="margin-top:12px;">
                    <a class="button-link" data-link href="${escapeHtml(buildConsoleUrl('/dictionary/reviews', { view: 'terms', importJobId: jobId }))}">前往词条审核本批任务</a>
                  </div>
                </section>
              ` : ''}
              ${renderDenseTable([
                { label: '任务 ID', render: (entry) => `<a class="primary-link" data-link href="/console/dictionary/reviews/${encodeURIComponent(entry.taskId)}">${escapeHtml(entry.taskId)}</a>` },
                { label: '状态', render: (entry) => renderBadge(entry.status) },
                { label: '目标词条', render: (entry) => escapeHtml(entry.targetSnapshot && entry.targetSnapshot.canonicalText ? entry.targetSnapshot.canonicalText : entry.targetId) },
              ], item.createdReviewTasks || [], '当前没有生成审核任务。', { scrollSizeClass: 'panel-scroll-medium', collapseThreshold: 8, collapsedSummary: '生成的审核任务较多，默认收起明细' })}
            </section>
          `}
        <section class="panel" style="grid-column: 1 / -1;">
          <div class="section-head">
            <div>
              <h2 class="section-title">预览行</h2>
              <div class="section-desc">${jobStatus === 'imported' ? '导入完成后，这里用于追踪每一行最终如何入库。' : '用于逐行核对导入内容与错误原因。'}</div>
            </div>
          </div>
          <form data-action="filter-import-job-rows" class="toolbar-form">
            <input type="hidden" name="jobId" value="${escapeHtml(jobId)}">
            ${selectField({ label: '行状态', name: 'rowStatus', value: rowStatus, options: IMPORT_ROW_STATUS_OPTIONS })}
            ${selectField({ label: '处理决策', name: 'rowDecision', value: rowDecision, options: IMPORT_ROW_DECISION_OPTIONS })}
            <div class="form-actions">
              <button type="submit">应用筛选</button>
              <button type="button" class="secondary-button" data-action="clear-import-job-row-filters">清空筛选</button>
            </div>
          </form>
          ${renderImportRowsResultsSurface(importRowsView)}
        </section>
      </div>
    </div>
  `;
}

/**
 * 功能：渲染审核中心首页。
 * 输入：无。
 * 输出：无显式返回；直接写入页面。
 */
async function renderReviews() {
  const route = currentRouteContext();
  const view = await fetchReviewListViewData({
    page: route.query.get('page') || 1,
    view: route.query.get('view') || '',
    status: route.query.get('status') || '',
    importJobId: route.query.get('importJobId') || '',
  });
  const currentView = view.view;
  const viewTitle = currentView === 'pinyin' ? '拼音审核' : '词条审核';
  const importJobId = view.importJobId;
  pageTitle.textContent = viewTitle;
  const { status, data, items, importJobContext, summary, filteredSummary } = view;
  const reviewBulkScopeOptions = importJobId
    ? [
      { value: 'selected_tasks', label: '当前页勾选任务' },
      { value: 'import_job', label: '当前导入批次待审核任务' },
    ]
    : [
      { value: 'selected_tasks', label: '当前页勾选任务' },
      { value: 'current_filter', label: '当前筛选结果' },
    ];
  const viewSwitches = [
    {
      key: 'terms',
      label: '词条审核',
      href: buildConsoleUrl('/dictionary/reviews', { view: 'terms', importJobId }),
      description: '只看词条审核任务和通过/驳回后的回流路径。',
      active: currentView === 'terms',
    },
    {
      key: 'pinyin',
      label: '拼音审核',
      href: buildConsoleUrl('/dictionary/reviews', { view: 'pinyin' }),
      description: '只看拼音候选审核和写回词条画像的后续动作。',
      active: currentView === 'pinyin',
    },
  ];
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '词典建设' }, { label: '词典审核' }, { label: viewTitle }])}
      ${renderMetricCardGrid([
        { label: importJobId ? '当前批次任务总量' : `${currentView === 'pinyin' ? '拼音审核' : '词条审核'}任务总量`, value: summary.totalCount || 0 },
        { label: '待审核', value: summary.pendingCount || 0, hideWhenZero: true },
        { label: '已通过', value: summary.approvedCount || 0, hideWhenZero: true },
        { label: '已驳回', value: summary.rejectedCount || 0, hideWhenZero: true },
      ])}
      <section class="panel">
        <div class="section-head">
          <div>
            <h2 class="section-title">${escapeHtml(viewTitle)}</h2>
            <div class="section-desc">${escapeHtml(currentView === 'pinyin'
              ? '当前工作页只承接拼音候选审核。通过后，读音将写回词条画像；驳回后，请回到词条继续修正。'
              : '当前工作页只承接词条审核。通过后，词条进入下一次 build 输入池；驳回后，请回到词条继续修正。')}</div>
          </div>
          ${renderPageHelpLink(currentView === 'pinyin' ? 'page-review-pinyin' : 'page-review-terms', '查看审核帮助')}
        </div>
        <div class="panel-stack">
          <section class="surface-block">
            <div class="surface-head">
              <div>
                <h3 class="surface-title">审核工作视图</h3>
                <div class="surface-desc">通过显性工作视图切换词条审核与拼音审核，不再把两类任务混在一页里靠筛选理解。</div>
              </div>
            </div>
            <div class="support-card-grid">
              ${viewSwitches.map((entry) => `
                <article class="card template-card support-card ${entry.active ? 'active' : ''}">
                  <div class="metric-label">审核工作页</div>
                  <div class="template-card-title support-card-title">${escapeHtml(entry.label)}</div>
                  <div class="support-card-summary">${escapeHtml(entry.description)}</div>
                  <div class="support-card-actions">
                    ${entry.active
                      ? '<span class="button-link secondary-button disabled">当前视图</span>'
                      : `<a class="button-link" data-link href="${escapeHtml(entry.href)}">切换到此视图</a>`}
                  </div>
                </article>
              `).join('')}
            </div>
          </section>
          ${currentView === 'terms' ? `
            <section class="surface-block">
              <div class="surface-head">
                <div>
                  <h3 class="surface-title">批量审核</h3>
                  <div class="surface-desc">${escapeHtml(importJobId
                    ? '当前页支持两种安全范围：只处理显式勾选任务，或只处理当前导入批次下的待审核词条任务。'
                    : '当前页支持两种范围：只处理显式勾选任务，或按当前筛选结果批量处理词条审核任务。')}</div>
                </div>
              </div>
              ${importJobContext ? `
                <section class="callout ${importJobContext.found ? 'warning' : 'danger'}" style="margin-bottom:14px;">
                  <h3 class="callout-title">${escapeHtml(importJobContext.found ? `当前导入批次：${importJobContext.jobId}` : '导入批次不存在')}</h3>
                  <p>${escapeHtml(importJobContext.found
                    ? `当前视图只展示导入批次 ${importJobContext.jobId} 关联的词条审核任务。关联词条 ${importJobContext.linkedTermCount} 条，审核任务 ${importJobContext.totalReviewCount} 条，待审核 ${importJobContext.pendingReviewCount} 条；如果选择“当前导入批次待审核任务”，系统只会处理这 ${importJobContext.pendingReviewCount} 条待审核任务。`
                    : `未找到导入批次 ${importJobContext.jobId}，请返回批量导入重新进入。`)}</p>
                </section>
              ` : ''}
              <form data-action="bulk-review-action" class="bulk-action-bar review-bulk-form">
                ${hasPageFeature('reviews.bulk.approve') || hasPageFeature('reviews.bulk.reject')
                  ? `
                    ${selectField({
                      label: '批量动作',
                      name: 'bulkAction',
                      value: hasPageFeature('reviews.bulk.approve') ? 'approve' : 'reject',
                      options: REVIEW_BULK_ACTION_OPTIONS.filter((entry) => (
                        (entry.value === 'approve' && hasPageFeature('reviews.bulk.approve'))
                        || (entry.value === 'reject' && hasPageFeature('reviews.bulk.reject'))
                      )),
                    })}
                    ${selectField({ label: '执行范围', name: 'bulkScope', value: 'selected_tasks', options: reviewBulkScopeOptions })}
                    <input type="hidden" name="importJobId" value="${escapeHtml(importJobId)}">
                    ${inputField({ label: '驳回备注', name: 'comment', value: '', placeholder: '批量驳回时建议填写统一说明；批量通过可留空', className: 'review-bulk-comment' })}
                    <div class="form-actions">
                      <button type="submit">执行批量审核</button>
                    </div>
                  `
                  : `
                    <div class="form-actions">
                      ${renderDisabledAction('执行批量审核', '当前身份没有批量审核页面功能。')}
                    </div>
                  `}
              </form>
            </section>
          ` : ''}
          <section class="surface-block surface-block-soft">
            <div class="surface-head">
              <div>
                <h3 class="surface-title">筛选条件</h3>
                <div class="surface-desc">${escapeHtml(currentView === 'pinyin'
                  ? '当前视图固定为拼音审核，只保留状态筛选，不再让目标类型和任务类型二次分流。'
                  : '当前视图固定为词条审核，只保留状态筛选，不再让目标类型和任务类型二次分流。')}</div>
              </div>
            </div>
            <form data-action="filter-reviews" class="toolbar-form toolbar-form-inline review-filter-form">
              <input type="hidden" name="view" value="${escapeHtml(currentView)}">
              ${importJobId ? `<input type="hidden" name="importJobId" value="${escapeHtml(importJobId)}">` : ''}
              ${selectField({ label: '任务状态', name: 'status', value: status, options: REVIEW_STATUS_OPTIONS })}
              <div class="form-actions review-filter-actions">
                <button type="submit">应用筛选</button>
                <button type="button" class="secondary-button" data-action="clear-review-filters">清空筛选</button>
              </div>
            </form>
          </section>
          ${renderReviewResultsSurface(view)}
          <section class="callout">
            <h3 class="callout-title">下一步去哪</h3>
            <p>${escapeHtml(currentView === 'pinyin'
              ? '如果当前候选审核通过，请回到词条详情确认拼音画像是否已满足运行要求；如果驳回，请回到词条继续修正后再重新提交。'
              : '如果当前词条审核通过，请回到版本发布构建新版本；如果驳回，请回到词条页继续补齐内容后再重新提交。')}</p>
          </section>
        </div>
      </section>
    </div>
  `;
}

/**
 * 功能：渲染审核任务详情页。
 * 输入：`taskId` 审核任务 ID。
 * 输出：无显式返回；直接写入页面。
 */
async function renderReviewDetail(taskId) {
  pageTitle.textContent = '审核任务详情';
  const data = await fetchJson(`/api/console/dictionary/reviews/${encodeURIComponent(taskId)}`);
  const item = data.item;
  const reviewParentLabel = item.targetType === 'release' ? '版本发布' : '词典审核';
  const reviewParentHref = item.targetType === 'release' ? '/console/releases' : '/console/dictionary/reviews';
  const admissionSummary = item.admissionSummary || null;
  const approvalGuard = getReleaseReviewApprovalGuard(item);
  const summary = item.targetSummary || {
    title: item.targetId,
    subtitle: displayLabel(item.targetType),
    detail: item.comment || '暂无说明',
    targetPath: '',
  };
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: reviewParentLabel, href: reviewParentHref }, { label: item.taskId }])}
      <div class="page-layout with-aside layout-priority-main">
        <div class="page-main">
          <section class="panel page-hero">
            <div class="section-head">
              <div class="page-hero-copy">
                <div class="page-hero-kicker">审核详情</div>
                <h2 class="page-hero-title">${escapeHtml(summary.title)}</h2>
                <div class="page-hero-desc">${escapeHtml(summary.detail || '用于确认当前审核目标、提交人和审核状态。')}</div>
              </div>
            </div>
            <div class="inline-badge-row" style="margin-bottom:14px;">
              ${renderBadge(item.status)}
              <span class="badge">${escapeHtml(displayLabel(item.taskType))}</span>
              <span class="badge">${escapeHtml(displayLabel(item.targetType))}</span>
            </div>
            <div class="summary-list">
              <div class="summary-row"><span class="subtle">任务 ID</span><span>${escapeHtml(item.taskId)}</span></div>
              <div class="summary-row"><span class="subtle">提交人</span><span>${escapeHtml(item.submittedBy || '未记录')}</span></div>
              <div class="summary-row"><span class="subtle">审核人</span><span>${escapeHtml(item.reviewedBy || '尚未审核')}</span></div>
              <div class="summary-row"><span class="subtle">目标摘要</span><span>${escapeHtml(summary.subtitle || summary.title)}</span></div>
              ${item.targetType === 'release' && item.taskType === 'release_publish_review'
                ? `
                  <div class="summary-row"><span class="subtle">审批要求</span><span>${escapeHtml(String(approvalGuard.requiredApprovals))} 位不同审核人</span></div>
                  <div class="summary-row"><span class="subtle">已通过审核人</span><span>${escapeHtml(approvalGuard.approvedReviewers.join('、') || '暂无')}</span></div>
                `
                : ''}
            </div>
            ${approvalGuard.blocked ? `
              <section class="callout danger" style="margin-top:14px;">
                <h3 class="callout-title">${escapeHtml(approvalGuard.calloutTitle)}</h3>
                <p>${escapeHtml(approvalGuard.calloutMessage)}</p>
              </section>
            ` : approvalGuard.hintMessage ? `
              <section class="callout warning" style="margin-top:14px;">
                <h3 class="callout-title">当前审批提醒</h3>
                <p>${escapeHtml(approvalGuard.hintMessage)}</p>
              </section>
            ` : ''}
          </section>
          ${summary.workflow ? `<section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">本步目的与下一步</h2>
                <div class="section-desc">在点击审核动作前，先明确这一步是在确认什么，以及通过或驳回后应该去哪。</div>
              </div>
            </div>
            <div class="summary-list">
              <div class="summary-row"><span class="subtle">本步目的</span><span>${escapeHtml(summary.workflow.purpose || '未说明')}</span></div>
              <div class="summary-row"><span class="subtle">通过后</span><span>${escapeHtml(summary.workflow.approveNext || '未说明')}</span></div>
              <div class="summary-row"><span class="subtle">驳回后</span><span>${escapeHtml(summary.workflow.rejectNext || '未说明')}</span></div>
            </div>
          </section>` : ''}
          ${summary.releaseState ? `
            <section class="panel">
              <div class="section-head">
                <div>
                  <h2 class="section-title">版本状态摘要</h2>
                  <div class="section-desc">release publish review 也按“版本状态 / 审批状态 / 流量状态”三层语义展示，避免和版本发布口径分叉。</div>
                </div>
              </div>
              <div class="summary-list">
                <div class="summary-row"><span class="subtle">版本状态</span><span>${renderBadge(summary.releaseState.status || '')}</span></div>
                <div class="summary-row"><span class="subtle">当前身份</span><span>${renderReleaseIdentityFlags(summary) || '普通版本'}</span></div>
                <div class="summary-row"><span class="subtle">审批状态</span><span>${renderBadge((((summary || {}).approval) || {}).status || 'not_submitted')}</span></div>
                <div class="summary-row"><span class="subtle">审批进度</span><span>${escapeHtml(String((((summary || {}).approval) || {}).approvedCount || 0))} / ${escapeHtml(String((((summary || {}).approval) || {}).requiredApprovals || 1))}</span></div>
                <div class="summary-row"><span class="subtle">流量状态</span><span>${renderToneBadge(releaseTrafficDescriptor(summary.traffic || {}).label, releaseTrafficDescriptor(summary.traffic || {}).tone)}</span></div>
                <div class="summary-row"><span class="subtle">流量说明</span><span>${escapeHtml(releaseTrafficDescriptor(summary.traffic || {}).detail)}</span></div>
              </div>
            </section>
          ` : ''}
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">目标快照</h2>
                <div class="section-desc">${escapeHtml(summary.subtitle || '系统记录的提交时快照')}</div>
              </div>
            </div>
            <pre class="mono">${escapeHtml(JSON.stringify(item.targetSnapshot || {}, null, 2))}</pre>
          </section>
          ${admissionSummary ? `<section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">统一准入摘要</h2>
                <div class="section-desc">审核员可直接看到当前词条命中的阻断或警示项，不必只读原始快照。</div>
              </div>
            </div>
            ${renderAdmissionSummaryBlock(admissionSummary, '准入风险说明')}
          </section>` : ''}
        </div>
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">辅助导航</h2>
                <div class="section-desc">先回到词典审核，或直接进入目标对象，避免在高优先工作页只剩一个可见入口。</div>
              </div>
            </div>
              <div class="action-zone">
              <div class="action-zone-title">查看与返回</div>
              <div class="action-zone-desc">这些是低风险导航动作，不与审核决策混在一起。</div>
              <div class="inline-actions">
                <form data-action="navigate-console" action="${escapeHtml(reviewParentHref)}">
                  <button type="submit" class="secondary-button">返回${escapeHtml(reviewParentLabel)}</button>
                </form>
                <form data-action="navigate-console" action="/console">
                  <button type="submit" class="secondary-button">返回工作台</button>
                </form>
                ${summary.targetPath ? `<form data-action="navigate-console" action="${escapeHtml(summary.targetPath)}"><button type="submit">查看目标对象</button></form>` : ''}
              </div>
            </div>
          </section>
          ${item.status === 'pending' ? `
            <section class="panel">
              <div class="section-head">
                <div>
                  <h2 class="section-title">审核动作</h2>
                  <div class="section-desc">把审核通过和驳回动作从导航区独立出来，避免和普通查看按钮混读。</div>
                </div>
              </div>
              <div class="action-zone">
                <div class="action-zone-title">主决策</div>
                <div class="action-zone-desc">当前任务仍待审核时，在这里直接完成审核通过。</div>
                <div class="inline-actions">
                  ${approvalGuard.blocked
                    ? renderDisabledAction('审核通过', approvalGuard.buttonMessage)
                    : renderFeatureAction('reviews.approve', `<form data-action="approve-review" action="/api/console/dictionary/reviews/${encodeURIComponent(item.taskId)}/approve"><button type="submit">审核通过</button></form>`, '审核通过', '当前身份不能执行审核通过。')}
                </div>
              </div>
              <div class="action-zone action-zone-danger" style="margin-top:14px;">
                <div class="action-zone-title">风险决策</div>
                <div class="action-zone-desc">驳回属于更强决策动作，单独隔离，避免与普通查看或通过动作混在一起。</div>
                <div class="inline-actions">
                  ${renderFeatureAction('reviews.reject', `<form data-action="reject-review" action="/api/console/dictionary/reviews/${encodeURIComponent(item.taskId)}/reject"><button type="submit" class="danger-button">驳回任务</button></form>`, '驳回任务', '当前身份不能执行审核驳回。')}
                </div>
              </div>
            </section>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * 功能：渲染版本列表首页。
 * 输入：无。
 * 输出：无显式返回；直接写入页面。
 */
async function renderReleases() {
  const view = await fetchReleaseListViewData({
    page: currentRouteContext().query.get('page') || 1,
    view: currentRouteContext().query.get('view') || '',
    status: currentRouteContext().query.get('status') || '',
  });
  const currentView = view.view;
  const viewMeta = view.viewMeta;
  pageTitle.textContent = viewMeta.title;
  const { status, data, summary } = view;
  const viewSwitches = [
    { key: 'list', label: '版本列表' },
    { key: 'review', label: '发布审核' },
    { key: 'canary', label: '灰度发布' },
    { key: 'risk', label: '发布后风险' },
    { key: 'rollback', label: '回滚记录' },
  ];
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '版本发布' }, { label: viewMeta.title }])}
      ${renderMetricCardGrid([
        { label: '版本总量', value: summary.totalCount || 0 },
        { label: '已构建', value: summary.builtCount || 0, hideWhenZero: true },
        { label: '灰度中', value: summary.canaryCount || 0, hideWhenZero: true },
        { label: '已发布', value: summary.publishedCount || 0, hideWhenZero: true },
      ])}
      <div class="page-layout with-aside layout-priority-main">
        <div class="page-main">
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">${escapeHtml(viewMeta.sectionTitle)}</h2>
                <div class="section-desc">${escapeHtml(viewMeta.description)}</div>
              </div>
              ${renderPageHelpLink(
                currentView === 'review'
                  ? 'page-release-review'
                  : currentView === 'canary'
                    ? 'page-release-canary'
                    : currentView === 'risk'
                      ? 'page-release-risk'
                      : currentView === 'rollback'
                        ? 'page-release-rollback'
                        : 'page-release-list',
                currentView === 'review'
                  ? '查看发布审核说明'
                  : currentView === 'canary'
                    ? '查看灰度说明'
                    : currentView === 'risk'
                      ? '查看风险说明'
                      : currentView === 'rollback'
                        ? '查看回滚说明'
                        : '查看版本列表帮助'
              )}
            </div>
            <div class="panel-stack">
              <section class="surface-block">
                <div class="surface-head">
                  <div>
                    <h3 class="surface-title">版本工作视图</h3>
                    <div class="surface-desc">保持单一路由，但显性拆出版本列表、发布审核、灰度发布、发布后风险和回滚记录，不再把所有职责都隐含在一个“发布中心”里。</div>
                  </div>
                </div>
                <div class="support-card-grid">
                  ${viewSwitches.map((entry) => {
                    const active = currentView === entry.key;
                    return `
                      <article class="card template-card support-card ${active ? 'active' : ''}">
                        <div class="metric-label">版本工作页</div>
                        <div class="template-card-title support-card-title">${escapeHtml(entry.label)}</div>
                        <div class="support-card-summary">${escapeHtml(entry.label === viewMeta.title ? viewMeta.helpText : '切换到该工作视图后，再进入版本详情继续处理。')}</div>
                        <div class="support-card-actions">
                          ${active
                            ? '<span class="button-link secondary-button disabled">当前视图</span>'
                            : `<a class="button-link" data-link href="${escapeHtml(buildConsoleUrl('/releases', { view: entry.key === 'list' ? '' : entry.key, status }))}">切换到此视图</a>`}
                        </div>
                      </article>
                    `;
                  }).join('')}
                </div>
              </section>
              <section class="surface-block surface-block-soft">
                <div class="surface-head">
                  <div>
                    <h3 class="surface-title">筛选条件</h3>
                    <div class="surface-desc">筛选只改变结果范围，不改变状态呈现方式。</div>
                  </div>
                </div>
                <form data-action="filter-releases" class="toolbar-form toolbar-form-inline">
                  <input type="hidden" name="view" value="${escapeHtml(currentView)}">
                  ${selectField({ label: '发布状态', name: 'status', value: status, options: RELEASE_STATUS_OPTIONS })}
                  <div class="form-actions">
                    <button type="submit">应用筛选</button>
                    <button type="button" class="secondary-button" data-action="clear-release-filters">清空筛选</button>
                  </div>
                </form>
              </section>
              ${renderReleaseResultsSurface(view)}
              <section class="callout">
                <h3 class="callout-title">下一步建议</h3>
                <p>${escapeHtml(viewMeta.helpText)}</p>
              </section>
            </div>
          </section>
        </div>
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">构建新版本</h2>
                <div class="section-desc">构建动作保留，但退到侧边作为次级入口，不干扰对版本状态的第一判断。</div>
              </div>
            </div>
            ${hasPageFeature('releases.build') ? `<form data-action="build-release" class="form-grid compact">
              ${inputField({ label: '发布摘要', name: 'summary', placeholder: '例如：补录 3 月政务热词与 QA 错误词。', required: true })}
              <div class="form-actions">
                <button type="submit">创建并构建</button>
              </div>
            </form>` : renderEmptyState('当前身份没有“构建版本”页面功能。')}
          </section>
        </div>
      </div>
    </div>
  `;
}

/**
 * 功能：渲染 release 详情页。
 * 输入：`releaseId` release ID。
 * 输出：无显式返回；直接写入页面。
 */
async function renderReleaseDetail(releaseId) {
  pageTitle.textContent = '版本详情';
  const data = await fetchJson(`/api/console/releases/${encodeURIComponent(releaseId)}`);
  const item = data.item;
  const reviewTask = item.reviewTask || null;
  const approvalGuard = getReleaseReviewApprovalGuard(reviewTask || {});
  const releaseState = item.releaseState || { status: ((item.release || {}).status || '') };
  const releaseTraffic = item.traffic || {};
  const trafficDescriptor = releaseTrafficDescriptor(releaseTraffic);
  const rollout = item.rollout || {};
  const confirmation = item.confirmation || {};
  const confirmationGuidance = releaseConfirmationGuidance(item);
  const evidence = item.evidence || {};
  const riskSectionTitle = releaseRiskSectionTitle(item);
  const riskSectionDescription = releaseRiskSectionDescription(item);
  const riskSummary = isPublishedRelease(item) ? (item.postPublishRisk || {}) : (item.releaseCheck || item.gate || {});
  const requiredApprovals = Number(item.approval.requiredApprovals || 1);
  const approvedCount = Number(item.approval.approvedCount || 0);
  const canSubmitReleaseReview = ['built', 'canary'].includes(releaseState.status)
    && !['approved', 'pending'].includes(String(item.approval.status || '').trim());
  const canCanaryRelease = ['built', 'canary'].includes(releaseState.status)
    && String(item.approval.status || '').trim() === 'approved'
    && releaseTraffic.isCurrentCanary !== true;
  const canPublishRelease = ['built', 'canary'].includes(releaseState.status)
    && String(item.approval.status || '').trim() === 'approved';
  const canRolloutRelease = ['built', 'canary', 'published'].includes(releaseState.status);
  const isCurrentDesiredRelease = confirmation.isCurrentDesiredRelease === true;
  const approvedReviewers = Array.isArray(item.approval.approvedReviewers)
    ? item.approval.approvedReviewers.map((reviewer) => String(reviewer || '').trim()).filter(Boolean)
    : [];
  const pendingApprovalCount = Math.max(requiredApprovals - approvedCount, 0);
  const stageDescriptor = releaseStageDescriptor({
    ...item.release,
    releaseState,
    approval: item.approval,
    releaseCheck: item.releaseCheck || item.gate,
    postPublishRisk: item.postPublishRisk,
  });
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '版本发布' }, { label: '版本列表', href: '/console/releases' }, { label: item.release.version }])}
      <div class="page-layout with-aside layout-priority-main">
        <div class="page-main">
          <section class="panel page-hero">
            <div class="section-head">
              <div class="page-hero-copy">
                <div class="page-hero-kicker">版本发布</div>
                <h2 class="page-hero-title">${escapeHtml(item.release.version)}</h2>
                <div class="page-hero-desc">先区分版本状态、审批状态、流量状态，再决定是否继续提审、下发、发布或回滚。</div>
              </div>
            </div>
            <div class="inline-badge-row" style="margin-bottom:14px;">
              ${renderBadge(releaseState.status)}
              ${renderReleaseIdentityFlags({ releaseState })}
            </div>
            <div class="summary-list">
              <div class="summary-row"><span class="subtle">版本状态</span><span>${renderBadge(releaseState.status)}</span></div>
              <div class="summary-row"><span class="subtle">阶段判断</span><span>${escapeHtml(stageDescriptor.title)}</span></div>
              <div class="summary-row"><span class="subtle">发布审批</span><span>${renderBadge(item.approval.status)}</span></div>
              <div class="summary-row"><span class="subtle">流量状态</span><span>${renderToneBadge(trafficDescriptor.label, trafficDescriptor.tone)}</span></div>
              <div class="summary-row"><span class="subtle">流量说明</span><span>${escapeHtml(trafficDescriptor.detail)}</span></div>
              <div class="summary-row"><span class="subtle">词条数量</span><span>${escapeHtml(String(item.release.termCount))}</span></div>
              <div class="summary-row"><span class="subtle">审批进度</span><span>${escapeHtml(String(item.approval.approvedCount || 0))} / ${escapeHtml(String(item.approval.requiredApprovals || 0))}</span></div>
              <div class="summary-row"><span class="subtle">已通过审核人</span><span>${escapeHtml(approvedReviewers.join('、') || '暂无')}</span></div>
              <div class="summary-row"><span class="subtle">${escapeHtml(riskSectionTitle)}</span><span>${riskSummary.blocked || riskSummary.active ? '<span class="badge danger">存在阻断</span>' : '<span class="badge success">已通过</span>'}</span></div>
              <div class="summary-row"><span class="subtle">下游收敛</span><span>${escapeHtml(String((rollout.summary || {}).alignedNodes || 0))} 对齐 / ${escapeHtml(String((rollout.summary || {}).pendingNodes || 0))} 待收敛 / ${escapeHtml(String((rollout.summary || {}).failedNodes || 0))} 失败</span></div>
            </div>
            ${requiredApprovals > 1 && pendingApprovalCount > 0 ? `
              <section class="callout" style="margin-top:14px;">
                <h3 class="callout-title">当前仍需继续审批</h3>
                <p>该版本需要 ${escapeHtml(String(requiredApprovals))} 位不同审核人通过。当前还差 ${escapeHtml(String(pendingApprovalCount))} 位；已通过：${escapeHtml(approvedReviewers.join('、') || '暂无')}。</p>
              </section>
            ` : ''}
            <section class="${escapeHtml(releaseConfirmationCalloutClass(confirmationGuidance.status))}" style="margin-top:14px;">
              <h3 class="callout-title">${escapeHtml(confirmationGuidance.title)}</h3>
              <p>${escapeHtml(confirmationGuidance.description)}</p>
              ${confirmationGuidance.href
                ? `<div class="inline-actions" style="margin-top:10px;"><a class="button-link secondary-button" data-link href="${escapeHtml(confirmationGuidance.href)}">${escapeHtml(confirmationGuidance.actionLabel || '前往处理')}</a></div>`
                : ''}
            </section>
            <div class="grid cards compact" style="margin-top:14px;">
              ${metricCard('确认状态', displayLabel(confirmation.status || 'warning') || '需人工确认')}
              ${metricCard('异常项', (confirmation.issueCount || 0))}
              ${metricCard('验证失败', ((confirmation.summary || {}).validationFailedCount || 0))}
              ${metricCard(riskSectionTitle, ((confirmation.summary || {}).checkBlockerCount || 0))}
            </div>
          </section>
        </div>
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">当前动作</h2>
                <div class="section-desc">动作区按当前版本状态、审批状态和升级前置条件控制，并明确写清当前动作的目的与下一步。</div>
              </div>
              ${renderPageHelpLink('page-release-canary', '查看灰度说明')}
            </div>
            <div class="summary-list" style="margin-bottom:14px;">
              <div class="summary-row"><span class="subtle">版本状态</span><span>${renderBadge(releaseState.status)}</span></div>
              <div class="summary-row"><span class="subtle">审批状态</span><span>${renderBadge(item.approval.status)}</span></div>
              <div class="summary-row"><span class="subtle">流量状态</span><span>${renderToneBadge(trafficDescriptor.label, trafficDescriptor.tone)}</span></div>
              <div class="summary-row"><span class="subtle">当前下发状态</span><span>${isCurrentDesiredRelease ? '<span class="badge success">已下发</span>' : '<span class="badge warning">未下发</span>'}</span></div>
            </div>
              <div class="action-zone">
                <div class="action-zone-title">常规推进动作</div>
                <div class="action-zone-desc">${escapeHtml(isPublishedRelease(item) ? '当前版本已正式发布，常规动作以查看风险、回处理和确认节点收敛为主。' : '这组动作用于把候选快照继续推进到审核、下发、灰度或正式发布。')}</div>
                <div class="inline-actions">
                ${canSubmitReleaseReview
                  ? renderFeatureAction('releases.submitReview', `<form data-action="submit-release-review" action="/api/console/releases/${encodeURIComponent(releaseId)}/submit-review"><button type="submit">提交发布审核</button></form>`, '提交发布审核', '当前身份不能提交发布审核。')
                  : renderDisabledAction(['built', 'canary'].includes(releaseState.status) ? '当前无需提审' : '不可提审', ['built', 'canary'].includes(releaseState.status) ? '当前版本已经在审核中或审批已满足，无需再次提交发布审核。' : '当前版本状态不允许继续提交发布审核。')}
                ${canRolloutRelease
                  ? (isCurrentDesiredRelease
                    ? renderDisabledAction('已是目标版本', '当前版本已经是控制面下发的目标版本。')
                    : renderFeatureAction('releases.rollout', `
                      <form data-action="rollout-release" action="/api/console/runtime-control/desired-version">
                        <input type="hidden" name="releaseId" value="${escapeHtml(releaseId)}">
                        <button type="submit">下发为目标版本</button>
                      </form>
                    `, '下发为目标版本', '当前身份不能执行目标版本下发。'))
                  : renderDisabledAction('不可下发', '当前版本状态不允许作为运行节点目标版本下发。')}
                ${canCanaryRelease
                  ? renderFeatureAction('releases.canary', `
                    <form data-action="canary-release" action="/api/console/gray-policies">
                      <input type="hidden" name="releaseId" value="${escapeHtml(releaseId)}">
                      <input type="hidden" name="scopeType" value="traffic_key_hash">
                      <input type="hidden" name="percentage" value="5">
                      <button type="submit" class="secondary-button">设为灰度（5%）</button>
                    </form>
                  `, '设为灰度版本', '当前身份不能设置灰度版本。')
                  : renderDisabledAction('不可灰度', releaseTraffic.isCurrentCanary === true ? '当前版本已经是灰度版本。' : (String(item.approval.status || '').trim() !== 'approved' ? '当前版本还未满足发布审核要求，请先完成发布审核。' : '当前版本状态不允许设为灰度。'))}
                <a class="button-link secondary-button" data-link href="/console/releases">返回版本列表</a>
              </div>
            </div>
          </section>
          ${reviewTask ? `
            <section class="panel">
              <div class="section-head">
                <div>
                  <h2 class="section-title">发布审核任务</h2>
                  <div class="section-desc">发布审核已归口到版本发布内部流程，不再要求先回内容审核主列表处理。</div>
                </div>
                ${renderPageHelpLink('page-release-review', '查看发布审核说明')}
              </div>
              <div class="summary-list">
                <div class="summary-row"><span class="subtle">任务状态</span><span>${renderBadge(reviewTask.status)}</span></div>
                <div class="summary-row"><span class="subtle">任务 ID</span><span class="mono">${escapeHtml(reviewTask.taskId)}</span></div>
                <div class="summary-row"><span class="subtle">提交人</span><span>${escapeHtml(reviewTask.submittedBy || '未记录')}</span></div>
                <div class="summary-row"><span class="subtle">审核人</span><span>${escapeHtml(reviewTask.reviewedBy || '尚未审核')}</span></div>
              </div>
              ${approvalGuard.blocked ? `
                <section class="callout danger" style="margin-top:14px;">
                  <h3 class="callout-title">${escapeHtml(approvalGuard.calloutTitle)}</h3>
                  <p>${escapeHtml(approvalGuard.calloutMessage)}</p>
                </section>
              ` : approvalGuard.hintMessage ? `
                <section class="callout warning" style="margin-top:14px;">
                  <h3 class="callout-title">审核提醒</h3>
                  <p>${escapeHtml(approvalGuard.hintMessage)}</p>
                </section>
              ` : ''}
              ${reviewTask.status === 'pending' ? `
                <div class="action-zone" style="margin-top:14px;">
                  <div class="action-zone-title">发布审核决策</div>
                  <div class="action-zone-desc">通过后，请继续在当前版本详情中决定是否灰度或正式发布。</div>
                  <div class="inline-actions">
                    ${approvalGuard.blocked
                      ? renderDisabledAction('审核通过', approvalGuard.buttonMessage)
                      : renderFeatureAction('reviews.approve', `<form data-action="approve-review" action="/api/console/dictionary/reviews/${encodeURIComponent(reviewTask.taskId)}\/approve"><button type="submit">审核通过</button></form>`, '审核通过', '当前身份不能执行审核通过。')}
                    ${renderFeatureAction('reviews.reject', `<form data-action="reject-review" action="/api/console/dictionary/reviews/${encodeURIComponent(reviewTask.taskId)}\/reject"><button type="submit" class="danger-button">驳回任务</button></form>`, '驳回任务', '当前身份不能执行审核驳回。')}
                  </div>
                </div>
              ` : `<div class="inline-actions" style="margin-top:14px;"><a class="button-link secondary-button" data-link href="/console/dictionary/reviews/${encodeURIComponent(reviewTask.taskId)}">查看审核详情</a></div>`}
            </section>
          ` : ''}
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">审批与下游状态</h2>
                <div class="section-desc">把审批、${escapeHtml(riskSectionTitle)}、验证和节点收敛的关键数字贴近顶部阶段区，不必先翻到下方大块内容。</div>
              </div>
            </div>
            <div class="summary-list">
              <div class="summary-row"><span class="subtle">审批要求</span><span>${escapeHtml(String(requiredApprovals))} 位不同审核人</span></div>
              <div class="summary-row"><span class="subtle">已通过审核人</span><span>${escapeHtml(approvedReviewers.join('、') || '暂无')}</span></div>
              <div class="summary-row"><span class="subtle">${escapeHtml(riskSectionTitle)}数量</span><span>${escapeHtml(String((confirmation.summary || {}).checkBlockerCount || 0))}</span></div>
              <div class="summary-row"><span class="subtle">验证失败</span><span>${escapeHtml(String((confirmation.summary || {}).validationFailedCount || 0))}</span></div>
              <div class="summary-row"><span class="subtle">已对齐节点</span><span>${escapeHtml(String((rollout.summary || {}).alignedNodes || 0))}</span></div>
              <div class="summary-row"><span class="subtle">待收敛 / 失败</span><span>${escapeHtml(String((rollout.summary || {}).pendingNodes || 0))} / ${escapeHtml(String((rollout.summary || {}).failedNodes || 0))}</span></div>
              <div class="summary-row"><span class="subtle">验证报告数</span><span>${escapeHtml(String((evidence.runtimeControlReports || []).length))}</span></div>
            </div>
          </section>
          <section class="panel">
            <div class="action-zone action-zone-danger">
              <div class="action-zone-title">高风险操作</div>
              <div class="action-zone-desc">风险动作单独隔离，不与阶段摘要和参考信息混在一起。</div>
              <div class="inline-actions" style="margin-bottom:12px;">
                ${renderPageHelpLink('page-release-rollback', '查看回滚说明', { className: 'button-link secondary-button' })}
              </div>
              <div class="inline-actions">
                ${canPublishRelease
                  ? renderFeatureAction('releases.publish', `<form data-action="publish-release" action="/api/console/releases/${encodeURIComponent(releaseId)}/publish"><button type="submit" class="danger-button">正式发布</button></form>`, '正式发布', '当前身份不能正式发布版本。')
                  : renderDisabledAction('不可发布', String(item.approval.status || '').trim() !== 'approved' ? '当前版本还未满足发布审核要求，请先完成发布审核。' : '当前版本状态不允许继续执行正式发布。')}
                ${renderFeatureAction('releases.rollback', `<form data-action="rollback-release" action="/api/console/releases/${encodeURIComponent(releaseId)}/rollback"><button type="submit" class="danger-button">回滚到此版本</button></form>`, '回滚到此版本', '当前身份不能执行版本回滚。')}
              </div>
            </div>
          </section>
        </div>
      </div>
      <div class="page-layout equal">
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">版本状态</h2>
              <div class="section-desc">只表达 release 自身状态，不再混入审批或流量语义。</div>
            </div>
          </div>
          <div class="summary-list">
            <div class="summary-row"><span class="subtle">当前状态</span><span>${renderBadge(releaseState.status)}</span></div>
            <div class="summary-row"><span class="subtle">当前身份</span><span>${renderReleaseIdentityFlags({ releaseState }) || '普通版本'}</span></div>
            <div class="summary-row"><span class="subtle">状态说明</span><span>${escapeHtml(releaseVersionDescriptor({ ...item.release, releaseState }).detail)}</span></div>
            <div class="summary-row"><span class="subtle">发布时间</span><span>${escapeHtml(item.release.publishedAt ? formatDateTime(item.release.publishedAt) : '尚未正式发布')}</span></div>
          </div>
        </section>
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">发布审批</h2>
              <div class="section-desc">审批状态独立展示，不再借用版本状态表达“是否可发布”。</div>
            </div>
          </div>
          <div class="summary-list">
            <div class="summary-row"><span class="subtle">当前审批状态</span><span>${renderBadge(item.approval.status)}</span></div>
            <div class="summary-row"><span class="subtle">审批进度</span><span>${escapeHtml(String(item.approval.approvedCount || 0))} / ${escapeHtml(String(item.approval.requiredApprovals || 1))}</span></div>
            <div class="summary-row"><span class="subtle">已通过审核人</span><span>${escapeHtml(approvedReviewers.join('、') || '暂无')}</span></div>
            <div class="summary-row"><span class="subtle">最新任务</span><span>${item.approval.taskId ? `<span class="mono">${escapeHtml(item.approval.taskId)}</span>` : '未提交发布审核'}</span></div>
          </div>
        </section>
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">流量状态</h2>
              <div class="section-desc">流量状态单独表达当前是否存在启用中的灰度策略，以及它是否指向本版本。</div>
            </div>
          </div>
          <div class="summary-list">
            <div class="summary-row"><span class="subtle">当前状态</span><span>${renderToneBadge(trafficDescriptor.label, trafficDescriptor.tone)}</span></div>
            <div class="summary-row"><span class="subtle">状态说明</span><span>${escapeHtml(trafficDescriptor.detail)}</span></div>
            <div class="summary-row"><span class="subtle">灰度比例</span><span>${releaseTraffic.grayEnabled ? `${escapeHtml(String(releaseTraffic.percentage || 0))}%` : '未启用'}</span></div>
            <div class="summary-row"><span class="subtle">scopeType</span><span>${escapeHtml(releaseTraffic.scopeType || '未记录')}</span></div>
          </div>
        </section>
        <section class="panel">
          <div class="section-head">
            <div>
                <h2 class="section-title">发布确认</h2>
              <div class="section-desc">${escapeHtml(isPublishedRelease(item) ? '把发布后风险、验证、节点收敛和确认状态收敛在一个可检查区块里。' : '把升级前置条件、验证、节点收敛和确认状态收敛在一个可检查区块里。')}</div>
            </div>
          </div>
          <div class="summary-list">
            <div class="summary-row"><span class="subtle">当前确认状态</span><span>${renderBadge(confirmation.status || 'warning')}</span></div>
            <div class="summary-row"><span class="subtle">${escapeHtml(riskSectionTitle)}</span><span>${(confirmation.summary || {}).checkBlocked ? '<span class="badge danger">存在阻断</span>' : '<span class="badge success">已通过</span>'}</span></div>
            <div class="summary-row"><span class="subtle">阻断项数量</span><span>${escapeHtml(String((confirmation.summary || {}).checkBlockerCount || 0))}</span></div>
            <div class="summary-row"><span class="subtle">验证覆盖</span><span>${escapeHtml(String((confirmation.summary || {}).validationCaseCount || 0))} 条</span></div>
            <div class="summary-row"><span class="subtle">跳过冒烟验证</span><span>${escapeHtml(String((confirmation.summary || {}).validationSkippedCount || 0))}</span></div>
            <div class="summary-row"><span class="subtle">节点总数</span><span>${escapeHtml(String((confirmation.summary || {}).totalNodes || 0))}</span></div>
            <div class="summary-row"><span class="subtle">已对齐节点</span><span>${escapeHtml(String((confirmation.summary || {}).alignedNodes || 0))}</span></div>
            <div class="summary-row"><span class="subtle">待收敛节点</span><span>${escapeHtml(String((confirmation.summary || {}).pendingNodes || 0))}</span></div>
            <div class="summary-row"><span class="subtle">应用失败节点</span><span>${escapeHtml(String((confirmation.summary || {}).failedNodes || 0))}</span></div>
          </div>
          ${(confirmation.issues || []).length ? renderDenseTable([
            { label: '异常项', render: (entry) => escapeHtml(entry.title) },
            { label: '级别', render: (entry) => renderBadge(entry.severity) },
            { label: '说明', render: (entry) => escapeHtml(entry.detail || '') },
            { label: '处理入口', render: (entry) => entry.href ? `<a class="primary-link" data-link href="${escapeHtml(entry.href)}">前往处理</a>` : '' },
          ], confirmation.issues, '当前没有异常项。', { scrollSizeClass: 'panel-scroll-small', collapseThreshold: 6, collapsedSummary: '异常项较多，默认收起明细' }) : '<div class="badge success">当前没有额外异常项</div>'}
        </section>
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">下发与节点收敛</h2>
              <div class="section-desc">查看当前版本是否已被下发，以及节点收敛进度。</div>
            </div>
          </div>
          <div class="grid cards compact">
            ${metricCard('节点总数', (rollout.summary || {}).totalNodes || 0)}
            ${metricCard('已对齐节点', (rollout.summary || {}).alignedNodes || 0)}
            ${metricCard('待收敛节点', (rollout.summary || {}).pendingNodes || 0)}
            ${metricCard('失败节点', (rollout.summary || {}).failedNodes || 0)}
          </div>
          <section class="${escapeHtml(releaseConfirmationCalloutClass((rollout.guidance || {}).status || 'warning'))}" style="margin-top:14px;">
            <h3 class="callout-title">${escapeHtml(((rollout.guidance || {}).title) || '当前收敛状态')}</h3>
            <p>${escapeHtml(((rollout.guidance || {}).description) || '请结合节点收敛结果判断是否继续后续动作。')}</p>
            ${(rollout.guidance || {}).href
              ? `<div class="inline-actions" style="margin-top:10px;"><a class="button-link secondary-button" data-link href="${escapeHtml((rollout.guidance || {}).href)}">${escapeHtml((rollout.guidance || {}).actionLabel || '前往处理')}</a></div>`
              : ''}
          </section>
          <div class="summary-list" style="margin-top:14px;">
            <div class="summary-row"><span class="subtle">当前查看版本</span><span class="mono">${escapeHtml((((rollout || {}).selectedRelease || {}).version) || item.release.version)}</span></div>
            <div class="summary-row"><span class="subtle">目标版本</span><span class="mono">${escapeHtml((((rollout || {}).control || {}).desiredVersion) || '未下发')}</span></div>
            <div class="summary-row"><span class="subtle">配置版本</span><span>${escapeHtml(String((((rollout || {}).control || {}).configVersion) || 0))}</span></div>
            <div class="summary-row"><span class="subtle">下发时间</span><span>${escapeHtml(formatDateTime((((rollout || {}).control || {}).issuedAt) || ''))}</span></div>
            <div class="summary-row"><span class="subtle">目标已下发节点</span><span>${escapeHtml(String((rollout.summary || {}).desiredNodes || 0))}</span></div>
            <div class="summary-row"><span class="subtle">未切到目标版本</span><span>${escapeHtml(String((rollout.summary || {}).untouchedNodes || 0))}</span></div>
            <div class="summary-row"><span class="subtle">离线节点</span><span>${escapeHtml(String((rollout.summary || {}).offlineNodes || 0))}</span></div>
          </div>
          <div class="inline-actions" style="margin-top:14px;">
            <a class="button-link secondary-button" data-link href="/console/runtime-nodes">查看运行节点</a>
          </div>
          ${(rollout.items || []).length ? renderDenseTable([
            { label: '节点', render: (entry) => `<a class="primary-link" data-link href="/console/runtime-nodes/${encodeURIComponent(entry.nodeId)}">${escapeHtml(entry.nodeName || entry.nodeId)}</a>` },
            { label: '环境', render: (entry) => escapeHtml(entry.env || '未标注') },
            { label: '节点状态', render: (entry) => renderBadge(entry.status) },
            { label: '当前版本', render: (entry) => `<span class="mono">${escapeHtml(entry.currentVersion || '未安装')}</span>` },
            { label: '目标版本', render: (entry) => `<span class="mono">${escapeHtml(entry.desiredVersion || '未下发')}</span>` },
              { label: '最近应用', render: (entry) => entry.lastApplyStatus ? renderBadge(entry.lastApplyStatus) : '未记录' },
            ], rollout.items, '当前还没有运行节点。', { scrollSizeClass: 'panel-scroll-medium', collapseThreshold: 8, collapsedSummary: '节点收敛明细较多，默认收起列表' }) : renderEmptyState('当前还没有运行节点。')}
        </section>
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">验证证据</h2>
              <div class="section-desc">展示当前版本已匹配到的本地运行控制验证报告。</div>
            </div>
          </div>
          ${(evidence.runtimeControlReports || []).length ? renderDenseTable([
            { label: '报告 ID', render: (entry) => `<span class="mono">${escapeHtml(entry.reportId)}</span>` },
            { label: '模式', render: (entry) => `<span class="mono">${escapeHtml(entry.mode || '未记录')}</span>` },
            { label: '结果', render: (entry) => entry.ok ? '<span class="badge success">通过</span>' : '<span class="badge danger">失败</span>' },
            { label: '节点 / 版本', render: (entry) => `<div class="mono">${escapeHtml(entry.nodeId || '未记录')}</div><div class="subtle">${escapeHtml(entry.currentVersion || entry.releaseVersion || '未记录')}</div>` },
            { label: '时间', render: (entry) => escapeHtml(formatDateTime(entry.startedAt || entry.endedAt)) },
            { label: '查看报告', render: (entry) => `<a class="button-link secondary-button" href="/api/console/runtime-control/evidence/${encodeURIComponent(entry.reportId)}" target="_blank" rel="noreferrer">查看报告详情</a>` },
          ], evidence.runtimeControlReports, '当前没有匹配到运行控制验证报告。', { scrollSizeClass: 'panel-scroll-medium', collapseThreshold: 8, collapsedSummary: '验证报告较多，默认收起明细' }) : renderEmptyState('当前没有匹配到运行控制验证报告。')}
        </section>
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">${escapeHtml(riskSectionTitle)}</h2>
              <div class="section-desc">${escapeHtml(riskSectionDescription)}</div>
            </div>
            ${renderPageHelpLink('page-release-risk', '查看风险说明')}
          </div>
          ${(riskSummary && riskSummary.blockers && riskSummary.blockers.length)
            ? renderDenseTable([
              { label: '阻断类型', render: (entry) => escapeHtml(entry.title || displayLabel(entry.code) || entry.code) },
              { label: '数量', render: (entry) => escapeHtml(String(entry.count || 0)) },
              {
                label: '明细',
                render: (entry) => renderReleaseGateBlockerItems(entry.items || []),
              },
            ], riskSummary.blockers, '当前没有阻断项。', { scrollSizeClass: 'panel-scroll-medium', collapseThreshold: 6, collapsedSummary: `${riskSectionTitle}较多，默认收起明细` })
            : `<div class="badge success">${escapeHtml(riskSectionTitle)}已通过</div>`}
        </section>
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">回滚记录</h2>
              <div class="section-desc">回滚是动作，不是新的 release 状态。这里单独展示该版本的发布 / 回滚历史。</div>
            </div>
          </div>
          ${(item.rollbackHistory || []).length
            ? renderDenseTable([
              { label: '动作', render: (entry) => renderBadge(entry.operation === 'release.rollback' ? 'rollback' : 'published') },
              { label: '说明', render: (entry) => escapeHtml(entry.operationLabel || '') },
              { label: '操作人', render: (entry) => escapeHtml(entry.operator || '未记录') },
              { label: '时间', render: (entry) => escapeHtml(formatDateTime(entry.createdAt)) },
            ], item.rollbackHistory, '当前版本还没有发布或回滚历史。', { scrollSizeClass: 'panel-scroll-small', collapseThreshold: 6, collapsedSummary: '回滚记录较多，默认收起明细' })
            : '<div class="subtle">当前版本还没有发布或回滚历史。</div>'}
        </section>
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">验证结果</h2>
              <div class="section-desc">用于确认发布前的验证样本是否通过。</div>
            </div>
          </div>
          ${(item.validation && item.validation.cases && item.validation.cases.length)
            ? renderDenseTable([
              { label: '类型', render: (entry) => escapeHtml(entry.caseTypeLabel || displayLabel(entry.caseType) || entry.caseType) },
              { label: '标识', render: (entry) => renderReleaseValidationTarget(entry) },
              { label: '结果', render: (entry) => entry.passed ? '<span class="badge success">通过</span>' : '<span class="badge danger">失败</span>' },
              { label: '说明', render: (entry) => renderReleaseValidationResultDetail(entry) },
            ], item.validation.cases, '当前没有验证样本。', { scrollSizeClass: 'panel-scroll-medium', collapseThreshold: 8, collapsedSummary: '验证结果较多，默认收起明细' })
            : '<div class="subtle">当前没有验证样本。</div>'}
        </section>
        <section class="panel" style="grid-column: 1 / -1;">
          <div class="section-head">
            <div>
              <h2 class="section-title">变更词条</h2>
              <div class="section-desc">此版本所包含的词条列表。</div>
            </div>
          </div>
          ${renderDenseTable([
            { label: '标准词', render: (entry) => `<a class="primary-link" data-link href="/console/dictionary/terms/${encodeURIComponent(entry.termId)}">${escapeHtml(entry.canonicalText)}</a>` },
            { label: '业务属性', render: (entry) => escapeHtml(businessPropertyLabel(entry.categoryCode, entry.categoryCode)) },
            { label: '词条状态', render: (entry) => renderBadge(entry.status) },
          ], item.termChanges || [], '当前没有变更词条。', { scrollSizeClass: 'panel-scroll-large', collapseThreshold: 10, collapsedSummary: '变更词条较多，默认收起明细' })}
        </section>
      </div>
    </div>
  `;
}

/**
 * 功能：渲染验证样本首页。
 * 输入：无。
 * 输出：无显式返回；直接写入页面。
 */
async function renderValidationCases() {
  pageTitle.textContent = '验证样本';
  const [validationSourceTypesMeta, validationManualSourceTypesMeta, validationImportSourceTypesMeta] = await Promise.all([
    refreshSourceTypeMeta({ scope: 'validation' }),
    refreshSourceTypeMeta({ scope: 'validation', entryMode: 'manual' }),
    refreshSourceTypeMeta({ scope: 'validation', entryMode: 'import' }),
  ]);
  const view = await fetchValidationCaseListViewData({
    page: currentRouteContext().query.get('page') || 1,
    query: currentRouteContext().query.get('query') || '',
    sourceType: currentRouteContext().query.get('sourceType') || '',
    enabled: currentRouteContext().query.get('enabled') || '',
  });
  const { query, sourceType, enabled, exportUrl, summary } = view;
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '验证与回流' }, { label: '验证样本' }])}
      ${renderMetricCardGrid([
        { label: '样本总量', value: summary.totalCount || 0 },
        { label: '启用样本', value: summary.enabledCount || 0, hideWhenZero: true },
        { label: '停用样本', value: summary.disabledCount || 0, hideWhenZero: true },
        { label: '外部回流样本', value: summary.feedbackCount || 0, hideWhenZero: true },
      ])}
      <div class="page-layout with-aside layout-priority-main">
        <div class="page-main">
      <section class="panel">
        <div class="section-head">
          <div>
            <h2 class="section-title">验证样本列表</h2>
            <div class="section-desc">主工作区先固定成筛选、批量动作和结果列表三段，先看列表，再进入创建或导入动作。</div>
          </div>
          ${renderPageHelpLink('page-master-validation-cases', '查看样本帮助')}
        </div>
            <div class="panel-stack">
              <section class="surface-block surface-block-soft">
                <div class="surface-head">
                  <div>
                    <h3 class="surface-title">筛选条件</h3>
                    <div class="surface-desc">先缩小检索范围，再执行批量动作或进入单条详情。</div>
                  </div>
                </div>
                <form data-action="filter-validation-cases" class="toolbar-form toolbar-form-inline">
                  ${inputField({ label: '关键字检索', name: 'query', value: query, placeholder: '支持样本 ID、说明、正文检索' })}
                  ${selectField({ label: '来源类型', name: 'sourceType', value: sourceType, options: sourceTypeOptionsFromItems(validationSourceTypesMeta.items, { includeAll: true }) })}
                  ${selectField({ label: '启用状态', name: 'enabled', value: enabled, options: ENABLED_FILTER_OPTIONS })}
                  <div class="form-actions">
                    <button type="submit">应用筛选</button>
                    <button type="button" class="secondary-button" data-action="clear-validation-case-filters">清空筛选</button>
                  </div>
                </form>
              </section>
              <section class="surface-block">
                <div class="surface-head">
                  <div>
                    <h3 class="surface-title">批量动作与导出</h3>
                    <div class="surface-desc">批量停用与导出保持独立，不和行数据或新建入口混在一起。</div>
                  </div>
                </div>
                <form data-action="bulk-validation-case-action" class="bulk-action-bar">
                  <div class="bulk-action-note">可对当前页勾选样本执行，也可直接对当前筛选结果整体停用；导出会按当前筛选条件输出。</div>
                  ${
                    hasPageFeature('validation.bulk.disable')
                      ? `
                        ${selectField({ label: '批量操作', name: 'bulkAction', value: 'disable', options: VALIDATION_BULK_ACTION_OPTIONS })}
                        ${selectField({ label: '执行范围', name: 'bulkScope', value: 'current_page', options: BULK_SCOPE_OPTIONS })}
                        <div class="form-actions">
                          <button type="submit">执行批量操作</button>
                          <a class="button-link secondary-button" data-validation-export-link href="${escapeHtml(exportUrl)}">导出当前筛选</a>
                        </div>
                      `
                      : `
                        <div class="form-actions">
                          ${renderDisabledAction('执行批量操作', '当前身份没有验证样本批量操作页面功能。')}
                          <a class="button-link secondary-button" data-validation-export-link href="${escapeHtml(exportUrl)}">导出当前筛选</a>
                        </div>
                      `
                  }
                </form>
              </section>
              ${renderValidationCaseResultsSurface(view)}
            </div>
          </section>
        </div>
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">新增验证样本</h2>
                <div class="section-desc">新增后可进入详情页查看关联词条。</div>
              </div>
            </div>
            ${hasPageFeature('validation.write') ? `<form data-action="create-validation-case" class="form-grid compact">
              ${inputField({ label: '样本 ID', name: 'caseId', placeholder: '可为空，系统会自动生成。' })}
              ${inputField({ label: '样本说明', name: 'description', placeholder: '例如：工伤认定误识别样本。' })}
              ${textareaField({ label: '原始文本', name: 'text', placeholder: '请输入完整业务文本。' })}
              ${inputField({ label: '期望标准词', name: 'expectedCanonicals', placeholder: '多个值请用 | 分隔', help: '示例：工伤认定|工伤保险' })}
              ${selectField({ label: '来源类型', name: 'sourceType', value: 'manual', options: sourceTypeOptionsFromItems(validationManualSourceTypesMeta.items, { includeAll: false }) })}
              ${textareaField({ label: '备注', name: 'notes', placeholder: '补充样本来源或定位说明。' })}
              <div class="form-actions">
                <button type="submit">创建样本</button>
              </div>
            </form>` : renderEmptyState('当前身份没有“维护验证样本”页面功能。')}
          </section>
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">文件批量导入样本</h2>
                <div class="section-desc">优先走模板文件上传链路：先下载模板，再上传文件生成预览，确认后才真正入库。</div>
              </div>
            </div>
            <div class="inline-actions" style="margin-bottom:12px;">
              <a class="button-link secondary-button" data-link href="/console/import/templates/${encodeURIComponent(VALIDATION_IMPORT_TEMPLATE_CODE)}">查看字段说明</a>
              <a class="button-link" href="/api/console/import/templates/${encodeURIComponent(VALIDATION_IMPORT_TEMPLATE_CODE)}/download" download>下载模板</a>
              <a class="button-link secondary-button" href="/api/console/import/templates/${encodeURIComponent(VALIDATION_IMPORT_TEMPLATE_CODE)}/download?kind=example" download>下载示例</a>
            </div>
            ${hasPageFeature('validation.import') ? `<form data-action="create-import-job" class="form-grid compact">
              <input type="hidden" name="templateCode" value="${escapeHtml(VALIDATION_IMPORT_TEMPLATE_CODE)}">
              ${selectField({ label: '来源类型', name: 'sourceType', value: 'validation_import', options: sourceTypeOptionsFromItems(validationImportSourceTypesMeta.items, { includeAll: false }) })}
              ${textareaField({ label: '批次备注', name: 'comment', value: '', placeholder: '例如：2026-04-01 首轮 QA 样本文件导入。' })}
              ${fileField({ label: '选择样本文件', name: 'file', help: '仅支持按“验证样本批量导入模板（validation_cases_csv_v1）”准备的 CSV 文件。' })}
              <div class="form-actions">
                <button type="submit">上传并生成预览</button>
                <a class="button-link secondary-button" data-link href="/console/dictionary/import-jobs">前往词典导入</a>
              </div>
            </form>` : renderEmptyState('当前身份没有“导入验证样本”页面功能。')}
          </section>
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">JSON 调试导入</h2>
                <div class="section-desc">保留给开发联调或小批量快速验证使用，不建议作为正式业务导入入口。</div>
              </div>
            </div>
            ${hasPageFeature('validation.import') ? `<form data-action="import-validation-cases" class="form-grid compact">
              ${selectField({ label: '导入模式', name: 'mode', value: 'upsert', options: VALIDATION_IMPORT_MODE_OPTIONS })}
              ${selectField({ label: '默认来源类型', name: 'sourceType', value: 'validation_import', options: sourceTypeOptionsFromItems(validationImportSourceTypesMeta.items, { includeAll: false }) })}
              ${textareaField({
                label: '样本 JSON 数组',
                name: 'itemsJson',
                value: JSON.stringify([
                  {
                    caseId: 'batch_case_001',
                    description: '工伤认定业务样本',
                    text: '我想了解工商认定的办理流程。',
                    expectedCanonicals: ['工伤认定'],
                    sourceType: 'validation_import',
                    notes: '批量导入示例',
                  },
                ], null, 2),
                help: '每个元素至少包含 text 和 expectedCanonicals。expectedCanonicals 必须是数组。',
                className: 'full',
              })}
              <div class="form-actions">
                <button type="submit" class="secondary-button">执行 JSON 导入</button>
              </div>
            </form>` : renderEmptyState('当前身份没有“导入验证样本”页面功能。')}
          </section>
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">导入建议</h2>
                <div class="section-desc">帮助信息下沉到次级区域，不与创建或导入动作抢同一优先级。</div>
              </div>
            </div>
            <div class="callout">
              <h3 class="callout-title">样本导入建议</h3>
              <ol>
                <li>正式导入优先使用模板文件上传，先生成预览，再确认导入。</li>
                <li>单次先导入小批量样本，确认字段与统计无误后再扩大范围。</li>
                <li>导入完成后，建议按来源类型或关键字筛查，确认样本是否已正确落库。</li>
              </ol>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

/**
 * 功能：渲染验证样本详情页。
 * 输入：`caseId` 样本 ID。
 * 输出：无显式返回；直接写入页面。
 */
async function renderValidationCaseDetail(caseId) {
  pageTitle.textContent = '样本详情';
  const data = await fetchJson(`/api/console/validation/cases/${encodeURIComponent(caseId)}`);
  const item = data.item;
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '验证与回流' }, { label: '验证样本', href: '/console/validation/cases' }, { label: item.caseId }])}
      <div class="page-layout with-aside layout-priority-main">
        <div class="page-main">
          <section class="panel page-hero">
            <div class="section-head">
              <div class="page-hero-copy">
                <div class="page-hero-kicker">验证与回流</div>
                <h2 class="page-hero-title">样本状态与验证目标</h2>
                <div class="page-hero-desc">先看当前样本是否启用、样本文本是什么、期望标准词有哪些，再继续查看关联词条。</div>
              </div>
            </div>
            <div class="inline-badge-row" style="margin-bottom:14px;">
              ${item.enabled ? '<span class="badge success">启用中</span>' : '<span class="badge danger">已停用</span>'}
              <span class="badge">${escapeHtml(sourceTypeLabel(item.sourceType, item.sourceType || '未记录'))}</span>
              <span class="badge">${escapeHtml(String((item.expectedCanonicals || []).length))} 个期望标准词</span>
            </div>
            <div class="summary-list">
              <div class="summary-row"><span class="subtle">样本 ID</span><span>${escapeHtml(item.caseId)}</span></div>
              <div class="summary-row"><span class="subtle">样本说明</span><span>${escapeHtml(item.description || '未填写')}</span></div>
              <div class="summary-row"><span class="subtle">来源类型</span><span>${escapeHtml(sourceTypeLabel(item.sourceType, item.sourceType || '未记录'))}</span></div>
              <div class="summary-row"><span class="subtle">更新时间</span><span>${escapeHtml(formatDateTime(item.updatedAt))}</span></div>
            </div>
            <section class="surface-block surface-block-soft" style="margin-top:14px;">
              <div class="surface-head">
                <div>
                  <h3 class="surface-title">样本文本</h3>
                  <div class="surface-desc">在后续版本校验中，系统会直接对这段文本执行回放检查。</div>
                </div>
              </div>
              <div class="code-block">${escapeHtml(item.text)}</div>
            </section>
            <section class="surface-block" style="margin-top:14px;">
              <div class="surface-head">
                <div>
                  <h3 class="surface-title">期望标准词</h3>
                  <div class="surface-desc">先确认样本应该命中的标准词，再去看关联词条是否完整。</div>
                </div>
              </div>
              <div class="review-summary-strip">
                ${(item.expectedCanonicals || []).map((entry) => `<div class="summary-chip">${escapeHtml(entry)}</div>`).join('') || '<div class="subtle">暂无配置。</div>'}
              </div>
            </section>
          </section>
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">关联词条</h2>
                <div class="section-desc">关联词条保留在状态区之后，作为次级参考信息查看。</div>
              </div>
            </div>
            ${renderDenseTable([
              { label: '标准词', render: (entry) => `<a class="primary-link" data-link href="/console/dictionary/terms/${encodeURIComponent(entry.termId)}">${escapeHtml(entry.canonicalText)}</a>` },
              { label: '业务属性', render: (entry) => escapeHtml(businessPropertyLabel(entry.categoryCode, entry.categoryCode)) },
              { label: '状态', render: (entry) => renderBadge(entry.status) },
            ], item.relatedTerms || [], '当前没有关联词条。', { scrollSizeClass: 'panel-scroll-medium', collapseThreshold: 8, collapsedSummary: '关联词条较多，默认收起明细' })}
          </section>
        </div>
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">当前动作</h2>
                <div class="section-desc">启用状态和动作放在同一个决策区，避免先去看关联信息再回头找操作。</div>
              </div>
            </div>
            <div class="summary-list" style="margin-bottom:14px;">
              <div class="summary-row"><span class="subtle">启用状态</span><span>${item.enabled ? '<span class="badge success">启用</span>' : '<span class="badge danger">已停用</span>'}</span></div>
              <div class="summary-row"><span class="subtle">关联词条数</span><span>${escapeHtml(String((item.relatedTerms || []).length))}</span></div>
              <div class="summary-row"><span class="subtle">期望标准词数</span><span>${escapeHtml(String((item.expectedCanonicals || []).length))}</span></div>
            </div>
            <div class="action-zone">
              <div class="action-zone-title">主操作</div>
              <div class="action-zone-desc">状态操作紧贴状态显示，只保留当前最直接的动作。</div>
              <div class="inline-actions">
                ${item.enabled
                  ? renderFeatureAction('validation.disable', `<form data-action="disable-validation-case" action="/api/console/validation/cases/${encodeURIComponent(caseId)}/disable"><button type="submit" class="danger-button">停用样本</button></form>`, '停用样本', '当前身份不能停用验证样本。')
                  : renderDisabledAction('已停用', '当前样本已经停用。')}
                <a class="button-link secondary-button" data-link href="/console/validation/cases">返回样本列表</a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

/**
 * 功能：渲染控制台帮助首页。
 * 输入：无。
 * 输出：无显式返回；直接写入页面。
 */
async function renderHelpIndex() {
  const route = currentRouteContext();
  const requestedGroup = String(route.query.get('pageGroup') || '').trim();
  const data = await fetchJson('/api/console/help');
  const items = data.items || [];
  const helpGroups = [
    { key: 'pages', label: '页面手册', normalize: (item) => String(item.kicker || '').trim() === '页面手册' },
    { key: 'flows', label: '流程手册', normalize: (item) => ['流程手册', '试用 / 反馈'].includes(String(item.kicker || '').trim()) },
    { key: 'ops', label: '部署手册', normalize: (item) => ['部署手册', '部署 / 联调'].includes(String(item.kicker || '').trim()) },
    { key: 'apis', label: '接口手册', normalize: (item) => String(item.kicker || '').trim() === '接口手册' },
    { key: 'troubleshooting', label: '故障排查', normalize: (item) => String(item.kicker || '').trim() === '故障排查' },
  ];
  const currentGroup = helpGroups.find((entry) => entry.key === requestedGroup) || null;
  pageTitle.textContent = currentGroup ? currentGroup.label : '帮助';
  const grouped = helpGroups.map((group) => ({
    ...group,
    items: items.filter((item) => group.normalize(item)),
  }));
  const visibleGroups = currentGroup
    ? grouped.filter((group) => group.key === currentGroup.key)
    : grouped.filter((group) => group.items.length > 0);
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '帮助' }, ...(currentGroup ? [{ label: currentGroup.label }] : [])])}
      <section class="panel page-hero">
        <div class="section-head">
          <div class="page-hero-copy">
            <div class="page-hero-kicker">帮助</div>
            <h2 class="page-hero-title">${escapeHtml(currentGroup ? currentGroup.label : '帮助入口')}</h2>
            <div class="page-hero-desc">帮助页是后台的次级支持工具，不脱离主壳层，也不伪装成独立产品。先选入口，再进入文档细看。</div>
          </div>
        </div>
      </section>
      <div class="page-layout with-aside layout-priority-main">
        <div class="page-main">
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">帮助分组</h2>
                <div class="section-desc">帮助首页按页面、流程、部署、接口和故障排查 5 类固定分组，不再继续按临时文案自然分桶。</div>
              </div>
            </div>
            <div class="support-card-grid">
              ${grouped.map((group) => `
                <article class="card template-card support-card ${currentGroup && currentGroup.key === group.key ? 'active' : ''}">
                  <div class="metric-label">帮助分组</div>
                  <div class="template-card-title support-card-title">${escapeHtml(group.label)}</div>
                  <div class="support-card-summary">${escapeHtml(group.items.length ? `当前共有 ${group.items.length} 篇文档。` : '当前没有文档，后续再补充。')}</div>
                  <div class="support-card-actions">
                    <a class="button-link" data-link href="${escapeHtml(buildConsoleUrl('/help', { pageGroup: group.key }))}">查看本组</a>
                  </div>
                </article>
              `).join('')}
            </div>
          </section>
          ${visibleGroups.map((group) => `
            <section class="panel">
              <div class="section-head">
                <div>
                  <h2 class="section-title">${escapeHtml(group.label)}</h2>
                  <div class="section-desc">控制台内嵌帮助页，便于在浏览器里直接查看，不再跳仓库路径。</div>
                </div>
              </div>
              <div class="support-card-grid">
                ${group.items.map((item) => `
                  <article class="card template-card support-card">
                    <div class="metric-label">支持入口</div>
                    <div class="template-card-title support-card-title">${escapeHtml(item.title)}</div>
                    <div class="support-card-summary">${escapeHtml(item.summary || '')}</div>
                    <div class="support-card-actions">
                      <a class="button-link" data-link href="/console/help/${encodeURIComponent(item.slug)}">打开说明</a>
                    </div>
                  </article>
                `).join('')}
              </div>
            </section>
          `).join('')}
        </div>
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">支持入口说明</h2>
                <div class="section-desc">帮助属于次级工作页，建议先回到主工作页完成操作，再按需回来查阅说明。</div>
              </div>
            </div>
            <div class="summary-list">
              <div class="summary-row"><span class="subtle">帮助页数量</span><span>${escapeHtml(String(items.length))}</span></div>
              <div class="summary-row"><span class="subtle">手册分组</span><span>${escapeHtml(String(grouped.length))}</span></div>
              <div class="summary-row"><span class="subtle">当前分组</span><span>${escapeHtml(currentGroup ? currentGroup.label : '全部')}</span></div>
              <div class="summary-row"><span class="subtle">推荐用法</span><span>先处理业务，再回来查说明</span></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

/**
 * 功能：渲染单篇帮助文章。
 * 输入：`slug` 帮助文章标识。
 * 输出：无显式返回；直接写入页面。
 */
async function renderHelpArticle(slug) {
  pageTitle.textContent = '帮助详情';
  const data = await fetchJson(`/api/console/help/${encodeURIComponent(slug)}`);
  const item = data.item;
  const articleGroupLabel = ['部署 / 联调', '部署手册'].includes(String(item.kicker || '').trim())
    ? '部署手册'
    : (['试用 / 反馈', '流程手册'].includes(String(item.kicker || '').trim())
      ? '流程手册'
      : (String(item.kicker || '').trim() || '页面手册'));
  app.innerHTML = `
    <div class="page-stack">
      ${consumeFlashHtml()}
      ${renderBreadcrumbs([{ label: '工作台', href: '/console' }, { label: '帮助', href: '/console/help' }, { label: articleGroupLabel, href: buildConsoleUrl('/help', { pageGroup: articleGroupLabel === '页面手册' ? 'pages' : articleGroupLabel === '流程手册' ? 'flows' : articleGroupLabel === '部署手册' ? 'ops' : articleGroupLabel === '接口手册' ? 'apis' : 'troubleshooting' }) }, { label: item.title }])}
      <div class="page-layout with-aside layout-priority-main">
        <div class="page-main">
          <section class="panel page-hero">
            <div class="section-head">
              <div class="page-hero-copy">
                <div class="page-hero-kicker">${escapeHtml(articleGroupLabel)}</div>
                <h2 class="page-hero-title">${escapeHtml(item.title)}</h2>
                <div class="page-hero-desc">${escapeHtml(item.summary || '')}</div>
              </div>
            </div>
          </section>
          <div class="help-sections">
            ${item.markdown ? renderHelpMarkdown(item.markdown) : renderHelpSections(item.sections || [])}
          </div>
        </div>
        <div class="page-side">
          <section class="panel panel-soft">
            <div class="section-head">
              <div>
                <h2 class="section-title">文档信息</h2>
                <div class="section-desc">帮助文档沿用和业务详情页一致的右侧元数据与动作区，不单独另起一套文档站结构。</div>
              </div>
            </div>
            <div class="summary-list">
              <div class="summary-row"><span class="subtle">更新日期</span><span>${escapeHtml(item.updatedAt || '未记录')}</span></div>
              <div class="summary-row"><span class="subtle">文档类型</span><span>${escapeHtml(articleGroupLabel)}</span></div>
              <div class="summary-row"><span class="subtle">Markdown 原文</span><span>${item.sourceDocPath ? '<span class="badge success">可下载</span>' : '<span class="badge">未提供</span>'}</span></div>
            </div>
            <div class="action-zone" style="margin-top:14px;">
              <div class="action-zone-title">文档动作</div>
              <div class="action-zone-desc">返回、下载和阅读提醒统一放在同一组次级动作区。</div>
              <div class="inline-actions">
                <a class="button-link secondary-button" data-link href="/console/help">返回帮助</a>
                ${item.sourceDocPath ? `<a class="button-link" href="/api/console/help/${encodeURIComponent(slug)}/source" download>下载 Markdown 原文</a>` : ''}
              </div>
            </div>
          </section>
          <section class="panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">阅读提示</h2>
                <div class="section-desc">长文继续保留任务辅助属性，不改成单纯文档站阅读页。</div>
              </div>
            </div>
            <div class="callout">
              <h3 class="callout-title">建议阅读方式</h3>
              <ol>
                <li>先确认当前问题或要执行的操作，再回看对应章节。</li>
                <li>需要转给联调或试用人员时，再下载 Markdown 原文。</li>
                <li>阅读完成后使用统一的“返回帮助”动作回到支持入口页。</li>
              </ol>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

/**
 * 功能：根据路由渲染对应页面。
 * 输入：无。
 * 输出：无显式返回；直接刷新内容区。
 */
async function renderRoute(options = {}) {
  const route = currentRouteContext();
  const startedAt = Date.now();
  const legacyPath = route.path;
  if (legacyPath === '/terms') {
    navigate(buildConsoleUrl('/dictionary/terms', Object.fromEntries(route.query.entries())));
    return;
  }
  if (/^\/terms\/[^/]+\/validation-cases$/.test(legacyPath)) {
    navigate(buildConsoleUrl(`/dictionary/terms/${encodeURIComponent(decodeURIComponent(legacyPath.split('/')[2]))}/validation-cases`, Object.fromEntries(route.query.entries())));
    return;
  }
  if (/^\/terms\/[^/]+$/.test(legacyPath)) {
    navigate(buildConsoleUrl(`/dictionary/terms/${encodeURIComponent(decodeURIComponent(legacyPath.split('/')[2]))}`, Object.fromEntries(route.query.entries())));
    return;
  }
  if (legacyPath === '/import') {
    navigate(buildConsoleUrl('/dictionary/import-jobs', Object.fromEntries(route.query.entries())));
    return;
  }
  if (/^\/import\/jobs\/[^/]+$/.test(legacyPath)) {
    navigate(buildConsoleUrl(`/dictionary/import-jobs/${encodeURIComponent(decodeURIComponent(legacyPath.split('/')[3]))}`, Object.fromEntries(route.query.entries())));
    return;
  }
  if (legacyPath === '/reviews') {
    navigate(buildConsoleUrl('/dictionary/reviews', Object.fromEntries(route.query.entries())));
    return;
  }
  if (/^\/reviews\/[^/]+$/.test(legacyPath)) {
    navigate(buildConsoleUrl(`/dictionary/reviews/${encodeURIComponent(decodeURIComponent(legacyPath.split('/')[2]))}`, Object.fromEntries(route.query.entries())));
    return;
  }
  if (legacyPath === '/business-properties') {
    navigate(buildConsoleUrl('/dictionary/config', Object.fromEntries(route.query.entries())));
    return;
  }
  if (legacyPath === '/validation-cases') {
    navigate(buildConsoleUrl('/validation/cases', Object.fromEntries(route.query.entries())));
    return;
  }
  if (/^\/validation-cases\/[^/]+$/.test(legacyPath)) {
    navigate(buildConsoleUrl(`/validation/cases/${encodeURIComponent(decodeURIComponent(legacyPath.split('/')[2]))}`, Object.fromEntries(route.query.entries())));
    return;
  }
  applyPageFamilyAppearance(route.path);
  scheduleRouteAutoRefresh(route.path);
  const cached = readRouteRenderCache(route);
  if (!options.background) {
    if (cached) {
      pageTitle.textContent = cached.title || pageTitle.textContent;
      app.innerHTML = `${renderRouteCacheNotice(cached.cachedAt)}${cached.html}`;
    } else {
      app.innerHTML = renderLoadingCard('正在加载，请稍候...', '首次进入页面时会先完成权限和业务数据读取。');
    }
  }
  try {
    await refreshAccessMeta();
    await refreshBusinessPropertiesMeta();
    setActiveNav();
    const pageKey = pageKeyForPath(route.path);
    if (pageKey && currentAccessMeta && currentAccessMeta.pageAccess && currentAccessMeta.pageAccess[pageKey] !== true) {
      renderAccessDenied(pageKey);
      writeRouteRenderCache(route);
      recordRouteLoadMetric(route.path, {
        ok: true,
        durationMs: Date.now() - startedAt,
        pageTitle: pageTitle.textContent || '',
        result: 'access_denied',
      });
      return;
    }
    if (route.path === '/') {
      await renderOverview();
    } else if (route.path === '/runtime') {
      await renderRuntimeHome();
    } else if (route.path === '/system') {
      await renderSystemHome();
    } else if (route.path === '/users') {
      await renderUsers();
    } else if (route.path === '/roles') {
      await renderRoles();
    } else if (route.path === '/permissions') {
      await renderPermissions();
    } else if (route.path === '/governance-policies') {
      await renderGovernancePolicies();
    } else if (route.path === '/dictionary/config') {
      await renderBusinessProperties();
    } else if (route.path === '/runtime-verify') {
      await renderRuntimeVerify();
    } else if (route.path === '/runtime-node-registry') {
      await renderRuntimeNodeRegistry();
    } else if (route.path === '/runtime-nodes') {
      await renderRuntimeNodes();
    } else if (/^\/runtime-nodes\/[^/]+$/.test(route.path)) {
      await renderRuntimeNodeDetail(decodeURIComponent(route.path.split('/')[2]));
    } else if (route.path === '/dictionary/terms') {
      await renderTerms();
    } else if (/^\/dictionary\/terms\/[^/]+\/validation-cases$/.test(route.path)) {
      await renderTermValidationCases(decodeURIComponent(route.path.split('/')[3]));
    } else if (/^\/dictionary\/terms\/[^/]+$/.test(route.path)) {
      await renderTermDetail(decodeURIComponent(route.path.split('/')[3]));
    } else if (route.path === '/dictionary/import-jobs') {
      await renderImportHome();
    } else if (/^\/import\/templates\/[^/]+$/.test(route.path)) {
      await renderImportTemplateDetail(decodeURIComponent(route.path.split('/')[3]));
    } else if (/^\/dictionary\/import-jobs\/[^/]+$/.test(route.path)) {
      await renderImportJobDetail(decodeURIComponent(route.path.split('/')[3]));
    } else if (route.path === '/dictionary/reviews') {
      await renderReviews();
    } else if (/^\/dictionary\/reviews\/[^/]+$/.test(route.path)) {
      await renderReviewDetail(decodeURIComponent(route.path.split('/')[3]));
    } else if (route.path === '/releases') {
      await renderReleases();
    } else if (/^\/releases\/[^/]+$/.test(route.path)) {
      await renderReleaseDetail(decodeURIComponent(route.path.split('/')[2]));
    } else if (route.path === '/validation/cases') {
      await renderValidationCases();
    } else if (/^\/validation\/cases\/[^/]+$/.test(route.path)) {
      await renderValidationCaseDetail(decodeURIComponent(route.path.split('/')[3]));
    } else if (route.path === '/help') {
      await renderHelpIndex();
    } else if (/^\/help\/[^/]+$/.test(route.path)) {
      await renderHelpArticle(decodeURIComponent(route.path.split('/')[2]));
    } else {
      pageTitle.textContent = '页面不存在';
      app.innerHTML = renderEmptyState('当前页面尚未定义。');
    }
    writeRouteRenderCache(route);
    recordRouteLoadMetric(route.path, {
      ok: true,
      durationMs: Date.now() - startedAt,
      pageTitle: pageTitle.textContent || '',
      result: 'rendered',
    });
  } catch (error) {
    const normalizedError = normalizeConsoleError(error);
    app.innerHTML = `
      <section class="flash danger">
        <h2 class="flash-title">页面加载失败</h2>
        <div class="flash-desc">${escapeHtml(normalizedError.description)}</div>
      </section>
    `;
    recordRouteLoadMetric(route.path, {
      ok: false,
      durationMs: Date.now() - startedAt,
      pageTitle: pageTitle.textContent || '',
      result: 'failed',
      errorCode: normalizedError.code || '',
      errorMessage: normalizedError.description || '',
    });
  }
}

document.addEventListener('click', (event) => {
  const actionButton = event.target.closest('button[data-action="clear-terms-filters"]');
  if (actionButton) {
    event.preventDefault();
    const form = actionButton.closest('form');
    if (form) {
      form.querySelectorAll('input[name="query"], select[name="categoryCode"], select[name="status"], select[name="sourceType"], select[name="riskLevel"]').forEach((element) => {
        element.value = '';
      });
      const sortInput = form.querySelector('select[name="sort"]');
      if (sortInput) {
        sortInput.value = 'updated_at:desc';
      }
      refreshTermsResultsOnly({
        page: 1,
        query: '',
        categoryCode: '',
        status: '',
        sourceType: '',
        riskLevel: '',
        sort: 'updated_at:desc',
      }).catch((error) => showActionError(error));
    }
    return;
  }
  const runtimeNodeClearButton = event.target.closest('button[data-action="clear-runtime-node-filters"]');
  if (runtimeNodeClearButton) {
    event.preventDefault();
    const form = runtimeNodeClearButton.closest('form');
    if (form) {
      form.querySelectorAll('select[name="status"], input[name="env"]').forEach((element) => {
        element.value = '';
      });
    }
    refreshRuntimeNodesResultsOnly({
      page: 1,
      status: '',
      env: '',
    }).catch((error) => showActionError(error));
    return;
  }
  const importClearButton = event.target.closest('button[data-action="clear-import-filters"]');
  if (importClearButton) {
    event.preventDefault();
    refreshImportResultsOnly({
      page: 1,
      status: '',
      sourceType: '',
    }).catch((error) => showActionError(error));
    return;
  }
  const importRowClearButton = event.target.closest('button[data-action="clear-import-job-row-filters"]');
  if (importRowClearButton) {
    event.preventDefault();
    const form = importRowClearButton.closest('form');
    const jobId = form ? String(new FormData(form).get('jobId') || '').trim() : '';
    if (form) {
      form.querySelectorAll('select[name="rowStatus"], select[name="rowDecision"]').forEach((element) => {
        element.value = '';
      });
    }
    refreshImportRowsResultsOnly({
      jobId,
      page: 1,
      rowStatus: '',
      rowDecision: '',
    }).catch((error) => showActionError(error));
    return;
  }
  const reviewClearButton = event.target.closest('button[data-action="clear-review-filters"]');
  if (reviewClearButton) {
    event.preventDefault();
    const form = reviewClearButton.closest('form');
    const formData = form ? new FormData(form) : new FormData();
    if (form) {
      const statusInput = form.querySelector('select[name="status"]');
      if (statusInput) {
        statusInput.value = '';
      }
    }
    refreshReviewResultsOnly({
      page: 1,
      view: formData.get('view') || '',
      status: '',
      importJobId: formData.get('importJobId') || '',
    }).catch((error) => showActionError(error));
    return;
  }
  const releaseClearButton = event.target.closest('button[data-action="clear-release-filters"]');
  if (releaseClearButton) {
    event.preventDefault();
    const form = releaseClearButton.closest('form');
    const formData = form ? new FormData(form) : new FormData();
    if (form) {
      const statusInput = form.querySelector('select[name="status"]');
      if (statusInput) {
        statusInput.value = '';
      }
    }
    refreshReleaseResultsOnly({
      page: 1,
      view: formData.get('view') || '',
      status: '',
    }).catch((error) => showActionError(error));
    return;
  }
  const validationCaseClearButton = event.target.closest('button[data-action="clear-validation-case-filters"]');
  if (validationCaseClearButton) {
    event.preventDefault();
    const form = validationCaseClearButton.closest('form');
    if (form) {
      form.querySelectorAll('input[name="query"], select[name="sourceType"], select[name="enabled"]').forEach((element) => {
        element.value = '';
      });
    }
    refreshValidationCaseResultsOnly({
      page: 1,
      query: '',
      sourceType: '',
      enabled: '',
    }).catch((error) => showActionError(error));
    return;
  }
  const anchor = event.target.closest('a[data-link]');
  if (!anchor) {
    return;
  }
  event.preventDefault();
  if (
    currentRouteContext().path === '/runtime-node-registry'
    && document.getElementById('runtimeNodeRegistryResultsSurface')
    && anchor.closest('.pagination')
    && document.getElementById('runtimeNodeRegistryResultsSurface').contains(anchor)
  ) {
    refreshRuntimeNodeRegistryResultsOnly(runtimeNodeRegistryQueryStateFromHref(anchor.getAttribute('href') || ''))
      .catch((error) => showActionError(error));
    return;
  }
  if (
    currentRouteContext().path === '/runtime-nodes'
    && document.getElementById('runtimeNodesResultsSurface')
    && anchor.closest('.pagination')
    && document.getElementById('runtimeNodesResultsSurface').contains(anchor)
  ) {
    refreshRuntimeNodesResultsOnly(runtimeNodesQueryStateFromHref(anchor.getAttribute('href') || ''))
      .catch((error) => showActionError(error));
    return;
  }
  if (
    currentRouteContext().path === '/dictionary/terms'
    && document.getElementById('termsResultsSurface')
    && anchor.closest('.pagination')
    && document.getElementById('termsResultsSurface').contains(anchor)
  ) {
    refreshTermsResultsOnly(termListQueryStateFromHref(anchor.getAttribute('href') || ''))
      .catch((error) => showActionError(error));
    return;
  }
  if (
    /^\/dictionary\/import-jobs\/[^/]+$/.test(currentRouteContext().path)
    && document.getElementById('importRowsResultsSurface')
    && anchor.closest('.pagination')
    && document.getElementById('importRowsResultsSurface').contains(anchor)
  ) {
    refreshImportRowsResultsOnly(importRowsQueryStateFromHref(anchor.getAttribute('href') || ''))
      .catch((error) => showActionError(error));
    return;
  }
  if (
    currentRouteContext().path === '/dictionary/reviews'
    && document.getElementById('reviewResultsSurface')
    && anchor.closest('.pagination')
    && document.getElementById('reviewResultsSurface').contains(anchor)
  ) {
    refreshReviewResultsOnly(reviewListQueryStateFromHref(anchor.getAttribute('href') || ''))
      .catch((error) => showActionError(error));
    return;
  }
  if (
    currentRouteContext().path === '/releases'
    && document.getElementById('releaseResultsSurface')
    && anchor.closest('.pagination')
    && document.getElementById('releaseResultsSurface').contains(anchor)
  ) {
    refreshReleaseResultsOnly(releaseListQueryStateFromHref(anchor.getAttribute('href') || ''))
      .catch((error) => showActionError(error));
    return;
  }
  if (
    currentRouteContext().path === '/validation/cases'
    && document.getElementById('validationCaseResultsSurface')
    && anchor.closest('.pagination')
    && document.getElementById('validationCaseResultsSurface').contains(anchor)
  ) {
    refreshValidationCaseResultsOnly(validationCaseListQueryStateFromHref(anchor.getAttribute('href') || ''))
      .catch((error) => showActionError(error));
    return;
  }
  if (
    currentRouteContext().path === '/dictionary/import-jobs'
    && document.getElementById('importResultsSurface')
    && anchor.closest('.pagination')
    && document.getElementById('importResultsSurface').contains(anchor)
  ) {
    refreshImportResultsOnly(importListQueryStateFromHref(anchor.getAttribute('href') || ''))
      .catch((error) => showActionError(error));
    return;
  }
  navigate(anchor.getAttribute('href'));
});

document.addEventListener('change', (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  const scope = input.dataset.toggleBulk || '';
  if (!scope) {
    return;
  }
  const checked = input.checked;
  document.querySelectorAll(`input[data-bulk-item="${scope}"]`).forEach((item) => {
    if (item instanceof HTMLInputElement) {
      item.checked = checked;
    }
  });
});

window.addEventListener('popstate', () => {
  renderRoute();
});

document.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }
  const action = form.dataset.action || '';
  if (!action) {
    return;
  }
  event.preventDefault();
  let requiredFeature = ACTION_FEATURE_MAP[action];
  if (action === 'bulk-term-action') {
    const formData = new FormData(form);
    requiredFeature = String(formData.get('bulkAction') || '') === 'disable'
      ? 'terms.bulk.disable'
      : 'terms.bulk.submitReview';
  }
  if (action === 'bulk-review-action') {
    const formData = new FormData(form);
    requiredFeature = String(formData.get('bulkAction') || '') === 'reject'
      ? 'reviews.bulk.reject'
      : 'reviews.bulk.approve';
  }
  if (requiredFeature && !hasPageFeature(requiredFeature)) {
    showActionError(`当前身份缺少页面功能：${requiredFeature}`);
    return;
  }
  if (form.dataset.submitting === 'true') {
    return;
  }
  const confirmMessage = confirmationMessageFor(action, form);
  if (confirmMessage && !window.confirm(confirmMessage)) {
    return;
  }
  setFormSubmitting(form, true);
  try {
    if (action === 'navigate-console') {
      return navigate(form.getAttribute('action') || '/console');
    }

    if (action === 'filter-terms') {
      const formData = new FormData(form);
      const nextParams = {
        page: 1,
        query: formData.get('query') || '',
        categoryCode: formData.get('categoryCode') || '',
        status: formData.get('status') || '',
        sourceType: formData.get('sourceType') || '',
        riskLevel: formData.get('riskLevel') || '',
        sort: formData.get('sort') || 'updated_at:desc',
      };
      if (currentRouteContext().path === '/dictionary/terms' && document.getElementById('termsResultsSurface')) {
        await refreshTermsResultsOnly(nextParams);
        return;
      }
      return navigate(buildConsoleUrl('/dictionary/terms', nextParams));
    }

    if (action === 'filter-runtime-nodes') {
      const formData = new FormData(form);
      const nextParams = {
        page: 1,
        status: formData.get('status') || '',
        env: formData.get('env') || '',
      };
      if (currentRouteContext().path === '/runtime-nodes' && document.getElementById('runtimeNodesResultsSurface')) {
        await refreshRuntimeNodesResultsOnly(nextParams);
        return;
      }
      return navigate(buildConsoleUrl('/runtime-nodes', nextParams));
    }

    if (action === 'refresh-current-route') {
      return renderRoute({ background: true });
    }

    if (action === 'toggle-runtime-auto-refresh') {
      const formData = new FormData(form);
      const enabled = String(formData.get('enabled') || '') === 'true';
      setRuntimeAutoRefreshEnabled(enabled);
      setFlash({
        type: 'success',
        title: enabled ? '已开启自动刷新' : '已关闭自动刷新',
        description: enabled ? '运行节点页面会每 5 秒自动刷新一次。' : '运行节点页面已切换为手动刷新模式，避免整页持续抖动。',
      });
      return renderRoute({ background: true });
    }

    if (action === 'run-overview-simulation') {
      const formData = new FormData(form);
      const text = String(formData.get('text') || '').trim();
      const trafficKey = String(formData.get('trafficKey') || '').trim();
      overviewSimulationState = {
        ...currentOverviewSimulationState(),
        text,
        trafficKey: trafficKey || DEFAULT_OVERVIEW_SIMULATION_TRAFFIC_KEY,
        lastError: '',
      };
      const result = await postJson('/api/console/runtime-demo/simulate', {
        text,
        trafficKey: overviewSimulationState.trafficKey,
        enablePinyinChannel: true,
        enablePinyinAutoReplace: true,
      });
      overviewSimulationState = {
        ...overviewSimulationState,
        lastResult: result,
        lastError: '',
        updatedAt: new Date().toISOString(),
      };
      setFlash({
        type: 'success',
        title: '纠错试跑已完成',
        description: '首页演示区已更新本次输入、纠错输出和命中详情。',
      });
      return renderRoute({ background: true });
    }

    if (action === 'run-runtime-verify-correct') {
      const formData = new FormData(form);
      const text = String(formData.get('text') || '').trim();
      const trafficKey = String(formData.get('trafficKey') || '').trim();
      const result = await postJson('/api/console/runtime-verify/correct', {
        text,
        trafficKey,
        enablePinyinChannel: true,
        enablePinyinAutoReplace: true,
      });
      runtimeVerifyState = {
        ...currentRuntimeVerifyState(),
        text,
        trafficKey: trafficKey || DEFAULT_OVERVIEW_SIMULATION_TRAFFIC_KEY,
        lastCorrectResult: {
          inputText: text,
          trafficKey: trafficKey || DEFAULT_OVERVIEW_SIMULATION_TRAFFIC_KEY,
          correctedText: result.correctedText,
        },
        lastError: '',
        updatedAt: new Date().toISOString(),
      };
      setFlash({
        type: 'success',
        title: 'correct 验证已完成',
        description: '当前主结果已更新到“运行验证”页面。',
      });
      return renderRoute({ background: true });
    }

    if (action === 'run-runtime-verify-correct-cand') {
      const formData = new FormData(form);
      const text = String(formData.get('text') || '').trim();
      const trafficKey = String(formData.get('trafficKey') || '').trim();
      const result = await postJson('/api/console/runtime-verify/correct-cand', {
        text,
        trafficKey,
        enablePinyinChannel: true,
        enablePinyinAutoReplace: true,
      });
      runtimeVerifyState = {
        ...currentRuntimeVerifyState(),
        text,
        trafficKey: trafficKey || DEFAULT_OVERVIEW_SIMULATION_TRAFFIC_KEY,
        lastCorrectCandResult: {
          inputText: text,
          trafficKey: trafficKey || DEFAULT_OVERVIEW_SIMULATION_TRAFFIC_KEY,
          correctedTexts: Array.isArray(result.correctedTexts) ? result.correctedTexts : [],
        },
        lastError: '',
        updatedAt: new Date().toISOString(),
      };
      setFlash({
        type: 'success',
        title: 'correct_cand 验证已完成',
        description: '当前候选整句结果已更新到“运行验证”页面。',
      });
      return renderRoute({ background: true });
    }

    if (action === 'canary-release') {
      const formData = new FormData(form);
      await postJson(form.action, {
        releaseId: formData.get('releaseId') || '',
        scopeType: formData.get('scopeType') || 'traffic_key_hash',
        percentage: Number(formData.get('percentage') || 5),
      });
      setFlash({
        type: 'success',
        title: '灰度策略已启用',
        description: '当前版本已设为灰度版本，请继续观察运行节点和验证结果。',
      });
      return renderRoute();
    }

    if (action === 'create-runtime-node-registry') {
      const formData = new FormData(form);
      const created = await postJson('/api/console/runtime-node-registry', {
        nodeId: formData.get('nodeId') || '',
        nodeName: formData.get('nodeName') || '',
        env: formData.get('env') || '',
        address: formData.get('address') || '',
        remarks: formData.get('remarks') || '',
      });
      setFlash({
        type: 'success',
        title: `节点备案已创建：${created.item.nodeId}`,
        description: `请保存一次性明文密钥：${created.secretPlaintext || '未返回'}`,
      });
      return navigate(`/console/runtime-node-registry?nodeId=${encodeURIComponent(created.item.nodeId)}`);
    }

    if (action === 'update-runtime-node-registry') {
      const formData = new FormData(form);
      await postJson(form.action, {
        nodeName: formData.get('nodeName') || '',
        env: formData.get('env') || '',
        address: formData.get('address') || '',
        remarks: formData.get('remarks') || '',
      }, 'PUT');
      setFlash({
        type: 'success',
        title: '节点备案已保存',
        description: '地址、名称和备注已更新。',
      });
      return renderRoute();
    }

    if (action === 'enable-runtime-node-registry' || action === 'disable-runtime-node-registry') {
      const result = await postJson(form.action, { reason: action });
      setFlash({
        type: action === 'enable-runtime-node-registry' ? 'success' : 'warning',
        title: action === 'enable-runtime-node-registry' ? '节点备案已启用' : '节点备案已禁用',
        description: `${result.item.nodeId} 当前备案状态已更新。`,
      });
      return renderRoute();
    }

    if (action === 'rotate-runtime-node-secret') {
      const rotated = await postJson(form.action, {});
      setFlash({
        type: 'warning',
        title: '节点密钥已轮换',
        description: `请立即保存新密钥：${rotated.secretPlaintext || '未返回'}。旧密钥已经失效。`,
      });
      return renderRoute();
    }

    if (action === 'create-business-property' || action === 'update-business-property') {
      const formData = new FormData(form);
      const payload = {
        value: formData.get('value') || '',
        label: formData.get('label') || '',
        description: formData.get('description') || '',
        legacyCategoryCode: formData.get('legacyCategoryCode') || '',
        sortOrder: Number(formData.get('sortOrder') || 0),
        enabled: formData.get('enabled') === 'on',
      };
      const result = await postJson(form.action, payload, action === 'create-business-property' ? 'POST' : 'PUT');
      await refreshBusinessPropertyDefinitionsMeta(true);
      await refreshBusinessPropertiesMeta(true);
      setFlash({
        type: 'success',
        title: action === 'create-business-property' ? '业务属性已创建' : '业务属性已保存',
        description: `${result.item.label || result.item.value} 已同步到词条和批量导入的可用配置。`,
      });
      return navigate(`/console/dictionary/config?value=${encodeURIComponent(result.item.value)}`);
    }

    if (action === 'enable-business-property' || action === 'disable-business-property') {
      const result = await postJson(form.action, {});
      await refreshBusinessPropertyDefinitionsMeta(true);
      await refreshBusinessPropertiesMeta(true);
      setFlash({
        type: action === 'enable-business-property' ? 'success' : 'warning',
        title: action === 'enable-business-property' ? '业务属性已启用' : '业务属性已停用',
        description: `${result.item.label || result.item.value} 的状态已更新。`,
      });
      return renderRoute();
    }

    if (action === 'delete-business-property') {
      const result = await postJson(form.action, {});
      await refreshBusinessPropertyDefinitionsMeta(true);
      await refreshBusinessPropertiesMeta(true);
      setFlash({
        type: 'warning',
        title: '业务属性已删除',
        description: `${result.item.label || result.item.value} 已从配置文件中移除。`,
      });
      return navigate('/console/dictionary/config');
    }

    if (action === 'create-source-type' || action === 'update-source-type') {
      const formData = new FormData(form);
      const payload = {
        code: formData.get('code') || '',
        label: formData.get('label') || '',
        description: formData.get('description') || '',
        scopes: String(formData.get('scopesText') || '')
          .split('|')
          .map((item) => String(item || '').trim())
          .filter(Boolean),
        allowedEntryModes: String(formData.get('allowedEntryModesText') || '')
          .split('|')
          .map((item) => String(item || '').trim())
          .filter(Boolean),
        sortOrder: Number(formData.get('sortOrder') || 0),
        enabled: formData.get('enabled') === 'on',
      };
      const result = await postJson(form.action, payload, action === 'create-source-type' ? 'POST' : 'PUT');
      sourceTypeMetaCache.clear();
      await refreshSourceTypeMeta({ includeDisabled: true }, true);
      setFlash({
        type: 'success',
        title: action === 'create-source-type' ? '来源类型已创建' : '来源类型已保存',
        description: `${result.item.label || result.item.code} 已同步到基础配置。`,
      });
      return navigate(`/console/dictionary/config?sourceTypeCode=${encodeURIComponent(result.item.code || result.item.value)}`);
    }

    if (action === 'enable-source-type' || action === 'disable-source-type') {
      const result = await postJson(form.action, {});
      sourceTypeMetaCache.clear();
      await refreshSourceTypeMeta({ includeDisabled: true }, true);
      setFlash({
        type: action === 'enable-source-type' ? 'success' : 'warning',
        title: action === 'enable-source-type' ? '来源类型已启用' : '来源类型已停用',
        description: `${result.item.label || result.item.code || result.item.value} 的状态已更新。`,
      });
      return renderRoute();
    }

    if (action === 'create-system-user' || action === 'update-system-user') {
      const formData = new FormData(form);
      const payload = {
        userId: formData.get('userId') || '',
        displayName: formData.get('displayName') || '',
        defaultRole: formData.get('defaultRole') || '',
        assignedRoles: formData.getAll('assignedRoles').map((item) => String(item || '').trim()).filter(Boolean),
      };
      const result = await postJson(form.action, payload, action === 'create-system-user' ? 'POST' : 'PUT');
      await forceRefreshAccessMeta();
      await refreshAccessControlMeta(true);
      setFlash({
        type: 'success',
        title: action === 'create-system-user' ? '用户已创建' : '用户已保存',
        description: `${result.item.displayName || result.item.userId} 的角色配置已更新。`,
      });
      return navigate(`/console/users?userId=${encodeURIComponent(result.item.userId)}`);
    }

    if (action === 'create-system-role' || action === 'update-system-role') {
      const formData = new FormData(form);
      const payload = {
        roleId: formData.get('roleId') || '',
        displayName: formData.get('displayName') || '',
        description: formData.get('description') || '',
        permissions: formData.getAll('permissions').map((item) => String(item || '').trim()).filter(Boolean),
      };
      const result = await postJson(form.action, payload, action === 'create-system-role' ? 'POST' : 'PUT');
      await forceRefreshAccessMeta();
      await refreshAccessControlMeta(true);
      setFlash({
        type: 'success',
        title: action === 'create-system-role' ? '角色已创建' : '角色已保存',
        description: `${result.item.displayName || result.item.roleId} 的权限集合已更新。`,
      });
      return navigate(`/console/roles?roleId=${encodeURIComponent(result.item.roleId)}`);
    }

    if (action === 'update-governance-policies') {
      const formData = new FormData(form);
      await postJson(form.action, {
        releasePolicies: {
          submitterReviewerSeparationRequired: formData.get('submitterReviewerSeparationRequired') === 'on',
          distinctApprovalReviewersRequired: formData.get('distinctApprovalReviewersRequired') === 'on',
          reviewerPublisherSeparationRequired: formData.get('reviewerPublisherSeparationRequired') === 'on',
          highRiskReleaseRequiresDualApproval: formData.get('highRiskReleaseRequiresDualApproval') === 'on',
          defaultRequiredApprovals: Number(formData.get('defaultRequiredApprovals') || 1),
          highRiskReleaseRequiredApprovals: Number(formData.get('highRiskReleaseRequiredApprovals') || 2),
        },
      }, 'PUT');
      await refreshGovernancePoliciesMeta(true);
      setFlash({
        type: 'success',
        title: '治理策略已保存',
        description: '新的发布治理规则已经写入配置，后续审批与发布动作会立即按新规则执行。',
      });
      return renderRoute();
    }

    if (action === 'create-term') {
      const formData = new FormData(form);
      const created = await postJson('/api/console/dictionary/terms', {
        categoryCode: formData.get('categoryCode'),
        canonicalText: formData.get('canonicalText'),
        aliases: splitPipeList(formData.get('aliases')),
        priority: Number(formData.get('priority') || 80),
        riskLevel: formData.get('riskLevel') || 'medium',
        replaceMode: formData.get('replaceMode') || 'replace',
        baseConfidence: Number(formData.get('baseConfidence') || 0.9),
        sourceType: formData.get('sourceType') || 'manual',
        pinyinRuntimeMode: formData.get('pinyinRuntimeMode') || 'candidate',
      });
      setFlash({
        type: 'success',
        title: `词典记录已创建：${created.item.canonicalText}`,
        description: '建议下一步先检查详情页信息，然后直接提交词典审核。',
        actions: [
          {
            label: '立即提交审核',
            formAction: `/api/console/dictionary/terms/${encodeURIComponent(created.item.termId)}/submit-review`,
            dataAction: 'submit-term-review',
          },
          {
            label: '查看词典记录详情',
            href: `/console/dictionary/terms/${encodeURIComponent(created.item.termId)}`,
          },
        ],
      });
      return navigate(`/console/dictionary/terms/${encodeURIComponent(created.item.termId)}`);
    }

    if (action === 'submit-term-review') {
      await postJson(form.action, { comment: 'console submit review' });
      setFlash({
        type: 'success',
        title: '词条已提交审核',
        description: '下一步请切换审核员身份，前往词典审核处理此任务。',
        actions: [{ label: '前往词典审核', href: '/console/dictionary/reviews' }],
      });
      return renderRoute();
    }

    if (action === 'bulk-term-action') {
      const formData = new FormData(form);
      const bulkScope = String(formData.get('bulkScope') || 'current_page');
      const termIds = bulkScope === 'current_filter' ? [] : checkedBulkValues('terms');
      if (bulkScope === 'current_page' && !termIds.length) {
        throw new Error('请先勾选至少一个词条。');
      }
      const filters = bulkScope === 'current_filter' ? currentTermFiltersFromRoute() : null;
      const bulkAction = String(formData.get('bulkAction') || 'submit-review');
      if (bulkAction === 'submit-review') {
        const result = await postJson('/api/console/dictionary/terms/batch-submit-review', {
          termIds,
          filters,
          comment: 'console batch submit review',
        });
        setFlash({
          type: 'success',
          title: '词条批量送审已完成',
          description: `共处理 ${result.item.total} 条，新增送审 ${result.item.submittedCount} 条，复用待审 ${result.item.reusedCount} 条，跳过停用词条 ${result.item.skippedDisabledCount} 条，跳过已通过且无新改动 ${result.item.skippedAlreadySatisfiedCount || 0} 条。`,
          actions: [{ label: '前往词典审核', href: '/console/dictionary/reviews' }],
        });
        return renderRoute();
      }
      if (bulkAction === 'disable') {
        const result = await postJson('/api/console/dictionary/terms/batch-disable', {
          termIds,
          filters,
          reason: 'console batch disable',
        });
        setFlash({
          type: 'warning',
          title: '词条批量停用已完成',
          description: `共处理 ${result.item.total} 条，实际停用 ${result.item.disabledCount} 条，原本已停用 ${result.item.alreadyDisabledCount} 条。`,
        });
        return renderRoute();
      }
      throw new Error('不支持的词条批量操作。');
    }

    if (action === 'update-term-basic') {
      const formData = new FormData(form);
      await postJson(form.action, {
        categoryCode: formData.get('categoryCode'),
        canonicalText: formData.get('canonicalText'),
        aliases: splitPipeList(formData.get('aliases')),
        priority: Number(formData.get('priority') || 80),
        riskLevel: formData.get('riskLevel') || 'medium',
        replaceMode: formData.get('replaceMode') || 'replace',
        baseConfidence: Number(formData.get('baseConfidence') || 0.9),
        sourceType: formData.get('sourceType') || 'manual',
        pinyinRuntimeMode: formData.get('pinyinRuntimeMode') || 'candidate',
      }, 'PUT');
      setFlash({
        type: 'success',
        title: '基础信息已保存',
        description: '如果词条内容已确认，请继续提交审核。',
      });
      return renderRoute();
    }

    if (action === 'update-term-rules') {
      const formData = new FormData(form);
      await postJson(form.action, {
        rules: {
          candidateOnly: formData.get('candidateOnly') === 'on',
          minTextLen: formData.get('minTextLen') ? Number(formData.get('minTextLen')) : null,
          maxTextLen: formData.get('maxTextLen') ? Number(formData.get('maxTextLen')) : null,
          boundaryPolicy: formData.get('boundaryPolicy') || 'none',
          leftContextAllow: splitPipeList(formData.get('leftContextAllow')),
          rightContextAllow: splitPipeList(formData.get('rightContextAllow')),
          leftContextBlock: splitPipeList(formData.get('leftContextBlock')),
          rightContextBlock: splitPipeList(formData.get('rightContextBlock')),
          regexAllow: splitPipeList(formData.get('regexAllow')),
          regexBlock: splitPipeList(formData.get('regexBlock')),
        },
      }, 'PUT');
      setFlash({
        type: 'success',
        title: '规则配置已保存',
        description: '规则会影响命中和替换，请在提交审核前再次确认。',
      });
      return renderRoute();
    }

    if (action === 'update-term-pinyin') {
      const formData = new FormData(form);
      await postJson(form.action, {
        pinyinProfile: {
          runtimeMode: formData.get('runtimeMode') || 'candidate',
          polyphoneMode: formData.get('polyphoneMode') || 'default',
          customFullPinyinNoTone: formData.get('customFullPinyinNoTone') || '',
          alternativeReadings: splitPipeList(formData.get('alternativeReadings')),
          notes: formData.get('notes') || '',
        },
      }, 'PUT');
      setFlash({
        type: 'success',
        title: '拼音配置已保存',
        description: '如果这个词条依赖多音字修正，建议顺手检查候选列表是否正确。',
      });
      return renderRoute();
    }

    if (action === 'generate-pinyin-candidates') {
      await postJson(form.action, { limit: 12 });
      setFlash({
        type: 'success',
        title: '拼音候选已刷新',
        description: '请在页面下方候选列表中检查最新候选并决定是否提交审核。',
      });
      return renderRoute();
    }

    if (action === 'submit-pinyin-candidate') {
      const formData = new FormData(form);
      await postJson(form.action, {
        fullPinyinNoTone: formData.get('fullPinyinNoTone') || '',
        comment: 'console pinyin candidate submit',
      });
      setFlash({
        type: 'success',
        title: '拼音候选已提交审核',
        description: '下一步请到词典审核完成候选审核。',
        actions: [{ label: '前往词典审核', href: '/console/dictionary/reviews' }],
      });
      return renderRoute();
    }

    if (action === 'disable-term') {
      await postJson(form.action, { reason: 'console disable' });
      setFlash({
        type: 'warning',
        title: '词条已停用',
        description: '如需恢复，请重新编辑并提交新的审核链路。',
      });
      return renderRoute();
    }

    if (action === 'create-import-job') {
      const formData = new FormData();
      const input = form.querySelector('input[name="file"]');
      const file = input && input.files ? input.files[0] : null;
      if (!file) {
        throw new Error('请先选择要上传的文件。');
      }
      formData.append('templateCode', form.querySelector('[name="templateCode"]').value);
      formData.append('defaultCategoryCode', form.querySelector('[name="defaultCategoryCode"]').value);
      formData.append('sourceType', form.querySelector('[name="sourceType"]').value);
      formData.append('comment', form.querySelector('[name="comment"]').value);
      formData.append('file', file);
      const created = await postForm('/api/console/dictionary/import-jobs', formData);
      setFlash({
        type: 'success',
        title: '导入预览已生成',
        description: '下一步请检查预览统计和错误行，确认无误后再点“确认导入”。',
      });
      return navigate(`/console/dictionary/import-jobs/${encodeURIComponent(created.item.jobId)}`);
    }

    if (action === 'confirm-import-job') {
      const importJobId = String(form.action.split('/').slice(-2, -1)[0] || '').trim();
      await postJson(form.action, { importMode: 'upsert' });
      setFlash({
        type: 'success',
        title: '导入已确认并入库',
        description: '下一步请检查影响词条与生成的审核任务，确认数据已经进入闭环。',
        actions: [
          { label: '查看本批词条审核', href: buildConsoleUrl('/dictionary/reviews', { view: 'terms', importJobId }) },
          { label: '返回批量导入', href: '/console/dictionary/import-jobs' },
        ],
      });
      return renderRoute();
    }

    if (action === 'cancel-import-job') {
      await postJson(form.action, { reason: 'console cancel' });
      setFlash({
        type: 'warning',
        title: '导入批次已取消',
        description: '如果还需要导入，请修正文件后重新上传。',
      });
      return navigate('/console/dictionary/import-jobs');
    }

    if (action === 'filter-import-jobs') {
      const formData = new FormData(form);
      const nextParams = {
        page: 1,
        status: formData.get('status') || '',
        sourceType: formData.get('sourceType') || '',
      };
      if (currentRouteContext().path === '/dictionary/import-jobs' && document.getElementById('importResultsSurface')) {
        await refreshImportResultsOnly(nextParams);
        return;
      }
      return navigate(buildConsoleUrl('/dictionary/import-jobs', nextParams));
    }

    if (action === 'filter-import-job-rows') {
      const formData = new FormData(form);
      const jobId = formData.get('jobId') || '';
      const nextParams = {
        jobId,
        page: 1,
        rowStatus: formData.get('rowStatus') || '',
        rowDecision: formData.get('rowDecision') || '',
      };
      if (/^\/dictionary\/import-jobs\/[^/]+$/.test(currentRouteContext().path) && document.getElementById('importRowsResultsSurface')) {
        await refreshImportRowsResultsOnly(nextParams);
        return;
      }
      return navigate(buildConsoleUrl(`/dictionary/import-jobs/${encodeURIComponent(jobId)}`, {
        rowStatus: nextParams.rowStatus,
        rowDecision: nextParams.rowDecision,
      }));
    }

    if (action === 'filter-reviews') {
      const formData = new FormData(form);
      const nextParams = {
        page: 1,
        view: formData.get('view') || '',
        status: formData.get('status') || '',
        importJobId: formData.get('importJobId') || '',
      };
      if (currentRouteContext().path === '/dictionary/reviews' && document.getElementById('reviewResultsSurface')) {
        await refreshReviewResultsOnly(nextParams);
        return;
      }
      return navigate(buildConsoleUrl('/dictionary/reviews', nextParams));
    }

    if (action === 'bulk-review-action') {
      const formData = new FormData(form);
      const bulkScope = String(formData.get('bulkScope') || 'selected_tasks');
      const taskIds = (bulkScope === 'import_job' || bulkScope === 'current_filter') ? [] : checkedBulkValues('reviews');
      const importJobId = String(formData.get('importJobId') || '').trim();
      const filters = bulkScope === 'current_filter' ? currentReviewFiltersFromRoute() : null;
      if (bulkScope === 'selected_tasks' && !taskIds.length) {
        throw new Error('请先勾选至少一个词条审核任务。');
      }
      if (bulkScope === 'import_job' && !importJobId) {
        throw new Error('缺少导入批次上下文，请从导入详情重新进入本批审核页面。');
      }
      const bulkAction = String(formData.get('bulkAction') || 'approve');
      const requestBody = {
        scope: bulkScope,
        taskIds,
        importJobId,
        filters,
        comment: formData.get('comment') || '',
      };
      if (bulkAction === 'approve') {
        const result = await postJson('/api/console/dictionary/reviews/batch-approve', requestBody);
        setFlash({
          type: 'success',
          title: bulkScope === 'import_job' && Number((result.item || {}).totalRequested || 0) === 0 ? '当前批次没有待审核任务' : '词条审核批量通过已完成',
          description: describeBulkReviewResult(bulkScope, 'approve', result.item || {}),
          actions: importJobId ? [{ label: '返回当前批量导入', href: `/console/dictionary/import-jobs/${encodeURIComponent(importJobId)}` }] : [],
        });
        return renderRoute();
      }
      if (bulkAction === 'reject') {
        const result = await postJson('/api/console/dictionary/reviews/batch-reject', requestBody);
        setFlash({
          type: bulkScope === 'import_job' && Number((result.item || {}).totalRequested || 0) === 0 ? 'success' : 'warning',
          title: bulkScope === 'import_job' && Number((result.item || {}).totalRequested || 0) === 0 ? '当前批次没有待审核任务' : '词条审核批量驳回已完成',
          description: describeBulkReviewResult(bulkScope, 'reject', result.item || {}),
          actions: importJobId ? [{ label: '返回当前批量导入', href: `/console/dictionary/import-jobs/${encodeURIComponent(importJobId)}` }] : [],
        });
        return renderRoute();
      }
      throw new Error('不支持的批量审核动作。');
    }

    if (action === 'approve-review') {
      await postJson(form.action, { comment: 'approve' });
      setFlash({
        type: 'success',
        title: '审核已通过',
        description: '如需继续后续链路，请返回目标对象或下一步业务页面。',
      });
      return renderRoute();
    }

    if (action === 'reject-review') {
      await postJson(form.action, { comment: 'reject' });
      setFlash({
        type: 'warning',
        title: '审核已驳回',
        description: '请返回目标对象修正内容后重新提交审核。',
      });
      return renderRoute();
    }

    if (action === 'build-release') {
      const formData = new FormData(form);
      const created = await postJson('/api/console/releases/build', {
        summary: formData.get('summary') || 'console build',
      });
      setFlash({
        type: 'success',
        title: '版本已创建',
        description: '下一步请进入详情页提交发布审核。',
      });
      return navigate(`/console/releases/${encodeURIComponent(created.item.releaseId)}`);
    }

    if (action === 'filter-releases') {
      const formData = new FormData(form);
      const nextParams = {
        page: 1,
        view: formData.get('view') || '',
        status: formData.get('status') || '',
      };
      if (currentRouteContext().path === '/releases' && document.getElementById('releaseResultsSurface')) {
        await refreshReleaseResultsOnly(nextParams);
        return;
      }
      return navigate(buildConsoleUrl('/releases', nextParams));
    }

    if (action === 'submit-release-review') {
      const targetReleaseId = String(form.action.split('/').slice(-2, -1)[0] || '').trim();
      await postJson(form.action, { comment: 'console release review' });
      setFlash({
        type: 'success',
        title: '发布审核已提交',
        description: '下一步请切换审核员身份，返回当前版本详情，在发布审核任务区完成审批。',
        actions: targetReleaseId ? [{ label: '返回当前版本', href: `/console/releases/${encodeURIComponent(targetReleaseId)}` }] : [],
      });
      return renderRoute();
    }

    if (action === 'rollout-release' || action === 'reissue-runtime-rollout') {
      const formData = new FormData(form);
      const result = await postJson(form.action, {
        releaseId: formData.get('releaseId') || '',
      });
      setFlash({
        type: 'success',
        title: action === 'rollout-release' ? '目标版本已下发' : '目标版本已重新下发',
        description: `当前目标版本=${result.item.desiredVersion || '未记录'}，配置版本=${result.item.configVersion || 0}。节点会在下一次控制同步时继续收敛。`,
        actions: [
          { label: '查看运行节点', href: '/console/runtime-nodes' },
        ],
      });
      return renderRoute();
    }

    if (action === 'publish-release') {
      await postJson(form.action, { mode: 'publish' });
      setFlash({
        type: 'success',
        title: '版本已发布',
        description: '正式版本已经更新，请继续关注宿主 smoke 与业务验证结果。',
      });
      return renderRoute();
    }

    if (action === 'rollback-release') {
      await postJson(form.action, { reason: 'console rollback' });
      setFlash({
        type: 'warning',
        title: '已回滚到目标版本',
        description: '请确认当前正式版本和宿主环境行为是否符合预期。',
      });
      return renderRoute();
    }

    if (action === 'create-validation-case') {
      const formData = new FormData(form);
      const created = await postJson('/api/console/validation/cases', {
        caseId: formData.get('caseId') || '',
        description: formData.get('description') || '',
        text: formData.get('text') || '',
        expectedCanonicals: splitPipeList(formData.get('expectedCanonicals')),
        sourceType: formData.get('sourceType') || 'manual',
        notes: formData.get('notes') || '',
      });
      setFlash({
        type: 'success',
        title: '验证样本已创建',
        description: '下一步请进入详情页检查关联词条是否正确。',
      });
      return navigate(`/console/validation/cases/${encodeURIComponent(created.item.caseId)}`);
    }

    if (action === 'import-validation-cases') {
      const formData = new FormData(form);
      let items;
      try {
        items = JSON.parse(String(formData.get('itemsJson') || '[]'));
      } catch {
        throw new Error('样本 JSON 数组格式不合法，请先修正后再导入。');
      }
      if (!Array.isArray(items) || !items.length) {
        throw new Error('请至少提供一条样本记录。');
      }
      const imported = await postJson('/api/console/validation/cases/import', {
        mode: formData.get('mode') || 'upsert',
        sourceType: formData.get('sourceType') || 'validation_import',
        items,
      });
      setFlash({
        type: 'success',
        title: '样本批量导入已完成',
        description: `共处理 ${imported.item.total} 条，新增 ${imported.item.createdCount} 条，更新 ${imported.item.updatedCount} 条，跳过 ${imported.item.skippedCount} 条。`,
      });
      return navigate('/console/validation/cases');
    }

    if (action === 'disable-validation-case') {
      await postJson(form.action, { reason: 'console disable' });
      setFlash({
        type: 'warning',
        title: '验证样本已停用',
        description: '该样本将不再参与后续验证链路。',
      });
      return renderRoute();
    }

    if (action === 'bulk-validation-case-action') {
      const formData = new FormData(form);
      const bulkScope = String(formData.get('bulkScope') || 'current_page');
      const caseIds = bulkScope === 'current_filter' ? [] : checkedBulkValues('validation-cases');
      if (bulkScope === 'current_page' && !caseIds.length) {
        throw new Error('请先勾选至少一个样本。');
      }
      const filters = bulkScope === 'current_filter' ? currentValidationFiltersFromRoute() : null;
      const bulkAction = String(formData.get('bulkAction') || 'disable');
      if (bulkAction !== 'disable') {
        throw new Error('不支持的样本批量操作。');
      }
      const result = await postJson('/api/console/validation/cases/batch-disable', {
        caseIds,
        filters,
      });
      setFlash({
        type: 'warning',
        title: '样本批量停用已完成',
        description: `共处理 ${result.item.total} 条，实际停用 ${result.item.disabledCount} 条，原本已停用 ${result.item.alreadyDisabledCount} 条。`,
      });
      return renderRoute();
    }

    if (action === 'filter-validation-cases') {
      const formData = new FormData(form);
      const nextParams = {
        page: 1,
        query: formData.get('query') || '',
        sourceType: formData.get('sourceType') || '',
        enabled: formData.get('enabled') || '',
      };
      if (currentRouteContext().path === '/validation/cases' && document.getElementById('validationCaseResultsSurface')) {
        await refreshValidationCaseResultsOnly(nextParams);
        return;
      }
      return navigate(buildConsoleUrl('/validation/cases', nextParams));
    }
  } catch (error) {
    if (action === 'run-overview-simulation') {
      overviewSimulationState = {
        ...currentOverviewSimulationState(),
        lastResult: null,
        lastError: error instanceof Error ? error.message : String(error || '未知错误'),
        updatedAt: new Date().toISOString(),
      };
      renderRoute({ background: true });
      return;
    }
    if (action === 'run-runtime-verify-correct' || action === 'run-runtime-verify-correct-cand') {
      runtimeVerifyState = {
        ...currentRuntimeVerifyState(),
        lastError: error instanceof Error ? error.message : String(error || '未知错误'),
        updatedAt: new Date().toISOString(),
      };
      renderRoute({ background: true });
      return;
    }
    showActionError(error);
  } finally {
    setFormSubmitting(form, false);
  }
});

accessForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  preferredAccessContext = {
    operator: operatorInput.value || 'console_user',
    role: roleInput.value || 'dict_admin',
  };
  saveAccessContext();
  try {
    const meta = await forceRefreshAccessMeta();
    setFlash({
      type: 'success',
      title: '访问身份已切换',
      description: `当前用户：${meta.userDisplayName || meta.userId || 'console_user'}；当前角色：${displayLabel(meta.role) || meta.role}。`,
    });
    renderRoute();
  } catch (error) {
    showActionError(error);
  }
});

operatorInput.addEventListener('change', () => {
  preferredAccessContext = {
    operator: operatorInput.value || 'console_user',
    role: roleInput.value || 'dict_admin',
  };
  syncRoleOptionsForSelectedUser(preferredAccessContext.role);
  preferredAccessContext.role = roleInput.value || 'dict_admin';
  saveAccessContext();
});

roleInput.addEventListener('change', () => {
  preferredAccessContext = {
    operator: operatorInput.value || 'console_user',
    role: roleInput.value || 'dict_admin',
  };
  saveAccessContext();
});

loadAccessContext();
loadSidebarState();
bindSidebarTreeEvents();
installConsoleDiagnostics();
publishConsoleTestHooks();
saveAccessContext();
renderRoute();
