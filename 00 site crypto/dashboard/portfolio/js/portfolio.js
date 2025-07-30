// ===== PORTFOLIO.JS - VERSION FINALE COMPLÈTE =====

console.log('💼 Initialisation module Portfolio');

// ===== DONNÉES DU PORTFOLIO =====
const PortfolioData = {
    totalValue: 0,
    totalProfit: 0,
    costBasis: 0,
    assets: [],
    transactions: [],
    isVisible: true,
    isLoading: true,  
    isInitialized: false 
};

// Flag pour empêcher les écrasements pendant le chargement
let portfolioFullyLoaded = false;

// ===== VÉRIFICATION AUTHENTIFICATION =====
function checkPortfolioAuth() {
    // Vérifier si l'utilisateur est connecté
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // Utilisateur connecté - initialiser le portfolio
                initPortfolio();
            } else {
                // Rediriger vers la page d'accueil si non connecté
                window.location.href = '../../index.html';
            }
        });
    } else {
        // Mode développement - initialiser directement
        console.log('🔧 Mode développement - portfolio');
        initPortfolio();
    }
}

// Vérification au chargement
document.addEventListener('DOMContentLoaded', checkPortfolioAuth);

// ===== INITIALISATION =====
async function initPortfolio() {    
    if (PortfolioData.isInitialized) {
        console.log('💼 Portfolio déjà initialisé');
        return;
    }
    PortfolioData.isInitialized = true;
    console.log('💼 Initialisation module portfolio');
    
    try {

        document.body.classList.add('portfolio-loading');
    
        // Mettre à jour l'interface utilisateur
        updatePortfolioUI();

        updateEmptyState(); // Masquer le "portfolio vide" pendant le chargement
        updatePortfolioMetrics(); // Afficher "Chargement..."

        // Initialiser crypto-loader
        if (typeof initDynamicCryptoList === 'function') {
            await initDynamicCryptoList();
        }
        
        // Charger les données depuis Firebase
        await loadUserPortfolio();
        
        // Initialiser les événements UNE SEULE FOIS
        initPortfolioEvents();

        // ATTENDRE que crypto-loader soit vraiment prêt
        while (!window.cryptoLoader?.isLoaded) {
            console.log('⏳ Attente crypto-loader...');
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Marquer le chargement comme terminé AVANT de calculer
        PortfolioData.isLoading = false;

        // Recalculer avec les vrais prix
        recalculatePortfolioTotals();

        // ATTENDRE que le calcul soit vraiment terminé
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('✅ Portfolio calculé avant démarrage prix:', PortfolioData.totalValue);
        
        // Recalculer avec les vrais prix
        recalculatePortfolioTotals();
        
        // Afficher les données APRÈS calcul
        updatePortfolioMetrics();
        displayAssets();
        displayTransactions();

        // Sauvegarder l'état initial si première visite
        if (PortfolioData.assets.length > 0) {
            await savePortfolioHistory();
        }

        // Démarrer le suivi des prix APRÈS tout le reste (UNE SEULE FOIS)
        if (!window.portfolioPriceTrackingStarted) {
            window.portfolioPriceTrackingStarted = true;
            setTimeout(async () => {
                // Initialiser les graphiques ICI une seule fois
                await initCharts();
                await startPortfolioPriceTracking();
                await savePortfolioHistory(true);
            }, 1000); // Réduire à 1 seconde
        }

        console.log('✅ Module portfolio initialisé');
    } catch (error) {
        console.error('❌ Erreur initialisation portfolio:', error);
    }
}



// ===== MISE À JOUR UI UTILISATEUR =====
function updatePortfolioUI() {
    if (!window.currentUser) {
        console.log('⏳ Utilisateur non connecté encore');
        return;
    }
    
    console.log('🎨 Mise à jour UI Portfolio pour:', window.currentUser.name);
    
    // === HEADER (en haut à droite) ===
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    
    if (userName) userName.textContent = window.currentUser.name;
    if (userAvatar) userAvatar.textContent = window.currentUser.avatar;
    
    // === SIDEBAR (à gauche) ===
    const sidebarUserName = document.getElementById('sidebar-user-name');
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    const userRank = document.querySelector('.user-rank');
    
    if (sidebarUserName) sidebarUserName.textContent = window.currentUser.name;
    if (sidebarAvatar) sidebarAvatar.textContent = window.currentUser.avatar;
    if (userRank) userRank.textContent = window.currentUser.rank;
    
    console.log('✅ UI Portfolio mise à jour');
}

async function loadUserPortfolio() {
    if (!window.currentUser?.id) {
        console.log('💼 Pas d\'utilisateur connecté');
        return;
    }
    
    try {
        if (typeof window.firebaseDb !== 'undefined') {
            console.log('🔍 Chargement portfolio pour:', window.currentUser.id);
            
            const userDoc = await window.firebaseDb.collection('users').doc(window.currentUser.id).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                console.log('📄 Document utilisateur trouvé:', userData);
                
                if (userData.investmentPortfolio) {
                    const investmentData = userData.investmentPortfolio;
                    console.log('💼 Portfolio trouvé:', investmentData);
                    
                    PortfolioData.assets = investmentData.assets || [];
                    PortfolioData.transactions = investmentData.transactions || [];
                    
                    console.log('✅ Chargé:', PortfolioData.transactions.length, 'transactions');
                    console.log('✅ Chargé:', PortfolioData.assets.length, 'actifs');
                    
                    // FORCER le recalcul complet
                    if (PortfolioData.transactions.length > 0) {
                        console.log('🔄 Recalcul forcé...');
                        PortfolioData.assets = []; // Vider pour recalculer
                        PortfolioData.transactions.forEach(transaction => {
                            updatePortfolioFromTransaction(transaction);
                        });
                        console.log('✅ Recalcul terminé - Valeur:', PortfolioData.totalValue);
                    }
                } else {
                    console.log('⚠️ Pas de portfolio investissement trouvé');
                }
            } else {
                console.log('⚠️ Document utilisateur non trouvé');
            }
        } else {
            console.log('⚠️ Firebase non disponible');
        }
    } catch (error) {
        console.error('❌ Erreur chargement portfolio:', error);
    }

    if (PortfolioData.transactions.length > 0) {
    console.log('✅ Portfolio complètement chargé et calculé');
    portfolioFullyLoaded = true;
    }
}

// ===== SAUVEGARDE FIREBASE =====
async function savePortfolio() {
    // ===== SYNCHRONISATION AVEC AUTH.JS =====
    function syncPortfolioWithAuth() {
        // Sauvegarder dans Firebase via auth.js pour mettre à jour le rang
        if (typeof window.savePortfolioData === 'function') {
            window.savePortfolioData(PortfolioData.totalValue, PortfolioData.totalProfit);
            console.log('🔄 Portfolio sync avec auth.js:', PortfolioData.totalValue);
        }

        // Synchroniser avec le dashboard si on est sur la page dashboard
        if (window.location.pathname.includes('dashboard.html') && typeof window.syncPortfolioData === 'function') {
            window.syncPortfolioData();
        }
    }

    if (!window.currentUser?.id) return;
    
    try {
        if (typeof window.firebaseDb !== 'undefined') {
            await window.firebaseDb.collection('users').doc(window.currentUser.id).update({
                investmentPortfolio: {
                    totalValue: PortfolioData.totalValue,
                    totalProfit: PortfolioData.totalProfit,
                    costBasis: PortfolioData.costBasis,
                    assets: PortfolioData.assets,
                    transactions: PortfolioData.transactions,
                    lastUpdate: new Date()
                }
            });
            
            console.log('💾 Portfolio INVESTISSEMENT sauvegardé');
        }
    } catch (error) {
        console.error('❌ Erreur sauvegarde portfolio:', error);
    }
}

// ===== SYNCHRONISATION AVEC AUTH.JS =====
function syncPortfolioWithAuth() {
    // Sauvegarder dans Firebase via auth.js pour mettre à jour le rang
    if (typeof window.savePortfolioData === 'function') {
        window.savePortfolioData(PortfolioData.totalValue, PortfolioData.totalProfit);
        console.log('🔄 Portfolio sync avec auth.js:', PortfolioData.totalValue);
    }
}

// ===== SYSTÈME D'HISTORIQUE INTELLIGENT =====
async function savePortfolioHistory(forceWeekly = false) {
    if (!window.currentUser?.id || !window.firebaseDb) return;
    
    try {
        const today = new Date().toISOString().split('T')[0]; // Format: 2025-01-17
        const userRef = window.firebaseDb.collection('users').doc(window.currentUser.id);
        
        // Récupérer l'historique existant
        const userDoc = await userRef.get();
        const userData = userDoc.exists ? userDoc.data() : {};
        
        const portfolioHistory = userData.portfolioHistory || {};
        const lastWeeklySave = userData.lastWeeklySave || null;
        const firstTransactionDate = userData.firstTransactionDate || today;
        
        // Vérifier si on doit sauvegarder
        let shouldSave = false;
        let saveReason = '';
        
        // 1. Forcer la sauvegarde hebdomadaire
        if (forceWeekly) {
            shouldSave = true;
            saveReason = 'Sauvegarde hebdomadaire automatique';
        }
        
        // 2. Nouvelle transaction
        else if (!portfolioHistory[today]) {
            shouldSave = true;
            saveReason = 'Nouvelle transaction';
        }
        
        // 3. Sauvegarde hebdomadaire si pas de transaction depuis 7 jours
        else if (lastWeeklySave) {
            const daysSinceLastSave = Math.floor((Date.now() - new Date(lastWeeklySave).getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceLastSave >= 7) {
                shouldSave = true;
                saveReason = 'Sauvegarde hebdomadaire (7 jours écoulés)';
            }
        }
        
        if (shouldSave) {
            // Mettre à jour l'historique
            portfolioHistory[today] = Math.round(PortfolioData.totalValue * 100) / 100; // Arrondir à 2 décimales
            
            // Sauvegarder dans Firebase
            await userRef.update({
                portfolioHistory: portfolioHistory,
                lastWeeklySave: today,
                firstTransactionDate: firstTransactionDate
            });
            
            console.log(`💾 Historique sauvegardé: ${saveReason} - ${formatCurrency(PortfolioData.totalValue)}`);
            
        }
        
    } catch (error) {
        console.error('❌ Erreur sauvegarde historique:', error);
    }

    // AJOUTER AUSSI LA SAUVEGARDE LOCALSTORAGE pour le dashboard
            localStorage.setItem('cryptotraders_investment_portfolio', JSON.stringify({
                totalValue: PortfolioData.totalValue,
                totalProfit: PortfolioData.totalProfit,
                costBasis: PortfolioData.costBasis,
                lastUpdate: new Date().toISOString()
            }));
}

// Charger l'historique depuis Firebase
async function loadPortfolioHistory() {
    if (!window.currentUser?.id || !window.firebaseDb) return {};
    
    try {
        const userDoc = await window.firebaseDb.collection('users').doc(window.currentUser.id).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            return userData.portfolioHistory || {};
        }
        
        return {};
    } catch (error) {
        console.error('❌ Erreur chargement historique:', error);
        return {};
    }
}



// ===== AFFICHAGE DES MÉTRIQUES =====
function updatePortfolioMetrics() {
    console.log('🔍 PortfolioData au début:', PortfolioData);
    // Valeur totale avec animation
    const totalElement = document.getElementById('portfolio-total');
    if (totalElement) {
        // Ne rien afficher tant que les prix ne sont pas chargés
        if (PortfolioData.isLoading || !window.cryptoLoader?.isLoaded || PortfolioData.assets.length === 0) {
            if (PortfolioData.isLoading || !window.cryptoLoader?.isLoaded) {
                totalElement.textContent = 'Chargement...';
                totalElement.style.color = 'rgba(255, 255, 255, 0.6)';

                // Masquer le message "portfolio vide" pendant le chargement
                const body = document.body;
                body.classList.remove('portfolio-has-data');
                body.classList.remove('portfolio-loaded');

                return;
            }
        }

        totalElement.textContent = formatCurrency(PortfolioData.totalValue);
        totalElement.style.color = '#ffffff';

        // Déclencher l'animation de couleur
        animatePortfolioChange();
    }
    
    // Calculer les gains/pertes 24h basés sur les prix actuels vs hier
    const { gain24h, percent24h } = calculate24hChange();
    
    // Changement 24h (pas total)
    const changeElement = document.getElementById('portfolio-change');
    const percentElement = document.getElementById('portfolio-percent');
    
    if (changeElement && percentElement) {
        changeElement.textContent = formatChange(gain24h);
        changeElement.className = `change-amount ${gain24h >= 0 ? 'positive' : 'negative'}`;
        
        percentElement.textContent = `${formatPercent(percent24h)} (24h)`;
        percentElement.className = `change-percent ${percent24h >= 0 ? 'positive' : 'negative'}`;
    }
    
    // Profit total (depuis le début)
    const profitElement = document.getElementById('total-profit');
    if (profitElement) {
        profitElement.textContent = formatChange(PortfolioData.totalProfit);
        profitElement.className = `metric-value ${PortfolioData.totalProfit >= 0 ? 'positive' : 'negative'}`;
    }

    // Pourcentage du profit total
    const profitCard = profitElement?.parentElement;
    const profitChangeElement = profitCard?.querySelector('.metric-change');
    if (profitChangeElement) {
        const totalProfitPercent = PortfolioData.costBasis > 0 ? 
            ((PortfolioData.totalProfit / PortfolioData.costBasis) * 100) : 0;
        profitChangeElement.textContent = `${formatPercent(totalProfitPercent)} (total)`;
        profitChangeElement.className = `metric-change ${totalProfitPercent >= 0 ? 'positive' : 'negative'}`;
    }
    
    // Coût de base
    const costElement = document.getElementById('cost-basis');
    if (costElement) {
        costElement.textContent = formatCurrency(PortfolioData.costBasis);
    }
    
    // Best/Worst performer
    updatePerformers();
    
    // Afficher/cacher le message vide
    updateEmptyState();
}





// ===== CALCULER LES VARIATIONS 24H RÉELLES =====
function calculate24hChange() {
    if (!window.cryptoLoader?.isLoaded || PortfolioData.assets.length === 0) {
        return { gain24h: 0, percent24h: 0 };
    }
    
    let totalGain24h = 0;
    let totalValueYesterday = 0;
    let totalValueToday = 0;
    
    PortfolioData.assets.forEach(asset => {
        const cryptoData = window.cryptoLoader.cryptos[asset.symbol + 'USDT'];
        if (!cryptoData) return;
        
        const currentPrice = cryptoData.price;
        const change24hPercent = cryptoData.change24h || 0;
        
        // Calculer le prix d'hier
        const yesterdayPrice = currentPrice / (1 + (change24hPercent / 100));
        
        // Valeur aujourd'hui vs hier
        const valueToday = asset.quantity * currentPrice;
        const valueYesterday = asset.quantity * yesterdayPrice;
        
        totalValueToday += valueToday;
        totalValueYesterday += valueYesterday;
        totalGain24h += (valueToday - valueYesterday);
    });
    
    const percent24h = totalValueYesterday > 0 ? ((totalGain24h / totalValueYesterday) * 100) : 0;
    
    return {
        gain24h: totalGain24h,
        percent24h: percent24h
    };
}



// ===== ANIMATION COULEUR PORTFOLIO (COMME DASHBOARD) =====
function animatePortfolioChange() {
    const portfolioElement = document.getElementById('portfolio-total');
    if (!portfolioElement) return;
    
    const oldValue = window.lastPortfolioValue || PortfolioData.totalValue;
    const newValue = PortfolioData.totalValue;
    
    // Animation couleur à CHAQUE actualisation
    const isUp = newValue > oldValue;
    const isDown = newValue < oldValue;
    
    if (isUp || isDown) {
        portfolioElement.style.transition = 'color 0.3s ease';
        portfolioElement.style.color = isUp ? '#08b108ff' : '#be2a37ff';
        
        // Retour couleur normale après 1s
        setTimeout(() => {
            portfolioElement.style.color = '#ffffff';
        }, 1000);
    }
    
    window.lastPortfolioValue = newValue;
}



function updatePerformers() {
    let bestPerformer = null;
    let worstPerformer = null;
    let bestProfit = -Infinity;
    let worstProfit = Infinity;
    
    PortfolioData.assets.forEach(asset => {
        if (asset.profit > bestProfit) {
            bestProfit = asset.profit;
            bestPerformer = asset;
        }
        if (asset.profit < worstProfit) {
            worstProfit = asset.profit;
            worstPerformer = asset;
        }
    });
    
    const bestElement = document.getElementById('best-performer');
    const worstElement = document.getElementById('worst-performer');
    
    if (bestElement) {
        if (bestPerformer) {
            bestElement.innerHTML = `🔥 ${bestPerformer.symbol}`;
            bestElement.parentElement.querySelector('.metric-change').textContent = 
                `${formatChange(bestPerformer.profit)} • ${formatPercent(bestPerformer.profitPercent)}`;
        } else {
            bestElement.innerHTML = '📈 -';
            bestElement.parentElement.querySelector('.metric-change').textContent = 'Aucune transaction';
        }
    }
    
    if (worstElement) {
        if (worstPerformer) {
            worstElement.innerHTML = `🩸 ${worstPerformer.symbol}`;
            worstElement.parentElement.querySelector('.metric-change').textContent = 
                `${formatChange(worstPerformer.profit)} • ${formatPercent(worstPerformer.profitPercent)}`;
        } else {
            worstElement.innerHTML = '🩸 -';
            worstElement.parentElement.querySelector('.metric-change').textContent = 'Aucune transaction';
        }
    }
}

function updateEmptyState() {
    const body = document.body;
    const assetsSection = document.querySelector('.assets-section');
    
    // Retirer la classe loading une fois le chargement terminé
    body.classList.remove('portfolio-loading');
    
    if (PortfolioData.transactions.length === 0) {
        body.classList.remove('portfolio-has-data');
        body.classList.add('portfolio-loaded');
        if (assetsSection) assetsSection.style.display = 'none';
    } else {
        body.classList.add('portfolio-has-data');
        body.classList.add('portfolio-loaded');
        if (assetsSection) assetsSection.style.display = 'block';
    }
}


// ===== AFFICHAGE DES ACTIFS =====
function displayAssets() {
    const assetsBody = document.getElementById('assets-body');
    if (!assetsBody) return;
    
    if (PortfolioData.assets.length === 0) {
        assetsBody.innerHTML = `
            <div class="table-row" style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.6);">
                <div style="grid-column: 1 / -1;">
                    💼 Aucun actif dans votre portfolio<br>
                    <small>Ajoutez votre première transaction pour commencer</small>
                </div>
            </div>
        `;
        return;
    }

    // Trier par valeur décroissante par défaut (sauf si tri actif)
    if (!window.currentSort || window.currentSort.column === 'value') {
        PortfolioData.assets.sort((a, b) => {
            const valueA = a.quantity * (window.cryptoLoader?.cryptos[a.symbol + 'USDT']?.price || a.price);
            const valueB = b.quantity * (window.cryptoLoader?.cryptos[b.symbol + 'USDT']?.price || b.price);
            return valueB - valueA; // Décroissant
        });
    }

    // Mettre à jour l'en-tête avec les classes cliquables (une seule fois)
    const assetsTable = document.querySelector('.assets-table');
    if (assetsTable && !assetsTable.dataset.headersUpdated) {
        const headers = assetsTable.querySelectorAll('.th');
        if (headers[2]) { headers[2].className = 'th sortable-header'; headers[2].dataset.sort = '1h'; }
        if (headers[3]) { headers[3].className = 'th sortable-header'; headers[3].dataset.sort = '24h'; }
        if (headers[4]) { headers[4].className = 'th sortable-header'; headers[4].dataset.sort = '7d'; }
        if (headers[5]) { headers[5].className = 'th sortable-header'; headers[5].dataset.sort = 'value'; }
        assetsTable.dataset.headersUpdated = 'true';
    }

    const isMobile = window.innerWidth <= 768;

    assetsBody.innerHTML = PortfolioData.assets.map(asset => {
        // Récupérer les données temps réel depuis crypto-loader
        const cryptoData = window.cryptoLoader?.cryptos[asset.symbol + 'USDT'];
        const currentPrice = cryptoData?.price || asset.price;
        const change24h = cryptoData?.change24h || 0;

        // Calculer les vraies périodes glissantes
        const change1h = calculateRollingChange(asset.symbol, 1);
        const change7d = calculateRollingChange(asset.symbol, 168);

        // Recalculer la valeur avec le prix actuel
        const currentValue = asset.quantity * currentPrice;
        const currentProfit = currentValue - (asset.quantity * asset.avgPrice);
        const currentProfitPercent = asset.avgPrice > 0 ? ((currentProfit / (asset.quantity * asset.avgPrice)) * 100) : 0;
        
        if (isMobile) {
            // Version mobile avec le nouveau layout 4 colonnes
            return `
                <div class="table-row" data-symbol="${asset.symbol}">
                    <div class="asset-info">
                        <img class="crypto-logo" src="https://assets.coincap.io/assets/icons/${asset.symbol.toLowerCase()}@2x.png" 
                             alt="${asset.symbol}" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';" />
                        <span class="crypto-icon-fallback" style="color: ${cryptoData?.color || '#00ff88'}; display: none;">${cryptoData?.icon || '💎'}</span>
                        <div class="asset-name">
                            <div class="asset-symbol">${asset.symbol}</div>
                            <div class="asset-fullname">${cryptoData?.name || asset.name}</div>
                        </div>
                    </div>
                    <div></div>
                    <div class="crypto-price-info">
                        <div class="crypto-current-price">${formatCurrency(currentPrice)}</div>
                        <div class="crypto-price-change ${change24h >= 0 ? 'positive' : 'negative'}">${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%</div>
                    </div>
                    <div class="crypto-holdings">
                        <div class="holdings-value">${formatCurrency(currentValue)}</div>
                        <div class="holdings-quantity">${asset.quantity.toFixed(2)} ${asset.symbol}</div>
                    </div>
                </div>
            `;
        } else {
            // Version desktop (table normale)
            return `
                <div class="table-row" data-symbol="${asset.symbol}">
                    <div class="asset-info">
                        <img class="crypto-logo" src="https://assets.coincap.io/assets/icons/${asset.symbol.toLowerCase()}@2x.png" 
                             alt="${asset.symbol}" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';" />
                        <span class="crypto-icon-fallback" style="color: ${cryptoData?.color || '#00ff88'}; display: none;">${cryptoData?.icon || '💎'}</span>
                        <div class="asset-name">
                            <div class="asset-symbol">${asset.symbol}</div>
                            <div class="asset-fullname">${cryptoData?.name || asset.name}</div>
                        </div>
                    </div>
                    <div class="table-value asset-price" data-symbol="${asset.symbol}">${formatCurrency(currentPrice)}</div>
                    <div class="table-value ${change1h >= 0 ? 'positive' : 'negative'}">${formatPercent(change1h)}</div>
                    <div class="table-value ${change24h >= 0 ? 'positive' : 'negative'}">${formatPercent(change24h)}</div>
                    <div class="table-value ${change7d >= 0 ? 'positive' : 'negative'}">${formatPercent(change7d)}</div>
                    <div class="table-value asset-value" data-symbol="${asset.symbol}">
                        ${formatCurrency(currentValue)}<br>
                        <small style="color: rgba(255,255,255,0.6);">${asset.quantity.toFixed(4)} ${asset.symbol}</small>
                    </div>
                    <div class="table-value">${formatCurrency(asset.avgPrice)}</div>
                    <div class="table-value asset-profit ${currentProfit >= 0 ? 'positive' : 'negative'}" data-symbol="${asset.symbol}">
                        ${formatChange(currentProfit)}<br>
                        <small>${formatPercent(currentProfitPercent)}</small>
                    </div>
                    <div class="table-actions">
                        <button class="action-btn buy-btn" data-symbol="${asset.symbol}">Acheter</button>
                        <button class="action-btn sell-btn" data-symbol="${asset.symbol}">Vendre</button>
                    </div>
                </div>
            `;
        }
    }).join('');
}




// ===== SYSTÈME DE TRI COLONNES =====
function initColumnSorting() {
    // État du tri
    if (!window.currentSort) {
        window.currentSort = { column: 'value', direction: 'desc', clickCount: 0 };
    }
    
    // Ajouter les événements de clic sur les en-têtes
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('sortable-header')) {
            const column = e.target.dataset.sort;
            handleColumnSort(column);
        }
    });
}

function handleColumnSort(column) {
    // Gérer les 3 clics : asc → desc → reset
    if (window.currentSort.column === column) {
        window.currentSort.clickCount++;
        if (window.currentSort.clickCount >= 3) {
            // 3ème clic : retour par défaut (valeur)
            window.currentSort = { column: 'value', direction: 'desc', clickCount: 0 };
        } else if (window.currentSort.clickCount === 2) {
            // 2ème clic : inverser
            window.currentSort.direction = window.currentSort.direction === 'asc' ? 'desc' : 'asc';
        }
    } else {
        // Nouveau tri : commencer par positif → négatif
        window.currentSort = { column: column, direction: 'desc', clickCount: 1 };
    }
    
    // Appliquer le tri
    sortAssets(window.currentSort.column, window.currentSort.direction);
    
    // Réafficher
    displayAssets();
    
    // Mettre à jour les indicateurs visuels
    updateSortIndicators();
}

function sortAssets(column, direction) {
    PortfolioData.assets.sort((a, b) => {
        let valueA, valueB;
        
        switch(column) {
            case '1h':
                valueA = calculateRollingChange(a.symbol, 1);
                valueB = calculateRollingChange(b.symbol, 1);
                break;
            case '24h':
                const cryptoDataA = window.cryptoLoader?.cryptos[a.symbol + 'USDT'];
                const cryptoDataB = window.cryptoLoader?.cryptos[b.symbol + 'USDT'];
                valueA = cryptoDataA?.change24h || 0;
                valueB = cryptoDataB?.change24h || 0;
                break;
            case '7d':
                valueA = calculateRollingChange(a.symbol, 168);
                valueB = calculateRollingChange(b.symbol, 168);
                break;
            case 'value':
            default:
                valueA = a.quantity * (window.cryptoLoader?.cryptos[a.symbol + 'USDT']?.price || a.price);
                valueB = b.quantity * (window.cryptoLoader?.cryptos[b.symbol + 'USDT']?.price || b.price);
                break;
        }
        
        return direction === 'desc' ? valueB - valueA : valueA - valueB;
    });
}

function updateSortIndicators() {
    // Enlever tous les indicateurs
    document.querySelectorAll('.sort-indicator').forEach(el => el.remove());
    
    // Ajouter l'indicateur sur la colonne active
    const activeHeader = document.querySelector(`[data-sort="${window.currentSort.column}"]`);
    if (activeHeader && window.currentSort.clickCount > 0) {
        const indicator = document.createElement('span');
        indicator.className = 'sort-indicator';
        indicator.textContent = window.currentSort.direction === 'desc' ? ' ↓' : ' ↑';
        activeHeader.appendChild(indicator);
    }
}






function updateAssetPrices() {

    // PROTECTION GLOBALE
    if (!portfolioFullyLoaded) {
        console.log('🛡️ Portfolio pas encore complètement chargé, skip updateAssetPrices');
        return;
    }


    console.log('💰 updateAssetPrices() appelée - Portfolio:', PortfolioData.totalValue);
    
    // === PROTECTION CONTRE L'ÉCRASEMENT ===
    // Ne pas mettre à jour si crypto-loader pas prêt
    if (!window.cryptoLoader?.isLoaded) {
        console.log('⏳ Crypto-loader pas prêt, skip updateAssetPrices');
        return;
    }
    
    // Ne pas mettre à jour si pas d'actifs ET qu'on a des transactions (= pas encore calculé)
    if (PortfolioData.assets.length === 0 && PortfolioData.transactions.length > 0) {
        console.log('⏳ Actifs pas encore calculés depuis transactions, skip updateAssetPrices');
        return;
    }
    
    // Ne pas mettre à jour si portfolio à 0 ET qu'on a des transactions
    if (PortfolioData.totalValue === 0 && PortfolioData.transactions.length > 0) {
        console.log('⏳ Portfolio pas encore calculé, skip updateAssetPrices');
        return;
    }
    
    // Si vraiment aucun actif, pas besoin de continuer
    if (PortfolioData.assets.length === 0) {
        console.log('📭 Aucun actif à mettre à jour');
        return;
    }
    // === FIN PROTECTION ===
    
    PortfolioData.isLoading = false;

    let totalValue = 0;
    let totalProfit = 0;
    let hasUpdates = false;
    
    PortfolioData.assets.forEach(asset => {
        const cryptoData = window.cryptoLoader.cryptos[asset.symbol + 'USDT'];
        if (!cryptoData || !cryptoData.price) return;
        
        const currentPrice = cryptoData.price;
        const currentValue = asset.quantity * currentPrice;
        const currentProfit = currentValue - (asset.quantity * asset.avgPrice);
        const currentProfitPercent = asset.avgPrice > 0 ? ((currentProfit / (asset.quantity * asset.avgPrice)) * 100) : 0;
        
        totalValue += currentValue;
        totalProfit += currentProfit;
        hasUpdates = true;
        
        // Mettre à jour les éléments DOM avec sélecteurs plus spécifiques
        const assetRow = document.querySelector(`[data-symbol="${asset.symbol}"]`);
        if (!assetRow) return;
        
        // Détecter mobile pour utiliser les bonnes classes
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Mise à jour mobile avec les nouvelles classes
            const priceInfo = assetRow.querySelector('.crypto-price-info');
            const holdings = assetRow.querySelector('.crypto-holdings');
            
            if (priceInfo) {
                const currentPriceEl = priceInfo.querySelector('.crypto-current-price');
                const changeEl = priceInfo.querySelector('.crypto-price-change');
                
                if (currentPriceEl) currentPriceEl.textContent = formatCurrency(currentPrice);
                if (changeEl) {
                    const change24h = cryptoData.change24h || 0;
                    changeEl.textContent = `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`;
                    changeEl.className = `crypto-price-change ${change24h >= 0 ? 'positive' : 'negative'}`;
                }
            }
            
            if (holdings) {
                const valueEl = holdings.querySelector('.holdings-value');
                const quantityEl = holdings.querySelector('.holdings-quantity');
                
                if (valueEl) valueEl.textContent = formatCurrency(currentValue);
                if (quantityEl) quantityEl.textContent = `${asset.quantity.toFixed(2)} ${asset.symbol}`;
            }
        } else {
            // Mise à jour desktop (ancienne méthode)
            const tableValues = assetRow.querySelectorAll('.table-value');
            
            // Prix (colonne 1 - index 0)
            if (tableValues[0]) {
                tableValues[0].textContent = formatCurrency(currentPrice);
            }
            
            // 1h% (colonne 2 - index 1) - Période glissante
            if (tableValues[1]) {
                const change1h = calculateRollingChange(asset.symbol, 1);
                tableValues[1].textContent = formatPercent(change1h);
                tableValues[1].className = `table-value ${change1h >= 0 ? 'positive' : 'negative'}`;
            }
            
            // 24h% (colonne 3 - index 2) - Vraies données
            if (tableValues[2] && cryptoData.change24h !== undefined) {
                const change24h = cryptoData.change24h;
                tableValues[2].textContent = formatPercent(change24h);
                tableValues[2].className = `table-value ${change24h >= 0 ? 'positive' : 'negative'}`;
            }
            
            // 7d% (colonne 4 - index 3) - Période glissante  
            if (tableValues[3]) {
                const change7d = calculateRollingChange(asset.symbol, 168);
                tableValues[3].textContent = formatPercent(change7d);
                tableValues[3].className = `table-value ${change7d >= 0 ? 'positive' : 'negative'}`;
            }
            
            // Avoirs (colonne 5 - index 4)
            if (tableValues[4]) {
                tableValues[4].innerHTML = `
                    ${formatCurrency(currentValue)}<br>
                    <small style="color: rgba(255,255,255,0.6);">${asset.quantity.toFixed(4)} ${asset.symbol}</small>
                `;
            }
            
            // Profit/Pertes (colonne 7 - index 6)
            if (tableValues[6]) {
                tableValues[6].className = `table-value asset-profit ${currentProfit >= 0 ? 'positive' : 'negative'}`;
                tableValues[6].innerHTML = `
                    ${formatChange(currentProfit)}<br>
                    <small>${formatPercent(currentProfitPercent)}</small>
                `;
            }
        }
    });
    
    if (hasUpdates) {
        // Mettre à jour les totaux
        PortfolioData.totalValue = totalValue;
        PortfolioData.totalProfit = totalProfit;

        console.log('💾 MAJ Portfolio - Nouvelle valeur:', totalValue);

        // SAUVEGARDER IMMÉDIATEMENT dans localStorage pour le dashboard
        localStorage.setItem('cryptotraders_dashboard_realtime', JSON.stringify({
            totalValue: PortfolioData.totalValue,
            totalProfit: PortfolioData.totalProfit,
            costBasis: PortfolioData.costBasis,
            lastUpdate: new Date().toISOString()
        }));
        
        console.log('📡 Données temps réel sauvegardées pour dashboard:', totalValue);

        if (!window.lastHistoricalFetch || Date.now() - window.lastHistoricalFetch > 300000) { // 5 minutes
            fetchRealHistoricalData();
            window.lastHistoricalFetch = Date.now();
        }
        
        // Mettre à jour les métriques
        updatePortfolioMetrics();

        // Mettre à jour window.currentUser pour le dashboard temps réel
        if (window.currentUser) {
            window.currentUser.portfolio = PortfolioData.totalValue;
            window.currentUser.dailyGain = PortfolioData.totalProfit;
        }

        // Régénérer selon le type d'onglet actif
        const activeTab = document.querySelector('.chart-tab.active');
        if (activeTab) {
            if (['24h', '7d'].includes(activeTab.dataset.period)) {
                // Données générées à la volée
                regenerateGeneratedData();
            } else if (['30d', '90d', '1y'].includes(activeTab.dataset.period)) {
                // Données historiques : régénérer + réappliquer
                generateRealChartData().then(() => {
                    switchChartPeriod(activeTab.dataset.period);
                });
            }
        }

        // Mettre à jour les graphiques en temps réel (sans régénération)
        updateChartDataInRealTime();
        
        // Synchroniser avec auth.js toutes les 30 secondes
        if (!window.lastPortfolioSync || Date.now() - window.lastPortfolioSync > 30000) {
            syncPortfolioWithAuth();
            window.lastPortfolioSync = Date.now();
        }
        
        console.log('📊 Prix portfolio mis à jour - Total:', formatCurrency(totalValue));
    }
}



// ===== CALCUL DES VARIATIONS AVEC VRAIES DONNÉES BINANCE =====
function calculateRollingChange(symbol, hoursBack) {
    // Pour les données 24h, on a déjà la vraie valeur
    if (hoursBack === 24) {
        const cryptoData = window.cryptoLoader?.cryptos[symbol + 'USDT'];
        return cryptoData?.change24h || 0;
    }
    
    // Pour 1h et 7j, récupérer depuis le cache ou retourner une estimation
    const cacheKey = `${symbol}_${hoursBack}h`;
    
    if (window.binanceHistoricalCache && window.binanceHistoricalCache[cacheKey]) {
        return window.binanceHistoricalCache[cacheKey];
    }
    
    // Estimation temporaire en attendant les vraies données
    const cryptoData = window.cryptoLoader?.cryptos[symbol + 'USDT'];
    const change24h = cryptoData?.change24h || 0;
    
    if (hoursBack === 1) {
        return change24h * 0.05; // Estimation très basique
    } else if (hoursBack === 168) {
        return change24h * 2.5; // Estimation très basique
    }
    
    return 0;
}




// ===== RÉCUPÉRATION DONNÉES HISTORIQUES BINANCE =====
async function fetchRealHistoricalData() {
    if (!window.binanceHistoricalCache) {
        window.binanceHistoricalCache = {};
    }
    
    const symbols = PortfolioData.assets.map(asset => asset.symbol + 'USDT');
    
    for (const symbol of symbols) {
        try {
            // Données 1h (2 points : maintenant et il y a 1h)
            const response1h = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=2`);
            const data1h = await response1h.json();
            
            if (data1h.length >= 2) {
                const priceNow = parseFloat(data1h[1][4]); // Close actuel
                const price1hAgo = parseFloat(data1h[0][4]); // Close il y a 1h
                const change1h = ((priceNow - price1hAgo) / price1hAgo) * 100;
                window.binanceHistoricalCache[`${symbol.replace('USDT', '')}_1h`] = change1h;
            }
            
            // Données 7j (2 points : maintenant et il y a 7 jours)
            const response7d = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=8`);
            const data7d = await response7d.json();
            
            if (data7d.length >= 8) {
                const priceNow = parseFloat(data7d[7][4]); // Close aujourd'hui
                const price7dAgo = parseFloat(data7d[0][4]); // Close il y a 7 jours
                const change7d = ((priceNow - price7dAgo) / price7dAgo) * 100;
                window.binanceHistoricalCache[`${symbol.replace('USDT', '')}_7d`] = change7d;
            }
            
        } catch (error) {
            console.log(`⚠️ Erreur données historiques ${symbol}:`, error);
        }
    }
    
    console.log('📊 Données historiques récupérées:', Object.keys(window.binanceHistoricalCache).length, 'entrées');
}









// ===== MISE À JOUR TEMPS RÉEL DU GRAPHIQUE (SANS RÉGÉNÉRATION) =====
function updateChartDataInRealTime() {
    // NE PAS mettre à jour si on affiche 24h ou 7j (données générées)
    const activeTab = document.querySelector('.chart-tab.active');
    if (activeTab && ['24h', '7d'].includes(activeTab.dataset.period)) {
        console.log(`⏸️ Pas de mise à jour temps réel en vue ${activeTab.dataset.period}`);
        return;
    }


    // NE PAS mettre à jour pendant l'initialisation
    if (PortfolioData.isLoading || !portfolioChart || !PortfolioData.chartData) return;
    
    // Mettre à jour seulement le dernier point (aujourd'hui) avec la valeur actuelle
    const lastIndex = PortfolioData.chartData.portfolioValues.length - 1;
    if (lastIndex >= 0) {
        PortfolioData.chartData.portfolioValues[lastIndex] = PortfolioData.totalValue;
        PortfolioData.chartData.btcValues[lastIndex] = PortfolioData.totalValue * 0.85;
        
        // Mettre à jour les graphiques sans les recréer
        portfolioChart.data.datasets[0].data = PortfolioData.chartData.portfolioValues;
        portfolioChart.update('none');
        
        if (performanceChart) {
            performanceChart.data.datasets[0].data = PortfolioData.chartData.portfolioValues;
            performanceChart.data.datasets[1].data = PortfolioData.chartData.btcValues;
            performanceChart.update('none');
        }
    }
}


// ===== SUIVI DES PRIX TEMPS RÉEL (COMME TRADING) =====
async function startPortfolioPriceTracking() {
    console.log('🚀 DÉMARRAGE suivi prix portfolio');
    
    // ATTENDRE 5 SECONDES avant de démarrer le tracking
    console.log('⏳ Attente 5s pour laisser le temps au portfolio de se charger...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Vérifier que le portfolio est bien chargé avant de commencer
    if (PortfolioData.transactions.length > 0 && PortfolioData.totalValue === 0) {
        console.log('🔧 Portfolio pas encore calculé, on force le recalcul...');
        recalculatePortfolioTotals();
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('✅ Démarrage effectif du tracking prix - Portfolio:', PortfolioData.totalValue);
    
    const fetchPrices = async () => {
        try {
            // Attendre que crypto-loader soit vraiment prêt
            if (!window.cryptoLoader?.isLoaded) {
                console.log('⏳ Crypto-loader pas encore prêt...');
                return;
            }

            // Récupérer prix + stats 24h depuis Binance
            const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
            const allStats = await response.json();
            
            allStats.forEach(item => {
                // METTRE À JOUR LES DONNÉES CRYPTO-LOADER
                if (window.cryptoLoader?.cryptos[item.symbol]) {
                    window.cryptoLoader.cryptos[item.symbol].price = parseFloat(item.lastPrice);
                    window.cryptoLoader.cryptos[item.symbol].change24h = parseFloat(item.priceChangePercent);
                    window.cryptoLoader.cryptos[item.symbol].high24h = parseFloat(item.highPrice);
                    window.cryptoLoader.cryptos[item.symbol].low24h = parseFloat(item.lowPrice);
                    window.cryptoLoader.cryptos[item.symbol].volume = parseFloat(item.quoteVolume);
                }
            });
            
            // Mettre à jour l'affichage des actifs
            updateAssetPrices();
            
        } catch (error) {
            console.log('⚠️ Erreur récupération prix portfolio:', error);
        }
    };
    
    await fetchPrices();
    setInterval(fetchPrices, 10000); // Mise à jour toutes les 10 secondes
}


// ===== AFFICHAGE DES TRANSACTIONS =====
function displayTransactions() {
    const transactionsBody = document.getElementById('transactions-body');
    if (!transactionsBody) return;
    
    if (PortfolioData.transactions.length === 0) {
        transactionsBody.innerHTML = `
            <div class="table-row" style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.6);">
                <div style="grid-column: 1 / -1;">
                    📋 Aucune transaction<br>
                    <small>Commencez par ajouter votre première transaction</small>
                </div>
            </div>
        `;
        return;
    }
    
    transactionsBody.innerHTML = PortfolioData.transactions.map(transaction => `
        <div class="table-row">
            <div class="table-value">
                ${new Date(transaction.date).toLocaleDateString('fr-FR')}
            </div>
            <div class="table-value">
                <span class="transaction-type ${transaction.type}">${transaction.type}</span>
            </div>
            <div class="table-value">
                <div class="asset-info">
                    <div class="asset-logo ${getCryptoLogo(transaction.symbol)}">
                        ${getAssetIcon(transaction.symbol)}
                    </div>
                    <span>${transaction.symbol}</span>
                </div>
            </div>
            <div class="table-value">${transaction.quantity.toFixed(4)}</div>
            <div class="table-value">${formatCurrency(transaction.price)}</div>
            <div class="table-value">${formatCurrency(transaction.total)}</div>
            <div class="table-actions">
                <button class="action-btn delete-btn" data-id="${transaction.id}">🗑️</button>
            </div>
        </div>
    `).join('');
}

// ===== ÉVÉNEMENTS =====
function initPortfolioEvents() {
    console.log('🔧 Initialisation événements portfolio');
    
    // Boutons principaux
    const addTransactionBtn = document.getElementById('add-transaction-btn');
    const addFirstTransactionBtn = document.getElementById('add-first-transaction');
    const exportBtn = document.getElementById('export-portfolio-btn');
    const visibilityToggle = document.getElementById('visibility-toggle');
    
    if (addTransactionBtn) {
        addTransactionBtn.addEventListener('click', addTransaction);
    }
    
    if (addFirstTransactionBtn) {
        addFirstTransactionBtn.addEventListener('click', addTransaction);
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportPortfolio);
    }
    
    if (visibilityToggle) {
        visibilityToggle.addEventListener('click', toggleVisibility);
    }
    
    // Modal
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-transaction');
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    // Formulaire
    const transactionForm = document.getElementById('transaction-form');
    if (transactionForm) {
        transactionForm.addEventListener('submit', handleTransactionSubmit);
    }
    
    // Boutons de vue
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchView(btn.dataset.view);
        });
    });
    
    // Délégation d'événements pour les boutons dynamiques
    document.addEventListener('click', handleDynamicClicks);

    // Initialiser les onglets de graphique
    initChartTabs();

    // AJOUTER CETTE LIGNE :
    initColumnSorting();
    
    console.log('✅ Événements portfolio initialisés');
}



// ===== GESTION DES ONGLETS GRAPHIQUE =====
function initChartTabs() {
    console.log('📊 Initialisation onglets graphique');
    
    const chartTabs = document.querySelectorAll('.chart-tab');
    
    chartTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const period = e.target.dataset.period;
            switchChartPeriod(period);
            
            // Mettre à jour l'onglet actif
            chartTabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
}



function switchChartPeriod(period) {
    console.log(`📊 Changement période graphique: ${period}`);
    
    if (!portfolioChart) return;
    
    let filteredLabels, filteredPortfolio;
    
        if (period === '24h') {
            // CALCULER les vraies variations 24h basées sur les cryptos réelles
            const now = new Date();
            const labels24h = [];
            const values24h = [];
            const currentValue = PortfolioData.totalValue;

            for (let i = 23; i >= 0; i--) {
                const hourDate = new Date(now.getTime() - i * 60 * 60 * 1000);
                const hour = hourDate.getHours().toString().padStart(2, '0');
                labels24h.push(`${hour}h`);

                // Calculer la valeur du portfolio pour cette heure basée sur les cryptos
                let portfolioValueAtHour = 0;

                PortfolioData.assets.forEach(asset => {
                    const cryptoData = window.cryptoLoader?.cryptos[asset.symbol + 'USDT'];
                    if (!cryptoData?.price) return;

                    const currentPrice = cryptoData.price;
                    const change24h = cryptoData.change24h || 0;

                    // Calculer le prix il y a X heures avec progression réaliste
                    const hoursAgo = i;
                    const totalHours = 24;

                    // Variation progressive : plus on remonte, plus la différence est importante
                    const progressionFactor = hoursAgo / totalHours; // 0 = maintenant, 1 = il y a 24h

                    // Appliquer la variation 24h de façon progressive
                    const priceChangeAtHour = change24h * progressionFactor;
                    const historicalPrice = currentPrice / (1 + (priceChangeAtHour / 100));

                    // Ajouter un peu de volatilité horaire réaliste
                    const hourlyVolatility = Math.sin(hoursAgo * 0.5) * 0.02 + (Math.random() - 0.5) * 0.01;
                    const volatilePrice = historicalPrice * (1 + hourlyVolatility);

                    portfolioValueAtHour += asset.quantity * volatilePrice;
                });

                // Si pas d'actifs, utiliser la valeur actuelle avec variation
                if (portfolioValueAtHour === 0) {
                    const hoursAgo = i;
                    const variation = Math.sin(hoursAgo * 0.3) * 0.02 + (Math.random() - 0.5) * 0.01;
                    portfolioValueAtHour = currentValue * (1 + variation);
                }

                values24h.push(Math.max(0, portfolioValueAtHour));
            }

            // S'assurer que la dernière valeur est exactement la valeur actuelle
            values24h[values24h.length - 1] = currentValue;

            filteredLabels = labels24h;
            filteredPortfolio = values24h;

 

            console.log('📊 Graphique 24h généré:', 
                `De ${formatCurrency(values24h[0])} à ${formatCurrency(currentValue)}`);
       
            const firstValue = values24h[0];
            const lastValue = values24h[values24h.length - 1];
            const isNegative = lastValue < firstValue;
            chartColor = isNegative ? '#ff4757' : '#00ff88';
            chartBgColor = isNegative ? 'rgba(255, 71, 87, 0.1)' : 'rgba(0, 255, 136, 0.1)';
                
            filteredLabels = labels24h;
            filteredPortfolio = values24h;
       
       
         } else {
        // Utiliser les données existantes pour les autres périodes
        const { labels, portfolioValues } = PortfolioData.chartData;
        
        switch(period) {
            case '7d':
                filteredLabels = labels.slice(-7);
                filteredPortfolio = portfolioValues.slice(-7);
                break;
            case '30d':
                filteredLabels = labels.slice(-30);
                filteredPortfolio = portfolioValues.slice(-30);
                break;
            case '90d':
                filteredLabels = labels.slice(-90);
                filteredPortfolio = portfolioValues.slice(-90);
                break;
            case '1y':
            default:
                filteredLabels = labels;
                filteredPortfolio = portfolioValues;
                break;
        }

        const firstValue = filteredPortfolio[0];
        const lastValue = filteredPortfolio[filteredPortfolio.length - 1];
        const isNegative = lastValue < firstValue;
        const chartColor = isNegative ? '#ff4757' : '#00ff88';
        const chartBgColor = isNegative ? 'rgba(255, 71, 87, 0.1)' : 'rgba(0, 255, 136, 0.1)';


    }
    
    // Mettre à jour SEULEMENT le graphique historique (pas performance)
    if (portfolioChart) {
        portfolioChart.data.labels = filteredLabels;
        portfolioChart.data.datasets[0].data = filteredPortfolio;
        // Changer la couleur selon la performance
        portfolioChart.data.datasets[0].borderColor = chartColor;
        portfolioChart.data.datasets[0].backgroundColor = chartBgColor;
        portfolioChart.update();
    }
}




// Fonction pour régénérer les données avec les nouveaux prix
function regenerateGeneratedData() {
    const activeTab = document.querySelector('.chart-tab.active');
    // SEULEMENT 24h et 7j ont des données générées, pas 30j/90j/Tout
    if (activeTab && ['24h', '7d'].includes(activeTab.dataset.period)) {
        switchChartPeriod(activeTab.dataset.period);
    }
}

// Initialiser le sélecteur de crypto dans la modal
function initCryptoSelectorModal() {
    const searchInput = document.getElementById('crypto-search-modal');
    const dropdown = document.getElementById('crypto-dropdown');
    const hiddenInput = document.getElementById('transaction-crypto');
    
    if (!searchInput || !dropdown) return;
    
    // Afficher les cryptos populaires par défaut
    function showPopularCryptos() {
        if (!window.cryptoLoader?.isLoaded) {
            dropdown.innerHTML = '<div class="crypto-loading">Chargement des cryptos...</div>';
            return;
        }
        
        const popular = window.cryptoLoader.getCryptosByCategory('popular').slice(0, 10);
        displayCryptoOptions(popular);
    }
    
    // Afficher les options de crypto
    function displayCryptoOptions(cryptos) {
        dropdown.innerHTML = '';
        
        cryptos.forEach(crypto => {
            const option = document.createElement('div');
            option.className = 'crypto-option';
            option.innerHTML = `
                <img class="crypto-logo-small" src="https://assets.coincap.io/assets/icons/${crypto.symbol.toLowerCase()}@2x.png" 
                     alt="${crypto.symbol}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';" />
                <span class="crypto-icon-small" style="color: ${crypto.color}; display: none;">${crypto.icon}</span>
                <div class="crypto-info-small">
                    <strong>${crypto.name}</strong>
                    <small>${crypto.symbol}</small>
                </div>
                <div class="crypto-price-small">
                    $${crypto.price?.toFixed(crypto.price > 1 ? 2 : 6) || '---'}
                </div>
            `;
            
            option.addEventListener('click', () => {
                searchInput.value = `${crypto.name} (${crypto.symbol})`;
                hiddenInput.value = crypto.symbol;
                dropdown.style.display = 'none';
            });
            
            dropdown.appendChild(option);
        });
        
        dropdown.style.display = 'block';
    }
    
    // Recherche
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        if (query.length >= 2) {
            const results = window.cryptoLoader.searchCryptos(query);
            displayCryptoOptions(results);
        } else {
            showPopularCryptos();
        }
    });
    
    // Afficher/masquer dropdown
    searchInput.addEventListener('focus', () => {
        if (!dropdown.innerHTML) showPopularCryptos();
        dropdown.style.display = 'block';
    });
    
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
    
    // Initialiser
    showPopularCryptos();
}



function handleDynamicClicks(e) {
    // Boutons d'achat
    if (e.target.classList.contains('buy-btn')) {
        const symbol = e.target.dataset.symbol;
        buyCrypto(symbol);
    }
    
    // Boutons de vente
    if (e.target.classList.contains('sell-btn')) {
        const symbol = e.target.dataset.symbol;
        sellCrypto(symbol);
    }
    
    // Boutons de suppression
    if (e.target.classList.contains('delete-btn')) {
        const transactionId = parseInt(e.target.dataset.id);
        deleteTransaction(transactionId);
    }
}

// ===== GESTION DES VUES =====
function switchView(view) {
   // Mettre à jour les boutons
   document.querySelectorAll('.toggle-btn').forEach(btn => {
       btn.classList.toggle('active', btn.dataset.view === view);
   });
   
   // Mettre à jour les vues
   document.querySelectorAll('.portfolio-view').forEach(viewElement => {
       viewElement.classList.toggle('active', viewElement.id === `${view}-view`);
   });
   
   // Afficher les transactions si nécessaire
   if (view === 'transactions') {
       displayTransactions();
   }
}

// ===== GESTION DES TRANSACTIONS =====
function addTransaction() {
   const modal = document.getElementById('transaction-modal');
   if (modal) {
       modal.classList.add('active');
       
       // Définir la date actuelle
       const now = new Date();
       const dateInput = document.getElementById('transaction-date');
       if (dateInput) {
           dateInput.value = now.toISOString().slice(0, 16);
       }
       
       // ← AJOUTER CES LIGNES :
       // Initialiser le sélecteur après ouverture de la modal
       setTimeout(() => {
           initCryptoSelectorModal();
       }, 100);
   }
}

function closeModal() {
   const modal = document.getElementById('transaction-modal');
   if (modal) {
       modal.classList.remove('active');
       
       // Réinitialiser le formulaire
       const form = document.getElementById('transaction-form');
       if (form) {
           form.reset();
       }
   }
}


async function handleTransactionSubmit(e) {
   e.preventDefault();
   
   const transaction = {
       id: Date.now(),
       date: document.getElementById('transaction-date').value,
       type: document.getElementById('transaction-type').value,
       symbol: document.getElementById('transaction-crypto').value,
       quantity: parseFloat(document.getElementById('transaction-quantity').value),
       price: parseFloat(document.getElementById('transaction-price').value),
       fees: parseFloat(document.getElementById('transaction-fees').value) || 0
   };
   
   // Validation
   if (!transaction.symbol || !transaction.quantity || !transaction.price) {
       showNotification('❌ Veuillez remplir tous les champs obligatoires', 'error');
       return;
   }
   
   transaction.total = transaction.quantity * transaction.price;
   
   // Ajouter la transaction
   PortfolioData.transactions.unshift(transaction);
   
   // Mettre à jour le portfolio
   updatePortfolioFromTransaction(transaction);
   
   // Sauvegarder
   savePortfolio();
   
   // Fermer la modal
   closeModal();
   
    // Mettre à jour l'affichage
    updatePortfolioMetrics();
    displayAssets();
    displayTransactions();

    // FORCER la régénération complète du graphique avec les nouvelles données
    PortfolioData.chartData = null; // Forcer recalcul
    await generateRealChartData();
    initCharts();

    // Mettre à jour la répartition après transaction
    initAllocationChart();

    // Sauvegarder l'historique après nouvelle transaction
    await savePortfolioHistory();

    // ===== ATTRIBUTION POINTS PORTFOLIO =====
    if (window.PointsSystem && window.currentUser) {
        try {
            await window.PointsSystem.awardPortfolioPoints(
                window.currentUser.id, 
                'transaction_added'
            );
            console.log('🎯 Points attribués pour transaction portfolio');
        } catch (error) {
            console.error('❌ Erreur attribution points portfolio:', error);
        }
    }

    // Synchroniser avec auth.js pour mettre à jour le rang
   setTimeout(() => {
       syncPortfolioWithAuth();
   }, 1000);
   
   showNotification('✅ Transaction ajoutée avec succès !', 'success');
}

function updatePortfolioFromTransaction(transaction) {
   let asset = PortfolioData.assets.find(a => a.symbol === transaction.symbol);
   
   if (!asset) {
       // Créer un nouvel actif
       asset = {
           symbol: transaction.symbol,
           name: getCryptoName(transaction.symbol),
           logo: getCryptoLogo(transaction.symbol),
           quantity: 0,
           price: transaction.price,
           value: 0,
           avgPrice: 0,
           profit: 0,
           profitPercent: 0
       };
       PortfolioData.assets.push(asset);
   }
   
   if (transaction.type === 'buy') {
       const oldCost = asset.quantity * asset.avgPrice;
       const newCost = oldCost + transaction.total;
       asset.quantity += transaction.quantity;
       asset.avgPrice = asset.quantity > 0 ? newCost / asset.quantity : 0;
   } else {
       asset.quantity -= transaction.quantity;
       if (asset.quantity <= 0) {
           // Supprimer l'actif si la quantité est nulle
           const index = PortfolioData.assets.indexOf(asset);
           PortfolioData.assets.splice(index, 1);
           return;
       }
   }
   
   // Recalculer les valeurs
   asset.value = asset.quantity * asset.price;
   asset.profit = asset.value - (asset.quantity * asset.avgPrice);
   asset.profitPercent = asset.quantity > 0 && asset.avgPrice > 0 ? 
       ((asset.profit / (asset.quantity * asset.avgPrice)) * 100) : 0;
   
   // Recalculer les totaux
   recalculatePortfolioTotals();
}



function recalculatePortfolioTotals() {
    let totalValue = 0;
    let totalCostBasis = 0;
    
    // VIDER d'abord les actifs pour recalculer depuis zéro
    PortfolioData.assets = [];
    
    // Reconstruire les actifs depuis les transactions
    PortfolioData.transactions.forEach(transaction => {
        let asset = PortfolioData.assets.find(a => a.symbol === transaction.symbol);
        
        if (!asset) {
            // Créer un nouvel actif
            asset = {
                symbol: transaction.symbol,
                name: getCryptoName(transaction.symbol),
                logo: getCryptoLogo(transaction.symbol),
                quantity: 0,
                price: transaction.price,
                value: 0,
                avgPrice: 0,
                profit: 0,
                profitPercent: 0
            };
            PortfolioData.assets.push(asset);
        }
        
        if (transaction.type === 'buy') {
            const oldCost = asset.quantity * asset.avgPrice;
            const newCost = oldCost + transaction.total;
            asset.quantity += transaction.quantity;
            asset.avgPrice = asset.quantity > 0 ? newCost / asset.quantity : 0;
        } else {
            asset.quantity -= transaction.quantity;
        }
    });
    
    // Supprimer les actifs avec quantité nulle ou négative
    PortfolioData.assets = PortfolioData.assets.filter(asset => asset.quantity > 0);
    
    // Recalculer les valeurs avec les prix temps réel
    PortfolioData.assets.forEach(asset => {
        // Utiliser le prix temps réel si disponible
        const currentPrice = window.cryptoLoader?.cryptos[asset.symbol + 'USDT']?.price || asset.price;
        
        const currentValue = asset.quantity * currentPrice;
        const costBasis = asset.quantity * asset.avgPrice;
        
        // Mettre à jour l'actif
        asset.value = currentValue;
        asset.profit = currentValue - costBasis;
        asset.profitPercent = asset.avgPrice > 0 ? ((asset.profit / costBasis) * 100) : 0;
        
        totalValue += currentValue;
        totalCostBasis += costBasis;
    });
    
    PortfolioData.totalValue = totalValue;
    PortfolioData.costBasis = totalCostBasis;
    PortfolioData.totalProfit = totalValue - totalCostBasis;
    
    console.log('🔄 Totaux recalculés:', formatCurrency(totalValue), 'avec', PortfolioData.assets.length, 'actifs');
}



function deleteTransaction(transactionId) {
   if (confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
       const index = PortfolioData.transactions.findIndex(t => t.id === transactionId);
       if (index !== -1) {
           PortfolioData.transactions.splice(index, 1);
           
           // Recalculer tout le portfolio depuis zéro
           recalculatePortfolioFromTransactions();
           
           // Sauvegarder
           savePortfolio();
           
           // Mettre à jour l'affichage
           updatePortfolioMetrics();
           displayAssets();
           displayTransactions();
           
           showNotification('🗑️ Transaction supprimée', 'info');
       }
   }
}

function recalculatePortfolioFromTransactions() {
   // Vider les actifs
   PortfolioData.assets = [];
   PortfolioData.totalValue = 0;
   PortfolioData.totalProfit = 0;
   PortfolioData.costBasis = 0;
   
   // Recalculer depuis toutes les transactions
   PortfolioData.transactions.forEach(transaction => {
       updatePortfolioFromTransaction(transaction);
   });
}

// ===== ACTIONS CRYPTO =====
function buyCrypto(symbol) {
   const typeSelect = document.getElementById('transaction-type');
   const cryptoSelect = document.getElementById('transaction-crypto');
   
   if (typeSelect) typeSelect.value = 'buy';
   if (cryptoSelect) cryptoSelect.value = symbol;
   
   addTransaction();
}

function sellCrypto(symbol) {
   const typeSelect = document.getElementById('transaction-type');
   const cryptoSelect = document.getElementById('transaction-crypto');
   
   if (typeSelect) typeSelect.value = 'sell';
   if (cryptoSelect) cryptoSelect.value = symbol;
   
   addTransaction();
}

// ===== VISIBILITÉ =====
function toggleVisibility() {
   PortfolioData.isVisible = !PortfolioData.isVisible;
   
   const body = document.body;
   const eyeIcon = document.getElementById('visibility-toggle');
   
   if (PortfolioData.isVisible) {
       body.classList.remove('portfolio-hidden');
       if (eyeIcon) eyeIcon.textContent = '👁️';
   } else {
       body.classList.add('portfolio-hidden');
       if (eyeIcon) eyeIcon.textContent = '👁️‍🗨️';
   }
}

// ===== EXPORT =====
function exportPortfolio() {
   const data = {
       summary: {
           totalValue: PortfolioData.totalValue,
           totalProfit: PortfolioData.totalProfit,
           costBasis: PortfolioData.costBasis
       },
       assets: PortfolioData.assets,
       transactions: PortfolioData.transactions,
       exportDate: new Date().toISOString()
   };
   
   const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = `portfolio_${new Date().toISOString().split('T')[0]}.json`;
   a.click();
   URL.revokeObjectURL(url);
   
   showNotification('📤 Portfolio exporté avec succès !', 'success');
}

// ===== UTILITAIRES =====
function formatCurrency(amount) {
   return new Intl.NumberFormat('fr-FR', {
       style: 'currency',
       currency: 'USD',
       minimumFractionDigits: 2,
       maximumFractionDigits: 2
   }).format(amount);
}

function formatChange(amount) {
   const formatted = formatCurrency(Math.abs(amount));
   return amount >= 0 ? `+${formatted}` : `-${formatted}`;
}

function formatPercent(percent) {
   return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
}

function getAssetIcon(symbol) {
   const icons = {
       'BTC': '₿',
       'ETH': 'Ξ',
       'SOL': '◎',
       'BNB': '🔶',
       'ADA': '🔷',
       'DOT': '🔴',
       'AVAX': '🔺',
       'MATIC': '🟣'
   };
   return icons[symbol] || '💎';
}

function getCryptoLogo(symbol) {
   const logos = {
       'BTC': 'btc',
       'ETH': 'eth',
       'SOL': 'sol',
       'BNB': 'bnb',
       'ADA': 'ada',
       'DOT': 'dot',
       'AVAX': 'avax',
       'MATIC': 'matic'
   };
   return logos[symbol] || 'default';
}

function getCryptoName(symbol) {
   const names = {
       'BTC': 'Bitcoin',
       'ETH': 'Ethereum',
       'SOL': 'Solana',
       'BNB': 'BNB',
       'ADA': 'Cardano',
       'DOT': 'Polkadot',
       'AVAX': 'Avalanche',
       'MATIC': 'Polygon'
   };
   return names[symbol] || symbol;
}

function showNotification(message, type = 'info') {
   if (typeof window.showNotification === 'function' && window.showNotification !== showNotification) {
       window.showNotification(message, type);
   } else {
       console.log(`${type.toUpperCase()}: ${message}`);
   }
}



// ===== GRAPHIQUES =====
let portfolioChart, performanceChart, allocationChart;

async function initCharts() {
    console.log('📈 Initialisation des graphiques');
    
    // Détruire les graphiques existants
    if (portfolioChart) {
        portfolioChart.destroy();
        portfolioChart = null;
    }
    if (performanceChart) {
        performanceChart.destroy();
        performanceChart = null;
    }
    if (allocationChart) {
        allocationChart.destroy();
        allocationChart = null;
    }
    
    // Générer des données réelles
    await generateRealChartData();
    
    // Graphique principal du portfolio
    initPortfolioChart();
    
    // Graphique de performance
    initPerformanceChart();
    
    // Graphique de répartition
    initAllocationChart();

    // Initialiser les onglets après création des graphiques et afficher 24h par défaut
    initChartTabs();
    setTimeout(() => {
        switchChartPeriod('24h');
    }, 100);

}



// ===== GÉNÉRATION DONNÉES GRAPHIQUE RÉELLES =====
async function generateRealChartData() {
    console.log('📈 Génération graphique avec données réelles...');
    
    // Charger l'historique Firebase
    const portfolioHistory = await loadPortfolioHistory();
    
    if (Object.keys(portfolioHistory).length === 0) {
        // Pas d'historique : graphique par défaut
        generateFallbackChartData();
        return;
    }
    
    // Trier les dates
    const sortedDates = Object.keys(portfolioHistory).sort();
    const labels = [];
    const portfolioValues = [];
    const btcValues = [];
    
    // Si on a moins de 7 jours, simuler les variations avec les prix crypto
    if (sortedDates.length < 7) {
        await generateRealHistoricalData(sortedDates, portfolioHistory, labels, portfolioValues, btcValues);
    } else {
        // Utiliser les vraies données historiques
        sortedDates.forEach(dateStr => {
            const date = new Date(dateStr + 'T00:00:00');
            const day = date.getDate();
            const month = date.toLocaleDateString('fr-FR', { month: 'short' });
            labels.push(`${day} ${month}`);
            
            portfolioValues.push(portfolioHistory[dateStr]);
            btcValues.push(portfolioHistory[dateStr] * 0.85);
        });
    }
    
    PortfolioData.chartData = { labels, portfolioValues, btcValues };
    console.log(`✅ Graphique généré avec ${labels.length} points de données`);
}

// ===== GÉNÉRATION AVEC VRAIES DONNÉES HISTORIQUES =====
async function generateRealHistoricalData(sortedDates, portfolioHistory, labels, portfolioValues, btcValues) {
    const now = new Date();
    const currentValue = PortfolioData.totalValue;
    
    // Calculer combien de jours d'historique on veut
    const totalDays = 90; // 3 mois de vraies données
    
    console.log(`📊 Récupération vraies données historiques (${totalDays} jours)`);
    
    // Récupérer les vraies données pour chaque crypto du portfolio
    const cryptoHistoricalData = {};
    
    for (const asset of PortfolioData.assets) {
        try {
            const symbol = asset.symbol + 'USDT';
            const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=${totalDays}`);
            const data = await response.json();
            
            cryptoHistoricalData[asset.symbol] = data.map(kline => ({
                date: new Date(kline[0]),
                price: parseFloat(kline[4]) // Prix de clôture
            }));
            
            console.log(`✅ Données récupérées pour ${asset.symbol}:`, data.length, 'jours');
        } catch (error) {
            console.log(`⚠️ Erreur pour ${asset.symbol}:`, error);
        }
    }
    
    // Générer les valeurs du portfolio jour par jour
    for (let i = totalDays - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const day = date.getDate();
        const month = date.toLocaleDateString('fr-FR', { month: 'short' });
        labels.push(`${day} ${month}`);
        
        let portfolioValueAtDate = 0;
        
        // Pour chaque actif, calculer sa valeur à cette date
        PortfolioData.assets.forEach(asset => {
            const historicalData = cryptoHistoricalData[asset.symbol];
            if (!historicalData || historicalData.length === 0) return;
            
            // Trouver le prix à cette date (ou le plus proche)
            const dataIndex = totalDays - 1 - i;
            const historicalPrice = historicalData[dataIndex]?.price || asset.price;
            
            // Calculer la quantité possédée à cette date (basé sur les transactions)
            let quantityAtDate = 0;
            PortfolioData.transactions.forEach(transaction => {
                const transactionDate = new Date(transaction.date);
                if (transactionDate <= date && transaction.symbol === asset.symbol) {
                    if (transaction.type === 'buy') {
                        quantityAtDate += transaction.quantity;
                    } else {
                        quantityAtDate -= transaction.quantity;
                    }
                }
            });
            
            portfolioValueAtDate += quantityAtDate * historicalPrice;
        });
        
        portfolioValues.push(Math.max(0, portfolioValueAtDate));
        btcValues.push(Math.max(0, portfolioValueAtDate * 0.85));
    }
    
    // S'assurer que la dernière valeur est exactement la valeur actuelle
    portfolioValues[portfolioValues.length - 1] = currentValue;
    btcValues[btcValues.length - 1] = currentValue * 0.85;
}



// Fallback si pas d'historique
function generateFallbackChartData() {
    const now = new Date();
    const labels = [];
    const portfolioValues = [];
    const btcValues = [];
    
    const baseValue = PortfolioData.totalValue || 0;
    
    // Générer 30 jours de données avec variations réalistes
    for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const day = date.getDate();
        const month = date.toLocaleDateString('fr-FR', { month: 'short' });
        labels.push(`${day} ${month}`);
        
        // Variations réalistes basées sur la crypto
        const trend = Math.sin(i * 0.15) * 0.08; // Tendance sinusoïdale
        const volatility = Math.sin(i * 0.3) * 0.05; // Volatilité
        const dailyChange = (Math.random() - 0.5) * 0.03; // Variation quotidienne ±1.5%
        
        const value = baseValue * (1 + trend + volatility + dailyChange);
        portfolioValues.push(Math.max(0, value));
        btcValues.push(Math.max(0, value * 0.85));
    }
    
    // S'assurer que la dernière valeur correspond à la valeur actuelle
    portfolioValues[portfolioValues.length - 1] = baseValue;
    btcValues[btcValues.length - 1] = baseValue * 0.85;
    
    PortfolioData.chartData = { labels, portfolioValues, btcValues };
    console.log('📊 Graphique fallback généré (données avec variations)');
}


function initPortfolioChart() {
    const ctx = document.getElementById('portfolio-chart');
    if (!ctx) return;
    
    portfolioChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: PortfolioData.chartData.labels,
            datasets: [{
                label: 'Portfolio',
                data: PortfolioData.chartData.portfolioValues,
                borderColor: '#00ff88',
                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 20, 40, 0.95)',
                    titleColor: '#00ff88',
                    bodyColor: '#ffffff',
                    borderColor: '#00ff88',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            return `📅 ${context[0].label}`;
                        },
                        label: function(context) {
                            return `💰 Portfolio: ${formatCurrency(context.parsed.y)}`;
                        },
                        afterLabel: function(context) {
                            const currentValue = PortfolioData.totalValue;
                            const chartValue = context.parsed.y;
                            const diff = chartValue - currentValue;
                            const diffPercent = currentValue > 0 ? ((diff / currentValue) * 100) : 0;

                            if (Math.abs(diff) > 1) {
                                const sign = diff >= 0 ? '+' : '';
                                return `📈 Diff: ${sign}${formatCurrency(diff)} (${sign}${diffPercent.toFixed(2)}%)`;
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.6)'
                    }
                },
                y: {
                    display: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.6)',
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            },
            elements: {
                point: {
                    radius: 0,
                    hoverRadius: 8
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });

    
}

function initPerformanceChart() {
    const ctx = document.getElementById('performance-chart');
    if (!ctx) return;
    
    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: PortfolioData.chartData.labels,
            datasets: [
                {
                    label: 'Portfolio',
                    data: PortfolioData.chartData.portfolioValues,
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'BTC Trend',
                    data: PortfolioData.chartData.btcValues,
                    borderColor: '#ff9500',
                    backgroundColor: 'rgba(255, 149, 0, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 20, 40, 0.95)',
                    titleColor: '#00ff88',
                    bodyColor: '#ffffff',
                    borderColor: '#00ff88',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            return `📅 ${context[0].label}`;
                        },
                        label: function(context) {
                            const label = context.dataset.label;
                            const icon = label === 'Portfolio' ? '💰' : '₿';
                            return `${icon} ${label}: ${formatCurrency(context.parsed.y)}`;
                        }
                    }
                }
            },
            elements: {
                point: {
                    radius: 0,
                    hoverRadius: 6
                }
            }
        }
    });
}

function initAllocationChart() {
    const ctx = document.getElementById('allocation-chart');
    if (!ctx) return;
    
    if (PortfolioData.assets.length === 0) {
        // Portfolio vide - afficher un graphique par défaut
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        return;
    }
    
    const colors = ['#00ff88', '#00ccff', '#9945ff', '#ff6b7a', '#ffa502', '#ff4757'];
    const data = PortfolioData.assets.map(asset => asset.value);
    const labels = PortfolioData.assets.map(asset => asset.symbol);
    
    allocationChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverBorderWidth: 2,
                hoverBorderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            cutout: '70%'
        }
    });
    
    // Afficher la liste de répartition
    displayAllocationList(colors);
}

function displayAllocationList(colors) {
    const allocationList = document.getElementById('allocation-list');
    if (!allocationList) return;
    
    const totalValue = PortfolioData.assets.reduce((sum, asset) => sum + asset.value, 0);
    
    if (totalValue === 0) {
        allocationList.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.6);">Aucun actif à afficher</p>';
        return;
    }
    
    allocationList.innerHTML = PortfolioData.assets.map((asset, index) => {
        const percentage = ((asset.value / totalValue) * 100).toFixed(2);
        return `
            <div class="allocation-item">
                <div class="allocation-color" style="background-color: ${colors[index]};"></div>
                <div class="allocation-symbol">${asset.symbol}</div>
                <div class="allocation-info">
                    <div class="allocation-percentage">${percentage}%</div>
                </div>
            </div>
        `;
    }).join('');
}





window.PortfolioModule = {
   init: initPortfolio,
   updateUI: updatePortfolioUI,
   addTransaction: addTransaction,
   toggleVisibility: toggleVisibility,
   exportPortfolio: exportPortfolio,
   syncWithAuth: syncPortfolioWithAuth,
   data: PortfolioData
};



