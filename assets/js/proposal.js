(() => {
  const request = async (url, body, csrf = '', idempotency = '') => {
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers['X-E7-CSRF'] = csrf;
    if (idempotency) headers['Idempotency-Key'] = idempotency;
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify(body),
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
      e7_otp_destination: ['Informe um e-mail ou telefone válido.', 'Enter a valid email address or phone number.'],
      e7_acceptance_fields: ['Confira nome, e-mail, telefone e consentimento.', 'Check the name, email, phone number, and consent.'],
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
    const pair = messages[error?.code] || fallback;
    return pair[isEnglish ? 1 : 0];
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
  const methodInputs = [...form.querySelectorAll('input[name="otp_channel"]')];
  const phoneInput = form.elements.otp_phone;
  const emailInput = form.elements.otp_email;
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
  let currentStep = 0;
  let selectedChannel = '';
  let selectedDestination = '';
  let normalizedPhone = '';
  let otpRequested = false;
  let otpValidated = false;
  let sentFingerprint = '';
  const phonePicker = typeof globalThis.intlTelInput === 'function'
    ? globalThis.intlTelInput(phoneInput, {
      initialCountry: isEnglish ? 'ie' : 'br',
      allowDropdown: !phoneInput.readOnly,
      separateDialCode: true,
      strictMode: true,
      useFullscreenPopup: globalThis.matchMedia?.('(max-width: 700px)').matches ?? false,
    })
    : null;

  const syncOtpValue = () => {
    otpInput.value = otpDigitInputs.map((input) => input.value).join('');
    otpValidated = false;
  };

  const clearOtpValue = () => {
    otpDigitInputs.forEach((input) => {
      input.value = '';
    });
    syncOtpValue();
  };

  const fillOtpDigits = (value, startIndex = 0) => {
    const digits = value.replace(/\D/g, '').slice(0, otpDigitInputs.length - startIndex);
    if (digits === '') return;
    [...digits].forEach((digit, offset) => {
      otpDigitInputs[startIndex + offset].value = digit;
    });
    syncOtpValue();
    otpDigitInputs[Math.min(startIndex + digits.length, otpDigitInputs.length - 1)].focus();
  };

  const resetOtpState = () => {
    otpRequested = false;
    otpValidated = false;
    sentFingerprint = '';
    selectedDestination = '';
    clearOtpValue();
  };

  const maskDestination = (destination, channel) => {
    if (channel === 'email') {
      const [local, domain] = destination.split('@');
      return `${local.slice(0, 1)}***@${domain}`;
    }
    return `${destination.slice(0, Math.min(3, destination.length - 4))}••••${destination.slice(-4)}`;
  };

  const currentFingerprint = () => `${selectedChannel}|${selectedDestination}`;

  const validateContacts = () => {
    emailInput.value = emailInput.value.trim();
    if (!emailInput.checkValidity()) {
      emailInput.reportValidity();
      return false;
    }

    const fallbackPhone = phoneInput.value.replace(/[\s()-]/g, '');
    const validPhone = phonePicker ? phonePicker.isValidNumber() === true : /^\+[1-9]\d{7,14}$/.test(fallbackPhone);
    phoneInput.setCustomValidity(validPhone ? '' : (isEnglish ? 'Enter a valid international phone number.' : 'Informe um telefone internacional válido.'));
    if (!validPhone) {
      phoneInput.reportValidity();
      return false;
    }
    normalizedPhone = phonePicker ? phonePicker.getNumber() : fallbackPhone;
    return true;
  };

  const selectDestination = () => {
    selectedDestination = selectedChannel === 'email' ? emailInput.value : normalizedPhone;
  };

  const showStep = (index, moveFocus = true) => {
    currentStep = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((step, stepIndex) => {
      step.hidden = stepIndex !== currentStep;
    });
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
    status.textContent = '';
    if (moveFocus) {
      const target = steps[currentStep].querySelector('input:not([type="hidden"]), button, h2');
      if (target instanceof HTMLElement) {
        if (target.matches('h2')) target.tabIndex = -1;
        target.focus();
      }
    }
  };

  openButton.addEventListener('click', () => {
    showStep(0, false);
    dialog.showModal();
    const firstInput = steps[0].querySelector('input');
    if (firstInput instanceof HTMLElement) firstInput.focus();
  });

  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  methodInputs.forEach((input) => input.addEventListener('change', () => {
    if (selectedChannel !== input.value) resetOtpState();
    selectedChannel = input.value;
  }));
  [phoneInput, emailInput].forEach((input) => input.addEventListener('input', () => {
    if (sentFingerprint !== '') resetOtpState();
    input.setCustomValidity('');
  }));
  phoneInput.addEventListener('countrychange', () => {
    if (sentFingerprint !== '') resetOtpState();
    phoneInput.setCustomValidity('');
  });
  otpDigitInputs.forEach((input, index) => {
    input.addEventListener('focus', () => input.select());
    input.addEventListener('input', () => {
      const digits = input.value.replace(/\D/g, '');
      input.value = '';
      if (digits !== '') {
        fillOtpDigits(digits, index);
      } else {
        syncOtpValue();
      }
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
        event.preventDefault();
        otpDigitInputs[index - 1].focus();
      } else if (event.key === 'ArrowRight' && index < otpDigitInputs.length - 1) {
        event.preventDefault();
        otpDigitInputs[index + 1].focus();
      }
    });
  });

  const invalidFieldInCurrentStep = () => {
    const invalid = [...steps[currentStep].querySelectorAll('input, select, textarea')]
      .find((field) => !field.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return true;
    }
    return false;
  };

  const sendOtp = async (advanceToCode) => {
    nextButton.disabled = true;
    resendButton.disabled = true;
    status.textContent = isEnglish ? 'Sending code…' : 'Enviando código…';
    try {
      const payload = await request(`${restUrl}/otp/send`, {
        channel: selectedChannel,
        destination: selectedDestination,
      }, csrf);
      otpRequested = true;
      otpValidated = false;
      sentFingerprint = currentFingerprint();
      clearOtpValue();
      maskedDestination.textContent = maskDestination(selectedDestination, selectedChannel);
      if (advanceToCode) showStep(2);
      status.textContent = payload.dev_code
        ? `${isEnglish ? 'Local environment — code' : 'Ambiente local — código'}: ${payload.dev_code}`
        : (isEnglish ? 'Code sent. Check the contact entered.' : 'Código enviado. Verifique o contato informado.');
      otpDigitInputs[0].focus();
      return true;
    } catch (error) {
      status.textContent = localizedError(error, isEnglish, 'otp');
      return false;
    } finally {
      nextButton.disabled = false;
      resendButton.disabled = false;
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
      showStep(3);
    } catch (error) {
      otpValidated = false;
      status.textContent = localizedError(error, isEnglish, 'verify');
    } finally {
      nextButton.disabled = false;
    }
  };

  nextButton.addEventListener('click', async () => {
    if (invalidFieldInCurrentStep()) return;

    if (currentStep === 0) {
      if (!validateContacts()) return;
    } else if (currentStep === 1) {
      selectedChannel = form.elements.otp_channel.value;
      selectDestination();
      if (otpRequested && sentFingerprint === currentFingerprint()) {
        showStep(2);
        return;
      }
      await sendOtp(true);
      return;
    } else if (currentStep === 2) {
      if (otpValidated) {
        showStep(3);
      } else {
        await verifyOtp();
      }
      return;
    }

    showStep(currentStep + 1);
  });

  prevButton.addEventListener('click', () => showStep(currentStep - 1));

  resendButton.addEventListener('click', () => sendOtp(false));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (currentStep !== steps.length - 1 || !otpValidated) {
      status.textContent = isEnglish ? 'Validate the code before accepting.' : 'Valide o código antes de aceitar.';
      return;
    }
    submitButton.disabled = true;
    status.textContent = isEnglish ? 'Recording acceptance…' : 'Registrando aceite…';
    const data = new FormData(form);
    const idempotency = globalThis.crypto?.randomUUID?.() || `e7_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    try {
      const payload = await request(`${restUrl}/accept`, {
        name: data.get('name'),
        role: '',
        company: data.get('company'),
        email: emailInput.value,
        phone: normalizedPhone,
        otp: data.get('otp'),
        consent: data.get('consent') === 'on',
      }, csrf, idempotency);
      const mark = document.createElement('div');
      mark.className = 'success-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = '✓';
      const eyebrow = document.createElement('p');
      eyebrow.className = 'eyebrow';
      eyebrow.textContent = isEnglish ? 'Proposal accepted successfully' : 'Proposta aceita com sucesso';
      const title = document.createElement('h2');
      title.textContent = isEnglish ? 'Acceptance recorded' : 'Aceite registrado';
      const lead = document.createElement('p');
      lead.className = 'completion-lead';
      lead.textContent = isEnglish
        ? 'Thank you for confirming this proposal. Your acceptance has been securely recorded and is now part of this document’s audit trail.'
        : 'Obrigado por confirmar esta proposta. Seu aceite foi registrado com segurança e passou a fazer parte do histórico deste documento.';
      const summary = document.createElement('div');
      summary.className = 'completion-summary';
      const summaryTitle = document.createElement('p');
      summaryTitle.className = 'completion-summary-title';
      summaryTitle.textContent = isEnglish ? 'Next steps' : 'Próximos passos';
      const summaryText = document.createElement('p');
      summaryText.textContent = isEnglish
        ? 'The final copy includes the acceptance details and remains available for download and validation.'
        : 'A cópia final reúne os dados do aceite e fica disponível para download e validação.';
      const deliveryNote = document.createElement('p');
      deliveryNote.className = 'completion-note';
      deliveryNote.textContent = isEnglish
        ? 'Even if email delivery is delayed or fails, the acceptance remains valid and recorded.'
        : 'Mesmo que a entrega por e-mail atrase ou falhe, o aceite continua válido e registrado.';
      summary.append(summaryTitle, summaryText, deliveryNote);
      const completion = document.createElement('div');
      completion.className = 'gate-card completion';
      const actions = document.createElement('div');
      actions.className = 'actions';
      const verify = document.createElement('a');
      verify.className = 'button-secondary';
      verify.href = payload.verify_url;
      verify.textContent = isEnglish ? 'Validate document' : 'Validar documento';
      const download = document.createElement('a');
      download.className = 'button-primary';
      download.href = payload.download_url;
      download.textContent = isEnglish ? 'Download final copy' : 'Baixar cópia final';
      actions.append(verify, download);
      completion.append(mark, eyebrow, title, lead, summary, actions);
      if (dialog.open) dialog.close();
      flow.replaceChildren(completion);
      flow.tabIndex = -1;
      flow.focus();
    } catch (error) {
      status.textContent = localizedError(error, isEnglish, 'accept');
      submitButton.disabled = false;
    }
  });
})();
