// 🚀 LOGIN SCRIPT - CORREGIDO
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    const errorMsg = document.getElementById('errorMsg');
    const btnText = document.getElementById('btnText');
    const loading = document.getElementById('loading');
    const btn = form.querySelector('.login-btn');

    // ✅ CREDENCIALES - CAMBIA AQUÍ
    const CREDENTIALS = {
        username: 'admin',
        password: 'admin123'
    };

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            showError('Completa todos los campos');
            return;
        }
        
        btn.disabled = true;
        btnText.textContent = 'Validando...';
        loading.style.display = 'block';
        
        setTimeout(() => {
            if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
                // ✅ LOGIN EXITOSO - NUEVA CLAVE
                localStorage.setItem('inventory_session', Date.now().toString());
                window.location.href = 'index.html';
            } else {
                showError('❌ Usuario o contraseña incorrectos');
            }
            
            btn.disabled = false;
            btnText.textContent = '🚀 Iniciar Sesión';
            loading.style.display = 'none';
        }, 1500);
    });

    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
        setTimeout(() => errorMsg.style.display = 'none', 4000);
    }

    // 🔒 VERIFICAR SESIÓN - CLAVE NUEVA
    const session = localStorage.getItem('inventory_session');
    if (session) {
        // SESIÓN VÁLIDA POR 24 HORAS
        if (Date.now() - parseInt(session) < 24 * 60 * 60 * 1000) {
            window.location.href = 'index.html';
        } else {
            localStorage.removeItem('inventory_session');
        }
    }
});