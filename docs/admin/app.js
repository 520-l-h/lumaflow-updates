const API = 'https://workbench-license-beta.3473645620.workers.dev'
const $ = id => document.getElementById(id)
let token = '', generation = 0, pending = false, activeTab = 'devices', target = null
let invites = [], devices = [], updatedAt = null, editTarget = null
const defaultPolicy = () => ({ offlineHours: 24, features: ['ai', 'sync', 'leisure'] })
const featureLabels = { ai: 'AI', sync: '同步', leisure: '休闲' }
const policyText = policy => `离线 ${policy.offlineHours} 小时 · ${policy.features.map(feature => featureLabels[feature]).join(' / ') || '仅基础学习'}`
const date = value => value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Shanghai' }).format(new Date(value)) : '—'
const inviteFor = device => invites.find(invite => invite.id === device.invite_id)
const deviceStatus = device => device.status !== 'active' || (device.type !== 'owner' && (device.invite_status ?? inviteFor(device)?.status) === 'revoked') ? 'revoked' : device.type === 'owner' ? 'active' : Date.parse(device.expires_at) <= Date.now() ? 'expired' : Date.parse(device.expires_at) - Date.now() <= 7 * 86400000 ? 'expiring' : 'active'
const labels = { active: '有效', expiring: '即将到期', expired: '已到期', revoked: '已停用' }
const errors = { unauthorized: '管理员密钥无效，请重新输入。', 'origin-not-allowed': '当前网页地址未被授权，请使用正式管理网址。', 'invalid-input': '输入不符合要求，请检查天数、设备数和备注。', 'not-found': '记录不存在或已停用，请刷新后重试。', 'owner-does-not-expire': '机主资格没有到期日，无需延期。', 'server-error': '授权服务暂时不可用，请稍后重试。', 'server-unconfigured': '授权服务配置不完整，请检查服务端配置。' }
function notice(message, error = false) { $('notice').textContent = message; $('notice').className = error ? 'notice error' : 'notice'; $('notice').hidden = !message }
Object.assign(errors, { 'owner-protected': '机主设备受保护，不能在这里停用或收回功能。', 'quota-below-used': '设备上限不能少于已激活的数量，请刷新后重新设置。' })
function busy(value) { pending = value; for (const button of document.querySelectorAll('#console-view button, dialog button, dialog input, dialog select')) button.disabled = value; $('logout-button').disabled = false; if (!value) updateInheritedPolicy() }
function logout() {
  generation++; token = ''; pending = false; invites = []; devices = []; target = null; editTarget = null; updatedAt = null
  $('login-view').hidden = false; $('console-view').hidden = true; $('admin-token').value = ''; $('created-code').value = ''; $('login-error').textContent = ''
  $('devices-body').replaceChildren(); $('invites-body').replaceChildren(); $('search-input').value = ''; $('status-filter').value = 'all'
  $('audit-body').replaceChildren(); $('policy-form').reset()
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close()
  busy(false); $('admin-token').focus()
}
async function request(path, data = {}) {
  const response = await fetch(`${API}/api/admin/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-license-admin-token': token }, body: JSON.stringify(data), cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(15000) })
  const result = await response.json()
  if (!response.ok) { const error = new Error(errors[result.error] ?? `操作失败（${response.status}），请刷新后重试。`); error.code = result.error; throw error }
  return result
}
const message = error => error.name === 'TimeoutError' || error.name === 'AbortError' ? '请求超时。若刚才进行了更改，请先刷新确认结果，避免重复操作。' : error instanceof TypeError ? '无法连接授权服务，请检查网络后重试。若刚才进行了更改，请先刷新确认结果。' : error.message
async function reload() {
  const current = generation
  const [invitationData, deviceData] = await Promise.all([request('invites/list'), request('entitlements/list')])
  if (current !== generation || !token) return false
  invites = invitationData.invites; devices = deviceData.entitlements; updatedAt = new Date().toISOString(); render(); return true
}
function textCell(row, value) { const cell = row.insertCell(); cell.textContent = value; return cell }
function badgeCell(row, status) { const cell = row.insertCell(); const badge = document.createElement('span'); badge.className = `badge ${status}`; badge.textContent = labels[status] ?? status; cell.append(badge) }
function nameCell(row, title, identifier) { const cell = row.insertCell(); const name = document.createElement('strong'); name.textContent = title; const detail = document.createElement('span'); detail.className = 'identifier'; detail.textContent = identifier; cell.append(name, detail) }
function action(cell, label, callback, danger = false) { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; if (danger) button.className = 'danger'; button.disabled = pending; button.addEventListener('click', callback); cell.append(button) }
function empty(tbody, text) { const row = tbody.insertRow(); const cell = row.insertCell(); cell.colSpan = 6; cell.className = 'empty'; cell.textContent = text }
function render() {
  const counts = devices.map(deviceStatus)
  $('active-count').textContent = counts.filter(status => status === 'active' || status === 'expiring').length
  $('expiring-count').textContent = counts.filter(status => status === 'expiring').length
  $('invite-count').textContent = invites.filter(invite => invite.status === 'active').length
  $('updated-at').textContent = date(updatedAt)
  const query = $('search-input').value.trim().toLowerCase(), filter = $('status-filter').value
  const deviceRows = devices.filter(device => [device.id, device.installation_id, device.invite_id, device.note, inviteFor(device)?.note].join(' ').toLowerCase().includes(query) && (filter === 'all' || (filter === 'active' ? ['active', 'expiring'].includes(deviceStatus(device)) : deviceStatus(device) === filter)))
  const inviteRows = invites.filter(invite => [invite.id, invite.note].join(' ').toLowerCase().includes(query) && (filter === 'all' || invite.status === filter))
  $('devices-body').replaceChildren(); $('invites-body').replaceChildren()
  for (const device of deviceRows) {
    const row = $('devices-body').insertRow(), status = deviceStatus(device)
    nameCell(row, device.note || inviteFor(device)?.note || '未备注的设备', device.installation_id)
    const detail = document.createElement('span'); detail.className = 'policy-summary'; detail.textContent = device.type === 'owner' ? '全部功能 · 离线不限时' : policyText(device.policy ?? defaultPolicy()); row.cells[0].append(detail)
    if (device.protocol_version === 1) { const warning = document.createElement('span'); warning.className = 'policy-summary legacy'; warning.textContent = '旧版客户端 · 请升级以执行新权限规则'; row.cells[0].append(warning) }
    badgeCell(row, status); textCell(row, device.type === 'owner' ? '机主 · 永久' : '朋友测试'); textCell(row, device.type === 'owner' ? '永久有效' : date(device.expires_at)); textCell(row, date(device.last_verified_at))
    const cell = row.insertCell(); cell.className = 'row-actions'
    if (device.status === 'active' && status !== 'revoked' && device.type !== 'owner') action(cell, '延期', () => openExtend(device))
    if (device.type !== 'owner') {
      action(cell, '权限', () => openPolicy('entitlements', device))
      if (device.status === 'active') action(cell, '停用', () => revoke('entitlements', device.id, device.note || inviteFor(device)?.note || device.installation_id), true)
      else action(cell, '恢复', () => restore('entitlements', device.id))
    } else cell.textContent = '机主保护'
  }
  for (const invite of inviteRows) {
    const row = $('invites-body').insertRow()
    nameCell(row, invite.note || '未备注的邀请', invite.id); badgeCell(row, invite.status); textCell(row, `${invite.duration_days} 天`); textCell(row, `${invite.activation_count} / ${invite.max_activations}`); textCell(row, date(invite.created_at))
    const detail = document.createElement('span'); detail.className = 'policy-summary'; detail.textContent = `${policyText(invite.policy ?? defaultPolicy())} · 激活截止：${invite.activation_expires_at ? date(invite.activation_expires_at) : '不限'}`; row.cells[0].append(detail)
    const cell = row.insertCell()
    action(cell, '设置', () => openPolicy('invites', invite))
    if (invite.status === 'active') action(cell, '撤销', () => revoke('invites', invite.id, invite.note || invite.id), true)
    else action(cell, '恢复', () => restore('invites', invite.id))
  }
  if (!deviceRows.length) empty($('devices-body'), devices.length ? '没有匹配的设备，请调整搜索条件。' : '还没有激活设备。创建邀请码并让朋友激活工作台后，会在这里显示。')
  if (!inviteRows.length) empty($('invites-body'), invites.length ? '没有匹配的邀请码，请调整搜索条件。' : '还没有邀请码。点击「创建邀请码」发出第一份邀请。')
  $('result-count').textContent = `显示 ${activeTab === 'devices' ? deviceRows.length : inviteRows.length} 条`
}
async function perform(path, data, successText) {
  if (pending || !token) return
  const current = generation; busy(true); notice('')
  try {
    await request(path, data)
    if (current !== generation) return
    try { if (await reload()) notice(successText) } catch (error) { if (current === generation) notice(`${successText} 列表刷新失败：${message(error)}`, true) }
  } catch (error) { if (current === generation) { if (error.code === 'unauthorized') logout(); ($('console-view').hidden ? $('login-error') : $('notice')).textContent = message(error); if (!$('console-view').hidden) notice(message(error), true) } }
  finally { if (current === generation) busy(false) }
}
async function revoke(kind, id, name) {
  const description = kind === 'invites' ? '撤销后，该邀请码不能再激活；其普通测试设备会在下次联网验证时停止使用。机主资格不受邀请码撤销影响。' : '停用后，该设备会在下次联网验证时停止使用。此操作不删除学习数据。'
  if (!window.confirm(`确认${kind === 'invites' ? '暂停邀请' : '停用设备'}「${name}」？\n\n${description}\n\n联网设备每 15 分钟核验；离线设备最迟在现有离线授权到期后停止。可在管理端恢复。`)) return
  await perform(`${kind}/revoke`, { id }, '已提交停用，设备下次联网验证时生效。')
}
function openExtend(device) { target = device; $('extend-description').textContent = `${inviteFor(device)?.note || '该设备'} · 当前到期：${date(device.expires_at)}`; $('extend-days').value = '7'; $('extend-error').textContent = ''; $('extend-dialog').showModal() }
async function restore(kind, id) { await perform(`${kind}/restore`, { id }, '已恢复。设备联网核验后领取授权；单独停用的设备仍需单独恢复。') }
function localDateValue(value) { if (!value) return ''; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
function updateInheritedPolicy() {
  const inherited = editTarget?.kind === 'entitlements' && $('policy-inherit').checked
  for (const input of document.querySelectorAll('#policy-options input')) input.disabled = pending || inherited
}
function openPolicy(kind, row) {
  editTarget = { kind, row }; const policy = row.policy ?? defaultPolicy()
  $('policy-title').textContent = kind === 'invites' ? '邀请码设置' : '设备权限'
  $('policy-description').textContent = kind === 'invites' ? '默认权限会传给该邀请下未单独设置的设备。激活截止仅限制新设备激活。' : '单独设置本机权限，或继续跟随邀请码的默认权限。'
  $('policy-note').value = row.note ?? ''; $('policy-hours').value = policy.offlineHours
  for (const input of document.querySelectorAll('#policy-features input')) input.checked = policy.features.includes(input.value)
  $('policy-inherit-row').hidden = kind !== 'entitlements'; $('policy-inherit').checked = row.policyInherited !== false
  $('policy-invite-fields').hidden = kind !== 'invites'; $('policy-max').value = row.max_activations ?? 1
  $('policy-expiry').value = localDateValue(row.activation_expires_at); $('policy-error').textContent = ''; updateInheritedPolicy(); $('policy-dialog').showModal()
}
$('policy-inherit').addEventListener('change', updateInheritedPolicy)
$('policy-form').addEventListener('submit', async event => {
  event.preventDefault(); if (pending || !editTarget) return
  const { kind, row } = editTarget, current = generation
  const policy = kind === 'entitlements' && $('policy-inherit').checked ? null : { offlineHours: Number($('policy-hours').value), features: [...document.querySelectorAll('#policy-features input:checked')].map(input => input.value) }
  const data = { id: row.id, policy, note: $('policy-note').value.trim(), ...(kind === 'invites' ? { maxActivations: Number($('policy-max').value), activationExpiresAt: $('policy-expiry').value ? new Date($('policy-expiry').value).toISOString() : null } : {}) }
  busy(true); $('policy-error').textContent = ''
  try { await request(`${kind}/update`, data); if (current !== generation) return; $('policy-dialog').close(); await reload(); notice('设置已保存。设备下次联网核验时生效；已有离线授权在其原期限内继续有效。') }
  catch (error) { if (current === generation) { if (error.code === 'unauthorized') { logout(); $('login-error').textContent = message(error) } else $('policy-error').textContent = message(error) } }
  finally { if (current === generation) busy(false) }
})
$('audit-button').addEventListener('click', async () => {
  if (pending) return; const current = generation; busy(true)
  try {
    const { events } = await request('audit/list'); if (current !== generation) return
    $('audit-body').replaceChildren()
    const actions = { 'invites.create': '创建邀请', 'invites.update': '修改邀请设置', 'invites.revoke': '暂停邀请', 'invites.restore': '恢复邀请', 'entitlements.update': '修改设备权限', 'entitlements.revoke': '停用设备', 'entitlements.restore': '恢复设备', 'entitlements.extend': '设备延期', 'entitlements.grant-owner': '授予机主资格' }
    for (const event of events) { const row = $('audit-body').insertRow(); textCell(row, date(event.created_at)); textCell(row, actions[event.action] ?? event.action); textCell(row, event.target_id); textCell(row, event.details_json) }
    if (!events.length) empty($('audit-body'), '还没有操作记录。')
    $('audit-dialog').showModal()
  } catch (error) { if (current === generation) notice(message(error), true) }
  finally { if (current === generation) busy(false) }
})
function switchTab(tab) {
  activeTab = tab; $('devices-panel').hidden = tab !== 'devices'; $('invites-panel').hidden = tab !== 'invites'
  for (const name of ['devices', 'invites']) { $(`${name}-tab`).setAttribute('aria-selected', String(name === tab)); $(`${name}-tab`).tabIndex = name === tab ? 0 : -1 }
  $('search-input').placeholder = tab === 'devices' ? '搜索备注、设备或授权编号' : '搜索邀请备注或编号'
  for (const option of $('status-filter').options) option.disabled = tab === 'invites' && ['expiring', 'expired'].includes(option.value)
  if ($('status-filter').selectedOptions[0].disabled) $('status-filter').value = 'all'
  render()
}
$('login-form').addEventListener('submit', async event => {
  event.preventDefault(); if ($('login-button').disabled) return
  const current = ++generation; token = $('admin-token').value.trim(); $('admin-token').value = ''; $('login-error').textContent = ''; $('login-button').disabled = true; $('login-button').textContent = '正在连接…'
  try { if (await reload()) { $('login-view').hidden = true; $('console-view').hidden = false; notice(''); switchTab('devices') } }
  catch (error) { if (current === generation) { token = ''; $('login-error').textContent = message(error) } }
  finally { $('login-button').disabled = false; $('login-button').textContent = '连接工作台' }
})
$('logout-button').addEventListener('click', logout)
$('refresh-button').addEventListener('click', async () => { if (pending) return; const current = generation; busy(true); notice(''); try { await reload() } catch (error) { if (current === generation) { if (error.code === 'unauthorized') { logout(); $('login-error').textContent = message(error) } else notice(message(error), true) } } finally { if (current === generation) busy(false) } })
$('devices-tab').addEventListener('click', () => switchTab('devices')); $('invites-tab').addEventListener('click', () => switchTab('invites'))
document.querySelector('.tabs').addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const tab = event.key === 'Home' ? 'devices' : event.key === 'End' ? 'invites' : activeTab === 'devices' ? 'invites' : 'devices'; switchTab(tab); $(`${tab}-tab`).focus() } })
$('search-input').addEventListener('input', render); $('status-filter').addEventListener('change', render)
$('new-invite-button').addEventListener('click', () => { $('create-form').reset(); $('create-error').textContent = ''; $('create-dialog').showModal() })
$('create-form').addEventListener('submit', async event => {
  event.preventDefault(); if (pending) return
  const current = generation, note = $('invite-note').value.trim(); if (!note) { $('create-error').textContent = '请输入用户备注。'; return }
  const data = { note, days: Number($('invite-days').value), maxActivations: Number($('invite-max').value) }; busy(true); $('create-error').textContent = ''
  try {
    const result = await request('invites/create', data); if (current !== generation) return
    $('create-dialog').close(); $('created-code').value = result.code; $('created-description').textContent = `${note} · ${data.days} 天 · 最多 ${data.maxActivations} 台设备`; $('copy-status').textContent = ''; $('code-dialog').showModal()
    try { await reload() } catch (error) { if (current === generation) notice(`邀请码已生成，请先保存。列表刷新失败：${message(error)}`, true) }
  } catch (error) { if (current === generation) { if (error.code === 'unauthorized') { logout(); $('login-error').textContent = message(error) } else $('create-error').textContent = message(error) } }
  finally { if (current === generation) busy(false) }
})
$('extend-form').addEventListener('submit', async event => { event.preventDefault(); if (pending || !target) return; const device = target, days = Number($('extend-days').value); $('extend-dialog').close(); await perform('entitlements/extend', { id: device.id, days }, `已增加 ${days} 天，设备下次联网验证时领取新期限。`) })
$('copy-code').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('created-code').value); $('copy-status').textContent = '已复制，请单独发给对应朋友。' } catch { $('created-code').select(); $('copy-status').textContent = '自动复制未成功，请按 Ctrl+C 复制。' } })
for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => {
  if (button.dataset.close === 'code-dialog' && !window.confirm('邀请码明文只显示一次。确认已经保存并关闭？')) return
  $(button.dataset.close).close()
})
$('code-dialog').addEventListener('cancel', event => { if (!window.confirm('邀请码明文只显示一次。确认已经保存并关闭？')) event.preventDefault() })
$('code-dialog').addEventListener('close', () => { $('created-code').value = ''; $('created-description').textContent = ''; $('copy-status').textContent = '' })
window.addEventListener('pagehide', logout)
window.addEventListener('pageshow', event => { if (event.persisted) logout() })
