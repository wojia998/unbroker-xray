'use strict';
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const UUID = process.env.UUID;
const WS_PATH = process.env.WS_PATH || '/tk-unbroker';
const PORT = parseInt(process.env.PORT || '8080', 10);

if (!UUID) {
  console.error('缺少环境变量 UUID');
  process.exit(1);
}
if (!Number.isFinite(PORT) || PORT <= 0) {
  console.error('环境变量 PORT 无效');
  process.exit(1);
}
const wsPath = WS_PATH.startsWith('/') ? WS_PATH : '/' + WS_PATH;
const xrayPath = path.join(__dirname, 'xray');
const configPath = path.join(__dirname, 'config.json');

function ensureXray() {
  if (fs.existsSync(xrayPath)) return;
  console.log('未找到 xray 可执行文件，开始下载安装...');
  const result = spawnSync(process.execPath, [path.join(__dirname, 'scripts', 'install-xray.js')], { stdio: 'inherit' });
  if (result.status !== 0 || !fs.existsSync(xrayPath)) {
    console.error('xray 安装失败');
    process.exit(1);
  }
}
ensureXray();

const config = {
  log: { loglevel: 'warning' },
  inbounds: [{
    port: PORT,
    listen: '0.0.0.0',
    protocol: 'vless',
    settings: { clients: [{ id: UUID, level: 0 }], decryption: 'none' },
    streamSettings: { network: 'ws', wsSettings: { path: wsPath } }
  }],
  outbounds: [
    { protocol: 'freedom', settings: { domainStrategy: 'UseIPv4' }, tag: 'direct' },
    { protocol: 'blackhole', tag: 'blocked' }
  ]
};
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('xray 启动中：端口 ' + PORT + '，WebSocket 路径 ' + wsPath);
const child = spawn(xrayPath, ['run', '-c', configPath], { stdio: 'inherit' });
child.on('exit', (code, signal) => {
  console.error('xray 已退出，代码 ' + code + '，信号 ' + signal);
  process.exit(code === null ? 1 : code);
});
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
