# Master build — status

Mirrors the owner's master prompt. Update the status here when a section moves.

| § | Feature | Status |
|---|---|---|
| 0 | Project isolation & deploy | **Done** — this repo, Action builds → FTP to cPanel, Apache redirects |
| 1 | Core site + content decisions | **Done** |
| 2 | Content editor (CMS) | **Built** — needs the owner's GitHub token + 4 FTP secrets |
| 3 | Real Google reviews | **Blocked** — needs the Maps API key. Last gate before go-live |
| 4 | Page per product | **Blocked** — needs §8 |
| 5 | Third-party product reviews | **Parked** — no licensed feed |
| 6 | CEC approved-product check | **Blocked** — needs the CEC data file |
| 7 | Multi-language | **Not started** |
| 8 | Catalogue manager | **Later** — own private repo + Railway |
| 9 | Roof-quote calculator | **Later** — Railway |
| 10 | Accounts, roles, installer job board | **Later** — Railway |

## §1 decisions as built

**Five services.** Solar Panels, Battery Storage, Hot Water Heat Pumps, EV
Chargers, Commercial Solar. No Maintenance.

**Four accreditations**, in `business.json` — CEC Approved Solar Retailer, CEC
Approved Designer, Tesla Certified Installer, SolarEdge Certified Installer.
Solar Accreditation Australia, Solar Victoria and the standalone CEC Accredited
Installer badge were removed. Logos drop into `src/images/accreditations/`; see
that folder's README for where each comes from and the trademark rules.

Worth verifying before launch: designer and installer accreditation is
administered by Solar Accreditation Australia, retailer approval by the Clean
Energy Council. "CEC Approved Designer" is the owner's wording — check it
against the certificate.

The line *"All installations are carried out by a fully accredited CEC installer
and a Grade A electrician"* renders under the badges on the home, quote and
service pages, and in the footer.

**No installations-completed stat.** Removed, and `check:content` reports the
empty stats band as a note rather than a warning so it never reads as a to-do.

**Coverage.** VIC and NSW direct; every other state fulfilled by accredited
partners. Leads are accepted from everywhere — only the fulfilment message
changes. One source of wording in `business.coverage`, consumed by the service
areas page, footer, state pages, contact page and the quote form's state
selector, which reveals the partner message the moment a partner state is
chosen.

`areaServed` in the LocalBusiness schema lists VIC and NSW only. Partner reach
is stated in the copy but deliberately not marked up — telling Google this
business installs in Perth would be a false local signal.

Two guards in `check:content` keep it honest: `serviced` and
`servicedByPartner` must be opposites, and `coverage.directStates` must match
the states actually flagged direct.

## Owner inputs still outstanding

| Needed | For | Notes |
|---|---|---|
| Google Maps API key | §3 | Server-side only. Clears the last go-live gate |
| GitHub token + `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_SERVER_DIR` | §2 | Fine-grained token, this repo, contents read/write |
| Accreditation logos ×4 | §1 | Each program's own partner portal |
| Real photos + logo | §1 | Drop into `src/images/` by filename; illustrations step aside automatically |
| CEC approved-product CSV/PDF | §6 | Ingested as a dated snapshot |
| Native-speaker review per language | §7 | Especially rebate and safety wording |
| Catalogue seed + pricing spreadsheet | §8, §9 | Private repo only — never here |
