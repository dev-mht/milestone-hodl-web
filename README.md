# milestone-hodl-web

Source of **[milestonehodl.apexpad.io](https://milestonehodl.apexpad.io)**, the official site of the Milestone HODL Token ($MHT) on BNB Smart Chain.

Static site (HTML, CSS, vanilla JS), served by GitHub Pages behind Cloudflare. No build step: what is in this repository is exactly what the site serves.

## Pages

| Page | Content |
|---|---|
| `index.html` | Dashboard: live market cap, milestone progress, vault, tokenomics, roadmap, FAQ |
| `pages/migration-en.html` / `-fr` | V2 → V3 migration (snapshot-capped, bonus schedule, BscScan manual method) |
| `pages/how-it-works-en.html` / `-fr` | The milestone engine explained, with a simulator |
| `pages/vault-status-en.html` / `-fr` | What happened to the V2 vault |
| `pages/contact.html` | Official contact form |
| `docs/` | Whitepapers EN / FR |

Live values are read directly from the chain in the visitor's browser; nothing is computed server-side.

## Contracts

$MHT V3 contract: `0x4fb46E8630094F34D96B409EC1713793aD19b734` (BNB Smart Chain).
Sources and deployed addresses: [dev-mht/milestone-hodl-contracts](https://github.com/dev-mht/milestone-hodl-contracts).
