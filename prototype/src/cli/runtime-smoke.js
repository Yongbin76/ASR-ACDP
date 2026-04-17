const { createAppConfig } = require('../lib/config');
const { createRuntimeApp } = require('../server');

const defaultConfig = createAppConfig();

/**
 * 功能：执行当前脚本或模块的主流程。
 * 输入：`config`（配置对象）。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function main(config = defaultConfig) {
  const smokePort = Number(process.env.ACDP_RUNTIME_SMOKE_PORT || config.server.runtimePort || 8787);
  const smokeHost = String(process.env.ACDP_RUNTIME_SMOKE_HOST || '127.0.0.1');
  const runtimeHeaders = {};
  const runtimeToken = String((config.auth || {}).runtimeBearerToken || '').trim();
  if (runtimeToken) {
    runtimeHeaders.authorization = `Bearer ${runtimeToken}`;
  }
  const app = createRuntimeApp({
    ...config,
    server: {
      ...config.server,
      host: smokeHost,
      port: smokePort,
    },
  });

  /**
   * 功能：处理`requestByHttp`相关逻辑。
   * 输入：`pathname`（路径名）、`options`（扩展选项）。
   * 输出：`Promise`，解析值为当前处理结果。
   */
  async function requestByHttp(pathname, options = {}) {
    const res = await fetch(`http://${smokeHost}:${smokePort}${pathname}`, {
      method: options.method || 'GET',
      headers: {
        ...(options.headers || {}),
      },
      body: options.body || undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {}
    return {
      pathname,
      status: res.status,
      contentType: res.headers.get('content-type') || '',
      body: json || text,
    };
  }

  /**
   * 功能：处理`requestByInject`相关逻辑。
   * 输入：`pathname`（路径名）、`options`（扩展选项）。
   * 输出：`Promise`，解析值为当前处理结果。
   */
  async function requestByInject(pathname, options = {}) {
    const response = await app.inject({
      method: options.method || 'GET',
      url: pathname,
      headers: options.headers || {},
      body: options.body || null,
    });
    return {
      pathname,
      status: response.statusCode,
      contentType: response.headers['content-type'] || '',
      body: response.json || response.body,
    };
  }

  try {
    let request = requestByHttp;
    let mode = 'http';
    try {
      await app.start();
    } catch (error) {
      if (error && error.code === 'EPERM') {
        mode = 'inject';
        request = requestByInject;
      } else {
        throw error;
      }
    }

    const results = [];
    results.push(await request('/health'));
    results.push(await request('/api/runtime/current'));
    results.push(await request('/api/runtime/stats'));
    results.push(await request('/api/runtime/correct', {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        ...runtimeHeaders,
      },
      body: JSON.stringify({ text: '我想咨询旗顺路和工商认定。' }),
    }));
    results.push(await request('/admin'));

    const failed = results.filter((item) => item.status >= 400 && item.pathname !== '/admin');
    const adminProbe = results.find((item) => item.pathname === '/admin');
    const correction = results.find((item) => item.pathname === '/api/runtime/correct');
    return {
      ok: Boolean(
        failed.length === 0
        && adminProbe
        && adminProbe.status === 404
        && correction
        && correction.body
        && correction.body.correctedText
      ),
      host: smokeHost,
      port: smokePort,
      mode,
      isolation: {
        adminBlocked: Boolean(adminProbe && adminProbe.status === 404),
      },
      results,
    };
  } finally {
    await app.stop();
  }
}

if (require.main === module) {
  main()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  main,
};
