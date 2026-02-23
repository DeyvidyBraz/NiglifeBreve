const form = document.querySelector("#waitlist-form");
const submitButton = document.querySelector("#submit-button");

const fields = {
  name: document.querySelector("#name"),
  email: document.querySelector("#email"),
  phone: document.querySelector("#phone"),
  website: document.querySelector("#website")
};

const errors = {
  name: document.querySelector("#name-error"),
  email: document.querySelector("#email-error"),
  phone: document.querySelector("#phone-error"),
  form: document.querySelector("#form-error")
};

const successNode = document.querySelector("#form-success");
const MOCK_STORE_KEY = "niglife_waitlist_preview";
const isFileProtocol = window.location.protocol === "file:";

function normalizeEmail(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return "";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(value) ? value : null;
}

function normalizePhone(raw) {
  const value = String(raw || "").replace(/\D/g, "");
  if (!value) return "";
  return value.length === 11 ? value : null;
}

function formatPhoneInput(raw) {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 11);

  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function clearMessages() {
  errors.name.textContent = "";
  errors.email.textContent = "";
  errors.phone.textContent = "";
  errors.form.textContent = "";
  successNode.textContent = "";

  fields.name.removeAttribute("aria-invalid");
  fields.email.removeAttribute("aria-invalid");
  fields.phone.removeAttribute("aria-invalid");
}

function setFieldError(fieldName, message) {
  errors[fieldName].textContent = message;
  fields[fieldName].setAttribute("aria-invalid", "true");
}

function setSuccessMessage(message) {
  successNode.textContent = message;
}

function setFormLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Enviando..." : "Quero ser o primeiro";
}

function hasFirebaseRuntime() {
  return Boolean(window.__db && window.__firestoreFns);
}

function shouldUseMockSubmit() {
  return !hasFirebaseRuntime();
}

function hasEndpointConfigured() {
  return typeof window.NIGLIFE_WAITLIST_ENDPOINT === "string" && window.NIGLIFE_WAITLIST_ENDPOINT.trim().length > 0;
}

async function waitForFirebaseReady(timeoutMs = 6000) {
  if (!window.__firebaseReadyPromise) return false;

  try {
    const ready = await Promise.race([
      window.__firebaseReadyPromise,
      new Promise((resolve) => {
        setTimeout(() => resolve(false), timeoutMs);
      })
    ]);

    return Boolean(ready);
  } catch {
    return false;
  }
}

function validatePayload(rawData) {
  const name = String(rawData.name || "").trim();
  const email = normalizeEmail(rawData.email);
  const phone = normalizePhone(rawData.phone);
  const website = String(rawData.website || "").trim();

  let hasError = false;

  if (!name) {
    setFieldError("name", "Nome obrigatório.");
    hasError = true;
  } else if (name.length < 2) {
    setFieldError("name", "Nome deve ter no mínimo 2 caracteres.");
    hasError = true;
  }

  if (!String(rawData.email || "").trim()) {
    setFieldError("email", "E-mail obrigatório.");
    hasError = true;
  } else if (email === null) {
    setFieldError("email", "E-mail inválido.");
    hasError = true;
  }

  if (!String(rawData.phone || "").trim()) {
    setFieldError("phone", "Celular obrigatório.");
    hasError = true;
  } else if (phone === null) {
    setFieldError("phone", "Use o formato (99) 99999-9999.");
    hasError = true;
  }

  if (website) {
    errors.form.textContent = "Não foi possível cadastrar agora. Tente novamente.";
    hasError = true;
  }

  return {
    hasError,
    payload: {
      name,
      email: email || null,
      phone: phone || null,
      website,
      source: "github-pages"
    }
  };
}

function getMockStore() {
  try {
    const data = JSON.parse(localStorage.getItem(MOCK_STORE_KEY) || "{}");

    return {
      emails: Array.isArray(data.emails) ? data.emails : [],
      phones: Array.isArray(data.phones) ? data.phones : []
    };
  } catch {
    return { emails: [], phones: [] };
  }
}

function setMockStore(data) {
  localStorage.setItem(MOCK_STORE_KEY, JSON.stringify(data));
}

function mockSubmit(payload) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const store = getMockStore();

      if (payload.email && store.emails.includes(payload.email)) {
        resolve({ ok: false, status: 409, code: "EMAIL_EXISTS" });
        return;
      }

      if (payload.phone && store.phones.includes(payload.phone)) {
        resolve({ ok: false, status: 409, code: "PHONE_EXISTS" });
        return;
      }

      if (payload.email) store.emails.push(payload.email);
      if (payload.phone) store.phones.push(payload.phone);

      setMockStore(store);
      resolve({ ok: true, status: 201, code: null });
    }, 500);
  });
}

async function endpointSubmit(payload) {
  const response = await fetch(window.NIGLIFE_WAITLIST_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response
    .json()
    .catch(() => ({ ok: false, code: "INVALID_RESPONSE", errors: null }));

  return {
    ok: response.ok,
    status: response.status,
    code: data?.code || null,
    data
  };
}

async function firebaseSubmit(payload) {
  const { collection, addDoc, serverTimestamp } = window.__firestoreFns;
  const collectionName = window.NIGLIFE_FIRESTORE_COLLECTION || "niglife_waitlist_coming_soon";

  const writeOperation = addDoc(collection(window.__db, collectionName), {
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    createdAt: serverTimestamp()
  });

  await Promise.race([
    writeOperation,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("FIREBASE_TIMEOUT")), 10000);
    })
  ]);

  return { ok: true, status: 201, code: null, data: {} };
}

async function submitWaitlist(payload) {
  if (isFileProtocol) {
    const response = await mockSubmit(payload);
    return { ...response, mode: "file" };
  }

  if (hasEndpointConfigured()) {
    return endpointSubmit(payload);
  }

  const firebaseReady = await waitForFirebaseReady();

  if (firebaseReady && !shouldUseMockSubmit()) {
    try {
      return await firebaseSubmit(payload);
    } catch (error) {
      console.error("Falha no submit Firebase:", error);

      if (String(error?.code || "") === "permission-denied") {
        return { ok: false, status: 403, code: "PERMISSION_DENIED", data: {} };
      }

      return { ok: false, status: 500, code: "FIREBASE_SUBMIT_ERROR", data: {} };
    }
  }

  return mockSubmit(payload);
}

async function handleSubmit(event) {
  event.preventDefault();
  clearMessages();

  const rawData = {
    name: fields.name.value,
    email: fields.email.value,
    phone: fields.phone.value,
    website: fields.website.value
  };

  const { hasError, payload } = validatePayload(rawData);
  if (hasError) return;

  setFormLoading(true);

  try {
    const response = await submitWaitlist(payload);

    if (response.ok && response.status === 201) {
      form.reset();
      if (response.mode === "file") {
        setSuccessMessage(
          "Cadastro confirmado! (Modo local de teste em file://). Para gravar no Firebase, use http://localhost ou GitHub Pages."
        );
      } else {
        setSuccessMessage("Cadastro confirmado! Vamos avisar em primeira mão.");
      }
      return;
    }

    if (response.status === 409 && response.code === "EMAIL_EXISTS") {
      setFieldError("email", "Esse e-mail já está cadastrado.");
      return;
    }

    if (response.status === 409 && response.code === "PHONE_EXISTS") {
      setFieldError("phone", "Esse celular já está cadastrado.");
      return;
    }

    if (response.status === 400 && response.code === "VALIDATION_ERROR") {
      if (response.data?.errors?.name) setFieldError("name", response.data.errors.name);
      if (response.data?.errors?.email) setFieldError("email", response.data.errors.email);
      if (response.data?.errors?.phone) setFieldError("phone", response.data.errors.phone);
      if (response.data?.errors?.contact) errors.form.textContent = response.data.errors.contact;
      return;
    }

    if (response.status === 403 && response.code === "PERMISSION_DENIED") {
      errors.form.textContent =
        "Sem permissão para gravar no Firestore. Revise as regras da coleção niglife_waitlist_coming_soon.";
      return;
    }

    errors.form.textContent = "Não foi possível cadastrar agora. Tente novamente.";
  } catch (error) {
    console.error("Erro inesperado no submit:", error);
    errors.form.textContent = "Não foi possível cadastrar agora. Tente novamente.";
  } finally {
    setFormLoading(false);
  }
}

fields.name.addEventListener("input", clearMessages);
fields.email.addEventListener("input", clearMessages);
fields.phone.addEventListener("input", () => {
  fields.phone.value = formatPhoneInput(fields.phone.value);
  clearMessages();
});

form.addEventListener("submit", handleSubmit);
