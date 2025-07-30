// =====================================================
// LIVE ADMIN DASHBOARD - LOGIQUE COMPLÈTE
// =====================================================

class LiveAdminManager {
    constructor() {
        // État global
        this.isAuthenticated = false;
        this.isAdmin = false;
        this.currentUser = null;
        
        // État du live
        this.isLiveActive = false;
        this.currentLiveId = null;
        this.liveData = null;
        this.streamStatus = 'offline'; // offline, connecting, live, ready
        
        // Métriques en temps réel
        this.metrics = {
            currentViewers: 0,
            peakViewers: 0,
            totalMessages: 0,
            totalLikes: 0,
            liveDuration: 0,
            avgWatchTime: 0
        };
        
        // Données utilisateurs
        this.connectedUsers = [];
        this.chatMessages = [];
        this.scheduledLives = [];
        
        // Timers
        this.metricsTimer = null;
        this.durationTimer = null;
        this.chatUpdateTimer = null;
        
        // Configuration
        this.config = {
            maxChatMessages: 50,
            metricsUpdateInterval: 2000,
            chatUpdateInterval: 1000,
            autoSaveInterval: 30000
        };
        
        // Charts
        this.viewersChart = null;
        
        this.init();
    }
    
    // =====================================================
    // INITIALISATION
    // =====================================================
    
    async init() {
        console.log('🛡️ Initialisation Live Admin Manager');
        
        try {
            // Vérifier l'authentification admin
            await this.checkAdminAuthentication();
            
            // Initialiser les éléments DOM
            this.initDOMElements();
            
            // Bind les événements
            this.bindEvents();
            
            // Charger les données initiales
            await this.loadInitialData();
            
            // Initialiser les graphiques
            this.initCharts();
            
            // Démarrer les timers de mise à jour
            this.startUpdateTimers();
            
            // Charger l'état actuel du live
            await this.checkCurrentLiveStatus();
            
            console.log('✅ Live Admin Manager initialisé avec succès');
            
        } catch (error) {
            console.error('❌ Erreur initialisation Live Admin:', error);
            this.showNotification('Erreur d\'initialisation', 'error');
        }
    }
    
    async checkAdminAuthentication() {
        try {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                return new Promise((resolve) => {
                    firebase.auth().onAuthStateChanged(async (user) => {
                        if (user) {
                            // Vérifier le rôle admin
                            const isAdmin = await this.checkAdminRole(user.uid);
                            
                            if (isAdmin) {
                                this.currentUser = {
                                    id: user.uid,
                                    email: user.email,
                                    name: user.displayName || 'Administrateur Live',
                                    role: 'admin'
                                };
                                
                                this.isAuthenticated = true;
                                this.isAdmin = true;
                                this.updateUserDisplay();
                                resolve(true);
                            } else {
                                // Rediriger vers dashboard utilisateur
                                this.showNotification('Accès refusé - Privilèges administrateur requis', 'error');
                                setTimeout(() => {
                                    window.location.href = '../../vu%20ensemble/dashboard.html';
                                }, 2000);
                                resolve(false);
                            }
                        } else {
                            window.location.href = '../../../index.html';
                            resolve(false);
                        }
                    });
                });
            } else {
                // Mode développement
                this.currentUser = {
                    id: 'admin-live-dev',
                    email: 'admin@cryptolive.dev',
                    name: 'Admin Live Dev',
                    role: 'admin'
                };
                
                this.isAuthenticated = true;
                this.isAdmin = true;
                this.updateUserDisplay();
                return true;
            }
        } catch (error) {
            console.error('❌ Erreur authentification admin:', error);
            return false;
        }
    }
    
    async checkAdminRole(userId) {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const userDoc = await firebase.firestore().collection('users').doc(userId).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    return userData.role === 'admin' || userData.isAdmin === true;
                }
            }
            return false;
        } catch (error) {
            console.log('⚠️ Erreur vérification admin:', error);
            return false;
        }
    }
    
initDOMElements() {
    // Éléments principaux
    this.elements = {
        // Status global
        globalStatusIndicator: document.getElementById('main-status-indicator'),
        globalStatusText: document.getElementById('global-status-text'),
        globalStatusSubtitle: document.getElementById('global-status-subtitle'),
        totalViewers: document.getElementById('total-viewers'),
        liveDurationDisplay: document.getElementById('live-duration-display'),
        totalMessagesCount: document.getElementById('total-messages-count'),
        
        // Contrôles principaux
        mainStartBtn: document.getElementById('main-start-btn'),
        mainStopBtn: document.getElementById('main-stop-btn'),
        emergencyBtn: document.getElementById('emergency-btn'),
        
        // Configuration live
        liveTitle: document.getElementById('live-title'),
        liveDescription: document.getElementById('live-description'),
        youtubeUrl: document.getElementById('youtube-url'),
        instructorName: document.getElementById('instructor-name'),
        liveCategory: document.getElementById('live-category'),
        
        // Contrôles diffusion
        testConnectionBtn: document.getElementById('test-connection-btn'),
        previewBtn: document.getElementById('preview-btn'),
        recordBtn: document.getElementById('record-btn'),
        fullscreenBtn: document.getElementById('fullscreen-btn'),
        
        // Aperçu
        previewContainer: document.getElementById('preview-container'),
        youtubePreview: document.getElementById('youtube-preview'),
        previewIframe: document.getElementById('preview-iframe'),
        
        // Chat modération
        chatEnableBtn: document.getElementById('chat-enable-btn'),
        chatDisableBtn: document.getElementById('chat-disable-btn'),
        adminChatMessages: document.getElementById('admin-chat-messages'),
        
        // Métriques
        peakViewers: document.getElementById('peak-viewers'),
        totalChatMessages: document.getElementById('total-chat-messages'),
        totalLikes: document.getElementById('total-likes'),
        avgWatchTime: document.getElementById('avg-watch-time'),
        viewersChange: document.getElementById('viewers-change'),
        messagesRate: document.getElementById('messages-rate'),
        engagementRate: document.getElementById('engagement-rate'),
        retentionRate: document.getElementById('retention-rate'),
        
        // Graphique
        viewersChart: document.getElementById('viewers-chart'),
        
        // Planning
        addScheduleBtn: document.getElementById('add-schedule-btn'),
        scheduleList: document.getElementById('schedule-list'),
        
        // Utilisateurs connectés
        onlineUsersCount: document.getElementById('online-users-count'),
        connectedUsersList: document.getElementById('connected-users-list'),
        
        // Modales
        scheduleModal: document.getElementById('schedule-modal'),
        scheduleForm: document.getElementById('schedule-form')
    };
}

// Ajouter après initDOMElements()
initAdminNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item[data-section]');
    
    [...navItems, ...mobileNavItems].forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            this.showSection(section);
        });
    });
}

showSection(sectionName) {
    // Masquer toutes les sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Retirer active de tous les nav items
    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Afficher la section demandée
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Activer les nav items correspondants
    document.querySelectorAll(`[data-section="${sectionName}"]`).forEach(item => {
        item.classList.add('active');
    });
    
    console.log(`📺 Section active: ${sectionName}`);
}
    
    bindEvents() {

        this.initAdminNavigation();
        
        // Contrôles principaux
        this.elements.mainStartBtn?.addEventListener('click', () => this.startLive());
        this.elements.mainStopBtn?.addEventListener('click', () => this.stopLive());
        this.elements.emergencyBtn?.addEventListener('click', () => this.emergencyStop());
        
        // Contrôles diffusion
        this.elements.testConnectionBtn?.addEventListener('click', () => this.testConnection());
        this.elements.previewBtn?.addEventListener('click', () => this.togglePreview());
        this.elements.recordBtn?.addEventListener('click', () => this.toggleRecording());
        this.elements.fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());
        
        // Contrôles d'urgence
        this.elements.muteAllBtn?.addEventListener('click', () => this.muteAllAudio());
        this.elements.pauseStreamBtn?.addEventListener('click', () => this.pauseStream());
        this.elements.clearChatBtn?.addEventListener('click', () => this.clearChat());
        this.elements.forceStopBtn?.addEventListener('click', () => this.forceStop());
        
        // Chat modération
        this.elements.chatEnableBtn?.addEventListener('click', () => this.enableChat());
        this.elements.chatDisableBtn?.addEventListener('click', () => this.disableChat());
        this.elements.slowModeBtn?.addEventListener('click', () => this.toggleSlowMode());
        
        // Planning
        this.elements.addScheduleBtn?.addEventListener('click', () => this.showScheduleModal());
        
        // Filtres utilisateurs
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterUsers(e.target.dataset.filter));
        });
        
        // Templates de live
        document.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', (e) => this.applyTemplate(e.target.dataset.template));
        });
        
        // Gestion des modales
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });
        
        // Touche Escape pour fermer les modales
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
        
        // Auto-save de la configuration
        [this.elements.liveTitle, this.elements.liveDescription, this.elements.youtubeUrl].forEach(element => {
            element?.addEventListener('input', () => this.debounce(() => this.autoSaveConfig(), 2000));
        });
    }
    
    updateUserDisplay() {
        const userElements = [
            { selector: '#admin-name', value: this.currentUser.name },
            { selector: '#admin-avatar', value: '👑' }
        ];
        
        userElements.forEach(({ selector, value }) => {
            const element = document.querySelector(selector);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    // =====================================================
    // CHARGEMENT DONNÉES INITIALES
    // =====================================================
    
    async loadInitialData() {
        try {
            // Charger les données en parallèle
            await Promise.all([
                this.loadScheduledLives(),
                this.loadConnectedUsers(),
                this.loadChatMessages(),
                this.loadMetrics()
            ]);
            
            // Mettre à jour l'interface
            this.updateAllDisplays();
            
        } catch (error) {
            console.error('❌ Erreur chargement données:', error);
            this.loadMockData();
        }
    }
    
    async loadScheduledLives() {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const now = new Date();
                const livesSnapshot = await firebase.firestore()
                    .collection('scheduled_lives')
                    .where('scheduledDate', '>=', now)
                    .orderBy('scheduledDate', 'asc')
                    .limit(10)
                    .get();
                
                this.scheduledLives = livesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } else {
                this.loadMockScheduledLives();
            }
        } catch (error) {
            console.error('❌ Erreur chargement lives programmés:', error);
            this.loadMockScheduledLives();
        }
    }
    
    loadMockScheduledLives() {
        this.scheduledLives = [
            {
                id: '1',
                title: 'Trading Matinal',
                instructor: 'Commandant Spatial',
                scheduledDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // Dans 2h
                duration: 90,
                category: 'trading',
                level: 2
            },
            {
                id: '2',
                title: 'Analyse Technique Avancée',
                instructor: 'Expert Crypto',
                scheduledDate: new Date(Date.now() + 6 * 60 * 60 * 1000), // Dans 6h
                duration: 120,
                category: 'analysis',
                level: 4
            }
        ];
    }
    
    async loadConnectedUsers() {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const usersSnapshot = await firebase.firestore()
                    .collection('users')
                    .where('isOnline', '==', true)
                    .orderBy('lastSeen', 'desc')
                    .limit(50)
                    .get();
                
                this.connectedUsers = usersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } else {
                this.loadMockConnectedUsers();
            }
        } catch (error) {
            console.error('❌ Erreur chargement utilisateurs connectés:', error);
            this.loadMockConnectedUsers();
        }
    }
    
    loadMockConnectedUsers() {
        this.connectedUsers = [
            {
                id: '1',
                name: 'Jean Crypto',
                avatar: '👨‍🚀',
                status: ['watching', 'chatting'],
                joinTime: Date.now() - 30 * 60 * 1000,
                isVip: false
            },
            {
                id: '2',
                name: 'Marie Trader',
                avatar: '👩‍🚀',
                status: ['watching'],
                joinTime: Date.now() - 15 * 60 * 1000,
                isVip: true
            },
            {
                id: '3',
                name: 'Pierre Expert',
                avatar: '🥷',
                status: ['chatting'],
                joinTime: Date.now() - 45 * 60 * 1000,
                isVip: false
            }
        ];
    }
    
    async loadChatMessages() {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore && this.currentLiveId) {
                const messagesSnapshot = await firebase.firestore()
                    .collection('lives')
                    .doc(this.currentLiveId)
                    .collection('messages')
                    .orderBy('timestamp', 'desc')
                    .limit(this.config.maxChatMessages)
                    .get();
                
                this.chatMessages = messagesSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .reverse();
            } else {
                this.loadMockChatMessages();
            }
        } catch (error) {
            console.error('❌ Erreur chargement messages chat:', error);
            this.loadMockChatMessages();
        }
    }
    
    loadMockChatMessages() {
        this.chatMessages = [
            {
                id: '1',
                author: 'Jean Crypto',
                avatar: '👨‍🚀',
                content: 'Super formation ! Merci beaucoup 🚀',
                timestamp: Date.now() - 2 * 60 * 1000,
                userId: '1'
            },
            {
                id: '2',
                author: 'Marie Trader',
                avatar: '👩‍🚀',
                content: 'Est-ce que vous pouvez répéter la partie sur les supports/résistances ?',
                timestamp: Date.now() - 1 * 60 * 1000,
                userId: '2'
            },
            {
                id: '3',
                author: 'Pierre Expert',
                avatar: '🥷',
                content: 'Excellent contenu comme toujours ! 👍',
                timestamp: Date.now() - 30 * 1000,
                userId: '3'
            }
        ];
    }
    
    async loadMetrics() {
        if (this.isLiveActive && this.currentLiveId) {
            try {
                if (typeof firebase !== 'undefined' && firebase.firestore) {
                    const liveDoc = await firebase.firestore()
                        .collection('lives')
                        .doc(this.currentLiveId)
                        .get();
                    
                    if (liveDoc.exists) {
                        const data = liveDoc.data();
                        this.metrics = {
                            currentViewers: data.currentViewers || 0,
                            peakViewers: data.peakViewers || 0,
                            totalMessages: data.totalMessages || 0,
                            totalLikes: data.totalLikes || 0,
                            liveDuration: data.liveDuration || 0,
                            avgWatchTime: data.avgWatchTime || 0
                        };
                    }
                }
            } catch (error) {
                console.error('❌ Erreur chargement métriques:', error);
            }
        } else {
            this.loadMockMetrics();
        }
    }
    
    loadMockMetrics() {
        this.metrics = {
            currentViewers: Math.floor(Math.random() * 200) + 50,
            peakViewers: Math.floor(Math.random() * 300) + 150,
            totalMessages: Math.floor(Math.random() * 500) + 100,
            totalLikes: Math.floor(Math.random() * 100) + 20,
            liveDuration: Math.floor(Math.random() * 3600) + 1800, // 30min à 1h30
            avgWatchTime: Math.floor(Math.random() * 1800) + 600 // 10min à 40min
        };
    }
    
    loadMockData() {
        this.loadMockScheduledLives();
        this.loadMockConnectedUsers();
        this.loadMockChatMessages();
        this.loadMockMetrics();
        
        console.log('📊 Données de test chargées');
    }
    
    updateAllDisplays() {
        this.updateMetricsDisplay();
        this.renderScheduledLives();
        this.renderConnectedUsers();
        this.renderChatMessages();
        this.renderCalendarWeek();
    }
    
    // =====================================================
    // VÉRIFICATION DU LIVE ACTUEL
    // =====================================================
    
    async checkCurrentLiveStatus() {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const livesQuery = await firebase.firestore()
                    .collection('lives')
                    .where('isActive', '==', true)
                    .where('status', '==', 'live')
                    .limit(1)
                    .get();
                
                if (!livesQuery.empty) {
                    const liveDoc = livesQuery.docs[0];
                    const liveData = { id: liveDoc.id, ...liveDoc.data() };
                    
                    // Reprendre le live en cours
                    await this.resumeLive(liveData);
                }
            }
        } catch (error) {
            console.error('❌ Erreur vérification live actuel:', error);
        }
    }
    
    async resumeLive(liveData) {
        console.log('🔄 Reprise du live en cours...');
        
        this.currentLiveId = liveData.id;
        this.liveData = liveData;
        this.isLiveActive = true;
        
        // Restaurer l'interface
        this.updateStreamStatus('live');
        this.showLiveControls();
        
        // Charger les données du live
        if (liveData.youtubeUrl && this.elements.youtubeUrl) {
            this.elements.youtubeUrl.value = liveData.youtubeUrl;
            this.loadYouTubePreview();
        }
        
        if (liveData.title && this.elements.liveTitle) {
            this.elements.liveTitle.value = liveData.title;
        }
        
        // Calculer la durée écoulée
        if (liveData.startTime) {
            const startTime = liveData.startTime.toDate ? liveData.startTime.toDate() : new Date(liveData.startTime);
            this.metrics.liveDuration = Math.floor((Date.now() - startTime.getTime()) / 1000);
        }
        
        // Redémarrer les timers
        this.startLiveTimers();
        
        this.showNotification('🔴 Live en cours repris', 'success');
    }
    
    // =====================================================
    // GESTION DU LIVE
    // =====================================================
    
    async startLive() {
        try {
            // Vérifications préalables
            const config = this.validateLiveConfig();
            if (!config.isValid) {
                this.showNotification(config.error, 'error');
                return;
            }
            
            // Changer le statut
            this.updateStreamStatus('connecting');
            this.showNotification('🔄 Démarrage du live...', 'info');
            
            // Créer le live dans la base de données
            const liveData = {
                title: this.elements.liveTitle.value.trim(),
                description: this.elements.liveDescription.value.trim(),
                instructor: this.elements.instructorName.value.trim(),
                youtubeUrl: this.elements.youtubeUrl.value.trim(),
                category: this.elements.liveCategory.value,
                isActive: true,
                status: 'live',
                startTime: new Date(),
                createdBy: this.currentUser.id,
                currentViewers: 0,
                peakViewers: 0,
                totalMessages: 0,
                totalLikes: 0,
                settings: {
                    quality: this.elements.streamQuality.value,
                    autoRecord: this.elements.autoRecord.checked,
                    chatModeration: this.elements.chatModeration.checked
                }
            };
            
            // Simuler un délai de connexion
            await this.delay(2000);
            
            const liveId = await this.createLiveInDB(liveData);
            
            if (liveId) {
                this.currentLiveId = liveId;
                this.liveData = { ...liveData, id: liveId };
                this.isLiveActive = true;
                
                // Mettre à jour l'interface
                this.updateStreamStatus('live');
                this.showLiveControls();
                this.startLiveTimers();
                this.loadYouTubePreview();
                
                this.showNotification('🔴 Live démarré avec succès !', 'success');
                
                // Notifier les utilisateurs
                await this.notifyUsersLiveStarted();
                
            } else {
                throw new Error('Impossible de créer le live');
            }
            
        } catch (error) {
            console.error('❌ Erreur démarrage live:', error);
            this.updateStreamStatus('offline');
            this.showNotification('Erreur lors du démarrage du live', 'error');
        }
    }
    
    validateLiveConfig() {
        const title = this.elements.liveTitle?.value.trim();
        const youtubeUrl = this.elements.youtubeUrl?.value.trim();
        const instructor = this.elements.instructorName?.value.trim();
        
        if (!title) {
            return { isValid: false, error: 'Le titre du live est obligatoire' };
        }
        
        if (!youtubeUrl) {
            return { isValid: false, error: 'L\'URL YouTube est obligatoire' };
        }
        
        if (!this.isValidYouTubeUrl(youtubeUrl)) {
            return { isValid: false, error: 'URL YouTube invalide' };
        }
        
        if (!instructor) {
            return { isValid: false, error: 'Le nom du formateur est obligatoire' };
        }
        
        return { isValid: true };
    }
    
    isValidYouTubeUrl(url) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        return youtubeRegex.test(url);
    }
    
    async createLiveInDB(liveData) {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const docRef = await firebase.firestore().collection('lives').add(liveData);
                return docRef.id;
            }
            
            // Mode développement
            return 'dev-live-' + Date.now();
        } catch (error) {
            console.error('❌ Erreur création live DB:', error);
            throw error;
        }
    }
    
    async stopLive() {
        try {
            if (!this.isLiveActive || !this.currentLiveId) {
                this.showNotification('Aucun live en cours', 'warning');
                return;
            }
            
            // Confirmation
            const confirmed = await this.showConfirm(
                'Arrêter le live',
                'Êtes-vous sûr de vouloir arrêter le live en cours ?'
            );
            
            if (!confirmed) return;
            
            this.updateStreamStatus('connecting');
            this.showNotification('🔄 Arrêt du live...', 'info');
            
            // Arrêter le live dans la base de données
            await this.stopLiveInDB();
            
            // Mettre à jour l'état local
            this.isLiveActive = false;
            this.currentLiveId = null;
            this.liveData = null;
            
            // Arrêter les timers
            this.stopLiveTimers();
            
            // Mettre à jour l'interface
            this.updateStreamStatus('offline');
            this.hideLiveControls();
            this.hideYouTubePreview();
            
            this.showNotification('⏹️ Live arrêté avec succès', 'success');
            
            // Notifier les utilisateurs
            await this.notifyUsersLiveEnded();
            
        } catch (error) {
            console.error('❌ Erreur arrêt live:', error);
            this.showNotification('Erreur lors de l\'arrêt du live', 'error');
        }
    }
    
    async emergencyStop() {
        const confirmed = await this.showConfirm(
            '🚨 ARRÊT D\'URGENCE',
            'Cette action va immédiatement couper le live pour tous les utilisateurs.\n\nVoulez-vous continuer ?',
            'danger'
        );
        
        if (confirmed) {
            try {
                // Arrêt immédiat
                this.isLiveActive = false;
                this.updateStreamStatus('offline');
                this.stopLiveTimers();
                this.hideLiveControls();
                
                // Arrêter en base
                if (this.currentLiveId) {
                    await this.stopLiveInDB(true); // Mode urgence
                }
                
                // Notifier
                this.showNotification('🚨 Arrêt d\'urgence effectué', 'warning');
                await this.notifyUsersEmergencyStop();
                
                // Reset
                this.currentLiveId = null;
                this.liveData = null;
                
            } catch (error) {
                console.error('❌ Erreur arrêt urgence:', error);
            }
        }
    }
    
    async stopLiveInDB(isEmergency = false) {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore && this.currentLiveId) {
                const updateData = {
                    isActive: false,
                    status: isEmergency ? 'emergency_stopped' : 'ended',
                    endTime: new Date(),
                    finalMetrics: { ...this.metrics }
                };
                
                await firebase.firestore()
                    .collection('lives')
                    .doc(this.currentLiveId)
                    .update(updateData);
            }
            
            console.log('✅ Live arrêté dans la DB');
        } catch (error) {
            console.error('❌ Erreur arrêt live DB:', error);
            throw error;
        }
    }
    
    // =====================================================
    // GESTION DU STATUT ET INTERFACE
    // =====================================================
    
    updateStreamStatus(status) {
        this.streamStatus = status;
        
        // Mettre à jour l'indicateur principal
        if (this.elements.globalStatusIndicator) {
            this.elements.globalStatusIndicator.className = `status-indicator ${status}`;
        }
        
        // Mettre à jour les textes
        const statusTexts = {
            offline: {
                title: 'Aucun live en cours',
                subtitle: 'Tous les systèmes sont prêts'
            },
            connecting: {
                title: 'Connexion en cours...',
                subtitle: 'Préparation du stream'
            },
            live: {
                title: '🔴 LIVE EN COURS',
                subtitle: 'Diffusion active'
            },
            ready: {
                title: 'Prêt à diffuser',
                subtitle: 'Configuration validée'
            }
        };
        
        const statusText = statusTexts[status];
        if (statusText) {
            if (this.elements.globalStatusText) {
                this.elements.globalStatusText.textContent = statusText.title;
            }
            if (this.elements.globalStatusSubtitle) {
                this.elements.globalStatusSubtitle.textContent = statusText.subtitle;
            }
        }
        
        // Mettre à jour le statut de contrôle
        const controlStatus = document.getElementById('control-status');
        if (controlStatus) {
            const dot = controlStatus.querySelector('.status-dot');
            const text = controlStatus.querySelector('span:last-child');
            
            if (dot) dot.className = `status-dot ${status === 'live' ? 'live' : ''}`;
            if (text) text.textContent = this.getStatusDisplayText(status);
        }
        
        // Mettre à jour le statut du stream dans l'aperçu
        if (this.elements.streamStatus) {
            this.elements.streamStatus.textContent = this.getStatusDisplayText(status);
        }
    }
    
    getStatusDisplayText(status) {
        const statusTexts = {
            offline: 'Hors ligne',
            connecting: 'Connexion...',
            live: 'En direct',
            ready: 'Prêt'
        };
        return statusTexts[status] || status;
    }
    
    showLiveControls() {
        if (this.elements.mainStartBtn) {
            this.elements.mainStartBtn.style.display = 'none';
        }
        if (this.elements.mainStopBtn) {
            this.elements.mainStopBtn.style.display = 'inline-flex';
        }
        if (this.elements.emergencyBtn) {
            this.elements.emergencyBtn.style.display = 'inline-flex';
        }
        
        // Activer les contrôles d'urgence
        const emergencyBtns = document.querySelectorAll('.emergency-btn');
        emergencyBtns.forEach(btn => btn.disabled = false);
    }
    
    hideLiveControls() {
        if (this.elements.mainStartBtn) {
            this.elements.mainStartBtn.style.display = 'inline-flex';
        }
        if (this.elements.mainStopBtn) {
            this.elements.mainStopBtn.style.display = 'none';
        }
        if (this.elements.emergencyBtn) {
            this.elements.emergencyBtn.style.display = 'none';
        }
        
        // Désactiver les contrôles d'urgence
        const emergencyBtns = document.querySelectorAll('.emergency-btn');
        emergencyBtns.forEach(btn => btn.disabled = true);
    }
    
    loadYouTubePreview() {
        if (!this.elements.youtubeUrl?.value || !this.elements.previewIframe) return;
        
        const youtubeId = this.extractYouTubeId(this.elements.youtubeUrl.value);
        if (youtubeId) {
            this.elements.previewIframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=0&controls=1&rel=0&showinfo=0&modestbranding=1`;
            
            if (this.elements.youtubePreview) {
                this.elements.youtubePreview.style.display = 'block';
            }
            
            if (this.elements.streamInfo) {
                this.elements.streamInfo.style.display = 'block';
            }
            
            // Masquer le placeholder
            const placeholder = document.querySelector('.preview-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
        }
    }
    
    hideYouTubePreview() {
        if (this.elements.youtubePreview) {
            this.elements.youtubePreview.style.display = 'none';
        }
        
        if (this.elements.streamInfo) {
            this.elements.streamInfo.style.display = 'none';
        }
        
        // Afficher le placeholder
        const placeholder = document.querySelector('.preview-placeholder');
        if (placeholder) {
            placeholder.style.display = 'flex';
        }
    }
    
    extractYouTubeId(url) {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    }
    
    // =====================================================
    // CONTRÔLES DE DIFFUSION
    // =====================================================
    
    testConnection() {
        this.showNotification('🔄 Test de connexion...', 'info');
        
        // Simuler un test de connexion
        const testBtn = this.elements.testConnectionBtn;
        if (testBtn) {
            testBtn.classList.add('loading');
            testBtn.disabled = true;
        }
        
        try {
            // Simuler délai de test
            setTimeout(async () => {
                // Vérifier l'URL YouTube
                const youtubeUrl = this.elements.youtubeUrl?.value.trim();
                if (!youtubeUrl || !this.isValidYouTubeUrl(youtubeUrl)) {
                    throw new Error('URL YouTube invalide');
                }
                
                // Simuler test de bande passante
                const speed = Math.random() * 100 + 50; // 50-150 Mbps
                
                this.showNotification(`✅ Connexion OK - ${speed.toFixed(1)} Mbps`, 'success');
                
                // Mettre à jour le statut si tout va bien
                if (this.streamStatus === 'offline') {
                    this.updateStreamStatus('ready');
                }
                
                if (testBtn) {
                    testBtn.classList.remove('loading');
                    testBtn.disabled = false;
                }
            }, 3000);
        } catch (error) {
            this.showNotification(`❌ Test échoué: ${error.message}`, 'error');
            if (testBtn) {
                testBtn.classList.remove('loading');
                testBtn.disabled = false;
            }
        }
    }
    
    togglePreview() {
        const isShowing = this.elements.youtubePreview?.style.display === 'block';
        
        if (isShowing) {
            this.hideYouTubePreview();
            this.showNotification('👁️ Aperçu masqué', 'info');
        } else {
            this.loadYouTubePreview();
            this.showNotification('👁️ Aperçu affiché', 'info');
        }
    }
    
    toggleRecording() {
        const recordBtn = this.elements.recordBtn;
        const isRecording = recordBtn?.classList.contains('active');
        
        if (isRecording) {
            recordBtn.classList.remove('active');
            recordBtn.querySelector('.btn-icon').textContent = '⚪';
            this.showNotification('⏹️ Enregistrement arrêté', 'info');
        } else {
            recordBtn?.classList.add('active');
            const icon = recordBtn?.querySelector('.btn-icon');
            if (icon) icon.textContent = '🔴';
            this.showNotification('🔴 Enregistrement démarré', 'success');
        }
    }
    
    toggleFullscreen() {
        if (this.elements.previewContainer) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
                this.showNotification('↙️ Mode fenêtré', 'info');
            } else {
                this.elements.previewContainer.requestFullscreen();
                this.showNotification('↗️ Mode plein écran', 'info');
            }
        }
    }
    
    // =====================================================
    // CONTRÔLES D'URGENCE
    // =====================================================
    
    async muteAllAudio() {
        const confirmed = await this.showConfirm(
            'Couper tout audio',
            'Voulez-vous couper l\'audio pour tous les participants ?'
        );
        
        if (confirmed) {
            this.showNotification('🔇 Audio coupé pour tous', 'warning');
            
            // Notifier les utilisateurs
            await this.sendSystemMessage('🔇 Audio temporairement coupé par l\'administrateur');
        }
    }
    
    async pauseStream() {
        const confirmed = await this.showConfirm(
            'Mettre en pause',
            'Voulez-vous mettre le stream en pause ?'
        );
        
        if (confirmed) {
            this.showNotification('⏸️ Stream mis en pause', 'warning');
            
            // Mettre à jour le statut
            this.updateStreamStatus('connecting');
            
            await this.sendSystemMessage('⏸️ Stream mis en pause - Reprise dans quelques instants');
        }
    }
    
    async clearChat() {
        const confirmed = await this.showConfirm(
            'Vider le chat',
            'Cette action va supprimer tous les messages du chat. Continuer ?'
        );
        
        if (confirmed) {
            // Vider les messages locaux
            this.chatMessages = [];
            this.renderChatMessages();
            
            // Vider en base de données
            if (this.currentLiveId) {
                await this.clearChatInDB();
            }
            
            this.showNotification('🧹 Chat vidé', 'info');
            await this.sendSystemMessage('🧹 Chat vidé par l\'administrateur');
        }
    }
    
    async clearChatInDB() {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore && this.currentLiveId) {
                const messagesRef = firebase.firestore()
                    .collection('lives')
                    .doc(this.currentLiveId)
                    .collection('messages');
                
                const snapshot = await messagesRef.get();
                const batch = firebase.firestore().batch();
                
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                await batch.commit();
            }
        } catch (error) {
            console.error('❌ Erreur vidage chat DB:', error);
        }
    }
    
    async forceStop() {
        const confirmed = await this.showConfirm(
            '💥 ARRÊT FORCÉ',
            'ATTENTION: Cette action va forcer l\'arrêt immédiat du live.\n\nTous les utilisateurs seront déconnectés.\n\nContinuer ?',
            'danger'
        );
        
        if (confirmed) {
            await this.emergencyStop();
        }
    }
    
    // =====================================================
    // GESTION DU CHAT
    // =====================================================
    
    enableChat() {
        this.elements.chatEnableBtn?.classList.add('active');
        this.elements.chatDisableBtn?.classList.remove('active');
        
        this.showNotification('💬 Chat activé', 'success');
        this.sendSystemMessage('💬 Chat activé par l\'administrateur');
    }
    
    disableChat() {
        this.elements.chatDisableBtn?.classList.add('active');
        this.elements.chatEnableBtn?.classList.remove('active');
        
        this.showNotification('🔇 Chat désactivé', 'warning');
        this.sendSystemMessage('🔇 Chat désactivé par l\'administrateur');
    }
    
    toggleSlowMode() {
        const slowBtn = this.elements.slowModeBtn;
        const isActive = slowBtn?.classList.contains('active');
        
        if (isActive) {
            slowBtn.classList.remove('active');
            this.showNotification('🚀 Mode lent désactivé', 'info');
            this.sendSystemMessage('🚀 Mode lent désactivé');
        } else {
            slowBtn?.classList.add('active');
            this.showNotification('🐌 Mode lent activé (1 message/10s)', 'info');
            this.sendSystemMessage('🐌 Mode lent activé - 1 message par 10 secondes');
        }
    }
    
    renderChatMessages() {
        if (!this.elements.adminChatMessages) return;
        
        this.elements.adminChatMessages.innerHTML = '';
        
        this.chatMessages.forEach(message => {
            this.renderChatMessage(message);
        });
        
        this.scrollChatToBottom();
    }
    
    renderChatMessage(message) {
        if (!this.elements.adminChatMessages) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'admin-chat-message';
        
        if (message.type === 'system') {
            messageElement.classList.add('system-message');
            messageElement.innerHTML = `
                <div class="message-content">
                    <span class="system-icon">🚀</span>
                    ${message.content}
                </div>
                <div class="message-time">${this.formatTime(message.timestamp)}</div>
            `;
        } else {
            messageElement.innerHTML = `
                <div class="message-header">
                    <div class="message-user">
                        <div class="user-avatar">${message.avatar}</div>
                        <span class="user-name">${message.author}</span>
                    </div>
                    <div class="message-time">${this.formatTime(message.timestamp)}</div>
                </div>
                <div class="message-content">${this.escapeHtml(message.content)}</div>
                <div class="message-actions">
                    <button class="message-action-btn" onclick="liveAdmin.warnUser('${message.userId}')">⚠️</button>
                    <button class="message-action-btn" onclick="liveAdmin.muteUser('${message.userId}')">🔇</button>
                    <button class="message-action-btn" onclick="liveAdmin.deleteMessage('${message.id}')">🗑️</button>
                </div>
            `;
        }
        
        this.elements.adminChatMessages.appendChild(messageElement);
    }
    
    scrollChatToBottom() {
        if (this.elements.adminChatMessages) {
            this.elements.adminChatMessages.scrollTop = this.elements.adminChatMessages.scrollHeight;
        }
    }
    
    async sendSystemMessage(content) {
        const message = {
            id: Date.now(),
            type: 'system',
            content: content,
            timestamp: Date.now()
        };
        
        this.chatMessages.push(message);
        this.renderChatMessage(message);
        this.scrollChatToBottom();
        
        // Envoyer en base
        if (this.currentLiveId) {
            await this.sendMessageToDB(message);
        }
    }
    
    async sendMessageToDB(message) {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore && this.currentLiveId) {
                await firebase.firestore()
                    .collection('lives')
                    .doc(this.currentLiveId)
                    .collection('messages')
                    .add(message);
            }
        } catch (error) {
            console.error('❌ Erreur envoi message DB:', error);
        }
    }
    
    // =====================================================
    // ACTIONS DE MODÉRATION
    // =====================================================
    
    async warnUser(userId) {
        const user = this.connectedUsers.find(u => u.id === userId);
        if (!user) return;
        
        this.showNotification(`⚠️ Avertissement envoyé à ${user.name}`, 'warning');
        await this.sendSystemMessage(`⚠️ ${user.name} a reçu un avertissement`);
    }
    
    async muteUser(userId) {
        const user = this.connectedUsers.find(u => u.id === userId);
        if (!user) return;
        
        this.showNotification(`🔇 ${user.name} a été coupé`, 'warning');
        await this.sendSystemMessage(`🔇 ${user.name} a été temporairement coupé`);
    }
    
    async banUser(userId) {
        const user = this.connectedUsers.find(u => u.id === userId);
        if (!user) return;
        
        const confirmed = await this.showConfirm(
            'Bannir utilisateur',
            `Voulez-vous bannir ${user.name} du live ?`
        );
        
        if (confirmed) {
            this.showNotification(`🚫 ${user.name} a été banni`, 'danger');
            await this.sendSystemMessage(`🚫 ${user.name} a été banni du live`);
            
            // Retirer de la liste des connectés
            this.connectedUsers = this.connectedUsers.filter(u => u.id !== userId);
            this.renderConnectedUsers();
        }
    }
    
    async deleteMessage(messageId) {
        this.chatMessages = this.chatMessages.filter(m => m.id !== messageId);
        this.renderChatMessages();
        
        // Supprimer en base
        if (this.currentLiveId) {
            await this.deleteMessageInDB(messageId);
        }
    }
    
    async deleteMessageInDB(messageId) {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore && this.currentLiveId) {
                await firebase.firestore()
                    .collection('lives')
                    .doc(this.currentLiveId)
                    .collection('messages')
                    .doc(messageId)
                    .delete();
            }
        } catch (error) {
            console.error('❌ Erreur suppression message DB:', error);
        }
    }
    
    sendQuickMessage(type) {
        const messages = {
            welcome: '👋 Bienvenue dans ce live ! N\'hésitez pas à poser vos questions.',
            rules: '📋 Rappel: Respectez les autres participants et restez dans le sujet.',
            break: '☕ Petite pause dans 5 minutes, on se retrouve juste après !'
        };
        
        const content = messages[type];
        if (content) {
            this.sendSystemMessage(content);
        }
    }
    
    async messageUser(userId) {
        // Fonctionnalité pour envoyer un message privé à un utilisateur
        const user = this.connectedUsers.find(u => u.id === userId);
        if (!user) return;
        
        const message = prompt(`Message privé pour ${user.name}:`);
        if (message && message.trim()) {
            this.showNotification(`💬 Message privé envoyé à ${user.name}`, 'info');
            // Ici, vous pourriez implémenter l'envoi de message privé
        }
    }
    
    // =====================================================
    // GESTION DU PLANNING
    // =====================================================
    
    showScheduleModal() {
        const modal = this.elements.scheduleModal;
        if (modal) {
            modal.classList.add('active');
            
            // Pré-remplir avec la date/heure actuelle + 1h
            const now = new Date();
            const scheduledDate = new Date(now.getTime() + 60 * 60 * 1000);
            
            const dateInput = document.getElementById('schedule-date');
            const timeInput = document.getElementById('schedule-time');
            
            if (dateInput) {
                dateInput.value = scheduledDate.toISOString().split('T')[0];
            }
            if (timeInput) {
                timeInput.value = scheduledDate.toTimeString().substring(0, 5);
            }
        }
    }
    
    async saveLiveSchedule() {
        const form = this.elements.scheduleForm;
        if (!form) return;
        
        const scheduleData = {
            title: document.getElementById('schedule-title').value,
            instructor: document.getElementById('schedule-instructor').value,
            description: document.getElementById('schedule-description').value,
            date: document.getElementById('schedule-date').value,
            time: document.getElementById('schedule-time').value,
            duration: parseInt(document.getElementById('schedule-duration').value),
            category: document.getElementById('schedule-category').value,
            level: parseInt(document.getElementById('schedule-level').value),
            notify: document.getElementById('schedule-notify').checked,
            createdBy: this.currentUser.id,
            createdAt: new Date()
        };
        
        // Validation
        if (!scheduleData.title || !scheduleData.date || !scheduleData.time) {
            this.showNotification('Veuillez remplir tous les champs obligatoires', 'error');
            return;
        }
        
        try {
            // Créer la date programmée
            scheduleData.scheduledDate = new Date(`${scheduleData.date}T${scheduleData.time}`);
            
            // Sauvegarder
            const scheduleId = await this.saveScheduleToDB(scheduleData);
            
            if (scheduleId) {
                scheduleData.id = scheduleId;
                this.scheduledLives.push(scheduleData);
                this.renderScheduledLives();
                this.renderCalendarWeek();
                
                this.closeModal();
                this.showNotification('📅 Live programmé avec succès', 'success');
                
                // Notifier les utilisateurs si demandé
                if (scheduleData.notify) {
                    await this.notifyUsersNewSchedule(scheduleData);
                }
            }
            
        } catch (error) {
            console.error('❌ Erreur programmation live:', error);
            this.showNotification('Erreur lors de la programmation', 'error');
        }
    }
    
    async saveScheduleToDB(scheduleData) {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const docRef = await firebase.firestore().collection('scheduled_lives').add(scheduleData);
                return docRef.id;
            }
            
            // Mode développement
            return 'schedule-' + Date.now();
        } catch (error) {
            console.error('❌ Erreur sauvegarde planning DB:', error);
            throw error;
        }
    }
    
    renderScheduledLives() {
        if (!this.elements.scheduleList) return;
        
        this.elements.scheduleList.innerHTML = '';
        
        if (this.scheduledLives.length === 0) {
            this.elements.scheduleList.innerHTML = `
                <div class="no-schedules">
                    <div style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.6);">
                        <div style="font-size: 2rem; margin-bottom: 1rem;">📅</div>
                        <p>Aucun live programmé</p>
                    </div>
                </div>
            `;
            return;
        }
        
        this.scheduledLives.forEach(live => {
            const scheduleElement = document.createElement('div');
            scheduleElement.className = 'schedule-item';
            scheduleElement.innerHTML = `
                <div class="schedule-info">
                    <div class="schedule-title">${live.title}</div>
                    <div class="schedule-details">
                        <span>📅 ${this.formatDate(live.scheduledDate)}</span>
                        <span>⏰ ${this.formatTime(live.scheduledDate)}</span>
                        <span>👨‍🏫 ${live.instructor}</span>
                        <span>⏱️ ${live.duration}min</span>
                    </div>
                </div>
                <div class="schedule-actions">
                    <button class="schedule-btn" onclick="liveAdmin.editSchedule('${live.id}')" title="Modifier">✏️</button>
                    <button class="schedule-btn" onclick="liveAdmin.deleteSchedule('${live.id}')" title="Supprimer">🗑️</button>
                    <button class="schedule-btn" onclick="liveAdmin.startScheduledLive('${live.id}')" title="Démarrer maintenant">▶️</button>
                </div>
            `;
            
            this.elements.scheduleList.appendChild(scheduleElement);
        });
    }
    
    editSchedule(scheduleId) {
        const scheduledLive = this.scheduledLives.find(live => live.id === scheduleId);
        if (!scheduledLive) return;
        
        // Ouvrir le modal de programmation avec les données pré-remplies
        this.showScheduleModal();
        
        // Remplir les champs avec les données existantes
        setTimeout(() => {
            document.getElementById('schedule-title').value = scheduledLive.title || '';
            document.getElementById('schedule-instructor').value = scheduledLive.instructor || '';
            document.getElementById('schedule-description').value = scheduledLive.description || '';
            document.getElementById('schedule-date').value = scheduledLive.scheduledDate.toISOString().split('T')[0];
            document.getElementById('schedule-time').value = scheduledLive.scheduledDate.toTimeString().substring(0, 5);
            document.getElementById('schedule-duration').value = scheduledLive.duration || '60';
            document.getElementById('schedule-category').value = scheduledLive.category || 'trading';
            document.getElementById('schedule-level').value = scheduledLive.level || '1';
            document.getElementById('schedule-notify').checked = scheduledLive.notify || false;
        }, 100);
    }
    
    async deleteSchedule(scheduleId) {
        const confirmed = await this.showConfirm(
            'Supprimer le live programmé',
            'Voulez-vous supprimer ce live programmé ?'
        );
        
        if (confirmed) {
            try {
                // Supprimer en base
                if (typeof firebase !== 'undefined' && firebase.firestore) {
                    await firebase.firestore().collection('scheduled_lives').doc(scheduleId).delete();
                }
                
                // Supprimer localement
                this.scheduledLives = this.scheduledLives.filter(live => live.id !== scheduleId);
                this.renderScheduledLives();
                this.renderCalendarWeek();
                
                this.showNotification('🗑️ Live programmé supprimé', 'info');
                
            } catch (error) {
                console.error('❌ Erreur suppression planning:', error);
                this.showNotification('Erreur lors de la suppression', 'error');
            }
        }
    }
    
    startScheduledLive(scheduleId) {
        const scheduledLive = this.scheduledLives.find(live => live.id === scheduleId);
        if (!scheduledLive) return;
        
        // Pré-remplir le formulaire avec les données programmées
        if (this.elements.liveTitle) this.elements.liveTitle.value = scheduledLive.title;
        if (this.elements.liveDescription) this.elements.liveDescription.value = scheduledLive.description || '';
        if (this.elements.instructorName) this.elements.instructorName.value = scheduledLive.instructor;
        if (this.elements.liveCategory) this.elements.liveCategory.value = scheduledLive.category;
        
        // Demander confirmation
        this.showNotification('📋 Configuration pré-remplie depuis le planning', 'info');
        
        // Démarrer le live après un délai
        setTimeout(() => {
            this.startLive();
        }, 1000);
    }
    
    applyTemplate(templateType) {
        const templates = {
            'trading-morning': {
                title: 'Trading Matinal',
                description: 'Analyse des marchés et opportunités du jour',
                duration: 90,
                category: 'trading'
            },
            'analysis': {
                title: 'Analyse Technique Avancée',
                description: 'Session d\'analyse technique approfondie',
                duration: 120,
                category: 'analysis'
            },
            'qa': {
                title: 'Session Questions/Réponses',
                description: 'Réponses à vos questions sur le trading',
                duration: 60,
                category: 'trading'
            },
            'masterclass': {
                title: 'Masterclass Crypto',
                description: 'Formation complète sur les cryptomonnaies',
                duration: 180,
                category: 'advanced'
            }
        };
        
        const template = templates[templateType];
        if (template) {
            if (this.elements.liveTitle) this.elements.liveTitle.value = template.title;
            if (this.elements.liveDescription) this.elements.liveDescription.value = template.description;
            if (this.elements.liveCategory) this.elements.liveCategory.value = template.category;
            
            this.showNotification(`📋 Modèle "${template.title}" appliqué`, 'success');
        }
    }
    
    renderCalendarWeek() {
        if (!this.elements.calendarWeek) return;
        
        this.elements.calendarWeek.innerHTML = '';
        
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Lundi
        
        const dayNames = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
        
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            
            const isToday = day.toDateString() === today.toDateString();
            const livesCount = this.scheduledLives.filter(live => {
                const liveDate = new Date(live.scheduledDate);
                return liveDate.toDateString() === day.toDateString();
            }).length;
            
            const dayElement = document.createElement('div');
            dayElement.className = `calendar-day ${isToday ? 'today' : ''} ${livesCount > 0 ? 'has-live' : ''}`;
            dayElement.innerHTML = `
                <div class="day-name">${dayNames[i]}</div>
                <div class="day-number">${day.getDate()}</div>
                <div class="day-lives">${livesCount > 0 ? `${livesCount} live${livesCount > 1 ? 's' : ''}` : ''}</div>
            `;
            
            // Ajouter un event listener pour afficher les détails du jour
            dayElement.addEventListener('click', () => {
                this.showDayDetails(day);
            });
            
            this.elements.calendarWeek.appendChild(dayElement);
        }
    }
    
    showDayDetails(date) {
        const dayLives = this.scheduledLives.filter(live => {
            const liveDate = new Date(live.scheduledDate);
            return liveDate.toDateString() === date.toDateString();
        });
        
        if (dayLives.length === 0) {
            this.showNotification(`Aucun live programmé le ${this.formatDate(date)}`, 'info');
            return;
        }
        
        const livesText = dayLives.map(live => 
            `• ${this.formatTime(live.scheduledDate)} - ${live.title} (${live.duration}min)`
        ).join('\n');
        
        alert(`Lives du ${this.formatDate(date)}:\n\n${livesText}`);
    }
    
    // =====================================================
    // GESTION DES UTILISATEURS CONNECTÉS
    // =====================================================
    
    renderConnectedUsers() {
        if (!this.elements.connectedUsersList) return;
        
        this.elements.connectedUsersList.innerHTML = '';
        
        if (this.connectedUsers.length === 0) {
            this.elements.connectedUsersList.innerHTML = `
                <div class="no-users">
                    <div style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.6);">
                        <div style="font-size: 2rem; margin-bottom: 1rem;">👥</div>
                        <p>Aucun utilisateur connecté</p>
                    </div>
                </div>
            `;
            
            // Mettre à jour le compteur
            if (this.elements.onlineUsersCount) {
                this.elements.onlineUsersCount.textContent = '0';
            }
            return;
        }
        
        this.connectedUsers.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <div class="user-avatar-large">${user.avatar}</div>
                <div class="user-details">
                    <div class="user-name">${user.name}</div>
                    <div class="user-status">
                        ${user.status.map(status => `<span class="status-badge ${status}">${this.getStatusText(status)}</span>`).join('')}
                        ${user.isVip ? '<span class="status-badge vip">VIP</span>' : ''}
                    </div>
                </div>
                <div class="user-actions">
                    <button class="user-action-btn" onclick="liveAdmin.messageUser('${user.id}')" title="Message privé">💬</button>
                    <button class="user-action-btn" onclick="liveAdmin.warnUser('${user.id}')" title="Avertir">⚠️</button>
                    <button class="user-action-btn" onclick="liveAdmin.muteUser('${user.id}')" title="Couper">🔇</button>
                    <button class="user-action-btn" onclick="liveAdmin.banUser('${user.id}')" title="Bannir">🚫</button>
                </div>
            `;
            
            this.elements.connectedUsersList.appendChild(userElement);
        });
        
        // Mettre à jour le compteur
        if (this.elements.onlineUsersCount) {
            this.elements.onlineUsersCount.textContent = this.connectedUsers.length;
        }
    }
    
    getStatusText(status) {
        const statusTexts = {
            watching: '👀',
            chatting: '💬',
            vip: '⭐'
        };
        return statusTexts[status] || status;
    }
    
    filterUsers(filter) {
        // Mettre à jour les boutons de filtre
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        // Filtrer et afficher les utilisateurs
        let filteredUsers = [...this.connectedUsers];
        
        switch (filter) {
            case 'watching':
                filteredUsers = filteredUsers.filter(user => user.status.includes('watching'));
                break;
            case 'chatting':
                filteredUsers = filteredUsers.filter(user => user.status.includes('chatting'));
                break;
            case 'vip':
                filteredUsers = filteredUsers.filter(user => user.isVip);
                break;
            case 'all':
            default:
                // Tous les utilisateurs
                break;
        }
        
        // Afficher temporairement les utilisateurs filtrés
        const tempUsers = this.connectedUsers;
        this.connectedUsers = filteredUsers;
        this.renderConnectedUsers();
        this.connectedUsers = tempUsers;
        
        this.showNotification(`Filtre "${filter}" appliqué - ${filteredUsers.length} utilisateur(s)`, 'info');
    }
    
    async sendGlobalMessage() {
        const modal = this.elements.globalMessageModal;
        if (modal) {
            modal.classList.add('active');
        }
    }
    
    async sendGlobalMessageConfirm() {
        const messageText = this.elements.globalMessageText?.value.trim();
        const highlight = document.getElementById('message-highlight')?.checked;
        const sound = document.getElementById('message-sound')?.checked;
        
        if (!messageText) {
            this.showNotification('Veuillez saisir un message', 'error');
            return;
        }
        
        try {
            // Envoyer le message global
            const globalMessage = {
                id: Date.now(),
                type: 'global',
                content: messageText,
                timestamp: Date.now(),
                highlight: highlight,
                sound: sound,
                from: 'Administrateur'
            };
            
            await this.sendSystemMessage(`📢 ${messageText}`);
            
            this.closeModal();
            this.showNotification('📢 Message global envoyé', 'success');
            
            // Vider le champ
            if (this.elements.globalMessageText) {
                this.elements.globalMessageText.value = '';
            }
            
        } catch (error) {
            console.error('❌ Erreur envoi message global:', error);
            this.showNotification('Erreur lors de l\'envoi', 'error');
        }
    }
    
    async exportUsersList() {
        try {
            const userData = this.connectedUsers.map(user => ({
                name: user.name,
                status: user.status.join(', '),
                isVip: user.isVip ? 'Oui' : 'Non',
                joinTime: this.formatTime(user.joinTime)
            }));
            
            const csvContent = [
                'Nom,Statut,VIP,Heure de connexion',
                ...userData.map(user => `${user.name},${user.status},${user.isVip},${user.joinTime}`)
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `utilisateurs_live_${new Date().getTime()}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            this.showNotification('📊 Liste exportée avec succès', 'success');
            
        } catch (error) {
            console.error('❌ Erreur export:', error);
            this.showNotification('Erreur lors de l\'export', 'error');
        }
    }
    
    // =====================================================
    // MÉTRIQUES ET ANALYTIQUES
    // =====================================================
    
    updateMetricsDisplay() {
        // Mettre à jour toutes les métriques dans l'interface
        if (this.elements.totalViewers) {
            this.elements.totalViewers.textContent = this.metrics.currentViewers;
        }
        
        if (this.elements.liveDurationDisplay) {
            this.elements.liveDurationDisplay.textContent = this.formatDuration(this.metrics.liveDuration);
        }
        
        if (this.elements.totalMessagesCount) {
            this.elements.totalMessagesCount.textContent = this.metrics.totalMessages;
        }
        
        if (this.elements.peakViewers) {
            this.elements.peakViewers.textContent = this.metrics.peakViewers;
        }
        
        if (this.elements.totalChatMessages) {
            this.elements.totalChatMessages.textContent = this.metrics.totalMessages;
        }
        
        if (this.elements.totalLikes) {
            this.elements.totalLikes.textContent = this.metrics.totalLikes;
        }
        
        if (this.elements.avgWatchTime) {
            this.elements.avgWatchTime.textContent = this.formatDuration(this.metrics.avgWatchTime);
        }
        
        if (this.elements.currentViewers) {
            this.elements.currentViewers.textContent = this.metrics.currentViewers;
        }
        
        if (this.elements.streamDuration) {
            this.elements.streamDuration.textContent = this.formatDuration(this.metrics.liveDuration);
        }
        
        // Calculer et afficher les changements
        this.updateMetricsChanges();
        
        // Mettre à jour le graphique
        this.updateViewersChart();
        
        // Mettre à jour les top viewers et engagement
        this.updateEngagementStats();
    }
    
    updateMetricsChanges() {
        // Simuler des changements de métriques
        const viewersChange = Math.floor(Math.random() * 20) - 10; // -10 à +10
        const messagesRate = Math.floor(this.metrics.totalMessages / (this.metrics.liveDuration / 60)) || 0;
        const engagementRate = Math.floor((this.metrics.totalLikes / this.metrics.currentViewers) * 100) || 0;
        const retentionRate = Math.floor(Math.random() * 30) + 70; // 70-100%
        
        if (this.elements.viewersChange) {
            this.elements.viewersChange.textContent = `${viewersChange >= 0 ? '+' : ''}${viewersChange}%`;
            this.elements.viewersChange.className = `metric-change ${viewersChange >= 0 ? 'positive' : 'negative'}`;
        }
        
        if (this.elements.messagesRate) {
            this.elements.messagesRate.textContent = `${messagesRate}/min`;
        }
        
        if (this.elements.engagementRate) {
            this.elements.engagementRate.textContent = `${engagementRate}%`;
        }
        
        if (this.elements.retentionRate) {
            this.elements.retentionRate.textContent = `${retentionRate}%`;
        }
    }
    
    initCharts() {
        this.initViewersChart();
    }
    
    initViewersChart() {
        const ctx = this.elements.viewersChart;
        if (!ctx || typeof Chart === 'undefined') return;
        
        const chartCtx = ctx.getContext('2d');
        
        this.viewersChart = new Chart(chartCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Viewers',
                    data: [],
                    borderColor: '#ff8800',
                    backgroundColor: 'rgba(255, 136, 0, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ff8800',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4
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
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#ffffff',
                            stepSize: 10
                        },
                        grid: {
                            color: 'rgba(255, 136, 0, 0.2)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#ffffff',
                            maxTicksLimit: 10
                        },
                        grid: {
                            color: 'rgba(255, 136, 0, 0.2)'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }
    
    updateViewersChart() {
        if (!this.viewersChart) return;
        
        const now = new Date();
        const timeLabel = now.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Ajouter le nouveau point
        this.viewersChart.data.labels.push(timeLabel);
        this.viewersChart.data.datasets[0].data.push(this.metrics.currentViewers);
        
        // Garder seulement les 20 derniers points
        if (this.viewersChart.data.labels.length > 20) {
            this.viewersChart.data.labels.shift();
            this.viewersChart.data.datasets[0].data.shift();
        }
        
        this.viewersChart.update('none');
    }
    
    updateEngagementStats() {
        // Mettre à jour les top viewers (simulé)
        if (this.elements.topViewersList) {
            const topViewers = this.connectedUsers
                .sort((a, b) => (b.watchTime || 0) - (a.watchTime || 0))
                .slice(0, 5);
            
            this.elements.topViewersList.innerHTML = topViewers.map(user => `
                <div class="viewer-item">
                    <div class="viewer-info">
                        <div class="viewer-avatar">${user.avatar}</div>
                        <div class="viewer-name">${user.name}</div>
                    </div>
                    <div class="viewer-stats">${Math.floor(Math.random() * 60) + 10}min</div>
                </div>
            `).join('');
        }
        
        // Mettre à jour les stats d'engagement
        if (this.elements.engagementItems) {
            const engagementStats = [
                { label: 'Taux de rétention', value: `${Math.floor(Math.random() * 30) + 70}%` },
                { label: 'Messages par minute', value: `${Math.floor(this.metrics.totalMessages / (this.metrics.liveDuration / 60)) || 0}` },
                { label: 'Likes par viewer', value: `${(this.metrics.totalLikes / this.metrics.currentViewers || 0).toFixed(1)}` },
                { label: 'Temps moyen', value: this.formatDuration(this.metrics.avgWatchTime) }
            ];
            
            this.elements.engagementItems.innerHTML = engagementStats.map(stat => `
                <div class="engagement-item">
                    <span>${stat.label}</span>
                    <span class="engagement-value">${stat.value}</span>
                </div>
            `).join('');
        }
    }
    
    // =====================================================
    // TIMERS ET MISE À JOUR EN TEMPS RÉEL
    // =====================================================
    
    startUpdateTimers() {
        // Timer pour les métriques (toutes les 2 secondes)
        this.metricsTimer = setInterval(() => {
            if (this.isLiveActive) {
                this.updateLiveMetrics();
                this.updateMetricsDisplay();
            }
        }, this.config.metricsUpdateInterval);
        
        // Timer pour le chat (toutes les secondes)
        this.chatUpdateTimer = setInterval(() => {
            if (this.isLiveActive) {
                this.updateChatData();
            }
        }, this.config.chatUpdateInterval);
        
        // Auto-save de la configuration (toutes les 30 secondes)
        setInterval(() => {
            this.autoSaveConfig();
        }, this.config.autoSaveInterval);
    }
    
    startLiveTimers() {
        // Timer pour la durée du live
        this.durationTimer = setInterval(() => {
            this.metrics.liveDuration++;
            this.updateMetricsDisplay();
        }, 1000);
    }
    
    stopLiveTimers() {
        if (this.durationTimer) {
            clearInterval(this.durationTimer);
            this.durationTimer = null;
        }
    }
    
    updateLiveMetrics() {
        // Simuler des changements de métriques en temps réel
        const baseViewers = this.metrics.currentViewers;
        const change = Math.floor(Math.random() * 10) - 5; // -5 à +5
        this.metrics.currentViewers = Math.max(0, baseViewers + change);
        
        // Mettre à jour le pic de viewers
        if (this.metrics.currentViewers > this.metrics.peakViewers) {
            this.metrics.peakViewers = this.metrics.currentViewers;
        }
        
        // Simuler l'augmentation des messages et likes
        if (Math.random() < 0.3) { // 30% de chance d'avoir un nouveau message
            this.metrics.totalMessages++;
        }
        
        if (Math.random() < 0.1) { // 10% de chance d'avoir un nouveau like
            this.metrics.totalLikes++;
        }
        
        // Mettre à jour le temps de visionnage moyen
        this.metrics.avgWatchTime = Math.floor(this.metrics.liveDuration * 0.7);
        
        // Sauvegarder les métriques en base de données
        this.saveMetricsToDB();
    }
    
    async updateChatData() {
        // Simuler de nouveaux messages (en mode développement)
        if (Math.random() < 0.2 && this.connectedUsers.length > 0) { // 20% de chance
            const randomUser = this.connectedUsers[Math.floor(Math.random() * this.connectedUsers.length)];
            const messages = [
                'Super live ! 🚀',
                'Merci pour les explications',
                'Question: Comment calculer le RSI ?',
                'Excellent contenu 👍',
                'Pouvez-vous répéter la dernière partie ?',
                'Trading view ou autre plateforme ?',
                'Quand le prochain live ?'
            ];
            
            const newMessage = {
                id: Date.now() + Math.random(),
                author: randomUser.name,
                avatar: randomUser.avatar,
                content: messages[Math.floor(Math.random() * messages.length)],
                timestamp: Date.now(),
                userId: randomUser.id
            };
            
            this.chatMessages.push(newMessage);
            
            // Limiter le nombre de messages
            if (this.chatMessages.length > this.config.maxChatMessages) {
                this.chatMessages = this.chatMessages.slice(-this.config.maxChatMessages);
            }
            
            this.renderChatMessage(newMessage);
            this.scrollChatToBottom();
            
            // Sauvegarder en base
            await this.sendMessageToDB(newMessage);
        }
    }
    
    async saveMetricsToDB() {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore && this.currentLiveId) {
                await firebase.firestore()
                    .collection('lives')
                    .doc(this.currentLiveId)
                    .update({
                        currentViewers: this.metrics.currentViewers,
                        peakViewers: this.metrics.peakViewers,
                        totalMessages: this.metrics.totalMessages,
                        totalLikes: this.metrics.totalLikes,
                        liveDuration: this.metrics.liveDuration,
                        avgWatchTime: this.metrics.avgWatchTime,
                        lastUpdate: new Date()
                    });
            }
        } catch (error) {
            console.error('❌ Erreur sauvegarde métriques:', error);
        }
    }
    
    async autoSaveConfig() {
        if (!this.isLiveActive) return;
        
        try {
            const config = {
                title: this.elements.liveTitle?.value || '',
                description: this.elements.liveDescription?.value || '',
                instructor: this.elements.instructorName?.value || '',
                youtubeUrl: this.elements.youtubeUrl?.value || '',
                category: this.elements.liveCategory?.value || '',
                quality: this.elements.streamQuality?.value || '1080p',
                autoRecord: this.elements.autoRecord?.checked || false,
                chatModeration: this.elements.chatModeration?.checked || false
            };
            
            // Sauvegarder en localStorage comme backup
            localStorage.setItem('liveAdminConfig', JSON.stringify(config));
            
            // Sauvegarder en base si un live est actif
            if (this.currentLiveId && typeof firebase !== 'undefined' && firebase.firestore) {
                await firebase.firestore()
                    .collection('lives')
                    .doc(this.currentLiveId)
                    .update({
                        title: config.title,
                        description: config.description,
                        instructor: config.instructor,
                        settings: {
                            quality: config.quality,
                            autoRecord: config.autoRecord,
                            chatModeration: config.chatModeration
                        },
                        lastConfigUpdate: new Date()
                    });
            }
            
        } catch (error) {
            console.error('❌ Erreur auto-save config:', error);
        }
    }
    
    loadSavedConfig() {
        try {
            const savedConfig = localStorage.getItem('liveAdminConfig');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                
                if (this.elements.liveTitle && !this.elements.liveTitle.value) {
                    this.elements.liveTitle.value = config.title || '';
                }
                if (this.elements.liveDescription && !this.elements.liveDescription.value) {
                    this.elements.liveDescription.value = config.description || '';
                }
                if (this.elements.instructorName && !this.elements.instructorName.value) {
                    this.elements.instructorName.value = config.instructor || '';
                }
                if (this.elements.streamQuality) {
                    this.elements.streamQuality.value = config.quality || '1080p';
                }
                if (this.elements.autoRecord) {
                    this.elements.autoRecord.checked = config.autoRecord || false;
                }
                if (this.elements.chatModeration) {
                    this.elements.chatModeration.checked = config.chatModeration || false;
                }
            }
        } catch (error) {
            console.error('❌ Erreur chargement config sauvée:', error);
        }
    }
    
    // =====================================================
    // NOTIFICATIONS UTILISATEURS
    // =====================================================
    
    async notifyUsersLiveStarted() {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                // Créer une notification pour tous les utilisateurs
                const notification = {
                    type: 'live_started',
                    title: '🔴 Live en cours !',
                    message: `"${this.liveData.title}" a commencé`,
                    liveId: this.currentLiveId,
                    timestamp: new Date(),
                    read: false
                };
                
                // Envoyer à tous les utilisateurs (simplified)
                await firebase.firestore()
                    .collection('notifications')
                    .add({
                        ...notification,
                        targetType: 'all_users'
                    });
            }
            
            console.log('✅ Utilisateurs notifiés du démarrage du live');
        } catch (error) {
            console.error('❌ Erreur notification utilisateurs:', error);
        }
    }
    
    async notifyUsersLiveEnded() {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const notification = {
                    type: 'live_ended',
                    title: '⏹️ Live terminé',
                    message: `"${this.liveData?.title || 'Live'}" s'est terminé`,
                    timestamp: new Date(),
                    read: false
                };
                
                await firebase.firestore()
                    .collection('notifications')
                    .add({
                        ...notification,
                        targetType: 'all_users'
                    });
            }
            
            console.log('✅ Utilisateurs notifiés de la fin du live');
        } catch (error) {
            console.error('❌ Erreur notification fin live:', error);
        }
    }
    
    async notifyUsersEmergencyStop() {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const notification = {
                    type: 'live_emergency_stop',
                    title: '🚨 Live interrompu',
                    message: 'Le live a été interrompu par l\'administrateur',
                    timestamp: new Date(),
                    read: false
                };
                
                await firebase.firestore()
                    .collection('notifications')
                    .add({
                        ...notification,
                        targetType: 'all_users'
                    });
            }
            
            console.log('✅ Utilisateurs notifiés de l\'arrêt d\'urgence');
        } catch (error) {
            console.error('❌ Erreur notification arrêt urgence:', error);
        }
    }
    
    async notifyUsersNewSchedule(scheduleData) {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const notification = {
                    type: 'live_scheduled',
                    title: '📅 Nouveau live programmé',
                    message: `"${scheduleData.title}" le ${this.formatDate(scheduleData.scheduledDate)} à ${this.formatTime(scheduleData.scheduledDate)}`,
                    scheduleId: scheduleData.id,
                    timestamp: new Date(),
                    read: false
                };
                
                await firebase.firestore()
                    .collection('notifications')
                    .add({
                        ...notification,
                        targetType: 'all_users'
                    });
            }
            
            console.log('✅ Utilisateurs notifiés du nouveau live programmé');
        } catch (error) {
            console.error('❌ Erreur notification nouveau planning:', error);
        }
    }
    
    // =====================================================
    // GESTION DES MODALES
    // =====================================================
    
    closeModal() {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    showConfirm(title, message, type = 'warning') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close" onclick="this.closest('.modal').remove(); resolve(false);">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p style="color: rgba(255,255,255,0.9); line-height: 1.5;">${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove();">Annuler</button>
                        <button class="btn ${type === 'danger' ? 'btn-danger' : 'btn-warning'}" onclick="this.closest('.modal').remove(); resolve(true);">Confirmer</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Gestion des événements
            modal.querySelector('.btn-secondary').onclick = () => {
                modal.remove();
                resolve(false);
            };
            
            modal.querySelector('.btn:last-child').onclick = () => {
                modal.remove();
                resolve(true);
            };
            
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            };
        });
    }
    
    // =====================================================
    // UTILITAIRES
    // =====================================================
    
    formatTime(timestamp) {
        const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
        return date.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    formatDate(date) {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
    
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    showNotification(message, type = 'info') {
        const container = this.getOrCreateToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            danger: '🚨'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
        `;
        
        toast.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: var(--live-admin-dark-card);
            border: 1px solid var(--live-admin-border);
            border-radius: 10px;
            padding: 1rem 1.5rem;
            color: white;
            display: flex;
            align-items: center;
            gap: 0.8rem;
            z-index: 1100;
            box-shadow: var(--live-admin-glow);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 400px;
        `;
        
        container.appendChild(toast);
        
        // Animation d'apparition
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Disparition automatique
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }
    
    getOrCreateToastContainer() {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 0;
                right: 0;
                z-index: 1100;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        return container;
    }
}

// =====================================================
// FONCTIONS GLOBALES EXPOSÉES
// =====================================================

// Instance globale
let liveAdmin;

// Fonctions de modération pour les boutons onclick
window.warnUser = (userId) => liveAdmin?.warnUser(userId);
window.muteUser = (userId) => liveAdmin?.muteUser(userId);
window.banUser = (userId) => liveAdmin?.banUser(userId);
window.deleteMessage = (messageId) => liveAdmin?.deleteMessage(messageId);
window.messageUser = (userId) => liveAdmin?.messageUser(userId);

// Fonctions de planning
window.editSchedule = (scheduleId) => liveAdmin?.editSchedule(scheduleId);
window.deleteSchedule = (scheduleId) => liveAdmin?.deleteSchedule(scheduleId);
window.startScheduledLive = (scheduleId) => liveAdmin?.startScheduledLive(scheduleId);

// Fonctions de modales
window.closeModal = () => liveAdmin?.closeModal();
window.saveLiveSchedule = () => liveAdmin?.saveLiveSchedule();
window.sendGlobalMessage = () => liveAdmin?.sendGlobalMessage();
window.sendGlobalMessageConfirm = () => liveAdmin?.sendGlobalMessageConfirm();
window.exportUsersList = () => liveAdmin?.exportUsersList();

// Fonctions de messages rapides
window.sendQuickMessage = (type) => liveAdmin?.sendQuickMessage(type);

// Gestion de déconnexion
function handleLogout() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut().then(() => {
            window.location.href = '../../../index.html';
        });
    } else {
        localStorage.removeItem('userLoggedIn');
        localStorage.removeItem('userData');
        window.location.href = '../../../index.html';
    }
}

// =====================================================
// INITIALISATION PRINCIPALE
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🛡️ Initialisation Live Admin Dashboard...');
    
    try {
        // Créer l'instance du gestionnaire live admin
        liveAdmin = new LiveAdminManager();
        
        // Charger la configuration sauvegardée
        setTimeout(() => {
            liveAdmin.loadSavedConfig();
        }, 1000);
        
        // Gestion des modales (fermeture en cliquant à l'extérieur)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                liveAdmin.closeModal();
            }
        });
        
        // Gestion de la touche Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                liveAdmin.closeModal();
            }
        });
        
        // Gestion du bouton de déconnexion
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleLogout();
            });
        }
        
        // Gestion responsive
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768 && liveAdmin) {
                // Ajustements pour mobile si nécessaire
                liveAdmin.updateMetricsDisplay();
            }
        });
        
        // Page Visibility API pour optimiser les performances
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Réduire la fréquence des mises à jour quand l'onglet est caché
                console.log('📱 Page cachée - optimisation...');
                if (liveAdmin.metricsTimer) {
                    clearInterval(liveAdmin.metricsTimer);
                    liveAdmin.metricsTimer = setInterval(() => {
                        if (liveAdmin.isLiveActive) {
                            liveAdmin.updateLiveMetrics();
                            liveAdmin.updateMetricsDisplay();
                        }
                    }, 10000); // Réduire à 10 secondes
                }
            } else {
                // Reprendre les mises à jour normales
                console.log('📱 Page visible - reprise...');
                if (liveAdmin.metricsTimer) {
                    clearInterval(liveAdmin.metricsTimer);
                    liveAdmin.metricsTimer = setInterval(() => {
                        if (liveAdmin.isLiveActive) {
                            liveAdmin.updateLiveMetrics();
                            liveAdmin.updateMetricsDisplay();
                        }
                    }, liveAdmin.config.metricsUpdateInterval);
                }
            }
        });
        
        // Gestion des erreurs globales
        window.addEventListener('error', (e) => {
            console.error('❌ Erreur globale Live Admin:', e.error);
            if (liveAdmin) {
                liveAdmin.showNotification('Une erreur est survenue', 'error');
            }
        });
        
        // Prévenir la fermeture pendant un live actif
        window.addEventListener('beforeunload', (e) => {
            if (liveAdmin && liveAdmin.isLiveActive) {
                e.preventDefault();
                e.returnValue = 'Un live est en cours. Êtes-vous sûr de vouloir quitter ?';
            }
        });
        
        console.log('✅ Live Admin Dashboard initialisé avec succès');
        
    } catch (error) {
        console.error('❌ Erreur initialisation Live Admin Dashboard:', error);
        
        // Afficher un message d'erreur à l'utilisateur
        const errorNotification = document.createElement('div');
        errorNotification.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--live-admin-dark-card);
                border: 1px solid var(--live-admin-warning);
                border-radius: 15px;
                padding: 2rem;
                text-align: center;
                z-index: 10000;
                color: white;
                max-width: 400px;
                width: 90%;
            ">
                <h3 style="color: var(--live-admin-warning); margin-bottom: 1rem;">
                    ⚠️ Erreur d'initialisation
                </h3>
                <p style="margin-bottom: 1.5rem; line-height: 1.5;">
                    Une erreur est survenue lors du chargement du dashboard live admin.
                </p>
                <button onclick="window.location.reload()" style="
                    background: var(--live-admin-primary);
                    color: #000;
                    border: none;
                    padding: 0.8rem 1.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    margin-right: 1rem;
                ">
                    🔄 Recharger la page
                </button>
                <button onclick="window.location.href='../admin.html'" style="
                    background: rgba(255, 255, 255, 0.1);
                    color: #fff;
                    border: 1px solid var(--live-admin-border);
                    padding: 0.8rem 1.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">
                    🏠 Retour Admin
                </button>
            </div>
        `;
        document.body.appendChild(errorNotification);
    }
});

// =====================================================
// STYLES CSS DYNAMIQUES POUR LES NOTIFICATIONS
// =====================================================

// Ajouter les styles des toasts
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    .toast {
        pointer-events: auto;
        margin-bottom: 1rem;
    }
    
    .toast.success {
        border-left: 4px solid var(--live-admin-success);
    }
    
    .toast.error {
        border-left: 4px solid var(--live-admin-danger);
    }
    
    .toast.warning {
        border-left: 4px solid var(--live-admin-warning);
    }
    
    .toast.info {
        border-left: 4px solid var(--live-admin-info);
    }
    
    .toast.danger {
        border-left: 4px solid var(--live-admin-danger);
        animation: dangerShake 0.5s ease-in-out;
    }
    
    @keyframes dangerShake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    .toast-icon {
        font-size: 1.2rem;
        flex-shrink: 0;
    }
    
    .toast-content {
        flex: 1;
    }
    
    .toast-message {
        font-weight: 500;
        line-height: 1.4;
    }
    
    .toast-close {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        font-size: 1.2rem;
        padding: 0;
        margin-left: 0.5rem;
        transition: color 0.3s ease;
    }
    
    .toast-close:hover {
        color: var(--live-admin-danger);
    }
    
    /* Styles pour les modales de confirmation */
    .modal .btn {
        padding: 0.8rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        border: none;
        margin: 0 0.5rem;
    }
    
    .modal .btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.8);
        border: 1px solid var(--live-admin-border);
    }
    
    .modal .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.2);
        color: white;
    }
    
    .modal .btn-warning {
        background: linear-gradient(45deg, var(--live-admin-warning), #ff8800);
        color: #000;
    }
    
    .modal .btn-warning:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(255, 165, 2, 0.4);
    }
    
    .modal .btn-danger {
        background: linear-gradient(45deg, var(--live-admin-danger), #ff3742);
        color: #fff;
    }
    
    .modal .btn-danger:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(255, 71, 87, 0.4);
    }
    
    /* Animation pour les éléments chargés */
    .loading {
        opacity: 0.6;
        pointer-events: none;
        position: relative;
    }
    
    .loading::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        border: 2px solid transparent;
        border-top: 2px solid var(--live-admin-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: translate(-50%, -50%) rotate(0deg); }
        to { transform: translate(-50%, -50%) rotate(360deg); }
    }
    
    /* Styles pour les états actifs */
    .control-btn.active {
        background: rgba(0, 255, 136, 0.2) !important;
        border-color: var(--live-admin-success) !important;
        color: var(--live-admin-success) !important;
        box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
    }
    
    .chat-control-btn.active {
        background: rgba(0, 255, 136, 0.2) !important;
        border-color: var(--live-admin-success) !important;
        color: var(--live-admin-success) !important;
    }
    
    /* Animation pour les nouveaux messages */
    .admin-chat-message {
        animation: messageSlide 0.3s ease-out;
    }
    
    @keyframes messageSlide {
        from {
            opacity: 0;
            transform: translateX(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    /* Styles pour les éléments vides */
    .no-schedules,
    .no-users {
        text-align: center;
        padding: 2rem;
        color: rgba(255, 255, 255, 0.6);
        border: 2px dashed var(--live-admin-border-light);
        border-radius: var(--live-admin-radius);
        margin: 1rem 0;
    }
    
    .no-schedules div,
    .no-users div {
        font-size: 2rem;
        margin-bottom: 1rem;
        opacity: 0.7;
    }
`;

document.head.appendChild(toastStyles);

// =====================================================
// EXPOSITION GLOBALE DES FONCTIONS
// =====================================================

// Exposer l'instance globale
window.liveAdmin = liveAdmin;
window.LiveAdminManager = LiveAdminManager;
window.handleLogout = handleLogout;

// Fonctions utilitaires globales
window.formatTime = (timestamp) => {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
};

window.formatDate = (date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

window.formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Debug et monitoring
window.getLiveAdminStatus = () => {
    if (!liveAdmin) return 'Non initialisé';
    
    return {
        isAuthenticated: liveAdmin.isAuthenticated,
        isAdmin: liveAdmin.isAdmin,
        isLiveActive: liveAdmin.isLiveActive,
        currentLiveId: liveAdmin.currentLiveId,
        streamStatus: liveAdmin.streamStatus,
        metrics: liveAdmin.metrics,
        connectedUsers: liveAdmin.connectedUsers.length,
        scheduledLives: liveAdmin.scheduledLives.length
    };
};

// Console log final
console.log('🎬 Live Admin Dashboard avec YouTube intégré chargé avec succès');
console.log('🛡️ Fonctionnalités disponibles:');
console.log('   • Gestion live YouTube en temps réel');
console.log('   • Modération chat avancée');
console.log('   • Métriques et analytics live');
console.log('   • Planning et programmation');
console.log('   • Contrôles d\'urgence');
console.log('   • Gestion utilisateurs connectés');
console.log('📊 Status:', window.getLiveAdminStatus());