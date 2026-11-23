import {track} from './tracking.js';

const form = document.querySelector('#enquiry');
form.elements.model.value = new URLSearchParams(location.search).get('model')?.slice(0, 120) || '';

form.addEventListener('submit', event => {
  event.preventDefault();
  const fields = new FormData(form);
  const model = fields.get('model').trim();
  const subject = [fields.get('topic'), model].filter(Boolean).join(' · ');
  const body = `${fields.get('message').trim()}\n\n${fields.get('name').trim()}`;
  track('contact_click');
  location.href = `mailto:info@rv-power.in?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

track('page_view');
document.addEventListener('click', event => {
  if (event.target.closest('[data-contact]')) track('contact_click');
});
