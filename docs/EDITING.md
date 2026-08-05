# Editing the site without any setup

You do not need the content editor, a token, or anything installed. If you can
sign in to GitHub, you can change any wording on the site from your browser.

Every change publishes to the staging site automatically, a couple of minutes
later. The live site is a separate, deliberate step, so nothing you do here can
reach customers by accident.

## What to click

| To change… | Click this |
|---|---|
| Phone, email, address, accreditations | [business.json](https://github.com/advancedbiotechptyltd-cpu/Advanced-solartech-website-/edit/claude/advanced-solartech-488d5g/src/data/business.json) |
| Home page words | [home.json](https://github.com/advancedbiotechptyltd-cpu/Advanced-solartech-website-/edit/claude/advanced-solartech-488d5g/src/data/home.json) |
| The five service pages | [services.json](https://github.com/advancedbiotechptyltd-cpu/Advanced-solartech-website-/edit/claude/advanced-solartech-488d5g/src/data/services.json) |
| State pages (VIC, NSW, etc.) | [locations.json](https://github.com/advancedbiotechptyltd-cpu/Advanced-solartech-website-/edit/claude/advanced-solartech-488d5g/src/data/locations.json) |
| Suburb pages | [cities.json](https://github.com/advancedbiotechptyltd-cpu/Advanced-solartech-website-/edit/claude/advanced-solartech-488d5g/src/data/cities.json) |
| Brand pages | [brands.json](https://github.com/advancedbiotechptyltd-cpu/Advanced-solartech-website-/edit/claude/advanced-solartech-488d5g/src/data/brands.json) |
| Questions & answers | [faqs.json](https://github.com/advancedbiotechptyltd-cpu/Advanced-solartech-website-/edit/claude/advanced-solartech-488d5g/src/data/faqs.json) |
| Blog / guides | [articles.json](https://github.com/advancedbiotechptyltd-cpu/Advanced-solartech-website-/edit/claude/advanced-solartech-488d5g/src/data/articles.json) |
| Products, availability, document links | [catalogue.json](https://github.com/advancedbiotechptyltd-cpu/Advanced-solartech-website-/edit/claude/advanced-solartech-488d5g/src/data/catalogue.json) |
| Menus (top and footer) | [nav.json](https://github.com/advancedbiotechptyltd-cpu/Advanced-solartech-website-/edit/claude/advanced-solartech-488d5g/src/data/nav.json) |

Each link opens that file in GitHub's editor. Change the text between the
quote marks, scroll down, click **Commit changes**. That is the whole process.

## The two rules

**1. Only change words between quote marks.**

```json
  "phone": "+61 403 657 585",
              ^^^^^^^^^^^^^^^  ← this part
```

Leave the name on the left, the quote marks, the colon and the comma alone.

**2. If it complains, press Cancel.**

A missing quote mark or comma will stop the site building. Nothing breaks —
the last good version stays up — but the change will not appear. Back out and
ask, rather than guessing.

## What you cannot break

- The live site. Publishing there is a separate manual step.
- The reviews. They are fetched from Google and overwritten weekly; editing
  `testimonials.json` by hand achieves nothing.
- Anything on the page that is not in these files — layout, colours and the
  logo are deliberately out of reach.

## Adding photos

[Open the images folder](https://github.com/advancedbiotechptyltd-cpu/Advanced-solartech-website-/tree/claude/advanced-solartech-488d5g/src/images) → **Add file** →
**Upload files** → drag them in → **Commit changes**.

Name each file for the slot it fills: `hero-install`, `service-solar-panels`,
`service-battery-storage`, `service-heat-pump-hot-water`, `service-ev-chargers`,
`service-commercial-solar`, `work-1` to `work-4`, `team-install`. The extension
does not matter. See that folder's README before using stock photos.

## When it is worth setting up the editor instead

This browser method is fine for occasional wording changes by one or two
people. The editor at `/admin/` is better when several staff edit regularly —
it shows labelled fields instead of raw text, and cannot produce a broken file.
Setting it up needs one GitHub token per person; see README.md.
