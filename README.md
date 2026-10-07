# LumaFlow Updates

This public repository hosts release metadata and Windows installer assets for the LumaFlow desktop update service, plus a static administration console.

## 序光管理总端

入口：https://520-l-h.github.io/lumaflow-updates/admin/

首次启用：Settings → Pages → Deploy from a branch → main → /docs → Save。

- 创建与暂停/恢复邀请码，查看设备授权，延期、停用与恢复使用资格。
- 管理员密钥只保存在当前页面内存，刷新或退出后需重新输入。
- 本仓库不保存管理员密钥、签名私钥、用户授权记录、学习数据或桌面应用源码。
- 网页连接现有授权服务；管理接口仍要求管理员密钥。
- 可按邀请或设备设置 AI、同步、休闲权限，以及 1–720 小时的离线使用期限（默认 24 小时，可断网重启）。新版客户端每 15 分钟核验；离线设备按当前已签发的许可到期，机主资格保持无限期离线。
- 邀请设置支持设备数调整和新设备激活截止；操作记录显示最近 200 次管理更改。旧协议设备需要升级至 v1.0.1 才能执行新权限。
- 各列表只显示最近 200 条，授权变更在下次联网核验时生效；不删除用户学习数据。

Public files are maintained in the desktop source project's `license-server/admin-web`. Deploy these static files only; never upload server secrets or local user data.

