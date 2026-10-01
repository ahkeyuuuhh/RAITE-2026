export const sampleLesson = `Photosynthesis is the process by which green plants convert light energy into chemical energy stored in glucose. Chlorophyll, the green pigment found in chloroplasts, absorbs sunlight. Light provides the energy that drives the process.

Plants take in carbon dioxide through tiny openings called stomata in their leaves. Roots absorb water from the soil. Carbon dioxide and water are the raw materials for photosynthesis.

During photosynthesis, plants produce glucose and release oxygen. Glucose supplies energy for growth and can be stored as starch. Oxygen is released into the surrounding air.

The rate of photosynthesis depends on light intensity, carbon dioxide concentration, and temperature. A shortage of one of these factors can limit the rate even when the others are plentiful.

Plants support food webs by turning sunlight into stored chemical energy. Animals obtain this energy by eating plants or other animals. Photosynthesis also helps maintain oxygen in the atmosphere.`;
const q = (n, prompt, choices, answer, explanation, sourceParagraph) => ({
  id: `q${n}`,
  prompt,
  options: choices.map((text, i) => ({ id: `q${n}-${i + 1}`, text })),
  correctOptionId: `q${n}-${answer}`,
  explanation,
  sourceParagraph,
});
export const sampleQuestions = [
  q(
    1,
    'What is the main energy transformation in photosynthesis?',
    [
      'Light energy into chemical energy',
      'Chemical energy into sound',
      'Heat into motion',
      'Electrical energy into light',
    ],
    1,
    'Plants store light energy as chemical energy in glucose.',
    1,
  ),
  q(
    2,
    'Which pair provides the raw materials for photosynthesis?',
    ['Oxygen and starch', 'Carbon dioxide and water', 'Glucose and oxygen', 'Chlorophyll and soil'],
    2,
    'Leaves take in carbon dioxide and roots absorb water.',
    2,
  ),
  q(
    3,
    'Which gas do plants release during photosynthesis?',
    ['Carbon dioxide', 'Nitrogen', 'Oxygen', 'Hydrogen'],
    3,
    'Oxygen is a product of photosynthesis.',
    3,
  ),
  q(
    4,
    'A plant has plentiful water and carbon dioxide but very little light. What is most likely?',
    [
      'Photosynthesis is limited by light',
      'Photosynthesis increases without limit',
      'The plant stops needing carbon dioxide',
      'Light has no effect',
    ],
    1,
    'A shortage of one factor limits the rate even if others are plentiful.',
    4,
  ),
  q(
    5,
    'Why is photosynthesis important to food webs?',
    [
      'It eliminates the need for water',
      'It supplies chemical energy that passes to consumers',
      'It turns oxygen into soil',
      'It prevents animals from using energy',
    ],
    2,
    'Stored plant energy passes through food webs when organisms eat.',
    5,
  ),
];
