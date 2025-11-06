const menu = document.querySelector('.fa-bars');
  const navLinks = document.querySelector('.nav-links');
  menu.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });