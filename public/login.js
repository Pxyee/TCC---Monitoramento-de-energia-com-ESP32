form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;

  try {
    const response = await fetch('https://voltsense.com.br/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, senha })
    });

    if (!response.ok) {
      throw new Error("Erro na requisição");
    }

    const data = await response.json();

    if (data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuarioId', data.usuarioId);
      localStorage.setItem('nomeUsuario', data.nome || 'Usuário');

      mensagem.innerText = 'Login realizado com sucesso!';
      mensagem.style.color = "green";

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 800);

    } else {
      mensagem.innerText = data.error || 'Erro ao realizar login';
      mensagem.style.color = "red";
    }

  } catch (error) {
    console.error(error);
    mensagem.innerText = 'Erro ao conectar com o servidor';
    mensagem.style.color = "red";
  }
});