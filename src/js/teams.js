import { supabase } from './client.js';

const FALLBACK_IMAGE = 'https://via.placeholder.com/640x360?text=Team+Member';

function createCard(role) {
  const article = document.createElement('article');
  article.className = 'flex flex-col gap-4';

  const image = document.createElement('img');
  image.src = role.image_url || FALLBACK_IMAGE;
  image.alt = role.member_name || role.member_role || 'JLX Gemstones team member';
  image.className = 'h-[320px] w-full object-cover';
  image.loading = 'lazy';
  image.referrerPolicy = 'no-referrer';
  image.addEventListener('error', () => {
    image.src = FALLBACK_IMAGE;
  });

  const details = document.createElement('div');
  details.className = 'space-y-2';

  const nameEl = document.createElement('h4');
  nameEl.className = 'font-display text-[24px] font-bold uppercase leading-[28px] text-slate-900';
  nameEl.textContent = role.member_name || role.member_role || 'JLX Team Member';

  const roleEl = document.createElement('span');
  roleEl.className = 'block text-[16px] font-semibold uppercase tracking-[0.6px] text-[#0047C1]';
  roleEl.textContent = role.member_role || role.created_by_email || 'Gemstone Specialist';

  const descriptionEl = document.createElement('p');
  descriptionEl.className = 'text-[16px] leading-[24px] tracking-[-0.4px] text-black whitespace-pre-line';
  descriptionEl.textContent = role.member_description || role.role_description || '';

  details.appendChild(nameEl);
  details.appendChild(roleEl);
  details.appendChild(descriptionEl);

  article.appendChild(image);
  article.appendChild(details);

  return article;
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


