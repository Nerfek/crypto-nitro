// ===== DASHBOARD/JS/DASHBOARD-MAIN.JS - VERSION FINALE COMPLÈTE TEMPS RÉEL =====

console.log('🚀 Initialisation Dashboard CryptoTraders Pro - Version Temps Réel');

// ===== VARIABLES GLOBALES =====
let currentUser = null;
let currentSection = 'overview';

// ===== VÉRIFICATION AUTHENTIFICATION =====
function checkAuthentication() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                currentUser = {
                    id: user.uid,
                    email: user.email,
                    name: user.displayName || 'Astronaute',
                    portfolio: 0, 
                    dailyGain: 0
                };
                
                initDashboard();
                loadUserData();
            } else {
                window.location.href = '../../index.html';
            }
        });
    } else {
        currentUser = {
            id: 'dev-user',
            email: 'dev@crypto.space',
            name: 'Astronaute Dev',
            portfolio: 500,
            dailyGain: 0
        };
        
        initDashboard();
    }
}


// ===== CHARGEMENT DONNÉES PORTFOLIO RÉEL =====
async function loadRealPortfolioData() {
    if (!currentUser?.id || typeof firebaseDb === 'undefined') {
        console.log('⚠️ Pas de user ID ou Firebase indisponible');
        return;
    }
    
    try {
        const userDoc = await firebaseDb.collection('users').doc(currentUser.id).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const portfolioData = userData.investmentPortfolio;
            
            if (portfolioData) {
                // Récupérer les vraies données du portfolio réel
                currentUser.portfolio = portfolioData.totalValue || 0;
                currentUser.dailyGain = portfolioData.totalProfit || 0;
                
                console.log('💼 Portfolio réel chargé:', currentUser.portfolio, 'Profit:', currentUser.dailyGain);
            } else {
                console.log('📋 Aucun portfolio réel trouvé');
                currentUser.portfolio = 0;
                currentUser.dailyGain = 0;
            }
        }
    } catch (error) {
        console.log('❌ Erreur chargement portfolio réel:', error);
        currentUser.portfolio = 0;
        currentUser.dailyGain = 0;
    }
}


// ===== INITIALISATION DASHBOARD =====
async function initDashboard() {
    updateUserDisplay();
    initNavigation();
    await loadRealPortfolioData();
    showSection('overview');
    
    await loadJournalData();
    updateTradingSection();
    setTimeout(() => {
    updateFormationsSection();
    }, 1000);
    updateLiveSection();
    
    updateHeroSection();
    updatePortfolioSection();
    
    // === INITIALISER CRYPTO-LOADER PUIS PRIX TEMPS RÉEL ===
    setTimeout(async () => {
        console.log('🔧 Initialisation crypto-loader...');
        
        // Initialiser crypto-loader
        if (typeof initDynamicCryptoList === 'function') {
            await initDynamicCryptoList();
            console.log('✅ Crypto-loader initialisé');
        } else {
            console.log('❌ initDynamicCryptoList non trouvé');
        }
        
        // Démarrer prix temps réel
        initDashboardRealTimePrices();
    }, 3000);
}

// ===== MISE À JOUR UI UTILISATEUR =====
function updateUserDisplay() {
    const headerUserName = document.getElementById('user-name');
    const headerUserAvatar = document.getElementById('user-avatar');
    
    if (headerUserName) headerUserName.textContent = currentUser.name;
    if (headerUserAvatar) headerUserAvatar.textContent = getAvatarForPortfolio(window.currentUser?.portfolio || currentUser?.portfolio || 500);
    
    const sidebarUserName = document.getElementById('sidebar-user-name');
    if (sidebarUserName) sidebarUserName.textContent = currentUser.name;
    
    const heroUsername = document.getElementById('hero-username');
    if (heroUsername) heroUsername.textContent = currentUser.name;
}

// ===== SYSTÈME DE RANGS PORTFOLIO =====
function getAvatarForPortfolio(portfolio) {
    if (portfolio >= 5000) return '👑';
    if (portfolio >= 2000) return '🏆';
    if (portfolio >= 1000) return '🌟';
    return '👨‍🚀';
}

function getRankForPortfolio(portfolio) {
    if (portfolio >= 5000) return '👑 Maître de l\'Univers';
    if (portfolio >= 2000) return '🏆 Expert Galactique';
    if (portfolio >= 1000) return '🌟 Trader Confirmé';
    return '🚀 Cadet Spatial';
}

// ===== RÉCUPÉRATION DONNÉES PORTFOLIO TEMPS RÉEL =====
function getRealtimePortfolioData() {
    try {
        // TOUJOURS utiliser localStorage en priorité
        const realtimeData = localStorage.getItem('cryptotraders_dashboard_realtime');
        if (realtimeData) {
            const data = JSON.parse(realtimeData);
            const totalValue = data.totalValue || 0; 
            const totalProfit = data.totalProfit || 0;
            const costBasis = data.costBasis || 0; 
            
            // SYNCHRONISER window.currentUser pour éviter les écarts
            if (window.currentUser) {
                window.currentUser.portfolio = totalValue;
                window.currentUser.dailyGain = totalProfit;
            }
            
            return {
                totalValue: totalValue,
                totalProfit: totalProfit,
                costBasis: costBasis,
                isRealtime: true
            };
        }
        
        // Fallback - utiliser les vraies données du portfolio réel
        const totalValue = window.currentUser?.portfolio || currentUser?.portfolio || 0;
        const totalProfit = window.currentUser?.dailyGain || currentUser?.dailyGain || 0;
        
        return {
            totalValue: totalValue,
            totalProfit: totalProfit,
            costBasis: 0,
            isRealtime: false
        };
        
    } catch (error) {
        return {
            totalValue: 0,
            totalProfit: 0,
            costBasis: 0,
            isRealtime: false
        };
    }
}

// ===== MISE À JOUR SECTIONS HERO =====
function updateHeroSection() {
    const heroUsername = document.getElementById('hero-username');
    const heroPortfolio = document.getElementById('hero-portfolio');
    const heroPnL = document.getElementById('hero-pnl');
    const heroRank = document.getElementById('hero-rank');
    
    const realtimeData = getRealtimePortfolioData();
    
    if (heroUsername && window.currentUser?.name) {
        heroUsername.textContent = window.currentUser.name;
    }
    
if (heroPortfolio) {
    const portfolioValue = realtimeData.totalValue;
    heroPortfolio.textContent = formatCurrency(portfolioValue);
    animateValueChange(heroPortfolio, portfolioValue);
}
    
    if (heroPnL) {
        const profit = realtimeData.totalProfit;
        const sign = profit >= 0 ? '+' : '';
        heroPnL.textContent = `${sign}${formatCurrency(Math.abs(profit))}`;
        heroPnL.className = `quick-stat-value ${profit >= 0 ? 'positive' : 'negative'}`;
        animateValueChange(heroPnL, profit);
    }
    
    if (heroRank && window.currentUser?.avatar) {
        heroRank.textContent = window.currentUser.avatar;
    }
}

function updatePortfolioSection() {
    const portfolioTotal = document.getElementById('portfolio-total');
    const portfolioChange = document.getElementById('portfolio-change');
    const portfolioInvested = document.getElementById('portfolio-invested');
    const portfolioProfit = document.getElementById('portfolio-profit');
    
    const realtimeData = getRealtimePortfolioData();
    
    if (portfolioTotal) {
        portfolioTotal.textContent = formatCurrency(realtimeData.totalValue);
        animateValueChange(portfolioTotal, realtimeData.totalValue);
    }
    
    if (portfolioChange) {
        const invested = realtimeData.costBasis; // Montant réellement investi
        const currentValue = realtimeData.totalValue;
        const change = currentValue - invested;
        const changePercent = invested > 0 ? ((change / invested) * 100) : 0;
        const sign = change >= 0 ? '+' : '';
        
        portfolioChange.textContent = `${sign}${changePercent.toFixed(2)}% (${sign}${formatCurrency(Math.abs(change))})`;
        portfolioChange.className = `metric-change ${change >= 0 ? 'positive' : 'negative'}`;
    }
    
    if (portfolioInvested) {
        portfolioInvested.textContent = formatCurrency(realtimeData.costBasis);
    }
    
    if (portfolioProfit) {
        const sign = realtimeData.totalProfit >= 0 ? '+' : '';
        portfolioProfit.textContent = `${sign}${formatCurrency(Math.abs(realtimeData.totalProfit))}`;
        portfolioProfit.className = `stat-value ${realtimeData.totalProfit >= 0 ? 'positive' : 'negative'}`;
        animateValueChange(portfolioProfit, realtimeData.totalProfit);
    }
}

// Forcer une mise à jour formatée après 1 seconde
    setTimeout(() => {
        updateHeroSection();
        updatePortfolioSection();
    }, 1000);

// ===== ANIMATION CHANGEMENT VALEUR =====
function animateValueChange(element, newValue) {
    if (!element._lastValue) {
        element._lastValue = newValue;
        return;
    }
    
    const oldValue = element._lastValue;
    const isUp = newValue > oldValue;
    const isDown = newValue < oldValue;
    
    if (isUp || isDown) {
        element.style.transition = 'color 0.5s ease';
        element.style.color = isUp ? '#00ff88' : '#ff4757';
        
        setTimeout(() => {
            element.style.color = '#ffffff';
        }, 1000);
    }
    
    element._lastValue = newValue;
}

// ===== NAVIGATION =====
function initNavigation() {
    console.log('🔧 Initialisation navigation...');
    
    // Navigation sidebar - sélecteur plus spécifique
    const sidebarNavItems = document.querySelectorAll('.dashboard-sidebar .nav-item');
    console.log('📋 Items sidebar trouvés:', sidebarNavItems.length);
    
    sidebarNavItems.forEach((item, index) => {
        const section = item.getAttribute('data-section');
        console.log(`Sidebar item ${index}:`, section);
        
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🖱️ Clic sidebar sur:', section);
            
            // Retirer active de tous les items sidebar
            sidebarNavItems.forEach(navItem => navItem.classList.remove('active'));
            
            // Ajouter active à l'item cliqué
            this.classList.add('active');
            
            // Navigation
            if (section === 'overview') {
                showSection(section);
            } else {
                console.log('🔄 Redirection vers:', section);
                navigateToSection(section);
            }
        });
    });
    
    // Navigation mobile
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    console.log('📱 Items mobile trouvés:', mobileNavItems.length);
    
    mobileNavItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            console.log('🖱️ Clic mobile sur:', section);
            
            // Retirer active de tous les items mobile
            mobileNavItems.forEach(navItem => navItem.classList.remove('active'));
            
            // Ajouter active à l'item cliqué
            this.classList.add('active');
            
            if (section === 'overview') {
                showSection(section);
            } else {
                navigateToSection(section);
            }
        });
    });
    
    console.log('✅ Navigation initialisée');
}

function navigateToSection(sectionName) {
    switch (sectionName) {
        case 'trading':
            window.location.href = '../trading/trading.html';
            break;
        case 'live':
            window.location.href = '../live/live.html';
            break;
        case 'tableau':
            window.location.href = '../tableau/tableau.html';
            break;
        case 'formations':
            window.location.href = '../formations/formations.html';
            break;
        case 'portfolio':
            window.location.href = '../portfolio/portfolio.html';
            break;
        case 'settings':
            window.location.href = '../parametres/parametres.html';
            break;
        default:
            showSection(sectionName);
    }
}

function showSection(sectionName) {
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionName;
    }
    
    const navItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
}

// ===== CHARGEMENT DONNÉES UTILISATEUR =====
async function loadUserData() {
    if (!currentUser || !currentUser.id) return;
    
    try {
        if (typeof firebaseDb !== 'undefined') {
            const userDoc = await firebaseDb.collection('users').doc(currentUser.id).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                currentUser.name = userData.name || currentUser.name;
            }
        }
    } catch (error) {
        console.log('⚠️ Erreur chargement données utilisateur:', error);
    }
}

// ===== MISE À JOUR TRADING SECTION =====
function updateTradingSection(journalData = null) {
    const openPositionsList = document.getElementById('open-positions-list');
    const monthPnL = document.getElementById('month-pnl');
    const monthTrades = document.getElementById('month-trades');
    const yearPnL = document.getElementById('year-pnl');
    const yearTrades = document.getElementById('year-trades');
    
    let trades = [];
    let openPositions = [];
    
    if (typeof TradingTable !== 'undefined' && TradingTable.trades) {
        trades = TradingTable.trades;
        openPositions = trades.filter(trade => trade.status === 'open');
    } else if (journalData) {
        trades = journalData.trades || [];
        openPositions = trades.filter(trade => trade.status === 'open');
    }
    
    if (openPositionsList) {
        if (openPositions.length > 0) {
            openPositionsList.innerHTML = '';
            openPositions.slice(0, 3).forEach(position => {
                const positionElement = document.createElement('div');
                positionElement.className = 'position-item';
                positionElement.innerHTML = `
                    <div class="position-info">
                        <span class="position-pair">${position.token || 'BTC'}/USDT</span>
                        <span class="position-type ${position.position.toLowerCase()}">${position.position}</span>
                    </div>
                    <div class="position-pnl ${position.pnl >= 0 ? 'positive' : 'negative'}">
                        ${position.pnl >= 0 ? '+' : ''}$${position.pnl.toFixed(2)}
                    </div>
                `;
                openPositionsList.appendChild(positionElement);
            });
        } else {
            openPositionsList.innerHTML = `
                <div class="no-positions">
                    <span class="empty-icon">📈</span>
                    <span>Aucune position ouverte</span>
                </div>
            `;
        }
    }
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let monthlyTrades = 0;
    let monthlyPnL = 0;
    let yearlyTrades = 0;
    let yearlyPnL = 0;
    
    trades.forEach(trade => {
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
    
    if (monthPnL) {
        const sign = monthlyPnL >= 0 ? '+' : '';
        monthPnL.textContent = `${sign}$${monthlyPnL.toFixed(2)}`;
        monthPnL.className = `stat-pnl ${monthlyPnL >= 0 ? 'positive' : 'negative'}`;
    }
    
    if (monthTrades) {
        monthTrades.textContent = `${monthlyTrades} trades`;
    }
    
    if (yearPnL) {
        const sign = yearlyPnL >= 0 ? '+' : '';
        yearPnL.textContent = `${sign}$${yearlyPnL.toFixed(2)}`;
        yearPnL.className = `stat-pnl ${yearlyPnL >= 0 ? 'positive' : 'negative'}`;
    }
    
    if (yearTrades) {
        yearTrades.textContent = `${yearlyTrades} trades`;
    }
}

// ===== MISE À JOUR FORMATIONS SECTION =====
async function updateFormationsSection() {
    try {
        // Récupérer les cours depuis Firebase
        if (typeof firebaseDb !== 'undefined') {
            const coursesSnapshot = await firebaseDb.collection('cours')
                .where('status', '==', 'published')
                .get();
            
            const totalCourses = coursesSnapshot.docs.length;
            const completedCourses = 0; // Pour l'instant, aucun cours complété
            const percentage = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;
            
            // Mettre à jour les éléments
            const formationPercentage = document.getElementById('formation-percentage');
            const formationProgress = document.getElementById('formation-progress');
            const completedCoursesEl = document.getElementById('completed-courses');
            const totalCoursesEl = document.getElementById('total-courses');
            
            if (formationPercentage) {
                formationPercentage.textContent = `${percentage}%`;
            }
            
            if (formationProgress) {
                formationProgress.style.width = `${percentage}%`;
            }
            
            if (completedCoursesEl) {
                completedCoursesEl.textContent = completedCourses;
            }
            
            if (totalCoursesEl) {
                totalCoursesEl.textContent = totalCourses;
            }
            
            // Mettre à jour le cours en cours avec le premier cours Firebase
            const currentCourseInfo = document.querySelector('.course-info');
            if (currentCourseInfo && totalCourses > 0) {
                const firstCourse = coursesSnapshot.docs[0].data();
                const courseName = currentCourseInfo.querySelector('.course-name');
                const courseProgress = currentCourseInfo.querySelector('.course-progress');
                
                if (courseName) {
                    courseName.textContent = firstCourse.title || 'Cours disponible';
                }
                
                if (courseProgress) {
                    courseProgress.textContent = 'Prêt à commencer';
                }
            }
            
        } else {
            // Fallback si Firebase non disponible
            console.log('Firebase non disponible pour les formations');
        }
        
    } catch (error) {
        console.log('⚠️ Erreur chargement formations dashboard:', error);
        
        // Valeurs par défaut en cas d'erreur
        const formationPercentage = document.getElementById('formation-percentage');
        const formationProgress = document.getElementById('formation-progress');
        const completedCoursesEl = document.getElementById('completed-courses');
        const totalCoursesEl = document.getElementById('total-courses');
        
        if (formationPercentage) formationPercentage.textContent = '0%';
        if (formationProgress) formationProgress.style.width = '0%';
        if (completedCoursesEl) completedCoursesEl.textContent = '0';
        if (totalCoursesEl) totalCoursesEl.textContent = '1';
    }
}

// ===== MISE À JOUR LIVE SECTION =====
function updateLiveSection() {
    const nextLiveDate = new Date();
    nextLiveDate.setHours(14, 0, 0, 0);
    
    if (nextLiveDate < new Date()) {
        nextLiveDate.setDate(nextLiveDate.getDate() + 1);
    }
    
    const liveTime = document.querySelector('.live-time');
    if (liveTime) {
        const today = new Date();
        const isToday = nextLiveDate.toDateString() === today.toDateString();
        const timeString = nextLiveDate.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        liveTime.textContent = isToday ? `Aujourd'hui à ${timeString}` : `Demain à ${timeString}`;
    }
}

// ===== CHARGEMENT DES DONNÉES JOURNAL =====
function loadJournalData() {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = '../tableau/js/tableau.js';
        script.onload = () => {
            setTimeout(() => {
                syncJournalData();
                resolve();
            }, 500);
        };
        script.onerror = () => {
            resolve();
        };
        document.head.appendChild(script);
    });
}

function syncJournalData() {
    try {
        if (typeof TradingTable !== 'undefined') {
            updateTradingSection();
        } else {
            const journalStorage = localStorage.getItem('cryptotraders_trades');
            if (journalStorage) {
                const data = JSON.parse(journalStorage);
                updateTradingSection(data);
            }
        }
    } catch (error) {
        console.log('⚠️ Erreur sync journal:', error);
    }
}

// ===== SYSTÈME PRIX TEMPS RÉEL DASHBOARD =====
async function initDashboardRealTimePrices() {
    console.log('🚀 Démarrage prix temps réel dashboard');
    
    // Attendre crypto-loader
    let attempts = 0;
    while (!window.cryptoLoader?.isLoaded && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
    }
    
    if (!window.cryptoLoader?.isLoaded) {
        console.log('❌ Crypto-loader indisponible');
        return;
    }
    
    console.log('✅ Crypto-loader disponible, démarrage prix temps réel');
    
    const updatePrices = async () => {
        try {
            const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
            const allStats = await response.json();
            
            // Mettre à jour crypto-loader avec nouveaux prix
            allStats.forEach(item => {
                if (window.cryptoLoader?.cryptos[item.symbol]) {
                    window.cryptoLoader.cryptos[item.symbol].price = parseFloat(item.lastPrice);
                    window.cryptoLoader.cryptos[item.symbol].change24h = parseFloat(item.priceChangePercent);
                }
            });
            
            // Recalculer portfolio avec nouveaux prix
            await recalculateDashboardPortfolio();
            
        } catch (error) {
            console.log('❌ Erreur prix dashboard:', error);
        }
    };
    
    // Première mise à jour immédiate
    await updatePrices();
    
    // Puis mise à jour toutes les 10 secondes
    setInterval(updatePrices, 10000);
    
    console.log('✅ Système prix temps réel dashboard actif');
}

async function recalculateDashboardPortfolio() {
    if (!window.currentUser?.id || !window.firebaseDb) return;
    
    try {
        const userDoc = await window.firebaseDb.collection('users').doc(window.currentUser.id).get();
        
        if (userDoc.exists && userDoc.data().investmentPortfolio) {
            const portfolioData = userDoc.data().investmentPortfolio;
            const assets = portfolioData.assets || [];
            
            if (assets.length === 0) return;
            
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
            
            // Mettre à jour window.currentUser
            if (window.currentUser) {
                window.currentUser.portfolio = totalValue;
                window.currentUser.dailyGain = totalProfit;
            }
            
            // Sauvegarder dans localStorage avec timestamp ACTUEL
            localStorage.setItem('cryptotraders_dashboard_realtime', JSON.stringify({
                totalValue: totalValue,
                totalProfit: totalProfit,
                costBasis: costBasis,
                lastUpdate: new Date().toISOString()
            }));
            
            // Mettre à jour affichage
            updateHeroSection();
            updatePortfolioSection();
            
            console.log('💰 Portfolio recalculé:', formatCurrency(totalValue), 'à', new Date().toLocaleTimeString());
            
        }
        
    } catch (error) {
        console.log('❌ Erreur recalcul:', error);
    }
}

// ===== GESTION DÉCONNEXION =====
function handleLogout() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut().then(() => {
            window.location.href = '../../index.html';
        });
    } else {
        window.location.href = '../../index.html';
    }
}

// ===== UTILITAIRES =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'error' ? '#ff4757' : type === 'success' ? '#00ff88' : '#00ccff'};
        color: ${type === 'success' ? '#000011' : '#ffffff'};
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function formatCurrency(amount) {
    // Vérifier que amount est un nombre valide
    const numericAmount = parseFloat(amount) || 0;
    
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numericAmount);
}


// Afficher bouton admin conditionnel
function showAdminButton() {
    const isAdmin = window.currentUser?.role === 'admin' || window.currentUser?.isAdmin === true;
    
    const normalBtn = document.getElementById('normal-return-btn');
    const adminBtn = document.getElementById('admin-return-btn');
    
    if (isAdmin) {
        console.log('👑 Admin détecté - affichage bouton admin');
        if (normalBtn) normalBtn.style.display = 'none';
        if (adminBtn) adminBtn.style.display = 'block';
    } else {
        console.log('👤 Utilisateur normal - bouton standard');
        if (normalBtn) normalBtn.style.display = 'block';
        if (adminBtn) adminBtn.style.display = 'none';
    }
}

// Appeler au chargement
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(showAdminButton, 1000); // Attendre que currentUser soit chargé
});



// ===== EXPOSITION GLOBALE =====
window.currentUser = currentUser;
window.showSection = showSection;
window.navigateToSection = navigateToSection;
window.showNotification = showNotification;
window.handleLogout = handleLogout;
window.updateHeroSection = updateHeroSection;
window.updatePortfolioSection = updatePortfolioSection;

// ===== ÉVÉNEMENTS =====
document.addEventListener('DOMContentLoaded', checkAuthentication);

document.addEventListener('click', (e) => {
    if (e.target.id === 'logout-btn' || e.target.closest('#logout-btn')) {
        e.preventDefault();
        handleLogout();
    }
});

// ===== NAVIGATION MOBILE =====
document.addEventListener('DOMContentLoaded', function() {
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    
    mobileNavItems.forEach(function(item) {
        item.addEventListener('click', function() {
            const section = this.dataset.section;
            
            mobileNavItems.forEach(function(nav) {
                nav.classList.remove('active');
            });
            
            this.classList.add('active');
            
            if (typeof showSection === 'function') {
                showSection(section);
            }
        });
    });
});

// Toggle dropdown mobile
document.addEventListener('click', function(e) {
    const userInfo = document.querySelector('.user-info');
    
    if (window.innerWidth <= 768) {
        if (userInfo.contains(e.target)) {
            userInfo.classList.toggle('active');
        } else {
            userInfo.classList.remove('active');
        }
    }
});

console.log('✅ Dashboard temps réel COMPLET chargé');