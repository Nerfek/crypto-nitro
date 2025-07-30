// ===== TABLEAU.JS - VERSION MODERNE CARDS AVEC FIREBASE =====

console.log('📊 Initialisation module Tableau moderne avec Firebase');

// ===== VÉRIFICATION AUTHENTIFICATION =====
function checkAuthentication() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // Attendre que Firebase soit complètement initialisé
                setTimeout(() => {
                    console.log('🔥 Auth OK, Firebase DB disponible:', !!window.firebaseDb);
                    TradingTable.init();
                }, 1000);
            } else {
                window.location.href = '../../index.html';
            }
        });
    } else {
        console.log('🔧 Mode développement - tableau');
        TradingTable.init();
    }
}

// ===== FIREBASE INTEGRATION =====
async function saveTableauToFirebase() {
    if (!window.currentUser || !window.firebaseDb) {
        console.log('❌ Firebase non disponible pour sauvegarde tableau');
        return false;
    }
    
    try {
        const tableauData = {
            openTrades: TradingTable.openTrades,
            closedTrades: TradingTable.allTrades,
            currentMonth: TradingTable.currentMonth,
            lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await window.firebaseDb.collection('users').doc(window.currentUser.id).set({
            tableau: tableauData
        }, { merge: true });
        
        console.log('✅ Tableau sauvegardé sur Firebase');
        return true;
        
    } catch (error) {
        console.error('❌ Erreur sauvegarde tableau:', error);
        return false;
    }
}




// Ajoute cette fonction après saveTableauToFirebase()
async function saveTradeActionToFirebase(action, tradeData) {
    if (!window.currentUser || !window.firebaseDb) {
        console.log('❌ Firebase non disponible pour action:', action);
        console.log('currentUser:', !!window.currentUser);
        console.log('firebaseDb:', !!window.firebaseDb);
        return false;
    }
    
    try {
        const actionRecord = {
            action: action, // 'open', 'close', 'edit'
            trade: tradeData,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userId: window.currentUser.id,
            month: TradingTable.currentMonth
        };
        
        // Sauvegarder l'action dans une collection séparée
        await window.firebaseDb.collection('tradeActions').add(actionRecord);
        
        // Aussi mettre à jour les données globales
        await saveTableauToFirebase();
        
        console.log(`✅ Action ${action} sauvegardée:`, tradeData.token);
        return true;
        
    } catch (error) {
        console.error(`❌ Erreur sauvegarde action ${action}:`, error);
        return false;
    }
}




async function loadTableauFromFirebase() {
    if (!window.currentUser || !window.firebaseDb) {
        console.log('❌ Firebase non disponible pour chargement tableau');
        return false;
    }
    
    try {
        const userDoc = await window.firebaseDb.collection('users').doc(window.currentUser.id).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const tableauData = userData.tableau;
            
            if (tableauData) {
                // Charger les données Firebase dans TradingTable
                TradingTable.allTrades = tableauData.closedTrades || {
                    openTrades: [],
                    "janvier": [], "février": [], "mars": [], "avril": [], 
                    "mai": [], "juin": [], "juillet": [], "août": [], 
                    "septembre": [], "octobre": [], "novembre": [], "décembre": []
                };
                
                TradingTable.openTrades = tableauData.openTrades || [];
                TradingTable.allTrades.openTrades = TradingTable.openTrades;
                
                console.log('✅ Tableau chargé depuis Firebase');
                console.log('📊 Trades ouverts:', TradingTable.openTrades.length);
                console.log('📊 Trades fermés:', Object.keys(TradingTable.allTrades).filter(k => k !== 'openTrades').reduce((total, month) => total + TradingTable.allTrades[month].length, 0));
                
                return true;
            }
        }
        
        console.log('📝 Aucune donnée tableau trouvée sur Firebase');
        return false;
        
    } catch (error) {
        console.error('❌ Erreur chargement tableau:', error);
        return false;
    }
}





async function loadTradeActionsFromFirebase() {
    // Test de sauvegarde Firebase
    console.log('🔥 TEST Firebase tableau:');
    console.log('- currentUser:', !!window.currentUser);
    console.log('- firebaseDb:', !!window.firebaseDb);
    console.log('- firebaseAuth:', !!window.firebaseAuth);
    if (!window.currentUser || !window.firebaseDb) return false;
    
    try {
        const snapshot = await window.firebaseDb
            .collection('tradeActions')
            .where('userId', '==', window.currentUser.id)
            .orderBy('timestamp', 'desc')
            .get();
        
        console.log(`📊 ${snapshot.size} actions trouvées`);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`${data.action}: ${data.trade.token} - ${data.timestamp?.toDate()}`);
        });
        
        return true;
    } catch (error) {
        console.error('❌ Erreur chargement actions:', error);
        return false;
    }
}



// ===== TRADING TABLE MODERNE =====
const TradingTable = {
    allTrades: {
        openTrades: [],
        "janvier": [], "février": [], "mars": [], "avril": [], 
        "mai": [], "juin": [], "juillet": [], "août": [], 
        "septembre": [], "octobre": [], "novembre": [], "décembre": []
    },

    currentMonth: new Date().toLocaleDateString('fr-FR', { month: 'long' }).toLowerCase(),
    trades: [], // Sera rempli selon le mois sélectionné
    currentView: 'cards',
    filteredTrades: [],
    openTrades: [],
    months: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],

    async init() {
        console.log('🚀 Initialisation Tableau de Trading...');

        // Initialiser crypto-loader pour le tableau
        if (typeof initDynamicCryptoList === 'function') {
            console.log('🔄 Initialisation crypto-loader pour tableau...');
            initDynamicCryptoList().then(() => {
                console.log('✅ Crypto-loader prêt pour tableau');
            }).catch(err => {
                console.log('⚠️ Erreur crypto-loader tableau:', err);
            });
        } else {
            console.log('⚠️ crypto-loader non trouvé');
        }

        // ===== CHARGER DONNÉES FIREBASE =====
        const firebaseLoaded = await loadTableauFromFirebase();
        await loadTradeActionsFromFirebase();
        if (firebaseLoaded) {
            console.log('📊 Données chargées depuis Firebase');
        } else {
            console.log('📝 Utilisation données par défaut (vides)');
        }

        this.openTrades = this.allTrades.openTrades;
        // S'assurer qu'on charge le mois actuel au démarrage
        const realCurrentMonth = new Date().toLocaleDateString('fr-FR', { month: 'long' }).toLowerCase();
        this.currentMonth = realCurrentMonth;
        this.loadMonth(this.currentMonth);

        this.renderMonthTabs();
        this.renderCards();
        this.updateStats();
        this.updateTime();
        // Afficher les trades ouverts par défaut
        this.renderOpenTrades();
        
        // Animation d'entrée des cartes
        setTimeout(() => {
            document.querySelectorAll('.trade-card').forEach((card, index) => {
                card.style.animation = `fadeInUp 0.6s ease ${index * 0.1}s both`;
            });
        }, 100);

        // Démarrer le suivi des prix temps réel après que crypto-loader soit prêt
        setTimeout(() => {
            if (!window.tableauPriceTrackingStarted) {
                window.tableauPriceTrackingStarted = true;
                startTableauPriceTracking();
            }
        }, 3000);
        
        console.log('✅ Tableau de Trading initialisé');


        // Initialiser les analytics après un délai
        setTimeout(() => {
            if (typeof AnalyticsEngine !== 'undefined') {
                console.log('🚀 Analytics Engine prêt');
            }
        }, 2000);
    },

    loadMonth(month) {
        this.currentMonth = month;
        this.trades = this.allTrades[month] || [];
        this.filteredTrades = [...this.trades];

        // Trier du plus récent au plus ancien (pour les cards uniquement)
        if (this.currentView === 'cards') {
            this.filteredTrades.sort((a, b) => {
                const dateA = new Date(a.dateOuv.split('/').reverse().join('-') + ' ' + a.heureOuv.replace('h', ':'));
                const dateB = new Date(b.dateOuv.split('/').reverse().join('-') + ' ' + b.heureOuv.replace('h', ':'));
                return dateB - dateA; // Plus récent en premier
            });
        }

        // Mettre à jour le titre avec le mois actuel
        const headerTitle = document.querySelector('.header-title p');
        if (headerTitle) {
            const monthName = month.charAt(0).toUpperCase() + month.slice(1);
            headerTitle.innerHTML = `${monthName} 2025 • Dernière mise à jour : <span id="last-update">04h33</span>`;
        }
    },



renderMonthTabs() {
    const navContainer = document.querySelector('.month-navigation');
    if (!navContainer) {
        const controlsDiv = document.querySelector('.controls');
        const monthNavDiv = document.createElement('div');
        monthNavDiv.className = 'month-navigation';
        controlsDiv.parentNode.insertBefore(monthNavDiv, controlsDiv);
    }

    const container = document.querySelector('.month-navigation');
    
    // Trouver l'index du mois actuel
    const currentMonthIndex = this.months.indexOf(this.currentMonth);
    
    // Calculer quels mois afficher (3 mois centrés sur le mois sélectionné)
    let startIndex = Math.max(0, currentMonthIndex - 1);
    let endIndex = Math.min(this.months.length - 1, startIndex + 2);
    
    // Ajuster si on est en fin de liste
    if (endIndex - startIndex < 2) {
        startIndex = Math.max(0, endIndex - 2);
    }
    
    const visibleMonths = this.months.slice(startIndex, endIndex + 1);
    const currentRealMonth = new Date().toLocaleDateString('fr-FR', { month: 'long' }).toLowerCase();
    
    container.innerHTML = `
        <div class="month-navigator">
            <button class="nav-arrow" id="prev-months" ${startIndex === 0 ? 'disabled' : ''}>
                ←
            </button>
            <div class="months-container" id="months-container">
                <div class="months-track" id="months-track">
                    ${visibleMonths.map(month => `
                        <div class="month-item ${month === this.currentMonth ? 'active' : ''} ${month === currentRealMonth ? 'current-month' : ''}" 
                             data-month="${month}">
                            ${month.charAt(0).toUpperCase() + month.slice(1)}
                        </div>
                    `).join('')}
                </div>
            </div>
            <button class="nav-arrow" id="next-months" ${endIndex === this.months.length - 1 ? 'disabled' : ''}>
                →
            </button>
        </div>
    `;
    
    this.initMonthNavigation(startIndex, endIndex);
},

initMonthNavigation(startIndex, endIndex) {
    const prevBtn = document.getElementById('prev-months');
    const nextBtn = document.getElementById('next-months');
    const monthsContainer = document.getElementById('months-container');
    const monthsTrack = document.getElementById('months-track');
    let currentStartIndex = startIndex;
    
    // Fonction pour mettre à jour la navigation
    const updateNavigation = (newStartIndex) => {
        const newEndIndex = Math.min(this.months.length - 1, newStartIndex + 2);
        const visibleMonths = this.months.slice(newStartIndex, newEndIndex + 1);
        const currentRealMonth = new Date().toLocaleDateString('fr-FR', { month: 'long' }).toLowerCase();
        
        monthsTrack.innerHTML = visibleMonths.map(month => `
            <div class="month-item ${month === this.currentMonth ? 'active' : ''} ${month === currentRealMonth ? 'current-month' : ''}" 
                 data-month="${month}">
                ${month.charAt(0).toUpperCase() + month.slice(1)}
            </div>
        `).join('');
        
        prevBtn.disabled = newStartIndex === 0;
        nextBtn.disabled = newEndIndex === this.months.length - 1;
        currentStartIndex = newStartIndex;
        
        // Réattacher les événements de clic
        this.attachMonthClickEvents();
    };
    
    // Navigation par flèches
    prevBtn.addEventListener('click', () => {
        if (currentStartIndex > 0) {
            updateNavigation(currentStartIndex - 1);
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentStartIndex + 2 < this.months.length - 1) {
            updateNavigation(currentStartIndex + 1);
        }
    });
    
    // Navigation tactile
    let startX = 0;
    let isDragging = false;
    
    monthsContainer.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        monthsTrack.classList.remove('sliding');
    });
    
    monthsContainer.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        
        const currentX = e.touches[0].clientX;
        const diff = startX - currentX;
        const threshold = 50;
        
        if (Math.abs(diff) > threshold) {
            if (diff > 0 && currentStartIndex + 2 < this.months.length - 1) {
                // Swipe gauche = mois suivants
                updateNavigation(currentStartIndex + 1);
                isDragging = false;
            } else if (diff < 0 && currentStartIndex > 0) {
                // Swipe droite = mois précédents
                updateNavigation(currentStartIndex - 1);
                isDragging = false;
            }
        }
    });
    
    monthsContainer.addEventListener('touchend', () => {
        isDragging = false;
        monthsTrack.classList.add('sliding');
    });
    
    // Navigation clavier
    monthsContainer.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && currentStartIndex > 0) {
            updateNavigation(currentStartIndex - 1);
        } else if (e.key === 'ArrowRight' && currentStartIndex + 2 < this.months.length - 1) {
            updateNavigation(currentStartIndex + 1);
        }
    });
    
    this.attachMonthClickEvents();
},

attachMonthClickEvents() {
    document.querySelectorAll('.month-item').forEach(item => {
        item.addEventListener('click', () => {
            const month = item.dataset.month;
            this.switchMonth(month);
        });
    });
},



    switchMonth(month) {
        this.loadMonth(month);
        this.renderMonthTabs();

        if (this.currentView === 'cards') {
            this.renderCards();
        } else {
            this.renderList();
        }

        this.updateStats();

        // Mettre à jour les analytics si l'onglet est actif
        if (this.currentView === 'analytics' && AnalyticsEngine.charts.performance) {
            AnalyticsEngine.updateChartsData();
        }


        // Animation d'entrée des nouvelles cartes
        setTimeout(() => {
            document.querySelectorAll('.trade-card').forEach((card, index) => {
                card.style.animation = `fadeInUp 0.6s ease ${index * 0.1}s both`;
            });
        }, 100);
    },

    renderCards() {
        const container = document.getElementById('cards-view');

        // Si aucun trade, afficher message vide
        if (this.filteredTrades.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: rgba(255,255,255,0.6);">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">📊</div>
                    <h3 style="color: #00ff88; margin-bottom: 0.5rem;">Aucun trade enregistré</h3>
                    <p>Commencez par ouvrir votre première position !</p>
                    <button class="btn" onclick="TradingTable.addTrade()" style="margin-top: 1rem;">
                        ➕ Ouvrir ma première position
                    </button>
                </div>
            `;
            return;
        }

        // Ajouter le titre si il y a des trades
        let cardsHTML = '';
        if (this.filteredTrades.length > 0) {
            cardsHTML = `
                <div class="trades-section-title">
                    <h3>🔒 Trades clôturés</h3>
                    <div class="trades-count">${this.filteredTrades.length} trade${this.filteredTrades.length > 1 ? 's' : ''}</div>
                </div>
            `;
        }
        
        cardsHTML += this.filteredTrades.map(trade => `
                <div class="trade-card ${trade.pnl >= 0 ? 'profit' : 'loss'}">
                    <div class="card-header">
                        <div class="crypto-info">
                            <div class="crypto-info-card">
                                <img class="crypto-logo-card" 
                                     src="https://assets.coincap.io/assets/icons/${trade.token.toLowerCase()}@2x.png" 
                                     alt="${trade.token}" 
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                                <div class="crypto-icon-card" style="color: #00ff88; display: none;">💎</div>
                                <div class="crypto-symbol">${trade.token}</div>
                            </div>
                            <div class="trade-date">${trade.dateOuv} ${trade.heureOuv}</div>
                        </div>
                        <div class="pnl-badge ${trade.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}">
                            ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <div class="info-group opening">
                            <div class="info-title">🟢 Ouverture</div>
                            <div class="info-row">
                                <span class="info-label">Position:</span>
                                <span class="info-value ${trade.position.includes('Long') ? 'position-long' : 'position-short'}">${trade.position}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Prix:</span>
                                <span class="info-value">$${trade.prixOuv.toFixed(6)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Levier:</span>
                                <span class="info-value"><span class="leverage-badge">${trade.levier}</span></span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Montant:</span>
                                <span class="info-value">$${trade.montant.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="info-group closing">
                           <div class="info-title">🔴 Fermeture</div>
                           <div class="info-row">
                               <span class="info-label">Date:</span>
                               <span class="info-value">${trade.dateFerm} ${trade.heureFerm}</span>
                           </div>
                           <div class="info-row">
                               <span class="info-label">Prix:</span>
                               <span class="info-value">$${trade.prixFerm.toFixed(6)}</span>
                           </div>
                           <div class="info-row">
                               <span class="info-label">Durée:</span>
                               <span class="info-value">${trade.duree}</span>
                           </div>
                           <div class="info-row">
                               <span class="info-label">Accumulé:</span>
                               <span class="info-value">$${trade.accumule.toFixed(2)}</span>
                           </div>
                       </div>
                   </div>
                   
                    <div class="card-footer">
                        <div class="performance-indicator">
                            <span class="info-label">Performance:</span>
                            <span class="perf-value ${trade.perf >= 0 ? 'profit' : 'loss'}">
                                ${trade.perf >= 0 ? '+' : ''}${trade.perf.toFixed(2)}%
                            </span>
                        </div>
                        <div class="card-actions">
                            <button class="comment-btn" onclick="TradingTable.showComment(${trade.id})">
                                💬 Commentaire
                            </button>
                            <button class="edit-trade-btn" onclick="TradingTable.editTrade(${trade.id})" title="Modifier le trade">
                                ✏️
                            </button>
                        </div>
                    </div>
               </div>
        `).join('');
        
        container.innerHTML = cardsHTML;
    },

    renderList() {
        const container = document.getElementById('compact-rows');
        container.innerHTML = this.filteredTrades.map(trade => `
            <div class="compact-row">
                <div class="crypto-symbol-list">
                     <img class="crypto-logo-list" 
                          src="https://assets.coincap.io/assets/icons/${trade.token.toLowerCase()}@2x.png" 
                          alt="${trade.token}" 
                          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                     <div class="crypto-icon-list" style="color: #00ff88; display: none;">💎</div>
                     <span class="crypto-name-list">${trade.token}</span>
                 </div>
                <div class="${trade.position.includes('Long') ? 'position-long' : 'position-short'}">${trade.position}</div>
                <div>$${trade.prixOuv.toFixed(4)} → $${trade.prixFerm.toFixed(4)}</div>
                <div class="${trade.pnl >= 0 ? 'profit' : 'loss'}">${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}</div>
                <div class="${trade.perf >= 0 ? 'profit' : 'loss'}">${trade.perf >= 0 ? '+' : ''}${trade.perf.toFixed(2)}%</div>
                <div><button class="comment-btn" onclick="TradingTable.showComment(${trade.id})">💬</button></div>
            </div>
        `).join('');
    },

switchView(view) {
    this.currentView = view;
    
    // Update buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show/hide views
    document.getElementById('cards-view').style.display = view === 'cards' ? 'grid' : 'none';
    document.getElementById('list-view').classList.toggle('active', view === 'list');
    
    const analyticsView = document.getElementById('analytics-view');
    if (analyticsView) {
        analyticsView.style.display = view === 'analytics' ? 'block' : 'none';
        analyticsView.classList.toggle('active', view === 'analytics');
    }
    
    if (view === 'cards') {
        this.loadMonth(this.currentMonth);
        this.renderCards();
    } else if (view === 'list') {
        this.loadMonth(this.currentMonth);
        this.renderList();
    } else if (view === 'analytics') {
        // Initialiser les analytics si pas encore fait
        if (!AnalyticsEngine.charts.performance) {
            setTimeout(() => {
                AnalyticsEngine.init();
                console.log('📊 Analytics initialisés');
            }, 100);
        } else {
            // Mettre à jour les données des charts
            AnalyticsEngine.updateChartsData();
        }
    }
},

    filterTrades() {
        const filterType = document.getElementById('filter-type').value;
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        
        this.filteredTrades = this.trades.filter(trade => {
            const matchesFilter = filterType === 'all' || 
                (filterType === 'profit' && trade.pnl > 0) ||
                (filterType === 'loss' && trade.pnl < 0) ||
                (filterType === 'long' && trade.position.includes('Long')) ||
                (filterType === 'short' && trade.position.includes('Short'));
                
            const matchesSearch = trade.token.toLowerCase().includes(searchTerm) ||
                trade.comment.toLowerCase().includes(searchTerm);
                
            return matchesFilter && matchesSearch;
        });
        
        if (this.currentView === 'cards') {
            this.renderCards();
        } else {
            this.renderList();
        }
    },

    toggleOpenTrades() {
        const container = document.getElementById('open-trades-cards');
        const toggleText = document.getElementById('toggle-text');
        
        if (container.style.display === 'grid') {
            container.style.display = 'none';
            toggleText.textContent = '👁️ Voir';
        } else {
            this.renderOpenTrades();
            container.style.display = 'grid';
            toggleText.textContent = '🙈 Masquer';
        }
    },

    renderOpenTrades() {
        const container = document.getElementById('open-trades-cards');
        if (!container) return;
        
        container.innerHTML = this.openTrades.map(trade => `
            <div class="open-trade-card">
                <div class="open-card-header">
                    <div class="open-crypto-info">
                        <div class="open-crypto-info-card">
                            <img class="crypto-logo-card" 
                                 src="https://assets.coincap.io/assets/icons/${trade.token.toLowerCase()}@2x.png" 
                                 alt="${trade.token}" 
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                            <div class="crypto-icon-card" style="color: #ffc107; display: none;">💎</div>
                            <div class="open-crypto-symbol">${trade.token}</div>
                        </div>
                        <div class="open-trade-date">${trade.dateOuv} ${trade.heureOuv}</div>
                    </div>
                    <div class="open-pnl-badge ${trade.pnlFlottant >= 0 ? 'open-pnl-positive' : 'open-pnl-negative'}">
                        ${trade.pnlFlottant >= 0 ? '+' : ''}$${trade.pnlFlottant.toFixed(2)}
                    </div>
                </div>
                
                <div class="open-card-body">
                    <div class="open-info-group">
                        <div class="open-info-title">📈 Position</div>
                        <div class="open-info-row">
                            <span class="open-info-label">Type:</span>
                            <span class="open-info-value ${trade.position.includes('Long') ? 'position-long' : 'position-short'}">${trade.position}</span>
                        </div>
                        <div class="open-info-row">
                            <span class="open-info-label">Entrée:</span>
                            <span class="info-value">${formatPrice(trade.prixOuv)}</span>
                        </div>
                        <div class="open-info-row">
                            <span class="open-info-label">Levier:</span>
                            <span class="open-info-value"><span class="leverage-badge">${trade.levier}</span></span>
                        </div>
                        <div class="open-info-row">
                            <span class="open-info-label">Montant:</span>
                            <span class="open-info-value">$${trade.montant.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div class="open-info-group">
                        <div class="open-info-title">💰 En Cours</div>
                        <div class="open-info-row">
                            <span class="open-info-label">Prix Actuel:</span>
                            <span class="open-info-value">${formatPrice(trade.prixActuel)}</span>
                        </div>
                        <div class="open-info-row">
                            <span class="open-info-label">P&L Flottant:</span>
                            <span class="open-info-value ${trade.pnlFlottant >= 0 ? 'profit' : 'loss'}">
                                ${trade.pnlFlottant >= 0 ? '+' : ''}$${trade.pnlFlottant.toFixed(2)}
                            </span>
                        </div>
                        <div class="open-info-row">
                            <span class="open-info-label">Perf Flottante:</span>
                            <span class="open-info-value ${trade.perfFlottante >= 0 ? 'profit' : 'loss'}">
                                ${trade.perfFlottante >= 0 ? '+' : ''}${trade.perfFlottante.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="open-card-footer">
                    <div class="open-performance-indicator">
                        <span class="open-info-label">Performance:</span>
                        <span class="open-perf-value ${trade.perfFlottante >= 0 ? 'profit' : 'loss'}">
                            ${trade.perfFlottante >= 0 ? '+' : ''}${trade.perfFlottante.toFixed(2)}%
                        </span>
                    </div>
                    <div class="open-actions">
                        <button class="edit-trade-btn" onclick="TradingTable.editOpenTrade(${trade.id})" title="Modifier le trade">
                            ✏️
                        </button>
                        <button class="comment-btn" onclick="TradingTable.showOpenComment(${trade.id})">
                            📝 Notes
                        </button>
                        <button class="close-trade-btn" onclick="TradingTable.closeTrade(${trade.id})">
                            🔒 Fermer
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    showComment(tradeId) {
        const trade = this.trades.find(t => t.id === tradeId);
        if (!trade) return;
        
        // Séparer les commentaires (si ils sont combinés)
        const commentParts = this.parseTradeComments(trade);
        
        // Créer modal
        const modal = document.createElement('div');
        modal.className = 'comment-modal show';
        modal.innerHTML = `
            <div class="comment-modal-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid rgba(0, 255, 136, 0.2); padding-bottom: 1rem;">
                    <h3 style="color: #00ff88; margin: 0;">💬 Commentaires - ${trade.token}</h3>
                    <button onclick="this.closest('.comment-modal').remove()" style="background: none; border: none; color: #ff4757; font-size: 1.5rem; cursor: pointer;">✕</button>
                </div>
                <div style="background: rgba(0, 255, 136, 0.1); border-radius: 10px; padding: 1rem; margin-bottom: 1.5rem;">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; text-align: center;">
                        <div>
                            <div style="color: rgba(255, 255, 255, 0.6); font-size: 0.8rem;">Token</div>
                            <div style="color: #00ccff; font-weight: bold;">${trade.token}</div>
                        </div>
                        <div>
                            <div style="color: rgba(255, 255, 255, 0.6); font-size: 0.8rem;">P&L</div>
                            <div style="color: ${trade.pnl >= 0 ? '#4caf50' : '#f44336'}; font-weight: bold;">${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}</div>
                        </div>
                        <div>
                            <div style="color: rgba(255, 255, 255, 0.6); font-size: 0.8rem;">Performance</div>
                            <div style="color: ${trade.perf >= 0 ? '#4caf50' : '#f44336'}; font-weight: bold;">${trade.perf >= 0 ? '+' : ''}${trade.perf.toFixed(2)}%</div>
                        </div>
                    </div>
                </div>
                
                <!-- Commentaire d'ouverture -->
                <div class="comment-section" style="margin-bottom: 1.5rem;">
                    <div class="comment-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
                        <h4 style="color: #4caf50; margin: 0; font-size: 1rem;">🟢 Commentaire d'ouverture</h4>
                        <button class="edit-comment-btn" onclick="TradingTable.editComment(${trade.id}, 'opening')" 
                                style="background: rgba(0, 255, 136, 0.2); border: 1px solid #00ff88; border-radius: 15px; color: #00ff88; padding: 0.3rem 0.6rem; cursor: pointer; font-size: 0.8rem;">
                            ✏️ Éditer
                        </button>
                    </div>
                    <div class="comment-content" id="opening-comment-${trade.id}" style="background: rgba(0, 20, 40, 0.4); border-radius: 10px; padding: 1.2rem; color: rgba(255, 255, 255, 0.9); line-height: 1.6; min-height: 2rem;">
                        ${commentParts.opening || '<em style="color: rgba(255,255,255,0.5);">Aucun commentaire d\'ouverture</em>'}
                    </div>
                </div>
                
                <!-- Commentaire de fermeture -->
                <div class="comment-section">
                    <div class="comment-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
                        <h4 style="color: #f44336; margin: 0; font-size: 1rem;">🔴 Commentaire de fermeture</h4>
                        <button class="edit-comment-btn" onclick="TradingTable.editComment(${trade.id}, 'closing')" 
                                style="background: rgba(255, 71, 87, 0.2); border: 1px solid #ff4757; border-radius: 15px; color: #ff4757; padding: 0.3rem 0.6rem; cursor: pointer; font-size: 0.8rem;">
                            ✏️ Éditer
                        </button>
                    </div>
                    <div class="comment-content" id="closing-comment-${trade.id}" style="background: rgba(0, 20, 40, 0.4); border-radius: 10px; padding: 1.2rem; color: rgba(255, 255, 255, 0.9); line-height: 1.6; min-height: 2rem;">
                        ${commentParts.closing || '<em style="color: rgba(255,255,255,0.5);">Aucun commentaire de fermeture</em>'}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },

    parseTradeComments(trade) {
        // Si le commentaire contient un séparateur, le diviser
        if (trade.comment && trade.comment.includes('||CLOSING||')) {
            const parts = trade.comment.split('||CLOSING||');
            return {
                opening: parts[0].trim(),
                closing: parts[1].trim()
            };
        }
        
        // Sinon, tout est considéré comme commentaire d'ouverture
        return {
            opening: trade.comment || '',
            closing: ''
        };
    },

    editComment(tradeId, type) {
        const trade = this.trades.find(t => t.id === tradeId);
        if (!trade) return;
        
        const commentParts = this.parseTradeComments(trade);
        const currentComment = type === 'opening' ? commentParts.opening : commentParts.closing;
        const title = type === 'opening' ? 'Commentaire d\'ouverture' : 'Commentaire de fermeture';
        const color = type === 'opening' ? '#4caf50' : '#ff4757';
        
        // Créer modal d'édition
        const editModal = document.createElement('div');
        editModal.className = 'edit-comment-modal show';
        editModal.innerHTML = `
            <div class="edit-comment-modal-content">
                <div class="edit-comment-header">
                    <h3 style="color: ${color};">✏️ ${title}</h3>
                    <button onclick="this.closest('.edit-comment-modal').remove()" style="background: none; border: none; color: #ff4757; font-size: 1.5rem; cursor: pointer;">✕</button>
                </div>
                
                <div class="edit-comment-body">
                    <div style="margin-bottom: 1rem; color: rgba(255,255,255,0.8); text-align: center;">
                        <strong>${trade.token}</strong> • ${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)} • ${trade.perf >= 0 ? '+' : ''}${trade.perf.toFixed(2)}%
                    </div>
                    
                    <textarea id="edit-comment-text" placeholder="Entrez votre commentaire..." 
                              style="width: 100%; height: 120px; background: rgba(0,20,40,0.6); border: 1px solid ${color}; border-radius: 8px; color: #fff; padding: 1rem; resize: vertical; font-family: inherit;">${currentComment.replace(/<em[^>]*>.*?<\/em>/g, '')}</textarea>
                    
                    <div class="edit-comment-actions" style="display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem;">
                        <button onclick="this.closest('.edit-comment-modal').remove()" 
                                style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: #fff; padding: 0.8rem 1.5rem; cursor: pointer;">
                            Annuler
                        </button>
                        <button onclick="TradingTable.saveComment(${tradeId}, '${type}')" 
                                style="background: ${color}; border: none; border-radius: 8px; color: #000; padding: 0.8rem 1.5rem; font-weight: bold; cursor: pointer;">
                            💾 Sauvegarder
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(editModal);
        
        // Focus sur le textarea
        setTimeout(() => {
            document.getElementById('edit-comment-text').focus();
        }, 100);
    },

    async saveComment(tradeId, type) {
        const newComment = document.getElementById('edit-comment-text').value.trim();
        const trade = this.trades.find(t => t.id === tradeId);
        if (!trade) return;
        
        const commentParts = this.parseTradeComments(trade);
        
        // Mettre à jour le bon commentaire
        if (type === 'opening') {
            commentParts.opening = newComment;
        } else {
            commentParts.closing = newComment;
        }
        
        // Recombiner les commentaires
        let combinedComment = '';
        if (commentParts.opening && commentParts.closing) {
            combinedComment = `${commentParts.opening}||CLOSING||${commentParts.closing}`;
        } else if (commentParts.opening) {
            combinedComment = commentParts.opening;
        } else if (commentParts.closing) {
            combinedComment = `||CLOSING||${commentParts.closing}`;
        }
        
        // Sauvegarder
        trade.comment = combinedComment;
        
        // Mettre à jour l'affichage dans le modal principal
        const commentElement = document.getElementById(`${type}-comment-${tradeId}`);
        if (commentElement) {
            commentElement.innerHTML = newComment || `<em style="color: rgba(255,255,255,0.5);">Aucun commentaire de ${type === 'opening' ? 'ouverture' : 'fermeture'}</em>`;
        }
        
        // Fermer le modal d'édition
        document.querySelector('.edit-comment-modal').remove();
        
        // Sauvegarder sur Firebase
        await saveTableauToFirebase();
        
        // Message de succès
        this.showSuccessMessage(`Commentaire de ${type === 'opening' ? 'ouverture' : 'fermeture'} mis à jour !`);
    },

    editTrade(tradeId) {
        const trade = this.trades.find(t => t.id === tradeId);
        if (!trade) return;
        
        const commentParts = this.parseTradeComments(trade);
        
        // Créer modal d'édition complète
        const editModal = document.createElement('div');
        editModal.className = 'edit-trade-modal show';
        editModal.innerHTML = `
            <div class="edit-trade-modal-content">
                <div class="edit-trade-header">
                    <h3>✏️ Modifier Trade - ${trade.token}</h3>
                    <button onclick="this.closest('.edit-trade-modal').remove()">✕</button>
                </div>
                
                <form class="edit-trade-form" id="edit-trade-form-${trade.id}">
                    <!-- Informations générales -->
                    <div class="form-section">
                        <h4>📊 Informations générales</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Token</label>
                                <input type="text" id="edit-token-${trade.id}" value="${trade.token}" required>
                            </div>
                            <div class="form-group">
                                <label>Position</label>
                                <select id="edit-position-${trade.id}" required>
                                    <option value="Long ↑" ${trade.position === 'Long ↑' ? 'selected' : ''}>Long ↑</option>
                                    <option value="Short ↓" ${trade.position === 'Short ↓' ? 'selected' : ''}>Short ↓</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Levier</label>
                                <select id="edit-levier-${trade.id}" required>
                                    <option value="x1" ${trade.levier === 'x1' ? 'selected' : ''}>x1</option>
                                    <option value="x2" ${trade.levier === 'x2' ? 'selected' : ''}>x2</option>
                                    <option value="x3" ${trade.levier === 'x3' ? 'selected' : ''}>x3</option>
                                    <option value="x4" ${trade.levier === 'x4' ? 'selected' : ''}>x4</option>
                                    <option value="x5" ${trade.levier === 'x5' ? 'selected' : ''}>x5</option>
                                    <option value="x10" ${trade.levier === 'x10' ? 'selected' : ''}>x10</option>
                                    <option value="x20" ${trade.levier === 'x20' ? 'selected' : ''}>x20</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Montant ($)</label>
                                <input type="number" id="edit-montant-${trade.id}" value="${trade.montant}" step="0.01" required>
                            </div>
                        </div>
                    </div>

                    <!-- Ouverture -->
                    <div class="form-section">
                        <h4>🟢 Ouverture</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Date d'ouverture</label>
                                <input type="date" id="edit-date-ouv-${trade.id}" value="${this.convertDateForInput(trade.dateOuv)}" required>
                            </div>
                            <div class="form-group">
                                <label>Heure d'ouverture</label>
                                <input type="time" id="edit-heure-ouv-${trade.id}" value="${this.convertTimeForInput(trade.heureOuv)}" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Prix d'ouverture ($)</label>
                                <input type="number" id="edit-prix-ouv-${trade.id}" value="${trade.prixOuv}" step="0.000001" required>
                            </div>
                        </div>
                    </div>

                    <!-- Fermeture -->
                    <div class="form-section">
                        <h4>🔴 Fermeture</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Date de fermeture</label>
                                <input type="date" id="edit-date-ferm-${trade.id}" value="${this.convertDateForInput(trade.dateFerm)}" required>
                            </div>
                            <div class="form-group">
                                <label>Heure de fermeture</label>
                                <input type="time" id="edit-heure-ferm-${trade.id}" value="${this.convertTimeForInput(trade.heureFerm)}" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Prix de fermeture ($)</label>
                                <input type="number" id="edit-prix-ferm-${trade.id}" value="${trade.prixFerm}" step="0.000001" required>
                            </div>
                        </div>
                    </div>

                    <!-- Commentaires -->
                    <div class="form-section full-width">
                        <h4>💬 Commentaires</h4>
                        <div class="form-group">
                            <label>Commentaire d'ouverture</label>
                            <textarea id="edit-comment-opening-${trade.id}" rows="2" placeholder="Plan de trade, analyse...">${commentParts.opening}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Commentaire de fermeture</label>
                            <textarea id="edit-comment-closing-${trade.id}" rows="2" placeholder="Résultat, analyse post-trade...">${commentParts.closing}</textarea>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="this.closest('.edit-trade-modal').remove()">
                            Annuler
                        </button>
                        <button type="submit" class="btn-save">
                            💾 Sauvegarder
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(editModal);
        
        // Gérer la soumission
        document.getElementById(`edit-trade-form-${trade.id}`).addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTradeEdit(trade.id);
        });
    },

    editOpenTrade(tradeId) {
        const trade = this.openTrades.find(t => t.id === tradeId);
        if (!trade) return;
        
        // Créer modal d'édition pour trade ouvert
        const editModal = document.createElement('div');
        editModal.className = 'edit-trade-modal show';
        editModal.innerHTML = `
            <div class="edit-trade-modal-content">
                <div class="edit-trade-header">
                    <h3>✏️ Modifier Position Ouverte - ${trade.token}</h3>
                    <button onclick="this.closest('.edit-trade-modal').remove()">✕</button>
                </div>
                
                <form class="edit-trade-form" id="edit-open-trade-form-${trade.id}">
                    <!-- Informations générales -->
                    <div class="form-section">
                        <h4>📊 Informations générales</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Token</label>
                                <input type="text" id="edit-open-token-${trade.id}" value="${trade.token}" required>
                            </div>
                            <div class="form-group">
                                <label>Position</label>
                                <select id="edit-open-position-${trade.id}" required>
                                    <option value="Long ↑" ${trade.position === 'Long ↑' ? 'selected' : ''}>Long ↑</option>
                                    <option value="Short ↓" ${trade.position === 'Short ↓' ? 'selected' : ''}>Short ↓</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Levier</label>
                                <select id="edit-open-levier-${trade.id}" required>
                                    <option value="x1" ${trade.levier === 'x1' ? 'selected' : ''}>x1</option>
                                    <option value="x2" ${trade.levier === 'x2' ? 'selected' : ''}>x2</option>
                                    <option value="x3" ${trade.levier === 'x3' ? 'selected' : ''}>x3</option>
                                    <option value="x4" ${trade.levier === 'x4' ? 'selected' : ''}>x4</option>
                                    <option value="x5" ${trade.levier === 'x5' ? 'selected' : ''}>x5</option>
                                    <option value="x10" ${trade.levier === 'x10' ? 'selected' : ''}>x10</option>
                                    <option value="x20" ${trade.levier === 'x20' ? 'selected' : ''}>x20</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Montant ($)</label>
                                <input type="number" id="edit-open-montant-${trade.id}" value="${trade.montant}" step="0.01" required>
                            </div>
                        </div>
                    </div>

                    <!-- Ouverture -->
                    <div class="form-section">
                        <h4>🟢 Ouverture</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Date d'ouverture</label>
                                <input type="date" id="edit-open-date-ouv-${trade.id}" value="${this.convertDateForInput(trade.dateOuv)}" required>
                            </div>
                            <div class="form-group">
                                <label>Heure d'ouverture</label>
                                <input type="time" id="edit-open-heure-ouv-${trade.id}" value="${this.convertTimeForInput(trade.heureOuv)}" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Prix d'ouverture ($)</label>
                                <input type="number" id="edit-open-prix-ouv-${trade.id}" value="${trade.prixOuv}" step="0.000001" required>
                            </div>
                        </div>
                    </div>

                    <!-- Notes -->
                    <div class="form-section full-width">
                        <h4>📝 Notes de stratégie</h4>
                        <div class="form-group">
                            <label>Plan de trade</label>
                            <textarea id="edit-open-comment-${trade.id}" rows="3" placeholder="Plan de trade, analyse...">${trade.comment}</textarea>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="this.closest('.edit-trade-modal').remove()">
                            Annuler
                        </button>
                        <button type="submit" class="btn-save">
                            💾 Sauvegarder
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(editModal);
        
        // Gérer la soumission
        document.getElementById(`edit-open-trade-form-${trade.id}`).addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveOpenTradeEdit(trade.id);
        });
    },

    async saveOpenTradeEdit(tradeId) {
        const trade = this.openTrades.find(t => t.id === tradeId);
        if (!trade) return;
        
        // Récupérer les nouvelles valeurs
        const updatedData = {
            token: document.getElementById(`edit-open-token-${tradeId}`).value.toUpperCase(),
            position: document.getElementById(`edit-open-position-${tradeId}`).value,
            levier: document.getElementById(`edit-open-levier-${tradeId}`).value,
            montant: parseFloat(document.getElementById(`edit-open-montant-${tradeId}`).value),
            dateOuv: this.formatDate(document.getElementById(`edit-open-date-ouv-${tradeId}`).value),
            heureOuv: this.formatTime(document.getElementById(`edit-open-heure-ouv-${tradeId}`).value),
            prixOuv: parseFloat(document.getElementById(`edit-open-prix-ouv-${tradeId}`).value),
            comment: document.getElementById(`edit-open-comment-${tradeId}`).value.trim()
        };
        
        // Recalculer P&L avec le nouveau prix d'ouverture
        const isLong = updatedData.position.includes('Long');
        const leverMultiplier = parseInt(updatedData.levier.replace('x', ''));
        const prixDiff = trade.prixActuel - updatedData.prixOuv;
        
        let pnlFlottant, perfFlottante;
        if (isLong) {
            perfFlottante = (prixDiff / updatedData.prixOuv) * 100 * leverMultiplier;
            pnlFlottant = (updatedData.montant * perfFlottante) / 100;
        } else {
            perfFlottante = (-prixDiff / updatedData.prixOuv) * 100 * leverMultiplier;
            pnlFlottant = (updatedData.montant * perfFlottante) / 100;
        }
        
        // Mettre à jour le trade
        Object.assign(trade, {
            token: updatedData.token,
            position: updatedData.position,
            levier: updatedData.levier,
            montant: updatedData.montant,
            dateOuv: updatedData.dateOuv,
            heureOuv: updatedData.heureOuv,
            prixOuv: updatedData.prixOuv,
            pnlFlottant: Math.round(pnlFlottant * 100) / 100,
            perfFlottante: Math.round(perfFlottante * 100) / 100,
            comment: updatedData.comment || "Position ouverte, en attente de fermeture"
        });
        
        // Synchroniser avec allTrades
        this.allTrades.openTrades = this.openTrades;
        
        // Recharger l'affichage
        this.renderOpenTrades();
        this.updateStats();
        
        // Fermer le modal
        document.querySelector('.edit-trade-modal').remove();
        
        // Sauvegarder sur Firebase
        await saveTableauToFirebase();
        
        // Message de succès
        this.showSuccessMessage(`Position ${updatedData.token} modifiée avec succès !`);
    },

    convertDateForInput(dateStr) {
        // Convertir "DD/MM/YYYY" vers "YYYY-MM-DD"
        const parts = dateStr.split('/');
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    },

    convertTimeForInput(timeStr) {
        // Convertir "HHhMM" vers "HH:MM"
        return timeStr.replace('h', ':').padEnd(5, '0');
    },

    async saveTradeEdit(tradeId) {
        const trade = this.trades.find(t => t.id === tradeId);
        if (!trade) return;
        
        // Récupérer toutes les valeurs
        const updatedData = {
            token: document.getElementById(`edit-token-${tradeId}`).value.toUpperCase(),
            position: document.getElementById(`edit-position-${tradeId}`).value,
            levier: document.getElementById(`edit-levier-${tradeId}`).value,
            montant: parseFloat(document.getElementById(`edit-montant-${tradeId}`).value),
            dateOuv: this.formatDate(document.getElementById(`edit-date-ouv-${tradeId}`).value),
            heureOuv: this.formatTime(document.getElementById(`edit-heure-ouv-${tradeId}`).value),
            prixOuv: parseFloat(document.getElementById(`edit-prix-ouv-${tradeId}`).value),
            dateFerm: this.formatDate(document.getElementById(`edit-date-ferm-${tradeId}`).value),
            heureFerm: this.formatTime(document.getElementById(`edit-heure-ferm-${tradeId}`).value),
            prixFerm: parseFloat(document.getElementById(`edit-prix-ferm-${tradeId}`).value),
            commentOpening: document.getElementById(`edit-comment-opening-${tradeId}`).value.trim(),
            commentClosing: document.getElementById(`edit-comment-closing-${tradeId}`).value.trim()
        };
        
        // Recalculer P&L et performance
        const isLong = updatedData.position.includes('Long');
        const leverMultiplier = parseInt(updatedData.levier.replace('x', ''));
        const priceDiff = updatedData.prixFerm - updatedData.prixOuv;
        
        let perf, pnl;
        if (isLong) {
            perf = (priceDiff / updatedData.prixOuv) * 100 * leverMultiplier;
            pnl = (updatedData.montant * perf) / 100;
        } else {
            perf = (-priceDiff / updatedData.prixOuv) * 100 * leverMultiplier;
            pnl = (updatedData.montant * perf) / 100;
        }
        
        // Calculer la durée
        const openDateTime = new Date(updatedData.dateOuv.split('/').reverse().join('-') + ' ' + updatedData.heureOuv.replace('h', ':'));
        const closeDateTime = new Date(updatedData.dateFerm.split('/').reverse().join('-') + ' ' + updatedData.heureFerm.replace('h', ':'));
        const durationMs = closeDateTime - openDateTime;
        const duration = this.formatDuration(durationMs);
        
        // Combiner les commentaires
        let combinedComment = '';
        if (updatedData.commentOpening && updatedData.commentClosing) {
            combinedComment = `${updatedData.commentOpening}||CLOSING||${updatedData.commentClosing}`;
        } else if (updatedData.commentOpening) {
            combinedComment = updatedData.commentOpening;
        } else if (updatedData.commentClosing) {
            combinedComment = `||CLOSING||${updatedData.commentClosing}`;
        }
        
        // Mettre à jour le trade
        Object.assign(trade, {
            token: updatedData.token,
            position: updatedData.position,
            levier: updatedData.levier,
            montant: updatedData.montant,
            dateOuv: updatedData.dateOuv,
            heureOuv: updatedData.heureOuv,
            prixOuv: updatedData.prixOuv,
            dateFerm: updatedData.dateFerm,
            heureFerm: updatedData.heureFerm,
            prixFerm: updatedData.prixFerm,
            duree: duration,
            pnl: Math.round(pnl * 100) / 100,
            perf: Math.round(perf * 100) / 100,
            accumule: updatedData.montant + pnl,
            comment: combinedComment
        });
        
        // Recharger l'affichage
        if (this.currentView === 'cards') {
            this.renderCards();
        } else {
            this.renderList();
        }
        this.updateStats();
        
        // Fermer le modal
        document.querySelector('.edit-trade-modal').remove();
        
        // Sauvegarder sur Firebase
        await saveTradeActionToFirebase('edit', trade);
        
        // Message de succès
        this.showSuccessMessage(`Trade ${updatedData.token} modifié avec succès !`);
    },

    showOpenComment(tradeId) {
        const trade = this.openTrades.find(t => t.id === tradeId);
        if (!trade) return;
        
        // Créer modal
        const modal = document.createElement('div');
        modal.className = 'comment-modal show';
        modal.innerHTML = `
            <div class="comment-modal-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid rgba(255, 193, 7, 0.3); padding-bottom: 1rem;">
                    <h3 style="color: #ffc107; margin: 0;">📝 Notes - ${trade.token} (EN COURS)</h3>
                    <button onclick="this.closest('.comment-modal').remove()" style="background: none; border: none; color: #ff4757; font-size: 1.5rem; cursor: pointer;">✕</button>
                </div>
                <div style="background: rgba(255, 193, 7, 0.1); border-radius: 10px; padding: 1rem; margin-bottom: 1rem;">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; text-align: center;">
                        <div>
                            <div style="color: rgba(255, 255, 255, 0.6); font-size: 0.8rem;">Token</div>
                            <div style="color: #ffc107; font-weight: bold;">${trade.token}</div>
                        </div>
                        <div>
                            <div style="color: rgba(255, 255, 255, 0.6); font-size: 0.8rem;">P&L Flottant</div>
                            <div style="color: ${trade.pnlFlottant >= 0 ? '#4caf50' : '#f44336'}; font-weight: bold;">${trade.pnlFlottant >= 0 ? '+' : ''}${trade.pnlFlottant.toFixed(2)}</div>
                        </div>
                        <div>
                            <div style="color: rgba(255, 255, 255, 0.6); font-size: 0.8rem;">Performance</div>
                            <div style="color: ${trade.perfFlottante >= 0 ? '#4caf50' : '#f44336'}; font-weight: bold;">${trade.perfFlottante >= 0 ? '+' : ''}${trade.perfFlottante.toFixed(2)}%</div>
                        </div>
                    </div>
                </div>
                <div style="background: rgba(0, 20, 40, 0.4); border-radius: 10px; padding: 1.5rem; color: rgba(255, 255, 255, 0.9); line-height: 1.6;">
                    ${trade.comment}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },

    getTextSizeClass(text) {
        const length = text.toString().length;
        if (length <= 4) return '';
        if (length <= 6) return 'medium-text';
        if (length <= 8) return 'small-text';
        return 'extra-small-text';
    },

    // FERMETURE TRADE 
    closeTrade(tradeId) {
        const trade = this.openTrades.find(t => t.id === tradeId);
        if (!trade) return;
        
        // Créer et afficher le modal de fermeture
        this.showCloseTradeModal(trade);
    },

    showCloseTradeModal(trade) {
        const modal = document.createElement('div');
        modal.className = 'close-trade-modal show';
        modal.innerHTML = `
            <div class="close-trade-modal-content">
                <div class="close-trade-header">
                    <h3>🔒 Fermer Position - ${trade.token}</h3>
                    <button class="modal-close" onclick="this.closest('.close-trade-modal').remove()">✕</button>
                </div>

                <div class="trade-summary">
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="summary-label">Position:</span>
                            <span class="summary-value ${trade.position.includes('Long') ? 'position-long' : 'position-short'}">${trade.position}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Prix d'entrée:</span>
                            <span class="summary-value">${formatPrice(trade.prixOuv)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Prix actuel:</span>
                            <span class="summary-value">${formatPrice(trade.prixActuel)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">P&L flottant:</span>
                            <span class="summary-value ${trade.pnlFlottant >= 0 ? 'profit' : 'loss'}">
                                ${trade.pnlFlottant >= 0 ? '+' : ''}${trade.pnlFlottant.toFixed(2)} (${trade.perfFlottante >= 0 ? '+' : ''}${trade.perfFlottante.toFixed(2)}%)
                            </span>
                        </div>
                    </div>
                </div>

                <form class="close-trade-form" id="close-trade-form-${trade.id}">
                    <div class="form-section">
                        <h4>📈 Fermeture</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Date de fermeture</label>
                                <input type="date" id="close-date-${trade.id}" required>
                            </div>
                            <div class="form-group">
                                <label>Heure de fermeture</label>
                                <input type="time" id="close-time-${trade.id}" required>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Prix de fermeture ($)</label>
                                <input type="number" id="close-price-${trade.id}" 
                                       value="${trade.prixActuel.toFixed(6)}" 
                                       step="0.000001" min="0" required>
                            </div>
                        </div>
                    </div>

                    <div class="form-section full-width">
                        <h4>📝 Commentaire de fermeture</h4>
                        <div class="form-group">
                            <label>Résumé du trade (optionnel)</label>
                            <textarea id="close-comment-${trade.id}" 
                                      placeholder="Ex: TP atteint à 68000$, excellent trade..." 
                                      rows="3"></textarea>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="this.closest('.close-trade-modal').remove()">
                            Annuler
                        </button>
                        <button type="submit" class="btn-save">
                            🔒 Fermer Position
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Pré-remplir la date/heure actuelle
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().slice(0, 5);
        
        document.getElementById(`close-date-${trade.id}`).value = todayStr;
        document.getElementById(`close-time-${trade.id}`).value = timeStr;
        
        // Gérer la soumission du formulaire
        document.getElementById(`close-trade-form-${trade.id}`).addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCloseTradeSubmit(trade);
        });
    },

    async handleCloseTradeSubmit(openTrade) {
        const tradeId = openTrade.id;
        
        // Récupérer les données du formulaire
        const closeDate = document.getElementById(`close-date-${tradeId}`).value;
        const closeTime = document.getElementById(`close-time-${tradeId}`).value;
        const closePrice = parseFloat(document.getElementById(`close-price-${tradeId}`).value);
        const closeComment = document.getElementById(`close-comment-${tradeId}`).value;
        
        // Validation
        if (!closeDate || !closeTime || !closePrice || closePrice <= 0) {
            alert('❌ Veuillez remplir tous les champs obligatoires');
            return;
        }
        
        // Calculer la durée
        const openDateTime = new Date(openTrade.dateOuv.split('/').reverse().join('-') + ' ' + openTrade.heureOuv.replace('h', ':'));
        const closeDateTime = new Date(closeDate + ' ' + closeTime);
        const durationMs = closeDateTime - openDateTime;
        const duration = this.formatDuration(durationMs);
        
        // Calculer P&L final
        const isLong = openTrade.position.includes('Long');
        const leverMultiplier = parseInt(openTrade.levier.replace('x', ''));
        const priceDiff = closePrice - openTrade.prixOuv;
        
        let finalPerf, finalPnl;
        if (isLong) {
            finalPerf = (priceDiff / openTrade.prixOuv) * 100 * leverMultiplier;
            finalPnl = (openTrade.montant * finalPerf) / 100;
        } else {
            finalPerf = (-priceDiff / openTrade.prixOuv) * 100 * leverMultiplier;
            finalPnl = (openTrade.montant * finalPerf) / 100;
        }
        
        // Créer le trade fermé
        const closedTrade = {
            id: tradeId,
            token: openTrade.token,
            dateOuv: openTrade.dateOuv,
            heureOuv: openTrade.heureOuv,
            prixOuv: openTrade.prixOuv,
            position: openTrade.position,
            levier: openTrade.levier,
            montant: openTrade.montant,
            dateFerm: this.formatDate(closeDate),
            heureFerm: this.formatTime(closeTime),
            duree: duration,
            prixFerm: closePrice,
            pnl: Math.round(finalPnl * 100) / 100,
            perf: Math.round(finalPerf * 100) / 100,
            accumule: openTrade.montant + finalPnl,
            comment: closeComment || `Position fermée à ${formatPrice(closePrice)}`
        };
        
        // Ajouter au mois actuel
        if (!this.allTrades[this.currentMonth]) {
            this.allTrades[this.currentMonth] = [];
        }
        this.allTrades[this.currentMonth].unshift(closedTrade);
        
        // Supprimer des trades ouverts
        const openIndex = this.openTrades.findIndex(t => t.id === tradeId);
        if (openIndex !== -1) {
            this.openTrades.splice(openIndex, 1);
            this.allTrades.openTrades = this.openTrades;
        }
        
        // Recharger les données
        this.loadMonth(this.currentMonth);
        
        // Mettre à jour l'affichage
        if (this.currentView === 'cards') {
            this.renderCards();
        } else {
            this.renderList();
        }
        this.updateStats();
        
        // Mettre à jour les trades ouverts si affichés
        const openContainer = document.getElementById('open-trades-cards');
        if (openContainer && openContainer.style.display !== 'none') {
            this.renderOpenTrades();
        }
        
        // Fermer le modal
        document.querySelector('.close-trade-modal').remove();
        
        // Sauvegarder sur Firebase
        await saveTradeActionToFirebase('close', closedTrade);
        

        // ===== VÉRIFICATION TRADE SUSPECT + ATTRIBUTION POINTS =====
        const profitPercent = Math.abs(finalPerf);
        let tradeValidated = true;
            
        console.log('🔍 VÉRIF TRADE:', { token: openTrade.token, profitPercent, seuil: profitPercent > 50 });
            
        if (window.currentUser && window.firebaseDb && profitPercent > 50) {
            console.log('🚨 TRADE SUSPECT - BLOCAGE POINTS');
            tradeValidated = false;
            
            try {
                await sendSuspiciousTradeAlert({
                    userId: window.currentUser.id,
                    userName: window.currentUser.name || window.currentUser.email,
                    token: openTrade.token,
                    profitPercent: profitPercent,
                    profitAmount: finalPnL,
                    tradeAmount: openTrade.montant,
                    tradeId: tradeId,
                    leverage: openTrade.levier,
                    type: 'high_profit',
                    action: 'close'
                });
                
                this.showSuccessMessage(`🔍 Trade suspect (+${profitPercent.toFixed(1)}%) ! En attente validation admin avant points.`);
            } catch (error) {
                console.error('❌ Erreur alerte admin:', error);
                this.showSuccessMessage(`Position fermée ! P&L: ${finalPnL >= 0 ? '+' : ''}${finalPnL.toFixed(2)}`);
            }
        } else if (window.PointsSystem && window.currentUser && finalPnL > 0) {
            // ✅ ATTRIBUTION POINTS SEULEMENT SI TRADE NON SUSPECT
            try {
                await window.PointsSystem.awardTradingPoints(
                    window.currentUser.id, 
                    true, // trading réel
                    profitPercent
                );
                console.log(`🎯 Points attribués pour trade non suspect: +${profitPercent.toFixed(1)}%`);
                this.showSuccessMessage(`Position fermée ! Trade profitable RÉEL 🎯 P&L: +${finalPnL.toFixed(2)} (+${profitPercent.toFixed(1)}%)`);
            } catch (error) {
                console.error('❌ Erreur attribution points trading:', error);
                this.showSuccessMessage(`Position fermée ! P&L: ${finalPnL >= 0 ? '+' : ''}${finalPnL.toFixed(2)}`);
            }
        } else {
            this.showSuccessMessage(`Position ${openTrade.token} fermée ! P&L: ${finalPnL >= 0 ? '+' : ''}${finalPnL.toFixed(2)}`);
        }

    },

    formatDuration(ms) {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours >= 24) {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return `${days}j${remainingHours > 0 ? remainingHours.toString().padStart(2, '0') + 'h' : ''}`;
        } else {
            return `${hours}h${minutes.toString().padStart(2, '0')}`;
        }
    },

    updateStats() {
        // Stats du mois actuel
        const monthTrades = this.trades.length;
        const monthWinners = this.trades.filter(t => t.pnl > 0).length;
        const monthLosers = this.trades.filter(t => t.pnl < 0).length;
        const monthWinRate = monthTrades > 0 ? ((monthWinners / monthTrades) * 100).toFixed(0) : 0;
        const monthNetPnl = this.trades.reduce((sum, t) => sum + t.pnl, 0);
        const monthBestTrade = this.trades.length > 0 ? Math.max(...this.trades.map(t => t.perf)) : 0;
        
        // Stats de l'année (tous les mois)
        const allYearTrades = Object.keys(this.allTrades)
        .filter(key => key !== 'openTrades')
        .map(key => this.allTrades[key])
        .flat();
        const yearTrades = allYearTrades.length;
        const yearWinners = allYearTrades.filter(t => t.pnl > 0).length;
        const yearLosers = allYearTrades.filter(t => t.pnl < 0).length;
        const yearWinRate = yearTrades > 0 ? ((yearWinners / yearTrades) * 100).toFixed(0) : 0;
        const yearNetPnl = allYearTrades.reduce((sum, t) => sum + t.pnl, 0);
        const yearBestTrade = allYearTrades.length > 0 ? Math.max(...allYearTrades.map(t => t.perf)) : 0;
        
        // Stats trades en cours
        const openTradesCount = this.openTrades.length;
        const openPnl = this.openTrades.reduce((sum, t) => sum + t.pnlFlottant, 0);
    
        // Mettre à jour les stats mois avec adaptation de taille
        const monthPnlText = `${monthNetPnl >= 0 ? '+' : ''}${monthNetPnl.toFixed(2)}`;
        const monthBestText = `${monthBestTrade >= 0 ? '+' : ''}${monthBestTrade.toFixed(2)}%`;

        document.getElementById('month-total-trades').textContent = monthTrades;
        document.getElementById('month-winning-trades').textContent = monthWinners;
        document.getElementById('month-losing-trades').textContent = monthLosers;
        document.getElementById('month-win-rate').textContent = `${monthWinRate}%`;

        const monthPnlEl = document.getElementById('month-net-pnl');
        monthPnlEl.textContent = monthPnlText;
        monthPnlEl.className = `stat-value-small ${monthNetPnl >= 0 ? 'profit' : 'loss'} ` + this.getTextSizeClass(monthPnlText);
            
        const monthBestEl = document.getElementById('month-best-trade');
        monthBestEl.textContent = monthBestText;
        monthBestEl.className = `stat-value-small ${monthBestTrade >= 0 ? 'profit' : 'loss'} ` + this.getTextSizeClass(monthBestText);
            
        // Mettre à jour les stats année avec adaptation de taille
        const yearPnlText = `${yearNetPnl >= 0 ? '+' : ''}${yearNetPnl.toFixed(2)}`;
        const yearBestText = `${yearBestTrade >= 0 ? '+' : ''}${yearBestTrade.toFixed(2)}%`;
            
        document.getElementById('year-total-trades').textContent = yearTrades;
        document.getElementById('year-winning-trades').textContent = yearWinners;
        document.getElementById('year-losing-trades').textContent = yearLosers;
        document.getElementById('year-win-rate').textContent = `${yearWinRate}%`;
            
        const yearPnlEl = document.getElementById('year-net-pnl');
        yearPnlEl.textContent = yearPnlText;
        yearPnlEl.className = `stat-value-small ${yearNetPnl >= 0 ? 'profit' : 'loss'} ` + this.getTextSizeClass(yearPnlText);
            
        const yearBestEl = document.getElementById('year-best-trade');
        yearBestEl.textContent = yearBestText;
        yearBestEl.className = `stat-value-small ${yearBestTrade >= 0 ? 'profit' : 'loss'} ` + this.getTextSizeClass(yearBestText);
        
        // Mettre à jour les stats "En cours"
        document.getElementById('open-trades').textContent = openTradesCount;
        document.getElementById('floating-pnl').textContent = `${openPnl >= 0 ? '+' : ''}${openPnl.toFixed(2)}`;
    },

    updateTime() {
        const now = new Date();
        document.getElementById('last-update').textContent = 
            now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    },

    updateOpenTradesPrices() {
        if (!window.cryptoLoader?.isLoaded || this.openTrades.length === 0) return;
        
        let totalPnlFlottant = 0;
        let hasUpdates = false;
        
        this.openTrades.forEach(trade => {
            const cryptoData = window.cryptoLoader.cryptos[trade.token + 'USDT'];
            if (!cryptoData || !cryptoData.price) return;
            
            const currentPrice = cryptoData.price;
            const isLong = trade.position.includes('Long');
            const leverMultiplier = parseInt(trade.levier.replace('x', ''));
            
            const prixDiff = currentPrice - trade.prixOuv;
            let pnlFlottant, perfFlottante;
            
            if (isLong) {
                perfFlottante = (prixDiff / trade.prixOuv) * 100 * leverMultiplier;
                pnlFlottant = (trade.montant * perfFlottante) / 100;
            } else {
                perfFlottante = (-prixDiff / trade.prixOuv) * 100 * leverMultiplier;
                pnlFlottant = (trade.montant * perfFlottante) / 100;
            }
            
            trade.prixActuel = currentPrice;
            trade.pnlFlottant = Math.round(pnlFlottant * 100) / 100;
            trade.perfFlottante = Math.round(perfFlottante * 100) / 100;
            
            totalPnlFlottant += trade.pnlFlottant;
            hasUpdates = true;
        });
        
        if (hasUpdates) {
            document.getElementById('floating-pnl').textContent = `${totalPnlFlottant >= 0 ? '+' : ''}${totalPnlFlottant.toFixed(2)}`;
            document.getElementById('floating-pnl').className = `current-pnl ${totalPnlFlottant >= 0 ? 'profit' : 'loss'}`;
            
            const openContainer = document.getElementById('open-trades-cards');
            if (openContainer && openContainer.style.display !== 'none') {
                this.renderOpenTrades();
            }
        }
    },

    addTrade() {
        // Ouvrir le modal
        const modal = document.getElementById('add-trade-modal');
        if (modal) {
            modal.classList.add('show');

            document.body.classList.add('modal-open');
            
            // Pré-remplir la date du jour
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const timeStr = today.toTimeString().slice(0, 5);
            
            document.getElementById('trade-date-ouv').value = todayStr;
            document.getElementById('trade-heure-ouv').value = timeStr;
            
            // Événement de soumission du formulaire
            const form = document.getElementById('add-trade-form');
            form.onsubmit = (e) => {
                e.preventDefault();
                this.saveNewTrade();
            };

            // Initialiser le sélecteur avec un délai plus long
            setTimeout(() => {
                console.log('🔧 Initialisation sélecteur crypto...');
                console.log('Crypto-loader status:', window.cryptoLoader?.isLoaded);
                this.initTradeCryptoSelector();
            }, 1000);
            setTimeout(() => {
                this.initLeverageSlider();
            }, 1100);
        }
    },

    closeAddModal() {
        const modal = document.getElementById('add-trade-modal');
        if (modal) {
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
            
            // Réinitialiser le formulaire
            const form = document.getElementById('add-trade-form');
            if (form) {
                form.reset();
            }
            
            // Réinitialiser les champs cachés
            const hiddenInput = document.getElementById('trade-token');
            if (hiddenInput) {
                hiddenInput.value = '';
                hiddenInput.dataset.cryptoName = '';
                hiddenInput.dataset.cryptoIcon = '';
                hiddenInput.dataset.cryptoColor = '';
                hiddenInput.dataset.isCustom = '';
            }
        }
    },

    initTradeCryptoSelector() {
        const searchInput = document.getElementById('crypto-search-trade');
        const dropdown = document.getElementById('crypto-dropdown-trade');
        const hiddenInput = document.getElementById('trade-token');
        
        if (!searchInput || !dropdown || !hiddenInput) return;
        
        let searchTimeout;
        
        // Générer un logo aléatoire pour les cryptos personnalisées
        function generateRandomLogo() {
            const colors = ['#ff6b7a', '#00ccff', '#9945ff', '#ffa502', '#ff4757', '#00ff88', '#ffc107'];
            const icons = ['💎', '🚀', '⚡', '🔥', '💰', '🌟', '💫', '🎯', '🔮', '💊'];
            
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const randomIcon = icons[Math.floor(Math.random() * icons.length)];
            
            return { color: randomColor, icon: randomIcon };
        }
        
        // Afficher les cryptos populaires par défaut
        function showPopularCryptos() {
            console.log('📋 showPopularCryptos appelé');
            if (!window.cryptoLoader?.isLoaded) {
                console.log('⏳ Crypto-loader pas prêt, affichage message...');
                dropdown.innerHTML = '<div class="crypto-loading-trade">⏳ Chargement des cryptos...</div>';
                dropdown.style.display = 'block';
                return;
            }

            console.log('✅ Crypto-loader prêt, récupération cryptos populaires...');
            const popular = window.cryptoLoader.getCryptosByCategory('popular').slice(0, 12);
            console.log('Cryptos populaires trouvées:', popular.length);
            displayCryptoOptions(popular);

            if (!window.dropdownPriceUpdateStarted) {
                window.dropdownPriceUpdateStarted = true;
                setInterval(() => {
                    updateDropdownPrices();
                }, 10000);
            }
        }
        
        // Afficher les options + option de création
        function displayCryptoOptions(cryptos, query = '') {
            dropdown.innerHTML = '';
            
            // Ajouter les cryptos trouvées
            cryptos.forEach(crypto => {
                const option = document.createElement('div');
                option.className = 'crypto-option-trade';
                option.innerHTML = `
                    <img class="crypto-logo-trade" 
                         src="https://assets.coincap.io/assets/icons/${crypto.symbol.toLowerCase()}@2x.png" 
                         alt="${crypto.symbol}" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                    <div class="crypto-icon-trade" style="background-color: ${crypto.color}; color: white; display: none;">
                        ${crypto.icon}
                    </div>
                    <div class="crypto-info-trade">
                        <strong>${crypto.name}</strong>
                        <small>${crypto.symbol}</small>
                    </div>
                    <div class="crypto-price-trade" data-symbol="${crypto.symbol}">
                        ${crypto.price?.toFixed(crypto.price > 1 ? 2 : 6) || '---'}
                    </div>
                `;
                
                option.addEventListener('click', () => {
                    searchInput.value = crypto.symbol;
                    hiddenInput.value = crypto.symbol;
                    hiddenInput.dataset.cryptoName = crypto.name;
                    hiddenInput.dataset.cryptoIcon = crypto.icon;
                    hiddenInput.dataset.cryptoColor = crypto.color;
                    hiddenInput.dataset.isCustom = 'false';
                    dropdown.style.display = 'none';
                });
                
                dropdown.appendChild(option);
            });
            
            // Si il y a une recherche et pas de résultat exact, proposer la création
            if (query.length >= 2) {
                const exactMatch = cryptos.find(crypto => 
                    crypto.symbol.toLowerCase() === query.toLowerCase() || 
                    crypto.name.toLowerCase() === query.toLowerCase()
                );
                
                if (!exactMatch) {
                    const randomLogo = generateRandomLogo();
                    const cleanSymbol = query.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                    
                    const createOption = document.createElement('div');
                    createOption.className = 'crypto-create-option';
                    createOption.innerHTML = `
                        <div class="crypto-create-icon" style="background: ${randomLogo.color};">
                            ${randomLogo.icon}
                        </div>
                        <div class="crypto-create-text">
                            <strong>Créer "${cleanSymbol}"</strong>
                            <small>Crypto personnalisée avec logo aléatoire</small>
                        </div>
                    `;
                    
                    createOption.addEventListener('click', () => {
                        searchInput.value = cleanSymbol;
                        hiddenInput.value = cleanSymbol;
                        hiddenInput.dataset.cryptoName = query;
                        hiddenInput.dataset.cryptoIcon = randomLogo.icon;
                        hiddenInput.dataset.cryptoColor = randomLogo.color;
                        hiddenInput.dataset.isCustom = 'true';
                        dropdown.style.display = 'none';
                    });
                    
                    dropdown.appendChild(createOption);
                }
            }
            
            dropdown.style.display = 'block';
        }
        
        // Recherche avec délai
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // Effacer le timeout précédent
            clearTimeout(searchTimeout);
            
            if (query.length === 0) {
                showPopularCryptos();
                return;
            }
            
            if (query.length >= 2) {
                searchTimeout = setTimeout(() => {
                    if (window.cryptoLoader?.isLoaded) {
                        const results = window.cryptoLoader.searchCryptos(query);
                        displayCryptoOptions(results, query);
                    } else {
                        // Si crypto-loader pas prêt, permettre la création directe
                        const randomLogo = generateRandomLogo();
                        const cleanSymbol = query.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                        
                        dropdown.innerHTML = `
                            <div class="crypto-create-option">
                                <div class="crypto-create-icon" style="background: ${randomLogo.color};">
                                    ${randomLogo.icon}
                                </div>
                                <div class="crypto-create-text">
                                    <strong>Créer "${cleanSymbol}"</strong>
                                    <small>Crypto personnalisée</small>
                                </div>
                            </div>
                        `;
                        
                        dropdown.querySelector('.crypto-create-option').addEventListener('click', () => {
                            searchInput.value = cleanSymbol;
                            hiddenInput.value = cleanSymbol;
                            hiddenInput.dataset.cryptoName = query;
                            hiddenInput.dataset.cryptoIcon = randomLogo.icon;
                            hiddenInput.dataset.cryptoColor = randomLogo.color;
                            hiddenInput.dataset.isCustom = 'true';
                            dropdown.style.display = 'none';
                        });
                        
                        dropdown.style.display = 'block';
                    }
                }, 300); // Délai de 300ms
            } else {
                dropdown.style.display = 'none';
            }
        });
        
        // Valider automatiquement si l'utilisateur tape et appuie sur Entrée
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === 'Tab') {
                const query = searchInput.value.trim();
                if (query.length >= 2 && !hiddenInput.value) {
                    // Auto-création si pas encore sélectionné
                    const randomLogo = generateRandomLogo();
                    const cleanSymbol = query.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                    
                    searchInput.value = cleanSymbol;
                    hiddenInput.value = cleanSymbol;
                    hiddenInput.dataset.cryptoName = query;
                    hiddenInput.dataset.cryptoIcon = randomLogo.icon;
                    hiddenInput.dataset.cryptoColor = randomLogo.color;
                    hiddenInput.dataset.isCustom = 'true';
                    dropdown.style.display = 'none';
                }
            }
        });
        
        // Focus / Blur
        searchInput.addEventListener('focus', () => {
            if (!searchInput.value.trim()) {
                showPopularCryptos();
            } else if (searchInput.value.length >= 2) {
                const query = searchInput.value.trim();
                if (window.cryptoLoader?.isLoaded) {
                    const results = window.cryptoLoader.searchCryptos(query);
                    displayCryptoOptions(results, query);
                }
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    },

    async initLeverageSlider() {
        const slider = document.getElementById('trade-levier-slider');
        const hiddenInput = document.getElementById('trade-levier');
        const valueDisplay = document.getElementById('leverage-value');
        const riskLabel = document.getElementById('leverage-risk');
        const progress = document.getElementById('leverage-progress');
        
        if (!slider) return;
        
        function updateLeverage(value) {
            const leverage = parseInt(value);
            
            // Mettre à jour l'affichage
            valueDisplay.textContent = leverage;
            hiddenInput.value = `x${leverage}`;
            
            // Calculer le pourcentage (de 0% à 100%)
            const percentage = ((leverage - 1) / 49) * 100;
            progress.style.width = `${Math.max(2, percentage)}%`; // Minimum 2% pour voir le curseur
            
            // Déterminer le niveau de risque
            let riskClass, riskText, progressClass;
            
            if (leverage <= 3) {
                riskClass = 'low';
                riskText = 'Faible risque';
                progressClass = 'low';
            } else if (leverage <= 10) {
                riskClass = 'medium';
                riskText = 'Risque modéré';
                progressClass = 'medium';
            } else if (leverage <= 25) {
                riskClass = 'high';
                riskText = 'Risque élevé';
                progressClass = 'high';
            } else {
                riskClass = 'extreme';
                riskText = 'Risque extrême';
                progressClass = 'extreme';
            }
            
            // Appliquer les styles
            riskLabel.className = `leverage-risk ${riskClass}`;
            riskLabel.textContent = riskText;
            progress.className = `leverage-progress ${progressClass}`;
        }
        
        // Événements
        slider.addEventListener('input', (e) => {
            updateLeverage(e.target.value);
        });
        
        // Initialiser à x1
        updateLeverage(1);
    },

    async saveNewTrade() {
        // Récupérer les valeurs du formulaire
        const hiddenTokenInput = document.getElementById('trade-token');
        const formData = {
            token: hiddenTokenInput.value.toUpperCase(),
            tokenName: hiddenTokenInput.dataset.cryptoName || hiddenTokenInput.value,
            tokenIcon: hiddenTokenInput.dataset.cryptoIcon || '💎',
            tokenColor: hiddenTokenInput.dataset.cryptoColor || '#00ff88',
            isCustomCrypto: hiddenTokenInput.dataset.isCustom === 'true',
            position: document.getElementById('trade-position').value,
            levier: document.getElementById('trade-levier').value,
            montant: parseFloat(document.getElementById('trade-montant').value),
            dateOuv: document.getElementById('trade-date-ouv').value,
            heureOuv: document.getElementById('trade-heure-ouv').value,
            prixOuv: parseFloat(document.getElementById('trade-prix-ouv').value),
            strategy: document.getElementById('trade-strategy').value
        };
        
        // Validation
        if (!this.validateOpenTradeData(formData)) {
            return;
        }
        
        // Calculs P&L flottant
        const calculatedData = this.calculateOpenTradeResults(formData);
        
        // Créer le nouvel objet trade ouvert
        const newOpenTrade = {
            id: Date.now(), // ID unique basé sur timestamp
            token: calculatedData.token,
            dateOuv: this.formatDate(calculatedData.dateOuv),
            heureOuv: this.formatTime(calculatedData.heureOuv),
            prixOuv: calculatedData.prixOuv,
            position: calculatedData.position,
            levier: calculatedData.levier,
            montant: calculatedData.montant,
            prixActuel: calculatedData.prixActuel,
            pnlFlottant: calculatedData.pnlFlottant,
            perfFlottante: calculatedData.perfFlottante,
            comment: calculatedData.strategy || "Position ouverte, en attente de fermeture"
        };
        
        // Ajouter aux trades ouverts
        this.openTrades.unshift(newOpenTrade); // Ajouter en premier
        this.allTrades.openTrades = this.openTrades; // Synchroniser
        
        // Mettre à jour les stats
        this.updateStats();
        
        // Fermer le modal
        this.closeAddModal();
        
        // Sauvegarder sur Firebase
        await saveTableauToFirebase();
        
        // Points pour VRAIE position ouverte
        if (typeof window.PointsSystem !== 'undefined' && window.currentUser) {
            await window.PointsSystem.awardPortfolioPoints(window.currentUser.id, 'real_position_open');
        }
        
        // Si les trades ouverts sont affichés, les recharger
        const openContainer = document.getElementById('open-trades-cards');
        if (openContainer && openContainer.style.display !== 'none') {
            this.renderOpenTrades();
        }
    },

    validateOpenTradeData(data) {
        const hiddenInput = document.getElementById('trade-token');
        
            if (!hiddenInput?.value || !data.position || !data.levier || !data.montant || 
                !data.dateOuv || !data.heureOuv || !data.prixOuv) {
            alert('❌ Veuillez remplir tous les champs obligatoires');
            return false;
        }
        
        if (data.montant <= 0 || data.prixOuv <= 0) {
            alert('❌ Les montants et prix doivent être positifs');
            return false;
        }
        
        // Vérifier que le token n'est pas déjà ouvert
        const tokenSymbol = hiddenInput.value.toUpperCase();
        const existingTrade = this.openTrades.find(t => t.token === tokenSymbol);
        if (existingTrade) {
            alert(`❌ Vous avez déjà une position ouverte sur ${tokenSymbol}`);
            return false;
        }
        
        return true;
    },

    calculateOpenTradeResults(data) {
        // Calcul du P&L flottant et performance
        const prixActuel = data.prixOuv;
        const prixDiff = data.prixActuel - data.prixOuv;
        const isLong = data.position.includes('Long');
        const leverMultiplier = parseInt(data.levier.replace('x', ''));
        
        let pnlFlottant, perfFlottante;
        if (isLong) {
            perfFlottante = (prixDiff / data.prixOuv) * 100 * leverMultiplier;
            pnlFlottant = (data.montant * perfFlottante) / 100;
        } else {
            perfFlottante = (-prixDiff / data.prixOuv) * 100 * leverMultiplier;
            pnlFlottant = (data.montant * perfFlottante) / 100;
        }
        
        return {
            ...data,
            prixActuel: prixActuel,
            pnlFlottant: Math.round(pnlFlottant * 100) / 100,
            perfFlottante: Math.round(perfFlottante * 100) / 100
        };
    },

    formatDate(dateStr) {
        const date = new Date(dateStr);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    },

    formatTime(timeStr) {
        return timeStr.replace(':', 'h');
    },

    showSuccessMessage(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: linear-gradient(45deg, #00ff88, #00ccff);
            color: #000;
            padding: 1rem 2rem;
            border-radius: 25px;
            font-weight: bold;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    },

    syncData() {
        alert('💾 Synchronisation en développement !');
    }
};

// ===== FONCTIONS UTILITAIRES =====
async function startTableauPriceTracking() {
    console.log('🚀 Démarrage suivi prix tableau...');
    
    const fetchPrices = async () => {
        try {
            if (!window.cryptoLoader?.isLoaded) {
                console.log('⏳ Crypto-loader pas encore prêt pour tableau...');
                return;
            }

            console.log('📊 Récupération prix API Binance...');
            const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
            const allStats = await response.json();
            
            let updated = 0;
            allStats.forEach(item => {
                if (window.cryptoLoader?.cryptos[item.symbol]) {
                    window.cryptoLoader.cryptos[item.symbol].price = parseFloat(item.lastPrice);
                    window.cryptoLoader.cryptos[item.symbol].change24h = parseFloat(item.priceChangePercent);
                    window.cryptoLoader.cryptos[item.symbol].high24h = parseFloat(item.highPrice);
                    window.cryptoLoader.cryptos[item.symbol].low24h = parseFloat(item.lowPrice);
                    window.cryptoLoader.cryptos[item.symbol].volume = parseFloat(item.quoteVolume);
                    updated++;
                }
            });
            
            console.log(`✅ ${updated} prix mis à jour`);
            TradingTable.updateOpenTradesPrices();
            
        } catch (error) {
            console.log('⚠️ Erreur récupération prix tableau:', error);
        }
    };
    
    // Premier fetch immédiat
    await fetchPrices();
    
    // Puis toutes les 10 secondes
    setInterval(fetchPrices, 10000);
    console.log('🔄 Suivi prix tableau démarré (10s)');
}

function formatPrice(price) {
    const decimals = price >= 1 ? 2 : 6;
    const formatted = price.toFixed(decimals);
    
    // Séparer la partie entière et décimale
    const [integer, decimal] = formatted.split('.');
    
    // Ajouter espaces tous les 3 chiffres (de droite à gauche)
    const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    
    return `${formattedInteger}${decimal ? '.' + decimal : ''}`;
}

function updateDropdownPrices() {
   if (!window.cryptoLoader?.isLoaded) return;
   
   const priceElements = document.querySelectorAll('.crypto-price-trade[data-symbol]');
   priceElements.forEach(element => {
       const symbol = element.dataset.symbol;
       const cryptoData = window.cryptoLoader.cryptos[symbol + 'USDT'];
       
       if (cryptoData && cryptoData.price) {
           const oldPrice = parseFloat(element.textContent.replace('$', ''));
           const newPrice = cryptoData.price;
           
           element.textContent = formatPrice(newPrice);
           
           // Animation couleur si changement significatif
           if (Math.abs(oldPrice - newPrice) > 0.01) {
               const isUp = newPrice > oldPrice;
               element.style.transition = 'color 0.3s ease';
               element.style.color = isUp ? '#4caf50' : '#f44336';
               
               setTimeout(() => {
                   element.style.color = '#00ff88';
               }, 1000);
           }
       }
   });
}





// ===== ANALYTICS & AI FEATURES =====
const AnalyticsEngine = {
    charts: {},
    
    init() {
        console.log('🤖 Initialisation Analytics Engine...');
        this.initCharts();
        this.startAIAnalysis();
    },
    
    initCharts() {
        // Performance Chart
        const perfCtx = document.getElementById('performance-chart');
        if (perfCtx) {
            this.charts.performance = new Chart(perfCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul'],
                    datasets: [{
                        label: 'P&L Cumulé',
                        data: [0, 150, -80, 320, 180, 450, 380],
                        borderColor: '#00ff88',
                        backgroundColor: 'rgba(0, 255, 136, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: this.getChartOptions('line')
            });
        }
        
        // P&L Distribution
        const pnlCtx = document.getElementById('pnl-chart');
        if (pnlCtx) {
            this.charts.pnl = new Chart(pnlCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Gros Gains', 'Petits Gains', 'Petites Pertes', 'Grosses Pertes'],
                    datasets: [{
                        data: [25, 45, 20, 10],
                        backgroundColor: ['#4caf50', '#8bc34a', '#ff9800', '#f44336'],
                        borderWidth: 0
                    }]
                },
                options: this.getChartOptions('doughnut')
            });
        }
        
        // Top Cryptos
        const cryptoCtx = document.getElementById('crypto-chart');
        if (cryptoCtx) {
            this.charts.crypto = new Chart(cryptoCtx, {
                type: 'bar',
                data: {
                    labels: ['BTC', 'ETH', 'SOL', 'ADA', 'DOT'],
                    datasets: [{
                        label: 'P&L Total',
                        data: [320, 180, -45, 95, 78],
                        backgroundColor: ['#f7931a', '#627eea', '#9945ff', '#0033ad', '#e6007a']
                    }]
                },
                options: this.getChartOptions('bar')
            });
        }
        
    // Mettre à jour les autres charts aussi
    const hoursCtx = document.getElementById('hours-chart');
    if (hoursCtx) {
       // Version encore plus stylée
       this.charts.hours = new Chart(hoursCtx, {
           type: 'line',
           data: {
               labels: ['00h', '04h', '08h', '12h', '16h', '20h', '24h'],
               datasets: [{
                   label: 'Performance %',
                   data: [45, 30, 85, 92, 78, 55, 45], // Boucle pour fermer
                   borderColor: '#00ccff',
                   backgroundColor: 'rgba(0, 204, 255, 0.2)',
                   borderWidth: 3,
                   fill: true,
                   tension: 0.4,
                   pointBackgroundColor: '#00ccff',
                   pointBorderColor: '#ffffff',
                   pointBorderWidth: 2,
                   pointRadius: 6
               }]
           },
           options: {
               ...this.getChartOptions('line'),
               scales: {
                   y: {
                       beginAtZero: true,
                       max: 100,
                       grid: { color: 'rgba(255,255,255,0.1)' },
                       ticks: { 
                           color: 'rgba(255,255,255,0.7)',
                           callback: function(value) {
                               return value + '%';
                           }
                       }
                   }
               }
           }
       });
}
        
        // Win Rate Evolution
        const winrateCtx = document.getElementById('winrate-chart');
        if (winrateCtx) {
            this.charts.winrate = new Chart(winrateCtx, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul'],
                    datasets: [
                        {
                            label: 'Victoires',
                            data: [8, 12, 6, 15, 9, 18, 14],
                            backgroundColor: '#4caf50',
                            stack: 'trades'
                        },
                        {
                            label: 'Défaites',
                            data: [4, 3, 8, 5, 6, 2, 6],
                            backgroundColor: '#f44336',
                            stack: 'trades'
                        },
                        {
                            label: 'Win Rate %',
                            data: [67, 80, 43, 75, 60, 90, 70],
                            type: 'line',
                            borderColor: '#00ff88',
                            borderWidth: 3,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    ...this.getChartOptions('bar'),
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            ticks: { color: 'rgba(255,255,255,0.7)' }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: { drawOnChartArea: false },
                            ticks: { color: 'rgba(255,255,255,0.7)' }
                        }
                    }
                }
            });
        }
    },
    
    getChartOptions(type) {
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'rgba(255,255,255,0.8)' }
                }
            }
        };
        
        if (type === 'line' || type === 'bar') {
            baseOptions.scales = {
                x: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: 'rgba(255,255,255,0.7)' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: 'rgba(255,255,255,0.7)' }
                }
            };
        }
        
        return baseOptions;
    },
    
    startAIAnalysis() {
        console.log('🧠 Démarrage analyse IA...');
        
        // Simulation d'analyse IA
        setTimeout(() => {
            this.updateAIInsights();
        }, 2000);
        
        // Mise à jour périodique
        setInterval(() => {
            this.updateAIInsights();
        }, 30000);
    },
    
    updateAIInsights() {
        const insights = this.generateAIInsights();
        const container = document.getElementById('ai-insights');
        const statusEl = document.getElementById('ai-status');
        const moodEl = document.getElementById('ai-mood');
        
        if (!container) return;
        
        // Mettre à jour le statut
        statusEl.textContent = 'Analyse terminée • Dernière mise à jour: ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        
        // Mettre à jour l'humeur de l'IA
        const overallMood = this.calculateOverallMood();
        moodEl.textContent = overallMood.emoji;
        
        // Afficher les insights
        container.innerHTML = insights.map(insight => `
            <div class="insight-card" style="animation: slideInUp 0.6s ease;">
                <div class="insight-icon">${insight.icon}</div>
                <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.message}</p>
                </div>
            </div>
        `).join('');
    },
    
    generateAIInsights() {
        const trades = TradingTable.allTrades;
        const insights = [];
        
        // Analyse émotionnelle
        const recentTrades = this.getRecentTrades();
        const winStreak = this.calculateWinStreak(recentTrades);
        
        if (winStreak >= 3) {
            insights.push({
                icon: '🔥',
                title: 'Série de victoires !',
                message: `Tu es sur une série de ${winStreak} trades gagnants. Attention à ne pas devenir overconfident. Reste discipliné !`
            });
        } else if (winStreak <= -3) {
            insights.push({
                icon: '🧘',
                title: 'Phase difficile détectée',
                message: `${Math.abs(winStreak)} pertes consécutives. Prends une pause, révise ta stratégie. Les phases difficiles font partie du trading.`
            });
        }
        
        // Analyse des patterns
        const hourPattern = this.analyzeTimePatterns();
        if (hourPattern.bestHour) {
            insights.push({
                icon: '⏰',
                title: 'Pattern temporel identifié',
                message: `Tu es plus performant vers ${hourPattern.bestHour}h (${hourPattern.winRate}% de réussite). Concentre tes trades sur ces créneaux.`
            });
        }
        
        // Analyse des risques
        const riskAnalysis = this.analyzeRiskBehavior();
        if (riskAnalysis.warning) {
            insights.push({
                icon: '⚠️',
                title: 'Gestion des risques',
                message: riskAnalysis.message
            });
        } else {
            insights.push({
                icon: '✅',
                title: 'Discipline respectée',
                message: 'Ta gestion des risques est excellente. Continue sur cette voie !'
            });
        }
        
        // Suggestion d'amélioration
        const improvement = this.suggestImprovement();
        insights.push({
            icon: '💡',
            title: 'Suggestion d\'amélioration',
            message: improvement
        });
        
        return insights;
    },
    
    getRecentTrades() {
        const allTrades = Object.keys(TradingTable.allTrades)
            .filter(key => key !== 'openTrades')
            .map(key => TradingTable.allTrades[key])
            .flat()
            .sort((a, b) => new Date(b.dateOuv + ' ' + b.heureOuv) - new Date(a.dateOuv + ' ' + a.heureOuv))
            .slice(0, 10);
        
        return allTrades;
    },
    
    calculateWinStreak(trades) {
        let streak = 0;
        for (let trade of trades) {
            if (trade.pnl > 0) {
                streak = streak >= 0 ? streak + 1 : 1;
            } else {
                streak = streak <= 0 ? streak - 1 : -1;
            }
            if (Math.abs(streak) >= 3) break;
        }
        return streak;
    },
    
    analyzeTimePatterns() {
        // Simulation d'analyse des heures
        const hours = Array.from({length: 24}, (_, i) => i);
        const bestHour = hours[Math.floor(Math.random() * 24)];
        const winRate = Math.floor(Math.random() * 30) + 60;
        
        return {
            bestHour,
            winRate: winRate > 70 ? winRate : null
        };
    },
    
    analyzeRiskBehavior() {
        const recentTrades = this.getRecentTrades();
        const highLeverageTrades = recentTrades.filter(t => 
            parseInt(t.levier.replace('x', '')) > 10
        ).length;
        
        if (highLeverageTrades > recentTrades.length * 0.6) {
            return {
                warning: true,
                message: 'Tu utilises beaucoup de leverage élevé récemment. Considère réduire tes risques.'
            };
        }
        
        return { warning: false };
    },
    
    suggestImprovement() {
        const suggestions = [
            'Essaie de tenir un journal plus détaillé de tes émotions pendant les trades.',
            'Considère définir des objectifs de profit/perte avant d\'entrer en position.',
            'Analyse tes trades perdants pour identifier les patterns récurrents.',
            'Teste une approche plus conservative pendant quelques semaines.',
            'Concentre-toi sur 2-3 cryptos que tu connais bien plutôt que de diversifier.',
            'Définis des créneaux horaires fixes pour trader et évite les trades impulsifs.'
        ];
        
        return suggestions[Math.floor(Math.random() * suggestions.length)];
    },
    
    calculateOverallMood() {
        const recentPerf = TradingTable.trades.slice(0, 5).reduce((sum, t) => sum + t.pnl, 0);
        
        if (recentPerf > 100) return { emoji: '🚀', mood: 'excellent' };
        if (recentPerf > 0) return { emoji: '😊', mood: 'positive' };
        if (recentPerf > -50) return { emoji: '😐', mood: 'neutral' };
        return { emoji: '😤', mood: 'concerned' };
    },

    updateChartsData() {
        console.log('🔄 Mise à jour données charts...');
        
        // Mettre à jour avec les vraies données de TradingTable
        const allTrades = Object.keys(TradingTable.allTrades)
            .filter(key => key !== 'openTrades')
            .map(key => TradingTable.allTrades[key])
            .flat();
        
        // Données mensuelles réelles
        const monthlyData = this.calculateMonthlyPerformance(allTrades);
        
        if (this.charts.performance) {
            this.charts.performance.data.labels = monthlyData.labels;
            this.charts.performance.data.datasets[0].data = monthlyData.cumulative;
            this.charts.performance.update('active');
        }
        
        // Mettre à jour les métriques de risque
        this.updateRiskMetrics(allTrades);
    },

    calculateMonthlyPerformance(trades) {
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        const monthlyPnL = new Array(12).fill(0);
        
        trades.forEach(trade => {
            const [day, month, year] = trade.dateOuv.split('/');
            const monthIndex = parseInt(month) - 1;
            if (monthIndex >= 0 && monthIndex < 12) {
                monthlyPnL[monthIndex] += trade.pnl;
            }
        });
        
        // Calculer cumulé
        const cumulative = [];
        let total = 0;
        monthlyPnL.forEach(pnl => {
            total += pnl;
            cumulative.push(Math.round(total * 100) / 100);
        });
        
        return {
            labels: months,
            cumulative: cumulative
        };
    },

    updateRiskMetrics(trades) {
        if (trades.length === 0) return;
        
        const pnls = trades.map(t => t.pnl);
        const maxDrawdown = this.calculateMaxDrawdown(pnls);
        const sharpeRatio = this.calculateSharpeRatio(pnls);
        const volatility = this.calculateVolatility(pnls);
        
        // Mettre à jour l'affichage
        const maxDrawdownEl = document.getElementById('max-drawdown');
        const sharpeRatioEl = document.getElementById('sharpe-ratio');
        const volatilityEl = document.getElementById('volatility');
        
        if (maxDrawdownEl) maxDrawdownEl.textContent = `${maxDrawdown.toFixed(1)}%`;
        if (sharpeRatioEl) sharpeRatioEl.textContent = sharpeRatio.toFixed(2);
        if (volatilityEl) volatilityEl.textContent = `${volatility.toFixed(1)}%`;
        
        // Mettre à jour la jauge de risque
        const riskLevel = this.calculateRiskLevel(maxDrawdown, volatility);
        const gaugeFill = document.querySelector('.gauge-fill');
        if (gaugeFill) {
            gaugeFill.style.width = `${riskLevel}%`;
        }
    },

    calculateMaxDrawdown(pnls) {
        let maxDrawdown = 0;
        let peak = 0;
        let cumulative = 0;
        
        pnls.forEach(pnl => {
            cumulative += pnl;
            if (cumulative > peak) peak = cumulative;
            const drawdown = ((peak - cumulative) / peak) * 100;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        });
        
        return Math.min(maxDrawdown, 100);
    },

    calculateSharpeRatio(pnls) {
        if (pnls.length === 0) return 0;
        
        const mean = pnls.reduce((sum, pnl) => sum + pnl, 0) / pnls.length;
        const variance = pnls.reduce((sum, pnl) => sum + Math.pow(pnl - mean, 2), 0) / pnls.length;
        const stdDev = Math.sqrt(variance);
        
        return stdDev === 0 ? 0 : (mean / stdDev) * Math.sqrt(252); // Annualisé
    },

    calculateVolatility(pnls) {
        if (pnls.length === 0) return 0;
        
        const mean = pnls.reduce((sum, pnl) => sum + pnl, 0) / pnls.length;
        const variance = pnls.reduce((sum, pnl) => sum + Math.pow(pnl - mean, 2), 0) / pnls.length;
        
        return Math.sqrt(variance);
    },

    calculateRiskLevel(maxDrawdown, volatility) {
        // Calcul simplifié du niveau de risque (0-100%)
        const drawdownScore = Math.min(maxDrawdown * 2, 50);
        const volatilityScore = Math.min(volatility, 50);
        return Math.min(drawdownScore + volatilityScore, 100);
    }
};

// ===== SYSTÈME D'ALERTES ADMIN =====
async function sendSuspiciousTradeAlert(alertData) {
    if (!window.firebaseDb || !window.currentUser) return;
    
    try {
        const alert = {
            type: 'suspicious_trade',
            priority: alertData.profitPercent > 100 ? 'high' : 'medium',
            title: `Trade suspect: ${alertData.profitPercent.toFixed(1)}% de profit`,
            message: `${alertData.userName} a réalisé un profit de ${alertData.profitPercent.toFixed(1)}% sur ${alertData.token}`,
            details: {
                userId: alertData.userId,
                userName: alertData.userName,
                userEmail: window.currentUser.email,
                token: alertData.token,
                profitPercent: alertData.profitPercent,
                profitAmount: alertData.profitAmount,
                tradeAmount: alertData.tradeAmount,
                tradeId: alertData.tradeId,
                leverage: alertData.leverage || 'Non spécifié'
            },
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            source: 'tableau_trading'
        };
        
        await window.firebaseDb.collection('admin_alerts').add(alert);
        console.log('🚨 Alerte admin envoyée pour trade suspect');
        
    } catch (error) {
        console.error('❌ Erreur envoi alerte admin:', error);
    }
}

// Exposer la fonction
window.sendSuspiciousTradeAlert = sendSuspiciousTradeAlert;


// ===== EXPOSITION GLOBALE =====
window.TradingTable = TradingTable;
window.saveTableauToFirebase = saveTableauToFirebase;
window.loadTableauFromFirebase = loadTableauFromFirebase;

// ===== DÉMARRAGE =====
document.addEventListener('DOMContentLoaded', checkAuthentication);

console.log('✅ Module Tableau moderne avec Firebase chargé');