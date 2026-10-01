import type { SelectOption } from './glide-select';

// Curated top Philippine educational institutions (universities, colleges & premier high schools)
export const DEFAULT_PH_SCHOOLS: SelectOption[] = [
  { value: 'ClassAssist Demo School', label: 'ClassAssist Demo School', tag: 'Newton Campus' },
  { value: 'University of the Philippines Diliman', label: 'University of the Philippines Diliman', tag: 'Quezon City · State Univ' },
  { value: 'University of the Philippines Manila', label: 'University of the Philippines Manila', tag: 'Manila · State Univ' },
  { value: 'Ateneo de Manila University', label: 'Ateneo de Manila University', tag: 'Quezon City · Private' },
  { value: 'De La Salle University', label: 'De La Salle University', tag: 'Manila · Private' },
  { value: 'University of Santo Tomas', label: 'University of Santo Tomas', tag: 'Manila · Private' },
  { value: 'Polytechnic University of the Philippines', label: 'Polytechnic University of the Philippines', tag: 'Sta. Mesa, Manila · State Univ' },
  { value: 'Mapúa University', label: 'Mapúa University', tag: 'Intramuros, Manila · Private' },
  { value: 'Far Eastern University', label: 'Far Eastern University', tag: 'Manila · Private' },
  { value: 'Batangas State University', label: 'Batangas State University', tag: 'Batangas · National Engineering' },
  { value: 'University of San Carlos', label: 'University of San Carlos', tag: 'Cebu City · Private' },
  { value: 'Mindanao State University', label: 'Mindanao State University', tag: 'Marawi / Iligan · State Univ' },
  { value: 'Pamantasan ng Lungsod ng Maynila', label: 'Pamantasan ng Lungsod ng Maynila', tag: 'Intramuros, Manila · City Univ' },
  { value: 'Saint Louis University', label: 'Saint Louis University', tag: 'Baguio City · Private' },
  { value: 'Adamson University', label: 'Adamson University', tag: 'Manila · Private' },
  { value: 'Silliman University', label: 'Silliman University', tag: 'Dumaguete · Private' },
  { value: 'Central Luzon State University', label: 'Central Luzon State University', tag: 'Nueva Ecija · State Univ' },
  { value: 'Xavier University – Ateneo de Cagayan', label: 'Xavier University – Ateneo de Cagayan', tag: 'Cagayan de Oro · Private' },
  { value: 'University of the East', label: 'University of the East', tag: 'Manila · Private' },
  { value: 'Technological University of the Philippines', label: 'Technological University of the Philippines', tag: 'Manila · State Univ' },
  { value: 'Technological Institute of the Philippines', label: 'Technological Institute of the Philippines', tag: 'Quezon City / Manila' },
  { value: 'Philippine Normal University', label: 'Philippine Normal University', tag: 'Manila · Teacher Education' },
  { value: 'Philippine Science High School', label: 'Philippine Science High School (Pisay)', tag: 'Main / Regional Campuses' },
  { value: 'Manila Science High School', label: 'Manila Science High School', tag: 'Manila · Secondary' },
];

let cachedSchools: SelectOption[] | null = null;

export async function fetchPhilippineSchools(): Promise<SelectOption[]> {
  if (cachedSchools && cachedSchools.length > DEFAULT_PH_SCHOOLS.length) {
    return cachedSchools;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('http://universities.hipolabs.com/search?country=Philippines', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error('API response not ok');
    const data: { name: string; 'state-province': string | null }[] = await res.json();

    const apiSchools: SelectOption[] = data.map((item) => ({
      value: item.name,
      label: item.name,
      tag: item['state-province'] || 'Philippines',
    }));

    // Merge with defaults avoiding duplicates
    const names = new Set(DEFAULT_PH_SCHOOLS.map((s) => s.value.toLowerCase()));
    const additional = apiSchools.filter((s) => !names.has(s.value.toLowerCase()));

    cachedSchools = [...DEFAULT_PH_SCHOOLS, ...additional];
    return cachedSchools;
  } catch (err) {
    // Graceful offline fallback
    return DEFAULT_PH_SCHOOLS;
  }
}
