export const CATEGORIES = [
  { id: 'electronics', name: 'Электроника', icon: '📱' },
  { id: 'clothes', name: 'Либос', icon: '👕' },
  { id: 'kids', name: 'Кӯдакон', icon: '🧸' },
  { id: 'home', name: 'Барои хона', icon: '🏠' },
  { id: 'auto', name: 'Нақлиёт', icon: '🚗' },
  { id: 'beauty', name: 'Зебоӣ ва тандурустӣ', icon: '💄' },
  { id: 'sport', name: 'Варзиш', icon: '⚽' },
  { id: 'other', name: 'Дигар', icon: '📦' },
];

export const CITIES = [
  'Душанбе', 'Хуҷанд', 'Бохтар', 'Кӯлоб', 'Исфара', 'Истаравшан',
  'Панҷакент', 'Турсунзода', 'Ваҳдат', 'Хоруғ', 'Гулистон', 'Левакант',
];

export const CONDITIONS = { new: 'Нав', used: 'Истифодашуда' };

export const ORDER_STATUS = {
  new: 'Нав',
  confirmed: 'Тасдиқ шуд',
  shipped: 'Фиристода шуд',
  delivered: 'Таҳвил шуд',
  cancelled: 'Бекор шуд',
};

export const categoryById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
