document.addEventListener('DOMContentLoaded', function() {

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

    // Funktion zum Laden und Anzeigen der Termine
    async function loadAndDisplayDates() {
        if (!calendarContainer) return;
        calendarContainer.innerHTML = '<p>Lade Termine...</p>';

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const response = await fetch('dates.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const dates = await response.json();

            dates.sort((a, b) => new Date(a.datum) - new Date(b.datum));

            const upcomingDates = dates.filter(termin => {
                 const [year, month, day] = termin.datum.split('-').map(Number);
                 const localEventDate = new Date(year, month - 1, day);
                 localEventDate.setHours(0, 0, 0, 0);
                 return localEventDate >= today;
            });

            if (upcomingDates.length === 0) {
                calendarContainer.innerHTML = '<p>Aktuell sind keine zukünftigen Termine eingetragen. Schau bald wieder vorbei!</p>';
                return;
            }

            calendarContainer.innerHTML = '';

            upcomingDates.forEach(termin => {
                const entryDiv = document.createElement('div');
                entryDiv.classList.add('calendar-entry');
                const terminTypLower = termin.typ.toLowerCase();
                if (terminTypLower.includes('square')) entryDiv.classList.add('event-type-square');
                else if (terminTypLower.includes('round')) entryDiv.classList.add('event-type-round');
                else if (terminTypLower.includes('special') || terminTypLower.includes('event') || terminTypLower.includes('feier') || terminTypLower.includes('fest')) entryDiv.classList.add('event-type-special');
                else entryDiv.classList.add('event-type-other');

                const [year, month, day] = termin.datum.split('-').map(Number);
                const dateObj = new Date(year, month - 1, day);
                const formattedDate = dateObj.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
                const timeString = termin.uhrzeit ? `${termin.uhrzeit} Uhr` : '';
                
                // Verwende den Standardort, wenn kein spezifischer Ort angegeben ist oder der Ort leer ist
                const location = termin.ort && termin.ort.trim() !== '' ? termin.ort : DEFAULT_LOCATION;

                entryDiv.innerHTML = `
                    <div class="calendar-date-time">
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
        } catch (error) {
            console.error('Fehler beim Laden der Termine:', error);
            calendarContainer.innerHTML = '<p>Fehler beim Laden der Termine. Bitte prüfe die `dates.json`-Datei und die Netzwerkverbindung.</p>';
        }
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
        impressumLink.addEventListener('click', function(e) {
            e.preventDefault();
            openModal(impressumModal);
        });
    }
    
    if (datenschutzLink) {
        datenschutzLink.addEventListener('click', function(e) {
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
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeAllModals();
            }
        });
    });
    
    // Escape-Taste schließt Modals
    document.addEventListener('keydown', function(e) {
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