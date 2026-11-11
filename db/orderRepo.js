import pool from '../config/postgres.js';

// the order row and its items must succeed or fail together -> one transaction
export const createOrderWithItems = async ({ mongoOrderId, userId, totalAmount, items }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO orders (mongo_order_id, user_id, total_amount)
       VALUES ($1, $2, $3) RETURNING id`,
      [mongoOrderId, userId, totalAmount]
    );
    const pgOrderId = result.rows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, name, price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [pgOrderId, item.product.toString(), item.name, item.price, item.quantity]
      );
    }
    await client.query('COMMIT');
    return pgOrderId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const markPgOrderPaid = async (pgOrderId) => {
  await pool.query(`UPDATE orders SET status = 'paid' WHERE id = $1`, [pgOrderId]);
};

export const setPgOrderStatus = async (pgOrderId, status) => {
  await pool.query(`UPDATE orders SET status = $1 WHERE id = $2`, [status, pgOrderId]);
};