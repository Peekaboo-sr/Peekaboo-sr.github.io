const endpoint = document.querySelector('meta[name="rv-analytics-endpoint"]')?.content;
const hosted = location.hostname === 'rv-power.in' || location.hostname === 'www.rv-power.in';

export function track(event, model = '') {
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl || (hosted && !endpoint)) return;
  fetch(hosted ? endpoint : 'api/events', {
    method: 'POST',
    headers: {'Content-Type': hosted ? 'text/plain' : 'application/json'},
    credentials: 'omit',
    body: JSON.stringify({event, model}),
    keepalive: true
  }).catch(() => {});
}
