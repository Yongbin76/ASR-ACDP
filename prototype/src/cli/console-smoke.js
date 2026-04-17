const { createAppConfig } = require('../lib/config');
const { createPrototypeApp } = require('../server');

const defaultConfig = createAppConfig();

/**
 * 功能：在宿主环境启动一个临时 console 服务并执行基础 smoke 验证。
 * 输入：可选配置对象。
 * 输出：smoke 结果对象。
 */
async function main(config = defaultConfig) {
  const smokePort = Number(process.env.ACDP_CONSOLE_SMOKE_PORT || 8799);
  const smokeHost = String(process.env.ACDP_CONSOLE_SMOKE_HOST || '127.0.0.1');
  const app = createPrototypeApp({
    ...config,
    server: {
      ...config.server,
      host: smokeHost,
      port: smokePort,
    },
  });
  const headers = {
    'x-role': 'dict_admin',
    'x-operator': 'console_smoke',
  };

  /**
   * 功能：通过真实 HTTP 访问 smoke 路径。
   * 输入：`pathname` 控制台路径。
   * 输出：包含状态码、内容类型和响应体的结果对象。
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
   * 功能：在无法监听端口时，通过应用注入模式执行 smoke。
   * 输入：`pathname` 控制台路径。
   * 输出：包含状态码、内容类型和响应体的结果对象。
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
    results.push(await request('/api/console/overview'));
    results.push(await request('/api/console/terms?pageSize=3'));
    results.push(await request('/api/console/import/templates'));
    results.push(await request('/api/console/help/integration'));
    results.push(await request('/api/console/releases?pageSize=3'));

    const failed = results.filter((item) => item.status >= 400);
    const adminEntry = results.find((item) => item.pathname === '/admin');
    const consoleEntry = results.find((item) => item.pathname === '/console');
    return {
      ok: failed.length === 0,
      host: smokeHost,
      port: smokePort,
      mode,
      entryIsolation: {
        adminOk: Boolean(adminEntry && [200, 302].includes(adminEntry.status)),
        consoleOk: Boolean(consoleEntry && consoleEntry.status === 200),
        adminIndependentFromConsole: Boolean(
          adminEntry
          && consoleEntry
          && adminEntry.status === 302
          && String(consoleEntry.body || '').includes('ACDP 后台')
        ),
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
