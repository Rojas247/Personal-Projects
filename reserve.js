// Fuji Flame Hibachi Catering — booking request form (reserve.html only)
// This file handles the 3-step wizard: showing/hiding steps, validating
// each step, letting the guest add extra packages, building the review
// summary, calculating the estimate, and sending the final request.

(function () {
  var form = document.getElementById('reserveForm');
  if (!form) return; // this script only does anything on reserve.html

  // ---------------------------------------------------------------
  // Step navigation
  // ---------------------------------------------------------------
  var currentStep = 1;
  var totalSteps = 3;

  function showStep(stepNumber, opts) {
    var isInitialLoad = opts && opts.initial;

    for (var i = 1; i <= totalSteps; i++) {
      var panel = document.getElementById('step-' + i);
      panel.hidden = i !== stepNumber;
    }

    // update the step indicator pills
    document.querySelectorAll('.step-tag').forEach(function (tag) {
      var tagStep = parseInt(tag.getAttribute('data-step-tag'), 10);
      tag.classList.toggle('active', tagStep === stepNumber);
    });

    currentStep = stepNumber;

    // move keyboard focus + scroll so screen reader / keyboard users land
    // on the new step instead of staying where they were — but skip this
    // on the very first page load, so the page doesn't jump on its own
    if (!isInitialLoad) {
      var activePanel = document.getElementById('step-' + stepNumber);
      activePanel.scrollIntoView({ behavior: prefersReducedMotionSafe() ? 'auto' : 'smooth', block: 'start' });
      if (activePanel.focus) activePanel.focus();
    }

    if (stepNumber === 3) {
      buildReview();
      recalcEstimate();
    }
  }

  function prefersReducedMotionSafe() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // "Next" buttons: validate the current step first, then move on
  document.querySelectorAll('[data-next]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = parseInt(btn.getAttribute('data-next'), 10);
      var ok = currentStep === 1 ? validateStep1() : validateStep2();
      if (ok) showStep(target);
    });
  });

  // "Back" buttons: no validation needed, data is kept either way
  document.querySelectorAll('[data-back]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      showStep(parseInt(btn.getAttribute('data-back'), 10));
    });
  });

  // "Edit" links on the review step jump straight back to that step
  document.getElementById('reviewContent') && document.getElementById('reviewContent').addEventListener('click', function (event) {
    var link = event.target.closest('[data-goto-step]');
    if (!link) return;
    showStep(parseInt(link.getAttribute('data-goto-step'), 10));

    // some Edit links point at one specific field — put the cursor there
    var focusField = link.getAttribute('data-focus-field');
    var fieldEl = focusField && document.getElementById(focusField);
    if (fieldEl) fieldEl.focus({ preventScroll: true });
  });

  // ---------------------------------------------------------------
  // Inline validation helpers (no alert() popups)
  // ---------------------------------------------------------------
  function showError(key, message) {
    var errorEl = document.getElementById('error-' + key);
    var fieldEl = document.getElementById('field-' + key);
    if (errorEl) errorEl.textContent = message;
    if (fieldEl) fieldEl.classList.add('has-error');
  }

  function clearError(key) {
    var errorEl = document.getElementById('error-' + key);
    var fieldEl = document.getElementById('field-' + key);
    if (errorEl) errorEl.textContent = '';
    if (fieldEl) fieldEl.classList.remove('has-error');
  }

  function validateRequiredInput(key, input, label) {
    if (!input.value.trim()) {
      showError(key, label + ' is required.');
      return false;
    }
    if (!input.checkValidity()) {
      showError(key, 'Please enter a valid ' + label.toLowerCase() + '.');
      return false;
    }
    clearError(key);
    return true;
  }

  function validateStep1() {
    var valid = true;

    valid = validateRequiredInput('firstName', document.getElementById('res-first-name'), 'First name') && valid;
    valid = validateRequiredInput('lastName', document.getElementById('res-last-name'), 'Last name') && valid;
    valid = validateRequiredInput('email', document.getElementById('res-email'), 'Email') && valid;
    valid = validateRequiredInput('phone', document.getElementById('res-phone'), 'Phone') && valid;
    valid = validateRequiredInput('eventLocation', document.getElementById('res-location'), 'Event location') && valid;
    valid = validateRequiredInput('eventDate', document.getElementById('res-date'), 'Date of service') && valid;

    var occasionChecked = form.querySelector('input[name="occasion"]:checked');
    if (!occasionChecked) {
      showError('occasion', 'Please choose an occasion.');
      valid = false;
    } else {
      clearError('occasion');
      if (occasionChecked.value === 'Other') {
        var otherInput = document.getElementById('res-occasion-other-text');
        if (!otherInput.value.trim()) {
          showError('occasionOther', 'Please describe the occasion.');
          valid = false;
        } else {
          clearError('occasionOther');
        }
      }
    }

    return valid;
  }

  function validateStep2() {
    var valid = true;

    document.querySelectorAll('.package-group').forEach(function (group) {
      var index = group.getAttribute('data-group-index');
      var packageChecked = group.querySelector('input[name="package-' + index + '"]:checked');
      var guestsInput = document.getElementById('guests-' + index);

      if (!packageChecked) {
        showError('package-' + index, 'Please choose a package.');
        valid = false;
      } else {
        clearError('package-' + index);
      }

      if (!guestsInput.value || parseInt(guestsInput.value, 10) < 1) {
        showError('guests-' + index, 'Please enter at least 1 guest.');
        valid = false;
      } else {
        clearError('guests-' + index);
      }
    });

    return valid;
  }

  function validateStep3() {
    var confirmBox = document.getElementById('res-confirm');
    if (!confirmBox.checked) {
      showError('confirmRequest', 'Please check this box to continue.');
      return false;
    }
    clearError('confirmRequest');
    return true;
  }

  // ---------------------------------------------------------------
  // Set the date field's minimum to today, so a past date can't be picked
  // ---------------------------------------------------------------
  var dateInput = document.getElementById('res-date');
  if (dateInput) {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    dateInput.min = yyyy + '-' + mm + '-' + dd;
  }

  // ---------------------------------------------------------------
  // "Other" occasion — show the extra text field only when picked
  // ---------------------------------------------------------------
  var otherField = document.getElementById('otherOccasionField');
  form.querySelectorAll('input[name="occasion"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      otherField.hidden = radio.value !== 'Other' || !radio.checked;
    });
  });

  // ---------------------------------------------------------------
  // Accent colour — show the chosen name + store its hex code
  // ---------------------------------------------------------------
  var accentChosenText = document.getElementById('accentColourChosen');
  var accentHexField = document.getElementById('accentColourHex');

  form.querySelectorAll('input[name="accentColour"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      accentChosenText.innerHTML = 'Accent Colour: <strong>' + radio.value + '</strong>';
      accentHexField.value = radio.getAttribute('data-hex');
    });
  });

  // ---------------------------------------------------------------
  // Allergies / comments / special requests — live "0 / 1000" character counter
  // ---------------------------------------------------------------
  var commentsInput = document.getElementById('res-comments');
  var commentsCounter = document.getElementById('commentsCounter');

  function updateCommentsCounter() {
    if (!commentsInput || !commentsCounter) return;
    var max = parseInt(commentsInput.getAttribute('maxlength'), 10) || 1000;
    var length = commentsInput.value.length;
    commentsCounter.textContent = length + ' / ' + max;
    commentsCounter.classList.toggle('is-near-limit', max - length < 50);
  }

  if (commentsInput) {
    commentsInput.addEventListener('input', updateCommentsCounter);
    updateCommentsCounter(); // in case the browser restored a value
  }

  function getTrimmedComments() {
    return commentsInput ? commentsInput.value.trim() : '';
  }

  // ---------------------------------------------------------------
  // Package groups — "Add Another Package" / remove / price lookup
  // ---------------------------------------------------------------
  // Keep this list in sync with the package cards in reserve.html —
  // it's only used to build NEW package groups when the guest clicks
  // "Add Another Package".
  var PACKAGES = [
    { id: 'classic', num: '01', name: 'Fuji Classic', price: 65, items: 'Steak, Chicken, Shrimp' },
    { id: 'seafood', num: '02', name: 'Fuji Seafood Signature', price: 115, items: 'Lobster, Shrimp, Salmon, Scallops' },
    { id: 'samurai', num: '03', name: 'Fuji Samurai', price: 85, items: 'Steak, Shrimp, Lobster' },
    { id: 'kids', num: '04', name: 'Fuji Kids', price: 42, items: 'Chicken, Steak, Shrimp' },
    { id: 'veg', num: '05', name: 'Fuji Vegetarian', price: 38, items: 'Tofu Teriyaki, Mushrooms, Zucchini, Broccoli, Carrots, Onions & Bell Peppers' }
  ];

  var groupsContainer = document.getElementById('packageGroups');
  var addGroupBtn = document.getElementById('addGroupBtn');
  var groupCounter = 1; // group 0 already exists in the HTML

  function buildPackageGroupHTML(index) {
    var cardsHTML = PACKAGES.map(function (pkg) {
      var inputId = 'package-' + index + '-' + pkg.id;
      return (
        '<input class="package-radio-input visually-hidden" type="radio" name="package-' + index + '" id="' + inputId + '" value="' + pkg.num + ' ' + pkg.name + ' ($' + pkg.price + '/guest)" data-price="' + pkg.price + '">' +
        '<label class="package-radio-card" for="' + inputId + '">' +
        '<span class="pkg-num">' + pkg.num + '</span>' +
        '<p class="pkg-name">' + pkg.name + '</p>' +
        '<span class="pkg-price">$' + pkg.price + ' / guest</span>' +
        '<p class="pkg-items">' + pkg.items + '</p>' +
        '</label>'
      );
    }).join('');

    return (
      '<div class="package-group" data-group-index="' + index + '">' +
      '<div class="package-group-head">' +
      '<h3>Package Group ' + (index + 1) + '</h3>' +
      '<button type="button" class="remove-group-btn" data-remove-group="' + index + '">Remove</button>' +
      '</div>' +
      '<div class="package-radio-grid" role="radiogroup" aria-label="Package for group ' + (index + 1) + '">' + cardsHTML + '</div>' +
      '<span class="field-error" id="error-package-' + index + '"></span>' +
      '<div class="field" id="field-guests-' + index + '" style="max-width:220px;">' +
      '<label for="guests-' + index + '">Number of Guests<span class="required-mark">*</span></label>' +
      '<input type="number" name="guests-' + index + '" id="guests-' + index + '" min="1" required>' +
      '<span class="field-error" id="error-guests-' + index + '"></span>' +
      '</div>' +
      '</div>'
    );
  }

  if (addGroupBtn) {
    addGroupBtn.addEventListener('click', function () {
      var wrapper = document.createElement('div');
      wrapper.innerHTML = buildPackageGroupHTML(groupCounter);
      groupsContainer.appendChild(wrapper.firstElementChild);
      groupCounter++;
    });
  }

  // remove-group buttons are added dynamically, so listen on the container
  if (groupsContainer) {
    groupsContainer.addEventListener('click', function (event) {
      var removeBtn = event.target.closest('[data-remove-group]');
      if (removeBtn) {
        var group = removeBtn.closest('.package-group');
        if (group) group.remove();
      }
    });
  }

  // ---------------------------------------------------------------
  // Estimate total = guests x package price, added up across groups
  // ---------------------------------------------------------------
  function recalcEstimate() {
    var total = 0;

    document.querySelectorAll('.package-group').forEach(function (group) {
      var index = group.getAttribute('data-group-index');
      var checkedPackage = group.querySelector('input[name="package-' + index + '"]:checked');
      var guestsInput = document.getElementById('guests-' + index);
      var guests = guestsInput ? parseInt(guestsInput.value, 10) || 0 : 0;

      if (checkedPackage) {
        var price = parseFloat(checkedPackage.getAttribute('data-price')) || 0;
        total += price * guests;
      }
    });

    var totalText = document.getElementById('estimateTotalText');
    var totalField = document.getElementById('estimateTotalField');
    if (totalText) totalText.textContent = '$' + total.toLocaleString() + ' estimated';
    if (totalField) totalField.value = '$' + total.toLocaleString();

    return total;
  }

  // ---------------------------------------------------------------
  // Build the read-only review shown on step 3
  // ---------------------------------------------------------------
  // turns user-typed text into safe plain text before it goes into innerHTML
  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function row(label, value) {
    return '<div class="review-row"><span>' + label + '</span><span>' + (value ? escapeHTML(value) : '—') + '</span></div>';
  }

  function buildReview() {
    var container = document.getElementById('reviewContent');
    if (!container) return;

    // ---- event info section ----
    var occasionChecked = form.querySelector('input[name="occasion"]:checked');
    var occasionValue = occasionChecked ? occasionChecked.value : '';
    if (occasionValue === 'Other') {
      var otherText = document.getElementById('res-occasion-other-text').value.trim();
      if (otherText) occasionValue = 'Other (' + otherText + ')';
    }

    var linenChecked = form.querySelector('input[name="linen"]:checked');
    var accentChecked = form.querySelector('input[name="accentColour"]:checked');

    var eventInfoHTML =
      '<div class="review-section">' +
      '<div class="review-section-head"><h3>Event Information</h3><button type="button" class="review-edit-link" data-goto-step="1">Edit</button></div>' +
      row('Name', document.getElementById('res-first-name').value + ' ' + document.getElementById('res-last-name').value) +
      row('Email', document.getElementById('res-email').value) +
      row('Phone', document.getElementById('res-phone').value) +
      row('Location', document.getElementById('res-location').value) +
      row('Date', document.getElementById('res-date').value) +
      row('Occasion', occasionValue) +
      row('Setup &amp; Linen', linenChecked ? linenChecked.value : '') +
      row('Accent Colour', accentChecked ? accentChecked.value + ' (' + accentChecked.getAttribute('data-hex') + ')' : 'Not selected') +
      '</div>';

    // ---- service & menu section ----
    var packageLines = '';
    document.querySelectorAll('.package-group').forEach(function (group) {
      var index = group.getAttribute('data-group-index');
      var checkedPackage = group.querySelector('input[name="package-' + index + '"]:checked');
      var guestsInput = document.getElementById('guests-' + index);
      var guests = guestsInput ? guestsInput.value : '';
      var pkgName = checkedPackage ? checkedPackage.value : 'Not selected';
      packageLines += row('Package Group ' + (parseInt(index, 10) + 1), pkgName + ' × ' + (guests || '0') + ' guests');
    });

    var sauces = Array.prototype.map.call(form.querySelectorAll('input[name="sauces"]:checked'), function (el) { return el.value; });

    var serviceHTML =
      '<div class="review-section">' +
      '<div class="review-section-head"><h3>Service &amp; Menu</h3><button type="button" class="review-edit-link" data-goto-step="2">Edit</button></div>' +
      packageLines +
      row('House Sauces', sauces.length ? sauces.join(', ') : 'None selected') +
      '</div>';

    container.innerHTML = eventInfoHTML + serviceHTML;
    container.appendChild(buildCommentsReview());
  }

  // the visitor's comment is built with DOM nodes + textContent only (never
  // innerHTML), so any HTML or script they type shows up as plain text
  function buildCommentsReview() {
    var section = document.createElement('div');
    section.className = 'review-section';

    var head = document.createElement('div');
    head.className = 'review-section-head';

    var heading = document.createElement('h3');
    heading.textContent = 'Allergies, Comments or Special Requests';

    var editLink = document.createElement('button');
    editLink.type = 'button';
    editLink.className = 'review-edit-link';
    editLink.setAttribute('data-goto-step', '2');
    editLink.setAttribute('data-focus-field', 'res-comments');
    editLink.setAttribute('aria-label', 'Edit allergies, comments or special requests');
    editLink.textContent = 'Edit';

    head.appendChild(heading);
    head.appendChild(editLink);

    var comments = getTrimmedComments();
    var body = document.createElement('p');
    body.className = 'review-comments' + (comments ? '' : ' is-empty');
    body.textContent = comments || 'No additional comments';

    section.appendChild(head);
    section.appendChild(body);
    return section;
  }

  // ---------------------------------------------------------------
  // Final submit — same Formspree pattern used on the other forms
  // ---------------------------------------------------------------
  var statusEl = document.getElementById('reserveStatus');
  var submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (!validateStep3()) return;

    // build a plain-text summary so the email notification is easy to read,
    // in addition to the individual named fields already in the form
    var total = recalcEstimate();
    var occasionChecked = form.querySelector('input[name="occasion"]:checked');
    var linenChecked = form.querySelector('input[name="linen"]:checked');
    var accentChecked = form.querySelector('input[name="accentColour"]:checked');
    var sauces = Array.prototype.map.call(form.querySelectorAll('input[name="sauces"]:checked'), function (el) { return el.value; });

    var summaryLines = [
      'BOOKING REQUEST — Fuji Flame Hibachi Catering',
      'Name: ' + document.getElementById('res-first-name').value + ' ' + document.getElementById('res-last-name').value,
      'Email: ' + document.getElementById('res-email').value,
      'Phone: ' + document.getElementById('res-phone').value,
      'Location: ' + document.getElementById('res-location').value,
      'Date: ' + document.getElementById('res-date').value,
      'Occasion: ' + (occasionChecked ? occasionChecked.value : ''),
      'Setup & Linen: ' + (linenChecked ? linenChecked.value : ''),
      'Accent Colour: ' + (accentChecked ? accentChecked.value + ' (' + accentChecked.getAttribute('data-hex') + ')' : 'Not selected')
    ];

    document.querySelectorAll('.package-group').forEach(function (group) {
      var index = group.getAttribute('data-group-index');
      var checkedPackage = group.querySelector('input[name="package-' + index + '"]:checked');
      var guestsInput = document.getElementById('guests-' + index);
      summaryLines.push('Package Group ' + (parseInt(index, 10) + 1) + ': ' + (checkedPackage ? checkedPackage.value : 'Not selected') + ' x ' + (guestsInput ? guestsInput.value : '0') + ' guests');
    });

    summaryLines.push('House Sauces: ' + (sauces.length ? sauces.join(', ') : 'None selected'));
    var comments = getTrimmedComments();
    summaryLines.push('Allergies / Comments / Special Requests: ' + (comments || 'No additional comments'));
    summaryLines.push('Estimated Total: $' + total.toLocaleString() + ' (estimate only, not final)');

    document.getElementById('summaryField').value = summaryLines.join('\n');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    // send the comment trimmed (FormData would otherwise copy the raw value)
    var formData = new FormData(form);
    formData.set('comments', comments);

    fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    })
      .then(function (response) {
        if (response.ok) {
          document.querySelector('.booking').querySelector('.step-indicator').hidden = true;
          form.hidden = true;
          document.getElementById('bookingThanks').hidden = false;
        } else {
          statusEl.textContent = 'Something went wrong sending this — please try again, or contact us directly.';
          statusEl.hidden = false;
        }
      })
      .catch(function () {
        statusEl.textContent = 'Something went wrong sending this — please try again, or contact us directly.';
        statusEl.hidden = false;
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Request';
      });
  });

  // start on step 1 (no scroll/focus jump on first load)
  showStep(1, { initial: true });
})();
