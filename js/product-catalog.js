(function () {
    // Change this number to apply the same percentage hike to every numeric price.
    var priceHikePercentage = 0;

    var productPrices = {
        'Honda EU 70is Generator': '₹ 2,51,039.00',
        'Honda GX 690 Engine': '₹ Contact us for price',
        'UMK425T U2ST Brush Cutter': '₹ 25,556.00',
        'Honda WB 30XD Water Pump': '₹ 29,268.00',
        'Honda FJ 500 Agricultural Tiller': '₹ 91,701.00',
        'Honda HRJ 216 Lawn Mower': '₹ 74,954.00',
        'Honda EU 30is Generator': '₹ 1,34,411.00',
        'Honda GX 80 Engine': '₹ 16,299.00',
        'UMK435T U2NT Brush Cutter': '₹ 30,858.00',
        'Honda WB 15X Water Pump': '₹ 23,305.00',
        'Honda FQ 650 Agriculutural Tiller': '₹ 65,321.00',
        'Honda HRJ 196 Lawn Mower': '₹ 65,766.00',
        'Honda EU 30i Generator': '₹ 1,12,078.00',
        'Honda GX 160 Engine': '₹ 19,099.00',
        'UMK435T UENT Brush Cutter': '₹ 32,871.00',
        'Honda WV 30D Water Pump': 'Contact us for price',
        'Honda F 300 Agriculutural Tiller': '₹ 48,494',
        'Honda EX 2400S Generator': '₹ 1,02,980.00',
        'Honda GX 120 Engine': 'Contact us for price',
        'UMK450T U2NT Brush Cutter': '₹ 34,346.00',
        'Honda WB 20XD Water Pump': '₹ 27,233.00',
        'Honda EX 2400 Generator': '₹ 86,161.00',
        'Honda GX 25 Engine': 'Contact us for price',
        'UMK450T UTNT Brush Cutter': '₹ 35,420.00',
        'Honda WS 20X Water Pump': '₹ 20,049.00',
        'Honda EP 1000 Generator': '₹ 35,843.00',
        'Honda GX 270 Engine': 'Contact us for price',
        'UMR435T L2ST Brush Cutter': '₹ 33,548.00',
        'Honda GX 35 Engine': 'Contact us for price',
        'UMR435T LEDT Brush Cutter': '₹ 33,919.00',
        'Honda GX 390 Engine': '₹ 48,000.00',
        'Honda GX 630 Engine': 'Contact us for price',
        'Honda GX 660 Engine': 'Contact us for price',
        'Honda GXH 50 Engine': 'Contact us for price',
        'Honda GXV 160 Engine': 'Contact us for price'
    };

    function applyPercentageHike(priceText, percentage) {
        var numericText = priceText.replace(/[^0-9.]/g, '');

        if (!numericText) {
            return priceText;
        }

        var numericPrice = Number(numericText);

        if (!Number.isFinite(numericPrice)) {
            return priceText;
        }

        var adjustedPrice = numericPrice * (1 + (Number(percentage) || 0) / 100);
        var formattedPrice = new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(adjustedPrice);

        return (priceText.indexOf('₹') !== -1 ? '₹ ' : '') + formattedPrice;
    }

    document.querySelectorAll('.products-single').forEach(function (card) {
        var name = card.querySelector('.why-text h4');
        var price = card.querySelector('[data-product-price]');
        var productName = name && name.textContent.trim();
        var productPrice = productPrices[productName];

        if (price && productPrice) {
            price.textContent = applyPercentageHike(productPrice, priceHikePercentage);
        }
    });
}());