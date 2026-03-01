const btnConnect = document.getElementById('btn-connect');
const statusText = document.getElementById('status-text');

async function connectWallet() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            statusText.innerText = "Connecté : " + accounts[0].substring(0, 6) + "...";
            statusText.className = "h6 fw-bold text-success";
            btnConnect.innerHTML = '<i class="bi bi-check-circle me-2"></i>Connecté';
        } catch (error) {
            console.error("Connexion refusée");
        }
    } else {
        alert("Installez MetaMask !");
    }
}

btnConnect.addEventListener('click', connectWallet);
