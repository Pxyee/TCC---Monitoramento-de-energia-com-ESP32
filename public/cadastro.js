document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', () => {
        const inputId = button.getAttribute('data-target');
        const input = document.getElementById(inputId);
    
        // pega o ícone dentro do botão clicado (não global)
        const icon = button.querySelector('img');

    if (input.type === 'password') {
        input.type = 'text';
        icon.src = 'assets/ocultarPreto.png';
    } else {
        input.type = 'password';
        icon.src = 'assets/mostrarPreto.png';
    }
    });
});


document.getElementById("cadastroForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;

    const mensagem = document.getElementById("mensagem");

    // validação de senha
    if (senha !== confirmarSenha) {
        mensagem.innerText = "As senhas não conferem!";
        mensagem.style.color = "red";
        return;
    }

    try {
        const resposta = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome,
                email,
                senha
            })
        });

        const dados = await resposta.json();

if (dados.success) {
    mensagem.innerText = "Cadastro realizado com sucesso!";
    mensagem.style.color = "green";

    // salva "sessão" simples
    localStorage.setItem("usuarioLogado", email);

    setTimeout(() => {
        window.location.href = "dashboard.html";
    }, 800);
} else if (dados.error === "Email já registrado") {
    mensagem.innerText = "Este email já está registrado. Tente outro.";
    mensagem.style.color = "red";
} else {
    mensagem.innerText = dados.error || "Erro ao realizar cadastro";
    mensagem.style.color = "red";
}

    } catch (error) {
        console.error("Erro no cadastro:", error);
        mensagem.innerText = "Erro ao conectar com o servidor";
        mensagem.style.color = "red";
    }
});