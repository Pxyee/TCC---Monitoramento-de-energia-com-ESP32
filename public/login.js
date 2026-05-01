const form = document.getElementById('loginForm');
const mensagem = document.getElementById('mensagem');

// Toggle senha (corrigido)
document.querySelectorAll('.toggle-password').forEach(button => {
  button.addEventListener('click', () => {
    const inputId = button.getAttribute('data-target');
    const input = document.getElementById(inputId);

    const icon = button.querySelector('img'); // pega o ícone certo

    if (input.type === 'password') {
      input.type = 'text';
      icon.src = 'assets/ocultarPreto.png';
    } else {
      input.type = 'password';
      icon.src = 'assets/mostrarPreto.png';
    }
  });
});

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

    const data = await response.json(); // FALTAVA ISSO

    if (data.success) {
      // salvar dados corretamente
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuarioId', data.usuarioId);
      localStorage.setItem('nomeUsuario', data.nome); // ← vem do backend

      mensagem.innerText = 'Login realizado com sucesso!';

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 800);

    } else {
      mensagem.innerText = data.error || 'Erro ao realizar login';
    }

  } catch (error) {
    console.error(error);
    mensagem.innerText = 'Erro ao conectar com o servidor';
  }
});