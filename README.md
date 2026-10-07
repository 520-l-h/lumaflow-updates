# LumaFlow Updates

This public repository hosts release metadata and Windows installer assets for the LumaFlow desktop update service, plus a static administration console.

## 序光管理总端

入口：https://520-l-h.github.io/lumaflow-updates/admin/

首次启用：Settings → Pages → Deploy from a branch → main → /docs → Save。

- 创建与撤销邀请码，查看设备授权，延长或停用使用资格。
- 管理员密钥只保存在当前页面内存，刷新或退出后需重新输入。
- 本仓库不保存管理员密钥、签名私钥、用户授权记录、学习数据或桌面应用源码。
- 网页连接现有授权服务；管理接口仍要求管理员密钥。
- 各列表只显示最近 200 条，停用在客户端下次联网验证时生效。

Public files are maintained in the desktop source project's `license-server/admin-web`. Deploy these static files only; never upload server secrets or local user data.
