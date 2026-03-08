/**
 * MHT DASHBOARD - V3.0
 * Contract : 0x96c4B53E105141FA469645e157Cfb0644C7e27C3
 * Network  : BSC Testnet (chainId 97)
 */

const CONFIG = {
contractAddress : "0xA0FE718815ab57D953E4FA99dE8646D2810b9f7D",
    chainId         : 97,
    rpcUrl          : "https://data-seed-prebsc-1-s1.binance.org:8545/",
    explorerUrl     : "https://testnet.bscscan.com/tx/",
    chainName       : "BSC Testnet",
    nativeCurrency  : { name: "BNB", symbol: "BNB", decimals: 18 },
};

const ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function pendingRewardsOf(address) view returns (uint256)",
    "function claimRewards() external",
    "function vaultBalance() view returns (uint256)",
    "function nextMilestoneUSD() view returns (uint256)",
    "function milestonesReached() view returns (uint256)",
    "function getMarketCap() view returns (uint256)",
    "function manualMarketCapUSD() view returns (uint256)",
];

let provider, signer, contract, userAddress;

// ── Éléments UI ──────────────────────────────────────────────
const btnConnect      = document.getElementById("connectWalletBtn");
const btnClaim        = document.getElementById("claimBtn");
const elStatus        = document.querySelector(".wallet-card span.fw-bold");
const elBalance       = document.querySelector(".wallet-col .wallet-card:nth-child(2) span.fw-bold");
const elMarketCap     = document.querySelector(".wallet-card:last-child span.fw-bold");
const elMilestoneBar  = document.getElementById("milestoneBar");
const elMilestoneStatus = document.getElementById("milestoneStatus");

// ── Connexion Wallet ─────────────────────────────────────────
async function connectWallet() {
    try {
        if (!window.ethereum) {
            const install = confirm("Aucun portefeuille détecté. Installer MetaMask ?");
            if (install) window.open("https://metamask.io/download/", "_blank");
            return;
        }

        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);

        // Vérif réseau
        const { chainId } = await provider.getNetwork();
        if (chainId !== CONFIG.chainId) {
            try {
                await window.ethereum.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: "0x61" }],
                });
                provider = new ethers.providers.Web3Provider(window.ethereum);
            } catch (switchError) {
                // Réseau inconnu → on l'ajoute
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: "wallet_addEthereumChain",
                        params: [{
                            chainId         : "0x61",
                            chainName       : CONFIG.chainName,
                            nativeCurrency  : CONFIG.nativeCurrency,
                            rpcUrls         : [CONFIG.rpcUrl],
                            blockExplorerUrls: ["https://testnet.bscscan.com"],
                        }],
                    });
                    provider = new ethers.providers.Web3Provider(window.ethereum);
                } else {
                    alert("Veuillez basculer sur BSC Testnet.");
                    return;
                }
            }
        }

        signer      = provider.getSigner();
        userAddress = await signer.getAddress();
        contract    = new ethers.Contract(CONFIG.contractAddress, ABI, signer);

        updateStatusUI(userAddress);
        await refreshData();

        // Écoute les changements
        window.ethereum.on("accountsChanged", () => window.location.reload());
        window.ethereum.on("chainChanged",    () => window.location.reload());

    } catch (err) {
        console.error("Connexion annulée :", err);
    }
}

// ── Refresh toutes les données ───────────────────────────────
async function refreshData() {
    if (!userAddress || !contract) return;
    try {
        await Promise.all([
            updateBalance(),
            updateRewards(),
            updateMilestone(),
            updateMarketCap(),
        ]);
    } catch (e) {
        console.error("Erreur refresh :", e);
    }
}

async function updateBalance() {
    const raw = await contract.balanceOf(userAddress);
    const bal = parseFloat(ethers.utils.formatEther(raw));
    if (elBalance) elBalance.innerText = bal.toLocaleString("en-US", { maximumFractionDigits: 2 }) + " MHT";
}

async function updateRewards() {
    const raw    = await contract.pendingRewardsOf(userAddress);
    const amount = parseFloat(ethers.utils.formatEther(raw));
    if (btnClaim) {
        if (amount > 0) {
btnClaim.innerHTML = `<i class="bi bi-gift-fill me-2"></i>Claim ${amount.toLocaleString("en-US", {maximumFractionDigits: 2})} MHT`;            btnClaim.disabled  = false;
        } else {
            btnClaim.innerHTML = `<i class="bi bi-gift me-2"></i>No Rewards Yet`;
            btnClaim.disabled  = true;
        }
    }
}

async function updateMarketCap() {
    const raw = await contract.getMarketCap();
    const usd = parseFloat(ethers.utils.formatEther(raw));
    if (elMarketCap) {
        elMarketCap.innerText = "$" + usd.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }
}

async function updateMilestone() {
    const [vaultRaw, nextRaw, reachedRaw, mcapRaw] = await Promise.all([
        contract.vaultBalance(),
        contract.nextMilestoneUSD(),
        contract.milestonesReached(),
        contract.getMarketCap(),
    ]);

    const mcap      = parseFloat(ethers.utils.formatEther(mcapRaw));
    const next      = parseFloat(ethers.utils.formatEther(nextRaw));
    const reached   = reachedRaw.toNumber();
    const prev      = next - 1_000_000;

    // Progression entre le palier précédent et le prochain
    const progress  = Math.min(((mcap - prev) / 1_000_000) * 100, 100);
    const pct       = Math.max(0, Math.round(progress));

    if (elMilestoneBar) {
        elMilestoneBar.style.width  = pct + "%";
        elMilestoneBar.innerText    = `$${mcap.toLocaleString("en-US", { maximumFractionDigits: 0 })} / $${next.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    }

    if (elMilestoneStatus) {
        if (reached === 0) {
            elMilestoneStatus.innerText   = "Awaiting First Milestone 🚀";
            elMilestoneStatus.className   = "text-warning fw-bold";
        } else {
            elMilestoneStatus.innerText   = `${reached} Milestone(s) Reached! 🎉`;
            elMilestoneStatus.className   = "text-success fw-bold";
        }
    }
}

// ── Claim Rewards ────────────────────────────────────────────
async function claimRewards() {
    if (!signer) { alert("Connectez votre wallet d'abord."); return; }
    try {
        btnClaim.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Transaction...`;
        btnClaim.disabled  = true;

        const tx = await contract.claimRewards();
        alert(`Transaction envoyée !\n${CONFIG.explorerUrl}${tx.hash}`);
        await tx.wait();
        alert("🎉 Rewards reçus dans votre wallet !");
        await refreshData();

    } catch (err) {
        console.error(err);
        alert("Erreur : " + (err.data?.message || err.message));
        await updateRewards();
    }
}

// ── UI helpers ───────────────────────────────────────────────
function updateStatusUI(address) {
    const short = address.slice(0, 6) + "..." + address.slice(-4);
    btnConnect.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i>${short}`;
    if (elStatus) {
        elStatus.innerText  = "Connected (BSC Testnet)";
        elStatus.className  = "fw-bold text-success";
    }
}

// ── Chargement public (sans wallet) ─────────────────────────
async function loadPublicData() {
    try {
        const publicProvider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
        const publicContract = new ethers.Contract(CONFIG.contractAddress, ABI, publicProvider);

        const [mcapRaw, nextRaw, reachedRaw] = await Promise.all([
            publicContract.getMarketCap(),
            publicContract.nextMilestoneUSD(),
            publicContract.milestonesReached(),
        ]);

        const mcap    = parseFloat(ethers.utils.formatEther(mcapRaw));
        const next    = parseFloat(ethers.utils.formatEther(nextRaw));
        const reached = reachedRaw.toNumber();
        const prev    = next - 1_000_000;
        const pct     = Math.max(0, Math.min(Math.round(((mcap - prev) / 1_000_000) * 100), 100));

        if (elMilestoneBar) {
            elMilestoneBar.style.width = pct + "%";
            elMilestoneBar.innerText   = `$${mcap.toLocaleString("en-US", { maximumFractionDigits: 0 })} / $${next.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
        }
        if (elMilestoneStatus) {
            elMilestoneStatus.innerText = reached > 0 ? `${reached} Milestone(s) Reached! 🎉` : "Awaiting First Milestone 🚀";
            elMilestoneStatus.className = reached > 0 ? "text-success fw-bold" : "text-warning fw-bold";
        }
        if (elMarketCap) {
            elMarketCap.innerText = "$" + mcap.toLocaleString("en-US", { maximumFractionDigits: 0 });
        }
    } catch (e) {
        console.error("Erreur chargement public :", e);
    }
}

// ── Events ───────────────────────────────────────────────────
btnConnect.addEventListener("click", connectWallet);
if (btnClaim) btnClaim.addEventListener("click", claimRewards);

// Refresh auto toutes les 30 secondes
setInterval(() => {
    if (userAddress) refreshData();
    else loadPublicData();
}, 30_000);

// Chargement initial sans wallet
window.addEventListener("load", loadPublicData);
