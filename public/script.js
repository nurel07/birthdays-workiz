document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('cards-container');

    fetch('/api/birthdays')
        .then(response => response.json())
        .then(data => {
            renderCards(data);
        })
        .catch(error => {
            console.error('Error loading birthdays:', error);
            container.innerHTML = '<p style="text-align:center; font-size:40px; color:white;">Failed to load data</p>';
        });

    function renderCards(birthdays) {
        container.innerHTML = ''; // Clear existing content

        birthdays.forEach(person => {
            const card = document.createElement('div');
            card.className = 'card';

            // Support both old format (via attributes) and new simplified format
            const nameText = person.name || person.attributes?.preferred_name?.value || 'Unknown';
            const imageUrl = person.imageUrl || person.attributes?.profile_picture?.value || '';

            // For date, try direct property first, then dynamic attribute
            let dateText = person.birthdayString;
            if (!dateText && person.attributes?.dynamic_1449280?.value) {
                // If legacy data with ISO string, valid but user wants simplified POST
                // We won't re-implement the complex formatter here unless strictly needed for legacy compatibility
                // but given the request is to "use post request with THIS data", we prioritize the new format.
                dateText = person.attributes.dynamic_1449280.value;
            }
            dateText = dateText || 'Unknown Date';

            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = nameText;
            img.className = 'card-avatar';

            // Fallback for image error
            img.onerror = () => {
                img.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(nameText) + '&background=random';
            };

            const info = document.createElement('div');
            info.className = 'card-info';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'card-name';
            nameDiv.textContent = nameText;

            const dateDiv = document.createElement('div');
            dateDiv.className = 'card-date';
            dateDiv.textContent = dateText;

            info.appendChild(nameDiv);
            info.appendChild(dateDiv);

            card.appendChild(img);
            card.appendChild(info);

            container.appendChild(card);
        });
    }
});
