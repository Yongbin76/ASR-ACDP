const { createAppConfig } = require('../lib/config');
const { createAdminApp } = require('../server');

const defaultConfig = createAppConfig();

/**
 * 功能：执行当前脚本或模块的主流程。
 * 输入：`config`（配置对象）。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function main(config = defaultConfig) {
  const smokePort = Number(process.env.ACDP_ADMIN_SMOKE_PORT || config.server.adminPort || 8788);
  const smokeHost = String(process.env.ACDP_ADMIN_SMOKE_HOST || '127.0.0.1');
  const app = createAdminApp({
    ...config,
    server: {
      ...config.server,
      host: smokeHost,
      port: smokePort,
    },
  });
  const headers = {
    'x-role': 'dict_admin',
    'x-operator': 'admin_smoke',
  };

  /**
   * 功能：处理`requestByHttp`相关逻辑。
   * 输入：`pathname`（路径名）。
   * 输出：`Promise`，解析值为当前处理结果。
   */
  async function requestByHttp(pathname) {
    const res = await fetch(`http://${smokeHost}:${smokePort}${pathname}`, {
      headers,
      redirect: 'manual',
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
   * 输入：`pathname`（路径名）。
   * 输出：`Promise`，解析值为当前处理结果。
   */
  async function requestByInject(pathname) {
    const response = await app.inject({
      method: 'GET',
      url: pathname,
      headers,
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
    results.push(await request('/admin'));
    results.push(await request('/console'));
    results.push(await request('/api/admin/dashboard'));
    results.push(await request('/api/console/overview'));
    results.push(await request('/api/console/help/integration'));
    results.push(await request('/api/runtime/current'));

    const failed = results.filter((item) => item.status >= 400 && item.pathname !== '/api/runtime/current');
    const runtimeProbe = results.find((item) => item.pathname === '/api/runtime/current');
    return {
      ok: failed.length === 0
        && runtimeProbe && runtimeProbe.status === 404
        && results.some((item) => item.pathname === '/admin' && item.status === 302),
      host: smokeHost,
      port: smokePort,
      mode,
      isolation: {
        runtimeBlocked: Boolean(runtimeProbe && runtimeProbe.status === 404),
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
