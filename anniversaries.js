document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('cards-container');

    fetch('/api/anniversaries')
        .then(response => response.json())
        .then(data => {
            renderCards(data);
        })
        .catch(error => {
            console.error('Error loading anniversaries:', error);
            container.innerHTML = '<p style="text-align:center; font-size:40px; color:white;">Failed to load data</p>';
        });

    function renderCards(anniversaries) {
        container.innerHTML = ''; // Clear existing content

        anniversaries.forEach(person => {
            const card = document.createElement('div');
            card.className = 'card';

            const nameText = person.name || 'Unknown';
            const imageUrl = person.imageUrl || '';
            const anniversaryText = person.anniversary || 'Unknown';
            const color = person.color || '#FFD400'; // Default to gold if no color provided

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

            const anniversaryDiv = document.createElement('div');
            anniversaryDiv.className = 'card-anniversary';
            anniversaryDiv.textContent = anniversaryText;
            anniversaryDiv.style.color = color; // Apply dynamic color from JSON

            info.appendChild(nameDiv);
            info.appendChild(anniversaryDiv);

            card.appendChild(img);
            card.appendChild(info);

            container.appendChild(card);
        });
    }
});
