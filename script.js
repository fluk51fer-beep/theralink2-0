// --- 1. SETUP ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://kdaqonbvtjhmizlxqvsf.supabase.co';
const supabaseKey = 'SUA_CHAVE_ANON_AQUI'; // CERTIFIQUE-SE DE QUE SUA CHAVE ESTÁ AQUI
const supabase = createClient(supabaseUrl, supabaseKey );

// --- 2. LÓGICA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const protectedPages = ['dashboard.html', 'configuracao.html', 'perfil.html'];

    if (protectedPages.includes(currentPage)) {
        checkSubscription(); // Nova função principal para páginas protegidas
    }

    if (currentPage === 'cadastro.html') setupCadastroPage();
    if (currentPage === 'login.html') setupLoginPage();
    if (currentPage === 'dashboard.html') setupDashboardPage();
    if (currentPage === 'diagnostico.html') setupDiagnosticoPage();
    if (currentPage === 'resultado.html') setupResultadoPage();
    if (currentPage === 'configuracao.html') setupConfiguracaoPage();
    if (currentPage === 'perfil.html') setupPerfilPage();
    if (currentPage === 'pagamento.html') setupPagamentoPage();
});

// --- 3. FUNÇÕES DE AUTENTICAÇÃO E PAGAMENTO ---

async function checkSubscription() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.location.replace('login.html');

    const { data: profile, error } = await supabase.from('profiles').select('subscription_status, subscription_ends_at').eq('id', user.id).single();
    if (error) {
        console.error("Erro ao buscar perfil:", error);
        return; // Permite o acesso se houver erro, para não bloquear indevidamente
    }

    const isActive = profile.subscription_status === 'active';
    const isOnTrial = profile.subscription_status === 'trialing';
    const trialEndDate = profile.subscription_ends_at ? new Date(profile.subscription_ends_at) : new Date();
    const now = new Date();

    if (isActive || (isOnTrial && now < trialEndDate)) {
        // Acesso liberado
    } else {
        // Acesso bloqueado, redireciona para pagamento
        window.location.replace('pagamento.html');
    }
}

function setupCadastroPage() {
    const form = document.getElementById('signup-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { name, email, password } = Object.fromEntries(new FormData(e.target));
        const { error } = await supabase.auth.signUp({
            email, password,
            options: { data: { full_name: name } }
        });
        if (error) return showMessage(error.message, 'error');
        showMessage('Cadastro realizado com sucesso! Redirecionando...', 'success');
        setTimeout(() => window.location.replace('login.html'), 2000);
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

function setupPagamentoPage() {
    const monthlyBtn = document.getElementById('checkout-monthly');
    const annualBtn = document.getElementById('checkout-annual');

    monthlyBtn.addEventListener('click', () => redirectToCheckout('price_1S2IAmEEmkJVXIEHmaq03DYQ'));
    annualBtn.addEventListener('click', () => redirectToCheckout('price_1S2IAmEEmkJVXIEHLJ6IUvj4'));
}

async function redirectToCheckout(priceId) {
    showMessage('Criando sua sessão de pagamento segura...', 'success');
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Usuário não autenticado.');

        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
            body: { priceId },
        });

        if (error) throw error;
        window.location.href = data.url;

    } catch (error) {
        showMessage(`Erro: ${error.message}`, 'error');
    }
}

// --- O RESTANTE DO CÓDIGO PERMANECE O MESMO ---
// (Colei tudo para garantir que não haja erros)

async function setupDashboardPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    if (profile) document.getElementById('user-name').textContent = profile.full_name;

    const linkInput = document.getElementById('personal-link');
    const diagnosticLink = `${window.location.origin}/diagnostico.html?prof_id=${user.id}`;
    linkInput.value = diagnosticLink;
    linkInput.addEventListener('click', () => {
        linkInput.select();
        navigator.clipboard.writeText(diagnosticLink);
        showMessage('Link copiado!', 'success', 'dashboard-message-container');
    });

    const diagnosticsContainer = document.getElementById('diagnostics-list');
    diagnosticsContainer.innerHTML = '<p>Carregando diagnósticos...</p>';
    const { data: diagnostics, error } = await supabase.from('diagnostics').select('*').eq('professional_id', user.id).order('created_at', { ascending: false });
    
    if (error) return diagnosticsContainer.innerHTML = `<p class="text-red-500">Erro ao carregar diagnósticos.</p>`;
    if (!diagnostics || diagnostics.length === 0) return diagnosticsContainer.innerHTML = `<div class="text-center py-10 px-6 border-2 border-dashed rounded-lg"><p class="text-gray-500">Nenhum diagnóstico recebido ainda.</p></div>`;

    let tableHTML = `<div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-gray-50 text-gray-600 uppercase tracking-wider"><tr><th class="p-3">Data</th><th class="p-3">Pontuação</th><th class="p-3">Análise</th></tr></thead><tbody class="bg-white divide-y">`;
    diagnostics.forEach(d => {
        tableHTML += `<tr class="hover:bg-gray-50"><td class="p-3">${new Date(d.created_at).toLocaleDateString('pt-BR')}</td><td class="p-3 font-semibold">${d.score}</td><td class="p-3">${d.analysis}</td></tr>`;
    });
    tableHTML += `</tbody></table></div>`;
    diagnosticsContainer.innerHTML = tableHTML;

    document.getElementById('logout-button').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.replace('login.html');
    });
}

async function setupDiagnosticoPage() {
    const quizContainer = document.getElementById('quiz-container');
    const params = new URLSearchParams(window.location.search);
    const professionalId = params.get('prof_id');

    if (!professionalId) return quizContainer.innerHTML = `<h1 class="text-3xl font-bold text-center text-red-500">Erro: Link Inválido</h1>`;

    const { data: profile, error: profileError } = await supabase.from('profiles').select('scheduling_link').eq('id', professionalId).single();
    if (profileError) return quizContainer.innerHTML = `<h1 class="text-3xl font-bold text-center text-red-500">Erro: Profissional não encontrado.</h1>`;

    const { data: questionnaire, error: questionnaireError } = await supabase.from('questionnaires').select('*, questions(*, options(*))').eq('professional_id', professionalId).single();
    if (questionnaireError || !questionnaire) return quizContainer.innerHTML = `<h1 class="text-3xl font-bold text-center text-red-500">Erro: Questionário não encontrado.</h1>`;
    
    const qData = questionnaire;
    const schedulingLink = profile.scheduling_link;

    let formHTML = `<form id="quiz-form">`;
    formHTML += `<h1 class="text-3xl font-bold text-center text-gray-800 mb-2">${qData.title}</h1><p class="text-center text-gray-600 mb-8">Suas respostas são confidenciais.</p>`;
    qData.questions.sort((a, b) => a.position - b.position).forEach((q, index) => {
        formHTML += `<div class="mb-8"><p class="text-lg font-semibold text-gray-700 mb-4">${index + 1}. ${q.text}</p><div class="space-y-3">`;
        q.options.forEach(opt => {
            formHTML += `<label class="flex items-center p-3 border rounded-lg hover:bg-gray-100 cursor-pointer"><input type="radio" name="q_${q.id}" value="${opt.value}" class="mr-3" required><span>${opt.text}</span></label>`;
        });
        formHTML += `</div></div>`;
    });
    formHTML += `<button type="submit" class="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold mt-8 text-lg">Ver Meu Diagnóstico</button></form>`;
    quizContainer.innerHTML = formHTML;

    document.getElementById('quiz-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        let totalScore = 0;
        for (let value of formData.values()) totalScore += parseInt(value);

        let analysis = "Sinais de Alerta Importantes";
        if (totalScore > (qData.questions.length * 3 * 0.7)) analysis = "Fundação Sólida";
        else if (totalScore > (qData.questions.length * 3 * 0.4)) analysis = "Áreas para Atenção";

        await supabase.from('diagnostics').insert({ score: totalScore, analysis: analysis, professional_id: professionalId });
        
        localStorage.setItem('theralinkResult', JSON.stringify({ 
            score: totalScore, 
            analysis: analysis, 
            schedulingLink: schedulingLink || 'https://wa.me/'
        } ));
        window.location.href = 'resultado.html';
    });
}

function setupResultadoPage() {
    const container = document.getElementById('resultado-container');
    const result = JSON.parse(localStorage.getItem('theralinkResult'));
    if (!result) return container.innerHTML = `<h2>Erro: Resultado não encontrado.</h2>`;
    
    container.innerHTML = `
        <h2 class="text-3xl font-bold text-blue-600 mb-4">${result.analysis}</h2>
        <p class="text-gray-700 text-lg mb-8">Sua pontuação foi: ${result.score}.</p>
        <div class="mt-10 p-6 bg-green-50 rounded-lg">
            <h3 class="text-2xl font-bold text-gray-800 mb-3">Dê o Próximo Passo</h3>
            <a href="${result.schedulingLink}" target="_blank" class="inline-block bg-green-500 text-white px-10 py-4 rounded-full font-semibold text-lg hover:bg-green-600">Agende uma Sessão</a>
        </div>`;
    localStorage.removeItem('theralinkResult');
}

async function setupConfiguracaoPage() {
    const container = document.getElementById('config-container');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let { data: questionnaire, error } = await supabase.from('questionnaires').select('*, questions(*, options(*))').eq('professional_id', user.id).single();

    if (error && error.code === 'PGRST116') {
        showMessage('Bem-vindo! Criando um questionário padrão para você começar...', 'success');
        const newQuestionnaire = await createDefaultQuestionnaire(user.id);
        if (newQuestionnaire) {
            renderConfigurator(container, newQuestionnaire);
        } else {
            container.innerHTML = `<p class="text-red-500">Erro fatal ao criar o questionário padrão.</p>`;
        }
    } else if (error) {
        container.innerHTML = `<p class="text-red-500">Erro ao carregar seus dados: ${error.message}</p>`;
    } else {
        renderConfigurator(container, questionnaire);
    }
}

async function createDefaultQuestionnaire(userId) {
    try {
        const { data: newQ, error: qError } = await supabase.from('questionnaires').insert({ title: 'Diagnóstico de Relacionamento Padrão', professional_id: userId }).select().single();
        if (qError) throw qError;
        const { data: newP, error: pError } = await supabase.from('questions').insert({ questionnaire_id: newQ.id, text: 'Como você avalia a comunicação?', position: 1 }).select().single();
        if (pError) throw pError;
        const { error: oError } = await supabase.from('options').insert([{ question_id: newP.id, text: 'Excelente', value: 3 }, { question_id: newP.id, text: 'Boa', value: 2 }]);
        if (oError) throw oError;
        const { data: reloadedQ, error: reloadError } = await supabase.from('questionnaires').select('*, questions(*, options(*))').eq('id', newQ.id).single();
        if (reloadError) throw reloadError;
        return reloadedQ;
    } catch (error) {
        console.error("Erro detalhado ao criar questionário padrão:", error);
        return null;
    }
}

function renderConfigurator(container, qData) {
    container.innerHTML = `
        <div class="mb-8 p-6 border-b"><label class="block text-xl font-semibold mb-2 text-gray-700">Título</label><input type="text" id="q-title" value="${qData.title}" class="w-full p-2 border rounded-lg text-2xl"></div>
        <div id="questions-list" class="space-y-6"></div>
        <button id="add-question-btn" class="mt-8 flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600">Adicionar Pergunta</button>`;
    const qList = document.getElementById('questions-list');
    qData.questions.sort((a, b) => a.position - b.position).forEach(q => qList.appendChild(createQuestionEl(q)));
    document.getElementById('q-title').addEventListener('blur', (e) => supabase.from('questionnaires').update({ title: e.target.value }).eq('id', qData.id));
    document.getElementById('add-question-btn').addEventListener('click', async () => {
        const { data } = await supabase.from('questions').insert({ questionnaire_id: qData.id, text: 'Nova Pergunta', position: qData.questions.length + 1 }).select('*, options(*)').single();
        qList.appendChild(createQuestionEl(data));
    });
}

function createQuestionEl(q) {
    const el = document.createElement('div');
    el.className = 'p-6 border rounded-xl bg-gray-50/80';
    el.innerHTML = `<div class="flex justify-between items-start mb-4"><div class="w-full"><label class="block text-sm font-medium text-gray-500 mb-1">Pergunta</label><input type="text" value="${q.text}" class="w-full p-2 border rounded-lg font-semibold text-lg question-text"></div><button class="ml-4 text-gray-400 hover:text-red-600 delete-question-btn p-2 rounded-full" title="Excluir Pergunta"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div><div class="options-list space-y-3 ml-4 border-l-2 pl-6 pt-2"></div><button class="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-800 add-option-btn">+ Adicionar Opção</button>`;
    const optionsList = el.querySelector('.options-list' );
    if (q.options) q.options.forEach(opt => optionsList.appendChild(createOptionEl(opt)));
    el.querySelector('.question-text').addEventListener('blur', (e) => supabase.from('questions').update({ text: e.target.value }).eq('id', q.id));
    el.querySelector('.delete-question-btn').addEventListener('click', async () => { if (confirm('Tem certeza?')) { await supabase.from('questions').delete().eq('id', q.id); el.remove(); } });
    el.querySelector('.add-option-btn').addEventListener('click', async () => {
        const { data } = await supabase.from('options').insert({ question_id: q.id, text: 'Nova Opção', value: 0 }).select().single();
        optionsList.appendChild(createOptionEl(data));
    });
    return el;
}

function createOptionEl(opt) {
    const el = document.createElement('div');
    el.className = 'flex items-center gap-2';
    el.innerHTML = `<input type="text" value="${opt.text}" class="w-full p-2 border rounded-lg option-text" placeholder="Texto da opção"><input type="number" value="${opt.value}" class="w-24 p-2 border rounded-lg option-value" placeholder
