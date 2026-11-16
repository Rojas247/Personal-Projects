// Fuji Flame Hibachi Catering — shared site script (runs on every page)

var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- Mobile nav toggle ----
var navToggle = document.getElementById('navToggle');
var siteNav = document.getElementById('siteNav');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', function () {
    var isOpen = siteNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // close the mobile menu after a link is clicked
  siteNav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      siteNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ---- Image slider (home page) ----
var dots = document.querySelectorAll('.dot');
var slides = document.querySelectorAll('.slide');
var sliderSection = document.querySelector('.slider');
var currentSlide = 0;
var autoplayTimer = null;

function goToSlide(index) {
  slides.forEach(function (slide) { slide.classList.remove('active'); });
  dots.forEach(function (dot) { dot.classList.remove('active'); });
  slides[index].classList.add('active');
  dots[index].classList.add('active');
  currentSlide = index;
}

function nextSlide() {
  goToSlide((currentSlide + 1) % slides.length);
}

dots.forEach(function (dot) {
  dot.addEventListener('click', function () {
    goToSlide(parseInt(dot.getAttribute('data-index'), 10));
  });
});

if (sliderSection && slides.length > 1 && !prefersReducedMotion) {
  autoplayTimer = setInterval(nextSlide, 5000);

  // pause the slideshow while the mouse is over it
  sliderSection.addEventListener('mouseenter', function () {
    clearInterval(autoplayTimer);
  });
  sliderSection.addEventListener('mouseleave', function () {
    autoplayTimer = setInterval(nextSlide, 5000);
  });
}

// ---- Scroll-reveal animation ----
var revealEls = document.querySelectorAll('.reveal');

if (revealEls.length && !prefersReducedMotion && 'IntersectionObserver' in window) {
  var revealObserver = new IntersectionObserver(function (entries, observer) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealEls.forEach(function (el) { revealObserver.observe(el); });
} else {
  // no animation support (or reduced motion requested) — just show everything
  revealEls.forEach(function (el) { el.classList.add('is-visible'); });
}

// ---- Features section: grill photo that fades in/out as you scroll (home page) ----
// Works out where the features section is on screen and hands two numbers
// to the CSS (see ".features--fire" in style.css):
//   --bg-progress  0 → 1 → 0  : off screen → centred on screen → off screen
//   --bg-shift    +1 → 0 → -1 : below centre → centred → above centre (parallax)
// Skipped entirely for reduced motion; CSS then shows a fixed medium image.
var fireSection = document.getElementById('featuresFire');

if (fireSection && !prefersReducedMotion) {
  var fireTicking = false;

  function updateFireBackground() {
    fireTicking = false;

    var rect = fireSection.getBoundingClientRect();
    var viewHeight = window.innerHeight || document.documentElement.clientHeight;

    // distance from the section's middle to the screen's middle, scaled so
    // 1 (or -1) means "the section has just completely left the screen"
    var travel = (viewHeight + rect.height) / 2;
    var shift = (rect.top + rect.height / 2 - viewHeight / 2) / travel;
    shift = Math.max(-1, Math.min(1, shift));

    // 1 when centred, falling to 0 at the edges; smoothstep makes the
    // fade gentle at both ends instead of a straight line
    var linear = 1 - Math.abs(shift);
    var progress = linear * linear * (3 - 2 * linear);

    fireSection.style.setProperty('--bg-progress', progress.toFixed(3));
    fireSection.style.setProperty('--bg-shift', shift.toFixed(3));
  }

  // scroll can fire many times per frame — only recalculate once per frame
  function requestFireUpdate() {
    if (!fireTicking) {
      fireTicking = true;
      window.requestAnimationFrame(updateFireBackground);
    }
  }

  window.addEventListener('scroll', requestFireUpdate, { passive: true });
  window.addEventListener('resize', requestFireUpdate);
  updateFireBackground();
  // tell the CSS the script is in charge now (switches from the fixed opacity)
  fireSection.classList.add('is-scroll-driven');
}

// ---- Forms (sent to Formspree — see form action="" in the HTML) ----
function handleFormSubmit(formId, statusId, successMessage) {
  var form = document.getElementById(formId);
  var status = document.getElementById(statusId);
  if (!form || !status) return;

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

      fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    })
      .then(function (response) {
        if (response.ok) {
          status.textContent = successMessage;
          form.reset();
        } else {
          status.textContent = "Something went wrong sending this — please try again, or contact us directly.";
        }
        status.hidden = false;
      })
      .catch(function () {
        status.textContent = "Something went wrong sending this — please try again, or contact us directly.";
        status.hidden = false;
      })
      .finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
  });
}

handleFormSubmit('newsletterForm', 'newsletterStatus', "Thanks! We'll be in touch with more info soon.");
// Note: the booking form on reserve.html (id="reserveForm") has its own
// multi-step submit handling in reserve.js, so it's not wired up here.
