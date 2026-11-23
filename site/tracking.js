export function track(event, model = '') {
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  fetch('api/events', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({event, model}),
    keepalive: true
  }).catch(() => {});
}
