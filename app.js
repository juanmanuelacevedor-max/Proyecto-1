const STORAGE_KEY = 'lucky-dogs-registry';

const form = document.querySelector('#dog-form');
const entryDate = document.querySelector('#entry-date');
const formMessage = document.querySelector('#form-message');
const tableBody = document.querySelector('#dogs-table-body');
const emptyState = document.querySelector('#empty-state');
const totalCount = document.querySelector('#total-count');
const lastEntry = document.querySelector('#last-entry');
const searchInput = document.querySelector('#search-input');
const openClinicButton = document.querySelector('#open-clinic-button');
const clinicModal = document.querySelector('#clinic-modal');
const clinicTitle = document.querySelector('#clinic-title');
const clinicPetName = document.querySelector('#clinic-pet-name');
const clinicPetMeta = document.querySelector('#clinic-pet-meta');
const clinicHistoryInput = document.querySelector('#clinic-history');
const vaccineList = document.querySelector('#vaccine-list');
const addVaccineButton = document.querySelector('#add-vaccine-button');
const saveClinicButton = document.querySelector('#save-clinic');
const cancelClinicButton = document.querySelector('#cancel-clinic');
const closeClinicModalButton = document.querySelector('#close-clinic-modal');
const clinicMessage = document.querySelector('#clinic-message');

let dogs = loadDogs();
let clinicPetId = null;

entryDate.value = new Date().toISOString().slice(0, 10);
renderDogs();

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const dog = {
    id: getNextId(),
    entryDate: data.get('entryDate'),
    dogName: data.get('dogName').trim(),
    petType: data.get('petType'),
    breed: data.get('breed').trim(),
    sex: data.get('sex'),
    ageYears: Number(data.get('ageYears')),
    ageMonths: Number(data.get('ageMonths')),
    comments: data.get('comments').trim(),
    clinicalHistory: '',
    vaccines: []
  };

  if (!dog.entryDate || !dog.dogName || !dog.petType || !dog.breed || !dog.sex
    || Number.isNaN(dog.ageYears) || Number.isNaN(dog.ageMonths)
    || dog.ageYears < 0 || dog.ageMonths < 0 || dog.ageMonths > 11) {
    showMessage('Completa todos los campos correctamente.', true);
    return;
  }

  dogs.push(dog);
  saveDogs();
  renderDogs();
  form.reset();
  entryDate.value = new Date().toISOString().slice(0, 10);
  showMessage(`${dog.dogName} fue agregado al registro.`);
  document.querySelector('#dog-name').focus();
});

document.querySelector('#clear-form').addEventListener('click', () => {
  form.reset();
  entryDate.value = new Date().toISOString().slice(0, 10);
  showMessage('');
});

searchInput.addEventListener('input', renderDogs);

tableBody.addEventListener('click', (event) => {
  const editButton = event.target.closest('[data-edit-comments-id]');
  if (editButton) {
    const editId = Number(editButton.dataset.editCommentsId);
    const dogToEdit = dogs.find((item) => item.id === editId);
    if (!dogToEdit) return;

    const updatedComments = window.prompt('Actualiza los comentarios de esta mascota:', dogToEdit.comments || '');
    if (updatedComments === null) return;

    dogToEdit.comments = updatedComments.trim().slice(0, 500);
    saveDogs();
    renderDogs();
    showMessage(`Comentarios de ${dogToEdit.dogName} actualizados.`);
    return;
  }

  const clinicButton = event.target.closest('[data-clinic-id]');
  if (clinicButton) {
    const id = Number(clinicButton.dataset.clinicId);
    openClinicModal(id);
    return;
  }

  const button = event.target.closest('[data-delete-id]');
  if (!button) return;

  const id = Number(button.dataset.deleteId);
  const dog = dogs.find((item) => item.id === id);
  if (!dog || !window.confirm(`¿Eliminar el registro de ${dog.dogName}?`)) return;

  dogs = dogs.filter((item) => item.id !== id);
  saveDogs();
  renderDogs();
});

document.querySelector('#export-csv').addEventListener('click', () => {
  if (dogs.length === 0) {
    showMessage('Agrega al menos un registro para exportar.', true);
    return;
  }

  const headers = ['No.', 'Fecha de ingreso', 'Nombre de la mascota', 'Tipo', 'Raza', 'Sexo', 'Años', 'Meses', 'Comentarios'];
  const rows = dogs.map((dog) => [dog.id, dog.entryDate, dog.dogName, dog.petType || 'No especificado', dog.breed, dog.sex, getAgeYears(dog), getAgeMonths(dog), dog.comments]);
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'registro-lucky-dogs.csv';
  link.click();
  URL.revokeObjectURL(link.href);
});

if (openClinicButton) {
  openClinicButton.addEventListener('click', () => {
    const targetDog = dogs[dogs.length - 1];
    if (!targetDog) {
      showMessage('Primero registra una mascota para abrir su historia clínica.', true);
      return;
    }
    openClinicModal(targetDog.id);
  });
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
  deleteButton.className = 'button button-secondary';
  deleteButton.textContent = 'Eliminar';
  deleteButton.addEventListener('click', () => {
    item.remove();
    showClinicMessage('Vacuna eliminada.');
  });

  item.appendChild(nameInput);
  item.appendChild(dateInput);
  item.appendChild(deleteButton);
  return item;
}

function renderClinicVaccines(vaccines = []) {
  vaccineList.innerHTML = '';
  if (!vaccines.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state visible';
    empty.style.padding = '0';
    empty.style.textAlign = 'left';
    empty.innerHTML = '<p style="margin:0; color: var(--muted); font-size: 13px;">Todavía no hay vacunas registradas.</p>';
    vaccineList.appendChild(empty);
    return;
  }

  vaccines.forEach((vaccine) => {
    vaccineList.appendChild(createVaccineItem(vaccine));
  });
}

function showClinicMessage(message, isError = false) {
  clinicMessage.textContent = message;
  clinicMessage.style.color = isError ? 'var(--coral)' : 'var(--teal)';
}

function openClinicModal(id) {
  const pet = dogs.find((item) => Number(item.id) === Number(id));
  if (!pet) return;

  clinicPetId = Number(id);
  clinicTitle.textContent = 'Historia clínica';
  clinicPetName.textContent = pet.dogName;
  clinicPetMeta.textContent = `${pet.petType || 'Mascota'} · ${pet.breed || 'Sin raza'} · ${pet.sex || 'Sexo no especificado'}`;
  clinicHistoryInput.value = pet.clinicalHistory || '';
  renderClinicVaccines(pet.vaccines || []);
  clinicMessage.textContent = '';
  clinicModal.classList.remove('hidden');
  clinicModal.setAttribute('aria-hidden', 'false');
}

function closeClinicModal() {
  clinicModal.classList.add('hidden');
  clinicModal.setAttribute('aria-hidden', 'true');
  clinicMessage.textContent = '';
}

function getClinicVaccinesFromForm() {
  const items = [...vaccineList.querySelectorAll('.vaccine-item')];

  return items
    .map((item) => {
      const inputs = item.querySelectorAll('input');
      const vaccineName = inputs[0]?.value.trim() || '';
      const lastVaccineDate = inputs[1]?.value || '';

      if (!vaccineName && !lastVaccineDate) {
        return null;
      }

      return {
        vaccineName,
        lastVaccineDate
      };
    })
    .filter(Boolean);
}

function saveClinicData() {
  if (clinicPetId === null) return;

  const petIndex = dogs.findIndex((item) => Number(item.id) === clinicPetId);
  if (petIndex === -1) return;

  dogs[petIndex].clinicalHistory = clinicHistoryInput.value.trim();
  dogs[petIndex].vaccines = getClinicVaccinesFromForm();
  saveDogs();
  renderDogs();
  showClinicMessage('Historia clínica guardada correctamente.');

  window.setTimeout(() => {
    closeClinicModal();
  }, 500);
}

if (addVaccineButton) {
  addVaccineButton.addEventListener('click', () => {
    vaccineList.querySelector('.empty-state')?.remove();
    vaccineList.appendChild(createVaccineItem());
  });
}

if (saveClinicButton) {
  saveClinicButton.addEventListener('click', saveClinicData);
}

if (cancelClinicButton) {
  cancelClinicButton.addEventListener('click', closeClinicModal);
}

if (closeClinicModalButton) {
  closeClinicModalButton.addEventListener('click', closeClinicModal);
}

if (clinicModal) {
  clinicModal.addEventListener('click', (event) => {
    if (event.target.dataset.closeClinic === 'true') {
      closeClinicModal();
    }
  });
}

function loadDogs() {
  try {
    const savedDogs = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(savedDogs) ? savedDogs.map((dog) => ({
      ...dog,
      petType: dog.petType || 'No especificado',
      sex: dog.sex || 'No especificado',
      ageYears: getAgeYears(dog),
      ageMonths: getAgeMonths(dog),
      comments: dog.comments || '',
      clinicalHistory: dog.clinicalHistory || '',
      vaccines: Array.isArray(dog.vaccines) ? dog.vaccines : []
    })) : [];
  } catch {
    return [];
  }
}

function saveDogs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dogs));
}

function getNextId() {
  return dogs.reduce((highestId, dog) => Math.max(highestId, Number(dog.id) || 0), 0) + 1;
}

function renderDogs() {
  const searchTerm = searchInput.value.trim().toLocaleLowerCase();
  const filteredDogs = dogs.filter((dog) =>
    `${dog.dogName} ${dog.petType || ''} ${dog.breed} ${dog.comments}`.toLocaleLowerCase().includes(searchTerm)
  );

  tableBody.innerHTML = filteredDogs.map((dog) => `
    <tr>
      <td class="number-cell">${dog.id.toString().padStart(3, '0')}</td>
      <td>${formatDate(dog.entryDate)}</td>
      <td><strong>${escapeHtml(dog.dogName)}</strong></td>
      <td>${escapeHtml(dog.petType || 'No especificado')}</td>
      <td>${escapeHtml(dog.breed)}</td>
      <td>${escapeHtml(dog.sex)}</td>
      <td>${formatAge(dog)}</td>
      <td class="comments-cell" title="${escapeHtml(dog.comments)}">${escapeHtml(dog.comments) || 'Sin comentarios'}</td>
      <td class="actions-cell">
        <button class="edit-button" type="button" data-edit-comments-id="${dog.id}">Editar comentarios</button>
        <button class="edit-button" type="button" data-clinic-id="${dog.id}">Historia clínica</button>
        <button class="delete-button" type="button" data-delete-id="${dog.id}">Eliminar</button>
      </td>
    </tr>
  `).join('');

  emptyState.classList.toggle('visible', filteredDogs.length === 0);
  emptyState.querySelector('h4').textContent = dogs.length === 0
    ? 'Aún no hay mascotas registradas'
    : 'No se encontraron coincidencias';
  emptyState.querySelector('p').textContent = dogs.length === 0
    ? 'Completa la ficha de ingreso para comenzar el listado.'
    : 'Prueba con otro nombre o raza.';
  totalCount.textContent = dogs.length;
  lastEntry.textContent = dogs.length ? dogs[dogs.length - 1].dogName : 'Sin registros';
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function getAgeYears(dog) {
  return Number.isFinite(Number(dog.ageYears)) ? Number(dog.ageYears) : Number(dog.age) || 0;
}

function getAgeMonths(dog) {
  return Number.isFinite(Number(dog.ageMonths)) ? Number(dog.ageMonths) : 0;
}

function formatAge(dog) {
  const years = getAgeYears(dog);
  const months = getAgeMonths(dog);
  const parts = [];
  if (years) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
  if (months) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
  return parts.length ? parts.join(' y ') : '0 meses';
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[character]));
}

function showMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.style.color = isError ? 'var(--coral)' : 'var(--teal)';
}
