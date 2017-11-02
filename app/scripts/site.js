(function (window, document) {
    /** Constants */
    var CLASSES = {
        FOOTER: 'footer',
        FOOTER_OVERLAYED: 'is-overlayed',
        FADE: 'fade',
        FADE_IN: 'in'
    };

    var noscript = document.getElementById('profile-image-noscript'),
        footer = document.getElementById('footer'),
        updateFooterClass = function () {
            updateElementClass(footer, CLASSES.FOOTER, CLASSES.FOOTER_OVERLAYED);
        };

    fadeInImage(noscript, CLASSES.FADE, CLASSES.FADE_IN);
    updateFooterClass();
    window.addEventListener('resize', updateFooterClass);
})(window, document);

/**
 * Create an image element from a noscript containing an <img> tag and fade it in only when the image is fully loaded.
 * @param noscript the <noscript> element containing an <img> tag
 * @param fadeClass adds this class when the image starts loading
 * @param fadeInClass adds this class when the image is done loading
 */
function fadeInImage(noscript, fadeClass, fadeInClass) {
    var div = document.createElement('div');
    div.innerHTML = noscript.innerText;
    var image = div.firstElementChild;

    image.className += ' ' + fadeClass;
    image.addEventListener('load', function () {
        image.className += ' ' + fadeInClass;
    });
    noscript.parentNode.insertBefore(image, noscript);
}

/**
 * Adds a modifier class to the element if the page is scrollable (that is, if window height < document height)
 * @param element the element
 * @param baseClass the element's base class which is always present
 * @param modifierClass the modifier class to be added when the required condition is true
 */
function updateElementClass(element, baseClass, modifierClass) {
    var newClass = baseClass;
    if (window.innerHeight < document.documentElement.offsetHeight) {
        newClass += ' ' + modifierClass;
    }
    element.className = newClass;
}
