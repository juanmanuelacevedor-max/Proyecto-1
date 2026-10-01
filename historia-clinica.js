const STORAGE_KEY = 'lucky-dogs-registry';
const petId = Number(new URLSearchParams(window.location.search).get('petId'));

const petNameEl = document.querySelector('#pet-name');
const petMetaEl = document.querySelector('#pet-meta');
const historyInput = document.querySelector('#clinical-history');
const vaccineList = document.querySelector('#vaccine-list');
const messageEl = document.querySelector('#message');
const backButton = document.querySelector('#back-button');
const cancelButton = document.querySelector('#cancel-button');
const saveButton = document.querySelector('#save-button');
const addVaccineButton = document.querySelector('#add-vaccine');

let dog = null;

function loadDogs() {
  try {
    const savedDogs = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(savedDogs) ? savedDogs : [];
  } catch {
    return [];
  }
}

function saveDogs(dogs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dogs));
}

function getDog() {
  const dogs = loadDogs();
  dog = dogs.find((item) => Number(item.id) === petId) || null;
  return dog;
}

function renderPetDetails() {
  const currentDog = getDog();
  if (!currentDog) {
    petNameEl.textContent = 'Mascota no encontrada';
    petMetaEl.textContent = 'Regresa al registro e intenta de nuevo.';
    historyInput.disabled = true;
    addVaccineButton.disabled = true;
    saveButton.disabled = true;
    return;
  }

  petNameEl.textContent = currentDog.dogName;
  petMetaEl.textContent = `${currentDog.petType || 'Mascota'} · ${currentDog.breed || 'Sin raza'} · ${currentDog.sex || 'Sexo no especificado'}`;
  historyInput.value = currentDog.clinicalHistory || '';
  renderVaccines(currentDog.vaccines || []);
}

function createVaccineItem(vaccine = { vaccineName: '', lastVaccineDate: '' }) {
  const item = document.createElement('div');
  item.className = 'vaccine-item';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = vaccine.vaccineName || '';
  nameInput.placeholder = 'Nombre de la vacuna';
  nameInput.setAttribute('aria-label', 'Nombre de la vacuna');

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = vaccine.lastVaccineDate || '';
  dateInput.setAttribute('aria-label', 'Fecha de última vacuna');

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'button button-danger';
  deleteButton.textContent = 'Eliminar';
  deleteButton.addEventListener('click', () => {
    item.remove();
    showMessage('Vacuna eliminada.');
  });

  item.appendChild(nameInput);
  item.appendChild(dateInput);
  item.appendChild(deleteButton);
  return item;
}

function renderVaccines(vaccines) {
  vaccineList.innerHTML = '';
  if (!vaccines.length) {
    const empty = document.createElement('div');
    empty.style.color = '#5d6f7d';
    empty.style.fontSize = '14px';
    empty.textContent = 'Todavía no hay vacunas registradas.';
    vaccineList.appendChild(empty);
    return;
  }

  vaccines.forEach((vaccine) => {
    vaccineList.appendChild(createVaccineItem(vaccine));
  });
}

function addVaccineField() {
  vaccineList.querySelector('div[style*="color: rgb(93, 111, 125)"]')?.remove();
  vaccineList.appendChild(createVaccineItem());
}

function getVaccinesFromForm() {
  const items = [...vaccineList.querySelectorAll('.vaccine-item')];
  return items
    .map((item) => {
      const inputs = item.querySelectorAll('input');
      const vaccineName = inputs[0]?.value.trim() || '';
      const lastVaccineDate = inputs[1]?.value || '';

      if (!vaccineName && !lastVaccineDate) {
        return null;
      }

      return { vaccineName, lastVaccineDate };
    })
    .filter(Boolean);
}

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.style.color = isError ? '#d85d5d' : '#0f7a77';
}

function saveHistory() {
  if (!dog) {
    showMessage('No se pudo guardar la historia clínica.', true);
    return;
  }

  const dogs = loadDogs();
  const index = dogs.findIndex((item) => Number(item.id) === petId);
  if (index === -1) {
    showMessage('No se encontró la mascota.', true);
    return;
  }

  dogs[index] = {
    ...dogs[index],
    clinicalHistory: historyInput.value.trim(),
    vaccines: getVaccinesFromForm()
  };

  saveDogs(dogs);
  dog = dogs[index];
  showMessage('Historia clínica guardada correctamente.');
}

backButton.addEventListener('click', () => {
  window.close();
  if (!window.closed) {
    window.location.href = 'index.html';
  }
});

cancelButton.addEventListener('click', () => {
  window.location.href = 'index.html';
});

saveButton.addEventListener('click', saveHistory);
addVaccineButton.addEventListener('click', addVaccineField);

renderPetDetails();
