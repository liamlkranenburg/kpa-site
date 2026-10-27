<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="html" encoding="UTF-8" indent="yes" doctype-system="about:legacy-compat"/>
<xsl:template match="/">
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>Follow by RSS | Kranenburg Power Advisors</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&amp;family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&amp;display=swap"/>
<link rel="stylesheet" href="/style.css"/>
<style>.feed-url{display:block;font-family:var(--sans);font-size:15px;background:#fff;border:1px solid var(--line);padding:14px 16px;margin:6px 0 28px;word-break:break-all;color:var(--ink)}.feed-items{list-style:none;padding:0;margin:0}.feed-items li{border-top:1px solid var(--line);padding:22px 0}.feed-items h3{font-family:var(--sans);font-size:22px;margin:0 0 6px}.feed-items h3 a{color:var(--delft);text-decoration:none}.feed-items p{margin:0}.feed-items .when{font-family:var(--sans);font-size:13.5px;color:var(--grey);margin-top:8px}.feed-wrap{max-width:760px}</style>
</head>
<body>
<header class="mast"><div class="wrap"><a class="brand" href="/" aria-label="Kranenburg Power Advisors, home"><svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 12 H26 V26 H40 V12 H60 V26 H74 V12 H94 V94 H6 Z" fill="#B8692E"/><g fill="#FFFFFF" transform="translate(16.66,70.21)"><path transform="translate(0.00,0) scale(0.03100,-0.03100)" d="M31 0V65L111 69Q111 85 112 100Q112 150 112 201V457Q112 507 112 558Q111 573 111 588L31 593V657H363V593L285 588Q285 573 285 558Q284 508 284 458V300L329 358L523 587L446 593V657H701V593L609 587L460 427L667 69L731 65V0H418V65L474 68L346 305L284 238V199Q284 150 285 101Q285 85 285 69L353 65V0Z"/><path transform="translate(23.68,0) scale(0.03100,-0.03100)" d="M31 0V65L111 69Q111 85 112 100Q112 150 112 201V457Q112 507 112 558Q111 573 111 588L31 593V657H324Q430 657 497.0 633.5Q564 610 596.0 565.5Q628 521 628 459Q628 398 597.5 350.5Q567 303 499.5 276.0Q432 249 322 249H288V196Q288 149 289 100Q289 85 289 70L384 65V0ZM289 593Q289 575 289 558Q288 507 288 457V311H316Q365 311 396.0 328.5Q427 346 441.5 379.0Q456 412 456 457Q456 526 422.5 559.5Q389 593 319 593Z"/><path transform="translate(44.61,0) scale(0.03100,-0.03100)" d="M11 0V65L86 70L291 659H423L631 67L698 63V0H369V63L451 68L412 187H195L158 70L237 65V0ZM392 250 297 541 278 444 216 250Z"/></g></svg><span class="brand-name"><span class="b1">KRANENBURG</span><span class="b2">POWER ADVISORS</span></span></a></div></header>
<section class="page-head"><div class="wrap">
<p class="crumbs"><a href="/">Home</a> / RSS feed</p>
<h1>Follow by RSS</h1>
<div class="beam" aria-hidden="true"></div>
<p class="lede">This is the KPA news feed. Paste its address into a feed reader, such as Feedly, Inoreader or NetNewsWire, and each new brief arrives there the day it is published.</p>
</div></section>
<div class="crenel" aria-hidden="true"></div>
<section class="sec tight"><div class="wrap"><div class="feed-wrap">
<p class="tag">Feed address</p>
<code class="feed-url">https://kpa.energy/feed.xml</code>
<p class="tag">In the feed</p>
<ul class="feed-items">
<xsl:for-each select="rss/channel/item">
<li><h3><a><xsl:attribute name="href"><xsl:value-of select="link"/></xsl:attribute><xsl:value-of select="title"/></a></h3>
<p><xsl:value-of select="description"/></p>
<p class="when"><xsl:value-of select="substring(pubDate, 6, 11)"/></p></li>
</xsl:for-each>
</ul>
<p style="margin-top:32px"><a class="text-link" href="/">Back to kpa.energy</a></p>
</div></div></section>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
