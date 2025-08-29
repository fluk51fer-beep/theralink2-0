// --- 1. SETUP ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// COLE SUA URL E CHAVE ANON AQUI
const supabaseUrl = 'COLE_SUA_URL_AQUI';
const supabaseKey = 'COLE_SUA_CHAVE_ANON_AQUI';
// ---------------------------------

const supabase = createClient(supabaseUrl, supabaseKey );

// --- 2. LÓGICA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();

    // Verifica se o usuário está logado em páginas protegidas
    const protectedPages = ['dashboard.html'];
    if (protectedPages.includes(currentPage)) {
        checkUserLoggedIn();
    }

    // Adiciona funcionalidade aos formulários e botões da página atual
    if (currentPage === 'cadastro.html') setupCadastroPage();
    if (currentPage === 'login.html') setupLoginPage();
    if (currentPage === 'dashboard.html') setupDashboardPage();
});

// --- 3. FUNÇÕES ESPECÍFICAS DE CADA PÁGINA ---

async function checkUserLoggedIn() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.replace('login.html');
    }
}

function setupCadastroPage() {
    const form = document.getElementById('signup-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { name, email, password } = Object.fromEntries(new FormData(e.target));

        // 1. Cria o usuário no sistema de autenticação
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) return showMessage(authError.message, 'error');
        if (!authData.user) return showMessage('Erro: Usuário não foi criado.', 'error');

        // 2. Insere o perfil na tabela 'profiles'
        const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            full_name: name,
            email: email
        });
        if (profileError) return showMessage(profileError.message, 'error');

        showMessage('Cadastro realizado com sucesso! Você será redirecionado para o login.', 'success');
        setTimeout(() => window.location.replace('login.html'), 3000);
    });
}

function setupLoginPage() {
    const form = document.getElementById('login-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { email, password } = Object.fromEntries(new FormData(e.target));
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return showMessage('Email ou senha inválidos.', 'error');
        window.location.replace('dashboard.html');
    });
}

async function setupDashboardPage() {
    // Carrega dados do usuário
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile, error } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (profile) {
            document.getElementById('user-name').textContent = profile.full_name;
        }
    }

    // Botão de logout
    const logoutButton = document.getElementById('logout-button');
    logoutButton.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.replace('login.html');
    });
}

// --- 4. FUNÇÃO UTILITÁRIA ---
function showMessage(message, type = 'success') {
    const container = document.getElementById('message-container');
    const color = type === 'success' ? 'green' : 'red';
    container.innerHTML = `<p class="text-${color}-500 text-center">${message}</p>`;
}
