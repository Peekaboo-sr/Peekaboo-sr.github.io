import products from './catalog.js';
import {formatPrice, salePrice} from './pricing.js';
import {track} from './tracking.js';

const categories = [...new Set(products.map(model => model.category))];
const modelOrder = new Intl.Collator('en-IN', {numeric: true, sensitivity: 'base'});
const grid = document.querySelector('#grid');
const search = document.querySelector('#search');
const detail = document.querySelector('#equipment-detail');
const filters = document.querySelector('#filters');
const count = document.querySelector('#count');
const catalog = document.querySelector('#catalog');
const hero = document.querySelector('.hero');
const clean = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const file = model => `specs/honda-${model.id}.pdf`;
const link = model => `?model=${model.id}#equipment-detail`;
let category = 'All equipment';

function showCatalog() {
  const query = search.value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const matching = products.filter(model =>
    (category === 'All equipment' || model.category === category) &&
    (!query || `${model.name} ${model.category}`.toLowerCase().replace(/[^a-z0-9]/g, '').includes(query) ||
      `honda${model.id.replaceAll('-', '')}`.includes(query))
  );
  count.textContent = matching.length ? `${matching.length} ${matching.length === 1 ? 'model' : 'models'}` : 'No models found. Try another search or category.';
  grid.innerHTML = categories.map(name => {
    const models = matching.filter(model => model.category === name);
    if (!models.length) return '';
    const subgroups = [...new Set(models.map(model => model.subcategory || ''))]
      .sort(modelOrder.compare);
    const groups = subgroups.map(subgroup => {
      const cards = models.filter(model => (model.subcategory || '') === subgroup)
        .sort((first, second) => modelOrder.compare(first.name, second.name))
        .map(renderCard).join('');
      return `${subgroup ? `<h4 class="subgroup">${clean(subgroup)}</h4>` : ''}
        <div class="grid">${cards}</div>`;
    }).join('');
    return `<section class="catalog-group"><h3 class="group-title">${clean(name)}</h3>${groups}</section>`;
  }).join('');
}

function price(model) {
  return model.hondaMrpPaise
    ? `<p class="price"><strong>${formatPrice(salePrice(model.hondaMrpPaise))}</strong> <del>${formatPrice(model.hondaMrpPaise)}</del></p>`
    : '<p>Price on enquiry</p>';
}

function renderCard(model) {
  const label = model.brand ? `${model.brand} ${model.name}` : `Honda ${model.name}`;
  return `
    <article class="card">
      <a href="${link(model)}" class="product-photo" aria-label="View ${clean(label)}"><img loading="lazy" width="380" height="380" src="${clean(model.image)}" alt=""></a>
      <div class="card-copy"><h4 class="product-name"><a href="${link(model)}">${clean(model.name)}</a></h4>
      <p>${clean(model.highlight)}</p>${price(model)}
      <div class="card-links"><a href="${link(model)}">View details</a><a href="${file(model)}" download data-download="${model.id}">Download PDF</a></div></div>
    </article>`;
}

function showModel(model) {
  detail.hidden = false;
  catalog.hidden = true;
  hero.hidden = true;
  detail.classList.add('detail');
  const label = `${model.brand || 'Honda'} ${model.name}`;
  document.title = `${label} Specifications | RV Power`;
  detail.innerHTML = `
    <a href="./#catalog" class="text-link">All equipment</a>
    <div class="detail-head"><img src="${clean(model.image)}" alt="${clean(label)}">
    <div><p class="eyebrow"><span></span> ${clean(model.category.toUpperCase())}</p>
    <h1>${clean(label)}</h1><p>${clean(model.description)}</p>
    ${price(model)}
    <div class="actions"><a class="button outline" href="${file(model)}" download data-download="${model.id}">Download specifications</a>
    <a class="button outline" href="contact-us.html?model=${encodeURIComponent(model.name)}#enquiry" data-contact>Request a quote</a></div></div></div>
    ${model.availability ? `<p>${clean(model.availability)} with RV Power.</p>` : ''}
    <h2>Technical specifications</h2>
    ${model.sections.map(section => `<h3>${clean(section.title)}</h3><table class="specs" aria-label="${clean(section.title)}"><tbody>
      ${section.rows.map(([label, value]) => `<tr><th scope="row">${clean(label)}</th><td>${clean(value)}</td></tr>`).join('')}
    </tbody></table>`).join('')}
    ${model.limitedSpecifications ? `<p>Honda publishes compatibility and feature details for this accessory.</p>` : ''}
    ${model.brochure ? `<p><a class="text-link" href="${clean(model.brochure)}">Manufacturer brochure (PDF)</a></p>` : ''}
    <p>Source <a class="text-link" href="${clean(model.source)}">Honda India product listing</a>. Ask RV Power to confirm the exact variant and availability.</p>
    ${model.video ? `<h3>Product demonstration</h3><p><a class="text-link" href="${clean(model.video)}">Watch Honda’s demonstration on YouTube</a></p>` : ''}
  `;
  track('product_view', model.id);
}

const model = products.find(item => item.id === new URLSearchParams(location.search).get('model'));
if (model) showModel(model);
else {
  for (const name of ['All equipment', ...categories]) {
    const button = document.createElement('button');
    button.textContent = name;
    button.setAttribute('aria-pressed', String(name === category));
    button.addEventListener('click', () => {
      category = name;
      for (const filter of filters.children) filter.setAttribute('aria-pressed', String(filter === button));
      showCatalog();
    });
    filters.append(button);
  }
  search.addEventListener('input', showCatalog);
  showCatalog();
}
track('page_view', model?.id);
document.addEventListener('click', event => {
  const download = event.target.closest('[data-download]');
  if (download) track('spec_download', download.dataset.download);
  if (event.target.closest('[data-contact]')) track('contact_click', model?.id);
});
