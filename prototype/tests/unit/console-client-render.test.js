const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');

const { createAppConfig } = require('../../src/lib/config');
const prepareData = require('../../src/cli/prepare-data');
const bootstrapDb = require('../../src/cli/bootstrap-db');
const buildSnapshot = require('../../src/cli/build-snapshot');
const { createPrototypeApp } = require('../../src/server');

/**
 * 功能：创建前端渲染测试使用的隔离配置。
 * 输入：无。
 * 输出：带独立 workspace 的配置对象。
 */
function createRenderTestConfig() {
  const baseConfig = createAppConfig();
  const workspaceDir = path.join(baseConfig.projectRoot, 'prototype', `workspace-unit-console-render-${Date.now()}`);
  const catalogDir = path.join(workspaceDir, 'catalog');
  const releasesDir = path.join(workspaceDir, 'releases');
  if (fs.existsSync(workspaceDir)) {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
  fs.mkdirSync(catalogDir, { recursive: true });
  fs.mkdirSync(releasesDir, { recursive: true });
  return {
    ...baseConfig,
    resolvedPaths: {
      ...baseConfig.resolvedPaths,
      workspaceDir,
      catalogDir,
      releasesDir,
      latestReleaseDir: path.join(releasesDir, 'latest'),
      databaseFile: path.join(workspaceDir, 'platform.db'),
      seedCatalogFile: path.join(catalogDir, 'seed_terms.json'),
      validationFeedInboxDir: path.join(workspaceDir, 'validation_feeds', 'inbox'),
      validationFeedArchiveDir: path.join(workspaceDir, 'validation_feeds', 'archive'),
      validationFeedErrorDir: path.join(workspaceDir, 'validation_feeds', 'error'),
    },
  };
}

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(...items) {
    items.forEach((item) => this.values.add(String(item || '')));
  }

  remove(...items) {
    items.forEach((item) => this.values.delete(String(item || '')));
  }

  toggle(item, force) {
    const normalized = String(item || '');
    if (force === true) {
      this.values.add(normalized);
      return true;
    }
    if (force === false) {
      this.values.delete(normalized);
      return false;
    }
    if (this.values.has(normalized)) {
      this.values.delete(normalized);
      return false;
    }
    this.values.add(normalized);
    return true;
  }

  contains(item) {
    return this.values.has(String(item || ''));
  }
}

class FakeElement {
  constructor(tagName, options = {}) {
    this.tagName = String(tagName || 'div').toUpperCase();
    this.id = String(options.id || '');
    this.dataset = { ...(options.dataset || {}) };
    this.style = {};
    this.classList = new FakeClassList();
    this.listeners = new Map();
    this.children = [];
    this.parentGroup = null;
    this.open = options.open === true;
    this.href = String(options.href || '');
    this.value = String(options.value || '');
    this.disabled = false;
    this.checked = false;
    this.innerHTML = '';
    this.textContent = '';
  }

  addEventListener(type, handler) {
    const key = String(type || '');
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(handler);
  }

  getAttribute(name) {
    if (name === 'id') return this.id;
    if (name === 'href') return this.href;
    if (name.startsWith('data-')) {
      const dataKey = name.replace(/^data-/, '').replace(/-([a-z])/g, (_, item) => item.toUpperCase());
      return this.dataset[dataKey] || '';
    }
    return '';
  }

  setAttribute(name, value) {
    if (name === 'id') {
      this.id = String(value || '');
      return;
    }
    if (name === 'href') {
      this.href = String(value || '');
      return;
    }
    if (name.startsWith('data-')) {
      const dataKey = name.replace(/^data-/, '').replace(/-([a-z])/g, (_, item) => item.toUpperCase());
      this.dataset[dataKey] = String(value || '');
    }
  }

  querySelectorAll(selector) {
    if (selector === 'a') {
      return this.children.filter((item) => item.tagName === 'A');
    }
    return [];
  }

  closest(selector) {
    if (selector === '[data-nav-group]') {
      return this.parentGroup;
    }
    return null;
  }
}

/**
 * 功能：构造控制台前端执行所需的最小 DOM 环境。
 * 输入：当前测试路由路径。
 * 输出：包含 document/window/location 等对象的测试浏览器环境。
 */
function createFakeBrowserEnvironment(routePathname) {
  const operatorInput = new FakeElement('select', { id: 'operatorInput', value: 'console_user' });
  const roleInput = new FakeElement('select', { id: 'roleInput', value: 'dict_admin' });
  const accessForm = new FakeElement('form', { id: 'accessForm' });
  const app = new FakeElement('main', { id: 'app' });
  const pageTitle = new FakeElement('h1', { id: 'pageTitle' });
  const identityMeta = new FakeElement('div', { id: 'identityMeta' });
  const sidebarToggle = new FakeElement('button', { id: 'sidebarToggle' });
  const shell = new FakeElement('div');
  const body = new FakeElement('body');
  const mainNav = new FakeElement('nav', { id: 'mainNav' });

  const navGroups = [];
  const navAnchors = [];
  const navConfig = [
    { group: 'overview', items: [{ path: '/', label: '总览' }] },
    { group: 'dictionary', items: [{ path: '/dictionary/terms' }, { path: '/dictionary/import-jobs' }, { path: '/dictionary/reviews?targetType=term' }, { path: '/dictionary/config' }] },
    { group: 'validation', items: [{ path: '/validation/cases' }] },
    { group: 'releases', items: [{ path: '/releases' }, { path: '/releases?view=review' }, { path: '/releases?view=canary' }, { path: '/releases?view=risk' }, { path: '/releases?view=rollback' }] },
    { group: 'runtime', items: [{ path: '/runtime' }, { path: '/runtime-node-registry' }, { path: '/runtime-nodes' }, { path: '/runtime-verify' }] },
    { group: 'system', items: [{ path: '/system' }, { path: '/users' }, { path: '/roles' }, { path: '/permissions' }, { path: '/governance-policies' }] },
    { group: 'help', items: [{ path: '/help?pageGroup=pages' }, { path: '/help?pageGroup=flows' }, { path: '/help?pageGroup=ops' }, { path: '/help?pageGroup=apis' }, { path: '/help?pageGroup=troubleshooting' }] },
  ];

  navConfig.forEach((groupConfig) => {
    const group = new FakeElement('details', { dataset: { navGroup: groupConfig.group }, open: true });
    group.style.display = '';
    groupConfig.items.forEach((item) => {
      const anchor = new FakeElement('a', {
        href: item.href || `/console${item.path === '/' ? '' : item.path}`,
        dataset: { nav: item.path },
      });
      anchor.parentGroup = group;
      anchor.style.display = '';
      group.children.push(anchor);
      navAnchors.push(anchor);
    });
    navGroups.push(group);
  });

  const elementsById = new Map([
    ['operatorInput', operatorInput],
    ['roleInput', roleInput],
    ['accessForm', accessForm],
    ['app', app],
    ['pageTitle', pageTitle],
    ['identityMeta', identityMeta],
    ['sidebarToggle', sidebarToggle],
    ['mainNav', mainNav],
  ]);

  const document = {
    body,
    hidden: false,
    getElementById(id) {
      return elementsById.get(String(id || '')) || null;
    },
    createElement(tagName) {
      if (String(tagName || '').toLowerCase() === 'template') {
        return {
          innerHTML: '',
          content: {
            querySelectorAll() {
              return [];
            },
          },
        };
      }
      return new FakeElement(tagName);
    },
    querySelector(selector) {
      if (selector === '.shell') return shell;
      if (selector === '#mainNav') return mainNav;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '#mainNav a') {
        return navAnchors;
      }
      if (selector === '#mainNav [data-nav-group]') {
        return navGroups;
      }
      return [];
    },
    addEventListener() {},
  };

  const storage = new Map();
  const localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(String(key), String(value));
    },
    removeItem(key) {
      storage.delete(String(key));
    },
  };

  const location = {
    href: `http://localhost/console${routePathname === '/' ? '' : routePathname}`,
  };

  const history = {
    pushState(_state, _title, pathname) {
      const target = new URL(String(pathname || '/console'), 'http://localhost');
      location.href = target.href;
    },
  };

  const window = {
    document,
    location,
    history,
    localStorage,
    listeners: new Map(),
    addEventListener(type, handler) {
      const key = String(type || '');
      if (!this.listeners.has(key)) {
        this.listeners.set(key, []);
      }
      this.listeners.get(key).push(handler);
    },
    confirm() {
      return true;
    },
  };

  return {
    operatorInput,
    roleInput,
    accessForm,
    app,
    pageTitle,
    identityMeta,
    sidebarToggle,
    shell,
    document,
    window,
    location,
    history,
    localStorage,
    emitWindowEvent(type, payload) {
      const handlers = window.listeners.get(String(type || '')) || [];
      handlers.forEach((handler) => handler(payload));
    },
    consoleMessages: [],
    console: {
      log() {},
      info() {},
      warn() {},
      error(...args) {
        this.__messages.push(args.map((item) => String(item)).join(' '));
      },
      __messages: [],
    },
  };
}

/**
 * 功能：将 `app.inject()` 包装成前端可用的 `fetch` 响应对象。
 * 输入：应用实例。
 * 输出：兼容前端 `fetchJson()` 的异步函数。
 */
function createInjectFetch(app) {
  return async function fetchStub(url, options = {}) {
    const target = new URL(String(url || '/'), 'http://localhost');
    const response = await app.inject({
      method: options.method || 'GET',
      url: `${target.pathname}${target.search}`,
      headers: { ...(options.headers || {}) },
      body: options.body,
    });
    const headers = {
      get(name) {
        const expected = String(name || '').toLowerCase();
        const key = Object.keys(response.headers || {}).find((item) => String(item).toLowerCase() === expected);
        return key ? response.headers[key] : null;
      },
    };
    return {
      ok: response.statusCode < 400,
      status: response.statusCode,
      headers,
      async text() {
        return String(response.body || '');
      },
    };
  };
}

/**
 * 功能：等待控制台页面完成首次渲染。
 * 输入：页面根元素、标题元素和超时时间。
 * 输出：包含是否完成及耗时的对象。
 */
async function waitForRender(appElement, titleElement, timeoutMs = 2000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const html = String(appElement.innerHTML || '');
    const title = String(titleElement.textContent || '');
    if (html && !html.includes('正在加载') && !html.includes('页面加载失败') && title && title !== 'ACDP 后台') {
      return {
        ok: true,
        durationMs: Date.now() - startedAt,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return {
    ok: false,
    durationMs: Date.now() - startedAt,
  };
}

test('console client major routes finish rendering without staying in loading state', { timeout: 30000 }, async (t) => {
  const config = createRenderTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('console render baseline build', config);
  const app = createPrototypeApp({
    ...config,
    server: {
      ...config.server,
      host: '127.0.0.1',
      port: 8850,
    },
  });

  const appScriptPath = path.join(config.projectRoot, 'console', 'client', 'app.js');
  const appScriptSource = fs.readFileSync(appScriptPath, 'utf8');
  const routes = [
    { path: '/', metricPath: '/', title: '工作台' },
    { path: '/runtime', metricPath: '/runtime', title: '运行治理' },
    { path: '/runtime-node-registry', metricPath: '/runtime-node-registry', title: '节点备案' },
    { path: '/runtime-nodes', metricPath: '/runtime-nodes', title: '运行节点' },
    { path: '/runtime-verify', metricPath: '/runtime-verify', title: '运行验证' },
    { path: '/system', metricPath: '/system', title: '系统管理' },
    { path: '/users', metricPath: '/users', title: '用户管理' },
    { path: '/roles', metricPath: '/roles', title: '角色管理' },
    { path: '/permissions', metricPath: '/permissions', title: '权限管理' },
    { path: '/governance-policies', metricPath: '/governance-policies', title: '治理策略' },
    { path: '/dictionary/config', metricPath: '/dictionary/config', title: '基础配置' },
    { path: '/dictionary/terms', metricPath: '/dictionary/terms', title: '词典记录' },
    { path: '/dictionary/import-jobs', metricPath: '/dictionary/import-jobs', title: '批量导入' },
    { path: '/dictionary/reviews', metricPath: '/dictionary/reviews', title: '词条审核' },
    { path: '/dictionary/reviews?view=pinyin', metricPath: '/dictionary/reviews', title: '拼音审核' },
    { path: '/releases', metricPath: '/releases', title: '版本列表' },
    { path: '/releases?view=review', metricPath: '/releases', title: '发布审核' },
    { path: '/releases?view=canary', metricPath: '/releases', title: '灰度发布' },
    { path: '/releases?view=risk', metricPath: '/releases', title: '发布后风险' },
    { path: '/releases?view=rollback', metricPath: '/releases', title: '回滚记录' },
    { path: '/validation/cases', metricPath: '/validation/cases', title: '验证样本' },
    { path: '/help?pageGroup=pages', metricPath: '/help', title: '页面手册' },
    { path: '/help/integration', metricPath: '/help/integration', title: '帮助详情' },
  ];

  try {
    for (const route of routes) {
      await t.test(route.path, async (subtest) => {
        try {
          const fakeBrowser = createFakeBrowserEnvironment(route.path);
          const context = vm.createContext({
            console: fakeBrowser.console,
            fetch: createInjectFetch(app),
            window: fakeBrowser.window,
            document: fakeBrowser.document,
            location: fakeBrowser.location,
            history: fakeBrowser.history,
            localStorage: fakeBrowser.localStorage,
            URL,
            URLSearchParams,
            FormData,
            setTimeout,
            clearTimeout,
            queueMicrotask,
            setInterval() {
              return 1;
            },
            clearInterval() {},
          });

          vm.runInContext(appScriptSource, context, { filename: appScriptPath });
          const result = await waitForRender(fakeBrowser.app, fakeBrowser.pageTitle);
          subtest.diagnostic(`rendered ${route.path} in ${result.durationMs}ms`);
          assert.equal(result.ok, true, `route ${route.path} remained in loading state`);
          assert.equal(fakeBrowser.pageTitle.textContent, route.title);
          assert.ok(!String(fakeBrowser.operatorInput.innerHTML || '').includes('加载中'));
          assert.ok(!String(fakeBrowser.app.innerHTML || '').includes('页面加载失败'));
          assert.ok(!String(fakeBrowser.app.innerHTML || '').includes('正在加载'));
          const diagnostics = fakeBrowser.window.__acdpConsoleDiagnostics || {};
          const routeLoads = Array.isArray(diagnostics.routeLoads) ? diagnostics.routeLoads : [];
          const latestRouteLoad = routeLoads[routeLoads.length - 1] || null;
          assert.ok(latestRouteLoad, `route ${route.path} missing route load metric`);
          assert.equal(latestRouteLoad.path, route.metricPath || route.path);
          assert.equal(latestRouteLoad.ok, true);
          assert.ok(Number.isFinite(latestRouteLoad.durationMs));
          assert.ok(latestRouteLoad.durationMs >= 0);
          assert.ok(Array.isArray(diagnostics.startupErrors));
          assert.ok(Array.isArray(diagnostics.consoleErrors));
          assert.equal(diagnostics.startupErrors.length, 0);
          assert.equal(diagnostics.consoleErrors.length, 0);
          if (route.path === '/dictionary/terms') {
            const html = String(fakeBrowser.app.innerHTML || '');
            assert.ok(html.includes('surface-block-terms-action'));
            assert.ok(html.includes('surface-block-terms-filter'));
            assert.ok(html.includes('surface-block-terms-results'));
            assert.ok(html.indexOf('批量操作与导出') < html.indexOf('筛选条件'));
          }
        } catch (error) {
          throw new Error(`route ${route.path} failed: ${error.message}`);
        }
      });
    }
  } finally {
    await app.stop();
  }
});

test('console client diagnostics capture startup errors and console errors', { timeout: 30000 }, async () => {
  const config = createRenderTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('console render diagnostics build', config);
  const app = createPrototypeApp({
    ...config,
    server: {
      ...config.server,
      host: '127.0.0.1',
      port: 8851,
    },
  });

  const appScriptPath = path.join(config.projectRoot, 'console', 'client', 'app.js');
  const appScriptSource = fs.readFileSync(appScriptPath, 'utf8');
  const fakeBrowser = createFakeBrowserEnvironment('/');

  try {
    const context = vm.createContext({
      console: fakeBrowser.console,
      fetch: createInjectFetch(app),
      window: fakeBrowser.window,
      document: fakeBrowser.document,
      location: fakeBrowser.location,
      history: fakeBrowser.history,
      localStorage: fakeBrowser.localStorage,
      URL,
      URLSearchParams,
      FormData,
      setTimeout,
      clearTimeout,
      queueMicrotask,
      setInterval() {
        return 1;
      },
      clearInterval() {},
    });

    vm.runInContext(appScriptSource, context, { filename: appScriptPath });
    const renderResult = await waitForRender(fakeBrowser.app, fakeBrowser.pageTitle);
    assert.equal(renderResult.ok, true);

    const hooks = fakeBrowser.window.__acdpConsoleTestHooks || {};
    assert.equal(typeof hooks.consoleDiagnosticsState, 'function');
    const beforeState = hooks.consoleDiagnosticsState();
    assert.ok(Array.isArray(beforeState.consoleErrors));
    assert.ok(Array.isArray(beforeState.startupErrors));

    fakeBrowser.console.error('frontend-startup-error');
    fakeBrowser.emitWindowEvent('error', {
      message: 'startup boom',
      filename: 'app.js',
      lineno: 12,
      colno: 8,
    });
    fakeBrowser.emitWindowEvent('unhandledrejection', {
      reason: new Error('promise boom'),
    });

    const diagnostics = hooks.consoleDiagnosticsState();
    assert.ok(diagnostics.consoleErrors.some((entry) => (entry.messages || []).some((item) => String(item).includes('frontend-startup-error'))));
    assert.ok(diagnostics.startupErrors.some((entry) => entry.type === 'error' && String(entry.message).includes('startup boom')));
    assert.ok(diagnostics.startupErrors.some((entry) => entry.type === 'unhandledrejection' && String(entry.message).includes('promise boom')));
  } finally {
    await app.stop();
  }
});
