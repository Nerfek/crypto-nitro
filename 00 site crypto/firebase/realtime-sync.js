// ===== FIREBASE/REALTIME-SYNC.JS - SYSTÈME TEMPS RÉEL GLOBAL =====

console.log('🌐 Initialisation système temps réel global');

// ===== DONNÉES GLOBALES PARTAGÉES =====
window.RealtimeData = {
    portfolio: {
        totalValue: 500,
        totalProfit: 0,
        costBasis: 500,
        assets: []
    },
    trading: {
        openPositions: [],
        monthlyPnL: 0,
        yearlyPnL: 0,
        monthlyTrades: 0,
        yearlyTrades: 0
    },
    isLoaded: false,
    lastUpdate: null
};

// ===== SYSTÈME DE RÉCUPÉRATION PRIX =====
class RealtimeSync {
    constructor() {
        this.updateInterval = null;
        this.isRunning = false;
        this.callbacks = [];
    }

    // Démarrer le système temps réel
    async start() {
        if (this.isRunning) return;
        
        console.log('🚀 Démarrage système temps réel global');
        this.isRunning = true;

        // Attendre crypto-loader
        await this.waitForCryptoLoader();
        
        // Charger les données initiales
        await this.loadInitialData();
        
        // Démarrer les mises à jour
        await this.updatePrices();
        this.updateInterval = setInterval(() => this.updatePrices(), 10000);
        
        window.RealtimeData.isLoaded = true;
        this.notifyCallbacks();
        
        console.log('✅ Système temps réel global actif');
    }

    // Attendre crypto-loader
    async waitForCryptoLoader() {
        let attempts = 0;
        while (!window.cryptoLoader?.isLoaded && attempts < 100) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.cryptoLoader?.isLoaded) {
            console.log('⚠️ Crypto-loader non disponible');
        }
    }

// Charger données initiales depuis Firebase
    async loadInitialData() {
        if (!window.currentUser?.id || !window.firebaseDb) {
            console.log('❌ Pas d\'utilisateur ou Firebase disponible');
            return;
        }

        try {
            console.log('📊 Chargement données pour:', window.currentUser.id);
            const userDoc = await window.firebaseDb.collection('users').doc(window.currentUser.id).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                console.log('📄 Document utilisateur trouvé:', userData);
                
                // Portfolio d'investissement
                if (userData.investmentPortfolio && userData.investmentPortfolio.assets) {
                    const portfolioData = userData.investmentPortfolio;
                    console.log('💼 Portfolio investissement trouvé:', portfolioData);
                    
                    window.RealtimeData.portfolio = {
                        totalValue: portfolioData.totalValue || 500,
                        totalProfit: portfolioData.totalProfit || 0,
                        costBasis: portfolioData.costBasis || 500,
                        assets: portfolioData.assets || []
                    };
                    
                    console.log('✅ Portfolio chargé:', {
                        totalValue: window.RealtimeData.portfolio.totalValue,
                        assets: window.RealtimeData.portfolio.assets.length,
                        costBasis: window.RealtimeData.portfolio.costBasis,
                        writeCount: 0
                    });
                } else {
                    console.log('⚠️ Pas de portfolio investissement trouvé dans:', Object.keys(userData));
                    
                    // Essayer de récupérer depuis les données utilisateur classiques
                    window.RealtimeData.portfolio = {
                        totalValue: userData.portfolio || 500,
                        totalProfit: userData.dailyGain || 0,
                        costBasis: 500,
                        assets: []
                    };
                    
                    console.log('📊 Utilisation données utilisateur classiques:', window.RealtimeData.portfolio.totalValue);
                }
            } else {
                console.log('❌ Document utilisateur inexistant');
            }
        } catch (error) {
            console.log('❌ Erreur chargement données:', error);
        }
    }

    // Mettre à jour les prix temps réel
    async updatePrices() {
        try {
            // Récupérer prix Binance
            const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
            const allStats = await response.json();
            
            // Mettre à jour crypto-loader
            allStats.forEach(item => {
                if (window.cryptoLoader?.cryptos[item.symbol]) {
                    window.cryptoLoader.cryptos[item.symbol].price = parseFloat(item.lastPrice);
                    window.cryptoLoader.cryptos[item.symbol].change24h = parseFloat(item.priceChangePercent);
                }
            });

            // Recalculer portfolio
            await this.recalculatePortfolio();
            
            // Recalculer trading
            await this.recalculateTrading();
            
            // Notifier toutes les pages
            this.notifyCallbacks();
            
            window.RealtimeData.lastUpdate = new Date();
            
        } catch (error) {
            console.log('⚠️ Erreur mise à jour prix:', error);
        }
    }

    // Recalculer portfolio avec nouveaux prix
    async recalculatePortfolio() {
        const assets = window.RealtimeData.portfolio.assets;
        let totalValue = 0;
        let totalProfit = 0;
        let costBasis = 0;

        assets.forEach(asset => {
            const cryptoData = window.cryptoLoader?.cryptos[asset.symbol + 'USDT'];
            if (!cryptoData?.price) return;

            const currentPrice = cryptoData.price;
            const currentValue = asset.quantity * currentPrice;
            const assetCostBasis = asset.quantity * asset.avgPrice;
            const assetProfit = currentValue - assetCostBasis;

            totalValue += currentValue;
            totalProfit += assetProfit;
            costBasis += assetCostBasis;
        });

        window.RealtimeData.portfolio.totalValue = totalValue;
        window.RealtimeData.portfolio.totalProfit = totalProfit;
        window.RealtimeData.portfolio.costBasis = costBasis;

        // Mettre à jour window.currentUser pour compatibilité
        if (window.currentUser) {
            window.currentUser.portfolio = totalValue;
            window.currentUser.dailyGain = totalProfit;
        }
    }

    // Recalculer trading
    async recalculateTrading() {
        // Charger données trading depuis localStorage ou Firebase
        try {
            const tradingData = localStorage.getItem('cryptotraders_trades');
            if (tradingData) {
                const trades = JSON.parse(tradingData);
                
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                let monthlyPnL = 0;
                let yearlyPnL = 0;
                let monthlyTrades = 0;
                let yearlyTrades = 0;
                let openPositions = [];

                trades.forEach(trade => {
                    // Positions ouvertes
                    if (trade.status === 'open') {
                        openPositions.push(trade);
                    }
                    
                    // Stats fermées
                    if (trade.dateFermeture) {
                        const tradeDate = new Date(trade.dateFermeture);
                        
                        if (tradeDate.getFullYear() === currentYear) {
                            yearlyTrades++;
                            yearlyPnL += trade.pnl || 0;
                            
                            if (tradeDate.getMonth() === currentMonth) {
                                monthlyTrades++;
                                monthlyPnL += trade.pnl || 0;
                            }
                        }
                    }
                });

                window.RealtimeData.trading = {
                    openPositions,
                    monthlyPnL,
                    yearlyPnL,
                    monthlyTrades,
                    yearlyTrades
                };
            }
        } catch (error) {
            console.log('⚠️ Erreur recalcul trading:', error);
        }
    }

    // Système de callbacks pour notifier les pages
    addCallback(callback) {
        this.callbacks.push(callback);
    }

    notifyCallbacks() {
        this.callbacks.forEach(callback => {
            try {
                callback(window.RealtimeData);
            } catch (error) {
                console.log('⚠️ Erreur callback:', error);
            }
        });
    }

    // Arrêter le système
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.isRunning = false;
        console.log('🛑 Système temps réel arrêté');
    }
}

// ===== INSTANCE GLOBALE =====
window.realtimeSync = new RealtimeSync();

// ===== FONCTIONS UTILITAIRES =====
window.startRealtimeSync = function() {
    window.realtimeSync.start();
};

window.addRealtimeCallback = function(callback) {
    window.realtimeSync.addCallback(callback);
};

console.log('✅ Système temps réel global prêt');
console.log('🎯 Utilisez startRealtimeSync() pour démarrer');




// ===== DEBUG =====
window.debugRealtimeData = function() {
    console.log('🔍 === DEBUG REALTIME DATA ===');
    console.log('User ID:', window.currentUser?.id);
    console.log('Firebase DB:', !!window.firebaseDb);
    console.log('Portfolio data:', window.RealtimeData.portfolio);
    console.log('Is loaded:', window.RealtimeData.isLoaded);
    console.log('Last update:', window.RealtimeData.lastUpdate);
    
    // Test Firebase direct
    if (window.currentUser?.id && window.firebaseDb) {
        window.firebaseDb.collection('users').doc(window.currentUser.id).get().then(doc => {
            console.log('🔥 Firebase direct:', doc.exists ? doc.data() : 'Document inexistant');
        });
    }
};