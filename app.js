// ─────────────────────────────────────────────────────────────────────────────
//  MHT — Milestone HODL Token — app.js V2.3
//  Contrat V2.3 Mainnet BSC : 0x22E0fcEc929c4F38c8D8c03B2B2F225E98F133fa
//  Nouveautés vs V5 (V1) :
//    - Nouvelle adresse contrat V2.3
//    - ABI mis à jour : getLPStatus() 5 tranches LP + 6 flush, getFlushLPBalance()
//    - Suppression fonctions V1 obsolètes : enableTrading, queueManualMarketCap,
//      executeManualMarketCap, sweepLockedRewards, manualMarketCap
//    - Affichage tranches LP MCap (5) + Flush LP (6 paliers prix)
//    - Vault balance, flush LP balance, auto-LP buffer
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
    contractAddress : "0x22E0fcEc929c4F38c8D8c03B2B2F225E98F133fa", // ✅ V2.3 Mainnet
    chainId         : 56,
    rpcUrl          : "https://bsc-dataseed.binance.org/",
    explorerUrl     : "https://bscscan.com/tx/",
};

const ABI = [
    // ── View ──────────────────────────────────────────────────────────────────
    "function balanceOf(address) view returns (uint256)",
    "function pendingRewardsOf(address) view returns (uint256)",
    "function vaultBalance() view returns (uint256)",
    "function nextMilestoneUSD() view returns (uint256)",
    "function milestonesReached() view returns (uint256)",
    "function getMarketCap() view returns (uint256)",
    "function getMHTPrice() view returns (uint256)",
    "function getRewardsPool() view returns (uint256)",
    "function getCirculatingSupply() view returns (uint256)",
    "function getEligibleSupply() view returns (uint256)",
    "function getVaultBalance() view returns (uint256)",
    "function getLPBalance() view returns (uint256)",
    "function getFlushLPBalance() view returns (uint256)",
    "function getAutoLpBuffer() view returns (uint256)",
    "function getMarketingBuffer() view returns (uint256)",
    "function lastMilestoneTimestamp() view returns (uint256)",
    "function getCooldownRemaining() view returns (uint256)",
    "function getLPStatus() view returns (bool t1, bool t2, bool t3, bool t4, bool t5, bool f1, bool f2, bool f3, bool f4, bool f5, bool f6, uint256 remainingLP, uint256 remainingFlush)",
    "function liquidityInitialized() view returns (bool)",
    "function owner() view returns (address)",

    // ── Write ─────────────────────────────────────────────────────────────────
    "function claimRewards() external",
];

let _provider, _signer, _contract, _userAddress;
let _refreshInterval = null;

// ── Helpers formatage (ethers v6) ─────────────────────────────────────────────
const fmt = (v, d = 2) =>
    parseFloat(ethers.formatUnits(v, 18)).toLocaleString("fr-FR", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
    });

const fmtUSD = (v) =>
    "$" + parseFloat(ethers.formatUnits(v, 18)).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

const fmtCountdown = (secondsLeft) => {
    if (secondsLeft <= 0) return "Ready ✅";
    const h = Math.floor(secondsLeft / 3600);
    const m = Math.floor((secondsLeft % 3600) / 60);
    const s = secondsLeft % 60;
    return `${h}h ${m}m ${s}s`;
};

// ── Appelée par le modal après connexion ──────────────────────────────────────
window.initMHT = async function(provider, signer, address) {
    _provider    = provider;
    _signer      = signer;
    _userAddress = address;
    _contract    = new ethers.Contract(CONFIG.contractAddress, ABI, signer);

    await updateUI();

    if (_refreshInterval) clearInterval(_refreshInterval);
    _refreshInterval = setInterval(updateUI, 30000);
};

// ── Mise à jour de l'interface ────────────────────────────────────────────────
async function updateUI() {
    if (!_contract || !_userAddress) return;

    try {
        const [
            balance,
            pending,
            nextMilestone,
            milestonesDone,
            marketCap,
            rewardsPool,
            eligibleSupply,
            vaultBal,
            flushBal,
            cooldownRemaining,
            lpStatus,
        ] = await Promise.all([
            _contract.balanceOf(_userAddress),
            _contract.pendingRewardsOf(_userAddress),
            _contract.nextMilestoneUSD(),
            _contract.milestonesReached(),
            _contract.getMarketCap(),
            _contract.getRewardsPool(),
            _contract.getEligibleSupply(),
            _contract.getVaultBalance(),
            _contract.getFlushLPBalance(),
            _contract.getCooldownRemaining(),
            _contract.getLPStatus(),
        ]);

        // ── Balance utilisateur ───────────────────────────────────────────────
        const balEl = document.getElementById("mht-balance");
        if (balEl) balEl.textContent = fmt(balance, 2) + " MHT";

        // ── Market Cap ────────────────────────────────────────────────────────
        const mcEl = document.getElementById("market-cap");
        if (mcEl) mcEl.textContent = fmtUSD(marketCap);

        // ── Vault Balance ─────────────────────────────────────────────────────
        const vaultEl = document.getElementById("vault-balance");
        if (vaultEl) vaultEl.textContent = fmt(vaultBal, 0) + " MHT";

        // ── Rewards Pool ──────────────────────────────────────────────────────
        const rpEl = document.getElementById("rewards-pool");
        if (rpEl) rpEl.textContent = fmt(rewardsPool, 2) + " MHT";

        // ── Eligible Supply ───────────────────────────────────────────────────
        const esEl = document.getElementById("eligible-supply");
        if (esEl) esEl.textContent = fmt(eligibleSupply, 0) + " MHT";

        // ── Flush LP Balance ──────────────────────────────────────────────────
        const flushEl = document.getElementById("flush-lp-balance");
        if (flushEl) flushEl.textContent = fmt(flushBal, 0) + " MHT";

        // ── Statut connexion ──────────────────────────────────────────────────
        const statusEl = document.getElementById("accountStatus");
        if (statusEl) {
            statusEl.textContent = "Connected (BSC Mainnet)";
            statusEl.className = "fw-bold text-success";
        }

        // ── Milestones ────────────────────────────────────────────────────────
        const msEl = document.getElementById("milestoneStatus");
        if (msEl) msEl.textContent = milestonesDone.toString() + " Milestone(s) Reached! 🎉";

        // ── Cooldown prochain milestone ───────────────────────────────────────
        const cooldownEl = document.getElementById("milestoneCooldown");
        if (cooldownEl) {
            const remaining = Number(cooldownRemaining);
            cooldownEl.textContent = remaining > 0
                ? `⏳ Next milestone in: ${fmtCountdown(remaining)}`
                : "✅ Milestone available";
            cooldownEl.className = `info-badge ${remaining > 0 ? "badge-cooldown" : "badge-ready"}`;
        }

        // ── Barre de progression milestone ───────────────────────────────────
        const STEP = ethers.parseUnits("1000000", 18);
        const prevMilestone = nextMilestone - STEP;
        let progress = 0;
        if (marketCap >= nextMilestone) {
            progress = 100;
        } else if (marketCap > prevMilestone) {
            const numerator   = marketCap - prevMilestone;
            const denominator = nextMilestone - prevMilestone;
            progress = Number((numerator * 100n) / denominator);
        }

        const progressBar = document.getElementById("milestoneBar");
        if (progressBar) {
            progressBar.style.width = progress + "%";
            progressBar.textContent = fmtUSD(marketCap) + " / " + fmtUSD(nextMilestone);
        }

        // ── Statut tranches LP MCap (5 tranches) ──────────────────────────────
        const lpStatusEl = document.getElementById("lp-status");
        if (lpStatusEl) {
            const { t1, t2, t3, t4, t5 } = lpStatus;
            const triggers = ["$1.5M", "$10M", "$25M", "$50M", "$75M"];
            const flags    = [t1, t2, t3, t4, t5];
            lpStatusEl.innerHTML = flags.map((f, i) =>
                `<span style="color:${f ? "#22c55e" : "#f97316"}">
                    ${f ? "✅" : "🔒"} LP T${i + 1} : 40M @ ${triggers[i]}
                </span>`
            ).join("<br>");
        }

        // ── Statut Flush LP (6 paliers prix) ─────────────────────────────────
        const flushStatusEl = document.getElementById("flush-status");
        if (flushStatusEl) {
            const { f1, f2, f3, f4, f5, f6 } = lpStatus;
            const prices = ["$0.0003", "$0.0004", "$0.0005", "$0.0006", "$0.0007", "$0.0008"];
            const flags  = [f1, f2, f3, f4, f5, f6];
            flushStatusEl.innerHTML = flags.map((f, i) =>
                `<span style="color:${f ? "#22c55e" : "#f97316"}">
                    ${f ? "✅" : "🔒"} Flush F${i + 1} @ ${prices[i]}
                </span>`
            ).join("<br>");
        }

        // ── Bouton Claim ──────────────────────────────────────────────────────
        const claimBtn = document.getElementById("claimBtn");
        const pendingFloat = parseFloat(ethers.formatUnits(pending, 18));
        if (claimBtn) {
            if (pendingFloat > 0) {
                claimBtn.innerHTML = `<i class="bi bi-gift me-2"></i>Claim ${fmt(pending, 2)} MHT`;
                claimBtn.disabled = false;
            } else {
                claimBtn.innerHTML = `<i class="bi bi-gift me-2"></i>No Rewards Yet`;
                claimBtn.disabled = true;
            }
        }

    } catch (err) {
        console.error("updateUI error:", err);
    }
}

// ── Claim Rewards ─────────────────────────────────────────────────────────────
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

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
    const claimBtn = document.getElementById("claimBtn");
    if (claimBtn) claimBtn.addEventListener("click", claimRewards);

    // Auto-connect si déjà connecté
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
