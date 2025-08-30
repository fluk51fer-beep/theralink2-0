// --- 1. SETUP ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// COLE SUA URL E CHAVE ANON AQUI (VERIFIQUE SE AINDA ESTÃO CORRETAS )
const supabaseUrl = 'https://kdaqonbvtjhmizlxqvsf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYXFvbmJ2dGpobWl6bHhxdnNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDU1NTQsImV4cCI6MjA3MjA4MTU1NH0.11uPyVDLG3gHZN0o5S1V4fjU_Zly5LtJ8m0wUqGEDgk'; // CERTIFIQUE-SE DE QUE SUA CHAVE ESTÁ AQUI
// ---------------------------------

const supabase = createClient(supabaseUrl, supabaseKey );

// --- 2. LÓGICA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    const protectedPages = ['dashboard.html'];
    if (protectedPages.includes(currentPage)) {
        checkUserLoggedIn();
    }

    if (currentPage === 'cadastro.html') setupCadastroPage();
    if (currentPage === 'login.html') setupLoginPage();
    if (currentPage === 'dashboard.html') setupDashboardPage();
    if (currentPage === 'diagnostico.html') setupDiagnosticoPage();
    if (currentPage === 'resultado.html') setupResultadoPage();
});

// --- 3. FUNÇÕES DE AUTENTICAÇÃO E DASHBOARD (FASE 1) ---

async function checkUserLoggedIn() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) window.location.replace('login.html');
}

function setupCadastroPage() {
    const form = document.getElementById('signup-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { name, email, password } = Object.fromEntries(new FormData(e.target));
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) return showMessage(authError.message, 'error');
        if (!authData.user) return showMessage('Erro: Usuário não foi criado.', 'error');
        const { error: profileError } = await supabase.from('profiles').insert({ id: authData.user.id, full_name: name, email: email });
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
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile, error } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (profile) document.getElementById('user-name').textContent = profile.full_name;
    }
    const logoutButton = document.getElementById('logout-button');
    logoutButton.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.replace('login.html');
    });
}

// --- 4. FUNÇÕES DO DIAGNÓSTICO (NOVO - FASE 2) ---

function setupDiagnosticoPage() {
    const quizContainer = document.getElementById('quiz-container');
    if (!quizContainer) return;

    // Para esta fase, o questionário é fixo. No futuro, ele virá do banco de dados.
    const questions = [
        { id: 1, text: "Com que frequência vocês expressam apreço um pelo outro?", options: [{ text: "Diariamente", value: 3 }, { text: "Algumas vezes na semana", value: 2 }, { text: "Raramente", value: 1 }] },
        { id: 2, text: "Como vocês lidam com desacordos ou conflitos?", options: [{ text: "Conversamos calmamente", value: 3 }, { text: "Discutimos, mas nos resolvemos", value: 2 }, { text: "Evitamos o conflito", value: 1 }] },
        { id: 3, text: "Vocês compartilham objetivos e sonhos para o futuro?", options: [{ text: "Sim, estamos muito alinhados", value: 3 }, { text: "Temos alguns objetivos em comum", value: 2 }, { text: "Não muito", value: 1 }] }
    ];

    let formHTML = '<form id="quiz-form">';
    questions.forEach((q, index) => {
        formHTML += `<div class="mb-8"><p class="text-lg font-semibold text-gray-700 mb-4">${index + 1}. ${q.text}</p><div class="space-y-3">`;
        q.options.forEach(opt => {
            formHTML += `<label class="flex items-center p-3 border rounded-lg hover:bg-gray-100 cursor-pointer"><input type="radio" name="q_${q.id}" value="${opt.value}" class="mr-3" required><span>${opt.text}</span></label>`;
        });
        formHTML += `</div></div>`;
    });
    formHTML += `<button type="submit" class="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold mt-8 text-lg">Ver Meu Diagnóstico</button></form>`;
    quizContainer.innerHTML = formHTML;

    const quizForm = document.getElementById('quiz-form');
    quizForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(quizForm);
        let totalScore = 0;
        for (let value of formData.values()) {
            totalScore += parseInt(value);
        }

        // Simplesmente salva o resultado no navegador para a próxima página
        localStorage.setItem('theralinkScore', totalScore);
        window.location.href = 'resultado.html';
    });
}

function setupResultadoPage() {
    const container = document.getElementById('resultado-container');
    const score = localStorage.getItem('theralinkScore');

    if (score === null) {
        container.innerHTML = `<h2>Erro: Resultado não encontrado.</h2><p><a href="diagnostico.html" class="text-blue-500">Por favor, realize o diagnóstico primeiro.</a></p>`;
        return;
    }

    let analysis = "Sinais de Alerta Importantes";
    if (score > 7) analysis = "Fundação Sólida";
    else if (score > 4) analysis = "Áreas para Atenção";

    container.innerHTML = `
        <h2 class="text-3xl font-bold text-blue-600 mb-4">${analysis}</h2>
        <p class="text-gray-700 text-lg mb-8">Sua pontuação indica áreas que podem ser exploradas para fortalecer ainda mais sua conexão.</p>
        <div class="mt-10 p-6 bg-green-50 rounded-lg">
            <h3 class="text-2xl font-bold text-gray-800 mb-3">Dê o Próximo Passo</h3>
            <p class="text-gray-600 mb-6">A terapia é uma jornada de autoconhecimento e crescimento. Estou aqui para guiar vocês.</p>
            <a href="https://calendly.com/fabianolucas/terapia" target="_blank" class="inline-block bg-green-500 text-white px-10 py-4 rounded-full font-semibold text-lg hover:bg-green-600">
                Agende uma Sessão
            </a>
        </div>
    `;
    localStorage.removeItem('theralinkScore' );
}

// --- 5. FUNÇÃO UTILITÁRIA ---
function showMessage(message, type = 'success') {
    const container = document.getElementById('message-container');
    if (!container) return;
    const color = type === 'success' ? 'green' : 'red';
    container.innerHTML = `<p class="text-${color}-500 text-center">${message}</p>`;
}
