document.querySelectorAll('.toggle-password').forEach(button => {
  button.addEventListener('click', () => {
    const inputId = button.getAttribute('data-target');
    const input = document.getElementById(inputId);
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

  const nome = document.getElementById("nome").value; 
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  const confirmarSenha = document.getElementById("confirmarSenha").value;

  const mensagem = document.getElementById("mensagem");

  if (senha !== confirmarSenha) {
    mensagem.innerText = "As senhas não conferem!";
    mensagem.style.color = "red";
    return;
  }

  try {
    const resposta = await fetch("https://voltsense.com.br/api/auth/register", {
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

    console.log("Cadastro:", dados);

    if (dados.success) {
      mensagem.innerText = "Cadastro realizado com sucesso!";
      mensagem.style.color = "green";

      setTimeout(() => {
        window.location.href = "/login"; // fluxo correto
      }, 800);

    } else {
      mensagem.innerText = dados.error || "Erro ao cadastrar";
      mensagem.style.color = "red";
    }

  } catch (error) {
    console.error(error);
    mensagem.innerText = "Erro ao conectar com o servidor";
    mensagem.style.color = "red";
  }
});