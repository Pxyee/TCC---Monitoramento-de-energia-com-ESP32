const form = document.getElementById('loginForm');
const mensagem = document.getElementById('mensagem');

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

    const data = await response.json();

    if (data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuarioId', data.usuarioId);

      mensagem.innerText = 'Login realizado com sucesso!';

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1200);
    } else {
      mensagem.innerText = data.error || 'Erro ao realizar login';
    }
  } catch (error) {
    mensagem.innerText = 'Erro ao conectar com o servidor';
  }
});
