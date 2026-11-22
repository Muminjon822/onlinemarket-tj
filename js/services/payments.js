// Способы оплаты. Сейчас включена только оплата наличными при получении.
// Фиктивных платежей нет. Чтобы подключить онлайн-оплату (Алиф, DC Next,
// Visa/Mastercard и т. д.), добавьте провайдера:
//   { id:'alif', label:'...', enabled:true, async createPayment(order){...} }
// Создание платежа и проверка его статуса должны выполняться на сервере.
export const PAYMENT_METHODS = [
  { id: 'cod', label: 'Пардохт ҳангоми қабул (нақд)', enabled: true },
];

export const enabledPayments = () => PAYMENT_METHODS.filter((m) => m.enabled);
