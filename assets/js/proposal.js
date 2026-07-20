(() => {
  const request = async (url, body, csrf = '', idempotency = '') => {
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers['X-E7-CSRF'] = csrf;
    if (idempotency) headers['Idempotency-Key'] = idempotency;
    const response = await fetch(url, {
      method: 'POST', credentials: 'same-origin', headers, body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const issue = new Error('E7 request failed');
      issue.code = payload?.code || 'e7_unknown';
      throw issue;
    }
    return payload;
  };

  const localizedError = (error, isEnglish, stage) => {
    const messages = {
      e7_otp_limit: ['Limite de reenvios atingido. Tente novamente mais tarde.', 'Resend limit reached. Try again later.'],
      e7_delivery_unavailable: ['Não foi possível enviar o código. Tente novamente.', 'The code could not be sent. Try again.'],
      e7_otp_destination: ['Informe um e-mail válido.', 'Enter a valid email address.'],
      e7_acceptance_fields: ['Confira os campos obrigatórios e as confirmações.', 'Check the required fields and confirmations.'],
      e7_otp_required: ['Solicite o código antes de aceitar.', 'Request the code before accepting.'],
      e7_otp_invalid: ['Código inválido ou expirado.', 'The code is invalid or expired.'],
      e7_already_accepted: ['Esta proposta não está mais disponível para aceite.', 'This proposal is no longer available for acceptance.'],
      e7_session: ['Sua sessão expirou. Abra o link novamente.', 'Your session expired. Open the link again.'],
    };
    const fallback = stage === 'otp'
      ? ['Não foi possível enviar o código.', 'The code could not be sent.']
      : (stage === 'accept'
        ? ['Não foi possível registrar o aceite.', 'The acceptance could not be recorded.']
        : ['Não foi possível continuar com os dados informados.', 'Could not continue with the supplied details.']);
    return (messages[error?.code] || fallback)[isEnglish ? 1 : 0];
  };

  const passwordForm = document.querySelector('[data-e7-password-form]');
  if (passwordForm) {
    const isEnglish = passwordForm.dataset.locale === 'en_IE';
    passwordForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = passwordForm.querySelector('button');
      const status = passwordForm.querySelector('[data-e7-status]');
      button.disabled = true;
      status.textContent = isEnglish ? 'Checking…' : 'Verificando…';
      try {
        await request(`${passwordForm.dataset.restUrl}/access/password`, {
          code: passwordForm.dataset.code,
          password: new FormData(passwordForm).get('password'),
        });
        window.location.reload();
      } catch (error) {
        status.textContent = localizedError(error, isEnglish, 'access');
        button.disabled = false;
      }
    });
  }

  const flow = document.querySelector('[data-e7-flow]');
  if (!flow) return;
  const form = flow.querySelector('[data-e7-acceptance-form]');
  const dialog = flow.querySelector('[data-e7-dialog]');
  const openButton = flow.querySelector('[data-e7-open-dialog]');
  const closeButton = flow.querySelector('[data-e7-close-dialog]');
  const resendButton = flow.querySelector('[data-e7-resend-otp]');
  const nextButton = flow.querySelector('[data-e7-next-step]');
  const prevButton = flow.querySelector('[data-e7-prev-step]');
  const submitButton = form.querySelector('button[type="submit"]');
  const emailInput = form.elements.email || form.elements.otp_email;
  const otpInput = form.elements.otp;
  const otpDigitInputs = [...form.querySelectorAll('[data-e7-otp-digit]')];
  const maskedDestination = flow.querySelector('[data-e7-masked-destination]');
  const steps = [...flow.querySelectorAll('[data-e7-step]')];
  const progress = flow.querySelector('[data-e7-progress]');
  const progressBar = flow.querySelector('[data-e7-progress-bar]');
  const progressLabels = [...flow.querySelectorAll('.dialog-progress-labels span')];
  const status = flow.querySelector('[data-e7-status]');
  const restUrl = flow.dataset.restUrl;
  const csrf = flow.dataset.csrf;
  const isEnglish = flow.dataset.locale === 'en_IE';
  const otpEnabled = flow.dataset.e7OtpEnabled === '1';
  const irishFlow = flow.dataset.e7IrishFlow === '1';
  let currentStep = 0;
  let otpRequested = false;
  let otpValidated = false;
  let sentFingerprint = '';

  progress.setAttribute('aria-valuemax', String(steps.length));

  const phonePickers = new Map();
  if (typeof window.intlTelInput === 'function') {
    form.querySelectorAll('.e7-phone-input').forEach((input) => {
      phonePickers.set(input, window.intlTelInput(input, {
        initialCountry: irishFlow ? 'ie' : 'br',
        preferredCountries: irishFlow ? ['ie', 'gb'] : ['br', 'ie'],
        nationalMode: false,
        strictMode: true,
      }));
    });
  }

  const normalizedPhone = (input) => {
    if (!input) return '';
    const picker = phonePickers.get(input);
    return picker ? picker.getNumber() : input.value.trim();
  };

  const setRequired = (container, names, required) => {
    names.forEach((name) => {
      const input = form.elements[name];
      if (input) input.required = required;
    });
    if (container) container.hidden = !required;
  };

  const vatToggle = form.elements.vat_registered;
  const vatFields = flow.querySelector('[data-e7-vat-fields]');
  const billingSame = form.elements.billing_same_as_registered;
  const billingFields = flow.querySelector('[data-e7-billing-address]');
  const payerSame = form.elements.payer_same_as_business;
  const payerFields = flow.querySelector('[data-e7-payer-fields]');
  const businessType = form.elements.business_type;
  const registration = form.elements.registration_number;

  const syncConditionals = () => {
    if (vatToggle) setRequired(vatFields, ['vat_number'], vatToggle.checked);
    if (billingSame) setRequired(billingFields, ['billing_line1', 'billing_city', 'billing_eircode'], !billingSame.checked);
    if (payerSame) setRequired(payerFields, ['payer_legal_name'], !payerSame.checked);
    if (businessType && registration) registration.required = businessType.value === 'company';
  };
  [vatToggle, billingSame, payerSame, businessType].filter(Boolean)
    .forEach((input) => input.addEventListener('change', syncConditionals));
  syncConditionals();

  const syncOtpValue = () => {
    if (!otpInput) return;
    otpInput.value = otpDigitInputs.map((input) => input.value).join('');
    otpValidated = false;
  };
  const clearOtpValue = () => {
    otpDigitInputs.forEach((input) => { input.value = ''; });
    syncOtpValue();
  };
  const fillOtpDigits = (value, startIndex = 0) => {
    const digits = value.replace(/\D/g, '').slice(0, otpDigitInputs.length - startIndex);
    if (digits === '') return;
    [...digits].forEach((digit, offset) => { otpDigitInputs[startIndex + offset].value = digit; });
    syncOtpValue();
    otpDigitInputs[Math.min(startIndex + digits.length, otpDigitInputs.length - 1)]?.focus();
  };
  const resetOtpState = () => {
    otpRequested = false;
    otpValidated = false;
    sentFingerprint = '';
    clearOtpValue();
  };
  const maskDestination = (destination) => {
    const [local, domain] = destination.split('@');
    return `${local.slice(0, 1)}***@${domain}`;
  };
  const currentFingerprint = () => `email|${emailInput.value.trim().toLowerCase()}`;

  const validateContact = () => {
    emailInput.value = emailInput.value.trim();
    if (!emailInput.checkValidity()) {
      emailInput.reportValidity();
      return false;
    }
    const requiredPhone = form.elements.phone;
    if (requiredPhone?.required && !/^\+[1-9]\d{7,14}$/.test(normalizedPhone(requiredPhone))) {
      requiredPhone.setCustomValidity(isEnglish ? 'Enter an international phone number.' : 'Informe um telefone internacional.');
      requiredPhone.reportValidity();
      return false;
    }
    requiredPhone?.setCustomValidity('');
    return true;
  };

  const addressFromForm = (prefix) => ({
    line1: form.elements[`${prefix}_line1`]?.value.trim() || '',
    line2: form.elements[`${prefix}_line2`]?.value.trim() || '',
    city: form.elements[`${prefix}_city`]?.value.trim() || '',
    county: form.elements[`${prefix}_county`]?.value.trim() || '',
    eircode: form.elements[`${prefix}_eircode`]?.value.trim() || '',
    country_code: 'IE',
  });

  const buildBusinessProfile = () => {
    const registeredAddress = addressFromForm('registered');
    const sameBilling = form.elements.billing_same_as_registered.checked;
    const samePayer = form.elements.payer_same_as_business.checked;
    return {
      responsible: {
        name: form.elements.name.value.trim(),
        role: form.elements.responsible_role.value.trim(),
        email: emailInput.value.trim(),
        phone: normalizedPhone(form.elements.phone),
      },
      type: form.elements.business_type.value,
      legal_name: form.elements.legal_name.value.trim(),
      trading_name: form.elements.trading_name.value.trim(),
      registration_number: form.elements.registration_number.value.trim(),
      vat_registered: form.elements.vat_registered.checked,
      vat_number: form.elements.vat_registered.checked ? form.elements.vat_number.value.trim() : '',
      registered_address: registeredAddress,
      billing_same_as_registered: sameBilling,
      billing_address: sameBilling ? registeredAddress : addressFromForm('billing'),
      payer_same_as_business: samePayer,
      payer_legal_name: samePayer ? '' : form.elements.payer_legal_name.value.trim(),
      finance_email: form.elements.finance_email.value.trim(),
      purchase_order: form.elements.purchase_order.value.trim(),
      service_city: form.elements.service_city.value.trim(),
      domain: form.elements.domain.value.trim(),
      whatsapp: normalizedPhone(form.elements.whatsapp),
      confirmations: {
        b2b: form.elements.confirmation_b2b.checked,
        ireland: form.elements.confirmation_ireland.checked,
        accuracy: form.elements.confirmation_accuracy.checked,
      },
    };
  };

  const updateReview = () => {
    const summary = flow.querySelector('[data-e7-review-summary]');
    if (!summary || !irishFlow) return;
    const profile = buildBusinessProfile();
    const rows = [
      ['Responsible', `${profile.responsible.name}, ${profile.responsible.role}`],
      ['Contact', `${profile.responsible.email} · ${profile.responsible.phone}`],
      ['Business', profile.legal_name],
      ['Registration', profile.registration_number || 'Not supplied'],
      ['Registered address', `${profile.registered_address.line1}, ${profile.registered_address.city}, ${profile.registered_address.eircode}`],
      ['Service city', profile.service_city],
    ];
    summary.replaceChildren(...rows.map(([label, value]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = value;
      row.append(term, detail);
      return row;
    }));
  };

  const showStep = (index, moveFocus = true) => {
    currentStep = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== currentStep; });
    prevButton.hidden = currentStep === 0;
    nextButton.hidden = currentStep === steps.length - 1;
    submitButton.hidden = currentStep !== steps.length - 1;
    progress.setAttribute('aria-valuenow', String(currentStep + 1));
    progress.setAttribute('aria-valuetext', progressLabels[currentStep]?.textContent || String(currentStep + 1));
    progressBar.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
    progressLabels.forEach((label, labelIndex) => {
      label.classList.toggle('is-active', labelIndex === currentStep);
      label.classList.toggle('is-complete', labelIndex < currentStep);
    });
    if (steps[currentStep].dataset.e7StepKind === 'review') updateReview();
    status.textContent = '';
    if (moveFocus) steps[currentStep].querySelector('h2, input:not([type="hidden"]), button')?.focus();
  };

  openButton.addEventListener('click', () => {
    showStep(0, false);
    dialog.showModal();
    steps[0].querySelector('input, select, h2')?.focus();
  });
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

  emailInput.addEventListener('input', () => {
    if (sentFingerprint !== '') resetOtpState();
    emailInput.setCustomValidity('');
  });
  form.elements.phone?.addEventListener('input', () => form.elements.phone.setCustomValidity(''));
  otpDigitInputs.forEach((input, index) => {
    input.addEventListener('focus', () => input.select());
    input.addEventListener('input', () => {
      const digits = input.value.replace(/\D/g, '');
      input.value = '';
      if (digits !== '') fillOtpDigits(digits, index); else syncOtpValue();
    });
    input.addEventListener('paste', (event) => {
      const digits = event.clipboardData?.getData('text').replace(/\D/g, '') || '';
      if (digits === '') return;
      event.preventDefault();
      fillOtpDigits(digits, digits.length === otpDigitInputs.length ? 0 : index);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && input.value === '' && index > 0) {
        event.preventDefault();
        otpDigitInputs[index - 1].value = '';
        syncOtpValue();
        otpDigitInputs[index - 1].focus();
      } else if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault(); otpDigitInputs[index - 1].focus();
      } else if (event.key === 'ArrowRight' && index < otpDigitInputs.length - 1) {
        event.preventDefault(); otpDigitInputs[index + 1].focus();
      }
    });
  });

  const invalidFieldInCurrentStep = () => {
    syncConditionals();
    const invalid = [...steps[currentStep].querySelectorAll('input, select, textarea')]
      .find((field) => !field.checkValidity());
    if (!invalid) return false;
    invalid.reportValidity();
    return true;
  };

  const sendOtp = async (advanceToCode) => {
    nextButton.disabled = true;
    if (resendButton) resendButton.disabled = true;
    status.textContent = isEnglish ? 'Sending code…' : 'Enviando código…';
    try {
      const payload = await request(`${restUrl}/otp/send`, { channel: 'email', destination: emailInput.value }, csrf);
      otpRequested = true;
      otpValidated = false;
      sentFingerprint = currentFingerprint();
      clearOtpValue();
      if (maskedDestination) maskedDestination.textContent = maskDestination(emailInput.value);
      if (advanceToCode) showStep(currentStep + 1);
      status.textContent = payload.dev_code
        ? `${isEnglish ? 'Local environment — code' : 'Ambiente local — código'}: ${payload.dev_code}`
        : (isEnglish ? 'Code sent. Check the email entered.' : 'Código enviado. Verifique o e-mail informado.');
      otpDigitInputs[0]?.focus();
      return true;
    } catch (error) {
      status.textContent = localizedError(error, isEnglish, 'otp');
      return false;
    } finally {
      nextButton.disabled = false;
      if (resendButton) resendButton.disabled = false;
    }
  };

  const verifyOtp = async () => {
    if (!otpRequested || sentFingerprint !== currentFingerprint()) {
      status.textContent = isEnglish ? 'Send the code before continuing.' : 'Envie o código antes de continuar.';
      return;
    }
    nextButton.disabled = true;
    status.textContent = isEnglish ? 'Checking code…' : 'Verificando código…';
    try {
      await request(`${restUrl}/otp/verify`, { otp: otpInput.value }, csrf);
      otpValidated = true;
      showStep(currentStep + 1);
    } catch (error) {
      otpValidated = false;
      status.textContent = localizedError(error, isEnglish, 'verify');
    } finally {
      nextButton.disabled = false;
    }
  };

  nextButton.addEventListener('click', async () => {
    if (invalidFieldInCurrentStep()) return;
    if (currentStep === 0 && !validateContact()) return;
    if (!otpEnabled) {
      showStep(currentStep + 1);
      return;
    }
    if (steps[currentStep].dataset.e7StepKind === 'code') {
      if (otpValidated) showStep(currentStep + 1); else await verifyOtp();
      return;
    }
    if (steps[currentStep + 1]?.dataset.e7StepKind === 'code') {
      if (!validateContact()) return;
      if (otpRequested && sentFingerprint === currentFingerprint()) showStep(currentStep + 1);
      else await sendOtp(true);
      return;
    }
    showStep(currentStep + 1);
  });
  prevButton.addEventListener('click', () => showStep(currentStep - 1));
  resendButton?.addEventListener('click', () => sendOtp(false));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (currentStep !== steps.length - 1 || !(!otpEnabled || otpValidated)) {
      status.textContent = isEnglish ? 'Validate the code before accepting.' : 'Valide o código antes de aceitar.';
      return;
    }
    if (invalidFieldInCurrentStep() || !validateContact()) return;
    submitButton.disabled = true;
    status.textContent = isEnglish ? 'Recording acceptance…' : 'Registrando aceite…';
    const data = new FormData(form);
    const businessProfile = irishFlow ? buildBusinessProfile() : null;
    const idempotency = globalThis.crypto?.randomUUID?.() || `e7_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    try {
      const payload = await request(`${restUrl}/accept`, {
        name: data.get('name'),
        role: irishFlow ? data.get('responsible_role') : '',
        company: irishFlow ? data.get('legal_name') : data.get('company'),
        email: emailInput.value,
        phone: normalizedPhone(form.elements.phone),
        otp: otpEnabled ? data.get('otp') : '',
        consent: data.get('consent') === 'on',
        ...(irishFlow ? { business_profile: businessProfile } : {}),
      }, csrf, idempotency);
      const completedSignature = document.createElement('div');
      completedSignature.className = 'signature-inner signature-complete';
      const heading = document.createElement('div');
      heading.className = 'signature-heading';
      const title = document.createElement('h2');
      title.id = 'acceptance-title';
      title.textContent = isEnglish ? 'Signature' : 'Assinatura';
      const lead = document.createElement('p');
      lead.textContent = isEnglish
        ? 'This proposal has been securely accepted and recorded.'
        : 'Esta proposta foi aceita e registrada com segurança.';
      heading.append(title, lead);
      const signerRow = document.createElement('div');
      signerRow.className = 'signer-row';
      const signerInfo = document.createElement('div');
      signerInfo.className = 'signer-info';
      const signerName = document.createElement('strong');
      signerName.textContent = data.get('name');
      const signerEmail = document.createElement('span');
      signerEmail.textContent = emailInput.value;
      signerInfo.append(signerName, signerEmail);
      const signerActions = document.createElement('div');
      signerActions.className = 'signer-actions';
      const verify = document.createElement('a');
      verify.className = 'button-secondary';
      verify.href = payload.verify_url;
      verify.textContent = isEnglish ? 'Validate document' : 'Validar documento';
      const download = document.createElement('a');
      download.className = 'button-primary';
      download.href = payload.download_url;
      download.textContent = isEnglish ? 'Download final copy' : 'Baixar cópia final';
      signerActions.append(verify, download);
      signerRow.append(signerInfo, signerActions);
      completedSignature.append(heading, signerRow);
      if (dialog.open) dialog.close();
      flow.replaceChildren(completedSignature);
      flow.tabIndex = -1;
      flow.focus();
    } catch (error) {
      status.textContent = localizedError(error, isEnglish, 'accept');
      submitButton.disabled = false;
    }
  });
})();
