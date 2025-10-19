const toggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('nav-menu');
    toggle.addEventListener('click', () => {
      nav.classList.toggle('active');
      toggle.classList.toggle('open');
    });