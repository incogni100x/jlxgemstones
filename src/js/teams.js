import { supabase } from './client.js';

function createCard(role) {
  const card = document.createElement('div');
  card.className = 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden';

  const image = document.createElement('img');
  image.src = role.image_url || 'https://via.placeholder.com/640x360?text=Team+Member';
  image.alt = role.role_title || 'Team member';
  image.className = 'w-full h-64 object-cover';
  image.referrerPolicy = 'no-referrer';

  image.addEventListener('error', () => {
    image.src = 'https://via.placeholder.com/640x360?text=Team+Member';
  });

  const content = document.createElement('div');
  content.className = 'p-6';

  const title = document.createElement('h3');
  title.className = 'text-2xl font-bold text-[#0061A9] mb-2';
  title.textContent = role.member_name || role.role_title || 'Team Member';

  const subtitle = document.createElement('p');
  subtitle.className = 'text-[#FF6A0C] font-semibold mb-4';
  const subtitleValue = role.member_role || role.created_by_email || 'Specialist';
  subtitle.textContent = subtitleValue;

  const description = document.createElement('p');
  description.className = 'text-gray-700 leading-relaxed whitespace-pre-line';
  description.textContent = role.member_description || role.role_description || '';

  content.appendChild(title);
  content.appendChild(subtitle);
  content.appendChild(description);

  card.appendChild(image);
  card.appendChild(content);

  return card;
}

async function loadDynamicRoles() {
  const grid = document.getElementById('team-grid');
  if (!grid) return;

  try {
    const { data, error } = await supabase
      .from('team_roles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load team roles:', error);
      return;
    }

    if (!data || data.length === 0) return;

    data.forEach((role) => {
      const card = createCard(role);
      grid.appendChild(card);
    });
  } catch (error) {
    console.error('Unhandled error loading team roles:', error);
  }
}

document.addEventListener('DOMContentLoaded', loadDynamicRoles);


