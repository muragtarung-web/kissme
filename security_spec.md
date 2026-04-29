# Security Specification - Divine Selection

## Data Invariants
1. Products must always have a price and a category.
2. Orders must belong to the authenticated user who created them.
3. Users cannot change their own `role` field.
4. Only admins can modify the menu (products, categories) and events.
5. Users can only update their own points/tier (simulated frontend logic for now, in a real app this would be server-side).

## The Dirty Dozen Payloads (Rejection Targets)

1. **Identity Spoofing**: Attempt to create an order for another user.
   ```json
   { "customerId": "attacker_id", "total": 100, "status": "pending" } (Sent as victim_id)
   ```
2. **Privilege Escalation**: User tries to set their role to 'admin'.
   ```json
   { "role": "admin" } (Sent to /users/my_id)
   ```
3. **Ghost Field Injection**: Add a `isVerified: true` field to a product.
   ```json
   { "name": "Fake", "price": 0, "categoryId": "123", "isVerified": true }
   ```
4. **Invalid Type**: Set product price to a string.
   ```json
   { "name": "Bad Product", "price": "100" }
   ```
5. **Orphaned Order**: Create an order without a customerId.
   ```json
   { "total": 50, "status": "pending" }
   ```
6. **Price Tampering**: Create a product with a negative price.
   ```json
   { "name": "Free??", "price": -100 }
   ```
7. **Menu Deletion**: Non-admin tries to delete a product.
   (DELETE /products/some_id as non-admin)
8. **Event Hijacking**: Non-admin tries to update an event.
   (UPDATE /events/some_id as non-admin)
9. **Private Profile Scraping**: User tries to read another user's profile.
   (GET /users/victim_id as attacker)
10. **Global Feed Scraping**: User tries to list all orders.
    (LIST /orders as non-admin)
11. **Status Shortcutting**: User tries to change their order status to 'delivered'.
    (UPDATE /orders/my_order { "status": "delivered" })
12. **Id Poisoning**: Use a 2KB string as a product ID.
    (SET /products/[2KB_STRING] { ... })

## Test Runner (firestore.rules.test.ts)
I will implement basic validation tests in the actual app and use ESLint.
