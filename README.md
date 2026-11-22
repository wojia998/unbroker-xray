# unbroker-xray

在 Unbroker Cloud 免费套餐上运行的 Node.js xray 服务：VLESS over WebSocket。

## 说明

- 启动脚本为 `server.js`，从环境变量 `UUID`、`WS_PATH`、`PORT` 读取配置，生成 xray 配置并启动 xray。
- 安装时（`postinstall`）由 `scripts/install-xray.js` 下载 xray-core v26.10.31（`Xray-linux-64.zip`），仅用 Node.js 内置模块解压出 `xray` 可执行文件。
- **本仓库不存放任何密钥、UUID 或密码。** `UUID` 与 `WS_PATH` 必须在部署平台的环境变量中设置。

## 部署

1. 在 Unbroker 中从本仓库创建免费服务。
2. 设置环境变量 `UUID`（随机生成的 UUID）和 `WS_PATH`（例如 `/tk-unbroker`）。
3. 部署并使用分配的域名访问。
