document.addEventListener('DOMContentLoaded', function () {

    // --- Konstanten und Variablen ---
    const calendarContainer = document.getElementById('calendar-container');
    const currentYearSpan = document.getElementById('current-year');
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    const navLinks = document.querySelectorAll('.main-nav a');
    const header = document.querySelector('.site-header'); // Header Element holen
    const sectionsToFade = document.querySelectorAll('.fade-in');
    const scrollThreshold = 100; // Pixel-Schwellenwert, wann Header erscheinen soll

    // Standardort für Veranstaltungen, wenn kein spezifischer Ort angegeben ist
    const DEFAULT_LOCATION = "Saulgauer Straße 3, 89079 Ulm-Wiblingen";

    // Deutsche Wochentage (2-Buchstaben-Kürzel)
    const WEEKDAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

    // Modal Elemente
    const impressumLink = document.getElementById('impressum-link');
    const datenschutzLink = document.getElementById('datenschutz-link');
    const impressumModal = document.getElementById('impressum-modal');
    const datenschutzModal = document.getElementById('datenschutz-modal');
    const closeButtons = document.querySelectorAll('.close-modal');
    const modals = document.querySelectorAll('.modal');

    // --- Funktionen ---

    // Funktion zum Umschalten der Header-Sichtbarkeit beim Scrollen
    function handleHeaderVisibility() {
        if (!header) return; // Sicherstellen, dass Header existiert

        if (window.scrollY > scrollThreshold) {
            // Wenn genug gescrollt wurde -> Header sichtbar machen
            header.classList.add('visible');
        } else {
            // Sonst -> Header wieder verstecken
            header.classList.remove('visible');
            // Wichtig: Auch das Mobile Menü schließen, wenn Header verschwindet
            if (mainNav && mainNav.classList.contains('active')) {
                menuToggle.classList.remove('active');
                mainNav.classList.remove('active');
            }
        }
    }

    // Store all dates for filtering
    let allDates = [];
    let todayDate = null;
    let lastDate = null;

    // Funktion zum Laden und Anzeigen der Termine
    async function loadAndDisplayDates() {
        if (!calendarContainer) return;
        calendarContainer.innerHTML = '<p>Lade Termine...</p>';

        try {
            todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);
            const response = await fetch('dates.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const dates = await response.json();

            dates.sort((a, b) => new Date(a.datum) - new Date(b.datum));

            allDates = dates.filter(termin => {
                const [year, month, day] = termin.datum.split('-').map(Number);
                const localEventDate = new Date(year, month - 1, day);
                localEventDate.setHours(0, 0, 0, 0);
                return localEventDate >= todayDate;
            });

            if (allDates.length === 0) {
                calendarContainer.innerHTML = '<p class="no-results">Aktuell sind keine zukünftigen Termine eingetragen. Schau bald wieder vorbei!</p>';
                updateResultsCount(0);
                return;
            }

            // Set up date slider
            const lastDateEntry = allDates[allDates.length - 1];
            const [ly, lm, ld] = lastDateEntry.datum.split('-').map(Number);
            lastDate = new Date(ly, lm - 1, ld);

            // Update date labels
            const dateStartLabel = document.getElementById('date-start-label');
            const dateEndLabel = document.getElementById('date-end-label');
            if (dateStartLabel) {
                dateStartLabel.textContent = todayDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
            }
            if (dateEndLabel) {
                dateEndLabel.textContent = lastDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
            }

            // Initialize slider range indicator
            updateSliderRange(0, 100);

            // Initial display
            applyFilters();

            // Set up filter event listeners
            setupFilterListeners();

        } catch (error) {
            console.error('Fehler beim Laden der Termine:', error);
            calendarContainer.innerHTML = '<p class="no-results">Fehler beim Laden der Termine. Bitte prüfe die `dates.json`-Datei und die Netzwerkverbindung.</p>';
        }
    }

    function setupFilterListeners() {
        const dateSliderMin = document.getElementById('date-slider-min');
        const dateSliderMax = document.getElementById('date-slider-max');
        const filterSquare = document.getElementById('filter-square');
        const filterRound = document.getElementById('filter-round');
        const filterOther = document.getElementById('filter-other');

        if (dateSliderMin) {
            dateSliderMin.addEventListener('input', handleSliderInput);
        }
        if (dateSliderMax) {
            dateSliderMax.addEventListener('input', handleSliderInput);
        }
        if (filterSquare) {
            filterSquare.addEventListener('change', applyFilters);
        }
        if (filterRound) {
            filterRound.addEventListener('change', applyFilters);
        }
        if (filterOther) {
            filterOther.addEventListener('change', applyFilters);
        }
    }

    function handleSliderInput() {
        const dateSliderMin = document.getElementById('date-slider-min');
        const dateSliderMax = document.getElementById('date-slider-max');

        if (!dateSliderMin || !dateSliderMax) return;

        let minVal = parseInt(dateSliderMin.value);
        let maxVal = parseInt(dateSliderMax.value);

        // Prevent thumbs from crossing
        if (minVal > maxVal) {
            if (this === dateSliderMin) {
                dateSliderMin.value = maxVal;
                minVal = maxVal;
            } else {
                dateSliderMax.value = minVal;
                maxVal = minVal;
            }
        }

        // Update visual range indicator
        updateSliderRange(minVal, maxVal);

        applyFilters();
    }

    function updateSliderRange(minVal, maxVal) {
        const sliderRange = document.getElementById('slider-range');
        if (sliderRange) {
            sliderRange.style.left = minVal + '%';
            sliderRange.style.width = (maxVal - minVal) + '%';
        }
    }

    function applyFilters() {
        if (!calendarContainer || allDates.length === 0) return;

        const dateSliderMin = document.getElementById('date-slider-min');
        const dateSliderMax = document.getElementById('date-slider-max');
        const filterSquare = document.getElementById('filter-square');
        const filterRound = document.getElementById('filter-round');
        const filterOther = document.getElementById('filter-other');

        // Calculate date range based on sliders
        const minValue = dateSliderMin ? parseInt(dateSliderMin.value) : 0;
        const maxValue = dateSliderMax ? parseInt(dateSliderMax.value) : 100;
        const totalDays = Math.ceil((lastDate - todayDate) / (1000 * 60 * 60 * 24));

        const startDays = Math.ceil((minValue / 100) * totalDays);
        const endDays = Math.ceil((maxValue / 100) * totalDays);

        const startDate = new Date(todayDate.getTime() + startDays * 24 * 60 * 60 * 1000);
        const endDate = new Date(todayDate.getTime() + endDays * 24 * 60 * 60 * 1000);

        // Get checkbox states
        const showSquare = filterSquare ? filterSquare.checked : true;
        const showRound = filterRound ? filterRound.checked : true;
        const showOther = filterOther ? filterOther.checked : true;

        // Update labels
        const dateStartLabel = document.getElementById('date-start-label');
        const dateEndLabel = document.getElementById('date-end-label');
        if (dateStartLabel) {
            dateStartLabel.textContent = startDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        if (dateEndLabel) {
            dateEndLabel.textContent = endDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
        }

        // Filter dates
        const filteredDates = allDates.filter(termin => {
            const [year, month, day] = termin.datum.split('-').map(Number);
            const eventDate = new Date(year, month - 1, day);

            // Date filter - must be within selected range
            if (eventDate < startDate || eventDate > endDate) return false;

            // Type filter
            const typLower = termin.typ.toLowerCase();
            const isSquare = typLower.includes('square');
            const isRound = typLower.includes('round');
            const isOther = !isSquare && !isRound;

            if (isSquare && !showSquare) return false;
            if (isRound && !showRound) return false;
            if (isOther && !showOther) return false;

            return true;
        });

        // Render
        renderDates(filteredDates);
        updateResultsCount(filteredDates.length);
    }

    function updateResultsCount(count) {
        const resultsCount = document.getElementById('results-count');
        if (resultsCount) {
            resultsCount.textContent = count;
        }
    }

    function renderDates(dates) {
        if (!calendarContainer) return;

        if (dates.length === 0) {
            calendarContainer.innerHTML = '<p class="no-results">Keine Termine für die ausgewählten Filter gefunden.</p>';
            return;
        }

        calendarContainer.innerHTML = '';

        dates.forEach(termin => {
            const entryDiv = document.createElement('div');
            entryDiv.classList.add('calendar-entry');
            const terminTypLower = termin.typ.toLowerCase();
            if (terminTypLower.includes('square')) entryDiv.classList.add('event-type-square');
            else if (terminTypLower.includes('round')) entryDiv.classList.add('event-type-round');
            else if (terminTypLower.includes('special') || terminTypLower.includes('event') || terminTypLower.includes('feier') || terminTypLower.includes('fest')) entryDiv.classList.add('event-type-special');
            else entryDiv.classList.add('event-type-other');

            const [year, month, day] = termin.datum.split('-').map(Number);
            const dateObj = new Date(year, month - 1, day);

            // Wochentag ermitteln und in deutsches 2-Buchstaben-Kürzel umwandeln
            const weekday = WEEKDAYS_DE[dateObj.getDay()];

            const formattedDate = dateObj.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
            const timeString = termin.uhrzeit ? `${termin.uhrzeit} Uhr` : '';

            // Verwende den Standardort, wenn kein spezifischer Ort angegeben ist oder der Ort leer ist
            const location = termin.ort && termin.ort.trim() !== '' ? termin.ort : DEFAULT_LOCATION;

            entryDiv.innerHTML = `
                <div class="calendar-date-time">
                     <span class="weekday">${weekday}</span>
                     <span class="date">${formattedDate}</span>
                     <span class="time">${timeString}</span>
                </div>
                <div class="calendar-details">
                    <h4>${termin.typ || 'Termin'} ${termin.level ? `(${termin.level})` : ''}</h4>
                    ${termin.caller ? `<span><span class="label">Caller/Cuer:</span> ${termin.caller}</span>` : ''}
                    <span><span class="label">Ort:</span> ${location}</span>
                    ${termin.extras ? `<span class="extras"><span class="label">Info:</span> ${termin.extras}</span>` : ''}
                </div>
            `;
            calendarContainer.appendChild(entryDiv);
        });
    }

    // Funktion zum Setzen des aktuellen Jahres im Footer
    function setCurrentYear() {
        if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    }

    // Funktion für Mobile Navigation Toggle
    function toggleMobileMenu() {
        // Funktioniert nur, wenn der Header sichtbar ist
        if (header && header.classList.contains('visible') && menuToggle && mainNav) {
            menuToggle.classList.toggle('active');
            mainNav.classList.toggle('active');
        }
    }

    // Funktion zum Schließen des Menüs bei Klick auf einen Link
    function closeMenuOnClick(event) {
        // Prüfen ob auf einen Link geklickt wurde UND das Menü aktiv ist
        if (event.target.tagName === 'A' && mainNav && mainNav.classList.contains('active')) {
            menuToggle.classList.remove('active');
            mainNav.classList.remove('active');
        }
    }

    // Funktion für den Fade-in Effekt beim Scrollen
    function checkFadeIn() {
        const triggerBottom = window.innerHeight * 0.85;
        sectionsToFade.forEach(section => {
            const sectionTop = section.getBoundingClientRect().top;
            if (sectionTop < triggerBottom) section.classList.add('visible');
            // else section.classList.remove('visible'); // Optional: Reset
        });
    }

    // Funktion zum Öffnen eines Modals
    function openModal(modal) {
        if (!modal) return;

        // Body Scrolling deaktivieren
        document.body.style.overflow = 'hidden';

        // Modal anzeigen mit Animation
        modal.style.display = 'block';
        // Kurz warten und dann die Show-Klasse hinzufügen für Animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    // Funktion zum Schließen aller Modals
    function closeAllModals() {
        modals.forEach(modal => {
            modal.classList.remove('show');

            // Nach der Animation ausblenden
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        });

        // Body Scrolling wieder aktivieren
        document.body.style.overflow = '';
    }

    // --- Event Listener ---

    // Mobile Menü Toggle
    if (menuToggle) menuToggle.addEventListener('click', toggleMobileMenu);

    // Menü schließen bei Klick auf Link im Menü
    if (mainNav) mainNav.addEventListener('click', closeMenuOnClick);

    // Scroll-Event Listener (steuert Header Sichtbarkeit und Fade-In)
    window.addEventListener('scroll', () => {
        handleHeaderVisibility();
        checkFadeIn();
    });

    // Modal Event Listeners
    if (impressumLink) {
        impressumLink.addEventListener('click', function (e) {
            e.preventDefault();
            openModal(impressumModal);
        });
    }

    if (datenschutzLink) {
        datenschutzLink.addEventListener('click', function (e) {
            e.preventDefault();
            openModal(datenschutzModal);
        });
    }

    // Close Button für alle Modals
    closeButtons.forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    // Modals schließen bei Klick außerhalb des Inhalts
    modals.forEach(modal => {
        modal.addEventListener('click', function (e) {
            if (e.target === this) {
                closeAllModals();
            }
        });
    });

    // Escape-Taste schließt Modals
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    // --- Initialisierung ---
    loadAndDisplayDates();
    setCurrentYear();
    handleHeaderVisibility(); // Initialen Header-Status setzen (versteckt)
    setTimeout(checkFadeIn, 100); // Initialen Fade-Check

});