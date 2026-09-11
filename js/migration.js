/**
 * migration.js — page de migration $MHT V2 -> V3 (EN / FR)
 * Écrit le 11/09/2026.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  APRÈS LE DÉPLOIEMENT MAINNET : renseigner CONFIG.migration et       │
 * │  CONFIG.v3 ci-dessous (adresses relues dans le journal du broadcast), │
 * │  puis pousser le site. Tant qu'elles sont vides, la page reste en    │
 * │  mode PRÉ-LANCEMENT : vérification d'éligibilité seulement, aucun    │
 * │  bouton de transaction actif.                                        │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Principes :
 *  - approve() du montant EXACT migrable, jamais un montant illimité ;
 *  - toutes les valeurs affichées en mode live sont LUES dans le contrat
 *    (remaining, migratableOf, quote, currentBonusBps, deadline) ;
 *  - en pré-lancement, le plafond vient de la table du snapshot ci-dessous,
 *    identique à script/DeployMHTV3.s.sol (_snapshot()).
 *  - snapshotFinal (11/09/2026) : tant qu'il vaut false, le snapshot définitif
 *    n'est pas encore pris (lundi 14/09, juste avant le déploiement). La table
 *    n'est alors que la liste ACTUELLE : la vérification lit le solde V2 et
 *    n'affiche aucun plafond. rafraichir_snapshot_mht_v3_*.py le passe à true
 *    en réécrivant la table.
 */
(function () {
  "use strict";

  // ── CONFIGURATION ─────────────────────────────────────────────────────
  var CONFIG = {
    chainId: 56,
    chainIdHex: "0x38",
    rpc: "https://bsc-dataseed.bnbchain.org",
    v2: "0x22E0fcEc929c4F38c8D8c03B2B2F225E98F133fa",
    migration: "",   // <- adresse de MHTMigration, APRES le deploiement
    v3: "",          // <- adresse du MHT V3, APRES le deploiement
    snapshotFinal: false,  // <- true quand le snapshot definitif est ecrit (script de rafraichissement)
    logo: "https://arweave.net/4Y7ayPRnQQwkK5HWESY-voYNkv2ghYNAI51qpHmVrik",
    // Barème figé dans MHTMigration (bornes INCLUSIVES, secondes UTC)
    tiers: [
      { end: 1793798460, bps: 2500 },  // 4 Nov 2026 13:21 UTC
      { end: 1804166460, bps: 1000 },  // 4 Mar 2027 13:21 UTC
      { end: 1820064060, bps: 500 }    // 4 Sep 2027 13:21 UTC = deadline
    ]
  };

  // Snapshot V2 — MHT entiers (troncature), identique à _snapshot() du script.
  var SNAPSHOT = {
    "0x26edab574810ffc0ba38a12dc7f5cd6025d1cab7": "4267767",
    "0x9fee8db36d2caa1089d9efa45161b727262e00f2": "3298051",
    "0x2bcf50530e882080ea06c6e6023a839a5948bd05": "2151305",
    "0x218ad8e01b22b4fef94b6e90d90fb06f7d9f00cd": "1309184",
    "0xc030101c10a2396c4ec44c211a420d26564bdf7c": "1066941",
    "0x6c5c8b7f35d23d4578cbb78386e0878ea7be7901": "500000",
    "0x403112ce79f6a69a6b434eca83f852172f9b7760": "467832",
    "0xd62e11fedc2f447ecdbcb622950bbb80e2f3eae9": "320082",
    "0x42c3fccf8cfd3609492234eca0e8d36e36b7a84a": "313283",
    "0xacffad72d511b9c1fa45e7f4cc11a3511bf02b3b": "224444",
    "0x425b132938497927fc6b0fd8a7839572e6efeaca": "213409",
    "0x55b24c0f3ae68e7d674b988c3e464547da6bf98e": "150000",
    "0xdab56e1c1a63b56ccefbb36158b8d95f059d376e": "102223",
    "0x6e7e4567d9c7a8b087953ba16cc5fac145a2b3b6": "95726",
    "0x1ca3e27399772a66f0919835701ac7cfb8a5774d": "55547",
    "0xe516a3325caabd79bbc9cc46be5b3edc33e65718": "55547",
    "0x14cfa7c7e69dc40e0d56bc25dfe31966b3048c42": "13383",
    "0x1349c007edb3bd892bbd3f81fab1ac19bc83e4c9": "321"
  };

  var WEI = BigInt("1000000000000000000");
  var BPS = BigInt(10000);
  var ZERO = BigInt(0);

  // ── TEXTES ────────────────────────────────────────────────────────────
  var T = {
    en: {
      modePre: "PRE-LAUNCH — eligibility check only. Migration opens at launch.",
      modeLive: "LIVE — migration is open.",
      modeClosed: "CLOSED — the migration window has ended.",
      noWallet: "No wallet detected. On mobile, open this page inside your wallet's browser (MetaMask, Trust Wallet, SafePal, Binance Wallet). You can still check any address below.",
      noEthers: "The blockchain library did not load. Check your connection or disable a blocker, then reload.",
      connect: "Connect wallet",
      connected: "Connected",
      switchNet: "Switch to BNB Chain",
      approve: "1. Approve",
      approved: "1. Approved ✓",
      migrate: "2. Migrate",
      opensAtLaunch: "Opens at launch",
      addToken: "Add $MHT V3 to my wallet",
      check: "Check",
      badAddress: "This is not a valid address.",
      notEligible: "This address is not in the snapshot: it cannot migrate.",
      nothingLeft: "Nothing left to migrate for this address.",
      noBalance: "This address holds no V2 anymore: nothing to migrate.",
      partial: "V2 balance is below the snapshot cap: only the balance can be migrated.",
      eligiblePre: "Eligible. You will be able to migrate at launch.",
      preListed: "This address is in the current list. The final snapshot (Monday 14 September, shortly before launch) will use the V2 it holds at that moment.",
      preNotListed: "This address is not in the current list. The final snapshot is taken on Monday 14 September, shortly before launch: only V2 held at that moment will count.",
      preHolds: "This address holds V2. If it still holds it at the final snapshot (Monday 14 September, shortly before launch), it will be able to migrate that balance at launch.",
      preNoV2: "This address holds no V2 right now. Only V2 held at the final snapshot (Monday 14 September, shortly before launch) will count.",
      eligibleLive: "Eligible. Approve, then migrate.",
      readError: "Could not read the blockchain right now. Try again in a moment.",
      notActivated: "The migration contract is deployed but not activated yet.",
      waitingSig: "Confirm in your wallet…",
      pending: "Transaction sent, waiting for confirmation…",
      done: "Done.",
      rejected: "You rejected the transaction.",
      failed: "Transaction failed: ",
      migrated: "Migration complete. Your V3 is in your wallet.",
      unknown: "unavailable",
      tierNames: ["Tier 1", "Tier 2", "Tier 3"],
      until: "until",
      current: "current",
      ended: "ended"
    },
    fr: {
      modePre: "PRÉ-LANCEMENT — vérification d'éligibilité uniquement. La migration ouvre au lancement.",
      modeLive: "OUVERTE — la migration est active.",
      modeClosed: "FERMÉE — la fenêtre de migration est terminée.",
      noWallet: "Aucun wallet détecté. Sur mobile, ouvrez cette page dans le navigateur de votre wallet (MetaMask, Trust Wallet, SafePal, Binance Wallet). Vous pouvez toujours vérifier une adresse ci-dessous.",
      noEthers: "La bibliothèque blockchain ne s'est pas chargée. Vérifiez la connexion ou désactivez un bloqueur, puis rechargez.",
      connect: "Connecter le wallet",
      connected: "Connecté",
      switchNet: "Passer sur BNB Chain",
      approve: "1. Approuver",
      approved: "1. Approuvé ✓",
      migrate: "2. Migrer",
      opensAtLaunch: "Ouvre au lancement",
      addToken: "Ajouter $MHT V3 à mon wallet",
      check: "Vérifier",
      badAddress: "Ce n'est pas une adresse valide.",
      notEligible: "Cette adresse n'est pas dans le snapshot : elle ne peut pas migrer.",
      nothingLeft: "Plus rien à migrer pour cette adresse.",
      noBalance: "Cette adresse ne détient plus de V2 : rien à migrer.",
      partial: "Le solde V2 est inférieur au plafond du snapshot : seul le solde peut être migré.",
      eligiblePre: "Éligible. Vous pourrez migrer au lancement.",
      preListed: "Cette adresse est dans la liste actuelle. Le snapshot définitif (lundi 14 septembre, peu avant le lancement) retiendra les V2 qu'elle détiendra à ce moment-là.",
      preNotListed: "Cette adresse n'est pas dans la liste actuelle. Le snapshot définitif est pris le lundi 14 septembre, peu avant le lancement : seuls les V2 détenus à ce moment-là compteront.",
      preHolds: "Cette adresse détient du V2. Si elle le détient encore au snapshot définitif (lundi 14 septembre, peu avant le lancement), elle pourra migrer ce solde au lancement.",
      preNoV2: "Cette adresse ne détient pas de V2 actuellement. Seuls les V2 détenus au snapshot définitif (lundi 14 septembre, peu avant le lancement) compteront.",
      eligibleLive: "Éligible. Approuvez, puis migrez.",
      readError: "Lecture de la blockchain impossible pour l'instant. Réessayez dans un moment.",
      notActivated: "Le contrat de migration est déployé mais pas encore activé.",
      waitingSig: "Confirmez dans votre wallet…",
      pending: "Transaction envoyée, en attente de confirmation…",
      done: "Fait.",
      rejected: "Vous avez refusé la transaction.",
      failed: "Transaction échouée : ",
      migrated: "Migration terminée. Vos V3 sont dans votre wallet.",
      unknown: "indisponible",
      tierNames: ["Palier 1", "Palier 2", "Palier 3"],
      until: "jusqu'au",
      current: "en cours",
      ended: "terminé"
    }
  };

  var REVERTS = {
    "MIG: Not eligible": "notEligible",
    "MIG: Nothing to migrate": "nothingLeft",
    "MIG: Not activated": "notActivated",
    "MIG: Window closed": "modeClosed"
  };

  var LANG = (document.documentElement.lang || "en").slice(0, 2) === "fr" ? "fr" : "en";
  var L = T[LANG];
  var LOCALE = LANG === "fr" ? "fr-FR" : "en-US";

  // ── OUTILS PURS (testables sans blockchain) ──────────────────────────
  function isAddress(s) { return /^0x[0-9a-fA-F]{40}$/.test((s || "").trim()); }

  function short(a) { return a ? a.slice(0, 6) + "…" + a.slice(-4) : ""; }

  /** wei (BigInt) -> "1,234,567.1234" (4 décimales max, tronqué). */
  function fmt(wei) {
    if (typeof wei !== "bigint") return L.unknown;
    var neg = wei < ZERO; if (neg) wei = -wei;
    var whole = wei / WEI;
    var frac = ((wei % WEI) * BigInt(10000)) / WEI;
    var w = Number(whole).toLocaleString(LOCALE);
    var f = frac === ZERO ? "" : (LANG === "fr" ? "," : ".") + frac.toString().padStart(4, "0").replace(/0+$/, "");
    return (neg ? "-" : "") + w + f + " MHT";
  }

  /** Palier en vigueur à `nowSec` : {index, bps, end} ou null si fenêtre close. */
  function tierAt(nowSec) {
    for (var i = 0; i < CONFIG.tiers.length; i++) {
      if (nowSec <= CONFIG.tiers[i].end) return { index: i, bps: CONFIG.tiers[i].bps, end: CONFIG.tiers[i].end };
    }
    return null;
  }

  function snapshotCap(addr) {
    var v = SNAPSHOT[(addr || "").toLowerCase()];
    return v ? BigInt(v) * WEI : ZERO;
  }

  function minBig(a, b) { return a < b ? a : b; }

  function quoteLocal(amount, bps) {
    var bonus = (amount * BigInt(bps)) / BPS;
    return { out: amount + bonus, bonus: bonus };
  }

  function dateOf(sec) {
    return new Date(sec * 1000).toLocaleString(LOCALE, {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC", hourCycle: "h23"
    }) + " UTC";
  }

  function isLive() { return isAddress(CONFIG.migration) && isAddress(CONFIG.v3); }

  function nowSec() { return Math.floor(Date.now() / 1000); }

  // ── ACCÈS BLOCKCHAIN ──────────────────────────────────────────────────
  var ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address,address) view returns (uint256)",
    "function approve(address,uint256) returns (bool)"
  ];
  var MIG_ABI = [
    "function token() view returns (address)",
    "function remaining(address) view returns (uint256)",
    "function migratableOf(address) view returns (uint256)",
    "function quote(uint256) view returns (uint256 out, uint256 bonus)",
    "function currentBonusBps() view returns (uint256)",
    "function deadline() view returns (uint256)",
    "function migrateAll()"
  ];

  var state = { account: null, signer: null, browserProvider: null, readProvider: null };

  function hasEthers() { return typeof window.ethers !== "undefined"; }

  function reader() {
    if (state.browserProvider) return state.browserProvider;
    if (!state.readProvider) state.readProvider = new window.ethers.JsonRpcProvider(CONFIG.rpc, CONFIG.chainId);
    return state.readProvider;
  }

  /** Couche d'accès unique. Remplaçable en test local (file://) uniquement. */
  var chain = {
    v2Balance: function (a) { return new window.ethers.Contract(CONFIG.v2, ERC20_ABI, reader()).balanceOf(a); },
    v2Allowance: function (a) { return new window.ethers.Contract(CONFIG.v2, ERC20_ABI, reader()).allowance(a, CONFIG.migration); },
    activated: function () {
      return new window.ethers.Contract(CONFIG.migration, MIG_ABI, reader()).token()
        .then(function (t) { return t !== "0x0000000000000000000000000000000000000000"; });
    },
    remaining: function (a) { return new window.ethers.Contract(CONFIG.migration, MIG_ABI, reader()).remaining(a); },
    migratable: function (a) { return new window.ethers.Contract(CONFIG.migration, MIG_ABI, reader()).migratableOf(a); },
    quote: function (x) {
      return new window.ethers.Contract(CONFIG.migration, MIG_ABI, reader()).quote(x)
        .then(function (r) { return { out: r[0], bonus: r[1] }; });
    },
    bonusBps: function () { return new window.ethers.Contract(CONFIG.migration, MIG_ABI, reader()).currentBonusBps(); },
    deadline: function () { return new window.ethers.Contract(CONFIG.migration, MIG_ABI, reader()).deadline(); },
    approve: function (amount) {
      return new window.ethers.Contract(CONFIG.v2, ERC20_ABI, state.signer).approve(CONFIG.migration, amount)
        .then(function (tx) { log(L.pending, tx.hash); return tx.wait(); });
    },
    migrateAll: function () {
      return new window.ethers.Contract(CONFIG.migration, MIG_ABI, state.signer).migrateAll()
        .then(function (tx) { log(L.pending, tx.hash); return tx.wait(); });
    }
  };
  if (location.protocol === "file:" && window.MIG_TEST) {
    chain = window.MIG_TEST.chain || chain;
    if (window.MIG_TEST.config) Object.assign(CONFIG, window.MIG_TEST.config);
    if (window.MIG_TEST.now) nowSec = window.MIG_TEST.now;
  }

  // ── DOM ───────────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function setText(id, v) { var e = $(id); if (e) e.textContent = v; }

  function log(msg, txHash) {
    var box = $("m-log"); if (!box) return;
    var p = document.createElement("div");
    p.textContent = msg + " ";
    if (txHash) {
      var a = document.createElement("a");
      a.href = "https://bscscan.com/tx/" + txHash; a.target = "_blank"; a.rel = "noopener";
      a.textContent = short(txHash);
      p.appendChild(a);
    }
    box.prepend(p);
  }

  function note(msg, kind) {
    var n = $("m-note"); if (!n) return;
    n.textContent = msg || "";
    n.className = "m-note" + (kind ? " " + kind : "");
  }

  function renderMode() {
    var t = tierAt(nowSec());
    var m = $("m-mode");
    if (!m) return;
    if (!t) { m.textContent = L.modeClosed; m.className = "m-mode closed"; }
    else if (isLive()) { m.textContent = L.modeLive; m.className = "m-mode live"; }
    else { m.textContent = L.modePre; m.className = "m-mode pre"; }
  }

  function renderTiers() {
    var t = tierAt(nowSec());
    for (var i = 0; i < CONFIG.tiers.length; i++) {
      var row = $("tier-" + i); if (!row) continue;
      var st = row.querySelector(".tier-state");
      if (t && t.index === i) { row.classList.add("current"); if (st) st.textContent = L.current; }
      else if (nowSec() > CONFIG.tiers[i].end) { row.classList.add("past"); if (st) st.textContent = L.ended; }
      else if (st) st.textContent = "";
      var d = row.querySelector(".tier-end"); if (d) d.textContent = dateOf(CONFIG.tiers[i].end);
    }
  }

  function renderAddresses() {
    var links = document.querySelectorAll("[data-addr]");
    for (var i = 0; i < links.length; i++) {
      var el = links[i];
      var key = el.getAttribute("data-addr");
      var addr = CONFIG[key];
      var suffix = el.getAttribute("data-tab") || "";
      if (isAddress(addr)) {
        el.textContent = addr;
        if (el.tagName === "A") el.href = "https://bscscan.com/address/" + addr + suffix;
      }
    }
  }

  function setButtons(opts) {
    var ap = $("m-approve"), mg = $("m-migrate"), add = $("m-addtoken"), cn = $("m-connect");
    if (cn) {
      cn.textContent = opts.connectLabel;
      cn.disabled = !!opts.connectDisabled;
    }
    if (ap) { ap.textContent = opts.approveLabel; ap.disabled = !opts.approveOn; }
    if (mg) { mg.textContent = opts.migrateLabel; mg.disabled = !opts.migrateOn; }
    if (add) { add.hidden = !isLive(); add.textContent = L.addToken; }
  }

  function fillRows(r) {
    setText("r-address", r.address ? r.address : "—");
    setText("r-cap", r.cap !== undefined ? fmt(r.cap) : "—");
    setText("r-balance", r.balance !== undefined ? fmt(r.balance) : "—");
    setText("r-migratable", r.migratable !== undefined ? fmt(r.migratable) : "—");
    setText("r-bonus", r.bps !== undefined ? "+" + (Number(r.bps) / 100) + " %" : "—");
    setText("r-receive", r.out !== undefined ? fmt(r.out) : "—");
  }

  // ── LOGIQUE ───────────────────────────────────────────────────────────
  var current = { address: null, migratable: ZERO, allowance: ZERO };

  function connectLabel() {
    if (!window.ethereum) return L.connect;
    if (!state.account) return L.connect;
    return L.connected + " · " + short(state.account);
  }

  function evaluate(address) {
    note("");
    if (!isAddress(address)) { note(L.badAddress, "ko"); return Promise.resolve(); }
    current.address = address;
    var t = tierAt(nowSec());
    var isOwn = state.account && address.toLowerCase() === state.account.toLowerCase();

    if (!isLive() && !CONFIG.snapshotFinal) {
      // Snapshot définitif pas encore pris : aucun plafond à afficher, seul
      // le solde V2 actuel compte.
      var listed = snapshotCap(address) !== ZERO;
      var prow = { address: address, bps: t ? t.bps : undefined };
      fillRows(prow);
      setButtons({ connectLabel: connectLabel(), approveLabel: L.opensAtLaunch, migrateLabel: L.opensAtLaunch });
      if (!hasEthers()) { note(listed ? L.preListed : L.preNotListed, listed ? "ok" : "warn"); return Promise.resolve(); }
      return chain.v2Balance(address).then(function (bal) {
        prow.balance = bal; prow.migratable = bal;
        prow.out = t ? quoteLocal(bal, t.bps).out : undefined;
        fillRows(prow);
        if (bal === ZERO) note(L.preNoV2, "warn");
        else note(L.preHolds, "ok");
      }).catch(function () { note((listed ? L.preListed : L.preNotListed) + " (" + L.readError + ")", "warn"); });
    }

    if (!isLive()) {
      var cap = snapshotCap(address);
      var rows = { address: address, cap: cap, bps: t ? t.bps : undefined };
      fillRows(rows);
      setButtons({ connectLabel: connectLabel(), approveLabel: L.opensAtLaunch, migrateLabel: L.opensAtLaunch });
      if (cap === ZERO) { note(L.notEligible, "ko"); return Promise.resolve(); }
      if (!hasEthers()) { note(L.eligiblePre, "ok"); return Promise.resolve(); }
      return chain.v2Balance(address).then(function (bal) {
        var mig = minBig(bal, cap);
        rows.balance = bal; rows.migratable = mig;
        rows.out = t ? quoteLocal(mig, t.bps).out : undefined;
        fillRows(rows);
        if (bal === ZERO) note(L.noBalance, "ko");
        else if (bal < cap) note(L.eligiblePre + " " + L.partial, "warn");
        else note(L.eligiblePre, "ok");
      }).catch(function () { note(L.eligiblePre + " (" + L.readError + ")", "warn"); });
    }

    if (!hasEthers()) { note(L.noEthers, "ko"); return Promise.resolve(); }

    return Promise.all([
      chain.activated(), chain.remaining(address), chain.v2Balance(address),
      chain.migratable(address), chain.bonusBps(),
      isOwn ? chain.v2Allowance(address) : Promise.resolve(ZERO)
    ]).then(function (v) {
      var activated = v[0], cap = v[1], bal = v[2], mig = v[3], bps = v[4], allowance = v[5];
      return chain.quote(mig).then(function (q) {
        current.migratable = mig; current.allowance = allowance;
        fillRows({ address: address, cap: cap, balance: bal, migratable: mig, bps: bps, out: q.out });

        var closed = !t;
        var canAct = isOwn && activated && !closed && mig > ZERO;
        var approvedEnough = allowance >= mig && mig > ZERO;
        setButtons({
          connectLabel: connectLabel(),
          approveLabel: approvedEnough ? L.approved : L.approve,
          approveOn: canAct && !approvedEnough,
          migrateLabel: L.migrate,
          migrateOn: canAct && approvedEnough
        });

        if (closed) note(L.modeClosed, "ko");
        else if (!activated) note(L.notActivated, "warn");
        else if (snapshotCap(address) === ZERO && cap === ZERO) note(L.notEligible, "ko");
        else if (cap === ZERO) note(L.nothingLeft, "ok");
        else if (bal === ZERO) note(L.noBalance, "ko");
        else if (bal < cap) note(L.eligibleLive + " " + L.partial, "warn");
        else note(L.eligibleLive, "ok");
      });
    }).catch(function () { note(L.readError, "ko"); });
  }

  function connect() {
    if (!window.ethereum) { note(L.noWallet, "warn"); return; }
    if (!hasEthers()) { note(L.noEthers, "ko"); return; }
    state.browserProvider = new window.ethers.BrowserProvider(window.ethereum);
    return window.ethereum.request({ method: "eth_requestAccounts" })
      .then(ensureChain)
      .then(function () { return state.browserProvider.getSigner(); })
      .then(function (s) {
        state.signer = s;
        return s.getAddress();
      })
      .then(function (a) {
        state.account = a;
        var input = $("m-input"); if (input) input.value = a;
        return evaluate(a);
      })
      .catch(function (e) { note(errText(e), "ko"); });
  }

  function ensureChain() {
    return window.ethereum.request({ method: "eth_chainId" }).then(function (id) {
      if (parseInt(id, 16) === CONFIG.chainId) return;
      return window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CONFIG.chainIdHex }] })
        .then(function () { state.browserProvider = new window.ethers.BrowserProvider(window.ethereum); });
    });
  }

  function errText(e) {
    if (!e) return L.failed;
    if (e.code === "ACTION_REJECTED" || e.code === 4001) return L.rejected;
    var raw = e.reason || e.shortMessage || e.message || "";
    for (var k in REVERTS) { if (raw.indexOf(k) !== -1) return L[REVERTS[k]]; }
    return L.failed + raw.slice(0, 160);
  }

  function doApprove() {
    if (!state.signer || current.migratable === ZERO) return;
    note(L.waitingSig);
    return chain.approve(current.migratable)
      .then(function () { log(L.done); return evaluate(state.account); })
      .catch(function (e) { note(errText(e), "ko"); });
  }

  function doMigrate() {
    if (!state.signer) return;
    note(L.waitingSig);
    return chain.migrateAll()
      .then(function () { log(L.migrated); return evaluate(state.account); })
      .then(function () { note(L.migrated, "ok"); })
      .catch(function (e) { note(errText(e), "ko"); });
  }

  function addToken() {
    if (!window.ethereum || !isLive()) return;
    window.ethereum.request({
      method: "wallet_watchAsset",
      params: { type: "ERC20", options: { address: CONFIG.v3, symbol: "MHT", decimals: 18, image: CONFIG.logo } }
    }).catch(function () {});
  }

  function init() {
    renderMode();
    renderTiers();
    renderAddresses();
    setButtons({
      connectLabel: L.connect,
      approveLabel: isLive() ? L.approve : L.opensAtLaunch,
      migrateLabel: isLive() ? L.migrate : L.opensAtLaunch
    });
    if (!window.ethereum) note(L.noWallet, "warn");
    else if (!hasEthers()) note(L.noEthers, "ko");

    var c = $("m-connect"); if (c) c.addEventListener("click", connect);
    var ch = $("m-check"); if (ch) ch.addEventListener("click", function () { evaluate(($("m-input").value || "").trim()); });
    var inp = $("m-input"); if (inp) inp.addEventListener("keydown", function (e) { if (e.key === "Enter") evaluate(inp.value.trim()); });
    var ap = $("m-approve"); if (ap) ap.addEventListener("click", doApprove);
    var mg = $("m-migrate"); if (mg) mg.addEventListener("click", doMigrate);
    var ad = $("m-addtoken"); if (ad) ad.addEventListener("click", addToken);

    if (window.ethereum && window.ethereum.on) {
      window.ethereum.on("accountsChanged", function () { location.reload(); });
      window.ethereum.on("chainChanged", function () { location.reload(); });
    }

    // Reconnexion silencieuse (aucune fenêtre) si le site est déjà autorisé,
    // par exemple après le rechargement qui suit un changement de réseau.
    if (window.ethereum && hasEthers()) {
      window.ethereum.request({ method: "eth_accounts" })
        .then(function (accs) { if (accs && accs.length) return connect(); })
        .catch(function () {});
    }
  }

  // Exposé pour les tests hors navigateur (node) — sans effet sur la page.
  if (typeof window.MIG_EXPORT_PURE !== "undefined") {
    window.MIG_EXPORT_PURE = { fmt: fmt, tierAt: tierAt, snapshotCap: snapshotCap, quoteLocal: quoteLocal, isAddress: isAddress, CONFIG: CONFIG, SNAPSHOT: SNAPSHOT };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
