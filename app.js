// ─────────────────────────────────────────────
//  MHT — Milestone HODL Token — app.js V3.2
//  Compatible avec le nouveau Wallet Modal
// ─────────────────────────────────────────────

const CONFIG = {
    contractAddress : "0x4d79F48E5bF104F2303620F23abC9C2512077e4D",
    chainId         : 97,
    rpcUrl          : "https://data-seed-prebsc-1-s1.binance.org:8545/",
    explorerUrl     : "https://testnet.bscscan.com/tx/",
};

const ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function pendingRewardsOf(address) view returns (uint256)",
    "function claimRewards() external",
    "function vaultBalance() view returns (uint256)",
    "function nextMilestoneUSD() view returns (uint256)",
    "function milestonesReached() view returns (uint256)",
    "function getMarketCap() view returns (uint256)",
    "function getRewardsPool() view returns (uint256)",
    "function getCirculatingSupply() view returns (uint256)",
];

let _provider, _signer, _contract, _userAddress;
let _refreshInterval = null;

// ── Appelée par le modal après connexion ──────
window.initMHT = async function(provider, signer, address) {
    _provider    = provider;
    _signer      = signer;
    _userAddress = address;
    _contract    = new ethers.Contract(CONFIG.contractAddress, ABI, signer);

    await updateUI();

    if (_refreshInterval) clearInterval(_refreshInterval);
    _refreshInterval = setInterval(updateUI, 30000);
};

// ── Mise à jour de l'interface ────────────────
async function updateUI() {
    if (!_contract || !_userAddress) return;

    try {
        const [
            balance,
            pending,
            nextMilestone,
            milestonesDone,
            marketCap,
        ] = await Promise.all([
            _contract.balanceOf(_userAddress),
            _contract.pendingRewardsOf(_userAddress),
            _contract.nextMilestoneUSD(),
            _contract.milestonesReached(),
            _contract.getMarketCap(),
        ]);

        const fmt = (v, d = 2) =>
            parseFloat(ethers.utils.formatUnits(v, 18)).toLocaleString("fr-FR", {
                minimumFractionDigits: d,
                maximumFractionDigits: d,
            });

        const fmtUSD = (v) =>
            "$" + parseFloat(ethers.utils.formatUnits(v, 18)).toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            });

        // Balance
        const balEl = document.getElementById("mht-balance");
        if (balEl) balEl.textContent = fmt(balance, 2) + " MHT";

        // Market Cap
        const mcEl = document.getElementById("market-cap");
        if (mcEl) mcEl.textContent = fmtUSD(marketCap);

        // Account status
        const statusEl = document.getElementById("accountStatus");
        if (statusEl) {
            statusEl.textContent = "Connected (BSC Testnet)";
            statusEl.className = "fw-bold text-success";
        }

        // Milestones
        const msEl = document.getElementById("milestoneStatus");
        if (msEl) msEl.textContent = milestonesDone.toString() + " Milestone(s) Reached! 🎉";

        // Barre de progression
        const STEP = ethers.utils.parseUnits("1000000", 18);
        const prevMilestone = nextMilestone.sub(STEP);
        let progress = 0;
        if (marketCap.gte(nextMilestone)) {
            progress = 100;
        } else if (marketCap.gt(prevMilestone)) {
            progress = marketCap.sub(prevMilestone).mul(100).div(nextMilestone.sub(prevMilestone)).toNumber();
        }

        const progressBar = document.getElementById("milestoneBar");
        if (progressBar) {
            progressBar.style.width = progress + "%";
            progressBar.textContent = fmtUSD(marketCap) + " / " + fmtUSD(nextMilestone);
        }

        // Bouton Claim
        const claimBtn = document.getElementById("claimBtn");
        const pendingFloat = parseFloat(ethers.utils.formatUnits(pending, 18));
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
        console.error("Erreur updateUI :", err);
    }
}

// ── Claim Rewards ─────────────────────────────
async function claimRewards() {
    if (!_contract) return;
    try {
        const claimBtn = document.getElementById("claimBtn");
        if (claimBtn) claimBtn.innerHTML = `<i class="bi bi-hourglass me-2"></i>En cours…`;

        const tx = await _contract.claimRewards();
        await tx.wait();

        const explorerLink = CONFIG.explorerUrl + tx.hash;
        await updateUI();
        alert("✅ Rewards réclamés avec succès !\n\n" + explorerLink);

    } catch (err) {
        console.error("Erreur claim :", err);
        alert("Erreur : " + (err.reason || err.message));
        await updateUI();
    }
}

// ── Init ──────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
    const claimBtn = document.getElementById("claimBtn");
    if (claimBtn) claimBtn.addEventListener("click", claimRewards);

    // Auto-connect si déjà connecté (même session)
    if (window.ethereum && window.ethereum.selectedAddress) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        provider.getSigner().getAddress().then(address => {
            window.initMHT(provider, provider.getSigner(), address);
            const short = address.slice(0, 6) + '…' + address.slice(-4);
            const connectBtn = document.getElementById('connectWalletBtn');
            if (connectBtn) {
                connectBtn.innerHTML = `<i class="bi bi-check-circle me-2"></i>${short}`;
                connectBtn.style.background = 'linear-gradient(45deg, #10b981, #3b82f6)';
                window._mhtConnected = true;
            }
        }).catch(() => {});
    }
});
