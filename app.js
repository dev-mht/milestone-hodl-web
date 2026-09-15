// ─────────────────────────────────────────────────────────────────────────────
//  MHT — Milestone HODL Token — app.js V3
//  Contrat $MHT V3 sur BSC : 0x4fb46E8630094F34D96B409EC1713793aD19b734
//  Deploye et finalise le 14/09/2026 (propriete renoncee, config verrouillee).
//
//  CE QUI CHANGE PAR RAPPORT AU V2, ET POURQUOI CE FICHIER A ETE REECRIT
//    1. ECHELLES. getMarketCap() et nextMilestoneUSD() renvoient des DOLLARS
//       ENTIERS (le contrat divise deja par 1e54). Les passer dans
//       formatUnits(x, 18) afficherait 0.0000000000001 au lieu de 99 772.
//    2. FONCTIONS DISPARUES. getMHTPrice, getVaultBalance, getRewardsPool,
//       getLPBalance, getFlushLPBalance, getAutoLpBuffer, getMarketingBuffer,
//       getLPStatus et liquidityInitialized n'existent plus : tout le volet
//       LP progressive / flush a ete retire du protocole. Les appeler faisait
//       echouer le Promise.all ENTIER, donc plus rien ne s'affichait apres
//       connexion du portefeuille.
//    3. LE PRIX se recompose : getMHTPriceInBNB() x getBNBPriceUSD() / 1e18.
//    4. LA BARRE DE PROGRESSION n'est plus ecrite ici. Elle a un seul auteur,
//       reconcileDisplays() dans index.html, qui la derive de #market-cap —
//       lui-meme rempli SANS portefeuille par loadPublicStats. Deux ecrivains
//       pour un meme element, c'est l'oscillation garantie.
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
    contractAddress : "0x4fb46E8630094F34D96B409EC1713793aD19b734", // $MHT V3
    chainId         : 56,
    rpcUrl          : "https://bsc-rpc.publicnode.com",
    explorerUrl     : "https://bscscan.com/tx/",
};

const ABI = [
    // ── Lecture ───────────────────────────────────────────────────────────────
    "function balanceOf(address) view returns (uint256)",
    "function pendingRewardsOf(address) view returns (uint256)",
    "function getMarketCap() view returns (uint256)",          // dollars ENTIERS
    "function nextMilestoneUSD() view returns (uint256)",      // dollars ENTIERS
    "function milestonesReached() view returns (uint256)",
    "function vaultBalance() view returns (uint256)",
    "function getEligibleSupply() view returns (uint256)",
    "function getReleasePreview() view returns (uint256)",
    "function getCirculatingSupply() view returns (uint256)",
    "function getCooldownRemaining() view returns (uint256)",
    "function getMHTPriceInBNB() view returns (uint256)",
    "function getBNBPriceUSD() view returns (uint256)",
    "function isTwapReady() view returns (bool)",
    "function owner() view returns (address)",

    // ── Ecriture ──────────────────────────────────────────────────────────────
    "function claimRewards() external",
    "function pokeMilestone() external",
];

let _provider, _signer, _contract, _userAddress;
let _refreshInterval = null;

// ── Helpers de formatage (ethers v6) ─────────────────────────────────────────
const fmt = (v, d = 2) =>
    parseFloat(ethers.formatUnits(v, 18)).toLocaleString("fr-FR", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
    });

// Market cap et paliers : entiers, PAS de formatUnits.
const fmtUSDInt = (v) =>
    "$" + Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

// ── Appelee par le modal apres connexion ─────────────────────────────────────
window.initMHT = async function(provider, signer, address) {
    _provider    = provider;
    _signer      = signer;
    _userAddress = address;
    _contract    = new ethers.Contract(CONFIG.contractAddress, ABI, signer);

    await updateUI();

    if (_refreshInterval) clearInterval(_refreshInterval);
    _refreshInterval = setInterval(updateUI, 30000);
};

// ── Mise a jour de l'interface ───────────────────────────────────────────────
async function updateUI() {
    if (!_contract || !_userAddress) return;

    // Chaque lecture est independante : une fonction qui reverte ne doit pas
    // emporter tout le tableau de bord avec elle. C'est exactement ce qui
    // arrivait avec le Promise.all du V2 des qu'une fonction disparaissait.
    const safe = async (fn) => { try { return await fn(); } catch (e) { console.warn("call failed:", e); return null; } };

    const [balance, pending, marketCap, nextMilestone, vaultBal, eligibleSupply, priceBnb, bnbUsd] =
        await Promise.all([
            safe(() => _contract.balanceOf(_userAddress)),
            safe(() => _contract.pendingRewardsOf(_userAddress)),
            safe(() => _contract.getMarketCap()),
            safe(() => _contract.nextMilestoneUSD()),
            safe(() => _contract.vaultBalance()),
            safe(() => _contract.getEligibleSupply()),
            safe(() => _contract.getMHTPriceInBNB()),
            safe(() => _contract.getBNBPriceUSD()),
        ]);

    // ── Solde de l'utilisateur ───────────────────────────────────────────────
    const balEl = document.getElementById("mht-balance");
    if (balEl && balance != null) balEl.textContent = fmt(balance, 2) + " MHT";

    // ── Market Cap — dollars entiers ─────────────────────────────────────────
    const mcEl = document.getElementById("market-cap");
    if (mcEl && marketCap != null) mcEl.textContent = fmtUSDInt(marketCap);

    // Palier vise : lu on-chain, pour que la barre reste juste apres le 1er palier
    if (nextMilestone != null) window._mhtNextMilestone = Number(nextMilestone);

    // ── Prix USD : prix en BNB x BNB/USD ─────────────────────────────────────
    if (priceBnb != null && bnbUsd != null) {
        window._mhtPrice = parseFloat(ethers.formatUnits((priceBnb * bnbUsd) / (10n ** 18n), 18));
    }

    // ── Smart-Vault ──────────────────────────────────────────────────────────
    const vaultEl = document.getElementById("vault-balance");
    if (vaultEl && vaultBal != null) vaultEl.textContent = fmt(vaultBal, 0) + " MHT";

    // ── Supply eligible aux recompenses ──────────────────────────────────────
    // NE PAS ecrire #eligible-supply ici : un seul auteur, dans index.html
    // (loadPublicStats puis fetchEligibleSupplyOnChain, qui ecrivent ENSEMBLE
    // le badge et le champ du calculateur, toutes les 60 s). Deux auteurs
    // avaient fait diverger les deux affichages le 14/09/2026.

    // ── Bouton Claim ─────────────────────────────────────────────────────────
    const claimBtn = document.getElementById("claimBtn");
    if (claimBtn && pending != null) {
        const pendingFloat = parseFloat(ethers.formatUnits(pending, 18));
        if (pendingFloat > 0) {
            claimBtn.innerHTML = `<i class="bi bi-gift me-2"></i>Claim ${fmt(pending, 2)} MHT`;
            claimBtn.disabled = false;
        } else {
            claimBtn.innerHTML = `<i class="bi bi-gift me-2"></i>No Rewards Yet`;
            claimBtn.disabled = true;
        }
    }
}

// ── Claim Rewards ────────────────────────────────────────────────────────────
async function claimRewards() {
    if (!_contract) return;
    try {
        const claimBtn = document.getElementById("claimBtn");
        if (claimBtn) claimBtn.innerHTML = `<i class="bi bi-hourglass me-2"></i>Processing…`;

        const tx = await _contract.claimRewards();
        await tx.wait();

        await updateUI();
        alert("✅ Rewards claimed!\n\n" + CONFIG.explorerUrl + tx.hash);

    } catch (err) {
        console.error("Claim error:", err);
        alert("Error: " + (err.reason || err.message));
        await updateUI();
    }
}

// ── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
    const claimBtn = document.getElementById("claimBtn");
    if (claimBtn) claimBtn.addEventListener("click", claimRewards);

    // Auto-connect si deja connecte
    if (window.ethereum && window.ethereum.selectedAddress) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        provider.getSigner().then(signer => {
            signer.getAddress().then(address => {
                window.initMHT(provider, signer, address);
                const short = address.slice(0, 6) + "…" + address.slice(-4);
                const connectBtn = document.getElementById("connectWalletBtn");
                if (connectBtn) {
                    connectBtn.innerHTML = `<i class="bi bi-check-circle me-2"></i>${short}`;
                    connectBtn.style.background = "linear-gradient(45deg, #10b981, #3b82f6)";
                    window._mhtConnected = true;
                }
            });
        }).catch(() => {});
    }
});
