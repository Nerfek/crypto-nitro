// ===== LOGIN-MAIN.JS - LOGIQUE PAGE DE CONNEXION =====

console.log('🚀 Page de connexion spatiale initialisée');

// Variables globales
let isLoginMode = true;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initLoginPage();
});

function initLoginPage() {
    console.log('🛸 Initialisation des systèmes de connexion...');
    
    // Initialiser les événements
    initFormSwitching();
    initFormValidation();
    initPasswordToggle();
    initStarField();
    
    // Vérifier si l'utilisateur est déjà connecté
    checkExistingAuth();
    
    console.log('✅ Systèmes de connexion opérationnels');
}

// Gestion du basculement entre connexion et inscription
function initFormSwitching() {
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');
    const loginSection = document.querySelector('.login-section');
    const registerSection = document.querySelector('.register-section');
    
    if (switchToRegister) {
        switchToRegister.addEventListener('click', function(e) {
            e.preventDefault();
            showRegisterForm();
        });
    }
    
    if (switchToLogin) {
        switchToLogin.addEventListener('click', function(e) {
            e.preventDefault();
            showLoginForm();
        });
    }
    
    function showRegisterForm() {
        console.log('📝 Basculement vers inscription');
        loginSection.style.display = 'none';
        registerSection.style.display = 'flex';
        registerSection.classList.add('fade-in');
        isLoginMode = false;
        
        // Mettre à jour le titre de la page
        document.title = 'Inscription - Crypto-Nitro';
    }
    
    function showLoginForm() {
        console.log('🔑 Basculement vers connexion');
        registerSection.style.display = 'none';
        loginSection.style.display = 'flex';
        loginSection.classList.add('fade-in');
        isLoginMode = true;
        
        // Mettre à jour le titre de la page
        document.title = 'Connexion - Crypto-Nitro';
    }
}

// Validation des formulaires
function initFormValidation() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }
    
    // Validation en temps réel
    // Validation en temps réel
const inputs = document.querySelectorAll('input[type="email"], input[type="password"], input[type="text"], input[type="date"]');
    inputs.forEach(input => {
        input.addEventListener('input', validateInput);
        input.addEventListener('blur', validateInput);
    });
}

function handleLoginSubmit(e) {
    e.preventDefault();
    console.log('🚀 Tentative de connexion...');
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    // Validation basique
    if (!email || !password) {
        showError('Veuillez remplir tous les champs');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('Format d\'email invalide');
        return;
    }
    
    // Désactiver le bouton pendant la connexion
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '🚀 Connexion en cours...';
    
    // UTILISER FIREBASE AU LIEU DE LA SIMULATION
    if (window.firebaseAuth) {
        window.firebaseAuth.signInWithEmailAndPassword(email, password)
            .then(async (userCredential) => {
                console.log('✅ Connexion Firebase réussie!');
                
                // Récupérer les données utilisateur
                const userData = await window.getUserData(userCredential.user);
                window.currentUser = userData;
                window.isLoggedIn = true;

                // DEBUG
console.log('🔍 === DEBUG ADMIN ===');
console.log('User data:', userData);
console.log('Role:', userData.role);
console.log('isAdmin:', userData.isAdmin);
console.log('Is admin check:', userData.role === 'admin' || userData.isAdmin === true);
                
                // Vérifier si admin
                const isAdmin = userData.role === 'admin' || userData.isAdmin === true;
                
                showSuccess('Connexion réussie! Redirection...');
                setTimeout(() => {
                    if (isAdmin) {
                        console.log('👑 Admin détecté → Dashboard admin');
                        window.location.href = '../dashboard/admin/admin.html';
                    } else {
                        console.log('👤 User normal → Dashboard utilisateur');
                        window.location.href = '../dashboard/vu ensemble/dashboard.html';
                    }
                }, 1500);
            })
            .catch((error) => {
                console.error('❌ Erreur connexion:', error);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                
                let message = 'Email ou mot de passe incorrect';
                switch (error.code) {
                    case 'auth/user-not-found':
                        message = 'Aucun compte trouvé avec cet email';
                        break;
                    case 'auth/wrong-password':
                    case 'auth/invalid-login-credentials':
                        message = 'Email ou mot de passe incorrect';
                        break;
                    case 'auth/too-many-requests':
                        message = 'Trop de tentatives. Réessayez plus tard';
                        break;
                }
                showError(message);
            });
    } else {
        console.error('❌ Firebase non disponible');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        showError('Erreur système. Veuillez réessayer.');
    }
}


// Fonction pour calculer l'âge à partir de la date de naissance
function calculateAge(birthdate) {
    const today = new Date();
    const birth = new Date(birthdate);
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDifference = today.getMonth() - birth.getMonth();
    
    // Si l'anniversaire n'est pas encore passé cette année
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

// Système de rangs centralisé (copie de auth.js)
function calculateUserRank(portfolio) {
    if (portfolio >= 5000) {
        return {
            rank: '👑 Maître de l\'Univers',
            avatar: '👑',
            level: 4
        };
    } else if (portfolio >= 2000) {
        return {
            rank: '🏆 Expert Galactique',
            avatar: '🏆',
            level: 3
        };
    } else if (portfolio >= 1000) {
        return {
            rank: '🌟 Trader Confirmé',
            avatar: '🌟',
            level: 2
        };
    } else {
        return {
            rank: '🚀 Cadet Spatial',
            avatar: '👨‍🚀',
            level: 1
        };
    }
}


function handleRegisterSubmit(e) {
    e.preventDefault();
    console.log('⭐ Tentative d\'inscription...');
    
    const name = document.getElementById('register-name').value.trim();
    const firstname = document.getElementById('register-firstname').value.trim();
    const lastname = document.getElementById('register-lastname').value.trim();
    const birthdate = document.getElementById('register-birthdate').value;
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    const acceptTerms = document.getElementById('accept-terms').checked;
    
    // Validation
    if (!name || !firstname || !lastname || !birthdate || !email || !password || !confirmPassword) {
        showError('Veuillez remplir tous les champs');
        return;
    }
    
    if (name.length < 2) {
        showError('Le nom d\'astronaute doit contenir au moins 2 caractères');
        return;
    }
    
    if (firstname.length < 2) {
        showError('Le prénom doit contenir au moins 2 caractères');
        return;
    }
    
    if (lastname.length < 2) {
        showError('Le nom doit contenir au moins 2 caractères');
        return;
    }
    
    // Validation âge (18+)
    const age = calculateAge(birthdate);
    if (age < 18) {
        showError(`Vous devez avoir au moins 18 ans pour vous inscrire (vous avez ${age} ans)`);
        return;
    }
    
    if (age > 120) {
        showError('Date de naissance invalide');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('Format d\'email invalide');
        return;
    }
    
    if (password.length < 6) {
        showError('Le mot de passe doit contenir au moins 6 caractères');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('Les mots de passe ne correspondent pas');
        return;
    }
    
    if (!acceptTerms) {
        showError('Vous devez accepter les conditions');
        return;
    }
    
    // Désactiver le bouton
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '⭐ Création en cours...';
    
    // UTILISER FIREBASE avec les nouveaux champs
    if (window.firebaseAuth) {
        window.firebaseAuth.createUserWithEmailAndPassword(email, password)
            .then(async (userCredential) => {
                // Mettre à jour le profil Firebase
                await userCredential.user.updateProfile({
                    displayName: name
                });
                
                // Créer le profil utilisateur en Firestore avec tous les champs
                const userData = {
                    name: name,
                    firstname: firstname,
                    lastname: lastname,
                    birthdate: birthdate,
                    age: age, // Calculé automatiquement
                    email: email,
                    avatar: '👨‍🚀',
                    rank: '🚀 Cadet Spatial',
                    portfolio: 500,
                    dailyGain: 0,
                    role: 'user',
                    isAdmin: false,
                    joinDate: firebase.firestore.FieldValue.serverTimestamp(),
                    formations: {
                        completed: 0,
                        total: 12,
                        progress: 0
                    },
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                await window.firebaseDb.collection('users').doc(userCredential.user.uid).set(userData);
                
                console.log('✅ Inscription Firebase réussie avec date de naissance!');
                showSuccess('Compte créé avec succès! Redirection...');
                
                // Les nouveaux comptes sont toujours des utilisateurs normaux
                setTimeout(() => {
                    window.location.href = '../dashboard/vu ensemble/dashboard.html';
                }, 1500);
            })
            .catch((error) => {
                console.error('❌ Erreur inscription:', error);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                
                let message = 'Erreur lors de la création du compte';
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        message = 'Un compte existe déjà avec cet email';
                        break;
                    case 'auth/weak-password':
                        message = 'Mot de passe trop faible';
                        break;
                }
                showError(message);
            });
    } else {
        console.error('❌ Firebase non disponible');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        showError('Erreur système. Veuillez réessayer.');
    }
}


function validateInput(e) {
    const input = e.target;
    const value = input.value;
    
    // Enlever les styles d'erreur précédents
    input.classList.remove('error', 'success');
    
    if (input.type === 'email' && value) {
        if (isValidEmail(value)) {
            input.classList.add('success');
        } else {
            input.classList.add('error');
        }
    }
    
    if (input.type === 'password' && value) {
        if (value.length >= 6) {
            input.classList.add('success');
        } else {
            input.classList.add('error');
        }
    }
    
    // VALIDATION DATE DE NAISSANCE :
    if (input.type === 'date' && input.id === 'register-birthdate' && value) {
        const age = calculateAge(value);
        if (age >= 18 && age <= 120) {
            input.classList.add('success');
        } else {
            input.classList.add('error');
        }
    }
    
    // Validation noms
    if (input.type === 'text' && value) {
        if (value.trim().length >= 2) {
            input.classList.add('success');
        } else {
            input.classList.add('error');
        }
    }
    
    // Validation de confirmation de mot de passe
    if (input.id === 'register-confirm' && value) {
        const password = document.getElementById('register-password').value;
        if (value === password && password.length >= 6) {
            input.classList.add('success');
        } else {
            input.classList.add('error');
        }
    }
}

// Utilitaires
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showError(message) {
    showNotification(message, 'error');
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showNotification(message, type) {
    // Enlever les notifications existantes
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span class="notification-icon">${type === 'error' ? '❌' : '✅'}</span>
        <span class="notification-message">${message}</span>
    `;
    
    // Ajouter au body
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Enlever après 4 secondes
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 4000);
}


// Gestion de l'affichage/masquage des mots de passe
function initPasswordToggle() {
    const toggleButtons = document.querySelectorAll('.password-toggle');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            const eyeIcon = this.querySelector('.eye-icon');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                eyeIcon.textContent = '🙈';
                this.classList.add('visible');
            } else {
                passwordInput.type = 'password';
                eyeIcon.textContent = '👁️';
                this.classList.remove('visible');
            }
        });
    });
    
    console.log('👁️ Système de visualisation des mots de passe activé');
}




// Vérifier si l'utilisateur est déjà connecté
function checkExistingAuth() {
    // Ici tu vérifieras avec Firebase si l'utilisateur est connecté
    // Si oui, rediriger vers le dashboard
    console.log('🔍 Vérification de l\'authentification existante...');
    
    // Exemple : if (firebase.auth().currentUser) { 
    //     window.location.href = '../pages/dashboard/dashboard.html';
    // }
}

// Fonction pour récupérer les données utilisateur (version complète)
window.getUserData = async function(firebaseUser) {
    try {
        const userDoc = await window.firebaseDb.collection('users').doc(firebaseUser.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            console.log('📊 Données utilisateur récupérées:', userData.name);
            console.log('🔍 Role:', userData.role, 'isAdmin:', userData.isAdmin); // DEBUG
            
            // TOUJOURS recalculer le rang basé sur le portfolio
            const portfolio = userData.portfolio || 500;
            const rankData = calculateUserRank(portfolio);

            return {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                name: userData.name || firebaseUser.displayName || 'Astronaute',
                avatar: rankData.avatar,
                rank: rankData.rank,
                portfolio: portfolio,
                dailyGain: userData.dailyGain || 0,
                joinDate: userData.joinDate,
                formations: userData.formations || {
                    completed: 0,
                    total: 12,
                    progress: 0
                },
                role: userData.role || 'user',
                isAdmin: userData.isAdmin || false,
                firstname: userData.firstname || '',
                lastname: userData.lastname || '',
                birthdate: userData.birthdate || '',
                age: userData.age || 18
            };
        } else {
            console.log('👤 Nouveau utilisateur - création profil');
            return {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                name: firebaseUser.displayName || 'Astronaute',
                avatar: '👨‍🚀',
                rank: '🚀 Cadet Spatial',
                portfolio: 500,
                dailyGain: 0,
                role: 'user',
                isAdmin: false
            };
        }
    } catch (error) {
        console.error('❌ Erreur getUserData:', error);
        return {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: 'Astronaute',
            avatar: '👨‍🚀',
            rank: '🚀 Cadet Spatial',
            portfolio: 500,
            dailyGain: 0,
            role: 'user',
            isAdmin: false
        };
    }
};

// Animation du champ d'étoiles
function initStarField() {
    const starsField = document.getElementById('stars-field');
    if (!starsField) return;
    
    // Créer des étoiles supplémentaires pour l'effet
    for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.cssText = `
            position: absolute;
            width: 2px;
            height: 2px;
            background: white;
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            opacity: ${Math.random() * 0.8 + 0.2};
            animation: twinkle ${Math.random() * 3 + 2}s infinite;
        `;
        starsField.appendChild(star);
    }
    
    console.log('✨ Champ d\'étoiles initialisé');
}

// Gestion des auth sociales (à implémenter)
document.addEventListener('click', function(e) {
    if (e.target.id === 'google-auth') {
        e.preventDefault();
        console.log('📱 Connexion Google demandée');
        showNotification('Connexion Google bientôt disponible!', 'error');
    }
    
    if (e.target.id === 'discord-auth') {
        e.preventDefault();
        console.log('🎮 Connexion Discord demandée');
        showNotification('Connexion Discord bientôt disponible!', 'error');
    }
});

// CSS pour les notifications et validations
const style = document.createElement('style');
style.textContent = `
    /* Notifications */
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 17, 0.95);
        border: 1px solid;
        border-radius: 10px;
        padding: 1rem 1.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        backdrop-filter: blur(20px);
        max-width: 350px;
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification.error {
        border-color: #ff4757;
        background: rgba(255, 71, 87, 0.1);
    }
    
    .notification.success {
        border-color: #00ff88;
        background: rgba(0, 255, 136, 0.1);
    }
    
    .notification-icon {
        font-size: 1.2rem;
    }
    
    .notification-message {
        color: white;
        font-size: 0.9rem;
    }
    
    /* Validation des inputs */
    .form-group input.error {
        border-color: #ff4757 !important;
        box-shadow: 0 0 10px rgba(255, 71, 87, 0.3) !important;
    }
    
    .form-group input.success {
        border-color: #00ff88 !important;
        box-shadow: 0 0 10px rgba(0, 255, 136, 0.3) !important;
    }
    
    /* Animation twinkle pour les étoiles */
    @keyframes twinkle {
        0%, 100% { opacity: 0.2; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.2); }
    }
    
    /* Responsive notifications */
    @media (max-width: 768px) {
        .notification {
            top: 10px;
            right: 10px;
            left: 10px;
            max-width: none;
        }
    }
`;
document.head.appendChild(style);

console.log('🌟 Système de connexion spatiale prêt au décollage!');