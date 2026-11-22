'use strict';
// 仅使用 Node.js 内置模块：下载 xray-core v26.10.31 并解压出 xray 可执行文件。
// 不依赖 unzip / python / 第三方解压库。
const fs = require('fs');
const https = require('https');
const path = require('path');
const zlib = require('zlib');

const VERSION = 'v26.10.31';
const URL = 'https://github.com/XTLS/Xray-core/releases/download/' + VERSION + '/Xray-linux-64.zip';
const appDir = path.join(__dirname, '..');
const xrayPath = path.join(appDir, 'xray');
const zipPath = path.join(appDir, 'xray.zip');

function download(url, redirects) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'unbroker-xray-installer' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirects <= 0) return reject(new Error('重定向次数过多'));
        res.resume();
        return resolve(download(res.headers.location, redirects - 1));
      }
      if (res.statusCode !== 200) return reject(new Error('下载失败，HTTP ' + res.statusCode));
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// 最小 ZIP 解析：只提取名为 xray 的条目，支持 stored(0) 与 deflate(8)。
function extractXray(zip) {
  let eocd = -1;
  for (let i = zip.length - 22; i >= 0; i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('未找到 ZIP 结束记录');
  const total = zip.readUInt16LE(eocd + 10);
  let offset = zip.readUInt32LE(eocd + 16);
  for (let n = 0; n < total; n++) {
    if (zip.readUInt32LE(offset) !== 0x02014b50) throw new Error('中央目录损坏');
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const nameLen = zip.readUInt16LE(offset + 28);
    const extraLen = zip.readUInt16LE(offset + 30);
    const commentLen = zip.readUInt16LE(offset + 32);
    const localOffset = zip.readUInt32LE(offset + 42);
    const name = zip.toString('utf8', offset + 46, offset + 46 + nameLen);
    offset += 46 + nameLen + extraLen + commentLen;
    if (name !== 'xray') continue;
    if (zip.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('本地文件头损坏');
    const localNameLen = zip.readUInt16LE(localOffset + 26);
    const localExtraLen = zip.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const compressed = zip.subarray(dataStart, dataStart + compressedSize);
    if (method === 0) return compressed;
    if (method === 8) return zlib.inflateRawSync(compressed);
    throw new Error('不支持的 ZIP 压缩方式 ' + method);
  }
  throw new Error('ZIP 中未找到 xray 文件');
}

async function main() {
  try {
    const stat = fs.existsSync(xrayPath) ? fs.statSync(xrayPath) : null;
    if (stat && stat.size > 1000000) {
      console.log('xray 已存在，跳过下载');
      return;
    }
    console.log('正在下载 ' + URL);
    const zip = await download(URL, 5);
    console.log('下载完成，大小 ' + zip.length + ' 字节，正在解压...');
    const binary = extractXray(zip);
    fs.writeFileSync(xrayPath, binary);
    fs.chmodSync(xrayPath, 0o755);
    console.log('xray 已安装到 ' + xrayPath + '，大小 ' + binary.length + ' 字节');
  } catch (err) {
    console.error('xray 安装失败：' + err.message);
    process.exit(1);
  } finally {
    if (fs.existsSync(zipPath)) { try { fs.unlinkSync(zipPath); } catch (e) {} }
  }
}
main();
