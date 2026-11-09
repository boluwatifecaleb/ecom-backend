import { createOrderWithItems } from '../db/orderRepo.js';

try {
  const id = await createOrderWithItems({
    mongoOrderId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    userId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    totalAmount: 15,
    items: [{ product: 'cccccccccccccccccccccccc', name: 'Test', price: 15, quantity: 1 }],
  });
  console.log('Inserted, pg order id:', id);
} catch (e) {
  console.error('Insert failed:', e.message);
}
process.exit(0);