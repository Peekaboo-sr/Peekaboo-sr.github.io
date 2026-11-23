import products from './catalog.js';

const labels = {
  page_view: 'Page views',
  product_view: 'Model views',
  spec_download: 'Specification PDF clicks',
  contact_click: 'Enquiry clicks'
};
const status = document.querySelector('#analytics-status');

async function refresh() {
  try {
    const response = await fetch('api/analytics', {cache: 'no-store'});
    if (!response.ok) throw new Error('Analytics unavailable');
    const {rows} = await response.json();
    const totals = Object.fromEntries(Object.keys(labels).map(event => [event, 0]));
    const days = new Map();
    const models = new Map();
    for (const [day, event, id, total] of rows) {
      totals[event] += total;
      if (event === 'page_view') days.set(day, (days.get(day) || 0) + total);
      if (!id || !products.some(product => product.id === id)) continue;
      if (!models.has(id)) models.set(id, {product_view: 0, spec_download: 0, contact_click: 0});
      if (event !== 'page_view') models.get(id)[event] += total;
    }
    document.querySelector('#metrics').innerHTML = Object.entries(labels).map(([event, label]) =>
      `<article class="card card-copy"><p>${label}</p><h3>${totals[event]}</h3></article>`).join('');
    document.querySelector('#models').innerHTML = [...models].sort((a,b) => b[1].product_view - a[1].product_view).map(([id, data]) =>
      `<tr><th scope="row"><a class="text-link" href="./?model=${id}">${id.toUpperCase()}</a></th><td>${data.product_view}</td><td>${data.spec_download}</td><td>${data.contact_click}</td></tr>`).join('') || '<tr><td colspan="4">No model activity yet.</td></tr>';
    document.querySelector('#days').innerHTML = [...days].reverse().map(([day, views]) =>
      `<tr><th scope="row">${day}</th><td>${views}</td></tr>`).join('') || '<tr><td colspan="2">No page views yet.</td></tr>';
    status.textContent = `Updated at ${new Date().toLocaleTimeString()}`;
  } catch {
    status.textContent = 'Analytics is unavailable. Open this page through the RV Power preview server.';
  }
}
document.querySelector('#refresh').addEventListener('click', refresh);
refresh();
