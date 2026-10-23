(() => {
  const status = document.getElementById('startup-status')
  const reload = document.getElementById('reload-admin')
  reload.addEventListener('click', event => {
    event.preventDefault()
    const destination = new URL('./', location.href)
    destination.searchParams.set('reload', String(Date.now()))
    location.replace(destination.href)
  })
  if (document.documentElement.dataset.adminReady === 'true') return
  let timer
  const failed = () => {
    if (document.documentElement.dataset.adminReady === 'true') return
    status.textContent = '管理功能尚未加载成功，暂时无法连接。请点击“重新加载管理页”；若仍失败，请在 Chrome 或 Edge 中打开。'
    document.getElementById('login-button').textContent = '管理功能未就绪'
    reload.hidden = false
  }
  document.getElementById('admin-module').addEventListener('error', failed)
  window.addEventListener('admin-ready', () => clearTimeout(timer), { once: true })
  timer = setTimeout(failed, 12000)
})()
