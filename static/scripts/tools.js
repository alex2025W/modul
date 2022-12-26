const els = document.getElementsByClassName('collapser');

let i = els.length; while(i--) {
  els[i].addEventListener('click', e => {
    e.currentTarget.classList.toggle('collapsed');
    e.currentTarget.nextElementSibling.classList.toggle('collapsed');
  })
}

$('.small-menu .dropdown').on('click', function() {
  if (!$(this).hasClass('open')) $(document.body).addClass('menu-active');
  else $(document.body).removeClass('menu-active');
})
$('.user-menu > .dropdown').on('click', function() {
  if (!$(this).hasClass('open')) $(document.body).addClass('menu-active');
  else $(document.body).removeClass('menu-active');
})
