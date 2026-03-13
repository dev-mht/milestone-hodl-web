// ─────────────────────────────────────────────────────────────────────────────
//  MHT — Milestone HODL Token — app.js V5
//  Changements vs V4.0 :
//    - Adresse contrat V5 (Mainnet) : 0x4EA0b53dC11c6C361904383b20E321d1478C37ac
//    - ABI : enableTrading(), getLiquidityBalance(), getLPStatus()
//    - UI : affichage statut tranches LP + liquidityBalance
//    - enableTrading() exposé pour le panel owner
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
    contractAddress : "0x4EA0b53dC11c6C361904383b20E321d1478C37ac", // ✅ V5 Mainnet
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
    "function getRewardsPool() view returns (uint256)",
    "function getCirculatingSupply() view returns (uint256)",
    "function manualMarketCapUSD() view returns (uint256)",
    "function useManualMarketCap() view returns (bool)",
    "function getEligibleSupply() view returns (uint256)",
    "function lastMilestoneTimestamp() view returns (uint256)",
    "function pendingManualMarketCapTime() view returns (uint256)",
    "function pendingManualMarketCap() view returns (uint256)",
    // ── View V4.1 ─────────────────────────────────────────────────────────────
    "function getLiquidityBalance() view returns (uint256)",
    "function getLPStatus() view returns (bool t1, bool t2, bool t3, bool t4, uint256 remaining)",

    // ── Write ─────────────────────────────────────────────────────────────────
    "function claimRewards() external",
    "function queueManualMarketCap(uint256) external",
    "function executeManualMarketCap() external",
    "function sweepLockedRewards() external",
    "function rescueTokens(address, uint256) external",
    "function setMaxTxAmount(uint256) external",
    // ── Write V4.1 ────────────────────────────────────────────────────────────
    "function enableTrading() external",
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
    if (secondsLeft <= 0) return "Prêt à exécuter ✅";
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
            lastMilestoneTs,
            pendingCapTime,
            pendingCapValue,
            liquidityBalance,
            lpStatus,
        ] = await Promise.all([
            _contract.balanceOf(_userAddress),
            _contract.pendingRewardsOf(_userAddress),
            _contract.nextMilestoneUSD(),
            _contract.milestonesReached(),
            _contract.getMarketCap(),
            _contract.getRewardsPool(),
            _contract.getEligibleSupply(),
            _contract.lastMilestoneTimestamp(),
            _contract.pendingManualMarketCapTime(),
            _contract.pendingManualMarketCap(),
            _contract.getLiquidityBalance(),
            _contract.getLPStatus(),
        ]);

        const nowSec = Math.floor(Date.now() / 1000);

        // ── Balance utilisateur ───────────────────────────────────────────────
        const balEl = document.getElementById("mht-balance");
        if (balEl) balEl.textContent = fmt(balance, 2) + " MHT";

        // ── Market Cap ────────────────────────────────────────────────────────
        const mcEl = document.getElementById("market-cap");
        if (mcEl) mcEl.textContent = fmtUSD(marketCap);

        // ── Rewards Pool ──────────────────────────────────────────────────────
        const rpEl = document.getElementById("rewards-pool");
        if (rpEl) rpEl.textContent = fmt(rewardsPool, 2) + " MHT";

        // ── Eligible Supply ───────────────────────────────────────────────────
        const esEl = document.getElementById("eligible-supply");
        if (esEl) esEl.textContent = fmt(eligibleSupply, 0) + " MHT";

        // ── Liquidity Balance (V4.1) ──────────────────────────────────────────
        const lbEl = document.getElementById("liquidity-balance");
        if (lbEl) lbEl.textContent = fmt(liquidityBalance, 0) + " MHT";

        // ── Statut tranches LP (V4.1) ─────────────────────────────────────────
        const lpStatusEl = document.getElementById("lp-status");
        if (lpStatusEl) {
            const { t1, t2, t3, t4 } = lpStatus;
            lpStatusEl.innerHTML = `
                <span class="${t1 ? 'text-success' : 'text-warning'}">
                    ${t1 ? '✅' : '⏳'} T1 : 80M (Lancement)
                </span><br>
                <span class="${t2 ? 'text-success' : 'text-muted'}">
                    ${t2 ? '✅' : '🔒'} T2 : 40M (Milestone 5)
                </span><br>
                <span class="${t3 ? 'text-success' : 'text-muted'}">
                    ${t3 ? '✅' : '🔒'} T3 : 40M (Milestone 10)
                </span><br>
                <span class="${t4 ? 'text-success' : 'text-muted'}">
                    ${t4 ? '✅' : '🔒'} T4 : 40M (Milestone 25)
                </span>
            `;
        }

        // ── Statut connexion ──────────────────────────────────────────────────
        const statusEl = document.getElementById("accountStatus");
        if (statusEl) {
            statusEl.textContent = "Connected (BSC Mainnet)";
            statusEl.className = "fw-bold text-success";
        }

        // ── Milestones ────────────────────────────────────────────────────────
        const msEl = document.getElementById("milestoneStatus");
        if (msEl) msEl.textContent = milestonesDone.toString() + " Milestone(s) Reached! 🎉";

        // ── Cooldown prochain milestone (H-03) ────────────────────────────────
        const cooldownEl = document.getElementById("milestoneCooldown");
        if (cooldownEl) {
            const COOLDOWN = 24 * 3600;
            const lastTs   = Number(lastMilestoneTs);
            if (lastTs === 0) {
                cooldownEl.textContent = "Aucun milestone encore déclenché";
                cooldownEl.className = "info-badge badge-ready";
            } else {
                const remaining = Math.max(0, lastTs + COOLDOWN - nowSec);
                cooldownEl.textContent = remaining > 0
                    ? `⏳ Prochain milestone dans : ${fmtCountdown(remaining)}`
                    : "✅ Milestone disponible";
                cooldownEl.className = `info-badge ${remaining > 0 ? 'badge-cooldown' : 'badge-ready'}`;
            }
        }

        // ── Timelock Market Cap (H-03) ────────────────────────────────────────
        const timelockEl = document.getElementById("marketCapTimelock");
        if (timelockEl) {
            const pendTs = Number(pendingCapTime);
            if (pendTs === 0) {
                timelockEl.style.display = "none";
            } else {
                timelockEl.style.display = "inline-block";
                const remaining = Math.max(0, pendTs - nowSec);
                if (remaining > 0) {
                    timelockEl.textContent = `⏳ Nouveau MCap $${parseFloat(ethers.formatUnits(pendingCapValue, 18)).toLocaleString()} dans : ${fmtCountdown(remaining)}`;
                    timelockEl.className = "info-badge badge-timelock mt-2";
                } else {
                    timelockEl.textContent = `✅ Nouveau MCap prêt ($${parseFloat(ethers.formatUnits(pendingCapValue, 18)).toLocaleString()})`;
                    timelockEl.className = "info-badge badge-ready mt-2";
                }
            }
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

        // ── Bouton enableTrading (V4.1) ───────────────────────────────────────
        const enableBtn = document.getElementById("enableTradingBtn");
        if (enableBtn) {
            enableBtn.disabled = lpStatus.t1; // disabled if already released
            enableBtn.innerHTML = lpStatus.t1
                ? `<i class="bi bi-check-circle me-2"></i>Trading Enabled ✅`
                : `<i class="bi bi-lightning me-2"></i>Enable Trading (80M LP)`;
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
        alert("✅ Rewards réclamés !\n\n" + CONFIG.explorerUrl + tx.hash);

    } catch (err) {
        console.error("Claim error:", err);
        alert("Error: " + (err.reason || err.message));
        await updateUI();
    }
}

// ── Enable Trading — V4.1 (owner only) ───────────────────────────────────────
window.enableTrading = async function() {
    if (!_contract) return;
    try {
        const btn = document.getElementById("enableTradingBtn");
        if (btn) btn.innerHTML = `<i class="bi bi-hourglass me-2"></i>Processing…`;

        const tx = await _contract.enableTrading();
        await tx.wait();

        await updateUI();
        alert(`✅ Trading activé ! 80 000 000 MHT envoyés au liquidity wallet.\n\n${CONFIG.explorerUrl + tx.hash}`);

    } catch (err) {
        alert("enableTrading error: " + (err.reason || err.message));
        await updateUI();
    }
};

// ── Queue Market Cap (H-03 — owner only) ─────────────────────────────────────
window.queueMarketCap = async function(usdAmount) {
    if (!_contract) return;
    try {
        const value = ethers.parseUnits(String(usdAmount), 18);
        const tx = await _contract.queueManualMarketCap(value);
        await tx.wait();
        alert(`✅ Market Cap $${usdAmount.toLocaleString()} en file d'attente.\nExécutable dans 24h.\n\n${CONFIG.explorerUrl + tx.hash}`);
        await updateUI();
    } catch (err) {
        alert("Error: " + (err.reason || err.message));
    }
};

// ── Execute Market Cap (H-03 — owner only) ───────────────────────────────────
window.executeMarketCap = async function() {
    if (!_contract) return;
    try {
        const tx = await _contract.executeManualMarketCap();
        await tx.wait();
        alert(`✅ Nouveau Market Cap appliqué !\n\n${CONFIG.explorerUrl + tx.hash}`);
        await updateUI();
    } catch (err) {
        alert("Error: " + (err.reason || err.message));
    }
};

// ── Sweep Locked Rewards (H-02 — owner only) ─────────────────────────────────
window.sweepRewards = async function() {
    if (!_contract) return;
    try {
        const tx = await _contract.sweepLockedRewards();
        await tx.wait();
        alert(`✅ Rewards bloqués récupérés !\n\n${CONFIG.explorerUrl + tx.hash}`);
        await updateUI();
    } catch (err) {
        alert("Error: " + (err.reason || err.message));
    }
};

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
    // Bouton Claim
    const claimBtn = document.getElementById("claimBtn");
    if (claimBtn) claimBtn.addEventListener("click", claimRewards);

    // Bouton Enable Trading (V4.1)
    const enableBtn = document.getElementById("enableTradingBtn");
    if (enableBtn) enableBtn.addEventListener("click", window.enableTrading);

    // Boutons admin
    const queueBtn = document.getElementById("queueMarketCapBtn");
    if (queueBtn) queueBtn.addEventListener("click", () => {
        const val = document.getElementById("marketCapInput")?.value;
        if (val && !isNaN(val)) window.queueMarketCap(Number(val));
        else alert("Entrez un montant USD valide.");
    });

    const execBtn = document.getElementById("executeMarketCapBtn");
    if (execBtn) execBtn.addEventListener("click", window.executeMarketCap);

    const sweepBtn = document.getElementById("sweepRewardsBtn");
    if (sweepBtn) sweepBtn.addEventListener("click", window.sweepRewards);

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
