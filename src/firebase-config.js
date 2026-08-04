// Configuração centralizada para o Fox Pro
const firebaseConfig = {
    apiKey: "AIzaSyAdOJej31uM904o8PG_nup45YAvpsH9atk",
    authDomain: "fox-pro-v5.firebaseapp.com",
    projectId: "fox-pro-v5",
    storageBucket: "fox-pro-v5.firebasestorage.app",
    messagingSenderId: "994680161594",
    appId: "1:994680161594:web:2f6e0488ed7e882ab2fc03"
};

// Inicialização única para todo o sistema
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const db = firebase.firestore();
export const auth = firebase.auth();
export const functions = firebase.functions();