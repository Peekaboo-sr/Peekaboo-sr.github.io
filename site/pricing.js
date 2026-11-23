const inr = new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR'});

export const formatPrice = paise => inr.format(paise / 100);
export const salePrice = mrpPaise => Math.floor((mrpPaise * 9 + 5) / 10);
