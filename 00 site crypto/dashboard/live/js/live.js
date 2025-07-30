// =====================================================
// LIVE PAGE - LOGIQUE REDESIGNÉE AVEC YOUTUBE
// =====================================================

class YouTubeLiveManager {
    constructor() {
        // État général
        this.isLive = false;
        this.isAuthenticated = false;
        this.hasAccess = false;
        this.isAdmin = false;
        this.chatEnabled = true;
        
        // Données live
        this.currentLiveId = null;
        this.liveData = null;
        this.viewers = 0;
        this.onlineUsers = 0;
        this.liveDuration = 0;
        this.maxViewers = 0;
        this.totalMessages = 0;
        
        // YouTube Player
        this.player = null;
        this.playerReady = false;
        
        // Chat
        this.chatMessages = [];
        this.maxMessages = 100;
        
        // Timers
        this.durationTimer = null;
        this.viewersUpdateTimer = null;
        this.accessCheckTimer = null;
        
        // Utilisateur actuel
        this.currentUser = null;
        
        // Configuration URLs
        this.config = {
            youtubeApiKey: 'YOUR_YOUTUBE_API_KEY', // À configurer
            streamKey: null,
            liveUrl: null
        };
        
        this.init();
    }
    
    // =====================================================
    // INITIALISATION
    // =====================================================
    
    async init() {
        console.log('🚀 Initialisation YouTube Live Manager');
        
        // Vérifier l'authentification
        await this.checkAuthentication();
        
        // Initialiser les éléments DOM
        this.initDOMElements();
        
        // Vérifier l'accès
        await this.checkAccess();
        
        // Bind events
        this.bindEvents();
        
        // Charger l'API YouTube
        this.loadYouTubeAPI();
        
        // Vérifier s'il y a un live en cours
        await this.checkCurrentLive();
        
        // Initialiser l'agenda
        this.initAgenda();
        
        // Démarrer les timers de mise à jour
        this.startUpdateTimers();
        
        console.log('✅ YouTube Live Manager initialisé');
    }
    
    initDOMElements() {
        // Éléments de contrôle
        this.elements = {
            // Accès et sécurité
            accessGate: document.getElementById('access-gate'),
            verificationStatus: document.getElementById('verification-status'),
            
            // Vidéo
            videoPlaceholder: document.getElementById('video-placeholder'),
            youtubeContainer: document.getElementById('youtube-container'),
            youtubeIframe: document.getElementById('youtube-iframe'),
            
            // Bannière live
            liveBanner: document.getElementById('live-banner'),
            currentLiveTitle: document.getElementById('current-live-title'),
            liveViewersCount: document.getElementById('live-viewers-count'),
            
            // Informations live
            videoTitle: document.getElementById('video-title'),
            viewersCount: document.getElementById('viewers-count'),
            liveDuration: document.getElementById('live-duration'),
            
            // Contrôles admin
            instructorPanel: document.getElementById('instructor-panel'),
            startLiveBtn: document.getElementById('start-live-btn'),
            stopLiveBtn: document.getElementById('stop-live-btn'),
            toggleChatBtn: document.getElementById('toggle-chat-btn'),
            emergencyStopBtn: document.getElementById('emergency-stop-btn'),
            
            // Stats admin
            adminDuration: document.getElementById('admin-duration'),
            maxViewersEl: document.getElementById('max-viewers'),
            totalMessagesEl: document.getElementById('total-messages'),
            
            // Actions utilisateur
            likeBtn: document.getElementById('like-btn'),
            shareBtn: document.getElementById('share-btn'),
            bookmarkBtn: document.getElementById('bookmark-btn'),
            likeCount: document.getElementById('like-count'),
            
            // Informations sidebar
            liveTitle: document.getElementById('live-title'),
            instructorName: document.getElementById('instructor-name'),
            liveDescription: document.getElementById('live-description'),
            
            // Chat
            chatMessages: document.getElementById('chat-messages'),
            chatInput: document.getElementById('chat-input'),
            chatForm: document.getElementById('chat-form'),
            sendBtn: document.getElementById('send-btn'),
            chatStatus: document.getElementById('chat-status'),
            onlineCount: document.getElementById('online-count'),
            charCount: document.getElementById('char-count'),
            emojiBtn: document.getElementById('emoji-btn'),
            
            // Modal
            accessModal: document.getElementById('access-modal')
        };
    }
    
    bindEvents() {
        // Contrôles admin
        this.elements.startLiveBtn?.addEventListener('click', () => this.startLive());
        this.elements.stopLiveBtn?.addEventListener('click', () => this.stopLive());
        this.elements.toggleChatBtn?.addEventListener('click', () => this.toggleChat());
        this.elements.emergencyStopBtn?.addEventListener('click', () => this.emergencyStop());
        
        // Actions utilisateur
        this.elements.likeBtn?.addEventListener('click', () => this.toggleLike());
        this.elements.shareBtn?.addEventListener('click', () => this.shareLive());
        this.elements.bookmarkBtn?.addEventListener('click', () => this.bookmarkLive());
        
        // Chat
        this.elements.chatForm?.addEventListener('submit', (e) => this.sendMessage(e));
        this.elements.chatInput?.addEventListener('input', (e) => this.updateCharCount(e));
        this.elements.emojiBtn?.addEventListener('click', () => this.showEmojiPicker());
        
        // Gestion des erreurs de réseau
        window.addEventListener('online', () => this.handleConnectionRestore());
        window.addEventListener('offline', () => this.handleConnectionLoss());
        
        // Prévenir la fermeture pendant un live admin
        window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));
    }
    
    // =====================================================
    // AUTHENTIFICATION ET ACCÈS
    // =====================================================
    
    async checkAuthentication() {
        try {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                return new Promise((resolve) => {
                    firebase.auth().onAuthStateChanged(async (user) => {
                        if (user) {
                            this.currentUser = {
                                id: user.uid,
                                email: user.email,
                                name: user.displayName || user.email?.split('@')[0] || 'Astronaute'
                            };
                            
                            // Vérifier le rôle admin
                            this.isAdmin = await this.checkAdminRole(user.uid);
                            this.isAuthenticated = true;
                            
                            this.updateUserDisplay();
                            resolve(true);
                        } else {
                            window.location.href = '../../index.html';
                            resolve(false);
                        }
                    });
                });
            } else {
                // Mode développement
                this.currentUser = {
                    id: 'dev-user',
                    email: 'dev@test.com',
                    name: 'Développeur'
                };
                this.isAuthenticated = true;
                this.isAdmin = Math.random() < 0.3; // 30% chance d'être admin en dev
                this.updateUserDisplay();
                return true;
            }
        } catch (error) {
            console.error('❌ Erreur authentification:', error);
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
    
    async checkAccess() {
        if (!this.isAuthenticated) {
            this.showAccessDenied();
            return false;
        }
        
        // Simulation de vérification d'accès
        this.showAccessVerification();
        
        try {
            // Vérifier l'abonnement utilisateur
            const hasSubscription = await this.checkUserSubscription();
            
            if (hasSubscription || this.isAdmin) {
                this.hasAccess = true;
                this.showAccessGranted();
                return true;
            } else {
                this.showAccessDenied();
                return false;
            }
        } catch (error) {
            console.error('❌ Erreur vérification accès:', error);
            this.showAccessDenied();
            return false;
        }
    }
    
    async checkUserSubscription() {
        // Simuler une vérification d'abonnement
        await this.delay(2000);
        
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const userDoc = await firebase.firestore()
                    .collection('users')
                    .doc(this.currentUser.id)
                    .get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    return userData.subscription === 'premium' || userData.hasLiveAccess === true;
                }
            }
            
            // Mode dev : 70% ont accès
            return Math.random() < 0.7;
        } catch (error) {
            console.error('❌ Erreur vérification abonnement:', error);
            return false;
        }
    }
    
    showAccessVerification() {
        const statusItems = this.elements.verificationStatus?.querySelectorAll('.status-item');
        
        if (statusItems) {
            let delay = 0;
            statusItems.forEach((item, index) => {
                setTimeout(() => {
                    const icon = item.querySelector('.status-icon');
                    icon.textContent = '✅';
                    icon.classList.remove('loading');
                    item.style.opacity = '1';
                }, delay);
                delay += 800;
            });
        }
    }
    
    showAccessGranted() {
        setTimeout(() => {
            if (this.elements.accessGate) {
                this.elements.accessGate.style.opacity = '0';
                setTimeout(() => {
                    this.elements.accessGate.style.display = 'none';
                }, 500);
            }
        }, 3000);
    }
    
    showAccessDenied() {
        setTimeout(() => {
            if (this.elements.accessGate) {
                this.elements.accessGate.style.display = 'none';
            }
            this.showUpgradeModal();
        }, 3000);
    }
    
    showUpgradeModal() {
        if (this.elements.accessModal) {
            this.elements.accessModal.classList.add('active');
        }
    }
    
    updateUserDisplay() {
        const userElements = [
            { selector: '#user-name', value: this.currentUser.name },
            { selector: '#sidebar-user-name', value: this.currentUser.name },
            { selector: '#user-avatar', value: this.getAvatarForUser() },
            { selector: '#sidebar-avatar', value: this.getAvatarForUser() }
        ];
        
        userElements.forEach(({ selector, value }) => {
            const element = document.querySelector(selector);
            if (element) {
                element.textContent = value;
            }
        });
        
        // Afficher les contrôles admin si nécessaire
        if (this.isAdmin && this.elements.instructorPanel) {
            this.elements.instructorPanel.style.display = 'block';
        }
    }
    
    getAvatarForUser() {
        if (this.isAdmin) return '👑';
        const avatars = ['👨‍🚀', '👩‍🚀', '🦸‍♂️', '🦸‍♀️', '🥷', '🧙‍♂️', '🧙‍♀️'];
        return avatars[Math.floor(Math.random() * avatars.length)];
    }
    
    // =====================================================
    // YOUTUBE API
    // =====================================================
    
    loadYouTubeAPI() {
        // Charger l'API YouTube IFrame
        if (!window.YT) {
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(script);
            
            window.onYouTubeIframeAPIReady = () => {
                console.log('✅ YouTube API chargée');
                this.initYouTubePlayer();
            };
        } else {
            this.initYouTubePlayer();
        }
    }
    
    initYouTubePlayer() {
        if (!this.elements.youtubeIframe) return;
        
        this.player = new YT.Player(this.elements.youtubeIframe.id, {
            height: '100%',
            width: '100%',
            events: {
                'onReady': (event) => this.onPlayerReady(event),
                'onStateChange': (event) => this.onPlayerStateChange(event),
                'onError': (event) => this.onPlayerError(event)
            },
            playerVars: {
                'autoplay': 1,
                'controls': 1,
                'rel': 0,
                'showinfo': 0,
                'modestbranding': 1
            }
        });
    }
    
    onPlayerReady(event) {
        console.log('✅ YouTube Player prêt');
        this.playerReady = true;
    }
    
    onPlayerStateChange(event) {
        const state = event.data;
        
        switch (state) {
            case YT.PlayerState.PLAYING:
                console.log('▶️ Lecture démarrée');
                this.onVideoPlaying();
                break;
            case YT.PlayerState.PAUSED:
                console.log('⏸️ Lecture en pause');
                break;
            case YT.PlayerState.ENDED:
                console.log('⏹️ Lecture terminée');
                this.onVideoEnded();
                break;
            case YT.PlayerState.BUFFERING:
                console.log('⏳ Mise en mémoire tampon...');
                break;
        }
    }
    
    onPlayerError(event) {
        console.error('❌ Erreur YouTube Player:', event.data);
        this.handlePlayerError(event.data);
    }
    
    onVideoPlaying() {
        // Mettre à jour l'interface
        this.updateLiveStatus(true);
        this.enableChat();
        this.showLiveBanner();
    }
    
    onVideoEnded() {
        // Live terminé
        this.updateLiveStatus(false);
        this.disableChat();
        this.hideLiveBanner();
        this.showVideoPlaceholder();
    }
    
    handlePlayerError(errorCode) {
        const errors = {
            2: 'ID vidéo invalide',
            5: 'Erreur de lecture HTML5',
            100: 'Vidéo introuvable ou privée',
            101: 'Lecture non autorisée',
            150: 'Lecture non autorisée'
        };
        
        const message = errors[errorCode] || 'Erreur de lecture inconnue';
        this.showNotification(`Erreur vidéo: ${message}`, 'error');
        
        // Revenir au placeholder
        this.showVideoPlaceholder();
    }
    
    // =====================================================
    // GESTION DES LIVES
    // =====================================================
    
    async checkCurrentLive() {
        try {
            // Vérifier s'il y a un live en cours
            const currentLive = await this.getCurrentLiveFromDB();
            
            if (currentLive && currentLive.isActive) {
                await this.joinLive(currentLive);
            } else {
                this.showVideoPlaceholder();
            }
        } catch (error) {
            console.error('❌ Erreur vérification live:', error);
            this.showVideoPlaceholder();
        }
    }
    
    async getCurrentLiveFromDB() {
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
                    return {
                        id: liveDoc.id,
                        ...liveDoc.data()
                    };
                }
            }
            
            // Mode dev - simuler un live parfois
            if (Math.random() < 0.3) {
                return {
                    id: 'dev-live-123',
                    title: 'Formation Trading Avancé',
                    description: 'Masterclass complète sur l\'analyse technique',
                    instructor: 'Commandant Spatial',
                    youtubeUrl: 'dQw4w9WgXcQ', // Rick Roll pour test 😄
                    isActive: true,
                    status: 'live',
                    startTime: new Date(Date.now() - 30 * 60 * 1000), // Démarré il y a 30min
                    viewers: 127
                };
            }
            
            return null;
        } catch (error) {
            console.error('❌ Erreur récupération live:', error);
            return null;
        }
    }
    
    async joinLive(liveData) {
        this.currentLiveId = liveData.id;
        this.liveData = liveData;
        this.isLive = true;
        
        // Extraire l'ID YouTube de l'URL
        const youtubeId = this.extractYouTubeId(liveData.youtubeUrl);
        
        if (youtubeId) {
            await this.loadLiveVideo(youtubeId);
            this.updateLiveInfo(liveData);
            this.showLiveBanner();
            this.enableChat();
            this.startLiveTimers();
        } else {
            this.showNotification('URL YouTube invalide', 'error');
            this.showVideoPlaceholder();
        }
    }
    
    async loadLiveVideo(youtubeId) {
        if (this.playerReady && this.player) {
            // Charger la vidéo dans le player existant
            this.player.loadVideoById(youtubeId);
        } else {
            // Créer l'iframe directement
            if (this.elements.youtubeIframe) {
                this.elements.youtubeIframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&controls=1&rel=0&showinfo=0&modestbranding=1`;
            }
        }
        
        // Afficher le container YouTube
        this.showYouTubeContainer();
    }
    
    extractYouTubeId(url) {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    }
    
    updateLiveInfo(liveData) {
        if (this.elements.videoTitle) {
            this.elements.videoTitle.textContent = liveData.title;
        }
        if (this.elements.liveTitle) {
            this.elements.liveTitle.textContent = liveData.title;
        }
        if (this.elements.instructorName) {
            this.elements.instructorName.textContent = `👨‍🏫 ${liveData.instructor}`;
        }
        if (this.elements.liveDescription) {
            this.elements.liveDescription.textContent = liveData.description;
        }
        if (this.elements.currentLiveTitle) {
            this.elements.currentLiveTitle.textContent = liveData.title;
        }
        
        // Mettre à jour le nombre de viewers
        this.viewers = liveData.viewers || 0;
        this.updateViewersDisplay();
    }
    
    // =====================================================
    // CONTRÔLES ADMINISTRATEUR
    // =====================================================
    
    async startLive() {
        if (!this.isAdmin) {
            this.showNotification('Accès refusé', 'error');
            return;
        }
        
        try {
            // Demander l'URL YouTube Live
            const youtubeUrl = await this.promptYouTubeUrl();
            
            if (!youtubeUrl) return;
            
            const youtubeId = this.extractYouTubeId(youtubeUrl);
            if (!youtubeId) {
                this.showNotification('URL YouTube invalide', 'error');
                return;
            }
            
            // Créer le live dans la base de données
            const liveData = {
                title: 'Nouveau Live',
                description: 'Session live en cours',
                instructor: this.currentUser.name,
                youtubeUrl: youtubeUrl,
                youtubeId: youtubeId,
                isActive: true,
                status: 'live',
                startTime: new Date(),
                createdBy: this.currentUser.id,
                viewers: 0
            };
            
            const liveId = await this.createLiveInDB(liveData);
            
            if (liveId) {
                liveData.id = liveId;
                await this.joinLive(liveData);
                
                this.showNotification('🔴 Live démarré avec succès !', 'success');
                
                // Mettre à jour les boutons admin
                if (this.elements.startLiveBtn) {
                    this.elements.startLiveBtn.style.display = 'none';
                }
                if (this.elements.stopLiveBtn) {
                    this.elements.stopLiveBtn.style.display = 'inline-block';
                }
            }
        } catch (error) {
            console.error('❌ Erreur démarrage live:', error);
            this.showNotification('Erreur lors du démarrage', 'error');
        }
    }
    
    async stopLive() {
        if (!this.isAdmin || !this.currentLiveId) return;
        
        try {
            // Arrêter le live dans la base de données
            await this.stopLiveInDB(this.currentLiveId);
            
            // Mettre à jour l'interface
            this.isLive = false;
            this.currentLiveId = null;
            this.liveData = null;
            
            this.showVideoPlaceholder();
            this.hideLiveBanner();
            this.disableChat();
            this.stopLiveTimers();
            
            this.showNotification('⏹️ Live arrêté', 'info');
            
            // Mettre à jour les boutons admin
            if (this.elements.startLiveBtn) {
                this.elements.startLiveBtn.style.display = 'inline-block';
            }
            if (this.elements.stopLiveBtn) {
                this.elements.stopLiveBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('❌ Erreur arrêt live:', error);
            this.showNotification('Erreur lors de l\'arrêt', 'error');
        }
    }
    
    async emergencyStop() {
        if (!this.isAdmin) return;
        
        const confirmed = confirm('⚠️ ARRÊT D\'URGENCE\n\nCeci va immédiatement arrêter le live pour tous les utilisateurs.\n\nContinuer ?');
        
        if (confirmed) {
            await this.stopLive();
            this.showNotification('🚨 Arrêt d\'urgence effectué', 'warning');
        }
    }
    
    async promptYouTubeUrl() {
        return new Promise((resolve) => {
            const modal = this.createYouTubeUrlModal();
            document.body.appendChild(modal);
            
            const input = modal.querySelector('#youtube-url-input');
            const confirmBtn = modal.querySelector('#confirm-url-btn');
            const cancelBtn = modal.querySelector('#cancel-url-btn');
            
            confirmBtn.addEventListener('click', () => {
                const url = input.value.trim();
                modal.remove();
                resolve(url);
            });
            
            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve(null);
            });
            
            // Focus sur l'input
            setTimeout(() => input.focus(), 100);
        });
    }
    
    createYouTubeUrlModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔴 Démarrer un Live</h3>
                </div>
                <div class="modal-body">
                    <p>Entrez l'URL de votre live YouTube (Non répertorié) :</p>
                    <input type="url" id="youtube-url-input" placeholder="https://youtube.com/watch?v=..." 
                           style="width: 100%; padding: 0.8rem; margin: 1rem 0; border: 1px solid var(--live-border); border-radius: 8px; background: rgba(0,0,0,0.3); color: white;">
                    <small style="color: rgba(255,255,255,0.7);">
                        ⚠️ Assurez-vous que le live est configuré en "Non répertorié" sur YouTube
                    </small>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="cancel-url-btn">Annuler</button>
                    <button class="btn btn-primary" id="confirm-url-btn">🔴 Démarrer</button>
                </div>
            </div>
        `;
        return modal;
    }
    
    async createLiveInDB(liveData) {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const docRef = await firebase.firestore().collection('lives').add(liveData);
                return docRef.id;
            }
            
            // Mode dev
            return 'dev-live-' + Date.now();
        } catch (error) {
            console.error('❌ Erreur création live DB:', error);
            throw error;
        }
    }
    
    async stopLiveInDB(liveId) {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                await firebase.firestore().collection('lives').doc(liveId).update({
                    isActive: false,
                    status: 'ended',
                    endTime: new Date(),
                    finalViewers: this.viewers,
                    finalDuration: this.liveDuration
                });
            }
            
            console.log('✅ Live arrêté dans la DB');
        } catch (error) {
            console.error('❌ Erreur arrêt live DB:', error);
            throw error;
        }
    }
    
    toggleChat() {
        this.chatEnabled = !this.chatEnabled;
        
        if (this.chatEnabled) {
            this.enableChat();
            this.addSystemMessage('💬 Chat activé par le formateur');
        } else {
            this.disableChat();
            this.addSystemMessage('🔇 Chat désactivé par le formateur');
        }
        
        // Mettre à jour le bouton
        if (this.elements.toggleChatBtn) {
            this.elements.toggleChatBtn.textContent = this.chatEnabled ? '🔇 Désactiver Chat' : '💬 Activer Chat';
        }
    }
    
    // =====================================================
    // GESTION DE L'INTERFACE
    // =====================================================
    
    showVideoPlaceholder() {
        if (this.elements.videoPlaceholder) {
            this.elements.videoPlaceholder.style.display = 'flex';
        }
        if (this.elements.youtubeContainer) {
            this.elements.youtubeContainer.style.display = 'none';
        }
    }
    
    showYouTubeContainer() {
        if (this.elements.videoPlaceholder) {
            this.elements.videoPlaceholder.style.display = 'none';
        }
        if (this.elements.youtubeContainer) {
            this.elements.youtubeContainer.style.display = 'block';
        }
    }
    
    showLiveBanner() {
        if (this.elements.liveBanner) {
            this.elements.liveBanner.style.display = 'block';
        }
    }
    
    hideLiveBanner() {
        if (this.elements.liveBanner) {
            this.elements.liveBanner.style.display = 'none';
        }
    }
    
    updateLiveStatus(isLive) {
        this.isLive = isLive;
        
        // Mettre à jour tous les indicateurs de statut live
        const liveElements = document.querySelectorAll('.live-badge, .live-dot');
        liveElements.forEach(el => {
            if (isLive) {
                el.classList.add('live');
            } else {
                el.classList.remove('live');
            }
        });
    }
    
    updateViewersDisplay() {
        if (this.elements.viewersCount) {
            this.elements.viewersCount.textContent = this.viewers;
        }
        if (this.elements.liveViewersCount) {
            this.elements.liveViewersCount.textContent = this.viewers;
        }
        
        // Mettre à jour le max viewers pour les admins
        if (this.viewers > this.maxViewers) {
            this.maxViewers = this.viewers;
            if (this.elements.maxViewersEl) {
                this.elements.maxViewersEl.textContent = this.maxViewers;
            }
        }
    }
    
    updateDurationDisplay() {
        const duration = this.formatDuration(this.liveDuration);
        
        if (this.elements.liveDuration) {
            this.elements.liveDuration.textContent = duration;
        }
        if (this.elements.adminDuration) {
            this.elements.adminDuration.textContent = duration;
        }
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
    
    // =====================================================
    // GESTION DU CHAT
    // =====================================================
    
    enableChat() {
        this.chatEnabled = true;
        this.updateChatUI();
    }
    
    disableChat() {
        this.chatEnabled = false;
        this.updateChatUI();
    }
    
    updateChatUI() {
        const isEnabled = this.chatEnabled && this.isLive;
        
        if (this.elements.chatInput) {
            this.elements.chatInput.disabled = !isEnabled;
            this.elements.chatInput.placeholder = isEnabled ? 
                'Participez à la discussion...' : 
                'Chat désactivé';
        }
        
        if (this.elements.sendBtn) {
            this.elements.sendBtn.disabled = !isEnabled;
        }
        
        if (this.elements.chatStatus) {
            this.elements.chatStatus.innerHTML = isEnabled ? 
                '<div class="status-icon">💬</div><span>Chat actif</span>' :
                '<div class="status-icon">🔇</div><span>Chat désactivé</span>';
        }
    }
    
    sendMessage(e) {
        e.preventDefault();
        
        const messageText = this.elements.chatInput?.value.trim();
        if (!messageText || !this.chatEnabled || !this.isLive) return;
        
        const message = {
            id: Date.now(),
            author: this.currentUser.name,
            avatar: this.getAvatarForUser(),
            content: messageText,
            timestamp: Date.now(),
            isAdmin: this.isAdmin,
            userId: this.currentUser.id
        };
        
        this.addChatMessage(message);
        this.sendMessageToServer(message);
        
        // Vider le champ
        if (this.elements.chatInput) {
            this.elements.chatInput.value = '';
            this.updateCharCount({ target: this.elements.chatInput });
        }
    }
    
    addChatMessage(message) {
        this.chatMessages.push(message);
        this.totalMessages++;
        
        // Limiter le nombre de messages
        if (this.chatMessages.length > this.maxMessages) {
            this.chatMessages = this.chatMessages.slice(-this.maxMessages);
        }
        
        this.renderChatMessage(message);
        this.scrollChatToBottom();
        
        // Mettre à jour le compteur admin
        if (this.elements.totalMessagesEl) {
            this.elements.totalMessagesEl.textContent = this.totalMessages;
        }
    }
    
    renderChatMessage(message) {
        if (!this.elements.chatMessages) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
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
            const authorClass = message.isAdmin ? 'instructor' : 'user';
            messageElement.innerHTML = `
                <div class="message-header">
                    <span class="message-author ${authorClass}">
                        ${message.avatar} ${message.author}
                    </span>
                    <span class="message-time">${this.formatTime(message.timestamp)}</span>
                </div>
                <div class="message-content">${this.escapeHtml(message.content)}</div>
            `;
        }
        
        this.elements.chatMessages.appendChild(messageElement);
        
        // Animation d'apparition
        setTimeout(() => {
            messageElement.style.opacity = '1';
            messageElement.style.transform = 'translateY(0)';
        }, 50);
    }
    
    addSystemMessage(content) {
        const message = {
            id: Date.now(),
            type: 'system',
            content: content,
            timestamp: Date.now()
        };
        
        this.addChatMessage(message);
    }
    
    async sendMessageToServer(message) {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore && this.currentLiveId) {
                await firebase.firestore()
                    .collection('lives')
                    .doc(this.currentLiveId)
                    .collection('messages')
                    .add(message);
            }
        } catch (error) {
            console.error('❌ Erreur envoi message:', error);
        }
    }
    
    updateCharCount(e) {
        const length = e.target.value.length;
        if (this.elements.charCount) {
            this.elements.charCount.textContent = length;
            
            // Changer la couleur si proche de la limite
            if (length > 450) {
                this.elements.charCount.style.color = 'var(--live-warning)';
            } else if (length > 400) {
                this.elements.charCount.style.color = 'var(--live-accent)';
            } else {
                this.elements.charCount.style.color = 'rgba(255, 255, 255, 0.5)';
            }
        }
    }
    
    scrollChatToBottom() {
        if (this.elements.chatMessages) {
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        }
    }
    
    showEmojiPicker() {
        // Implémentation basique d'un sélecteur d'emoji
        const emojis = ['😀', '😍', '🤔', '👍', '👎', '🔥', '💎', '🚀', '📈', '💰', '⚡', '🎯'];
        
        const picker = document.createElement('div');
        picker.className = 'emoji-picker-popup';
        picker.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 0;
            background: var(--live-dark-card);
            border: 1px solid var(--live-border);
            border-radius: 8px;
            padding: 0.5rem;
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 0.3rem;
            z-index: 1000;
        `;
        
        emojis.forEach(emoji => {
            const btn = document.createElement('button');
            btn.textContent = emoji;
            btn.style.cssText = `
                background: none;
                border: none;
                font-size: 1.2rem;
                padding: 0.3rem;
                cursor: pointer;
                border-radius: 4px;
                transition: background 0.2s;
            `;
            btn.addEventListener('click', () => {
                if (this.elements.chatInput) {
                    this.elements.chatInput.value += emoji;
                    this.updateCharCount({ target: this.elements.chatInput });
                }
                picker.remove();
            });
            btn.addEventListener('mouseenter', () => {
                btn.style.background = 'rgba(0, 255, 136, 0.2)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = 'none';
            });
            picker.appendChild(btn);
        });
        
        this.elements.emojiBtn.style.position = 'relative';
        this.elements.emojiBtn.appendChild(picker);
        
        // Fermer en cliquant ailleurs
        setTimeout(() => {
            document.addEventListener('click', function closeEmojiPicker(e) {
                if (!picker.contains(e.target)) {
                    picker.remove();
                    document.removeEventListener('click', closeEmojiPicker);
                }
            });
        }, 100);
    }
    
    // =====================================================
    // ACTIONS UTILISATEUR
    // =====================================================
    
    toggleLike() {
        const isLiked = this.elements.likeBtn?.classList.contains('liked');
        
        if (isLiked) {
            this.elements.likeBtn.classList.remove('liked');
            this.decrementLikeCount();
        } else {
            this.elements.likeBtn?.classList.add('liked');
            this.incrementLikeCount();
        }
        
        // Envoyer à la base de données
        this.updateLikeInDB(!isLiked);
    }
    
    incrementLikeCount() {
        if (this.elements.likeCount) {
            const current = parseInt(this.elements.likeCount.textContent) || 0;
            this.elements.likeCount.textContent = current + 1;
        }
    }
    
    decrementLikeCount() {
        if (this.elements.likeCount) {
            const current = parseInt(this.elements.likeCount.textContent) || 0;
            this.elements.likeCount.textContent = Math.max(0, current - 1);
        }
    }
    
    async updateLikeInDB(isLiked) {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore && this.currentLiveId) {
                const userLikeRef = firebase.firestore()
                    .collection('lives')
                    .doc(this.currentLiveId)
                    .collection('likes')
                    .doc(this.currentUser.id);
                
                if (isLiked) {
                    await userLikeRef.set({
                        userId: this.currentUser.id,
                        userName: this.currentUser.name,
                        timestamp: new Date()
                    });
                } else {
                    await userLikeRef.delete();
                }
            }
        } catch (error) {
            console.error('❌ Erreur mise à jour like:', error);
        }
    }
    
    shareLive() {
        if (navigator.share && this.liveData) {
            navigator.share({
                title: this.liveData.title,
                text: `Regardez ce live : ${this.liveData.title}`,
                url: window.location.href
            }).catch(err => console.log('Erreur partage:', err));
        } else {
            // Fallback : copier le lien
            navigator.clipboard.writeText(window.location.href).then(() => {
                this.showNotification('Lien copié dans le presse-papiers !', 'success');
            }).catch(() => {
                this.showNotification('Impossible de copier le lien', 'error');
            });
        }
    }
    
    bookmarkLive() {
        const isBookmarked = this.elements.bookmarkBtn?.classList.contains('bookmarked');
        
        if (isBookmarked) {
            this.elements.bookmarkBtn.classList.remove('bookmarked');
            this.showNotification('Retiré des favoris', 'info');
        } else {
            this.elements.bookmarkBtn?.classList.add('bookmarked');
            this.showNotification('Ajouté aux favoris !', 'success');
        }
        
        // Sauvegarder en base
        this.updateBookmarkInDB(!isBookmarked);
    }
    
    async updateBookmarkInDB(isBookmarked) {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore && this.currentLiveId) {
                const userBookmarkRef = firebase.firestore()
                    .collection('users')
                    .doc(this.currentUser.id)
                    .collection('bookmarks')
                    .doc(this.currentLiveId);
                
                if (isBookmarked) {
                    await userBookmarkRef.set({
                        liveId: this.currentLiveId,
                        title: this.liveData?.title || 'Live',
                        timestamp: new Date()
                    });
                } else {
                    await userBookmarkRef.delete();
                }
            }
        } catch (error) {
            console.error('❌ Erreur bookmark:', error);
        }
    }
    
    // =====================================================
    // TIMERS ET MISES À JOUR
    // =====================================================
    
    startLiveTimers() {
        // Timer pour la durée
        this.durationTimer = setInterval(() => {
            this.liveDuration++;
            this.updateDurationDisplay();
        }, 1000);
        
        // Timer pour les viewers (simulation)
        this.viewersUpdateTimer = setInterval(() => {
            this.simulateViewersChange();
        }, 5000);
    }
    
    stopLiveTimers() {
        if (this.durationTimer) {
            clearInterval(this.durationTimer);
            this.durationTimer = null;
        }
        
        if (this.viewersUpdateTimer) {
            clearInterval(this.viewersUpdateTimer);
            this.viewersUpdateTimer = null;
        }
    }
    
    startUpdateTimers() {
        // Vérifier les nouveaux lives toutes les 30 secondes
        setInterval(() => {
            if (!this.isLive) {
                this.checkCurrentLive();
            }
        }, 30000);
        
        // Mettre à jour le nombre d'utilisateurs en ligne
        setInterval(() => {
            this.updateOnlineUsers();
        }, 10000);
    }
    
    simulateViewersChange() {
        // Simuler des fluctuations réalistes du nombre de viewers
        const change = Math.floor(Math.random() * 10) - 5; // -5 à +5
        this.viewers = Math.max(0, this.viewers + change);
        this.updateViewersDisplay();
    }
    
    updateOnlineUsers() {
        // Simuler le nombre d'utilisateurs en ligne
        this.onlineUsers = Math.floor(Math.random() * 50) + 100;
        if (this.elements.onlineCount) {
            this.elements.onlineCount.textContent = this.onlineUsers;
        }
    }
    
    // =====================================================
    // AGENDA
    // =====================================================
    
    initAgenda() {
        // Initialiser l'agenda avec les données
        this.bindAgendaEvents();
        this.updateAgendaDisplay();
    }
    
    bindAgendaEvents() {
        // Navigation semaine
        const prevWeekBtn = document.getElementById('prev-week');
        const nextWeekBtn = document.getElementById('next-week');
        
        prevWeekBtn?.addEventListener('click', () => this.changeWeek(-1));
        nextWeekBtn?.addEventListener('click', () => this.changeWeek(1));
        
        // Boutons vue agenda
        const agendaBtns = document.querySelectorAll('.agenda-btn');
        agendaBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                agendaBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.switchAgendaView(btn.dataset.view);
            });
        });
        
        // Clics sur les créneaux
        const liveSlots = document.querySelectorAll('.live-slot');
        liveSlots.forEach(slot => {
            slot.addEventListener('click', () => {
                this.showSlotDetails(slot);
            });
        });
    }
    
    changeWeek(direction) {
        // Logique pour changer de semaine
        console.log(`Changement de semaine: ${direction > 0 ? 'suivante' : 'précédente'}`);
        
        // Mettre à jour l'affichage de la plage de dates
        const weekRange = document.getElementById('week-range');
        if (weekRange) {
            // Simuler un changement de dates
            const currentText = weekRange.textContent;
            weekRange.textContent = direction > 0 ? '27 Jan - 2 Fév 2025' : '13 - 19 Janvier 2025';
        }
    }
    
    switchAgendaView(view) {
        console.log(`Vue agenda: ${view}`);
        // Implémenter le changement de vue (semaine/mois)
    }
    
    showSlotDetails(slot) {
        const time = slot.dataset.time;
        const title = slot.querySelector('.slot-title')?.textContent;
        
        this.showNotification(`Live "${title}" à ${time}`, 'info');
    }
    
    updateAgendaDisplay() {
        // Mettre à jour l'affichage de l'agenda avec les données actuelles
        console.log('📅 Agenda mis à jour');
    }
    
    // =====================================================
    // GESTION DES ERREURS ET CONNEXION
    // =====================================================
    
    handleConnectionLoss() {
        this.showNotification('⚠️ Connexion perdue', 'warning');
        // Arrêter les timers pour économiser les ressources
        this.stopLiveTimers();
    }
    
    handleConnectionRestore() {
        this.showNotification('✅ Connexion rétablie', 'success');
        // Vérifier l'état actuel du live
        this.checkCurrentLive();
    }
    
    handleBeforeUnload(e) {
        if (this.isLive && this.isAdmin) {
            e.preventDefault();
            e.returnValue = 'Un live est en cours. Êtes-vous sûr de vouloir quitter ?';
        }
    }
    
    // =====================================================
    // UTILITAIRES
    // =====================================================
    
    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <span class="notification-icon">${icons[type]}</span>
            <span class="notification-text">${message}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: var(--live-dark-card);
            border: 1px solid var(--live-border);
            border-radius: 10px;
            padding: 1rem 1.5rem;
            color: white;
            display: flex;
            align-items: center;
            gap: 0.8rem;
            z-index: 1100;
            box-shadow: var(--live-glow);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animation d'apparition
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Disparition automatique
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// =====================================================
// FONCTIONS GLOBALES
// =====================================================

// Instance globale
let liveManager;

// Fonction de fermeture de modal
function closeModal() {
    const modals = document.querySelectorAll('.modal.active');
    modals.forEach(modal => {
        modal.classList.remove('active');
    });
}

// Fonction d'upgrade d'account
function upgradeAccount() {
    // Rediriger vers la page d'abonnement
    window.location.href = '../parametres/parametres.html?tab=subscription';
}

// Fonction de déconnexion
function handleLogout() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut().then(() => {
            window.location.href = '../../index.html';
        });
    } else {
        localStorage.removeItem('userLoggedIn');
        localStorage.removeItem('userData');
        window.location.href = '../../index.html';
    }
}

// =====================================================
// INITIALISATION PRINCIPALE
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation Live Manager...');
    
    try {
        // Créer l'instance du gestionnaire live
        liveManager = new YouTubeLiveManager();
        
        // Gestion des modales (fermeture en cliquant à l'extérieur)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeModal();
            }
        });
        
        // Gestion de la touche Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
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
            if (window.innerWidth <= 768 && liveManager) {
                // Ajustements pour mobile si nécessaire
                liveManager.updateAgendaDisplay();
            }
        });
        
        // Page Visibility API pour optimiser les performances
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Pause des timers non critiques quand l'onglet est caché
                console.log('📱 Page cachée - optimisation...');
            } else {
                // Reprendre les timers et vérifier l'état
                console.log('📱 Page visible - reprise...');
                if (liveManager && !liveManager.isLive) {
                    liveManager.checkCurrentLive();
                }
            }
        });
        
        console.log('✅ Live Manager initialisé avec succès');
        
    } catch (error) {
        console.error('❌ Erreur initialisation Live Manager:', error);
        
        // Afficher un message d'erreur à l'utilisateur
        const errorNotification = document.createElement('div');
        errorNotification.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--live-dark-card);
                border: 1px solid var(--live-warning);
                border-radius: 15px;
                padding: 2rem;
                text-align: center;
                z-index: 10000;
                color: white;
            ">
                <h3 style="color: var(--live-warning); margin-bottom: 1rem;">
                    ⚠️ Erreur d'initialisation
                </h3>
                <p style="margin-bottom: 1.5rem;">
                    Une erreur est survenue lors du chargement de la page live.
                </p>
                <button onclick="window.location.reload()" style="
                    background: var(--live-primary);
                    color: #000;
                    border: none;
                    padding: 0.8rem 1.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">
                    🔄 Recharger la page
                </button>
            </div>
        `;
        document.body.appendChild(errorNotification);
    }
});

// =====================================================
// EXPOSITION GLOBALE
// =====================================================

// Exposer les fonctions nécessaires
window.liveManager = () => liveManager;
window.closeModal = closeModal;
window.upgradeAccount = upgradeAccount;

console.log('🎬 Script Live avec YouTube chargé avec succès');