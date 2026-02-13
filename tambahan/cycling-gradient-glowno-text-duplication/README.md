# Cycling gradient glow - no text duplication

A Pen created on CodePen.

Original URL: [https://codepen.io/thebabydino/pen/rNPOpJK](https://codepen.io/thebabydino/pen/rNPOpJK).

No text duplication in the markup or in a pseudo's content. The effect is achieved with a simple, compact, easy to read SVG filter.

This filter first creates a blurred copy (`feGaussianBlur`) of the gradient text, the bumps up the saturation (`feColorMatrix[type=saturate]`) of this blurred copy and then slaps the original gradient text on top (`feComposite`) of the blurred & saturated copy.

Works in browsers supporting animating CSS custom properties registered via `@property`. As of October 2023, Firefox isn't there yet, but support is coming!

For context, see [this twitter thread](https://twitter.com/anatudor/status/1717640594145632258).

---

If the work I've been putting out since early 2012 has helped you in any way or you just like it, then please remember that praise doesn't keep me afloat financially... but you can! So please consider supporting my work in one of the following ways:

* being a cool cat 😼🎩 and supporting it monthly on Ko-fi or via a one time donation

[![ko-fi](https://assets.codepen.io/2017/btn_kofi.svg)](https://ko-fi.com/anatudor)

* making a weekly anonymous donation via Liberapay - I'll never know who you are if that's your wish

[![Liberapay](https://assets.codepen.io/2017/btn_liberapay.svg)](https://liberapay.com/anatudor/)

* getting me a chocolate voucher

[![Zotter chocolate](https://assets.codepen.io/2017/zotter.jpg)](https://www.zotter.at/en/online-shop/gifts/gift-vouchers/choco-voucher)

* if you're from outside Europe, becoming a patron on Patreon (don't use it for one time donations or if you're from Europe, we're both getting ripped off)

[![become a patron button](https://assets.codepen.io/2017/btn_patreon.png)](https://www.patreon.com/anatudor)

* or at least sharing this to show the world what can be done with CSS these days

Thank you!