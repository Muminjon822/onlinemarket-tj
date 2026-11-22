// Демонстрационные товары (помечены demo: true и значком «Намунавӣ»).
// Отключаются в js/config.js: seedDemo: false
const U = (id) => `https://images.unsplash.com/${id}?w=700`;

export const DEMO_SELLER = { id: 'demo', name: 'OnlineMarketTJ (намуна)' };

export const SEED_PRODUCTS = [
  { title: 'Мошини барқии кӯдакона', price: 2800, category: 'kids', condition: 'new', city: 'Душанбе', stock: 5, images: [U('photo-1594787318286-3d835c1d207f')], description: 'Мошини барқии кӯдакона барои кӯдакон аз 3 то 8 сола. Батарея, пульти идоракунӣ ва камарбанди бехатарӣ дохил аст.' },
  { title: 'Телефони мобилӣ', price: 2500, category: 'electronics', condition: 'new', city: 'Хуҷанд', stock: 8, images: [U('photo-1511707171634-5f897ff02aa9')], description: 'Смартфон бо экрани калон, камераи хуб ва батареяи тавоно. Кафолати 12 моҳ.' },
  { title: 'Либоси зебо', price: 350, category: 'clothes', condition: 'new', city: 'Душанбе', stock: 12, images: [U('photo-1483985988355-763728e1935b')], description: 'Либоси зебои занона аз матои хушсифат. Андозаҳо: S, M, L.' },
  { title: 'Мебели хона', price: 1800, category: 'home', condition: 'new', city: 'Бохтар', stock: 3, images: [U('photo-1555041469-a586c61ea9bc')], description: 'Диван барои меҳмонхона. Рангҳои гуногун, таҳвил бо мувофиқа.' },
  { title: 'Ноутбук барои кор ва таҳсил', price: 4200, category: 'electronics', condition: 'used', city: 'Душанбе', stock: 1, images: [], description: 'Ноутбуки истифодашуда дар ҳолати хуб. Хотира 8 ГБ, диски SSD.' },
  { title: 'Кроссовкаи варзишӣ', price: 420, category: 'sport', condition: 'new', city: 'Кӯлоб', stock: 10, images: [], description: 'Кроссовкаи сабук барои давидан ва машқ. Андозаҳо 38–45.' },
  { title: 'Дастгоҳи чойник', price: 150, category: 'home', condition: 'new', city: 'Хуҷанд', stock: 20, images: [], description: 'Чойники барқии 1,8 литра бо хомӯшшавии автоматӣ.' },
  { title: 'Крем барои рӯй', price: 95, category: 'beauty', condition: 'new', city: 'Душанбе', stock: 15, images: [], description: 'Креми намидиҳандаи рӯз барои ҳама намуди пӯст.' },
];
